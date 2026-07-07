import fs from "fs";
import path from "path";
import { DATA_DIR } from "@/lib/dataPaths";

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
 * Cleans raw Drupal text, parsing [img_assist|nid=...] shortcodes and formatting HTML safely.
 * Implements a robust Drupal _filter_autop line-break filter to ensure clean paragraph formatting.
 * @param {string} text - Raw content string from Drupal database
 * @param {Array} photoTitles - Optional array of photo records to resolve [img_assist] nids
 * @returns {string} - Cleaned HTML string ready for dangerouslySetInnerHTML
 */
export function cleanDrupalContent(text, photoTitles = []) {
  if (!text || typeof text !== "string") return "";

  // 0. Unescape any database string escape sequences (e.g. literal \r\n, \n, \', \")
  let cleaned = text
    .replace(/\\r\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");

  // 1. Remove <!--break--> and Drupal internal comments
  cleaned = cleaned.replace(/<!--\s*break\s*-->/gi, "");
  cleaned = cleaned.replace(/<!--.*?-->/gs, "");

  // Create a lookup map from image_nid and image_vid to filename/title
  // Ensure image_nid always takes precedence by adding image_vid first, then overwriting with image_nid
  const imageMap = new Map();
  if (Array.isArray(photoTitles)) {
    photoTitles.forEach((item) => {
      if (item && item.image_vid) {
        imageMap.set(String(item.image_vid), item);
      }
    });
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
      const floatClass =
        align === "left"
          ? "float-left mr-6 mb-4 clear-left"
          : align === "center"
          ? "mx-auto block my-4 clear-both"
          : "float-right ml-6 mb-4 clear-right";

      const cleanFilename = (imgData.filename || "").replace(/^sites\/default\/files\/(?:images\/)?/i, '');

      return `\n\n<figure class="drupal-figure ${floatClass} max-w-xs w-80 bg-[#0c1d15] p-2.5 rounded-lg border border-amber-500/30 shadow-lg">\n  <img src="/photos/${cleanFilename}" alt="${title || imgData.title}" class="w-full h-auto rounded" onerror="this.style.display='none'" />\n  ${title || imgData.title ? `<figcaption class="text-xs text-gray-300 italic text-center mt-2 leading-tight">${title || imgData.title}</figcaption>` : ""}\n</figure>\n\n`;
    }

    // If image not found in map, strip the shortcode so user never sees brackets
    return "";
  });

  // 2b. Strip any leftover square bracket Drupal filter macros like [video:url] or [youtube:id]
  cleaned = cleaned.replace(/\[[a-zA-Z0-9_-]+:[^\]]+\]/gi, "");
  cleaned = cleaned.replace(/\[[a-zA-Z0-9_-]+\|[^\]]+\]/gi, "");
  cleaned = cleaned.replace(/\[[a-zA-Z0-9_-]+\]/gi, "");

  // 3. Fix all internal Drupal href links (node nids, taxonomy categories, media files, and domain URLs)
  const nidMap = getNidMap();

  // 3a. Convert full cross-country-trips.com domain URLs to relative links
  cleaned = cleaned.replace(/https?:\/\/(?:www\.)?cross-country-trips\.com\//gi, "/");

  // 3b. Convert sites/default/files/ links to /files/
  cleaned = cleaned.replace(/href=["'](?:internal:)?(?:https?:\/\/(?:www\.)?cross-country-trips\.com\/)?sites\/default\/files\/([^"']+)["']/gi, 'href="/files/$1"');

  // 3c. Convert node/[nid] links to their actual slug (e.g., /white-sands-national-monument)
  cleaned = cleaned.replace(/href=["'](?:internal:|entity:)?(?:\/)?node\/(\d+)["']/gi, (match, nid) => {
    const target = nidMap.get(String(nid));
    if (target) return `href="${target}"`;
    return `href="/node/${nid}"`;
  });

  // 3d. Convert stop-type/[slug] or category/[slug] to /category/[slug]
  cleaned = cleaned.replace(/href=["'](?:internal:)?(?:stop-type|category)\/([^"']+)["']/gi, 'href="/category/$1"');

  // 3e. Strip any remaining internal: or entity: prefixes from relative links
  cleaned = cleaned.replace(/href=["'](?:internal:|entity:)\/?([^"']*)["']/gi, (match, pathStr) => {
    return `href="/${pathStr.replace(/^\//, '')}"`;
  });

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
