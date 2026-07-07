"use client";

import dynamic from 'next/dynamic';
import React from 'react';

const InteractiveMap = dynamic(() => import('./InteractiveMap'), {
  ssr: false,
  loading: () => (
    <div className="glass-panel" style={{ height: "580px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--color-gold-primary)", gap: "16px", border: "2px solid var(--border-gold)" }}>
      <div style={{ fontSize: "3rem" }}>🚐</div>
      <div style={{ fontSize: "1.3rem", fontWeight: "700" }}>Loading North American Interactive GPS Map...</div>
      <div style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>Preparing verified campsite waypoints across 49 states &amp; 10 provinces</div>
    </div>
  )
});

export default function InteractiveMapWrapper(props) {
  return <InteractiveMap {...props} />;
}
