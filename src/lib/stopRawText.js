// The single definition of how a trip/stop's raw narrative text is assembled
// before cleanDrupalContent renders it — used by BOTH the public page
// (src/app/[...slug]/page.js) and the admin preview (src/lib/adminPreview.js).
// These used to be hand-synced copies; preview parity is now structural.
//
// Behavior (unchanged from the public page):
// - Trips render the travelogue, with legacy fallbacks (body, a year field
//   that some old records abused as text, summary).
// - Stops with a distinct short description get it appended after the
//   travelogue in an italic callout box.
// - The description is interpolated raw (no escaping): legacy descriptions
//   legitimately contain HTML, the sole author is the trusted admin, and the
//   public page must stay byte-identical.

export function buildContentRawText(item) {
  const type = item.itemType || item.type;

  if (type === 'trip') {
    return (
      item.travelogue ||
      item.body ||
      (String(item.year || '').length > 10 ? item.year : '') ||
      item.summary ||
      ''
    );
  }

  if (
    item.description &&
    item.description.trim() &&
    item.travelogue &&
    item.description !== item.travelogue
  ) {
    return (
      item.travelogue +
      `\n\n<hr />\n\n<div class="trip-description-box bg-[#c1593a]/[0.07] border-l-4 border-[#c1593a] rounded text-[#4a4437] italic font-medium leading-relaxed">${item.description}</div>`
    );
  }

  return item.travelogue || item.description || item.summary || item.body || '';
}
