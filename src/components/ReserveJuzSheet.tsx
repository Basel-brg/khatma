'use client';

import React, { useState, useEffect, useRef } from 'react';
import { JUZ_METADATA } from '../lib/quran-meta';
import {
  reserveJuz,
  getSavedReaderProfile,
  saveReaderProfile,
} from '../lib/khatma-service';
import { X, BookOpen, Check, Heart, Shield } from 'lucide-react';

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

  // Drag down dismissal support
  const [dragY, setDragY] = useState<number>(0);
  const touchStartY = useRef<number | null>(null);
  const isDragging = useRef<boolean>(false);

  const meta = JUZ_METADATA.find((m) => m.number === juzNumber) || JUZ_METADATA[0];

  // Pre-fill reader profile
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
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('يرجى كتابة الاسم للمتابعة');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // Save reader profile for future visits
      saveReaderProfile(trimmedName, hideName);

      // Reserve the juz
      await reserveJuz({
        khatmaId,
        juzNumber,
        readerName: trimmedName,
        hideName,
        uid,
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm transition-opacity"
      dir="rtl"
    >
      {/* Backdrop click dismisses */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet Modal */}
      <div
        className="relative z-10 w-full max-w-lg rounded-t-3xl border-t border-[#E6DEC8] dark:border-[#1E3A31] bg-[#FBF8F3] dark:bg-[#0D1F1A] p-6 shadow-2xl"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pb-3">
          <div className="h-1.5 w-12 rounded-full bg-[#D5CBB4] dark:bg-[#234238]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E6DEC8] dark:border-[#1E3A31]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FDF6E7] dark:bg-[#1F190D] border border-[#E8D39E] dark:border-[#B48327]/50 text-[#B48327] dark:text-[#E8D39E] font-bold tabular-nums">
              {meta.number}
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0F2922] dark:text-[#F4EFE6] font-quran">
                حجز {meta.nameAr}
              </h3>
              <p className="text-xs text-[#4A5D54] dark:text-[#A6B8B0]">
                من {meta.startSurahName} {meta.startAyah} إلى {meta.endSurahName} {meta.endAyah}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#4A5D54] dark:text-[#A6B8B0] hover:bg-[#F4EFE6] dark:hover:bg-white/10 hover:text-[#0F2922] dark:hover:text-white"
            aria-label="إغلاق نافذة الحجز"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mt-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="reader-name-input"
              className="block text-sm font-semibold text-[#0F2922] dark:text-[#F4EFE6] mb-1.5"
            >
              الاسم
            </label>
            <input
              id="reader-name-input"
              aria-label="الاسم"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اكتب اسمك الكريم"
              className="w-full rounded-2xl border border-[#E6DEC8] dark:border-[#234238] bg-white dark:bg-[#08130F] px-4 py-3 text-sm text-[#0F2922] dark:text-[#F4EFE6] placeholder:text-[#7D9087] focus:border-[#B48327] focus:outline-none focus:ring-2 focus:ring-[#B48327]/20"
            />
          </div>

          {/* Privacy Toggle (فاعل خير) */}
          <div className="flex items-center gap-3 rounded-2xl border border-[#E6DEC8] dark:border-[#234238] bg-white dark:bg-[#08130F] p-3.5">
            <input
              type="checkbox"
              id="hide-name-toggle"
              aria-label="عدم إظهار اسمي للآخرين (يظهر كفاعل خير)"
              checked={hideName}
              onChange={(e) => setHideName(e.target.checked)}
              className="h-5 w-5 rounded-md border-[#E6DEC8] dark:border-[#234238] text-[#0F2922] focus:ring-[#B48327]"
            />
            <label
              htmlFor="hide-name-toggle"
              className="text-xs sm:text-sm font-medium text-[#0F2922] dark:text-[#F4EFE6] cursor-pointer select-none"
            >
              عدم إظهار اسمي للآخرين (يظهر كفاعل خير)
            </label>
          </div>

          {/* Confirm Button */}
          <button
            type="submit"
            data-testid="confirm-reserve-btn"
            disabled={isSubmitting || !name.trim()}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F2922] dark:bg-[#B48327] py-3.5 text-base font-bold text-white dark:text-[#08130F] shadow-md disabled:opacity-50"
          >
            <BookOpen className="h-5 w-5 text-[#E8D39E] dark:text-[#08130F]" />
            <span>{isSubmitting ? 'جاري تأكيد الحجز...' : 'تأكيد الحجز والبدء بالقراءة'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
