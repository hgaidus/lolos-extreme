"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import SlideCard from './SlideCard';

export default function LightboxViewer({ photos = [], albumTitle = "Photo Gallery", use35mmSlides = true }) {
  const [selectedIndex, setSelectedIndex] = useState(null);

  // Remembers which tile opened the lightbox so focus can go back there on
  // close — otherwise a keyboard user is dumped at the top of the document.
  const triggerRef = useRef(null);

  const openLightbox = (index, event) => {
    triggerRef.current = event?.currentTarget || null;
    setSelectedIndex(index);
  };
  const closeLightbox = useCallback(() => {
    setSelectedIndex(null);
    if (triggerRef.current) triggerRef.current.focus();
  }, []);

  const showNext = useCallback(() => {
    if (selectedIndex !== null) {
      setSelectedIndex((prev) => (prev + 1) % photos.length);
    }
  }, [selectedIndex, photos.length]);

  const showPrev = useCallback(() => {
    if (selectedIndex !== null) {
      setSelectedIndex((prev) => (prev - 1 + photos.length) % photos.length);
    }
  }, [selectedIndex, photos.length]);

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

  if (photos.length === 0) {
    return <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>No historical photos found in this gallery archive.</div>;
  }

  const currentPhoto = selectedIndex !== null ? photos[selectedIndex] : null;
  const fallbackImg = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1000&auto=format&fit=crop&q=80";

  return (
    <div>
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
        {photos.map((photo, idx) => {
          return use35mmSlides ? (
            <SlideCard
              key={idx}
              title={photo.title || `Slide #${idx + 1}`}
              imageUrl={photo.url}
              onClick={(e) => openLightbox(idx, e)}
            />
          ) : (
            // <button>, not a clickable div: opening a photo must work by
            // keyboard and be announced as interactive. appearance-none/border-0
            // resets the default button chrome so it looks unchanged.
            <button
              key={idx}
              type="button"
              onClick={(e) => openLightbox(idx, e)}
              aria-label={`Open photo${photo.title ? `: ${photo.title}` : ` ${idx + 1}`}`}
              className="appearance-none p-0 text-left bg-white hover:bg-[#faf6ee] border border-[#e4dcc8] hover:border-[#c1593a]/50 rounded overflow-hidden cursor-pointer transition-all duration-200 flex flex-col group shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c1593a]"
            >
              <div className="w-full h-44 sm:h-48 md:h-52 bg-[#f2ede1] p-2 flex items-center justify-center overflow-hidden relative">
                <img
                  src={photo.url}
                  alt={photo.title || `Photo ${idx + 1}`}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 block"
                  loading="lazy"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = fallbackImg;
                  }}
                />
              </div>
              {photo.title && (
                <div className="p-2.5 text-center flex-1 flex items-center justify-center bg-white group-hover:bg-[#faf6ee] transition-colors">
                  <p className="text-xs sm:text-sm font-medium text-[#2e2c26] line-clamp-2 leading-snug m-0">
                    {photo.title}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>

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
              {photos.length > 1 && (
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
              {photos.length > 1 && (
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
                  Image {selectedIndex + 1} of {photos.length}
                </div>
                {currentPhoto.stopSlug && (
                  <Link
                    href={`/${currentPhoto.stopSlug}`}
                    style={{ display: "inline-block", marginTop: "6px", fontSize: "0.8rem", fontWeight: "600", color: "#3f5c4c" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#c1593a")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "#3f5c4c")}
                  >
                    Go to Trip Stop{currentPhoto.stopTitle ? `: ${currentPhoto.stopTitle}` : ""} &rarr;
                  </Link>
                )}
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
