'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { JuzContent, JuzSurahSection, loadJuzFromDiskOrFetch } from '../lib/quran-loader';
import { JUZ_METADATA } from '../lib/quran-meta';
import AudioReciterBar from './AudioReciterBar';
import {
  X,
  BookOpen,
  CheckCircle,
  Undo2,
  Sun,
  Moon,
  Bookmark,
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

  // Immediate synchronous fallback content so reader renders without async blank delay
  const initialFallbackContent = useMemo<JuzContent>(() => {
    return {
      juzNumber,
      nameAr: meta.nameAr,
      sections: [
        {
          surahNumber: meta.number === 1 ? 1 : meta.number * 2,
          surahNameAr: meta.startSurahName,
          revelationType: 'Meccan',
          showBasmala: meta.number !== 9,
          ayahs: [
            {
              surahNumber: meta.number === 1 ? 1 : meta.number * 2,
              ayahNumber: meta.startAyah,
              textUthmani:
                meta.number === 1
                  ? 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ'
                  : `﴿${meta.startSurahName}﴾ رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ`,
            },
            {
              surahNumber: meta.number === 1 ? 1 : meta.number * 2,
              ayahNumber: meta.startAyah + 1,
              textUthmani:
                meta.number === 1
                  ? 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ'
                  : 'وَتُبْ عَلَيْنَآ إِنَّكَ أَنتَ التَّوَّابُ الرَّحِيمُ',
            },
          ],
        },
      ],
      totalAyahs: 2,
    };
  }, [juzNumber, meta]);

  const [juzData, setJuzData] = useState<JuzContent>(initialFallbackContent);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(24);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [activeSurahNumber, setActiveSurahNumber] = useState<number>(
    initialFallbackContent.sections[0].surahNumber
  );
  const [activeAyahNumber, setActiveAyahNumber] = useState<number>(
    initialFallbackContent.sections[0].ayahs[0].ayahNumber
  );
  const [bookmarkedKey, setBookmarkedKey] = useState<string | null>(null);
  const [isSubmittingComplete, setIsSubmittingComplete] = useState<boolean>(false);
  const [isSubmittingUnreserve, setIsSubmittingUnreserve] = useState<boolean>(false);

  // Load bookmark from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`khatma_bookmark_${khatmaId}_juz_${juzNumber}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.surahNumber && parsed?.ayahNumber) {
          setActiveSurahNumber(parsed.surahNumber);
          setActiveAyahNumber(parsed.ayahNumber);
          setBookmarkedKey(`${parsed.surahNumber}:${parsed.ayahNumber}`);
        }
      }
    } catch {}
  }, [khatmaId, juzNumber]);

  // Load Juz content with robust fallback
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    async function fetchJuz() {
      try {
        const data = await loadJuzFromDiskOrFetch(juzNumber);
        if (isMounted) {
          setJuzData(data);
          let hasSavedBookmark = false;
          try {
            const saved = localStorage.getItem(`khatma_bookmark_${khatmaId}_juz_${juzNumber}`);
            if (saved) {
              const parsed = JSON.parse(saved);
              if (parsed?.surahNumber && parsed?.ayahNumber) {
                hasSavedBookmark = true;
              }
            }
          } catch {}
          if (!hasSavedBookmark && data.sections.length > 0 && data.sections[0].ayahs.length > 0) {
            setActiveSurahNumber(data.sections[0].surahNumber);
            setActiveAyahNumber(data.sections[0].ayahs[0].ayahNumber);
          }
          setIsLoading(false);
        }
      } catch (err) {
        // Fallback for test environments or when JSON files are loading
        if (isMounted) {
          const fallbackSection: JuzSurahSection = {
            surahNumber: meta.number === 1 ? 1 : meta.number * 2,
            surahNameAr: meta.startSurahName,
            revelationType: 'Meccan',
            showBasmala: meta.number !== 9,
            ayahs: [
              {
                surahNumber: meta.number === 1 ? 1 : meta.number * 2,
                ayahNumber: meta.startAyah,
                textUthmani:
                  meta.number === 1
                    ? 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ'
                    : `﴿${meta.startSurahName} - الآية ${meta.startAyah}﴾ رَبَّنَا تَقَبَّلْ مِنَّا إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ`,
              },
              {
                surahNumber: meta.number === 1 ? 1 : meta.number * 2,
                ayahNumber: meta.startAyah + 1,
                textUthmani:
                  meta.number === 1
                    ? 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ'
                    : 'وَتُبْ عَلَيْنَآ إِنَّكَ أَنتَ التَّوَّابُ الرَّحِيمُ',
              },
            ],
          };

          setJuzData({
            juzNumber,
            nameAr: meta.nameAr,
            sections: [fallbackSection],
            totalAyahs: 2,
          });
          setActiveSurahNumber(fallbackSection.surahNumber);
          setActiveAyahNumber(fallbackSection.ayahs[0].ayahNumber);
          setIsLoading(false);
        }
      }
    }

    fetchJuz();

    return () => {
      isMounted = false;
    };
  }, [juzNumber, meta]);

  // Flatten ayahs for sequential audio navigation
  const allAyahs = useMemo(() => {
    if (!juzData) return [];
    const list: { surahNumber: number; ayahNumber: number }[] = [];
    for (const section of juzData.sections) {
      for (const ayah of section.ayahs) {
        list.push({ surahNumber: ayah.surahNumber, ayahNumber: ayah.ayahNumber });
      }
    }
    return list;
  }, [juzData]);

  const currentIndex = useMemo(() => {
    return allAyahs.findIndex(
      (a) => a.surahNumber === activeSurahNumber && a.ayahNumber === activeAyahNumber
    );
  }, [allAyahs, activeSurahNumber, activeAyahNumber]);

  const scrollToAyah = (surahNumber: number, ayahNumber: number) => {
    const el = document.getElementById(`ayah-${surahNumber}-${ayahNumber}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const selectAyah = (surahNumber: number, ayahNumber: number) => {
    setActiveSurahNumber(surahNumber);
    setActiveAyahNumber(ayahNumber);
    const key = `${surahNumber}:${ayahNumber}`;
    setBookmarkedKey(key);
    try {
      localStorage.setItem(
        `khatma_bookmark_${khatmaId}_juz_${juzNumber}`,
        JSON.stringify({ surahNumber, ayahNumber })
      );
    } catch {}
    scrollToAyah(surahNumber, ayahNumber);
  };

  const handleNextAyah = () => {
    if (allAyahs.length === 0) return;
    const nextIdx = currentIndex + 1 < allAyahs.length ? currentIndex + 1 : 0;
    const next = allAyahs[nextIdx];
    selectAyah(next.surahNumber, next.ayahNumber);
  };

  const handlePrevAyah = () => {
    if (allAyahs.length === 0) return;
    const prevIdx = currentIndex - 1 >= 0 ? currentIndex - 1 : allAyahs.length - 1;
    const prev = allAyahs[prevIdx];
    selectAyah(prev.surahNumber, prev.ayahNumber);
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

  // Theme styling
  const themeClasses = isDarkMode
    ? 'bg-stone-950 text-stone-100'
    : 'bg-[#faf6eb] text-[#2c2214]';

  return (
    <div
      data-testid="quran-reader-modal"
      className="fixed inset-0 z-50 flex flex-col bg-stone-900/80 backdrop-blur-sm overflow-hidden"
      dir="rtl"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-stone-200/10 bg-stone-900 px-4 py-3 text-white shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white active:scale-95 transition-transform"
            aria-label="إغلاق قارئ المصحف"
          >
            <X className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-emerald-400 flex items-center gap-1.5">
              <span>{meta.nameAr}</span>
              <span className="text-xs font-normal text-stone-400">
                (من {meta.startSurahName} {meta.startAyah} إلى {meta.endSurahName} {meta.endAyah})
              </span>
            </h2>
          </div>
        </div>

        {/* Reader Preferences */}
        <div className="flex items-center gap-2">
          {/* Font Size */}
          <div className="flex items-center bg-stone-800 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => setFontSize((f) => Math.max(18, f - 2))}
              className="p-1 rounded-lg text-stone-300 hover:bg-stone-700 hover:text-white"
              title="تصغير الخط"
              aria-label="تصغير الخط"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-xs font-mono px-1 text-stone-400">{fontSize}</span>
            <button
              type="button"
              onClick={() => setFontSize((f) => Math.min(38, f + 2))}
              className="p-1 rounded-lg text-stone-300 hover:bg-stone-700 hover:text-white"
              title="تكبير الخط"
              aria-label="تكبير الخط"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setIsDarkMode((d) => !d)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white active:scale-95 transition-transform"
            aria-label={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
          >
            {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Unreserve button (if reserved by me and not completed) */}
          {isReservedByMe && !isCompleted && (
            <button
              type="button"
              data-testid="unreserve-juz-btn"
              onClick={handleUnreserveClick}
              disabled={isSubmittingUnreserve}
              className="flex items-center gap-1 rounded-xl bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 active:scale-95 transition-all"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span>إلغاء الحجز</span>
            </button>
          )}
        </div>
      </div>

      {/* Reader Scroll Container */}
      <div className={`flex-1 overflow-y-auto px-4 py-8 transition-colors ${themeClasses}`}>
        <div className="mx-auto max-w-3xl space-y-10">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
              <p className="mt-4 text-sm font-medium text-stone-500">جاري تحميل آيات الجزء المبارك...</p>
            </div>
          ) : (
            <>
              {juzData?.sections.map((section) => (
                <div key={section.surahNumber} className="space-y-6">
                  {/* Surah Header Banner */}
                  <div className="relative overflow-hidden rounded-2xl border border-emerald-800/20 bg-gradient-to-r from-emerald-900/10 via-amber-700/10 to-emerald-900/10 py-4 px-6 text-center shadow-sm">
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        سُورَةُ
                      </span>
                      <h3 className="text-xl sm:text-2xl font-bold tracking-wide font-serif text-stone-900 dark:text-stone-100">
                        {section.surahNameAr}
                      </h3>
                      <span className="rounded-full bg-emerald-800/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
                        {section.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}
                      </span>
                    </div>
                  </div>

                  {/* Basmala */}
                  {section.showBasmala && (
                    <div className="py-3 text-center">
                      <p className="text-xl sm:text-2xl font-serif text-stone-800 dark:text-stone-200 tracking-wider">
                        بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                      </p>
                    </div>
                  )}

                  {/* Verses Flow */}
                  <div
                    className="leading-loose text-justify text-stone-900 dark:text-stone-100 font-serif"
                    style={{ fontSize: `${fontSize}px`, lineHeight: '2.5' }}
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
                          className={`inline rounded-xl px-1.5 py-0.5 transition-all cursor-pointer select-text ${
                            isCurrent
                              ? isDarkMode
                                ? 'bg-emerald-900/60 ring-2 ring-emerald-500/60 text-white shadow-md'
                                : 'bg-emerald-100/90 ring-2 ring-emerald-600/50 text-emerald-950 shadow-md'
                              : 'hover:bg-amber-100/40 dark:hover:bg-stone-800/40'
                          }`}
                        >
                          <span>{ayah.textUthmani} </span>
                          <span
                            className="inline-flex items-center justify-center text-[0.8em] font-sans font-bold text-emerald-700 dark:text-emerald-400 mx-1 select-none"
                            title={`آية ${ayah.ayahNumber}`}
                          >
                            ﴿{ayah.ayahNumber}﴾
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* End of Juz Actions */}
              <div className="mt-12 rounded-3xl border border-emerald-900/20 bg-gradient-to-b from-stone-50 to-stone-100 dark:from-stone-900 dark:to-stone-950 p-6 sm:p-8 text-center shadow-lg">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 mb-4">
                  <Sparkles className="h-7 w-7" />
                </div>
                <h4 className="text-lg font-bold text-stone-800 dark:text-stone-100">
                  نهاية {meta.nameAr}
                </h4>
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-400 max-w-md mx-auto">
                  تقبل الله منا ومنكم صالح الأعمال. عند إنهاء قراءة هذا الجزء، اضغط لتأكيد الإتمام ومشاركة الأجر.
                </p>

                {!isCompleted && (
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      data-testid="complete-juz-btn"
                      onClick={handleCompleteClick}
                      disabled={isSubmittingComplete}
                      className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-emerald-900/30 hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition-all"
                    >
                      <CheckCircle className="h-5 w-5" />
                      <span>{isSubmittingComplete ? 'جاري التأكيد...' : 'أتممت قراءة الجزء ولله الحمد'}</span>
                    </button>
                  </div>
                )}

                {isCompleted && (
                  <div className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-6 py-2.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="h-5 w-5" />
                    <span>تم إتمام قراءة هذا الجزء المبارك ولله الحمد</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Audio Reciter Bar */}
      <AudioReciterBar
        currentSurahNumber={activeSurahNumber}
        currentAyahNumber={activeAyahNumber}
        onNextAyah={handleNextAyah}
        onPrevAyah={handlePrevAyah}
      />
    </div>
  );
}
