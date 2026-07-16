"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import SlideCard from './SlideCard';

export default function InteractiveTravelogue({
  htmlContent = "",
  photos = [],
  albumTitle = "Travelogue",
  isTrip = false,
  use35mmSlides = false
}) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [extraSlides, setExtraSlides] = useState([]);
  const contentRef = useRef(null);

  // Helper to normalize image URLs or filenames for comparison
  const getNormalizeKey = (u) => {
    if (!u) return "";
    return u.split('?')[0]
      .replace(/^https?:\/\/[^\/]+/i, '')
      .replace(/^\/?photos\//i, '')
      .replace(/^sites\/default\/files\/(?:images\/)?/i, '')
      .replace(/\.(preview|thumbnail|mini)\./i, '.')
      .replace(/\s*\(\d+\)/g, '')
      .replace(/~\d+/g, '')
      .replace(/_exported_\d+([~_]\d+)*/g, '')
      .toLowerCase();
  };
  const getBaseStem = getNormalizeKey;

  // Build unified slideshow list: start with inline story photos in exact chronological order, then append gallery archive photos
  const allSlides = useMemo(() => {
    const list = [];
    const seenKeys = new Set();
    
    // 1. First extract all img tags from HTML string in exact chronological story sequence
    if (htmlContent) {
      const imgRegex = /<img\s+[^>]*src=(["'])([^]*?)\1[^>]*>/gi;
      let match;
      while ((match = imgRegex.exec(htmlContent)) !== null) {
        const fullTag = match[0];
        const src = match[2];
        // Backreference (\1) matches the same quote character that opened the
        // attribute, so an apostrophe inside a double-quoted value (e.g.
        // alt="There's nothing like old friends") no longer truncates the match.
        const mAlt = fullTag.match(/alt=(["'])([^]*?)\1/i);
        const mTitle = fullTag.match(/title=(["'])([^]*?)\1/i);
        const label = (mAlt && mAlt[2]) || (mTitle && mTitle[2]) || "";
        
        const key = getNormalizeKey(src);
        if (!seenKeys.has(key) && src) {
          seenKeys.add(key);
          // Try to find matching photo in archive photos to inherit rich descriptions, captions, and node IDs
          const matchedPhoto = photos.find(p => getNormalizeKey(p.url || p.filename || "") === key);
          list.push({
            url: src,
            title: matchedPhoto ? (matchedPhoto.title || label) : label,
            caption: matchedPhoto ? (matchedPhoto.caption || "") : "",
            nid: matchedPhoto ? (matchedPhoto.nid || matchedPhoto.image_nid) : null,
            ...matchedPhoto
          });
        }
      }
    }

    // 2. Append any remaining gallery archive photos that were NOT embedded
    // in the story HTML. These only ever appear while paging the lightbox
    // past the last inline figure, so they're tagged and captioned
    // "from the photo album" — otherwise the jump into pictures that aren't
    // on the page reads as a glitch.
    if (Array.isArray(photos)) {
      photos.forEach((p) => {
        const url = p.url || (p.filename ? (p.filename.startsWith('/') || p.filename.startsWith('http') ? p.filename : `/photos/${p.filename}`) : "");
        const key = getNormalizeKey(url || p.filename);
        if (!seenKeys.has(key) && url) {
          seenKeys.add(key);
          list.push({
            ...p,
            url: url,
            title: p.title || p.filename || `${albumTitle || ''} Photo`,
            fromAlbum: true
          });
        }
      });
    }

    return list;
  }, [photos, htmlContent, albumTitle]);

  // Slides discovered on-the-fly by clicking an inline image that wasn't in
  // the memoized list (e.g. an <img> the regex above didn't parse). Kept in
  // separate state rather than mutated onto allSlides directly.
  const combinedSlides = useMemo(() => [...allSlides, ...extraSlides], [allSlides, extraSlides]);

  const openLightbox = (index) => setSelectedIndex(index);
  const closeLightbox = () => setSelectedIndex(null);

  const showNext = useCallback(() => {
    if (selectedIndex !== null && combinedSlides.length > 0) {
      setSelectedIndex((prev) => (prev + 1) % combinedSlides.length);
    }
  }, [selectedIndex, combinedSlides.length]);

  const showPrev = useCallback(() => {
    if (selectedIndex !== null && combinedSlides.length > 0) {
      setSelectedIndex((prev) => (prev - 1 + combinedSlides.length) % combinedSlides.length);
    }
  }, [selectedIndex, combinedSlides.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedIndex === null) return;
      if (e.key === 'ArrowRight') showNext();
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, showNext, showPrev]);

  // Robust event delegation handler for inline article clicks
  const handleBodyClick = (e) => {
    const img = e.target.closest('img') || e.target.closest('.drupal-figure')?.querySelector('img');
    if (!img) return;

    e.preventDefault();
    e.stopPropagation();

    const src = img.getAttribute('src');
    if (!src) return;

    const cleanSrc = getNormalizeKey(src);
    let idx = combinedSlides.findIndex(p => {
      const cleanP = getNormalizeKey(p.url);
      return cleanP === cleanSrc && cleanP.length > 0;
    });

    if (idx === -1) {
      const alt = img.getAttribute('alt') || "";
      idx = combinedSlides.length;
      setExtraSlides((prev) => [...prev, { url: src, title: alt || `${albumTitle || ''} Photo` }]);
    }
    setSelectedIndex(idx);
  };

  const currentPhoto = selectedIndex !== null ? combinedSlides[selectedIndex] : null;
  const fallbackImg = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1000&auto=format&fit=crop&q=80";

  return (
    <div>
      {/* Travelogue / Article Body with Event Delegation for Inline Images */}
      <div
        ref={contentRef}
        onClick={handleBodyClick}
        className="text-base leading-relaxed text-[#2e2c26] mb-8 space-y-4 flow-root travelogue-interactive-body"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      {/* Fullscreen Lightbox Modal */}
      {currentPhoto && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.88)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px"
          }}
          onClick={closeLightbox}
        >
          {/* Classic Lightbox White Frame */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "4px",
              padding: "12px 12px 16px 12px",
              boxShadow: "0 25px 70px rgba(0,0,0,0.8)",
              maxWidth: "92vw",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              position: "relative"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Main Image Viewport with 50% Click/Hover Zones */}
            <div
              style={{
                position: "relative",
                display: "inline-block",
                overflow: "hidden",
                borderRadius: "2px",
                maxHeight: "calc(92vh - 80px)",
                maxWidth: "calc(92vw - 24px)",
                margin: "0 auto"
              }}
            >
              <img
                src={currentPhoto.url}
                alt={currentPhoto.title || "Full resolution slide"}
                style={{
                  maxHeight: "calc(92vh - 80px)",
                  maxWidth: "calc(92vw - 24px)",
                  objectFit: "contain",
                  display: "block",
                  margin: "0 auto"
                }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = fallbackImg;
                }}
              />

              {/* Left Prev Zone (50% width) */}
              {combinedSlides.length > 1 && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    showPrev();
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "50%",
                    height: "100%",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    paddingLeft: "20px",
                    zIndex: 20
                  }}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget.querySelector('.nav-arrow-left');
                    if (btn) btn.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget.querySelector('.nav-arrow-left');
                    if (btn) btn.style.opacity = '0';
                  }}
                  title="Previous Image"
                >
                  <div
                    className="nav-arrow-left"
                    style={{
                      background: "rgba(0, 0, 0, 0.75)",
                      color: "#ffffff",
                      padding: "14px 20px",
                      borderRadius: "4px",
                      fontSize: "1.8rem",
                      fontWeight: "bold",
                      opacity: 0,
                      transition: "opacity 0.2s ease",
                      userSelect: "none",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
                      border: "1px solid rgba(255,255,255,0.4)"
                    }}
                  >
                    &#10094;
                  </div>
                </div>
              )}

              {/* Right Next Zone (50% width) */}
              {combinedSlides.length > 1 && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    showNext();
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "50%",
                    height: "100%",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: "20px",
                    zIndex: 20
                  }}
                  onMouseEnter={(e) => {
                    const btn = e.currentTarget.querySelector('.nav-arrow-right');
                    if (btn) btn.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget.querySelector('.nav-arrow-right');
                    if (btn) btn.style.opacity = '0';
                  }}
                  title="Next Image"
                >
                  <div
                    className="nav-arrow-right"
                    style={{
                      background: "rgba(0, 0, 0, 0.75)",
                      color: "#ffffff",
                      padding: "14px 20px",
                      borderRadius: "4px",
                      fontSize: "1.8rem",
                      fontWeight: "bold",
                      opacity: 0,
                      transition: "opacity 0.2s ease",
                      userSelect: "none",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
                      border: "1px solid rgba(255,255,255,0.4)"
                    }}
                  >
                    &#10095;
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Caption & Controls in White Frame */}
            <div
              style={{
                marginTop: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                color: "#333333",
                fontFamily: "sans-serif",
                paddingTop: "6px",
                borderTop: "1px solid #eeeeee"
              }}
            >
              <div style={{ flex: 1, paddingRight: "16px" }}>
                <div style={{ fontWeight: "600", fontSize: "0.95rem", color: "#111111", marginBottom: "4px", lineHeight: "1.4" }}>
                  {currentPhoto.title || `Photograph ${selectedIndex + 1}`}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#666666", fontWeight: "500" }}>
                  Image {selectedIndex + 1} of {combinedSlides.length}
                  {currentPhoto.fromAlbum && (
                    <span style={{ fontStyle: "italic", color: "#8a7a5c" }}> · from the photo album</span>
                  )}
                </div>
              </div>

              <button
                onClick={closeLightbox}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#666666",
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  cursor: "pointer",
                  padding: "0 4px",
                  lineHeight: "1",
                  transition: "color 0.15s ease"
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = "#000000")}
                onMouseOut={(e) => (e.currentTarget.style.color = "#666666")}
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
