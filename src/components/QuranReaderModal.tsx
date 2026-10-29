'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { JuzContent, JuzSurahSection, JuzAyah, loadJuzFromDiskOrFetch } from '../lib/quran-loader';
import { JUZ_METADATA } from '../lib/quran-meta';
import { useKhatmaTheme } from '../lib/theme';
import AudioReciterBar from './AudioReciterBar';
import {
  X,
  BookOpen,
  CheckCircle,
  Undo2,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Sparkles,
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

function toArabicDigits(num: number): string {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num)
    .split('')
    .map((c) => (arabicNumbers[parseInt(c, 10)] !== undefined ? arabicNumbers[parseInt(c, 10)] : c))
    .join('');
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
              textUthmani:
                meta.number === 1
                  ? 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ'
                  : `بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ`,
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
  const [activeSurahNumber, setActiveSurahNumber] = useState<number>(
    initialFallbackContent.sections[0].surahNumber
  );
  const [activeAyahNumber, setActiveAyahNumber] = useState<number>(
    initialFallbackContent.sections[0].ayahs[0].ayahNumber
  );
  const [currentPageIdx, setCurrentPageIdx] = useState<number>(0);
  const [isSubmittingComplete, setIsSubmittingComplete] = useState<boolean>(false);
  const [isSubmittingUnreserve, setIsSubmittingUnreserve] = useState<boolean>(false);

  // Touch swipe state for turning Mushaf pages on mobile
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Build real Madinah Mushaf pages from Juz sections
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

  // Load Juz content from static JSON
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

  // Keep currentPageIdx synced when activeSurahNumber / activeAyahNumber changes (e.g., via audio auto-advance or bookmark)
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

  // Flatten all ayahs in the Juz for sequential audio navigation
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

    // Horizontal swipe to flip Mushaf pages (in RTL, swiping right->left or left->right)
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX > 0) {
        // Swiped right -> next page in RTL Mushaf
        if (currentPageIdx + 1 < mushafPages.length) {
          goToPage(currentPageIdx + 1);
        }
      } else {
        // Swiped left -> previous page in RTL Mushaf
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

  return (
    <div
      data-testid="quran-reader-modal"
      className="fixed inset-0 z-50 flex flex-col bg-[#0B1F19]/95 backdrop-blur-md overflow-hidden"
      dir="rtl"
    >
      {/* Top Reader Bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0F2922] px-3 sm:px-5 py-2.5 text-white shadow-md">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20"
            aria-label="إغلاق قارئ المصحف"
          >
            <X className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#FDF6E7] font-quran flex items-center gap-2">
              <span>{meta.nameAr}</span>
              {activePage && (
                <span className="rounded-lg bg-[#B48327]/25 border border-[#E8D39E]/30 px-2 py-0.5 text-[11px] font-sans font-semibold text-[#E8D39E]">
                  صفحة {toArabicDigits(currentPageIdx + 1)} من {toArabicDigits(totalPagesInJuz)}
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* Reader Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Font Size */}
          <div className="flex items-center rounded-xl border border-white/15 bg-white/10 p-0.5">
            <button
              type="button"
              onClick={() => setFontSize((f) => Math.max(18, f - 2))}
              className="p-1.5 rounded-lg text-white/80 hover:bg-white/15 hover:text-white"
              title="تصغير الخط"
              aria-label="تصغير الخط"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-[11px] tabular-nums px-1.5 text-[#E8D39E] font-bold">
              {fontSize}
            </span>
            <button
              type="button"
              onClick={() => setFontSize((f) => Math.min(36, f + 2))}
              className="p-1.5 rounded-lg text-white/80 hover:bg-white/15 hover:text-white"
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
            className={`flex h-9 px-2.5 gap-1.5 items-center justify-center rounded-xl border transition-colors ${
              isDarkMode
                ? 'border-[#E8D39E]/50 bg-[#B48327]/25 text-[#E8D39E] hover:bg-[#B48327]/35'
                : 'border-white/15 bg-white/10 text-white hover:bg-white/20'
            }`}
            aria-label={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
            title={isDarkMode ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
          >
            {isDarkMode ? (
              <>
                <Sun className="h-4 w-4 text-[#FDE68A]" />
                <span className="hidden md:inline text-xs font-semibold text-[#FDE68A]">نهاري</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-[#E8D39E]" />
                <span className="hidden md:inline text-xs font-semibold text-[#E8D39E]">ليلي</span>
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
              className="flex items-center gap-1 rounded-xl bg-rose-500/20 border border-rose-400/40 px-2.5 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/30"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">إلغاء الحجز</span>
            </button>
          )}

          {/* Always-accessible Complete Juz button in header bar */}
          {!isCompleted && (
            <button
              type="button"
              data-testid="complete-juz-btn"
              onClick={handleCompleteClick}
              disabled={isSubmittingComplete}
              className="flex items-center gap-1.5 rounded-xl bg-[#15803D] hover:bg-[#166534] border border-[#A7F3D0]/40 px-3 py-1.5 text-xs font-bold text-white shadow-sm"
            >
              <CheckCircle className="h-3.5 w-3.5 text-[#A7F3D0]" />
              <span>{isSubmittingComplete ? 'جاري الحفظ...' : 'أتممت القراءة'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Mushaf Page Viewport */}
      <div
        className={`flex-1 overflow-y-auto px-2 sm:px-6 py-3 sm:py-6 flex flex-col items-center justify-between transition-colors duration-200 ${
          isDarkMode ? 'bg-[#050C0A]' : 'bg-[#EFE8D8]'
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {isLoading && !activePage ? (
          <div className="flex flex-col items-center justify-center my-auto py-20 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#B48327] border-t-transparent" />
            <p
              className={`mt-4 text-sm font-medium ${
                isDarkMode ? 'text-[#E8D39E]' : 'text-[#0F2922]'
              }`}
            >
              جاري فتح صفحات المصحف الشريف...
            </p>
          </div>
        ) : (
          <>
            {/* Authentic Framed Mushaf Page Sheet */}
            <div
              className={`relative w-full max-w-[680px] my-auto rounded-2xl border-2 transition-colors duration-200 ${
                isDarkMode
                  ? 'bg-[#0B1914] border-[#B48327]/50 text-[#F5EFE0] shadow-[0_24px_60px_rgba(0,0,0,0.85)]'
                  : 'bg-[#FFFDF7] border-[#C8AD72] text-[#18120B] shadow-2xl'
              }`}
            >
              {/* Outer & Inner Illuminated Mushaf Frame */}
              <div
                className={`m-2 sm:m-3 rounded-xl border-2 p-3 sm:p-6 flex flex-col justify-between min-h-[68vh] transition-colors duration-200 ${
                  isDarkMode
                    ? 'border-[#B48327]/35 bg-gradient-to-b from-[#0E201A]/70 via-[#0B1914] to-[#0E201A]/70'
                    : 'border-[#D9C391]'
                }`}
              >
                {/* Mushaf Page Top Margin Bar (سورة ... | الجزء ...) */}
                <div
                  className={`flex items-center justify-between border-b pb-2.5 mb-4 text-xs sm:text-sm font-quran font-bold ${
                    isDarkMode
                      ? 'border-[#B48327]/30 text-[#E8D39E]'
                      : 'border-[#E6DEC8] text-[#6B4E16]'
                  }`}
                >
                  <span>{meta.nameAr}</span>
                  <span className="text-[11px] font-sans font-semibold opacity-85">
                    صفحة المصحف {toArabicDigits(activePage?.pageNumber || 1)}
                  </span>
                  <span>{activePage?.firstSurahNameAr}</span>
                </div>

                {/* Mushaf Page Body (Continuous Justified Lines Like Printed Mushaf) */}
                <div className="my-auto py-1 space-y-5">
                  {activePage?.sections.map((section) => (
                    <div key={`${activePage.pageNumber}-${section.surahNumber}`} className="space-y-3">
                      {/* Ornamental Surah Banner when Surah starts on this page */}
                      {section.showHeader && (
                        <div
                          className={`relative overflow-hidden rounded-xl border-2 py-2.5 px-4 text-center shadow-xs ${
                            isDarkMode
                              ? 'border-[#B48327]/60 bg-gradient-to-r from-[#0F2922] via-[#15362C] to-[#0F2922]'
                              : 'border-[#C8AD72] bg-[#FBF4E2]'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-3">
                            <span className="text-xs font-bold text-[#D4A13E]">۞</span>
                            <h3
                              className={`text-xl sm:text-2xl font-bold font-quran ${
                                isDarkMode ? 'text-[#FDF6E7]' : 'text-[#0F2922]'
                              }`}
                            >
                              {section.surahNameAr}
                            </h3>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                isDarkMode
                                  ? 'bg-[#B48327]/25 text-[#E8D39E] border border-[#E8D39E]/30'
                                  : 'bg-[#0F2922]/10 text-[#0F2922]'
                              }`}
                            >
                              {section.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}
                            </span>
                            <span className="text-xs font-bold text-[#D4A13E]">۞</span>
                          </div>
                        </div>
                      )}

                      {/* Basmala Line */}
                      {section.showBasmala && (
                        <div className="py-1.5 text-center">
                          <p
                            className={`text-xl sm:text-2xl font-quran font-bold ${
                              isDarkMode ? 'text-[#E8D39E]' : 'text-[#0F2922]'
                            }`}
                          >
                            بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                          </p>
                        </div>
                      )}

                      {/* Continuous Justified Mushaf Text Block */}
                      <div
                        className="font-quran text-justify leading-[2.35]"
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
                              onClick={() => selectAyah(ayah.surahNumber, ayah.ayahNumber)}
                              className={`inline rounded-lg px-1 py-0.5 cursor-pointer select-text transition-colors ${
                                isCurrent
                                  ? isDarkMode
                                    ? 'bg-[#B48327]/30 text-[#FFFDF7] ring-1 ring-[#E8D39E]/60'
                                    : 'bg-[#FDE68A]/75 text-[#0F2922] ring-1 ring-[#B48327]/50'
                                  : isDarkMode
                                  ? 'hover:bg-white/5'
                                  : 'hover:bg-[#F4EFE6]'
                              }`}
                            >
                              <span>{ayah.textUthmani} </span>
                              <span
                                className={`inline-flex items-center justify-center text-[0.82em] font-quran font-bold mx-1 select-none ${
                                  isCurrent
                                    ? isDarkMode
                                      ? 'text-[#FDE68A]'
                                      : 'text-[#92400E]'
                                    : isDarkMode
                                    ? 'text-[#D4A13E]'
                                    : 'text-[#B48327]'
                                }`}
                                title={`آية ${ayah.ayahNumber}`}
                              >
                                ﴿{toArabicDigits(ayah.ayahNumber)}﴾
                              </span>{' '}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mushaf Page Bottom Medallion & Page Number */}
                <div
                  className={`mt-6 pt-3 border-t flex items-center justify-between text-xs ${
                    isDarkMode
                      ? 'border-[#B48327]/30 text-[#E8D39E]'
                      : 'border-[#E6DEC8] text-[#6B4E16]'
                  }`}
                >
                  <span className="text-[11px] opacity-80">
                    اضغط على أي آية للاستماع إليها
                  </span>
                  <div
                    className={`inline-flex items-center justify-center rounded-full border px-4 py-1 font-quran font-bold text-sm ${
                      isDarkMode
                        ? 'border-[#B48327]/50 bg-[#0F2922] text-[#E8D39E]'
                        : 'border-[#C8AD72] bg-[#FBF4E2] text-[#0F2922]'
                    }`}
                  >
                    {toArabicDigits(activePage?.pageNumber || 1)}
                  </div>
                  <span className="text-[11px] opacity-80">
                    اسحب يميناً أو يساراً لتقليب الصفحات
                  </span>
                </div>
              </div>
            </div>

            {/* Mushaf Page Flipper Bar (Next Page / Page Selector / Prev Page) */}
            <div className="mt-4 w-full max-w-[680px] flex flex-col gap-3">
              <div
                className={`flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 shadow-sm transition-colors ${
                  isDarkMode
                    ? 'border-[#B48327]/35 bg-[#0B1914] text-[#F4EFE6]'
                    : 'border-[#E6DEC8] bg-white text-[#0F2922]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => goToPage(currentPageIdx - 1)}
                  disabled={currentPageIdx <= 0}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold disabled:opacity-40 transition-colors ${
                    isDarkMode
                      ? 'bg-[#142C24] border border-[#B48327]/30 text-[#E8D39E] hover:bg-[#1B3A30]'
                      : 'bg-[#F4EFE6] text-[#0F2922] hover:bg-[#E6DEC8]'
                  }`}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span>الصفحة السابقة</span>
                </button>

                {/* Direct Page Selector */}
                <div className="flex items-center gap-2">
                  <select
                    aria-label="اختر صفحة المصحف"
                    value={currentPageIdx}
                    onChange={(e) => goToPage(Number(e.target.value))}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-bold focus:outline-none transition-colors ${
                      isDarkMode
                        ? 'border-[#B48327]/40 bg-[#08130F] text-[#F4EFE6] focus:border-[#E8D39E]'
                        : 'border-[#E6DEC8] bg-[#FBF8F3] text-[#0F2922] focus:border-[#B48327]'
                    }`}
                  >
                    {mushafPages.map((p, idx) => (
                      <option key={p.pageNumber} value={idx}>
                        صفحة {toArabicDigits(idx + 1)} من {toArabicDigits(totalPagesInJuz)} (صـ{' '}
                        {toArabicDigits(p.pageNumber)})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => goToPage(currentPageIdx + 1)}
                  disabled={currentPageIdx >= totalPagesInJuz - 1}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold disabled:opacity-40 transition-colors ${
                    isDarkMode
                      ? 'bg-[#B48327] text-[#08130F] hover:bg-[#C99635]'
                      : 'bg-[#0F2922] text-white hover:bg-[#14372e]'
                  }`}
                >
                  <span>الصفحة التالية</span>
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>

              {/* Final Page Completion Callout */}
              {isLastPage && !isCompleted && (
                <div
                  className={`rounded-2xl border-2 p-4 text-center shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors ${
                    isDarkMode
                      ? 'border-[#22C55E]/60 bg-[#0A261B] text-[#ECFDF5]'
                      : 'border-[#15803D] bg-[#ECFDF5] text-[#065F46]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 text-right">
                    <Sparkles
                      className={`h-6 w-6 shrink-0 ${
                        isDarkMode ? 'text-[#4ADE80]' : 'text-[#15803D]'
                      }`}
                    />
                    <div>
                      <h4
                        className={`text-sm font-bold ${
                          isDarkMode ? 'text-[#ECFDF5]' : 'text-[#065F46]'
                        }`}
                      >
                        وصلتَ إلى الصفحة الأخيرة من {meta.nameAr}
                      </h4>
                      <p
                        className={`text-xs ${
                          isDarkMode ? 'text-[#A7F3D0]' : 'text-[#047857]'
                        }`}
                      >
                        تقبل الله طاعتك! اضغط على الزر لتسجيل إتمام الجزء في الختمة.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCompleteClick}
                    disabled={isSubmittingComplete}
                    className="w-full sm:w-auto shrink-0 rounded-xl bg-[#15803D] hover:bg-[#166534] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm"
                  >
                    <span>
                      {isSubmittingComplete
                        ? 'جاري الحفظ...'
                        : 'أتممت قراءة الجزء ولله الحمد'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Audio Reciter Bar */}
      <AudioReciterBar
        currentSurahNumber={activeSurahNumber}
        currentSurahNameAr={currentSurahNameAr}
        currentAyahNumber={activeAyahNumber}
        onNextAyah={handleNextAyah}
        onPrevAyah={handlePrevAyah}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
