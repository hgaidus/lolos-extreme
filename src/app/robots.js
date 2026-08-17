const BASE_URL = 'https://cross-country-trips.com';

// Crawlers that are blocked outright. Measured from a day of access logs
// 2026-08-17: these accounted for roughly 8,400 of ~12,000 requests, against
// 55 from Googlebot. Blocking them costs nothing in search visibility.
//
// robots.txt is advisory, not enforcement. The named operators below mostly
// honour it; Bytespider has a poor record and may need blocking at the server
// if it keeps coming.
const BLOCKED = [
  // Commercial SEO / backlink / shopping scrapers — no audience, no benefit.
  'Amazonbot',     // 3,266/day — the single heaviest crawler on the site
  'MJ12bot',       // 2,734/day (Majestic)
  'AhrefsBot',     // 500/day
  'SemrushBot',    // 99/day
  'DotBot',        // 32/day (Moz)
  'BLEXBot',       // not yet seen; same family, cheap to pre-empt
  'DataForSeoBot',
  'Timpibot',
  'ImagesiftBot',

  // Regional search engines whose audiences don't overlap an English-language
  // US/Canada RV travelogue. Reversible if that ever changes.
  'Baiduspider',   // 815/day
  'PetalBot',      // 568/day (Huawei)
  'Bytespider',    // 382/day (ByteDance)

  // AI *training* crawlers. Deliberately NOT the AI *search* agents below —
  // the distinction is what keeps these trips citable in assistant answers
  // while keeping 20 years of family writing out of training corpora.
  'GPTBot',            // 1,330/day (OpenAI training)
  'ClaudeBot',         // 302/day (Anthropic training)
  'anthropic-ai',
  'Claude-Web',
  'PerplexityBot',
  'CCBot',             // Common Crawl — feeds many training sets
  'Google-Extended',   // Gemini training. Separate from Googlebot: blocking
                       // this does NOT affect Search crawling or ranking.
  'Applebot-Extended', // Apple AI training. Likewise separate from Applebot.
  'Meta-ExternalAgent',
  'FacebookBot',
];

export default function robots() {
  return {
    rules: [
      // Everything not named below — including Googlebot, bingbot, Applebot,
      // YandexBot, and the AI search agents (OAI-SearchBot, ChatGPT-User,
      // PerplexityBot's user-initiated fetches) — keeps exactly the access it
      // had before. Google's rules are deliberately untouched.
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api'],
      },
      {
        userAgent: BLOCKED,
        disallow: ['/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
