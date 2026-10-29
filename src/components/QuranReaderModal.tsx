'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { JuzContent, JuzAyah, loadJuzFromDiskOrFetch } from '../lib/quran-loader';
import { JUZ_METADATA } from '../lib/quran-meta';
import { useKhatmaTheme } from '../lib/theme';
import AudioReciterBar from './AudioReciterBar';
import { AyahStarMedallion, SurahCartoucheBanner, toArabicDigits } from './IslamicOrnaments';
import {
  Menu,
  X,
  CheckCircle,
  Undo2,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  Search,
  CornerUpLeft,
  SlidersHorizontal,
  BookOpen,
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
  // By default, show controls so users discover options, clicking toggles full-screen reading mode
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [activeSurahNumber, setActiveSurahNumber] = useState<number>(
    initialFallbackContent.sections[0].surahNumber
  );
  const [activeAyahNumber, setActiveAyahNumber] = useState<number>(
    initialFallbackContent.sections[0].ayahs[0].ayahNumber
  );
  const [currentPageIdx, setCurrentPageIdx] = useState<number>(0);
  const [isSubmittingComplete, setIsSubmittingComplete] = useState<boolean>(false);
  const [isSubmittingUnreserve, setIsSubmittingUnreserve] = useState<boolean>(false);

  // Long press timer refs
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef<boolean>(false);

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

          if (!restoredBookmark && data.sections.length > 0) {
            const firstSec = data.sections[0];
            setActiveSurahNumber(firstSec.surahNumber);
            if (firstSec.ayahs.length > 0) {
              setActiveAyahNumber(firstSec.ayahs[0].ayahNumber);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load Juz content, keeping fallback', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchJuz();
    return () => {
      isMounted = false;
    };
  }, [juzNumber, khatmaId]);

  useEffect(() => {
    if (!mushafPages.length) return;
    const pageIdx = mushafPages.findIndex((page) =>
      page.sections.some(
        (sec) =>
          sec.surahNumber === activeSurahNumber &&
          sec.ayahs.some((a) => a.ayahNumber === activeAyahNumber)
      )
    );
    if (pageIdx !== -1 && pageIdx !== currentPageIdx) {
      setCurrentPageIdx(pageIdx);
    }
  }, [activeSurahNumber, activeAyahNumber, mushafPages]);

  const selectAyah = (surahNumber: number, ayahNumber: number) => {
    setActiveSurahNumber(surahNumber);
    setActiveAyahNumber(ayahNumber);
    try {
      localStorage.setItem(
        `khatma_bookmark_${khatmaId}_juz_${juzNumber}`,
        JSON.stringify({ surahNumber, ayahNumber, savedAt: new Date().toISOString() })
      );
    } catch {}
  };

  const handleNextAyah = () => {
    if (!juzData) return;
    const allAyahs: { surahNumber: number; ayahNumber: number }[] = [];
    for (const sec of juzData.sections) {
      for (const a of sec.ayahs) {
        allAyahs.push({ surahNumber: sec.surahNumber, ayahNumber: a.ayahNumber });
      }
    }
    const curIdx = allAyahs.findIndex(
      (a) => a.surahNumber === activeSurahNumber && a.ayahNumber === activeAyahNumber
    );
    if (curIdx !== -1 && curIdx < allAyahs.length - 1) {
      const next = allAyahs[curIdx + 1];
      selectAyah(next.surahNumber, next.ayahNumber);
    }
  };

  const handlePrevAyah = () => {
    if (!juzData) return;
    const allAyahs: { surahNumber: number; ayahNumber: number }[] = [];
    for (const sec of juzData.sections) {
      for (const a of sec.ayahs) {
        allAyahs.push({ surahNumber: sec.surahNumber, ayahNumber: a.ayahNumber });
      }
    }
    const curIdx = allAyahs.findIndex(
      (a) => a.surahNumber === activeSurahNumber && a.ayahNumber === activeAyahNumber
    );
    if (curIdx > 0) {
      const prev = allAyahs[curIdx - 1];
      selectAyah(prev.surahNumber, prev.ayahNumber);
    }
  };

  const goToPage = (pageIdx: number) => {
    if (pageIdx < 0 || pageIdx >= mushafPages.length) return;
    setCurrentPageIdx(pageIdx);
    const targetPage = mushafPages[pageIdx];
    if (targetPage && targetPage.sections.length > 0) {
      const firstSec = targetPage.sections[0];
      if (firstSec.ayahs.length > 0) {
        selectAyah(firstSec.surahNumber, firstSec.ayahs[0].ayahNumber);
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        goToPage(currentPageIdx + 1);
      } else {
        goToPage(currentPageIdx - 1);
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Long press on Ayah handlers
  const handleAyahPointerDown = (surahNumber: number, ayahNumber: number) => {
    isLongPressActive.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      selectAyah(surahNumber, ayahNumber);
      setShowControls(true);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(50);
        } catch {}
      }
    }, 1200); // 1.2s long press
  };

  const handleAyahPointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
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
  const isLastPage = currentPageIdx >= Math.max(0, totalPagesInJuz - 1);

  // Filtered surahs for Burger Menu search
  const availableSurahs = useMemo(() => {
    if (!juzData) return [];
    return juzData.sections.map((s) => ({
      surahNumber: s.surahNumber,
      surahNameAr: s.surahNameAr,
    }));
  }, [juzData]);

  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) return availableSurahs;
    return availableSurahs.filter(
      (s) =>
        s.surahNameAr.includes(searchQuery.trim()) ||
        String(s.surahNumber) === searchQuery.trim()
    );
  }, [availableSurahs, searchQuery]);

  return (
    <div
      data-testid="quran-reader-modal"
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden select-none transition-colors duration-200 ${
        isDarkMode ? 'bg-[#07120E] text-[#F4EFE6]' : 'bg-[#FBF8F3] text-[#0F2922]'
      }`}
      dir="rtl"
    >
      {/* 1. Ultra-Clean Obsidian & Gold Top Bar */}
      <header
        className={`fixed top-0 inset-x-0 z-40 flex items-center justify-between px-3 sm:px-6 py-2.5 backdrop-blur-md border-b transition-all duration-300 ${
          isDarkMode
            ? 'border-[#C5A059]/25 bg-[#091B15]/95 text-[#F4EFE6]'
            : 'border-[#C5A059]/40 bg-[#F8F5EC]/95 text-[#091B15]'
        } ${
          showControls
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        {/* Right side: Close Button & Juz Name */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#C5A059] hover:bg-[#C5A059]/15 transition-colors"
            aria-label="إغلاق قارئ المصحف"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-base sm:text-lg font-bold font-quran text-[#C8A45D]">
              {meta.nameAr}
            </span>
          </div>
        </div>

        {/* Center: Minimal Gold Page Capsule */}
        <div className="hidden sm:flex items-center justify-center">
          <div className="rounded-full border border-[#C5A059]/50 bg-[#0D241C] px-3.5 py-0.5 text-xs font-bold text-[#E8D39E] tabular-nums shadow-xs">
            <span>صفحة {toArabicDigits(activePage?.pageNumber || 1)}</span>
          </div>
        </div>

        {/* Left side: Dynamic Action Button + Burger Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dynamic Complete Button (Only on Last Page) */}
          {isLastPage && !isCompleted && (
            <button
              type="button"
              data-testid="complete-juz-btn"
              onClick={handleCompleteClick}
              disabled={isSubmittingComplete}
              className="flex items-center gap-1.5 rounded-full bg-[#C5A059] hover:bg-[#D4B06A] px-3.5 py-1.5 text-xs font-bold text-[#081A14] shadow-md transition-all active:scale-95"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>{isSubmittingComplete ? 'جاري الحفظ...' : 'أتممت القراءة'}</span>
            </button>
          )}

          {/* Dynamic Unreserve Button (Visible on all pages until last page, or if single-page) */}
          {(!isLastPage || totalPagesInJuz <= 1) && isReservedByMe && !isCompleted && (
            <button
              type="button"
              data-testid="unreserve-juz-btn"
              onClick={handleUnreserveClick}
              disabled={isSubmittingUnreserve}
              className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/25 transition-colors"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span>الاعتذار عن الجزء</span>
            </button>
          )}

          {/* Burger Menu Button (Opens Sidebar Drawer with Font Size, Theme, and Search) */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#C5A059] hover:bg-[#C5A059]/15 transition-colors"
            aria-label="فتح قائمة إعدادات المصحف"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 2. Burger Menu Sidebar Drawer */}
      <div
        className={`fixed inset-0 z-50 flex transition-all duration-300 ${
          isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        dir="rtl"
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={() => setIsDrawerOpen(false)}
        />

        {/* Slide-out Panel */}
        <div
          className={`relative z-10 w-full max-w-xs sm:max-w-sm flex flex-col justify-between p-5 shadow-2xl transition-transform duration-300 ${
            isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          } ${
            isDarkMode
              ? 'bg-[#091B15] text-[#F4EFE6] border-l border-[#C5A059]/40'
              : 'bg-[#F8F5EC] text-[#091B15] border-l border-[#C5A059]/50'
          }`}
        >
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#C5A059]/25">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[#C5A059]" />
                  <h3 className="font-quran text-lg font-bold text-[#C8A45D]">
                    إعدادات المصحف والقراءة
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded-full text-[#C5A059] hover:bg-[#C5A059]/15 transition-colors"
                  aria-label="رجوع من القائمة"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Setting 1: Font Size Controls */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#E8D39E]">
                  <span>حجم خط التلاوة</span>
                  <span className="font-bold tabular-nums text-[#C5A059]">{fontSize}px</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-[#C5A059]/30 bg-[#0D241C] p-2">
                  <button
                    type="button"
                    onClick={() => setFontSize((f) => Math.max(18, f - 2))}
                    className="p-2 rounded-lg text-[#C5A059] hover:bg-[#C5A059]/15 transition-colors"
                    title="تصغير الخط"
                    aria-label="تصغير الخط"
                  >
                    <ZoomOut className="h-5 w-5" />
                  </button>
                  <input
                    type="range"
                    min={18}
                    max={38}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="flex-1 mx-3 h-1.5 bg-[#14372e] rounded-lg appearance-none cursor-pointer accent-[#C5A059]"
                  />
                  <button
                    type="button"
                    onClick={() => setFontSize((f) => Math.min(38, f + 2))}
                    className="p-2 rounded-lg text-[#C5A059] hover:bg-[#C5A059]/15 transition-colors"
                    title="تكبير الخط"
                    aria-label="تكبير الخط"
                  >
                    <ZoomIn className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Setting 2: Day / Night Theme Toggle */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#E8D39E]">مظهر القراءة</span>
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="flex w-full items-center justify-between rounded-xl border border-[#C5A059]/30 bg-[#0D241C] px-4 py-2.5 text-xs font-bold text-[#E8D39E] hover:border-[#C5A059] transition-colors"
                  aria-label={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
                >
                  <div className="flex items-center gap-2">
                    {isDarkMode ? (
                      <Sun className="h-4 w-4 text-[#FDE68A]" />
                    ) : (
                      <Moon className="h-4 w-4 text-[#C5A059]" />
                    )}
                    <span>{isDarkMode ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}</span>
                  </div>
                  <span className="text-[11px] text-[#A6B8B0]">
                    {isDarkMode ? 'ليلي مذهّب' : 'نهاري ورقي'}
                  </span>
                </button>
              </div>

              {/* Setting 3: Surah & Ayah Quick Search */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-[#E8D39E]">البحث في سور الجزء</span>
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 h-4 w-4 text-[#C5A059]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث باسم السورة..."
                    className="w-full rounded-xl border border-[#C5A059]/30 bg-[#0D241C] pr-9 pl-3 py-2 text-xs text-[#F4EFE6] placeholder-[#A6B8B0] focus:border-[#C5A059] focus:outline-none"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 pt-1">
                  {filteredSurahs.map((s) => (
                    <button
                      key={s.surahNumber}
                      type="button"
                      onClick={() => {
                        selectAyah(s.surahNumber, 1);
                        setIsDrawerOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-[#E8D39E] hover:bg-[#14372e] transition-colors"
                    >
                      <span className="font-quran font-semibold">{s.surahNameAr}</span>
                      <span className="text-[10px] text-[#A6B8B0]">
                        سورة {toArabicDigits(s.surahNumber)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="pt-4 border-t border-[#C5A059]/25 space-y-2">
              {isReservedByMe && !isCompleted && (
                <button
                  type="button"
                  onClick={handleUnreserveClick}
                  disabled={isSubmittingUnreserve}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 py-2.5 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition-colors"
                >
                  <Undo2 className="h-4 w-4" />
                  <span>الاعتذار عن حجز الجزء</span>
                </button>
              )}
            </div>
          </div>
        </div>

      {/* 3. Full-Screen Quran Page Layout */}
      <main
        className="flex-1 w-full flex flex-col justify-between overflow-y-auto cursor-pointer px-4 sm:px-8 pt-4 pb-24 max-w-xl mx-auto"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          // Quick tap on open page toggles or dismisses controls into full screen
          setShowControls((prev) => !prev);
        }}
      >
        {isLoading && !activePage ? (
          <div className="flex flex-col items-center justify-center my-auto py-24 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#C5A059] border-t-transparent" />
            <p className="mt-4 text-sm font-medium text-[#C8A45D]">
              جاري فتح صفحات المصحف الشريف...
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between w-full">
            {/* Top Minimal Line in Full-Screen: "الجزء 30" on Right, "الغاشية" on Left */}
            <div className="flex items-center justify-between text-xs font-sans font-medium text-[#C5A059]/80 pb-2 select-none">
              <span>{meta.nameAr}</span>
              <span>{activePage?.firstSurahNameAr ? activePage.firstSurahNameAr.replace('سورة ', '') : ''}</span>
            </div>

            {/* Quran Text Content */}
            <div className="my-auto py-2 space-y-4">
              {activePage?.sections.map((section) => (
                <div key={`${activePage.pageNumber}-${section.surahNumber}`} className="space-y-3">
                  {/* Surah Header Cartouche Banner */}
                  {section.showHeader && (
                    <SurahCartoucheBanner
                      surahNameAr={section.surahNameAr}
                      isDarkMode={isDarkMode}
                    />
                  )}

                  {/* Basmala Calligraphy */}
                  {section.showBasmala && (
                    <div className="py-2.5 text-center select-none">
                      <p className="text-2xl sm:text-3xl font-quran font-bold tracking-wide text-[#C8A45D] dark:text-[#E8D39E]">
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
                          onPointerDown={() => handleAyahPointerDown(ayah.surahNumber, ayah.ayahNumber)}
                          onPointerUp={handleAyahPointerUp}
                          onPointerLeave={handleAyahPointerUp}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isLongPressActive.current) {
                              // Short click toggles full-screen reading mode
                              setShowControls((prev) => !prev);
                            }
                          }}
                          className={`inline rounded-sm px-1 py-0.5 cursor-pointer transition-colors ${
                            isCurrent
                              ? 'bg-[#C5A059]/25 text-[#E8D39E] font-bold ring-1 ring-[#C5A059]'
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

            {/* Bottom Minimal Page Capsule Medallion */}
            <div className="pt-3 pb-1 flex items-center justify-center select-none">
              <div
                className={`inline-flex items-center justify-center rounded-full border px-4 py-0.5 text-xs font-bold font-sans tabular-nums shadow-xs ${
                  isDarkMode
                    ? 'border-[#C5A059]/50 bg-[#091B15] text-[#E8D39E]'
                    : 'border-[#C5A059] bg-[#EFE8D6] text-[#5A4214]'
                }`}
              >
                <span>{toArabicDigits(activePage?.pageNumber || 1)}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. Floating Bottom Controls: Obsidian & Gold Audio Bar + Page Slider */}
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
            currentSurahNameAr={activePage?.firstSurahNameAr}
            currentAyahNumber={activeAyahNumber}
            onNextAyah={handleNextAyah}
            onPrevAyah={handlePrevAyah}
            isDarkMode={isDarkMode}
            className="!p-0 !bg-transparent !border-0 shadow-none"
          />
        </div>

        {/* Bottom Page Navigation Slider Bar in Deep Obsidian & Gold */}
        <div className="w-full max-w-md pointer-events-auto">
          <div
            className={`flex items-center justify-between gap-3 rounded-full border px-4 py-2 shadow-xl backdrop-blur-md ${
              isDarkMode
                ? 'border-[#C5A059]/40 bg-[#091B15]/98 text-[#F4EFE6]'
                : 'border-[#C5A059]/50 bg-[#FFFFFF]/98 text-[#091B15]'
            }`}
          >
            {/* Left: Options indicator in Gold */}
            <div className="flex items-center gap-1.5 shrink-0 text-[#C5A059]">
              <SlidersHorizontal className="h-4 w-4" />
            </div>

            {/* Center: Range Slider with Gold Page Badge */}
            <div className="flex-1 flex items-center gap-2.5">
              <input
                type="range"
                min={0}
                max={Math.max(0, totalPagesInJuz - 1)}
                value={currentPageIdx}
                onChange={(e) => goToPage(Number(e.target.value))}
                aria-label="سلايدر التنقل بين صفحات المصحف"
                className="w-full h-1.5 bg-[#14372e] rounded-lg appearance-none cursor-pointer accent-[#C5A059]"
              />

              {/* Current Page Pill Badge in Islamic Gold */}
              <div className="rounded-full bg-[#C5A059] px-2.5 py-0.5 text-xs font-bold text-[#091B15] tabular-nums shrink-0 shadow-xs">
                {toArabicDigits(activePage?.pageNumber || 1)}
              </div>
            </div>

            {/* Right: Last Page Jump with Return Arrow and "604" in Gold */}
            <button
              type="button"
              onClick={() => goToPage(totalPagesInJuz - 1)}
              className="flex items-center gap-1 text-xs font-bold text-[#C5A059] hover:text-[#E8D39E] shrink-0 tabular-nums transition-colors"
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
