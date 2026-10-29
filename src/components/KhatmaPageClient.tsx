'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { KhatmaDocument, JuzReservation } from '../types/khatma';
import {
  subscribeToKhatma,
  getDeviceUid,
  completeJuz,
  unreserveJuz,
  recordVisitedKhatma,
} from '../lib/khatma-service';
import JuzCardGrid from './JuzCardGrid';
import ReserveJuzSheet from './ReserveJuzSheet';
import QuranReaderModal from './QuranReaderModal';
import { useKhatmaTheme } from '../lib/theme';
import {
  Share2,
  Calendar,
  Heart,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  Copy,
  Check,
  Sun,
  Moon,
} from 'lucide-react';

export interface KhatmaPageClientProps {
  khatmaId: string;
  initialUid?: string;
}

export default function KhatmaPageClient({
  khatmaId,
  initialUid,
}: KhatmaPageClientProps) {
  const [khatma, setKhatma] = useState<KhatmaDocument | null>(null);
  const [uid, setUid] = useState<string>(initialUid || '');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [reservingJuzNumber, setReservingJuzNumber] = useState<number | null>(null);
  const [readingJuzNumber, setReadingJuzNumber] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const { isDark, toggleTheme } = useKhatmaTheme();

  // Initialize UID
  useEffect(() => {
    if (!initialUid) {
      getDeviceUid().then((id) => setUid(id));
    }
  }, [initialUid]);

  // Subscribe to Khatma doc updates
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToKhatma(khatmaId, (doc) => {
      setKhatma(doc);
      if (doc) {
        recordVisitedKhatma(doc);
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [khatmaId]);

  // Handle share link
  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({
          title: khatma?.title || 'ختمة قرآن كريم',
          text: `انضم معنا في ${khatma?.title || 'ختمة القرآن'} - ${khatma?.intention || ''}`,
          url,
        });
        return;
      } catch {}
    }

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } catch {}
    }
  };

  // List of Juzs reserved by current user
  const myReservedJuzs = useMemo(() => {
    if (!khatma || !uid) return [];
    return Object.values(khatma.juzs).filter(
      (j) => j.status === 'reserved' && j.holderUid === uid
    );
  }, [khatma, uid]);

  // Counts and progress percentages
  const completedCount = khatma?.completedCount || 0;
  const reservedCount = khatma?.reservedCount || 0;
  const availableCount = Math.max(0, 30 - completedCount - reservedCount);
  const completedPercent = Math.round((completedCount / 30) * 100);
  const reservedPercent = Math.round((reservedCount / 30) * 100);

  const handleOpenReserve = (juzNumber: number) => {
    setReservingJuzNumber(juzNumber);
  };

  const handleOpenRead = (juzNumber: number) => {
    setReadingJuzNumber(juzNumber);
  };

  const handleReserveSuccess = (juzNumber: number) => {
    setReservingJuzNumber(null);
    setReadingJuzNumber(juzNumber);
  };

  const handleCompleteCurrentJuz = async () => {
    if (!readingJuzNumber || !uid) return;
    await completeJuz({
      khatmaId,
      juzNumber: readingJuzNumber,
      uid,
    });
  };

  const handleUnreserveCurrentJuz = async () => {
    if (!readingJuzNumber || !uid) return;
    await unreserveJuz({
      khatmaId,
      juzNumber: readingJuzNumber,
      uid,
    });
  };

  if (isLoading && !khatma) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="mt-4 text-sm text-stone-500 font-medium">جاري تحميل تفاصيل الختمة...</p>
      </div>
    );
  }

  if (!khatma) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center" dir="rtl">
        <div className="rounded-3xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 p-8 shadow-sm">
          <h2 className="text-xl font-bold text-rose-800 dark:text-rose-300">لم يتم العثور على الختمة</h2>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            تأكد من صحة الرابط أو قم بإنشاء ختمة جديدة.
          </p>
          <a
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-emerald-500 transition-all"
          >
            <span>العودة للرئيسية</span>
            <ArrowRight className="h-4 w-4 rotate-180" />
          </a>
        </div>
      </div>
    );
  }

  const currentReadingJuz = readingJuzNumber ? khatma.juzs[String(readingJuzNumber)] : null;
  const isReadingReservedByMe =
    !!currentReadingJuz &&
    currentReadingJuz.status === 'reserved' &&
    currentReadingJuz.holderUid === uid;
  const isReadingCompleted = currentReadingJuz?.status === 'completed';

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6" dir="rtl">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between gap-2">
        <a
          href="/"
          className="button-tactile inline-flex items-center gap-1.5 rounded-xl border border-[#E6DEC8] dark:border-[#1E3A31] bg-white dark:bg-[#0D1F1A] px-3.5 py-2 text-xs font-semibold text-[#0F2922] dark:text-[#F4EFE6] shadow-xs"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          <span>العودة للرئيسية</span>
        </a>
        <div className="flex items-center gap-2.5">
          <span className="hidden sm:inline text-xs font-medium text-[#4A5D54] dark:text-[#A6B8B0]">
            ختمة جماعية تشاركية
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6DEC8] dark:border-[#B48327]/40 bg-white dark:bg-[#0D1F1A] px-3 py-2 text-xs font-semibold text-[#0F2922] dark:text-[#E8D39E] shadow-xs hover:border-[#B48327] transition-colors"
            aria-label={isDark ? 'تفعيل المظهر الفاتح' : 'تفعيل المظهر الداكن'}
          >
            {isDark ? (
              <>
                <Sun className="h-3.5 w-3.5 text-[#FDE68A]" />
                <span>المظهر الفاتح</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-[#B48327]" />
                <span>المظهر الداكن</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-3xl border border-[#0F2922] bg-[#0F2922] text-white p-5 sm:p-8 shadow-lg">
        {/* Subtle decorative circles */}
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-2xl" />
        <div className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-teal-400/10 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3.5 py-1 text-xs font-medium text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>ختمة مباركة</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight font-serif text-white">
              {khatma.title}
            </h1>

            {khatma.intention && (
              <p className="flex items-center gap-2 text-sm sm:text-base text-emerald-100/90 font-medium">
                <Heart className="h-4 w-4 text-rose-400 fill-rose-400/20 shrink-0" />
                <span className="text-emerald-300/80">النية:</span>
                <span>{khatma.intention}</span>
              </p>
            )}

            {khatma.targetDate && (
              <p className="flex items-center gap-2 text-xs sm:text-sm text-stone-300">
                <Calendar className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>موعد الختم: {khatma.targetDate}</span>
              </p>
            )}
          </div>

          {/* Share Action */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-3">
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-md active:scale-95 transition-all shadow-sm"
              aria-label="مشاركة رابط الختمة"
            >
              {copiedLink ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>تم نسخ الرابط!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 text-emerald-300" />
                  <span>مشاركة الختمة</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="relative z-10 mt-8 rounded-2xl bg-black/20 p-4 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs sm:text-sm font-medium mb-2.5">
            <span className="text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span>مكتمل: {completedCount} من ٣٠</span>
            </span>
            <span className="text-amber-300 flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>محجوز: {reservedCount}</span>
            </span>
            <span className="text-stone-300">
              المتبقي: {availableCount}
            </span>
          </div>

          {/* Dual Segment Progress Bar */}
          <div className="h-3 w-full overflow-hidden rounded-full bg-stone-800/80 p-0.5">
            <div className="flex h-full w-full rounded-full overflow-hidden">
              <div
                style={{ width: `${completedPercent}%` }}
                className="bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              />
              <div
                style={{ width: `${reservedPercent}%` }}
                className="bg-amber-400/80 transition-all duration-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Celebration & Dua Khatm Al-Quran Banner (When all 30 completed) */}
      {completedCount === 30 && (
        <div className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-stone-900 to-teal-950/40 p-6 sm:p-8 text-center shadow-xl space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <Sparkles className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold font-serif text-emerald-400">
            مُبَارَكٌ إِتْمَامُ الْخَتْمَةِ الشَّرِيفَةِ
          </h2>
          <p className="text-sm text-stone-300 max-w-xl mx-auto">
            هنيئاً لكم هذا الفضل العظيم، تقبل الله من الجميع ورزقكم شفاعة القرآن يوم القيامة.
          </p>

          {/* Dua Khatm Al-Quran */}
          <div className="mt-4 rounded-2xl bg-stone-950/60 border border-emerald-900/30 p-5 text-right space-y-3 font-serif text-sm sm:text-base leading-relaxed text-stone-200">
            <h3 className="font-bold text-center text-emerald-300 pb-2 border-b border-stone-800">
              دعاء ختم القرآن الكريم
            </h3>
            <p>
              «اللَّهُمَّ ارْحَمْنَا بِالقُرْآنِ وَاجْعَلْهُ لَنَا إِمَاماً وَنُوراً وَهُدًى وَرَحْمَةً، اللَّهُمَّ ذَكِّرْنَا مِنْهُ مَا نَسِينَا وَعَلِّمْنَا مِنْهُ مَا جَهِلْنَا وَارْزُقْنَا تِلاَوَتَهُ آنَاءَ اللَّيْلِ وَأَطْرَافَ النَّهَارِ وَاجْعَلْهُ لَنَا حُجَّةً يَا رَبَّ العَالَمِينَ».
            </p>
            <p>
              «اللَّهُمَّ أَصْلِحْ لَنَا دِينَنَا الَّذِي هُوَ عِصْمَةُ أَمْرِنَا، وَأَصْلِحْ لَنَا دُنْيَانَا الَّتِي فِيهَا مَعَاشُنَا، وَأَصْلِحْ لَنَا آخِرَتَنَا الَّتِي فِيهَا مَعَادُنَا، وَاجْعَلِ الحَيَاةَ زِيَادَةً لَنَا فِي كُلِّ خَيْرٍ، وَاجْعَلِ المَوْتَ رَاحَةً لَنَا مِنْ كُلِّ شَرٍّ».
            </p>
          </div>
        </div>
      )}

      {/* My Reserved Juzs Quick-Access Banner */}
      {myReservedJuzs.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/20 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                  أجزاؤك المحجوزة حالياً — اضغط لمتابعة القراءة
                </h3>
                <p className="text-xs text-amber-800/80 dark:text-amber-400/80">
                  لديك {myReservedJuzs.length} {myReservedJuzs.length === 1 ? 'جزء محجوز' : 'أجزاء محجوزة'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {myReservedJuzs.map((rj) => (
                <button
                  key={rj.number}
                  type="button"
                  onClick={() => handleOpenRead(rj.number)}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold px-3 py-1.5 text-xs shadow-sm active:scale-95 transition-all"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>الجزء {rj.number}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 30 Juz Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0F2922] dark:text-[#F4EFE6] flex items-center gap-2 font-quran">
            <BookOpen className="h-5 w-5 text-[#B48327] dark:text-[#D4A13E]" />
            <span>أجزاء القرآن الكريم (٣٠ جزءاً)</span>
          </h2>
          <span className="text-xs text-[#4A5D54] dark:text-[#A6B8B0]">
            اضغط على أي جزء للحجز أو القراءة
          </span>
        </div>

        <JuzCardGrid
          juzs={khatma.juzs}
          currentUid={uid}
          onSelectReserve={handleOpenReserve}
          onSelectRead={handleOpenRead}
        />
      </div>

      {/* Reservation Bottom Sheet */}
      {reservingJuzNumber !== null && (
        <ReserveJuzSheet
          khatmaId={khatmaId}
          juzNumber={reservingJuzNumber}
          uid={uid}
          onClose={() => setReservingJuzNumber(null)}
          onSuccess={handleReserveSuccess}
        />
      )}

      {/* Quran Reader Modal */}
      {readingJuzNumber !== null && (
        <QuranReaderModal
          juzNumber={readingJuzNumber}
          khatmaId={khatmaId}
          uid={uid}
          isReservedByMe={isReadingReservedByMe}
          isCompleted={isReadingCompleted}
          onClose={() => setReadingJuzNumber(null)}
          onComplete={handleCompleteCurrentJuz}
          onUnreserve={handleUnreserveCurrentJuz}
        />
      )}
    </div>
  );
}
