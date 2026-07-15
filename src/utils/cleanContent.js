import fs from "fs";
import path from "path";
import { DATA_DIR } from "@/lib/dataPaths";
import { photoFileExists } from "@/lib/photoExists";

let cachedNidMap = null;

function getNidMap() {
  if (cachedNidMap) return cachedNidMap;
  cachedNidMap = new Map();
  try {
    if (fs.existsSync(DATA_DIR)) {
      const stops = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "stops.json"), "utf-8"));
      const trips = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "trips.json"), "utf-8"));
      const pages = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "standalone_pages.json"), "utf-8"));
      const all = [...stops, ...trips, ...pages];
      all.forEach((item) => {
        if (item && item.nid && (item.slug || item.title)) {
          const rawSlug = item.slug || item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const cleanSlug = rawSlug.startsWith('/') ? rawSlug : `/${rawSlug}`;
          cachedNidMap.set(String(item.nid), cleanSlug);
        }
      });
    }
  } catch (err) {
    // Fallback if filesystem is not directly accessible
  }
  return cachedNidMap;
}

/**
 * Unescapes literal database escape sequences (e.g. \r\n, \n, \', \") left over
 * from the Drupal export process. Used both for full HTML/text bodies and for
 * standalone fields like photo titles, which go through the same export path
 * but aren't otherwise passed through cleanDrupalContent.
 * @param {string} str - Raw string from the Drupal export
 * @returns {string} - Unescaped plain text
 */
export function unescapeDrupalText(str) {
  if (!str || typeof str !== "string") return str;
  return str
    .replace(/\\r\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

/**
 * Rewrites Drupal's internal href forms (internal:node/123, entity:node/123,
 * sites/default/files/..., stop-type/..., absolute cross-country-trips.com URLs)
 * into real site paths. Exported so pages that do their own formatting — the
 * homepage body — resolve links exactly the same way as cleanDrupalContent,
 * rather than keeping a second copy that can drift.
 * @param {string} html
 * @returns {string} html with internal links resolved
 */
export function resolveDrupalLinks(html) {
  if (!html || typeof html !== "string") return "";
  const nidMap = getNidMap();
  let cleaned = html;

  // Absolute URLs back to this domain become relative
  cleaned = cleaned.replace(/https?:\/\/(?:www\.)?cross-country-trips\.com\//gi, "/");

  // Uploaded files
  cleaned = cleaned.replace(/href=["'](?:internal:)?(?:https?:\/\/(?:www\.)?cross-country-trips\.com\/)?sites\/default\/files\/([^"']+)["']/gi, 'href="/files/$1"');

  // node/[nid] -> the node's actual slug (e.g. /white-sands-national-monument)
  cleaned = cleaned.replace(/href=["'](?:internal:|entity:)?(?:\/)?node\/(\d+)["']/gi, (match, nid) => {
    const target = nidMap.get(String(nid));
    if (target) return `href="${target}"`;
    return `href="/node/${nid}"`;
  });

  // stop-type/[slug] or category/[slug] -> /category/[slug]
  cleaned = cleaned.replace(/href=["'](?:internal:)?(?:stop-type|category)\/([^"']+)["']/gi, 'href="/category/$1"');

  // Any remaining internal:/entity: prefix on a relative link
  cleaned = cleaned.replace(/href=["'](?:internal:|entity:)\/?([^"']*)["']/gi, (match, pathStr) => {
    return `href="/${pathStr.replace(/^\//, '')}"`;
  });

  return cleaned;
}

/**
 * Cleans raw Drupal text, parsing [img_assist|nid=...] shortcodes and formatting HTML safely.
 * Implements a robust Drupal _filter_autop line-break filter to ensure clean paragraph formatting.
 * @param {string} text - Raw content string from Drupal database
 * @param {Array} photoTitles - Optional array of photo records to resolve [img_assist] nids
 * @returns {string} - Cleaned HTML string ready for dangerouslySetInnerHTML
 */
export function cleanDrupalContent(text, photoTitles = []) {
  if (!text || typeof text !== "string") return "";

  // 0. Unescape any database string escape sequences (e.g. literal \r\n, \n, \', \")
  let cleaned = unescapeDrupalText(text);

  // 1. Remove <!--break--> and Drupal internal comments
  cleaned = cleaned.replace(/<!--\s*break\s*-->/gi, "");
  cleaned = cleaned.replace(/<!--.*?-->/gs, "");

  // Look [img_assist|nid=N] up by image_nid ONLY.
  //
  // This used to also index image_vid as a fallback, but the two are separate
  // Drupal namespaces that overlap heavily (5,385 image_vid values collide with
  // some other photo's image_nid). When a tag referenced a photo missing from
  // the export, the vid entry answered instead and the page showed a completely
  // unrelated photo — Salt Point State Park displayed "The way I feel about
  // Iceland" from the Grindavik stop under the caption "The Eyes of Salt Point".
  // Checked across every [img_assist] on the site: 5,318 resolve by image_nid,
  // and all 5 that resolved only by image_vid were showing the wrong photo. An
  // unmatched tag is stripped below, so those simply show nothing.
  const imageMap = new Map();
  if (Array.isArray(photoTitles)) {
    photoTitles.forEach((item) => {
      if (item && item.image_nid) {
        imageMap.set(String(item.image_nid), item);
      }
    });
  }

  // 2. Transform [img_assist|nid=1164|title=...|desc=...|link=...|align=...|width=...|height=...]
  cleaned = cleaned.replace(/\[img_assist\|([^\]]+)\]/gi, (match, attributesStr) => {
    const params = {};
    attributesStr.split("|").forEach((pair) => {
      const [key, val] = pair.split("=");
      if (key && val !== undefined) {
        params[key.trim().toLowerCase()] = val.trim();
      }
    });

    const nid = params.nid;
    const align = params.align || "right";
    const title = params.title || params.desc || "";

    if (nid && imageMap.has(String(nid))) {
      const imgData = imageMap.get(String(nid));
      const cleanFilename = (imgData.filename || "").replace(/^sites\/default\/files\/(?:images\/)?/i, '');

      if (photoFileExists(cleanFilename)) {
        const floatClass =
          align === "left"
            ? "float-left mr-6 mb-4 clear-left"
            : align === "center"
            ? "mx-auto block my-4 clear-both"
            : "float-right ml-6 mb-4 clear-right";
        const caption = title || unescapeDrupalText(imgData.title) || "";

        return `\n\n<figure class="drupal-figure ${floatClass} max-w-xs w-80 bg-[#0c1d15] p-2.5 rounded-lg border border-amber-500/30 shadow-lg">\n  <img src="/photos/${cleanFilename}" alt="${caption}" class="w-full h-auto rounded" onerror="this.style.display='none'" />\n  ${caption ? `<figcaption class="text-xs text-gray-300 italic text-center mt-2 leading-tight">${caption}</figcaption>` : ""}\n</figure>\n\n`;
      }
    }

    // If image not found in map, or the file doesn't actually exist on disk, strip the shortcode so user never sees brackets or a broken image
    return "";
  });

  // 2b. Strip any leftover square bracket Drupal filter macros like [video:url] or [youtube:id]
  cleaned = cleaned.replace(/\[[a-zA-Z0-9_-]+:[^\]]+\]/gi, "");
  cleaned = cleaned.replace(/\[[a-zA-Z0-9_-]+\|[^\]]+\]/gi, "");
  cleaned = cleaned.replace(/\[[a-zA-Z0-9_-]+\]/gi, "");

  // 3. Fix all internal Drupal href links (node nids, taxonomy categories, media files, and domain URLs)
  cleaned = resolveDrupalLinks(cleaned);

  // 4. Ensure block elements are isolated from paragraphs without breaking opening/closing pairs
  cleaned = cleaned.replace(/(\s*)<(ul|ol|table|blockquote|div|section|aside|header|footer)(\s|>)/gi, "\n\n<$2$3");
  cleaned = cleaned.replace(/<\/(ul|ol|table|blockquote|div|section|aside|header|footer)>(\s*)/gi, "</$1>\n\n");

  // 5. Drupal _filter_autop line-break filter (convert double newlines to <p> and single newlines to <br />)
  if (!cleaned.trim()) return "";
  const blocks = cleaned.split(/\n{2,}/);
  const formatted = blocks.map(block => {
    let t = block.trim();
    if (!t) return "";

    // If block starts with ul or ol, clean out internal <br> or <p> tags and format indentation
    if (/^<(ul|ol)(\s|>)/i.test(t)) {
      t = t.replace(/<\/?(br|p)[^>]*>/gi, "");
      if (/^<ul/i.test(t) && !t.includes('list-disc')) {
        t = t.replace(/^<ul/i, '<ul class="list-disc list-outside mb-6 ml-8 space-y-2"');
      } else if (/^<ol/i.test(t) && !t.includes('list-decimal')) {
        t = t.replace(/^<ol/i, '<ol class="list-decimal list-outside mb-6 ml-8 space-y-2"');
      }
      return t;
    }

    // If block starts with <p, ensure spacing class and convert internal single newlines to <br /> (for poems/lyrics)
    if (/^<p(\s|>)/i.test(t)) {
      if (!t.includes('mb-')) {
        t = t.replace(/^<p/i, '<p class="mb-5 leading-relaxed"');
      }
      t = t.replace(/\n/g, "<br />\n");
      return t;
    }

    // If block starts with other block-level tags, preserve them
    if (/^<(li|table|blockquote|figure|hr|div|h[1-6]|section|article|aside|pre|header|footer)(\s|>)/i.test(t)) {
      return t;
    }

    // Standard text block: convert single newlines within the paragraph to <br /> and wrap in <p>
    t = t.replace(/\n/g, "<br />\n");
    return `<p class="mb-5 leading-relaxed">${t}</p>`;
  }).filter(Boolean).join("\n\n");

  return formatted;
}
