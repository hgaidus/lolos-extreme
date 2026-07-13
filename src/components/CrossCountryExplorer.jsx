"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const AUTO_ADVANCE_MS = 5000;

export default function CrossCountryExplorer({ trips }) {
  const [idx, setIdx] = useState(trips.length - 1);
  const [autoPlay, setAutoPlay] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const trip = trips[idx];

  // Respect the OS/browser-level "reduce motion" preference — never
  // auto-cycle for users who've asked for less on-screen movement.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Also pause while the tab is in the background, so nobody comes back
  // to a map that's jumped years ahead while they were away.
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const handler = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  const paused = !autoPlay || hovered || reducedMotion || hidden;

  // A plain setTimeout (re-armed whenever idx changes) rather than
  // setInterval, so manually picking a year gives a full fresh interval
  // before it advances again instead of jumping right away.
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => {
      setIdx((i) => (i + 1) % trips.length);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [idx, paused, trips.length]);

  return (
    <div
      className="glass-card lg:sticky lg:top-4 overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <div className="px-3.5 pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[0.62rem] uppercase tracking-wide text-[#8a8272] font-bold">1999–2016</div>
          {!reducedMotion && (
            <button
              type="button"
              onClick={() => setAutoPlay((p) => !p)}
              aria-label={autoPlay ? "Pause year auto-advance" : "Resume year auto-advance"}
              title={autoPlay ? "Pause auto-advance" : "Resume auto-advance"}
              className="text-[0.62rem] font-bold rounded-full px-2 py-0.5 border cursor-pointer flex items-center gap-1"
              style={{ color: "#8a8272", borderColor: "rgba(90,74,50,0.14)", background: "rgba(0,0,0,0.03)" }}
            >
              {autoPlay ? "⏸" : "▶"} {autoPlay ? "Auto" : "Paused"}
            </button>
          )}
        </div>
        <div className="font-serif text-[0.98rem] text-[#2e2c26] mt-0.5 mb-1.5">Cross Country Trip Archive</div>
        <p className="text-[0.72rem] text-[#6b6656] leading-relaxed mb-2.5">
          Our last full cross-country run was in 2016 &ndash; these days we stay closer to home. But if you&apos;re mapping out your own trip across the country, these routes are still a solid place to start.
        </p>
      </div>

      <div className="mx-3.5 rounded-md overflow-hidden relative" style={{ maxWidth: "450px", aspectRatio: "3 / 2" }}>
        {trip.gif ? (
          <img
            key={trip.gif}
            src={`/maps/${trip.gif}`}
            alt={`${trip.name} route map`}
            width={450}
            height={300}
            className="w-full h-full object-contain bg-white"
          />
        ) : (
          <div
            className="w-full h-full relative"
            style={{ background: "linear-gradient(135deg,#cfe0d3,#9fb6a2 55%,#f0b49a)" }}
          >
            <span
              className="absolute rounded-full"
              style={{
                left: "50%", top: "50%", width: "10px", height: "10px",
                background: "#c1593a", transform: "translate(-50%,-50%)",
                boxShadow: "0 0 0 4px rgba(193,89,58,0.22)",
              }}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1 px-3.5 pt-2.5">
        {trips.map((t, i) => (
          <button
            key={t.href}
            onClick={() => setIdx(i)}
            className="text-[0.64rem] font-bold rounded-full px-2 py-0.5 border cursor-pointer"
            style={{
              background: i === idx ? "#c1593a" : "rgba(0,0,0,0.03)",
              color: i === idx ? "#fff" : "#8a8272",
              borderColor: i === idx ? "#c1593a" : "rgba(90,74,50,0.14)",
            }}
          >
            {t.yr}
          </button>
        ))}
      </div>

      <div className="flex items-baseline gap-x-2 gap-y-1 px-3.5 pt-2.5 flex-wrap">
        <div className="font-bold text-[0.92rem] text-[#2e2c26]">{trip.name}</div>
        <div className="flex items-baseline gap-1 ml-1">
          <span className="font-extrabold text-[0.78rem] text-[#a54a2f]">{trip.days}</span>
          <span className="text-[0.58rem] uppercase tracking-wide text-[#8a8272]">days</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-extrabold text-[0.78rem] text-[#a54a2f]">{trip.miles.toLocaleString()}</span>
          <span className="text-[0.58rem] uppercase tracking-wide text-[#8a8272]">miles</span>
        </div>
        <Link href={`/${trip.href}`} className="ml-auto font-bold text-[0.76rem] text-[#3f5c4c] hover:text-[#c1593a] whitespace-nowrap hover:underline">
          View full trip →
        </Link>
      </div>

      <div className="px-3.5 pb-4 pt-2.5 mt-2.5 border-t border-black/10 text-[0.78rem] leading-relaxed text-[#3d3a30]">
        <div className="text-[0.62rem] uppercase tracking-wide text-[#8a8272] font-bold mb-1">About this trip</div>
        {trip.teaser}

        {trip.highlights && trip.highlights.length > 0 && (
          <>
            <div className="text-[0.62rem] uppercase tracking-wide text-[#8a8272] font-bold mt-3 mb-1">Trip highlights</div>
            <ul className="m-0 pl-4 space-y-0.5" style={{ listStyleType: "disc" }}>
              {trip.highlights.map((h) => (
                <li key={h.slug}>
                  <Link href={`/${h.slug}`} className="text-[#3f5c4c] hover:text-[#c1593a] hover:underline">
                    {h.label}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
