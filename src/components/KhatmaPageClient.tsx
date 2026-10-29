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
import { isValidKhatmaId } from '../lib/validation';
import JuzCardGrid from './JuzCardGrid';
import ReserveJuzSheet from './ReserveJuzSheet';
import QuranReaderModal from './QuranReaderModal';
import ShareModal from './ShareModal';
import { ShamsaRosette, CornerCrosshairs, toArabicDigits } from './IslamicOrnaments';
import { useKhatmaTheme } from '../lib/theme';
import { getKhatmaShareUrl, copyTextToClipboard } from '../lib/share';
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
  Lock,
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
  const [accessAlert, setAccessAlert] = useState<string | null>(null);
  const { isDark, toggleTheme } = useKhatmaTheme();

  const [actualId, setActualId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const searchParam = new URLSearchParams(window.location.search).get('id');
      if (searchParam && isValidKhatmaId(searchParam)) {
        return searchParam;
      }
      const parts = window.location.pathname.split('/').filter(Boolean);
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart !== 'khatma' && lastPart !== 'view' && isValidKhatmaId(lastPart)) {
        return lastPart;
      }
    }
    return khatmaId;
  });
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const lastPart = parts[parts.length - 1];
      const searchParam = new URLSearchParams(window.location.search).get('id');
      const candidate = searchParam || (lastPart && lastPart !== 'khatma' && lastPart !== 'view' ? lastPart : khatmaId);
      if (candidate && isValidKhatmaId(candidate) && candidate !== actualId) {
        setActualId(candidate);
      }
    }
  }, [khatmaId, actualId]);

  const effectiveKhatmaId = actualId && actualId !== 'view' ? actualId : khatmaId;

  useEffect(() => {
    if (!initialUid) {
      getDeviceUid().then((id) => setUid(id));
    }
  }, [initialUid]);

  useEffect(() => {
    if (!effectiveKhatmaId || effectiveKhatmaId === 'view') {
      return;
    }
    setIsLoading(true);
    const unsubscribe = subscribeToKhatma(effectiveKhatmaId, (doc) => {
      setKhatma(doc);
      if (doc) {
        recordVisitedKhatma(doc);
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [effectiveKhatmaId]);

  const handleShare = async () => {
    const cleanUrl = getKhatmaShareUrl(effectiveKhatmaId);
    if (cleanUrl) {
      await copyTextToClipboard(cleanUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
    setIsShareModalOpen(true);
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
    if (!khatma) return;
    const targetJuz = khatma.juzs[String(juzNumber)];
    if (!targetJuz) return;

    if (targetJuz.status === 'available') {
      setReservingJuzNumber(juzNumber);
      return;
    }

    const isMine = Boolean(uid && targetJuz.holderUid === uid);
    if (!isMine) {
      const displayHolder = targetJuz.hideName ? 'فاعل خير' : targetJuz.holderName || 'قارئ آخر';
      const msg =
        targetJuz.status === 'completed'
          ? `هذا الجزء مكتمل بواسطة ${displayHolder} ولا يمكن فتحه`
          : `هذا الجزء محجوز لـ ${displayHolder} ولا يمكن فتحه من قبل شخص آخر`;
      setAccessAlert(msg);
      setTimeout(() => setAccessAlert(null), 3500);
      return;
    }

    setReadingJuzNumber(juzNumber);
  };

  const handleBlockedAccess = (message: string) => {
    setAccessAlert(message);
    setTimeout(() => setAccessAlert(null), 3500);
  };

  const handleReserveSuccess = async (juzNumber: number) => {
    if (!uid) {
      try {
        const devUid = await getDeviceUid();
        setUid(devUid);
      } catch {}
    }
    setReservingJuzNumber(null);
    setReadingJuzNumber(juzNumber);
  };

  const handleCompleteCurrentJuz = async () => {
    if (!readingJuzNumber || !uid) return;
    await completeJuz({
      khatmaId: effectiveKhatmaId,
      juzNumber: readingJuzNumber,
      uid,
    });
  };

  const handleUnreserveCurrentJuz = async () => {
    if (!readingJuzNumber || !uid) return;
    await unreserveJuz({
      khatmaId: effectiveKhatmaId,
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
    Boolean(uid && currentReadingJuz.holderUid === uid);
  const isReadingCompletedByMe =
    !!currentReadingJuz &&
    currentReadingJuz.status === 'completed' &&
    Boolean(uid && currentReadingJuz.holderUid === uid);
  const isReadingCompleted = currentReadingJuz?.status === 'completed';
  const isReadingReservedByOther =
    !!currentReadingJuz &&
    currentReadingJuz.status === 'reserved' &&
    !isReadingReservedByMe;
  const isReadingCompletedByOther =
    !!currentReadingJuz &&
    currentReadingJuz.status === 'completed' &&
    !isReadingCompletedByMe;
  const isReadingAccessDenied = isReadingReservedByOther || isReadingCompletedByOther;
  const readingHolderDisplayName = currentReadingJuz
    ? (currentReadingJuz.hideName ? 'فاعل خير' : currentReadingJuz.holderName || 'فاعل خير')
    : null;

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

        {/* Prominent Share Invitation Bar */}
        {availableCount > 0 && (
          <div className="relative border border-[#C5A059] bg-[#FBF6E8] dark:bg-[#0D211A] p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CornerCrosshairs />
            <div className="flex items-center gap-2.5">
              <Share2 className="h-5 w-5 text-[#9A6F1E] dark:text-[#C5A059] shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-[#091B15] dark:text-[#F4EFE6]">
                  شارك الختمة مع الأهل والأصدقاء
                </h3>
                <p className="text-xs text-[#4A5D54] dark:text-[#A6B8B0]">
                  متبقي {toArabicDigits(availableCount)} جزءاً متاحاً للحجز والتلاوة
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center justify-center gap-2 border border-[#C5A059] bg-[#091B15] hover:bg-[#123126] text-[#E8D39E] font-bold px-4 py-2 text-xs transition-colors cursor-pointer shrink-0 shadow-xs active:scale-95"
            >
              <Share2 className="h-3.5 w-3.5 text-[#C5A059]" />
              <span>مشاركة الرابط الآن</span>
            </button>
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
            onBlockedAccess={handleBlockedAccess}
          />
        </section>
      </main>

      {/* Floating Access Denied Alert Toast */}
      {accessAlert && (
        <div
          role="alert"
          data-testid="khatma-access-alert"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 rounded-full border border-amber-500/80 bg-[#161208] text-amber-200 px-5 py-2.5 text-xs sm:text-sm font-bold shadow-2xl flex items-center gap-2 animate-fade-in"
        >
          <Lock className="h-4 w-4 text-amber-400 shrink-0" />
          <span>{accessAlert}</span>
        </div>
      )}

      {/* Reservation Bottom Sheet */}
      {reservingJuzNumber !== null && (
        <ReserveJuzSheet
          khatmaId={effectiveKhatmaId}
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
          khatmaId={effectiveKhatmaId}
          uid={uid}
          isReservedByMe={isReadingReservedByMe}
          isCompleted={isReadingCompleted}
          isCompletedByMe={isReadingCompletedByMe}
          isAccessDenied={isReadingAccessDenied}
          holderName={readingHolderDisplayName}
          onClose={() => setReadingJuzNumber(null)}
          onComplete={handleCompleteCurrentJuz}
          onUnreserve={handleUnreserveCurrentJuz}
        />
      )}

      {/* Share Khatma Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        khatmaId={effectiveKhatmaId}
        title={khatma.title}
        intention={khatma.intention}
      />
    </div>
  );
}
