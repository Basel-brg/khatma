'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { JuzContent, JuzAyah, loadJuzFromDiskOrFetch } from '../lib/quran-loader';
import { JUZ_METADATA } from '../lib/quran-meta';
import { useKhatmaTheme } from '../lib/theme';
import AudioReciterBar from './AudioReciterBar';
import { AyahStarMedallion, SurahCartoucheBanner, toArabicDigits } from './IslamicOrnaments';
import {
  X,
  CheckCircle,
  Undo2,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  Settings,
  Search,
  List,
  MessageSquareText,
  CornerUpLeft,
} from 'lucide-react';

export interface QuranReaderModalProps {
  juzNumber: number;
  khatmaId: string;
  uid: string;
  isReservedByMe: boolean;
  isCompleted: boolean;
  onClose: () => void;
  onComplete: () => Promise<void> | void;
  onUnreserve: () => Promise<void> | void;
}

interface MushafPageSection {
  surahNumber: number;
  surahNameAr: string;
  revelationType: 'Meccan' | 'Medinan';
  showHeader: boolean;
  showBasmala: boolean;
  ayahs: JuzAyah[];
}

interface MushafPageData {
  pageNumber: number;
  pageIndexInJuz: number;
  firstSurahNameAr: string;
  firstSurahNumber: number;
  hizbQuarter?: number;
  sections: MushafPageSection[];
}

export default function QuranReaderModal({
  juzNumber,
  khatmaId,
  uid,
  isReservedByMe,
  isCompleted,
  onClose,
  onComplete,
  onUnreserve,
}: QuranReaderModalProps) {
  const meta = useMemo(() => {
    return JUZ_METADATA.find((m) => m.number === juzNumber) || JUZ_METADATA[0];
  }, [juzNumber]);

  const initialFallbackContent = useMemo<JuzContent>(() => {
    const defaultPage = juzNumber === 1 ? 1 : (juzNumber - 1) * 20 + 2;
    return {
      juzNumber,
      nameAr: meta.nameAr,
      sections: [
        {
          surahNumber: meta.number === 1 ? 1 : meta.number * 2,
          surahNameAr: `سورة ${meta.startSurahName}`,
          revelationType: 'Meccan',
          showBasmala: meta.number !== 9,
          ayahs: [
            {
              surahNumber: meta.number === 1 ? 1 : meta.number * 2,
              ayahNumber: meta.startAyah,
              page: defaultPage,
              textUthmani: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
            },
            {
              surahNumber: meta.number === 1 ? 1 : meta.number * 2,
              ayahNumber: meta.startAyah + 1,
              page: defaultPage,
              textUthmani:
                meta.number === 1
                  ? 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ'
                  : 'ٱلَّذِينَ يُؤْمِنُونَ بِٱلْغَيْبِ وَيُقِيمُونَ ٱلصَّلَوٰةَ وَمِمَّا رَزَقْنَـٰهُمْ يُنفِقُونَ',
            },
          ],
        },
      ],
      totalAyahs: 2,
    };
  }, [juzNumber, meta]);

  const [juzData, setJuzData] = useState<JuzContent>(initialFallbackContent);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(25);
  const { isDark: isDarkMode, toggleTheme: toggleDarkMode } = useKhatmaTheme();
  // By default, show controls so users notice options, and clicking the page toggles full-screen mode
  const [showControls, setShowControls] = useState<boolean>(true);

  const [activeSurahNumber, setActiveSurahNumber] = useState<number>(
    initialFallbackContent.sections[0].surahNumber
  );
  const [activeAyahNumber, setActiveAyahNumber] = useState<number>(
    initialFallbackContent.sections[0].ayahs[0].ayahNumber
  );
  const [currentPageIdx, setCurrentPageIdx] = useState<number>(0);
  const [isSubmittingComplete, setIsSubmittingComplete] = useState<boolean>(false);
  const [isSubmittingUnreserve, setIsSubmittingUnreserve] = useState<boolean>(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const mushafPages = useMemo<MushafPageData[]>(() => {
    if (!juzData || !juzData.sections.length) return [];

    const pageMap = new Map<number, MushafPageSection[]>();
    const pageMeta = new Map<
      number,
      { firstSurahNameAr: string; firstSurahNumber: number; hizbQuarter?: number }
    >();

    let fallbackPageCounter = juzNumber === 1 ? 1 : (juzNumber - 1) * 20 + 2;
    let ayahCountInFallbackPage = 0;

    for (const section of juzData.sections) {
      for (const ayah of section.ayahs) {
        let pNum = ayah.page;
        if (!pNum) {
          ayahCountInFallbackPage++;
          if (ayahCountInFallbackPage > 12) {
            fallbackPageCounter++;
            ayahCountInFallbackPage = 1;
          }
          pNum = fallbackPageCounter;
        }

        if (!pageMap.has(pNum)) {
          pageMap.set(pNum, []);
          pageMeta.set(pNum, {
            firstSurahNameAr: section.surahNameAr,
            firstSurahNumber: section.surahNumber,
            hizbQuarter: ayah.hizbQuarter,
          });
        }

        const sectionsOnPage = pageMap.get(pNum)!;
        let lastSec = sectionsOnPage[sectionsOnPage.length - 1];
        if (!lastSec || lastSec.surahNumber !== section.surahNumber) {
          const isStartOfSurah = ayah.ayahNumber === 1;
          lastSec = {
            surahNumber: section.surahNumber,
            surahNameAr: section.surahNameAr,
            revelationType: section.revelationType,
            showHeader: isStartOfSurah,
            showBasmala: isStartOfSurah && section.surahNumber !== 1 && section.surahNumber !== 9,
            ayahs: [],
          };
          sectionsOnPage.push(lastSec);
        }
        lastSec.ayahs.push(ayah);
      }
    }

    const sortedPageNumbers = Array.from(pageMap.keys()).sort((a, b) => a - b);
    return sortedPageNumbers.map((pageNumber, idx) => {
      const m = pageMeta.get(pageNumber)!;
      return {
        pageNumber,
        pageIndexInJuz: idx,
        firstSurahNameAr: m.firstSurahNameAr,
        firstSurahNumber: m.firstSurahNumber,
        hizbQuarter: m.hizbQuarter,
        sections: pageMap.get(pageNumber)!,
      };
    });
  }, [juzData, juzNumber]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    async function fetchJuz() {
      try {
        const data = await loadJuzFromDiskOrFetch(juzNumber);
        if (isMounted) {
          setJuzData(data);
          let restoredBookmark = false;
          try {
            const saved = localStorage.getItem(`khatma_bookmark_${khatmaId}_juz_${juzNumber}`);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed?.surahNumber && parsed?.ayahNumber) {
                setActiveSurahNumber(parsed.surahNumber);
                setActiveAyahNumber(parsed.ayahNumber);
                restoredBookmark = true;
              }
            }
          } catch {}

          if (!restoredBookmark && data.sections.length > 0 && data.sections[0].ayahs.length > 0) {
            setActiveSurahNumber(data.sections[0].surahNumber);
            setActiveAyahNumber(data.sections[0].ayahs[0].ayahNumber);
            setCurrentPageIdx(0);
          }
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchJuz();
    return () => {
      isMounted = false;
    };
  }, [juzNumber, khatmaId]);

  useEffect(() => {
    if (!mushafPages.length) return;
    const foundPageIdx = mushafPages.findIndex((p) =>
      p.sections.some((s) =>
        s.ayahs.some(
          (a) => a.surahNumber === activeSurahNumber && a.ayahNumber === activeAyahNumber
        )
      )
    );
    if (foundPageIdx !== -1 && foundPageIdx !== currentPageIdx) {
      setCurrentPageIdx(foundPageIdx);
    }
  }, [activeSurahNumber, activeAyahNumber, mushafPages]);

  const allAyahs = useMemo(() => {
    if (!juzData) return [];
    const list: { surahNumber: number; surahNameAr: string; ayahNumber: number }[] = [];
    for (const section of juzData.sections) {
      for (const ayah of section.ayahs) {
        list.push({
          surahNumber: ayah.surahNumber,
          surahNameAr: section.surahNameAr,
          ayahNumber: ayah.ayahNumber,
        });
      }
    }
    return list;
  }, [juzData]);

  const currentAyahIndex = useMemo(() => {
    return allAyahs.findIndex(
      (a) => a.surahNumber === activeSurahNumber && a.ayahNumber === activeAyahNumber
    );
  }, [allAyahs, activeSurahNumber, activeAyahNumber]);

  const currentSurahNameAr = useMemo(() => {
    const found = allAyahs[currentAyahIndex];
    return found?.surahNameAr || mushafPages[currentPageIdx]?.firstSurahNameAr || '';
  }, [allAyahs, currentAyahIndex, mushafPages, currentPageIdx]);

  const selectAyah = (surahNumber: number, ayahNumber: number) => {
    setActiveSurahNumber(surahNumber);
    setActiveAyahNumber(ayahNumber);
    try {
      localStorage.setItem(
        `khatma_bookmark_${khatmaId}_juz_${juzNumber}`,
        JSON.stringify({ surahNumber, ayahNumber })
      );
    } catch {}
  };

  const handleNextAyah = () => {
    if (allAyahs.length === 0) return;
    const nextIdx = currentAyahIndex + 1 < allAyahs.length ? currentAyahIndex + 1 : 0;
    const next = allAyahs[nextIdx];
    selectAyah(next.surahNumber, next.ayahNumber);
  };

  const handlePrevAyah = () => {
    if (allAyahs.length === 0) return;
    const prevIdx =
      currentAyahIndex - 1 >= 0 ? currentAyahIndex - 1 : allAyahs.length - 1;
    const prev = allAyahs[prevIdx];
    selectAyah(prev.surahNumber, prev.ayahNumber);
  };

  const goToPage = (newPageIdx: number) => {
    if (newPageIdx < 0 || newPageIdx >= mushafPages.length) return;
    setCurrentPageIdx(newPageIdx);
    const targetPage = mushafPages[newPageIdx];
    if (targetPage?.sections[0]?.ayahs[0]) {
      const firstAyah = targetPage.sections[0].ayahs[0];
      selectAyah(firstAyah.surahNumber, firstAyah.ayahNumber);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      if (deltaX > 0) {
        if (currentPageIdx + 1 < mushafPages.length) {
          goToPage(currentPageIdx + 1);
        }
      } else {
        if (currentPageIdx - 1 >= 0) {
          goToPage(currentPageIdx - 1);
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleCompleteClick = async () => {
    setIsSubmittingComplete(true);
    try {
      await onComplete();
      onClose();
    } finally {
      setIsSubmittingComplete(false);
    }
  };

  const handleUnreserveClick = async () => {
    setIsSubmittingUnreserve(true);
    try {
      await onUnreserve();
      onClose();
    } finally {
      setIsSubmittingUnreserve(false);
    }
  };

  const activePage = mushafPages[currentPageIdx] || mushafPages[0];
  const totalPagesInJuz = mushafPages.length || 1;

  return (
    <div
      data-testid="quran-reader-modal"
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden select-none transition-colors duration-200 ${
        isDarkMode ? 'bg-[#181818] text-[#EDEBE8]' : 'bg-[#FAF7F0] text-[#1A1A1A]'
      }`}
      dir="rtl"
    >
      {/* 1. Sleek Floating Top Bar (Matching user's Reference Image) */}
      <header
        className={`fixed top-0 inset-x-0 z-40 flex items-center justify-between px-3 sm:px-6 py-2.5 backdrop-blur-md border-b transition-all duration-300 ${
          isDarkMode
            ? 'border-white/10 bg-[#1F1F1F]/95 text-white'
            : 'border-black/10 bg-[#FFFFFF]/95 text-[#1A1A1A]'
        } ${
          showControls
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        {/* Right side: Close & Ayah-style Navigation Icons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-current hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="إغلاق قارئ المصحف"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Surah/Juz Index List Icon (Emerald Green from Image 2) */}
          <div className="flex items-center gap-1.5 border border-[#10B981]/30 bg-[#10B981]/10 rounded-full px-2.5 py-1 text-xs font-bold font-quran text-[#10B981]">
            <List className="h-4 w-4" />
            <span>{meta.nameAr}</span>
          </div>

          {/* Search Icon (Emerald Green from Image 2) */}
          <button
            type="button"
            onClick={() => {
              const surahTarget = prompt('ادخل رقم السورة أو الآية:');
              if (surahTarget) {
                const sNum = parseInt(surahTarget, 10);
                if (!isNaN(sNum) && sNum >= 1 && sNum <= 114) {
                  selectAyah(sNum, 1);
                }
              }
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#10B981] hover:bg-[#10B981]/15 transition-colors"
            aria-label="بحث في الآيات"
            title="بحث"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {/* Center: Square Calendar/Juz Badge (Exact square '18' badge from Image 2) */}
        <div className="flex items-center justify-center">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md border border-[#10B981] bg-[#10B981]/10 text-xs font-bold text-[#10B981] tabular-nums shadow-xs"
            title={`الجزء ${toArabicDigits(juzNumber)}`}
          >
            <span>{toArabicDigits(juzNumber)}</span>
          </div>
        </div>

        {/* Left side: Settings & Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Font Size controls */}
          <div className="flex items-center rounded-lg bg-black/5 dark:bg-white/10 px-1 py-0.5">
            <button
              type="button"
              onClick={() => setFontSize((f) => Math.max(18, f - 2))}
              className="p-1.5 text-current hover:text-[#10B981]"
              title="تصغير الخط"
              aria-label="تصغير الخط"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold tabular-nums px-1 text-[#10B981]">
              {fontSize}
            </span>
            <button
              type="button"
              onClick={() => setFontSize((f) => Math.min(36, f + 2))}
              className="p-1.5 text-current hover:text-[#10B981]"
              title="تكبير الخط"
              aria-label="تكبير الخط"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {/* Day/Night Theme Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#10B981] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
            title={isDarkMode ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Unreserve button */}
          {isReservedByMe && !isCompleted && (
            <button
              type="button"
              data-testid="unreserve-juz-btn"
              onClick={handleUnreserveClick}
              disabled={isSubmittingUnreserve}
              className="flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/25"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">إلغاء الحجز</span>
            </button>
          )}

          {/* Complete Juz button */}
          {!isCompleted && (
            <button
              type="button"
              data-testid="complete-juz-btn"
              onClick={handleCompleteClick}
              disabled={isSubmittingComplete}
              className="flex items-center gap-1.5 rounded-full bg-[#10B981] hover:bg-[#059669] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>{isSubmittingComplete ? 'جاري الحفظ...' : 'أتممت القراءة'}</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Full-Screen Quran Page Layout (Matching user's Image 2 & 3 pixel-for-pixel) */}
      <main
        className="flex-1 w-full flex flex-col justify-between overflow-y-auto cursor-pointer px-4 sm:px-8 pt-4 pb-24 max-w-xl mx-auto"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => setShowControls((prev) => !prev)}
      >
        {isLoading && !activePage ? (
          <div className="flex flex-col items-center justify-center my-auto py-24 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#10B981] border-t-transparent" />
            <p className="mt-4 text-sm font-medium text-[#10B981]">
              جاري فتح صفحات المصحف الشريف...
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between w-full">
            {/* Top Minimal Line in Full-Screen: "الجزء 30" on Right, "الغاشية" on Left */}
            <div className="flex items-center justify-between text-xs font-sans font-medium text-[#8E8E93] pb-2 select-none">
              <span>{meta.nameAr}</span>
              <span>{activePage?.firstSurahNameAr ? activePage.firstSurahNameAr.replace('سورة ', '') : ''}</span>
            </div>

            {/* Quran Text Content */}
            <div className="my-auto py-2 space-y-4">
              {activePage?.sections.map((section) => (
                <div key={`${activePage.pageNumber}-${section.surahNumber}`} className="space-y-3">
                  {/* Surah Header Cartouche Banner (Exact engraving like Image 1, 2 & 3) */}
                  {section.showHeader && (
                    <SurahCartoucheBanner
                      surahNameAr={section.surahNameAr}
                      isDarkMode={isDarkMode}
                    />
                  )}

                  {/* Basmala Calligraphy */}
                  {section.showBasmala && (
                    <div className="py-2.5 text-center select-none">
                      <p className="text-2xl sm:text-3xl font-quran font-bold tracking-wide">
                        بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                      </p>
                    </div>
                  )}

                  {/* Uthmani Verses with Classical End Medallions */}
                  <div
                    className="font-quran text-justify leading-[2.65] select-text"
                    style={{
                      fontSize: `${fontSize}px`,
                      textAlign: 'justify',
                      textAlignLast: 'center',
                    }}
                  >
                    {section.ayahs.map((ayah) => {
                      const isCurrent =
                        activeSurahNumber === ayah.surahNumber &&
                        activeAyahNumber === ayah.ayahNumber;

                      return (
                        <span
                          key={`${ayah.surahNumber}-${ayah.ayahNumber}`}
                          id={`ayah-${ayah.surahNumber}-${ayah.ayahNumber}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAyah(ayah.surahNumber, ayah.ayahNumber);
                          }}
                          className={`inline rounded-sm px-1 py-0.5 cursor-pointer transition-colors ${
                            isCurrent
                              ? 'bg-[#10B981]/25 text-[#10B981] font-bold ring-1 ring-[#10B981]'
                              : isDarkMode
                              ? 'hover:bg-white/5'
                              : 'hover:bg-black/5'
                          }`}
                        >
                          <span>{ayah.textUthmani}</span>
                          <AyahStarMedallion
                            number={ayah.ayahNumber}
                            isCurrent={isCurrent}
                            isDarkMode={isDarkMode}
                          />{' '}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Minimal Page Capsule Medallion: Exact "592" Pill from Image 2 & 3 */}
            <div className="pt-3 pb-1 flex items-center justify-center select-none">
              <div
                className={`inline-flex items-center justify-center rounded-full border px-4 py-0.5 text-xs font-bold font-sans tabular-nums shadow-xs ${
                  isDarkMode
                    ? 'border-[#38383A] bg-[#242426] text-[#D1D1D6]'
                    : 'border-[#D1D1D6] bg-[#ECE9E0] text-[#3A3A3C]'
                }`}
              >
                <span>{toArabicDigits(activePage?.pageNumber || 1)}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. Floating Bottom Controls: Audio Bar + Page Slider (Matching user's Image 1 & 2) */}
      <footer
        className={`fixed bottom-0 inset-x-0 z-40 px-3 sm:px-6 pb-4 pt-2 flex flex-col items-center gap-2.5 transition-all duration-300 pointer-events-none ${
          showControls
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
        dir="rtl"
      >
        {/* Floating Audio Reciter Bar */}
        <div className="w-full max-w-md pointer-events-auto">
          <AudioReciterBar
            currentSurahNumber={activeSurahNumber}
            currentSurahNameAr={currentSurahNameAr}
            currentAyahNumber={activeAyahNumber}
            onNextAyah={handleNextAyah}
            onPrevAyah={handlePrevAyah}
            isDarkMode={isDarkMode}
            className="!p-0 !bg-transparent !border-0 shadow-none"
          />
        </div>

        {/* Bottom Page Navigation Slider Bar (Matching user's Image 1 & 2) */}
        <div className="w-full max-w-md pointer-events-auto">
          <div
            className={`flex items-center justify-between gap-3 rounded-full border px-4 py-2 shadow-xl backdrop-blur-md ${
              isDarkMode
                ? 'border-[#38383A] bg-[#1C1C1E]/95 text-white'
                : 'border-[#D1D1D6] bg-[#FFFFFF]/95 text-[#1C1C1E]'
            }`}
          >
            {/* Left: Notes / Speech bubble icon (Image 2) */}
            <div className="flex items-center gap-1.5 shrink-0 text-[#10B981]">
              <MessageSquareText className="h-4 w-4" />
            </div>

            {/* Center: Range Slider with Green Page Badge (Image 2) */}
            <div className="flex-1 flex items-center gap-2.5">
              <input
                type="range"
                min={0}
                max={Math.max(0, totalPagesInJuz - 1)}
                value={currentPageIdx}
                onChange={(e) => goToPage(Number(e.target.value))}
                aria-label="سلايدر التنقل بين صفحات المصحف"
                className="w-full h-1.5 bg-[#38383A] dark:bg-[#38383A] rounded-lg appearance-none cursor-pointer accent-[#10B981]"
              />

              {/* Current Page Pill Badge (Matching green "592" badge in Image 1 & 2) */}
              <div className="rounded-full bg-[#10B981] px-2.5 py-0.5 text-xs font-bold text-white tabular-nums shrink-0 shadow-xs">
                {toArabicDigits(activePage?.pageNumber || 1)}
              </div>
            </div>

            {/* Right: Last Page Jump with Return Arrow and "604" (Matching Image 1 & 2) */}
            <button
              type="button"
              onClick={() => goToPage(totalPagesInJuz - 1)}
              className="flex items-center gap-1 text-xs font-bold text-[#10B981] hover:opacity-80 shrink-0 tabular-nums"
              title="الانتقال لآخر صفحة"
            >
              <CornerUpLeft className="h-3.5 w-3.5" />
              <span>{toArabicDigits(604)}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
