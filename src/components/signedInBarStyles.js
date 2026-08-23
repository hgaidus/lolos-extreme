// Shared look for the two "you are signed in" bars: the one on public pages
// (AdminEditBar) and the one at the top of the CMS (admin/layout.js).
//
// They are separate components because their layouts differ — the public bar
// is inset in the content column, the admin one spans the chrome and carries
// Log out — but they must not drift apart visually, which is what happened to
// this site's links before they were pulled into named roles. One definition,
// imported by both.
//
// The terracotta is the same #a54a2f the site uses for links. It clears AA on
// the pale tinted surface below; it would NOT have cleared AA on the dark
// gray-900 chrome the admin header used to have, which is why that header is
// now light rather than the terracotta being dropped onto a dark bar.

// Colour and type only — no layout, no border width. Each bar picks its own
// edges: the inset one is fully bordered, the header only underlined.
export const SURFACE = 'border-[#c1593a]/35 bg-[#c1593a]/8 font-sans text-sm';

export const ROW = 'flex flex-wrap items-center gap-x-3 gap-y-1';

export const BAR = `${SURFACE} ${ROW} border`;

export const LABEL =
  'font-bold uppercase tracking-wider text-[11px] text-[#a54a2f]';

// The page you are on / the primary action — carries the weight.
export const LINK_PRIMARY =
  'font-semibold text-[#a54a2f] underline underline-offset-2 hover:text-[#8f3f28]';

// The way out to somewhere else — same colour, no bold.
export const LINK =
  'text-[#a54a2f] underline underline-offset-2 hover:text-[#8f3f28]';

export const SEPARATOR = 'text-[#c1593a]/40';

export const HINT = 'text-[#6b6455]';
