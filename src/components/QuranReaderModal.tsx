'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { JuzContent, JuzAyah, loadJuzFromDiskOrFetch } from '../lib/quran-loader';
import { JUZ_METADATA } from '../lib/quran-meta';
import { useKhatmaTheme } from '../lib/theme';
import AudioReciterBar from './AudioReciterBar';
import { AyahStarMedallion, CornerCrosshairs, toArabicDigits } from './IslamicOrnaments';
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

  return (
    <div
      data-testid="quran-reader-modal"
      className="fixed inset-0 z-50 flex flex-col bg-[#081A14]/95 backdrop-blur-md overflow-hidden"
      dir="rtl"
    >
      {/* Top Architectural Reader Bar */}
      <div className="flex items-center justify-between border-b border-[#C5A059]/40 bg-[#081A14] px-3 sm:px-5 py-2.5 text-white shadow-md">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center border border-[#C5A059]/40 bg-[#112A21] text-[#E8D39E] hover:bg-[#18382C]"
            aria-label="إغلاق قارئ المصحف"
          >
            <X className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#C8A45D] font-quran flex items-center gap-2">
              <span>{meta.nameAr}</span>
              {activePage && (
                <span className="border border-[#C5A059]/40 bg-[#112A21] px-2 py-0.5 text-[11px] font-sans font-semibold text-[#E8D39E]">
                  صفحة {toArabicDigits(currentPageIdx + 1)} من {toArabicDigits(totalPagesInJuz)}
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* Reader Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Font Size */}
          <div className="flex items-center border border-[#C5A059]/35 bg-[#112A21] p-0.5">
            <button
              type="button"
              onClick={() => setFontSize((f) => Math.max(18, f - 2))}
              className="p-1.5 text-[#E8D39E] hover:bg-white/10"
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
              className="p-1.5 text-[#E8D39E] hover:bg-white/10"
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
                : 'border-[#C5A059]/35 bg-[#112A21] text-[#E8D39E] hover:bg-[#18382C]'
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
              className="flex items-center gap-1 border border-rose-400/40 bg-rose-500/20 px-2.5 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/30"
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
      </div>

      {/* Main Mushaf Page Viewport */}
      <div
        className={`flex-1 overflow-y-auto px-2 sm:px-6 pt-3 pb-4 flex flex-col items-center justify-between transition-colors duration-200 ${
          isDarkMode ? 'bg-[#050D0A]' : 'bg-[#E9E2D0]'
        }`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {isLoading && !activePage ? (
          <div className="flex flex-col items-center justify-center my-auto py-20 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#C5A059] border-t-transparent" />
            <p
              className={`mt-4 text-sm font-medium ${
                isDarkMode ? 'text-[#E8D39E]' : 'text-[#091B15]'
              }`}
            >
              جاري فتح صفحات المصحف الشريف...
            </p>
          </div>
        ) : (
          <>
            {/* Curved Top Mushaf Sheet with Triple-Ruled Islamic Geometric Frame (Option 1 Mockup) */}
            <div
              className={`relative w-full max-w-[680px] my-auto rounded-t-[28px] rounded-b-xl border-2 pt-3 pb-4 px-2.5 sm:px-5 transition-colors duration-200 ${
                isDarkMode
                  ? 'bg-[#0B1914] border-[#C5A059]/55 text-[#F5EFE0] shadow-[0_24px_60px_rgba(0,0,0,0.85)]'
                  : 'bg-[#F8F5EC] border-[#C5A059] text-[#141A17] shadow-2xl'
              }`}
            >
              {/* Top Sheet Handle Indicator (Matching Option 1 Mockup) */}
              <div className="flex justify-center pb-2.5">
                <div
                  className={`h-1.5 w-14 rounded-full ${
                    isDarkMode ? 'bg-[#C5A059]/40' : 'bg-[#C9C2B2]'
                  }`}
                />
              </div>

              {/* Outer Geometric Chain Border */}
              <div
                className={`border-2 p-1 ${
                  isDarkMode ? 'border-[#C5A059]/50' : 'border-[#23312B]'
                }`}
              >
                {/* Middle Gold Chain Strip */}
                <div
                  className={`border p-1 ${
                    isDarkMode
                      ? 'border-[#C5A059]/35 bg-[#0E211A]'
                      : 'border-[#C5A059] bg-[#EFE8D5]/60'
                  }`}
                >
                  {/* Inner Mushaf Reading Frame */}
                  <div
                    className={`relative border-2 p-3 sm:p-6 flex flex-col justify-between min-h-[65vh] ${
                      isDarkMode
                        ? 'border-[#C5A059]/45 bg-[#0B1914]'
                        : 'border-[#23312B] bg-[#FBF9F2]'
                    }`}
                  >
                    <CornerCrosshairs />

                    {/* Mushaf Page Top Margin Bar (سورة ... | الجزء ...) */}
                    <div
                      className={`flex items-center justify-between border-b pb-2.5 mb-4 text-xs sm:text-sm font-quran font-bold ${
                        isDarkMode
                          ? 'border-[#C5A059]/30 text-[#E8D39E]'
                          : 'border-[#C5A059]/60 text-[#3D2B08]'
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
                        <div
                          key={`${activePage.pageNumber}-${section.surahNumber}`}
                          className="space-y-3"
                        >
                          {/* Ornamental Surah Banner when Surah starts on this page */}
                          {section.showHeader && (
                            <div
                              className={`relative overflow-hidden border-2 py-2 px-4 text-center ${
                                isDarkMode
                                  ? 'border-[#C5A059]/65 bg-[#081A14]'
                                  : 'border-[#23312B] bg-[#F3EBD6]'
                              }`}
                            >
                              <div className="flex items-center justify-center gap-3">
                                <span className="text-xs font-bold text-[#C5A059]">۞</span>
                                <h3
                                  className={`text-xl sm:text-2xl font-bold font-quran ${
                                    isDarkMode ? 'text-[#C8A45D]' : 'text-[#091B15]'
                                  }`}
                                >
                                  {section.surahNameAr}
                                </h3>
                                <span
                                  className={`px-2 py-0.5 text-[10px] font-semibold border ${
                                    isDarkMode
                                      ? 'border-[#C5A059]/40 bg-[#112A21] text-[#E8D39E]'
                                      : 'border-[#C5A059] bg-[#FBF9F2] text-[#091B15]'
                                  }`}
                                >
                                  {section.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}
                                </span>
                                <span className="text-xs font-bold text-[#C5A059]">۞</span>
                              </div>
                            </div>
                          )}

                          {/* Basmala Line */}
                          {section.showBasmala && (
                            <div className="py-1.5 text-center">
                              <p
                                className={`text-2xl sm:text-3xl font-quran font-bold ${
                                  isDarkMode ? 'text-[#E8D39E]' : 'text-[#111A16]'
                                }`}
                              >
                                بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                              </p>
                            </div>
                          )}

                          {/* Continuous Justified Mushaf Text Block with 8-Pointed Gold Verse Medallions */}
                          <div
                            className="font-quran text-justify leading-[2.45]"
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
                                  className={`inline rounded-md px-1 py-0.5 cursor-pointer select-text transition-colors ${
                                    isCurrent
                                      ? isDarkMode
                                        ? 'bg-[#C5A059]/25 text-[#FFFDF7] ring-1 ring-[#C5A059]/60'
                                        : 'bg-[#EED9A4]/75 text-[#091B15] ring-1 ring-[#C5A059]'
                                      : isDarkMode
                                      ? 'hover:bg-white/5'
                                      : 'hover:bg-[#F2ECE0]'
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

                    {/* Mushaf Page Bottom Medallion & Page Number */}
                    <div
                      className={`mt-6 pt-3 border-t flex items-center justify-between text-xs ${
                        isDarkMode
                          ? 'border-[#C5A059]/30 text-[#E8D39E]'
                          : 'border-[#C5A059]/60 text-[#3D2B08]'
                      }`}
                    >
                      <span className="text-[11px] opacity-80">
                        اضغط على أي آية للاستماع إليها
                      </span>
                      <div
                        className={`inline-flex items-center justify-center border px-4 py-0.5 font-quran font-bold text-sm ${
                          isDarkMode
                            ? 'border-[#C5A059]/60 bg-[#081A14] text-[#C8A45D]'
                            : 'border-[#23312B] bg-[#F3EBD6] text-[#091B15]'
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
              </div>
            </div>

            {/* Mushaf Page Flipper Bar (Next Page / Page Selector / Prev Page) */}
            <div className="mt-3 w-full max-w-[680px] flex flex-col gap-3">
              <div
                className={`flex items-center justify-between gap-2 border px-3 py-2 shadow-xs transition-colors ${
                  isDarkMode
                    ? 'border-[#C5A059]/40 bg-[#0B1914] text-[#F4EFE6]'
                    : 'border-[#C5A059] bg-[#F8F5EC] text-[#091B15]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => goToPage(currentPageIdx - 1)}
                  disabled={currentPageIdx <= 0}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold disabled:opacity-40 transition-colors border ${
                    isDarkMode
                      ? 'border-[#C5A059]/35 bg-[#112A21] text-[#E8D39E] hover:bg-[#18382C]'
                      : 'border-[#C5A059]/60 bg-[#EFE8D6] text-[#091B15] hover:bg-[#E4DAC2]'
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
                    className={`border px-3 py-1.5 text-xs font-bold focus:outline-none transition-colors ${
                      isDarkMode
                        ? 'border-[#C5A059]/40 bg-[#08130F] text-[#F4EFE6] focus:border-[#C5A059]'
                        : 'border-[#C5A059] bg-[#FBF9F2] text-[#091B15] focus:border-[#8C661E]'
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
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold disabled:opacity-40 transition-colors border ${
                    isDarkMode
                      ? 'border-[#C5A059] bg-[#C5A059] text-[#081A14] hover:bg-[#D4B06A]'
                      : 'border-[#091B15] bg-[#091B15] text-[#E8D39E] hover:bg-[#123126]'
                  }`}
                >
                  <span>الصفحة التالية</span>
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>

              {/* Final Page Completion Callout */}
              {isLastPage && !isCompleted && (
                <div
                  className={`relative border-2 p-4 text-center shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 transition-colors ${
                    isDarkMode
                      ? 'border-[#C5A059] bg-[#081A14] text-[#F4EFE6]'
                      : 'border-[#11382A] bg-[#EFE8D6] text-[#091B15]'
                  }`}
                >
                  <CornerCrosshairs />
                  <div className="flex items-center gap-2.5 text-right">
                    <Sparkles className="h-6 w-6 shrink-0 text-[#C5A059]" />
                    <div>
                      <h4 className="text-sm font-bold font-quran text-base">
                        وصلتَ إلى الصفحة الأخيرة من {meta.nameAr}
                      </h4>
                      <p className="text-xs opacity-85">
                        تقبل الله طاعتك! اضغط على الزر لختم الجزء في الربعة الشريفة.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCompleteClick}
                    disabled={isSubmittingComplete}
                    className="w-full sm:w-auto shrink-0 border border-[#C5A059] bg-[#11382A] hover:bg-[#174937] px-5 py-2.5 text-xs sm:text-sm font-bold text-[#E8D39E] shadow-xs"
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

      {/* Floating Pill Audio Reciter Bar */}
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
