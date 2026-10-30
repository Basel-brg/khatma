'use client';

import React, { useState, useEffect, useRef } from 'react';
import { JUZ_METADATA } from '../lib/quran-meta';
import {
  reserveJuz,
  getSavedReaderProfile,
  saveReaderProfile,
  getDeviceUid,
} from '../lib/khatma-service';
import { SECURITY_LIMITS, validateReaderName } from '../lib/validation';
import { CornerCrosshairs, toArabicDigits } from './IslamicOrnaments';
import { X, BookOpen } from 'lucide-react';

export interface ReserveJuzSheetProps {
  khatmaId: string;
  juzNumber: number;
  uid: string;
  onClose: () => void;
  onSuccess: (juzNumber: number) => void;
}

export default function ReserveJuzSheet({
  khatmaId,
  juzNumber,
  uid,
  onClose,
  onSuccess,
}: ReserveJuzSheetProps) {
  const [name, setName] = useState<string>('');
  const [hideName, setHideName] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [dragY, setDragY] = useState<number>(0);
  const touchStartY = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);

  const meta = JUZ_METADATA.find((m) => m.number === juzNumber) || JUZ_METADATA[0];

  useEffect(() => {
    try {
      const saved = getSavedReaderProfile();
      if (saved?.name) {
        setName(saved.name);
      }
      if (typeof saved?.hideName === 'boolean') {
        setHideName(saved.hideName);
      }
    } catch {}
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || touchStartY.current === null) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      setDragY(delta);
    }
  };

  const handleTouchEnd = () => {
    if (dragY > 90) {
      onClose();
    } else {
      setDragY(0);
    }
    isDragging.current = false;
    touchStartY.current = null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let cleanName: string;
    try {
      cleanName = validateReaderName(name);
    } catch (validationErr: any) {
      setErrorMsg(validationErr?.message || 'يرجى كتابة الاسم للمتابعة');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      saveReaderProfile(cleanName, hideName);

      let effectiveUid = uid;
      if (!effectiveUid || typeof effectiveUid !== 'string' || !effectiveUid.trim()) {
        effectiveUid = await getDeviceUid();
      }

      await reserveJuz({
        khatmaId,
        juzNumber,
        readerName: cleanName,
        hideName,
        uid: effectiveUid,
      });

      onSuccess(juzNumber);
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء حجز الجزء. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#081A14]/70 backdrop-blur-sm transition-opacity touch-manipulation"
      dir="rtl"
    >
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Architectural Rab'ah Reservation Sheet */}
      <div
        className="relative z-10 w-full max-w-lg rounded-t-[24px] border border-[#C5A059] bg-[#F8F5EC] dark:bg-[#0B1914] p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <CornerCrosshairs />

        {/* Drag handle */}
        <div className="flex justify-center pb-3">
          <div className="h-1.5 w-12 rounded-full bg-[#C5A059]/50" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#C5A059]/45">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center border border-[#C5A059] bg-[#081A14] text-[#C8A45D] font-quran text-2xl font-bold">
              {toArabicDigits(meta.number)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#091B15] dark:text-[#C8A45D] font-quran">
                حجز {meta.nameAr}
              </h3>
              <p className="text-xs text-[#4A5D54] dark:text-[#A6B8B0]">
                من سورة {meta.startSurahName} ({toArabicDigits(meta.startAyah)}) إلى سورة {meta.endSurahName} ({toArabicDigits(meta.endAyah)})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-[#C5A059]/50 p-2 text-[#091B15] dark:text-[#E8D39E] hover:bg-[#EFE8D6] dark:hover:bg-white/10"
            aria-label="إغلاق نافذة الحجز"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Surahs in this Juz */}
        <div className="mt-3.5 rounded-xl border border-[#C5A059]/35 bg-[#FAF7F0] dark:bg-[#071510]/85 p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#091B15] dark:text-[#E8D39E] font-quran">
              <BookOpen className="h-3.5 w-3.5 text-[#C5A059]" />
              <span>السور المتضمنة في هذا الجزء:</span>
            </div>
            <span className="text-[11px] font-semibold text-[#8C6D2D] dark:text-[#C8A45D] bg-[#C5A059]/10 px-2.5 py-0.5 rounded-full border border-[#C5A059]/25">
              {meta.surahNames && meta.surahNames.length === 1
                ? 'سورة واحدة'
                : meta.surahNames && meta.surahNames.length === 2
                ? 'سورتان'
                : `${toArabicDigits(meta.surahNames?.length || 0)} سورة`}
            </span>
          </div>

          <div
            data-testid="juz-surah-tags"
            className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-0.5"
          >
            {meta.surahNames?.map((surah, idx) => (
              <span
                key={`${surah}-${idx}`}
                className="inline-flex items-center gap-1 rounded-md border border-[#C5A059]/40 bg-[#FFFFFF] dark:bg-[#0D221A] px-2 py-0.5 text-xs font-medium text-[#091B15] dark:text-[#F4EFE6] shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
              >
                <span className="text-[9px] text-[#C5A059]">✦</span>
                <span>سورة {surah}</span>
              </span>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 border border-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-700 dark:text-rose-300 font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="reader-name-input"
              className="block text-sm font-semibold text-[#091B15] dark:text-[#F4EFE6] mb-1.5"
            >
              الاسم
            </label>
            <input
              id="reader-name-input"
              aria-label="الاسم"
              type="text"
              required
              minLength={SECURITY_LIMITS.READER_NAME_MIN_LEN}
              maxLength={SECURITY_LIMITS.READER_NAME_MAX_LEN}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="اكتب اسمك الكريم"
              className="w-full border border-[#C5A059]/80 bg-[#FBF9F2] dark:bg-[#08130F] px-4 py-3 text-base sm:text-sm text-[#091B15] dark:text-[#F4EFE6] placeholder:text-[#7D9087] focus:border-[#091B15] dark:focus:border-[#C5A059] focus:outline-none"
            />
          </div>

          {/* Privacy Toggle (فاعل خير) */}
          <div className="flex items-center gap-3 border border-[#C5A059]/60 bg-[#FBF9F2] dark:bg-[#08130F] p-3.5">
            <input
              type="checkbox"
              id="hide-name-toggle"
              aria-label="عدم إظهار اسمي للآخرين (يظهر كفاعل خير)"
              checked={hideName}
              onChange={(e) => setHideName(e.target.checked)}
              className="h-5 w-5 border-[#C5A059] text-[#091B15] focus:ring-[#C5A059]"
            />
            <label
              htmlFor="hide-name-toggle"
              className="text-xs sm:text-sm font-medium text-[#091B15] dark:text-[#F4EFE6] cursor-pointer select-none"
            >
              عدم إظهار اسمي للآخرين (يظهر كفاعل خير)
            </label>
          </div>

          <button
            type="submit"
            data-testid="confirm-reserve-btn"
            disabled={isSubmitting || !name.trim()}
            className="flex w-full items-center justify-center gap-2 border border-[#C5A059] bg-[#081A14] hover:bg-[#112A21] py-3.5 text-base font-bold text-[#C8A45D] shadow-md disabled:opacity-50"
          >
            <BookOpen className="h-5 w-5 text-[#C5A059]" />
            <span>{isSubmitting ? 'جاري تأكيد الحجز...' : 'تأكيد الحجز والبدء بالقراءة'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
