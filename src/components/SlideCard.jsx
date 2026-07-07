"use client";

import React from 'react';

export default function SlideCard({ title, subtitle, imageUrl, href, onClick }) {
  const content = (
    <div className="bg-[#3f3f46] hover:bg-[#52525b] border border-white/10 hover:border-amber-400/60 rounded overflow-hidden transition-all duration-200 flex flex-col group shadow-md h-full w-full">
      {/* Thumbnail image container with fixed aspect ratio / height so grid stays perfectly aligned */}
      <div className="w-full h-44 sm:h-48 md:h-52 bg-[#27272a] p-2 flex items-center justify-center overflow-hidden relative">
        <img 
          src={imageUrl || "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&auto=format&fit=crop&q=80"} 
          alt={title || "Archive Slide"} 
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 block"
          loading="lazy"
        />
      </div>

      {/* Caption container */}
      <div className="p-2.5 text-center flex-1 flex flex-col items-center justify-center bg-[#3f3f46] group-hover:bg-[#52525b] transition-colors">
        <div className="text-xs sm:text-sm font-medium text-gray-100 line-clamp-2 leading-snug m-0">
          {title}
        </div>
        {subtitle && subtitle !== title && (
          <div className="text-[11px] text-amber-400/90 font-normal mt-1 m-0 truncate w-full">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return <a href={href} className="block h-full w-full no-underline">{content}</a>;
  }
  return <div onClick={onClick} className="cursor-pointer h-full w-full">{content}</div>;
}

