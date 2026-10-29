'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Sparkles, Calendar, BookOpen, Heart, Loader2, ArrowLeft, Check } from 'lucide-react';
import { createKhatma, getDeviceUid } from '../lib/khatma-service';
import { SECURITY_LIMITS, validateCreateKhatmaInput } from '../lib/validation';
import { CornerCrosshairs } from './IslamicOrnaments';

export interface CreateKhatmaSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (khatmaId: string) => void;
}

const INTENTION_PRESETS = [
  {
    label: 'ختمة رمضانية',
    title: 'ختمة شهر رمضان المبارك',
    intention: 'تقبل الله منا ومنكم صالح الأعمال وجعل القرآن ربيع قلوبنا وشفيعاً لنا يوم القيامة',
  },
  {
    label: 'صدقة جارية وشفاء',
    title: 'ختمة بنية الشفاء والصدقة الجارية',
    intention: 'بنية شفاء المرضى والصدقة الجارية ومغفرة الذنوب والقبول عند الله عز وجل',
  },
  {
    label: 'في ثواب الوالدين',
    title: 'ختمة في ثواب وبر الوالدين',
    intention: 'إهداء ثواب تلاوة آيات كتاب الله إلى أرواح الوالدين رحمة ومغفرة ونوراً',
  },
  {
    label: 'ورد أسبوعي',
    title: 'ختمة الورد القرآني الأسبوعي',
    intention: 'للمواظبة الجماعية على تدبر وتلاوة كتاب الله والتعاون على البر والتقوى',
  },
  {
    label: 'تفريج الهموم',
    title: 'ختمة تفريج الكرب وقضاء الحوائج',
    intention: 'بنية تيسير الأمور وتفريج الهموم واستجابة الدعوات ببركة آيات القرآن الكريم',
  },
];

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDatePlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getNextRamadanDate(): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      month: 'numeric',
      day: 'numeric',
    });
    const d = new Date();
    // Search up to 365 days ahead for the end of Ramadan (29 or 30 of month 9)
    for (let i = 0; i < 365; i++) {
      const parts = fmt.formatToParts(d);
      const m = parts.find((p) => p.type === 'month')?.value;
      const day = parts.find((p) => p.type === 'day')?.value;
      if (m === '9' && (day === '29' || day === '30')) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${dayStr}`;
      }
      d.setDate(d.getDate() + 1);
    }
  } catch {}
  return getDatePlusDays(30);
}

export default function CreateKhatmaSheet({
  isOpen,
  onClose,
  onCreated,
}: CreateKhatmaSheetProps) {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [intention, setIntention] = useState('');
  const [targetDate, setTargetDate] = useState(getTodayString());
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset form when reopened
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setIntention('');
      setTargetDate(getTodayString());
      setSelectedPresetIndex(null);
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof INTENTION_PRESETS[0], index: number) => {
    if (selectedPresetIndex === index) {
      // Toggle off
      setSelectedPresetIndex(null);
      return;
    }
    setSelectedPresetIndex(index);
    setIntention(preset.intention);
    if (!title.trim() || INTENTION_PRESETS.some((p) => p.title === title.trim())) {
      setTitle(preset.title);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = validateCreateKhatmaInput({
        title,
        intention,
        targetDate: targetDate || getTodayString(),
      });

      setErrorMessage(null);
      setIsSubmitting(true);

      const uid = await getDeviceUid();
      const created = await createKhatma(validated, uid);

      if (onCreated) {
        onCreated(created.id);
      }
      onClose();
      router.push(`/khatma/${created.id}`);
    } catch (err: any) {
      console.error('Failed to create khatma:', err);
      setErrorMessage(err?.message || 'تعذر إنشاء الختمة، يرجى المحاولة مرة أخرى');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#081A14]/75 backdrop-blur-xs p-0 sm:p-4 sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-title"
      dir="rtl"
    >
      {/* Background overlay click */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      {/* Main Sheet / Modal Panel */}
      <div className="relative w-full max-w-lg mx-auto bg-[#F8F5EC] dark:bg-[#0B1914] rounded-t-[24px] sm:rounded-2xl border border-[#C5A059] shadow-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto sheet-panel z-10">
        <CornerCrosshairs />

        {/* Mobile Drag Indicator */}
        <div className="sm:hidden flex justify-center pb-2.5">
          <div className="w-12 h-1.5 bg-[#C5A059]/40 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#C5A059]/30">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border border-[#C5A059] bg-[#081A14] text-[#C5A059] flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-[#C5A059]" />
            </div>
            <div>
              <h2 id="sheet-title" className="text-lg sm:text-xl font-bold text-[#081A14] dark:text-[#C5A059] font-quran leading-tight">
                بدء ختمة قرآنية جديدة
              </h2>
              <p className="text-xs text-[#4A5D54] dark:text-[#A6B8B0] leading-snug mt-0.5">
                أنشئ الختمة وشارك الرابط <span className="inline sm:hidden"><br /></span>ليتشارك الأهل والأصحاب قراءة أجزائها
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full border border-[#C5A059]/30 bg-[#F8F5EC] dark:bg-[#081A14] hover:bg-[#EAE4D2] dark:hover:bg-[#112A21] text-[#081A14] dark:text-[#E8D39E] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            aria-label="إغلاق النافذة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-3 sm:mt-4 p-3 bg-red-500/10 border border-red-500/40 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 sm:mt-5 space-y-4 sm:space-y-5">
          {/* Title Field */}
          <div>
            <label htmlFor="khatma-title" className="block text-xs sm:text-sm font-bold text-[#081A14] dark:text-[#F8F5EC] mb-1.5">
              اسم الختمة <span className="text-[#C5A059]">*</span>
            </label>
            <input
              id="khatma-title"
              type="text"
              required
              minLength={SECURITY_LIMITS.TITLE_MIN_LEN}
              maxLength={SECURITY_LIMITS.TITLE_MAX_LEN}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="مثال: ختمة شهر رمضان المبارك، ختمة في ثواب الوالدين..."
              className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-[#C5A059]/50 dark:border-[#C5A059]/40 bg-[#FDFBF7] dark:bg-[#081A14] text-[#081A14] dark:text-[#F8F5EC] placeholder:text-[#7D9087] text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] transition-[border-color,box-shadow]"
              autoFocus
            />
          </div>

          {/* Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-xs font-medium text-[#4A5D54] dark:text-[#A6B8B0] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                نماذج جاهزة للنية والاسم:
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {INTENTION_PRESETS.map((preset, index) => {
                const isSelected = selectedPresetIndex === index;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectPreset(preset, index)}
                    className={`text-xs px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-lg border transition-all flex items-center justify-center sm:justify-start gap-1.5 text-center leading-tight cursor-pointer last:col-span-2 sm:last:col-span-1 ${
                      isSelected
                        ? 'bg-[#081A14] border-[#C5A059] text-[#C5A059] dark:text-[#E8D39E] font-bold shadow-xs'
                        : 'bg-[#FDFBF7] dark:bg-[#081A14]/70 border-[#C5A059]/40 text-[#4A5D54] dark:text-[#A6B8B0] hover:border-[#C5A059] hover:text-[#081A14] dark:hover:text-[#F8F5EC]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#C5A059] shrink-0" />}
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intention Field */}
          <div>
            <label htmlFor="khatma-intention" className="block text-xs sm:text-sm font-bold text-[#081A14] dark:text-[#F8F5EC] mb-1.5 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-[#C5A059]" />
              نية الختمة والدعاء <span className="text-[11px] sm:text-xs text-[#7D9087] font-normal">(اختياري)</span>
            </label>
            <textarea
              id="khatma-intention"
              rows={2}
              maxLength={SECURITY_LIMITS.INTENTION_MAX_LEN}
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              placeholder="اكتب نية الختمة أو دعاءً يظهر في أعلى صفحة الختمة لكل من يفتحها..."
              className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl border border-[#C5A059]/50 dark:border-[#C5A059]/40 bg-[#FDFBF7] dark:bg-[#081A14] text-[#081A14] dark:text-[#F8F5EC] placeholder:text-[#7D9087] text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] transition-[border-color,box-shadow] resize-none leading-relaxed"
            />
          </div>

          {/* Target Date Field */}
          <div>
            <label htmlFor="khatma-target-date" className="block text-xs sm:text-sm font-bold text-[#081A14] dark:text-[#F8F5EC] mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#C5A059]" />
              تاريخ القراءة / الإتمام المرجو
            </label>
            <div className="flex flex-col gap-2">
              <input
                id="khatma-target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3.5 sm:px-4 py-2.5 rounded-xl border border-[#C5A059]/50 dark:border-[#C5A059]/40 bg-[#FDFBF7] dark:bg-[#081A14] text-[#081A14] dark:text-[#F8F5EC] text-base sm:text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#C5A059]/30 focus:border-[#C5A059] transition-[border-color,box-shadow]"
              />
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTargetDate(getTodayString())}
                  className={`px-2.5 py-2 text-xs rounded-lg border transition-colors cursor-pointer text-center ${
                    targetDate === getTodayString()
                      ? 'border-[#C5A059] bg-[#081A14] text-[#C5A059] font-bold'
                      : 'border-[#C5A059]/40 bg-[#FDFBF7] dark:bg-[#081A14] text-[#4A5D54] dark:text-[#A6B8B0] hover:border-[#C5A059]'
                  }`}
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => setTargetDate(getDatePlusDays(7))}
                  className={`px-2.5 py-2 text-xs rounded-lg border transition-colors cursor-pointer text-center ${
                    targetDate === getDatePlusDays(7)
                      ? 'border-[#C5A059] bg-[#081A14] text-[#C5A059] font-bold'
                      : 'border-[#C5A059]/40 bg-[#FDFBF7] dark:bg-[#081A14] text-[#4A5D54] dark:text-[#A6B8B0] hover:border-[#C5A059]'
                  }`}
                >
                  +7 أيام
                </button>
                <button
                  type="button"
                  onClick={() => setTargetDate(getDatePlusDays(30))}
                  className={`px-2.5 py-2 text-xs rounded-lg border transition-colors cursor-pointer text-center ${
                    targetDate === getDatePlusDays(30)
                      ? 'border-[#C5A059] bg-[#081A14] text-[#C5A059] font-bold'
                      : 'border-[#C5A059]/40 bg-[#FDFBF7] dark:bg-[#081A14] text-[#4A5D54] dark:text-[#A6B8B0] hover:border-[#C5A059]'
                  }`}
                >
                  +30 يوماً
                </button>
                <button
                  type="button"
                  onClick={() => setTargetDate(getNextRamadanDate())}
                  className={`px-2.5 py-2 text-xs rounded-lg border transition-colors cursor-pointer text-center ${
                    targetDate === getNextRamadanDate()
                      ? 'border-[#C5A059] bg-[#081A14] text-[#C5A059] font-bold'
                      : 'border-[#C5A059]/40 bg-[#FDFBF7] dark:bg-[#081A14] text-[#4A5D54] dark:text-[#A6B8B0] hover:border-[#C5A059]'
                  }`}
                >
                  رمضان المبارك
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="w-full py-3.5 px-6 rounded-xl border border-[#C5A059] bg-[#081A14] hover:bg-[#112A21] text-[#C5A059] dark:text-[#E8D39E] font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#C5A059]" />
                  <span>جاري إنشاء الختمة...</span>
                </>
              ) : (
                <>
                  <span>إنشاء الختمة والبدء</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto py-3 px-5 rounded-xl border border-[#C5A059]/40 bg-transparent text-[#4A5D54] dark:text-[#A6B8B0] hover:bg-[#EAE4D2] dark:hover:bg-[#112A21] text-sm font-medium transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
