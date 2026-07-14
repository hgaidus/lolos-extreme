"use client";

import React from 'react';

export default function SlideCard({ title, subtitle, imageUrl, href, onClick }) {
  const content = (
    <div className="bg-white hover:bg-[#faf6ee] border border-[#e4dcc8] hover:border-[#c1593a]/50 rounded overflow-hidden transition-all duration-200 flex flex-col group shadow-md h-full w-full">
      {/* Thumbnail image container with fixed aspect ratio / height so grid stays perfectly aligned */}
      <div className="w-full h-44 sm:h-48 md:h-52 bg-[#f2ede1] p-2 flex items-center justify-center overflow-hidden relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title || "Archive Slide"}
            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 block"
            loading="lazy"
          />
        ) : (
          <span className="text-xs text-[#8a8272] italic px-2 text-center">No preview available</span>
        )}
      </div>

      {/* Caption container */}
      <div className="p-2.5 text-center flex-1 flex flex-col items-center justify-center bg-white group-hover:bg-[#faf6ee] transition-colors">
        <div className="text-xs sm:text-sm font-medium text-[#2e2c26] line-clamp-2 leading-snug m-0">
          {title}
        </div>
        {subtitle && subtitle !== title && (
          <div className="text-[11px] text-[#c1593a]/90 font-normal mt-1 m-0 truncate w-full">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <a href={href} className="block h-full w-full no-underline">{content}</a>;
  }
  // A real <button>, not a clickable div: this opens the lightbox, so it has to
  // be reachable by keyboard and announced as interactive. The classes strip the
  // browser's default button chrome so it renders identically to the old div.
  return (
    <button
      type="button"
      onClick={onClick}
      className="block h-full w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-left font-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c1593a]"
    >
      {content}
    </button>
  );
}

