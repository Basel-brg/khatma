'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { KhatmaDocument } from '../types/khatma';
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
import { ShamsaRosette, CornerCrosshairs, toArabicDigits } from './IslamicOrnaments';
import { useKhatmaTheme } from '../lib/theme';
import {
  Share2,
  Calendar,
  Heart,
  BookOpen,
  Sparkles,
  ArrowRight,
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

  useEffect(() => {
    if (!initialUid) {
      getDeviceUid().then((id) => setUid(id));
    }
  }, [initialUid]);

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

  const myReservedJuzs = useMemo(() => {
    if (!khatma || !uid) return [];
    return Object.values(khatma.juzs).filter(
      (j) => j.status === 'reserved' && j.holderUid === uid
    );
  }, [khatma, uid]);

  const completedCount = khatma?.completedCount || 0;
  const reservedCount = khatma?.reservedCount || 0;
  const availableCount = Math.max(0, 30 - completedCount - reservedCount);

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
      <div
        className="flex min-h-screen flex-col items-center justify-center bg-[#F5F1E8] dark:bg-[#07120E] p-6 text-center"
        dir="rtl"
      >
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#C5A059] border-t-transparent" />
        <p className="mt-4 text-sm text-[#091B15] dark:text-[#E8D39E] font-medium">
          جاري فتح سجل الختمة الشريفة...
        </p>
      </div>
    );
  }

  if (!khatma) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] dark:bg-[#07120E] p-8 flex items-center justify-center" dir="rtl">
        <div className="relative max-w-md w-full border border-[#C5A059] bg-[#F8F5EC] dark:bg-[#0B1914] p-8 text-center">
          <CornerCrosshairs />
          <h2 className="text-xl font-bold font-quran text-[#091B15] dark:text-[#E8D39E]">
            لم يتم العثور على الختمة
          </h2>
          <p className="mt-2 text-sm text-[#4A5D54] dark:text-[#A6B8B0]">
            تأكد من صحة الرابط أو قم بإنشاء ختمة جديدة.
          </p>
          <a
            href="/"
            className="mt-6 inline-flex items-center gap-2 border border-[#C5A059] bg-[#091B15] px-6 py-2.5 text-sm font-bold text-[#C5A059] hover:bg-[#112A21] transition-colors"
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
    <div className="min-h-screen bg-[#F5F1E8] dark:bg-[#07120E] pb-16 transition-colors" dir="rtl">
      {/* Full-Width Architectural Obsidian-Emerald Header Banner (Option 1 Mockup) */}
      <header className="w-full bg-[#081A14] border-b-2 border-[#C5A059]/70 text-[#F4EFE6] shadow-md">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-4 pb-6">
          {/* Top Utility Bar: Brand Wordmark & Actions */}
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#C5A059]/20">
            <div className="flex items-center gap-3">
              <a
                href="/"
                className="inline-flex items-center gap-1.5 border border-[#C5A059]/40 bg-[#0D261D] hover:bg-[#133328] px-3 py-1.5 text-xs font-semibold text-[#E8D39E] transition-colors"
              >
                <ArrowRight className="h-3.5 w-3.5 text-[#C5A059]" />
                <span>العودة للرئيسية</span>
              </a>
              <span className="font-quran text-xl sm:text-2xl font-bold text-white tracking-wide">
                ختمة
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-1.5 border border-[#C5A059]/40 bg-[#0D261D] hover:bg-[#133328] px-3 py-1.5 text-xs font-semibold text-[#E8D39E] transition-colors"
                aria-label={isDark ? 'تفعيل المظهر الفاتح' : 'تفعيل المظهر الداكن'}
              >
                {isDark ? (
                  <>
                    <Sun className="h-3.5 w-3.5 text-[#FDE68A]" />
                    <span className="hidden sm:inline">المظهر الفاتح</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-3.5 w-3.5 text-[#C5A059]" />
                    <span className="hidden sm:inline">المظهر الداكن</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 border border-[#C5A059] bg-[#C5A059] hover:bg-[#D4B06A] px-3.5 py-1.5 text-xs font-bold text-[#081A14] transition-colors"
                aria-label="مشاركة رابط الختمة"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>تم نسخ الرابط!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="h-3.5 w-3.5" />
                    <span>مشاركة الختمة</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Centerpiece: Calligraphic Title on Right + 8-Pointed Gold Shamsa Rosette on Left */}
          <div className="mt-5 flex items-center justify-between gap-4 sm:gap-8">
            <div className="space-y-2.5 flex-1">
              <h1 className="text-3xl sm:text-5xl font-bold font-quran text-[#C8A45D] leading-[1.3] tracking-wide">
                {khatma.title}
              </h1>

              {khatma.intention && (
                <p className="flex items-center gap-2 text-xs sm:text-sm text-[#E6DEC8]/90 font-medium">
                  <Heart className="h-3.5 w-3.5 text-[#C5A059] shrink-0" />
                  <span>{khatma.intention}</span>
                </p>
              )}

              {khatma.targetDate && (
                <p className="flex items-center gap-2 text-xs text-[#A6B8B0]">
                  <Calendar className="h-3.5 w-3.5 text-[#C5A059] shrink-0" />
                  <span>موعد الختم: {khatma.targetDate}</span>
                </p>
              )}
            </div>

            {/* 8-Pointed Gold Islamic Rosette (Shamsa) */}
            <div className="shrink-0">
              <ShamsaRosette className="w-20 h-20 sm:w-28 sm:h-28 text-[#C5A059]" />
            </div>
          </div>

          {/* 30-Segment Brass Progress Bar (Matching Option 1 Mockup) */}
          <div className="mt-6 pt-4 border-t border-[#C5A059]/25">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Right Label */}
              <div className="flex items-center justify-between sm:justify-start gap-4 text-xs sm:text-sm">
                <span className="font-quran text-base sm:text-lg font-bold text-[#C8A45D]">
                  مكتمل {toArabicDigits(completedCount)} من ٣٠ جزءاً
                </span>
                <span className="text-xs text-[#A6B8B0]">
                  (محجوز: {toArabicDigits(reservedCount)} • متاح: {toArabicDigits(availableCount)})
                </span>
              </div>

              {/* 30 Individual Brass Segments */}
              <div
                className="grid grid-cols-15 sm:grid-cols-30 gap-1 w-full sm:w-auto sm:flex-1 max-w-xl"
                aria-label="شريط تقدم الأجزاء الثلاثين"
              >
                {Array.from({ length: 30 }, (_, idx) => {
                  const juzNum = idx + 1;
                  const j = khatma.juzs[String(juzNum)];
                  const isDone = j?.status === 'completed';
                  const isRes = j?.status === 'reserved';
                  return (
                    <div
                      key={juzNum}
                      title={`الجزء ${juzNum}: ${
                        isDone ? 'مكتمل' : isRes ? 'محجوز' : 'متاح'
                      }`}
                      className={`h-4 sm:h-4.5 rounded-[2px] flex items-center justify-center text-[9px] font-bold transition-colors ${
                        isDone
                          ? 'bg-[#C5A059] text-[#081A14] shadow-2xs'
                          : isRes
                          ? 'bg-[#C5A059]/45 border border-[#C5A059] text-[#FDE68A]'
                          : 'bg-[#2C3729] text-transparent'
                      }`}
                    >
                      {isDone ? '✓' : isRes ? '•' : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-4xl px-3 sm:px-6 pt-6 space-y-6">
        {/* Celebration & Dua Khatm Al-Quran Banner (When all 30 completed) */}
        {completedCount === 30 && (
          <div className="relative border-2 border-[#C5A059] bg-[#081A14] p-6 sm:p-8 text-center shadow-xl space-y-4 text-[#F4EFE6]">
            <CornerCrosshairs />
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#C5A059] bg-[#C5A059]/15 text-[#C5A059]">
              <Sparkles className="h-8 w-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-quran text-[#C8A45D]">
              مُبَارَكٌ إِتْمَامُ الْخَتْمَةِ الشَّرِيفَةِ
            </h2>
            <p className="text-sm text-[#E6DEC8] max-w-xl mx-auto">
              هنيئاً لكم هذا الفضل العظيم، تقبل الله من الجميع ورزقكم شفاعة القرآن يوم القيامة.
            </p>

            {/* Dua Khatm Al-Quran */}
            <div className="mt-4 border border-[#C5A059]/40 bg-[#0D241C] p-5 text-right space-y-3 font-quran text-base sm:text-lg leading-relaxed text-[#F4EFE6]">
              <h3 className="font-bold text-center text-[#C8A45D] pb-2 border-b border-[#C5A059]/30">
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

        {/* My Reserved Juzs Architectural Ticket Strip */}
        {myReservedJuzs.length > 0 && (
          <div className="relative border border-[#C5A059] bg-[#FBF6E8] dark:bg-[#0D211A] p-4 shadow-xs">
            <CornerCrosshairs />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <BookOpen className="h-5 w-5 text-[#9A6F1E] dark:text-[#C5A059] shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-[#091B15] dark:text-[#F4EFE6]">
                    أجزاؤك المحجوزة حالياً — اضغط لمتابعة القراءة
                  </h3>
                  <p className="text-xs text-[#4A5D54] dark:text-[#A6B8B0]">
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
                    className="flex items-center gap-1.5 border border-[#C5A059] bg-[#091B15] hover:bg-[#123126] text-[#E8D39E] font-bold px-3.5 py-1.5 text-xs transition-colors"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-[#C5A059]" />
                    <span>الجزء {rj.number}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 30 Juz Architectural Rab'ah Matrix */}
        <section aria-label="أجزاء الربعة الشريفة الثلاثون" className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-bold text-[#091B15] dark:text-[#E8D39E] font-quran">
              خانات الأجزاء الثلاثين (الربعة الشريفة)
            </h2>
            <span className="text-xs text-[#4A5D54] dark:text-[#A6B8B0]">
              اضغط على أي خانة للحجز أو فتح المصحف
            </span>
          </div>

          <JuzCardGrid
            juzs={khatma.juzs}
            currentUid={uid}
            onSelectReserve={handleOpenReserve}
            onSelectRead={handleOpenRead}
          />
        </section>
      </main>

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
