'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { JuzContent, JuzAyah, loadJuzFromDiskOrFetch } from '../lib/quran-loader';
import { JUZ_METADATA } from '../lib/quran-meta';
import { useKhatmaTheme } from '../lib/theme';
import AudioReciterBar from './AudioReciterBar';
import { AyahStarMedallion, toArabicDigits } from './IslamicOrnaments';
import {
  X,
  CheckCircle,
  Undo2,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Sliders,
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

    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
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
  const isLastPage = currentPageIdx === totalPagesInJuz - 1;

  const firstPageNumber = mushafPages[0]?.pageNumber || 1;
  const lastPageNumber = mushafPages[mushafPages.length - 1]?.pageNumber || 604;

  return (
    <div
      data-testid="quran-reader-modal"
      className={`fixed inset-0 z-50 flex flex-col overflow-hidden select-none transition-colors duration-200 ${
        isDarkMode ? 'bg-[#06100C] text-[#F4EFE6]' : 'bg-[#F5F1E8] text-[#111F19]'
      }`}
      dir="rtl"
    >
      {/* 1. Floating Top Controls Header (Toggles on tap) */}
      <header
        className={`fixed top-0 inset-x-0 z-40 flex items-center justify-between border-b px-3 sm:px-6 py-2.5 shadow-md backdrop-blur-md transition-all duration-300 ${
          isDarkMode
            ? 'border-[#C5A059]/30 bg-[#081A14]/95 text-white'
            : 'border-[#C5A059]/40 bg-[#F8F5EC]/95 text-[#091B15]'
        } ${
          showControls
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className={`flex h-9 w-9 items-center justify-center border transition-colors ${
              isDarkMode
                ? 'border-[#C5A059]/40 bg-[#112A21] text-[#E8D39E] hover:bg-[#18382C]'
                : 'border-[#C5A059] bg-[#EFE8D6] text-[#091B15] hover:bg-[#E4DAC2]'
            }`}
            aria-label="إغلاق قارئ المصحف"
          >
            <X className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#C8A45D] font-quran flex items-center gap-2">
              <span>{meta.nameAr}</span>
              {activePage && (
                <span className="border border-[#C5A059]/40 px-2 py-0.5 text-[11px] font-sans font-semibold">
                  صـ {toArabicDigits(activePage.pageNumber)}
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* Reader Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Font Size */}
          <div className="flex items-center border border-[#C5A059]/40 p-0.5">
            <button
              type="button"
              onClick={() => setFontSize((f) => Math.max(18, f - 2))}
              className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10"
              title="تصغير الخط"
              aria-label="تصغير الخط"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-[11px] tabular-nums px-1.5 text-[#C5A059] font-bold">
              {fontSize}
            </span>
            <button
              type="button"
              onClick={() => setFontSize((f) => Math.min(36, f + 2))}
              className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10"
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
            className={`flex h-9 px-2.5 gap-1.5 items-center justify-center border transition-colors ${
              isDarkMode
                ? 'border-[#C5A059] bg-[#C5A059]/25 text-[#FDE68A]'
                : 'border-[#C5A059]/60 bg-[#EFE8D6] text-[#091B15] hover:bg-[#E4DAC2]'
            }`}
            aria-label={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
            title={isDarkMode ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
          >
            {isDarkMode ? (
              <>
                <Sun className="h-4 w-4 text-[#FDE68A]" />
                <span className="hidden md:inline text-xs font-semibold">نهاري</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-[#C5A059]" />
                <span className="hidden md:inline text-xs font-semibold">ليلي</span>
              </>
            )}
          </button>

          {/* Unreserve button */}
          {isReservedByMe && !isCompleted && (
            <button
              type="button"
              data-testid="unreserve-juz-btn"
              onClick={handleUnreserveClick}
              disabled={isSubmittingUnreserve}
              className="flex items-center gap-1 border border-rose-400/50 bg-rose-500/20 px-2.5 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/30"
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
              className="flex items-center gap-1.5 border border-[#C5A059] bg-[#C5A059] hover:bg-[#D4B06A] px-3 py-1.5 text-xs font-bold text-[#081A14] shadow-xs"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>{isSubmittingComplete ? 'جاري الحفظ...' : 'أتممت القراءة'}</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Full-Screen Quran Page Canvas (Fills entire screen like Mobile Quran App) */}
      <div
        className="flex-1 overflow-y-auto w-full flex flex-col justify-between cursor-pointer px-4 sm:px-8 py-3 pt-4 sm:pt-6 pb-28"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => setShowControls((prev) => !prev)}
      >
        {isLoading && !activePage ? (
          <div className="flex flex-col items-center justify-center my-auto py-24 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#C5A059] border-t-transparent" />
            <p className="mt-4 text-sm font-medium text-[#C5A059]">
              جاري فتح صفحات المصحف الشريف...
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-between">
            {/* Minimal Top Header (Matching user's Image 2: "الغاشية" on left, "الجزء 30" on right) */}
            <div className="flex items-center justify-between text-xs sm:text-sm font-quran font-bold text-[#A68037] dark:text-[#C5A059] pb-3 select-none">
              <span>سورة {activePage?.firstSurahNameAr}</span>
              <span className="opacity-75">{meta.nameAr}</span>
            </div>

            {/* Verses & Surah Header Banners Body */}
            <div className="my-auto py-2 space-y-5">
              {activePage?.sections.map((section) => (
                <div key={`${activePage.pageNumber}-${section.surahNumber}`} className="space-y-4">
                  {/* Classical Islamic Arabesque Surah Header Banner (Matching user's screenshot) */}
                  {section.showHeader && (
                    <div
                      className={`relative overflow-hidden border-2 py-2 px-4 text-center my-3 select-none ${
                        isDarkMode
                          ? 'border-[#C5A059]/60 bg-[#0A1D16]'
                          : 'border-[#2A3B34] bg-[#EFE8D6]'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-4">
                        <span className="text-base text-[#C5A059]">۞</span>
                        <h3 className="text-xl sm:text-2xl font-bold font-quran tracking-wide">
                          {section.surahNameAr}
                        </h3>
                        <span className="text-base text-[#C5A059]">۞</span>
                      </div>
                    </div>
                  )}

                  {/* Basmala Calligraphy */}
                  {section.showBasmala && (
                    <div className="py-2 text-center select-none">
                      <p className="text-2xl sm:text-3xl font-quran font-bold text-[#A68037] dark:text-[#C5A059]">
                        بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                      </p>
                    </div>
                  )}

                  {/* Continuous Justified Mushaf Text */}
                  <div
                    className="font-quran text-justify leading-[2.5] tracking-wide select-text"
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
                          className={`inline rounded-md px-1 py-0.5 cursor-pointer transition-colors ${
                            isCurrent
                              ? isDarkMode
                                ? 'bg-[#C5A059]/30 text-white ring-1 ring-[#C5A059]'
                                : 'bg-[#EBD292] text-[#091B15] ring-1 ring-[#9A6F1E]'
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

            {/* Bottom Minimal Page Capsule Medallion (Matching user's Image 2: "592") */}
            <div className="pt-4 flex items-center justify-center select-none">
              <div
                className={`inline-flex items-center justify-center rounded-full border px-4 py-1 text-xs font-bold font-sans tabular-nums shadow-xs ${
                  isDarkMode
                    ? 'border-[#C5A059]/40 bg-[#0A1F17] text-[#E8D39E]'
                    : 'border-[#C5A059] bg-[#EFE8D6] text-[#091B15]'
                }`}
              >
                <span>{toArabicDigits(activePage?.pageNumber || 1)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Floating Bottom Controls: Audio Player Bar + Page Navigation Slider (Matching Image 1) */}
      <footer
        className={`fixed bottom-0 inset-x-0 z-40 px-3 sm:px-6 pb-3 pt-2 flex flex-col items-center gap-2 transition-all duration-300 pointer-events-none ${
          showControls
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-6'
        }`}
        dir="rtl"
      >
        {/* Docked Floating Audio Reciter Bar */}
        <div className="w-full max-w-xl pointer-events-auto">
          <AudioReciterBar
            currentSurahNumber={activeSurahNumber}
            currentSurahNameAr={currentSurahNameAr}
            currentAyahNumber={activeAyahNumber}
            onNextAyah={handleNextAyah}
            onPrevAyah={handlePrevAyah}
            isDarkMode={isDarkMode}
            className="!pb-0 !pt-0 !px-0"
          />
        </div>

        {/* Page Navigation Slider Bar (Matching user's Image 1) */}
        <div className="w-full max-w-xl pointer-events-auto">
          <div
            className={`flex items-center justify-between gap-3 rounded-2xl border px-3 sm:px-4 py-2 shadow-2xl backdrop-blur-md ${
              isDarkMode
                ? 'border-[#C5A059]/40 bg-[#081A14]/98 text-white'
                : 'border-[#C5A059] bg-[#F8F5EC]/98 text-[#091B15]'
            }`}
          >
            {/* Right: Last Page Marker / Jump */}
            <button
              type="button"
              onClick={() => goToPage(totalPagesInJuz - 1)}
              className="flex items-center gap-1 text-xs font-bold text-[#C5A059] hover:underline shrink-0"
              title="الانتقال لآخر صفحة في الجزء"
            >
              <span>{toArabicDigits(lastPageNumber)}</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {/* Center: Interactive Page Slider */}
            <div className="flex-1 flex flex-col items-center gap-1 px-1">
              <div className="w-full flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, totalPagesInJuz - 1)}
                  value={currentPageIdx}
                  onChange={(e) => goToPage(Number(e.target.value))}
                  aria-label="سلايدر التنقل بين صفحات المصحف"
                  className="w-full h-2 bg-[#2D3F37] dark:bg-[#1A3127] rounded-lg appearance-none cursor-pointer accent-[#C5A059]"
                />
              </div>
              <div className="flex items-center justify-between w-full text-[10px] sm:text-[11px] font-sans font-semibold text-[#A68037] dark:text-[#E8D39E]">
                <span>صفحة {toArabicDigits(currentPageIdx + 1)} من {toArabicDigits(totalPagesInJuz)}</span>
                <span className="font-bold text-white bg-[#C5A059] px-2 py-0.5 rounded-full text-[10px] text-[#081A14]">
                  صـ {toArabicDigits(activePage?.pageNumber || 1)}
                </span>
                <span>بالمصحف</span>
              </div>
            </div>

            {/* Left: First Page Marker / Jump */}
            <button
              type="button"
              onClick={() => goToPage(0)}
              className="flex items-center gap-1 text-xs font-bold text-[#C5A059] hover:underline shrink-0"
              title="الانتقال لأول صفحة في الجزء"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              <span>{toArabicDigits(firstPageNumber)}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
