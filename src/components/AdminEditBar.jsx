import Link from 'next/link';

// The contextual edit link the old Drupal site had: when you are signed in,
// every page you are looking at offers a way straight into its editor, so
// fixing a typo you just spotted does not mean navigating the CMS to find the
// record again.
//
// Server-rendered and conditional on the session, so nothing about it reaches
// an anonymous visitor — not the markup, not the href. That is only safe
// because every page rendering this is force-dynamic; on a cached page a
// cookie-dependent branch would leak the bar to whoever warmed the cache.
export default function AdminEditBar({ href, label, hint }) {
  if (!href) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded border border-[#c1593a]/35 bg-[#c1593a]/8 px-3 py-2 font-sans text-sm">
      <span className="font-bold uppercase tracking-wider text-[11px] text-[#a54a2f]">
        Signed in
      </span>
      <Link
        href={href}
        className="font-semibold text-[#a54a2f] underline underline-offset-2 hover:text-[#8f3f28]"
      >
        {label}
      </Link>
      {hint && <span className="text-[#8a8272]">{hint}</span>}
    </div>
  );
}
