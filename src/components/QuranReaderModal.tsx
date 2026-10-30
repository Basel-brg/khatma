'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { JuzContent, JuzAyah, loadJuzFromDiskOrFetch } from '../lib/quran-loader';
import { JUZ_METADATA } from '../lib/quran-meta';
import { SECURITY_LIMITS, isValidKhatmaId, sanitizeText } from '../lib/validation';
import { useKhatmaTheme } from '../lib/theme';
import AudioReciterBar from './AudioReciterBar';
import { AyahStarMedallion, SurahCartoucheBanner, toArabicDigits, CornerCrosshairs } from './IslamicOrnaments';
import {
  Menu,
  X,
  Check,
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
  Settings,
  Bookmark,
  MessageSquare,
  Sparkles,
  Lock,
} from 'lucide-react';

export interface QuranReaderModalProps {
  juzNumber: number;
  khatmaId: string;
  uid: string;
  isReservedByMe: boolean;
  isCompleted: boolean;
  isCompletedByMe?: boolean;
  isAccessDenied?: boolean;
  holderName?: string | null;
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
  isCompletedByMe,
  isAccessDenied,
  holderName,
  onClose,
  onComplete,
  onUnreserve,
}: QuranReaderModalProps) {
  const accessDenied =
    isAccessDenied !== undefined
      ? isAccessDenied
      : !isReservedByMe && (isCompleted ? !isCompletedByMe : true);

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
  const [bookmarkToast, setBookmarkToast] = useState<string | null>(null);

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
  const ayahPressStartCoords = useRef<{ x: number; y: number } | null>(null);
  const selectionToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clickSuppressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [pressingAyah, setPressingAyah] = useState<{ surahNumber: number; ayahNumber: number } | null>(null);
  const [ayahSelectionToast, setAyahSelectionToast] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (selectionToastTimerRef.current) clearTimeout(selectionToastTimerRef.current);
      if (clickSuppressTimerRef.current) clearTimeout(clickSuppressTimerRef.current);
    };
  }, []);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const pointerStartX = useRef<number | null>(null);
  const pointerStartY = useRef<number | null>(null);
  const isPointerDown = useRef<boolean>(false);
  const isSwipeActive = useRef<boolean>(false);
  const lastSwipeTimestamp = useRef<number>(0);

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
    // Lock body scrolling when reader modal is mounted
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Blur any active element (e.g. previous input in Reserve sheet) to dismiss mobile keyboard
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // Reset window scroll position in case mobile keyboard offset the viewport
    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
      try {
        window.scrollTo(0, 0);
      } catch {}
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    if (accessDenied) return;
    let isMounted = true;
    setIsLoading(true);

    async function fetchJuz() {
      try {
        const data = await loadJuzFromDiskOrFetch(juzNumber);
        if (isMounted) {
          setJuzData(data);
          let restoredBookmark = false;
          try {
            if (isValidKhatmaId(khatmaId)) {
              const saved = localStorage.getItem(`khatma_bookmark_${khatmaId}_juz_${juzNumber}`);
              if (saved) {
                const parsed = JSON.parse(saved);
                const sNum = Number(parsed?.surahNumber);
                const aNum = Number(parsed?.ayahNumber);
                if (
                  Number.isInteger(sNum) &&
                  sNum >= 1 &&
                  sNum <= 114 &&
                  Number.isInteger(aNum) &&
                  aNum >= 1 &&
                  aNum <= 286
                ) {
                  setActiveSurahNumber(sNum);
                  setActiveAyahNumber(aNum);
                  restoredBookmark = true;
                }
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

  const saveBookmark = () => {
    try {
      if (!isValidKhatmaId(khatmaId)) return;
      const pageNum = activePage?.pageNumber || 1;
      localStorage.setItem(
        `khatma_bookmark_${khatmaId}_juz_${juzNumber}`,
        JSON.stringify({
          surahNumber: activeSurahNumber,
          ayahNumber: activeAyahNumber,
          pageNumber: pageNum,
          savedAt: new Date().toISOString(),
        })
      );
      setBookmarkToast(`تم حفظ موضع القراءة (صفحة ${toArabicDigits(pageNum)})`);
      setTimeout(() => setBookmarkToast(null), 2500);
    } catch {}
  };

  const selectAyah = (surahNumber: number, ayahNumber: number) => {
    setActiveSurahNumber(surahNumber);
    setActiveAyahNumber(ayahNumber);
    try {
      if (!isValidKhatmaId(khatmaId)) return;
      localStorage.setItem(
        `khatma_bookmark_${khatmaId}_juz_${juzNumber}`,
        JSON.stringify({
          surahNumber,
          ayahNumber,
          pageNumber: activePage?.pageNumber || 1,
          savedAt: new Date().toISOString(),
        })
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

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diffX = touchStartX.current - e.touches[0].clientX;
    if (Math.abs(diffX) > 35) {
      isSwipeActive.current = true;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      setPressingAyah(null);
      ayahPressStartCoords.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const diffX = touchStartX.current - endX;
    if (Math.abs(diffX) > 35) {
      isSwipeActive.current = true;
      const now = Date.now();
      if (now - lastSwipeTimestamp.current > 300) {
        lastSwipeTimestamp.current = now;
        if (diffX < -35) {
          // Swipe right -> advance to next page
          goToPage(currentPageIdx + 1);
        } else if (diffX > 35) {
          // Swipe left -> return to previous page
          goToPage(currentPageIdx - 1);
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
    setTimeout(() => {
      isSwipeActive.current = false;
    }, 100);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;
    isPointerDown.current = true;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDown.current || pointerStartX.current === null) return;
    const diffX = pointerStartX.current - e.clientX;
    if (Math.abs(diffX) > 35) {
      isSwipeActive.current = true;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      setPressingAyah(null);
      ayahPressStartCoords.current = null;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPointerDown.current || pointerStartX.current === null) return;
    const diffX = pointerStartX.current - e.clientX;
    if (Math.abs(diffX) > 35) {
      isSwipeActive.current = true;
      const now = Date.now();
      if (now - lastSwipeTimestamp.current > 300) {
        lastSwipeTimestamp.current = now;
        if (diffX < -35) {
          // Swipe right -> advance to next page
          goToPage(currentPageIdx + 1);
        } else if (diffX > 35) {
          // Swipe left -> return to previous page
          goToPage(currentPageIdx - 1);
        }
      }
    }
    pointerStartX.current = null;
    pointerStartY.current = null;
    isPointerDown.current = false;
    setTimeout(() => {
      isSwipeActive.current = false;
    }, 100);
  };

  const handlePointerCancel = () => {
    pointerStartX.current = null;
    pointerStartY.current = null;
    isPointerDown.current = false;
  };

  // Long press on Ayah handlers (2.0s hold)
  const handleAyahPointerDown = (
    e: React.PointerEvent<HTMLElement>,
    surahNumber: number,
    ayahNumber: number
  ) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isLongPressActive.current = false;
    const clientX = typeof e.clientX === 'number' ? e.clientX : 0;
    const clientY = typeof e.clientY === 'number' ? e.clientY : 0;
    ayahPressStartCoords.current = { x: clientX, y: clientY };
    setPressingAyah({ surahNumber, ayahNumber });

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActive.current = true;
      setPressingAyah(null);
      ayahPressStartCoords.current = null;
      selectAyah(surahNumber, ayahNumber);
      setShowControls(true);
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(50);
        } catch {}
      }
      setAyahSelectionToast(`تم تحديد الآية ${toArabicDigits(ayahNumber)}`);
      if (selectionToastTimerRef.current) clearTimeout(selectionToastTimerRef.current);
      selectionToastTimerRef.current = setTimeout(() => {
        setAyahSelectionToast(null);
      }, 2000);
    }, 2000); // exactly 2.0s long press
  };

  const handleAyahPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!ayahPressStartCoords.current || !longPressTimerRef.current) return;
    const clientX = typeof e.clientX === 'number' ? e.clientX : ayahPressStartCoords.current.x;
    const clientY = typeof e.clientY === 'number' ? e.clientY : ayahPressStartCoords.current.y;
    const diffX = Math.abs(clientX - ayahPressStartCoords.current.x);
    const diffY = Math.abs(clientY - ayahPressStartCoords.current.y);
    // Allow micro-jitter < 15px. Only cancel if movement exceeds 15px.
    if (diffX > 15 || diffY > 15) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      setPressingAyah(null);
      ayahPressStartCoords.current = null;
    }
  };

  const handleAyahTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    if (!ayahPressStartCoords.current || !longPressTimerRef.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const diffX = Math.abs(touch.clientX - ayahPressStartCoords.current.x);
    const diffY = Math.abs(touch.clientY - ayahPressStartCoords.current.y);
    if (diffX > 15 || diffY > 15) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      setPressingAyah(null);
      ayahPressStartCoords.current = null;
    }
  };

  const handleAyahPointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setPressingAyah(null);
    ayahPressStartCoords.current = null;
  };

  const handleAyahPointerCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setPressingAyah(null);
    ayahPressStartCoords.current = null;
  };

  const handleAyahPointerLeave = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse') {
      handleAyahPointerUp();
    }
  };

  const [completeToast, setCompleteToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const handleCompleteClick = async () => {
    if (isSubmittingComplete) return;
    setIsSubmittingComplete(true);
    setCompleteToast(null);
    try {
      await onComplete();
      setCompleteToast({
        message: 'تقبل الله طاعتكم! تم تسجيل إتمام قراءة الجزء بنجاح 🤲',
        type: 'success',
      });
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error('Failed to complete juz:', err);
      setCompleteToast({
        message: err?.message || 'تعذر تأكيد الإتمام، يرجى المحاولة مرة أخرى',
        type: 'error',
      });
      setTimeout(() => setCompleteToast(null), 3500);
    } finally {
      setIsSubmittingComplete(false);
    }
  };

  const handleUnreserveClick = async () => {
    if (isSubmittingUnreserve) return;
    setIsSubmittingUnreserve(true);
    setCompleteToast(null);
    try {
      await onUnreserve();
      onClose();
    } catch (err: any) {
      console.error('Failed to unreserve juz:', err);
      setCompleteToast({
        message: err?.message || 'تعذر إلغاء الحجز',
        type: 'error',
      });
      setTimeout(() => setCompleteToast(null), 3500);
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
    const cleanQuery = sanitizeText(searchQuery, SECURITY_LIMITS.SEARCH_QUERY_MAX_LEN);
    if (!cleanQuery) return availableSurahs;
    return availableSurahs.filter(
      (s) =>
        s.surahNameAr.includes(cleanQuery) ||
        String(s.surahNumber) === cleanQuery
    );
  }, [availableSurahs, searchQuery]);

  if (accessDenied) {
    return (
      <div
        data-testid="quran-reader-modal"
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 select-none ${
          isDarkMode ? 'bg-[#07140E] text-white' : 'bg-[#F5F1E8] text-[#091B15]'
        }`}
        dir="rtl"
      >
        <div
          data-testid="access-denied-view"
          className={`relative max-w-md w-full border p-6 sm:p-8 text-center shadow-2xl rounded-sm ${
            isDarkMode
              ? 'border-[#C5A059]/60 bg-[#0A1E16] text-[#F4EFE6]'
              : 'border-[#C5A059] bg-[#FFFFFF] text-[#091B15]'
          }`}
        >
          <CornerCrosshairs />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-500 mb-4">
            <Lock className="h-7 w-7" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold font-quran text-[#C5A059]">
            الوصول غير متاح لهذا الجزء
          </h2>

          <p className="mt-3 text-xs sm:text-sm text-[#7D9087] dark:text-[#A6B8B0] leading-relaxed">
            {isCompleted
              ? `هذا الجزء مختوم ومكتمل بواسطة ${holderName || 'قارئ آخر'}، ولا يمكن فتحه من قبل شخص آخر.`
              : `هذا الجزء محجوز حالياً بواسطة ${holderName || 'قارئ آخر'}، والقراءة مخصصة لحاجز الجزء فقط.`}
          </p>

          <button
            type="button"
            data-testid="close-access-denied-btn"
            onClick={onClose}
            className="mt-6 inline-flex items-center justify-center gap-2 border border-[#C5A059] bg-[#091B15] text-[#C5A059] hover:bg-[#123126] hover:text-[#E8D39E] px-6 py-2.5 text-xs sm:text-sm font-bold transition-colors w-full sm:w-auto"
          >
            <span>العودة لصفحة الختمة</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="quran-reader-modal"
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden select-none transition-colors duration-200 touch-manipulation ${
        isDarkMode ? 'bg-[#07140E] text-white' : 'bg-[#FFFFFF] text-[#091B15]'
      }`}
      dir="rtl"
    >
      {/* 1. Sleek Top Bar with Crisp Light & Dark Support */}
      <header
        className={`fixed top-0 inset-x-0 z-40 flex items-center justify-between px-3 sm:px-6 py-2.5 backdrop-blur-md border-b transition-all duration-300 ${
          isDarkMode
            ? 'border-[#C5A059]/35 bg-[#07140E]/98 text-white shadow-md'
            : 'border-[#E6DEC8] bg-[#FFFFFF]/98 text-[#091B15] shadow-xs'
        } ${
          showControls
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        {/* Right side (RTL): Burger Menu & Bookmark Button (Settings replaced by Burger Menu) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              isDarkMode
                ? 'text-[#C5A059] hover:bg-white/10'
                : 'text-[#091B15] hover:bg-black/5'
            }`}
            aria-label="فتح قائمة إعدادات المصحف"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={saveBookmark}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all active:scale-95 ${
              isDarkMode
                ? 'border-[#C5A059]/50 bg-[#0A1C15] text-[#C5A059] hover:bg-[#102B20]'
                : 'border-[#C5A059]/60 bg-[#FDF8EE] text-[#091B15] hover:bg-[#F8EED6]'
            }`}
            title="حفظ موضع القراءة"
          >
            <Bookmark className="h-4 w-4 fill-current text-[#C5A059]" />
            <span className="tabular-nums">
              {bookmarkToast ? 'تم الحفظ ✓' : toArabicDigits(activePage?.pageNumber || 1)}
            </span>
          </button>
        </div>

        {/* Left side (RTL): Completion Button & Close Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Dynamic Complete Button (Only on Last Page) */}
          {isLastPage && !isCompleted && (
            <button
              type="button"
              data-testid="complete-juz-btn"
              onClick={handleCompleteClick}
              disabled={isSubmittingComplete}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold shadow-md transition-all active:scale-95 ${
                isDarkMode
                  ? 'bg-[#C5A059] text-[#07140E] hover:bg-[#D4A13E]'
                  : 'bg-[#091B15] text-white hover:bg-[#143D30]'
              }`}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>{isSubmittingComplete ? 'جاري...' : 'أتممت القراءة'}</span>
            </button>
          )}

          {isCompleted && isLastPage && (
            <span
              className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                isDarkMode
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
              }`}
            >
              <Check className="h-3 w-3" />
              <span>مكتمل</span>
            </span>
          )}

          {/* Close Reader Button */}
          <button
            type="button"
            onClick={onClose}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ml-1 ${
              isDarkMode
                ? 'text-[#A6B8B0] hover:text-white hover:bg-white/10'
                : 'text-[#7D9087] hover:text-[#091B15] hover:bg-black/5'
            }`}
            aria-label="إغلاق قارئ المصحف"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Floating Bookmark Toast feedback banner */}
      {bookmarkToast && (
        <div
          className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 rounded-full border px-4 py-1.5 text-xs font-bold shadow-xl flex items-center gap-2 animate-fade-in ${
            isDarkMode
              ? 'border-[#C5A059] bg-[#07140E] text-white'
              : 'border-[#C5A059] bg-[#FFFFFF] text-[#091B15]'
          }`}
          role="status"
        >
          <Bookmark className="h-3.5 w-3.5 text-[#C5A059] fill-current" />
          <span>{bookmarkToast}</span>
        </div>
      )}

      {/* Floating Ayah Selection Confirmation Toast */}
      {ayahSelectionToast && (
        <div
          className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 rounded-full border px-4 py-1.5 text-xs font-bold shadow-xl flex items-center gap-2 animate-fade-in ${
            isDarkMode
              ? 'border-[#C5A059] bg-[#07140E] text-white shadow-black/60'
              : 'border-[#C5A059] bg-[#FFFFFF] text-[#091B15] shadow-black/10'
          }`}
          role="status"
          data-testid="ayah-selection-toast"
        >
          <Check className="h-3.5 w-3.5 text-[#C5A059]" />
          <span>{ayahSelectionToast}</span>
        </div>
      )}

      {/* Floating Completion Feedback Toast */}
      {completeToast && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-full border px-5 py-2 text-xs sm:text-sm font-bold shadow-2xl flex items-center gap-2 animate-fade-in ${
            completeToast.type === 'success'
              ? 'border-emerald-500 bg-[#082218] text-white shadow-emerald-950/40'
              : 'border-red-500 bg-[#280D0D] text-white shadow-red-950/40'
          }`}
          role="status"
        >
          {completeToast.type === 'success' ? (
            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <X className="h-4 w-4 text-red-400 shrink-0" />
          )}
          <span>{completeToast.message}</span>
        </div>
      )}

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

        {/* Slide-out Panel with Dynamic Light/Dark Theme Support */}
        <div
          className={`relative z-10 w-full max-w-xs sm:max-w-sm flex flex-col justify-between p-5 shadow-2xl transition-transform duration-300 ${
            isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
          } ${
            isDarkMode
              ? 'bg-[#07140E] text-white border-l border-[#C5A059]/40'
              : 'bg-[#FFFFFF] text-[#091B15] border-l border-[#E6DEC8]'
          }`}
        >
          <div className="space-y-6">
            {/* Drawer Header */}
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                isDarkMode ? 'border-[#C5A059]/25' : 'border-[#E6DEC8]'
              }`}
            >
              <div className="flex items-center gap-2">
                <BookOpen
                  className={`h-5 w-5 ${isDarkMode ? 'text-[#C5A059]' : 'text-[#091B15]'}`}
                />
                <h3
                  className={`font-quran text-lg font-bold ${
                    isDarkMode ? 'text-[#C5A059]' : 'text-[#091B15]'
                  }`}
                >
                  إعدادات المصحف والقراءة
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className={`p-1 rounded-full transition-colors ${
                  isDarkMode
                    ? 'text-[#C5A059] hover:bg-[#C5A059]/15'
                    : 'text-[#091B15] hover:bg-black/5'
                }`}
                aria-label="رجوع من القائمة"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Setting 1: Font Size Controls */}
            <div className="space-y-2">
              <div
                className={`flex items-center justify-between text-xs font-semibold ${
                  isDarkMode ? 'text-[#E8D39E]' : 'text-[#091B15]'
                }`}
              >
                <span>حجم خط التلاوة</span>
                <span className="font-bold tabular-nums text-[#C5A059]">{fontSize}px</span>
              </div>
              <div
                className={`flex items-center justify-between rounded-xl border p-2 transition-colors ${
                  isDarkMode
                    ? 'border-[#C5A059]/30 bg-[#0D241C] text-white'
                    : 'border-[#E6DEC8] bg-[#F9F7F2] text-[#091B15]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setFontSize((f) => Math.max(18, f - 2))}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'text-[#C5A059] hover:bg-[#C5A059]/15'
                      : 'text-[#091B15] hover:bg-black/5'
                  }`}
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
                  className={`flex-1 mx-3 h-1.5 rounded-lg appearance-none cursor-pointer ${
                    isDarkMode
                      ? 'bg-[#14372e] accent-[#C5A059]'
                      : 'bg-[#E6DEC8] accent-[#091B15]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setFontSize((f) => Math.min(38, f + 2))}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'text-[#C5A059] hover:bg-[#C5A059]/15'
                      : 'text-[#091B15] hover:bg-black/5'
                  }`}
                  title="تكبير الخط"
                  aria-label="تكبير الخط"
                >
                  <ZoomIn className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Setting 2: Day / Night Theme Toggle */}
            <div className="space-y-2">
              <span
                className={`text-xs font-semibold ${
                  isDarkMode ? 'text-[#E8D39E]' : 'text-[#091B15]'
                }`}
              >
                مظهر القراءة
              </span>
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-bold transition-colors ${
                  isDarkMode
                    ? 'border-[#C5A059]/30 bg-[#0D241C] text-white hover:border-[#C5A059]'
                    : 'border-[#E6DEC8] bg-[#F9F7F2] text-[#091B15] hover:border-[#091B15]'
                }`}
                aria-label={isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
              >
                <div className="flex items-center gap-2">
                  {isDarkMode ? (
                    <Sun className="h-4 w-4 text-[#FDE68A]" />
                  ) : (
                    <Moon className="h-4 w-4 text-[#091B15]" />
                  )}
                  <span>
                    {isDarkMode ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
                  </span>
                </div>
                <span
                  className={`text-[11px] ${
                    isDarkMode ? 'text-[#A6B8B0]' : 'text-[#7D9087]'
                  }`}
                >
                  {isDarkMode ? 'ليلي مذهّب' : 'نهاري ورقي'}
                </span>
              </button>
            </div>

            {/* Setting 3: Surah & Ayah Quick Search (Inside Drawer) */}
            <div className="space-y-2">
              <span
                className={`text-xs font-semibold ${
                  isDarkMode ? 'text-[#E8D39E]' : 'text-[#091B15]'
                }`}
              >
                البحث في سور الجزء
              </span>
              <div className="relative">
                <Search
                  className={`absolute right-3 top-2.5 h-4 w-4 ${
                    isDarkMode ? 'text-[#C5A059]' : 'text-[#091B15]'
                  }`}
                />
                <input
                  type="text"
                  maxLength={SECURITY_LIMITS.SEARCH_QUERY_MAX_LEN}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.slice(0, SECURITY_LIMITS.SEARCH_QUERY_MAX_LEN))}
                  placeholder="ابحث باسم السورة..."
                  className={`w-full rounded-xl border pr-9 pl-3 py-2 text-base sm:text-xs focus:outline-none transition-colors ${
                    isDarkMode
                      ? 'border-[#C5A059]/30 bg-[#0D241C] text-white placeholder-[#A6B8B0] focus:border-[#C5A059]'
                      : 'border-[#E6DEC8] bg-[#F9F7F2] text-[#091B15] placeholder-[#7D9087] focus:border-[#091B15]'
                  }`}
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
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${
                      isDarkMode
                        ? 'text-[#E8D39E] hover:bg-[#14372e]'
                        : 'text-[#091B15] hover:bg-[#F0EBE0]'
                    }`}
                  >
                    <span className="font-quran font-semibold">{s.surahNameAr}</span>
                    <span
                      className={`text-[10px] ${
                        isDarkMode ? 'text-[#A6B8B0]' : 'text-[#7D9087]'
                      }`}
                    >
                      سورة {toArabicDigits(s.surahNumber)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div
            className={`pt-4 border-t space-y-2 ${
              isDarkMode ? 'border-[#C5A059]/25' : 'border-[#E6DEC8]'
            }`}
          >
            {/* Early pages: Unreserve button */}
            {(!isLastPage || totalPagesInJuz <= 1) && !isCompleted && isReservedByMe && (
              <button
                type="button"
                data-testid="unreserve-juz-btn"
                onClick={handleUnreserveClick}
                disabled={isSubmittingUnreserve}
                className={`flex w-full items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-colors ${
                  isDarkMode
                    ? 'border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                    : 'border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100'
                }`}
              >
                <Undo2 className="h-4 w-4" />
                <span>{isSubmittingUnreserve ? 'جاري إلغاء الحجز...' : 'الاعتذار عن حجز الجزء'}</span>
              </button>
            )}

            {/* Last page: Complete button replaces unreserve */}
            {isLastPage && !isCompleted && (
              <button
                type="button"
                data-testid="drawer-complete-juz-btn"
                onClick={handleCompleteClick}
                disabled={isSubmittingComplete}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold shadow-lg transition-transform active:scale-98 ${
                  isDarkMode
                    ? 'bg-[#C5A059] text-[#07140E] hover:bg-[#D4A13E]'
                    : 'bg-[#091B15] text-white hover:bg-[#143D30]'
                }`}
              >
                <CheckCircle className="h-4 w-4" />
                <span>{isSubmittingComplete ? 'جاري تسجيل الإتمام...' : 'أتممت قراءة هذا الجزء'}</span>
              </button>
            )}

            {isCompleted && (
              <div
                className={`flex w-full items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold ${
                  isDarkMode
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-emerald-500/60 bg-emerald-50 text-emerald-800'
                }`}
              >
                <Check className="h-4 w-4" />
                <span>تم إتمام قراءة هذا الجزء بنجاح ✓</span>
              </div>
            )}
          </div>
        </div>
        </div>

      {/* 3. Full-Screen Quran Page Layout */}
      <main
        className="flex-1 w-full flex flex-col justify-between overflow-y-auto overflow-x-hidden touch-pan-y cursor-pointer px-4 sm:px-8 pt-4 pb-24 max-w-xl mx-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={() => {
          if (isSwipeActive.current) return;
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
                      <p
                        className={`text-2xl sm:text-3xl font-quran font-bold tracking-wide ${
                          isDarkMode ? 'text-white' : 'text-[#091B15]'
                        }`}
                      >
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
                      const isPressing =
                        pressingAyah?.surahNumber === ayah.surahNumber &&
                        pressingAyah?.ayahNumber === ayah.ayahNumber;

                      return (
                        <span
                          key={`${ayah.surahNumber}-${ayah.ayahNumber}`}
                          id={`ayah-${ayah.surahNumber}-${ayah.ayahNumber}`}
                          data-testid={`ayah-${ayah.surahNumber}-${ayah.ayahNumber}`}
                          onPointerDown={(e) => handleAyahPointerDown(e, ayah.surahNumber, ayah.ayahNumber)}
                          onPointerMove={handleAyahPointerMove}
                          onPointerUp={handleAyahPointerUp}
                          onPointerCancel={handleAyahPointerCancel}
                          onPointerLeave={handleAyahPointerLeave}
                          onTouchMove={handleAyahTouchMove}
                          onTouchCancel={handleAyahPointerCancel}
                          onContextMenu={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isLongPressActive.current) {
                              if (clickSuppressTimerRef.current) clearTimeout(clickSuppressTimerRef.current);
                              clickSuppressTimerRef.current = setTimeout(() => {
                                isLongPressActive.current = false;
                              }, 200);
                              return;
                            }
                            if (isSwipeActive.current) return;
                            // Short click toggles full-screen reading mode
                            setShowControls((prev) => !prev);
                          }}
                          style={{
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            WebkitTouchCallout: 'none',
                          }}
                          className={`inline rounded-md px-1 py-0.5 cursor-pointer select-none transition-all duration-200 relative ${
                            isPressing
                              ? isDarkMode
                                ? 'bg-[#C5A059]/35 ring-2 ring-[#C5A059] shadow-[0_0_12px_rgba(197,160,89,0.5)] scale-[1.01]'
                                : 'bg-[#F9E2AF] ring-2 ring-[#C5A059] shadow-[0_0_12px_rgba(197,160,89,0.4)] scale-[1.01]'
                              : isCurrent
                              ? isDarkMode
                                ? 'bg-[#C5A059]/25 text-white font-bold'
                                : 'bg-[#FDF3D6] text-[#091B15] font-bold shadow-xs'
                              : isDarkMode
                              ? 'text-white hover:bg-white/5'
                              : 'text-[#091B15] hover:bg-black/5'
                          }`}
                        >
                          <span>{ayah.textUthmani}</span>
                          <AyahStarMedallion
                            number={ayah.ayahNumber}
                            isCurrent={isCurrent || isPressing}
                            isDarkMode={isDarkMode}
                          />{' '}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* End of Juz Call-to-action on the Last Page */}
            {isLastPage && !isCompleted && (
              <div
                className={`my-6 p-4 sm:p-5 rounded-2xl border text-center select-none shadow-md transition-all max-w-md mx-auto animate-fade-in ${
                  isDarkMode
                    ? 'border-[#C5A059]/40 bg-[#0A1E16] text-white'
                    : 'border-[#C5A059]/60 bg-[#FDF9EE] text-[#091B15]'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-1.5 text-[#C5A059]">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-quran text-base sm:text-lg font-bold">
                    ختام الجزء الشريف • تقبل الله طاعتكم
                  </span>
                  <Sparkles className="h-4 w-4" />
                </div>
                <p className={`text-xs mb-3.5 ${isDarkMode ? 'text-[#A6B8B0]' : 'text-[#5C6E65]'}`}>
                  لقد بلغت نهاية هذا الجزء المبارك بحمد الله وتوفيقه
                </p>
                <button
                  type="button"
                  data-testid="page-complete-juz-btn"
                  onClick={handleCompleteClick}
                  disabled={isSubmittingComplete}
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold shadow-lg transition-transform active:scale-95 ${
                    isDarkMode
                      ? 'bg-[#C5A059] text-[#07140E] hover:bg-[#D4A13E]'
                      : 'bg-[#091B15] text-white hover:bg-[#143D30]'
                  }`}
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>{isSubmittingComplete ? 'جاري تسجيل الإتمام...' : 'أتممت قراءة هذا الجزء'}</span>
                </button>
              </div>
            )}

            {/* Bottom Minimal Page Capsule Medallion */}
            <div className="pt-3 pb-1 flex items-center justify-center select-none">
              <div
                className={`inline-flex items-center justify-center rounded-full border px-4 py-0.5 text-xs font-bold font-sans tabular-nums shadow-xs ${
                  isDarkMode
                    ? 'border-[#C5A059]/50 bg-[#07140E] text-[#C5A059]'
                    : 'border-[#C5A059] bg-[#FFFFFF] text-[#091B15]'
                }`}
              >
                <span>{toArabicDigits(activePage?.pageNumber || 1)}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 4. Floating Bottom Controls: Audio Bar + Page Slider */}
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

        {/* Bottom Page Navigation Slider Bar (Message icon removed, dedicated solely to page navigation) */}
        <div className="w-full max-w-md pointer-events-auto">
          <div
            className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-2 shadow-2xl backdrop-blur-md ${
              isDarkMode
                ? 'border-[#C5A059]/35 bg-[#07140E]/98 text-white'
                : 'border-[#E6DEC8] bg-[#FFFFFF]/98 text-[#091B15]'
            }`}
          >
            {/* Current Page Pill Badge */}
            <div
              className={`rounded-md px-3 py-0.5 text-xs font-bold tabular-nums shrink-0 shadow-xs ${
                isDarkMode
                  ? 'bg-[#C5A059] text-[#07140E]'
                  : 'bg-[#091B15] text-white'
              }`}
            >
              {toArabicDigits(activePage?.pageNumber || 1)}
            </div>

            {/* Center: Full Range Slider */}
            <div className="flex-1 flex items-center px-1">
              <input
                type="range"
                min={0}
                max={Math.max(0, totalPagesInJuz - 1)}
                value={currentPageIdx}
                onChange={(e) => goToPage(Number(e.target.value))}
                aria-label="سلايدر التنقل بين صفحات المصحف"
                className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#14372e] accent-[#C5A059]'
                    : 'bg-[#E6DEC8] accent-[#091B15]'
                }`}
              />
            </div>

            {/* Jump to Final Page */}
            <button
              type="button"
              onClick={() => goToPage(totalPagesInJuz - 1)}
              className={`flex items-center gap-1 text-xs font-bold shrink-0 tabular-nums transition-colors ${
                isDarkMode
                  ? 'text-[#C5A059] hover:text-[#E8D39E]'
                  : 'text-[#091B15] hover:text-[#C5A059]'
              }`}
              title="الانتقال لآخر صفحة"
            >
              <CornerUpLeft className="h-3.5 w-3.5" />
              <span>{toArabicDigits(mushafPages[mushafPages.length - 1]?.pageNumber || 604)}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
