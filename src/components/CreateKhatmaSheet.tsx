'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Sparkles, Calendar, BookOpen, Heart, Loader2, ArrowLeft, Check } from 'lucide-react';
import { createKhatma, getDeviceUid } from '../lib/khatma-service';

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
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setErrorMessage('يرجى كتابة اسم الختمة للمتابعة');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const uid = await getDeviceUid();
      const created = await createKhatma(
        {
          title: trimmedTitle,
          intention: intention.trim(),
          targetDate: targetDate || getTodayString(),
        },
        uid
      );

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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-title"
    >
      {/* Background overlay click */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      {/* Main Sheet / Modal Panel */}
      <div className="relative w-full max-w-lg mx-auto bg-white dark:bg-[#0D1F1A] rounded-t-3xl sm:rounded-2xl border border-[#E6DEC8] dark:border-[#1E3A31] shadow-2xl p-6 sm:p-7 max-h-[92vh] overflow-y-auto sheet-panel z-10">
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden flex justify-center mb-3">
          <div className="w-12 h-1.5 bg-[#E6DEC8] dark:bg-[#234238] rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E6DEC8] dark:border-[#1E3A31]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FDF6E7] dark:bg-[#1F190D] border border-[#E8D39E] dark:border-[#B48327]/50 flex items-center justify-center text-[#B48327] dark:text-[#E8D39E]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 id="sheet-title" className="text-xl font-bold text-[#0F2922] dark:text-[#F4EFE6] font-quran leading-tight">
                بدء ختمة قرآنية جديدة
              </h2>
              <p className="text-xs text-[#4A5D54] dark:text-[#A6B8B0]">
                أنشئ الختمة وشارك الرابط ليتشارك الأهل والأصحاب قراءة أجزائها
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-[#F4EFE6] dark:bg-[#142C24] hover:bg-[#E6DEC8] dark:hover:bg-[#1E3A31] text-[#4A5D54] dark:text-[#A6B8B0] flex items-center justify-center transition-colors"
            aria-label="إغلاق النافذة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Title Field */}
          <div>
            <label htmlFor="khatma-title" className="block text-sm font-semibold text-[#0F2922] dark:text-[#F4EFE6] mb-1.5">
              اسم الختمة <span className="text-[#B48327]">*</span>
            </label>
            <input
              id="khatma-title"
              type="text"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="مثال: ختمة شهر رمضان المبارك، ختمة في ثواب الوالدين..."
              className="w-full px-4 py-3 rounded-xl border border-[#E6DEC8] dark:border-[#234238] bg-[#FBF8F3] dark:bg-[#08130F] text-[#0F2922] dark:text-[#F4EFE6] placeholder:text-[#7D9087] text-sm focus:outline-none focus:ring-2 focus:ring-[#B48327]/30 focus:border-[#B48327] transition-[border-color,box-shadow]"
              autoFocus
            />
          </div>

          {/* Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#4A5D54] dark:text-[#A6B8B0] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#B48327]" />
                نماذج جاهزة للنية والاسم:
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {INTENTION_PRESETS.map((preset, index) => {
                const isSelected = selectedPresetIndex === index;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectPreset(preset, index)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#FDF6E7] dark:bg-[#1F190D] border-[#B48327] text-[#B48327] dark:text-[#E8D39E] font-semibold shadow-xs'
                        : 'bg-[#FBF8F3] dark:bg-[#08130F] border-[#E6DEC8] dark:border-[#234238] text-[#4A5D54] dark:text-[#A6B8B0] hover:border-[#B48327]/60'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#B48327]" />}
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Intention Field */}
          <div>
            <label htmlFor="khatma-intention" className="block text-sm font-semibold text-[#0F2922] dark:text-[#F4EFE6] mb-1.5 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-[#B48327]" />
              نية الختمة والدعاء <span className="text-xs text-[#7D9087] font-normal">(اختياري)</span>
            </label>
            <textarea
              id="khatma-intention"
              rows={2}
              value={intention}
              onChange={(e) => setIntention(e.target.value)}
              placeholder="اكتب نية الختمة أو دعاءً يظهر في أعلى صفحة الختمة لكل من يفتحها..."
              className="w-full px-4 py-2.5 rounded-xl border border-[#E6DEC8] dark:border-[#234238] bg-[#FBF8F3] dark:bg-[#08130F] text-[#0F2922] dark:text-[#F4EFE6] placeholder:text-[#7D9087] text-sm focus:outline-none focus:ring-2 focus:ring-[#B48327]/30 focus:border-[#B48327] transition-[border-color,box-shadow] resize-none"
            />
          </div>

          {/* Target Date Field */}
          <div>
            <label htmlFor="khatma-target-date" className="block text-sm font-semibold text-[#0F2922] dark:text-[#F4EFE6] mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#B48327]" />
              تاريخ القراءة / الإتمام المرجو
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="khatma-target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E6DEC8] dark:border-[#234238] bg-[#FBF8F3] dark:bg-[#08130F] text-[#0F2922] dark:text-[#F4EFE6] text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#B48327]/30 focus:border-[#B48327] transition-[border-color,box-shadow]"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setTargetDate(getTodayString())}
                  className="px-2.5 py-2 text-xs rounded-lg border border-[#E6DEC8] dark:border-[#234238] bg-[#FBF8F3] dark:bg-[#08130F] text-[#4A5D54] dark:text-[#A6B8B0] hover:bg-white dark:hover:bg-[#142C24]"
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => setTargetDate(getDatePlusDays(7))}
                  className="px-2.5 py-2 text-xs rounded-lg border border-[#E6DEC8] dark:border-[#234238] bg-[#FBF8F3] dark:bg-[#08130F] text-[#4A5D54] dark:text-[#A6B8B0] hover:bg-white dark:hover:bg-[#142C24]"
                >
                  خلال أسبوع
                </button>
                <button
                  type="button"
                  onClick={() => setTargetDate(getDatePlusDays(30))}
                  className="px-2.5 py-2 text-xs rounded-lg border border-[#E6DEC8] dark:border-[#234238] bg-[#FBF8F3] dark:bg-[#08130F] text-[#4A5D54] dark:text-[#A6B8B0] hover:bg-white dark:hover:bg-[#142C24]"
                >
                  خلال شهر
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="w-full py-3.5 px-6 rounded-xl bg-[#0F2922] dark:bg-[#B48327] hover:bg-[#153a30] dark:hover:bg-[#C99635] text-white dark:text-[#08130F] font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#B48327] dark:text-[#08130F]" />
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
              className="w-full sm:w-auto py-3 px-5 rounded-xl border border-[#E6DEC8] dark:border-[#234238] bg-transparent text-[#4A5D54] dark:text-[#A6B8B0] hover:bg-[#F4EFE6] dark:hover:bg-[#142C24] text-sm font-medium transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
