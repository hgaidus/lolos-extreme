import Link from 'next/link';
import { tripIndex } from '@/data/tripIndex';

export const metadata = {
  title: "Trip Index | Lolo's Extreme Cross Country RV Trips",
  description: "A complete directory of every cross-country, East Coast, West Coast, and international trip on the site, grouped by region.",
};

const SECTIONS = [
  { key: 'crossCountry', label: 'Cross Country Trips', anchor: 'cross-country' },
  { key: 'eastCoast', label: 'East Coast Trips', anchor: 'east-coast' },
  { key: 'westCoast', label: 'West Coast Trips', anchor: 'west-coast' },
  { key: 'international', label: 'International Trips', anchor: 'international' },
];

export default function TripIndexPage() {
  return (
    <div>
      <div className="mb-6 flex gap-2 items-center text-sm flex-wrap">
        <Link href="/" className="text-[#c1593a] font-semibold hover:underline">Home</Link>
        <span className="text-[#a89e8a]">/</span>
        <span className="text-[#5c5648] font-medium">Trip Index</span>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto 36px auto', textAlign: 'center' }}>
        <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gold-primary)', fontWeight: 700 }}>
          Every Trip, One Page
        </span>
        <h1 style={{ fontSize: '3rem', marginTop: '8px', marginBottom: '16px', color: 'var(--text-primary)' }}>
          Trip Index
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
          A complete directory of every trip on the site, grouped by region &mdash; carried over from the original
          site&apos;s index page. Jump to a section below, or scan the full list.
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: '10px',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginBottom: '40px',
      }}>
        {SECTIONS.map(s => (
          <a
            key={s.anchor}
            href={`#${s.anchor}`}
            style={{
              padding: '8px 16px',
              borderRadius: '999px',
              border: '1px solid var(--border-gold)',
              color: 'var(--color-gold-dark)',
              fontWeight: 600,
              fontSize: '0.9rem',
              textDecoration: 'none',
              background: 'var(--bg-card)',
            }}
          >
            {s.label}
          </a>
        ))}
      </div>

      {SECTIONS.map(s => (
        <section key={s.anchor} id={s.anchor} style={{ maxWidth: '900px', margin: '0 auto 48px auto', scrollMarginTop: '80px' }}>
          <h2 style={{
            fontSize: '1.6rem',
            color: 'var(--color-green-dark)',
            borderBottom: '2px solid var(--border-gold)',
            paddingBottom: '8px',
            marginBottom: '18px',
          }}>
            {s.label}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {tripIndex[s.key].map(trip => (
              <div key={trip.href}>
                <Link
                  href={trip.href}
                  style={{ color: 'var(--color-gold-primary)', fontWeight: 700, fontSize: '1.05rem', textDecoration: 'none' }}
                >
                  {trip.title}
                </Link>
                <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: '1.6' }}>
                  {trip.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
