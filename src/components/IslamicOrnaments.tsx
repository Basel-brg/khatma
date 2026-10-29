'use client';

import React from 'react';

export function toArabicDigits(num: number | string): string {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num)
    .split('')
    .map((c) => (arabicNumbers[parseInt(c, 10)] !== undefined ? arabicNumbers[parseInt(c, 10)] : c))
    .join('');
}

/**
 * Intricate 8-pointed Islamic Shamsa Rosette (شمسة إسلامية ثمانية مذهّبة)
 * Used in the top obsidian-emerald architectural banner.
 */
export function ShamsaRosette({ className = 'w-24 h-24 text-[#C5A059]' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer rotated square 1 */}
      <rect
        x="18"
        y="18"
        width="84"
        height="84"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Outer rotated square 2 (45 deg) */}
      <rect
        x="18"
        y="18"
        width="84"
        height="84"
        transform="rotate(45 60 60)"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Inner rotated squares */}
      <rect
        x="28"
        y="28"
        width="64"
        height="64"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.75"
      />
      <rect
        x="28"
        y="28"
        width="64"
        height="64"
        transform="rotate(45 60 60)"
        stroke="currentColor"
        strokeWidth="1"
        strokeOpacity="0.75"
      />
      {/* 8-Pointed Star Petals */}
      <g stroke="currentColor" strokeWidth="1.25">
        <path d="M60 14 L68 42 L96 34 L76 54 L106 60 L76 66 L96 86 L68 78 L60 106 L52 78 L24 86 L44 66 L14 60 L44 54 L24 34 L52 42 Z" />
      </g>
      {/* Inner floral geometric ring */}
      <circle cx="60" cy="60" r="22" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="60" cy="60" r="15" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
      {/* Center 8-petal rosette */}
      <path
        d="M60 44 L64 56 L76 60 L64 64 L60 76 L56 64 L44 60 L56 56 Z"
        fill="currentColor"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <circle cx="60" cy="60" r="4" fill="currentColor" />
    </svg>
  );
}

/**
 * Scalloped Deep-Emerald Letterpress Seal Stamp (ختم «خُتم» الدائري المموج)
 * Displayed inside completed Juz' compartments in the Rab'ah matrix.
 */
export function KhatmSealStamp({ className = 'w-16 h-16 sm:w-20 sm:h-20' }: { className?: string }) {
  return (
    <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
        aria-hidden="true"
      >
        {/* Scalloped 12-lobed wax/letterpress outer seal */}
        <path
          d="M50 3 C56 3, 60 7, 66 6 C72 5, 77 10, 81 15 C85 20, 91 22, 93 28 C95 34, 93 40, 96 46 C98 52, 95 58, 93 64 C91 70, 93 76, 88 81 C83 86, 77 86, 72 90 C67 94, 62 97, 56 96 C50 95, 44 97, 38 94 C32 91, 26 92, 21 88 C16 84, 15 77, 11 72 C7 67, 4 61, 5 55 C6 49, 3 43, 6 37 C9 31, 8 24, 13 19 C18 14, 24 14, 29 10 C34 6, 40 3, 46 4 Z"
          fill="#11382A"
          stroke="#235743"
          strokeWidth="2"
        />
        {/* Inner double engraved ring */}
        <circle
          cx="50"
          cy="50"
          r="38"
          stroke="#C5A059"
          strokeOpacity="0.65"
          strokeWidth="1.2"
        />
        <circle
          cx="50"
          cy="50"
          r="34"
          stroke="#C5A059"
          strokeOpacity="0.35"
          strokeWidth="0.8"
          strokeDasharray="2 2"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-quran text-lg sm:text-xl font-bold text-[#C5A059] tracking-wide pt-0.5">
        خُتِم
      </span>
    </div>
  );
}

/**
 * Corner Registration Crosshairs (+ marks at the 4 inner corners of each architectural cell)
 */
export function CornerCrosshairs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <span className="absolute top-1 right-1.5 text-[9px] leading-none font-mono text-[#B3914B]/70 select-none">
        +
      </span>
      <span className="absolute top-1 left-1.5 text-[9px] leading-none font-mono text-[#B3914B]/70 select-none">
        +
      </span>
      <span className="absolute bottom-1 right-1.5 text-[9px] leading-none font-mono text-[#B3914B]/70 select-none">
        +
      </span>
      <span className="absolute bottom-1 left-1.5 text-[9px] leading-none font-mono text-[#B3914B]/70 select-none">
        +
      </span>
    </div>
  );
}

/**
 * Authentic Mushaf Surah Header Cartouche Banner (إطار عنوان السورة المحفور)
 * Modeled after the classical Madinah Mushaf & Ayah app engraving.
 */
export function SurahCartoucheBanner({
  surahNameAr,
  isDarkMode = true,
}: {
  surahNameAr: string;
  isDarkMode?: boolean;
}) {
  const cleanName = surahNameAr.startsWith('سورة') ? surahNameAr : `سورة ${surahNameAr}`;

  return (
    <div
      className={`relative w-full my-4 select-none overflow-hidden rounded-md transition-colors ${
        isDarkMode
          ? 'bg-[#07140E] text-[#FFFFFF] border border-[#C5A059] shadow-[inset_0_0_15px_rgba(197,160,89,0.15)]'
          : 'bg-[#FFFFFF] text-[#091B15] border border-[#C5A059] shadow-xs'
      }`}
      aria-label={cleanName}
    >
      <div className="relative py-2.5 px-3 sm:px-6 flex items-center justify-between">
        {/* Right Floral Rosette Arabesque in Gold */}
        <div className="shrink-0 text-[#C5A059] opacity-85">
          <svg
            viewBox="0 0 48 48"
            className="w-8 h-8 sm:w-10 sm:h-10 text-current"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
          >
            <circle cx="24" cy="24" r="20" strokeDasharray="2 2" />
            <circle cx="24" cy="24" r="14" />
            <path d="M24 6 C28 16 32 20 42 24 C32 28 28 32 24 42 C20 32 16 28 6 24 C16 20 20 16 24 6 Z" fill="currentColor" fillOpacity="0.18" />
            <circle cx="24" cy="24" r="3" fill="currentColor" />
          </svg>
        </div>

        {/* Center Scalloped Cartouche with Surah Title */}
        <div className="flex-1 text-center px-2">
          <div className="inline-block relative px-5 py-1">
            <span className="text-xl sm:text-2xl font-quran font-bold tracking-wider text-current drop-shadow-xs">
              {cleanName}
            </span>
          </div>
        </div>

        {/* Left Floral Rosette Arabesque in Gold */}
        <div className="shrink-0 text-[#C5A059] opacity-85">
          <svg
            viewBox="0 0 48 48"
            className="w-8 h-8 sm:w-10 sm:h-10 text-current"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
          >
            <circle cx="24" cy="24" r="20" strokeDasharray="2 2" />
            <circle cx="24" cy="24" r="14" />
            <path d="M24 6 C28 16 32 20 42 24 C32 28 28 32 24 42 C20 32 16 28 6 24 C16 20 20 16 24 6 Z" fill="currentColor" fillOpacity="0.18" />
            <circle cx="24" cy="24" r="3" fill="currentColor" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/**
 * 8-Pointed Gold Islamic Star Medallion for Quran Verse Numbers
 */
export function AyahStarMedallion({
  number,
  isCurrent = false,
  isDarkMode = false,
}: {
  number: number;
  isCurrent?: boolean;
  isDarkMode?: boolean;
}) {
  return (
    <span
      className="relative inline-flex items-center justify-center w-[1.7em] h-[1.7em] mx-1 align-middle select-none"
      title={`آية ${number}`}
    >
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        <circle
          cx="18"
          cy="18"
          r="14"
          fill={isCurrent ? '#C5A059' : isDarkMode ? '#0A1C15' : '#FFFFFF'}
          stroke={isCurrent ? '#FDF6E7' : '#C5A059'}
          strokeWidth="1.3"
        />
        <circle
          cx="18"
          cy="18"
          r="11"
          stroke={isCurrent ? '#091B15' : '#C5A059'}
          strokeWidth="0.8"
          strokeDasharray="2.5 1.5"
          strokeOpacity="0.8"
        />
      </svg>
      <span
        className={`relative z-10 text-[0.62em] font-sans font-bold leading-none pt-[1px] ${
          isCurrent
            ? 'text-[#091B15]'
            : isDarkMode
            ? 'text-[#FFFFFF]'
            : 'text-[#091B15]'
        }`}
      >
        {toArabicDigits(number)}
      </span>
    </span>
  );
}
