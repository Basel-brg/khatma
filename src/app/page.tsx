'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Heart,
  ArrowLeft,
  Loader2,
  Check,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import { createKhatma, getDeviceUid, getRecentKhatmas } from '../lib/khatma-service';
import { SECURITY_LIMITS, validateCreateKhatmaInput } from '../lib/validation';
import { useKhatmaTheme } from '../lib/theme';
import { ShamsaRosette, CornerCrosshairs, toArabicDigits } from '../components/IslamicOrnaments';
import CreateKhatmaSheet from '../components/CreateKhatmaSheet';

interface RecentKhatmaItem {
  id: string;
  title: string;
  targetDate: string;
  lastVisitedAt: string;
}

const QUICK_PRESETS = [
  {
    label: 'ختمة رمضانية',
    title: 'ختمة شهر رمضان المبارك',
    intention: 'تقبل الله منا ومنكم صالح الأعمال وجعل القرآن ربيع قلوبنا وشفيعاً لنا يوم القيامة',
  },
  {
    label: 'صدقة جارية وشفاء',
    title: 'ختمة بنية الشفاء والصدقة الجارية',
    intention: 'بنية شفاء المرضى والصدقة الجارية ورفع البلاء والقبول عند الله عز وجل',
  },
  {
    label: 'في ثواب الوالدين',
    title: 'ختمة في ثواب وبر الوالدين',
    intention: 'إهداء ثواب تلاوة آيات كتاب الله إلى أرواح الوالدين ومغفرة لهما ونور في قبورهما',
  },
  {
    label: 'ورد أسبوعي',
    title: 'ختمة الورد القرآني الأسبوعي',
    intention: 'للمواظبة الجماعية على تدبر وتلاوة كتاب الله أسبوعياً',
  },
];

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateArabic(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
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

function formatDateArabicWithDay(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ar-EG', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatHijriDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ar-SA-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export default function HomePage() {
  const router = useRouter();
  const { isDark, toggleTheme } = useKhatmaTheme();

  const [title, setTitle] = useState('');
  const [intention, setIntention] = useState('');
  const [targetDate, setTargetDate] = useState(getTodayString());
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const [recentKhatmas, setRecentKhatmas] = useState<RecentKhatmaItem[]>([]);
  const [hasLoadedRecents, setHasLoadedRecents] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const recents = getRecentKhatmas();
      setRecentKhatmas(recents);
    } catch {
    } finally {
      setHasLoadedRecents(true);
    }
  }, []);

  const handleSelectPreset = (preset: typeof QUICK_PRESETS[0], index: number) => {
    if (selectedPresetIndex === index) {
      setSelectedPresetIndex(null);
      return;
    }
    setSelectedPresetIndex(index);
    setIntention(preset.intention);
    if (!title.trim() || QUICK_PRESETS.some((p) => p.title === title.trim())) {
      setTitle(preset.title);
    }
  };

  const handleInlineSubmit = async (e: React.FormEvent) => {
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

      router.push(`/khatma/${created.id}`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'تعذر إنشاء الختمة، يرجى المحاولة مرة أخرى');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] dark:bg-[#07120E] text-[#091B15] dark:text-[#F4EFE6] pb-20 transition-colors duration-200" dir="rtl">
      {/* Top Full-Width Architectural Obsidian-Emerald Banner (Option 1 World) */}
      <header className="w-full bg-[#081A14] border-b-2 border-[#C5A059]/75 text-[#F4EFE6] shadow-md">
        <div className="mx-auto max-w-3xl px-3.5 sm:px-6 pt-4 pb-6 sm:pb-7">
          {/* Top Utility Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-[#C5A059]/20">
            <span className="font-quran text-2xl font-bold text-white tracking-wider">
              ختمة
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-1.5 border border-[#C5A059]/40 bg-[#0D261D] hover:bg-[#133328] px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-[#E8D39E] transition-colors"
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
                onClick={() => setIsSheetOpen(true)}
                className="inline-flex items-center gap-1.5 border border-[#C5A059] bg-[#C5A059] hover:bg-[#D4B06A] px-3 sm:px-3.5 py-1.5 text-xs font-bold text-[#081A14] transition-colors"
              >
                <span>إنشاء ختمة سريعة</span>
              </button>
            </div>
          </div>

          {/* Hero Calligraphic Centerpiece + 8-Pointed Gold Shamsa Rosette */}
          <div className="mt-5 sm:mt-6 flex items-center justify-between gap-3.5 sm:gap-8">
            <div className="space-y-2 sm:space-y-3 flex-1">
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold font-quran text-[#C8A45D] leading-[1.35]">
                الرَّبْعَةُ القرآنية التشاركية
              </h1>
              <p className="text-xs sm:text-sm text-[#E6DEC8]/90 leading-relaxed max-w-lg">
                أنشئ ختمة جماعية وشارك رابطها، ليختار كل مشارك جزءه من خانات الربعة الثلاثين ويقرأه مباشرةً بصفحات المصحف الشريف (٦٠٤ صفحة) مع التلاوة الصوتية دون الحاجة لتسجيل حساب.
              </p>
            </div>

            <div className="shrink-0">
              <ShamsaRosette className="w-14 h-14 sm:w-28 sm:h-28 text-[#C5A059]" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Architectural Ledger Content */}
      <main className="mx-auto max-w-3xl px-3 sm:px-6 pt-5 sm:pt-8 space-y-5 sm:space-y-8">
        {/* Architectural Khatma Creation Ledger */}
        <section aria-label="إنشاء ختمة جديدة">
          <div className="relative border border-[#C5A059] bg-[#F8F5EC] dark:bg-[#0B1914] p-4 sm:p-7 shadow-xs">
            <CornerCrosshairs />

            <div className="flex items-center justify-between pb-3.5 sm:pb-4 mb-4 sm:mb-5 border-b border-[#C5A059]/45">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-[#091B15] dark:text-[#C8A45D] font-quran">
                  تأسيس ختمة جديدة
                </h2>
                <p className="text-[11px] sm:text-xs text-[#4A5D54] dark:text-[#A6B8B0] mt-0.5">
                  حدد عنوان الختمة ونيتها وتاريخ إتمامها، ثم شارك رابطها فوراً
                </p>
              </div>
              <span className="font-quran text-xs font-bold border border-[#C5A059]/60 bg-[#EFE8D6] dark:bg-[#112A21] px-2.5 py-1 text-[#5A4214] dark:text-[#E8D39E] shrink-0">
                ٣٠ جزءاً
              </span>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-400 text-xs text-rose-700 dark:text-rose-300">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleInlineSubmit} className="space-y-3.5 sm:space-y-4">
              <div>
                <label
                  htmlFor="home-title"
                  className="block text-xs font-bold text-[#091B15] dark:text-[#F4EFE6] mb-1.5"
                >
                  اسم الختمة <span className="text-[#9A6F1E] dark:text-[#C5A059]">*</span>
                </label>
                <input
                  id="home-title"
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
                  className="w-full px-3 sm:px-3.5 py-2 sm:py-2.5 border border-[#C5A059]/80 bg-[#FBF9F2] dark:bg-[#08130F] text-[#091B15] dark:text-[#F4EFE6] placeholder:text-[#7D9087] text-xs sm:text-sm focus:outline-none focus:border-[#091B15] dark:focus:border-[#C5A059]"
                />
              </div>

              {/* Quick Presets */}
              <div>
                <span className="block text-xs font-semibold text-[#4A5D54] dark:text-[#A6B8B0] mb-1.5">
                  مقترحات سريعة للعنوان والنية:
                </span>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-1.5">
                  {QUICK_PRESETS.map((preset, index) => {
                    const isSelected = selectedPresetIndex === index;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectPreset(preset, index)}
                        className={`text-xs px-2.5 sm:px-3 py-2 sm:py-1.5 border transition-colors flex items-center justify-center sm:justify-start gap-1.5 text-center ${
                          isSelected
                            ? 'bg-[#081A14] border-[#C5A059] text-[#C8A45D] font-bold shadow-xs'
                            : 'bg-[#FBF9F2] dark:bg-[#08130F] border-[#C5A059]/60 text-[#091B15] dark:text-[#E8D39E] hover:border-[#C5A059]'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-[#C5A059] shrink-0" />}
                        <span className="truncate">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Intention input */}
              <div>
                <label
                  htmlFor="home-intention"
                  className="block text-xs font-bold text-[#091B15] dark:text-[#F4EFE6] mb-1.5 flex items-center gap-1.5"
                >
                  <Heart className="w-3.5 h-3.5 text-[#9A6F1E] dark:text-[#C5A059]" />
                  نية الختمة والدعاء <span className="text-[11px] text-[#7D9087] font-normal">(اختياري)</span>
                </label>
                <textarea
                  id="home-intention"
                  rows={2}
                  maxLength={SECURITY_LIMITS.INTENTION_MAX_LEN}
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  placeholder="اكتب نية الختمة أو دعاءً يظهر في أعلى صفحة الختمة..."
                  className="w-full px-3 sm:px-3.5 py-2 border border-[#C5A059]/80 bg-[#FBF9F2] dark:bg-[#08130F] text-[#091B15] dark:text-[#F4EFE6] placeholder:text-[#7D9087] text-xs sm:text-sm focus:outline-none focus:border-[#091B15] dark:focus:border-[#C5A059] resize-none"
                />
              </div>

              {/* Target Date Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="home-date"
                    className="text-xs font-bold text-[#091B15] dark:text-[#F4EFE6] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-[#9A6F1E] dark:text-[#C5A059]" />
                    <span>تاريخ الإتمام المرجو</span>
                  </label>
                  {formatHijriDate(targetDate) && (
                    <span className="text-[11px] font-quran text-[#8C661E] dark:text-[#C5A059] font-medium">
                      الموافق: {formatHijriDate(targetDate)}
                    </span>
                  )}
                </div>

                <div
                  onClick={() => {
                    try {
                      dateInputRef.current?.showPicker?.();
                    } catch {}
                  }}
                  className="relative w-full cursor-pointer"
                >
                  <input
                    ref={dateInputRef}
                    id="home-date"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    onClick={(e) => {
                      e.stopPropagation();
                      try {
                        (e.currentTarget as any).showPicker?.();
                      } catch {}
                    }}
                    className="w-full px-3 sm:px-3.5 py-2 sm:py-2.5 border border-[#C5A059]/80 hover:border-[#C5A059] bg-[#FBF9F2] dark:bg-[#08130F] text-[#091B15] dark:text-[#F4EFE6] text-xs sm:text-sm tabular-nums focus:outline-none focus:border-[#091B15] dark:focus:border-[#C5A059] cursor-pointer shadow-xs transition-colors"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="w-full py-3 sm:py-3.5 px-4 sm:px-5 border border-[#C5A059] bg-[#081A14] hover:bg-[#112A21] text-[#C8A45D] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#C5A059] shrink-0" />
                    <span>جاري إنشاء الختمة...</span>
                  </>
                ) : (
                  <>
                    <span>إنشاء الختمة وفتح خانات الأجزاء الثلاثين</span>
                    <ArrowLeft className="w-4 h-4 shrink-0" />
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* Recent Khatmas Ledger Index */}
        <section aria-label="ختماتي الأخيرة">
          <div className="flex items-center justify-between mb-2.5 sm:mb-3 px-1">
            <h2 className="text-base sm:text-lg font-bold text-[#091B15] dark:text-[#C8A45D] font-quran">
              سجل الختمات المحفوظة على هذا الجهاز
            </h2>
            {recentKhatmas.length > 0 && (
              <span className="text-xs font-semibold border border-[#C5A059]/60 bg-[#EFE8D6] dark:bg-[#112A21] px-2 py-0.5 text-[#5A4214] dark:text-[#E8D39E] tabular-nums">
                {toArabicDigits(recentKhatmas.length)}
              </span>
            )}
          </div>

          {!hasLoadedRecents ? (
            <div className="relative border border-[#C5A059]/60 bg-[#F8F5EC] dark:bg-[#0B1914] p-4 text-center text-xs text-[#7D9087]">
              جاري تحميل السجل...
            </div>
          ) : recentKhatmas.length === 0 ? (
            <div className="relative border border-[#C5A059]/60 bg-[#F8F5EC] dark:bg-[#0B1914] p-5 sm:p-6 text-center space-y-1.5">
              <CornerCrosshairs />
              <p className="text-xs font-semibold text-[#091B15] dark:text-[#F4EFE6]">
                لا توجد ختمات مسجلة في هذا المتصفح بعد.
              </p>
              <p className="text-[11px] text-[#4A5D54] dark:text-[#A6B8B0]">
                أي ختمة تنشئها أو تفتح رابطها تُحفظ تلقائياً هنا للعودة السريعة إلى جزئك وموضع توقفك.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#C5A059]/40 border border-[#C5A059]">
              {recentKhatmas.map((item) => (
                <Link
                  key={item.id}
                  href={`/khatma/${item.id}`}
                  className="flex items-center justify-between gap-3 bg-[#F8F5EC] dark:bg-[#0B1914] hover:bg-[#EFE8D6] dark:hover:bg-[#11261E] p-3.5 sm:p-4 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-bold font-quran text-[#091B15] dark:text-[#E8D39E] truncate">
                      {item.title}
                    </h3>
                    {item.targetDate && (
                      <p className="text-[11px] sm:text-xs text-[#4A5D54] dark:text-[#A6B8B0] mt-0.5 tabular-nums">
                        موعد الختم: {formatDateArabic(item.targetDate)}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 border border-[#C5A059]/60 bg-[#081A14] px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold text-[#C8A45D] shrink-0">
                    <span>فتح</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* Live preview demo banner to demo-ramadan */}
          <div className="mt-3.5 border border-[#C5A059] bg-[#FBF6E8] dark:bg-[#0D241C] p-3.5 sm:p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-[#8C661E] dark:text-[#C5A059] block">
                  نموذج تجريبي جاهز للمعاينة:
                </span>
                <h3 className="text-sm sm:text-base font-bold font-quran text-[#091B15] dark:text-[#E8D39E]">
                  ختمة شهر رمضان المبارك (معاينة حية للربعة)
                </h3>
              </div>
              <Link
                href="/khatma/demo-ramadan"
                className="inline-flex items-center justify-center gap-1.5 border border-[#C5A059] bg-[#081A14] hover:bg-[#123126] text-[#E8D39E] px-4 py-2 text-xs font-bold shrink-0 transition-colors cursor-pointer"
              >
                <span>معاينة الختمة</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center space-y-1.5 sm:space-y-2 pt-5 sm:pt-6 pb-2 border-t border-[#C5A059]/40 text-xs text-[#4A5D54] dark:text-[#A6B8B0]">
          <p className="font-quran text-sm sm:text-base text-[#091B15] dark:text-[#C8A45D]">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          <p className="max-w-md mx-auto text-[11px] sm:text-xs leading-relaxed px-2">
            اللهم اجعل القرآن الكريم ربيع قلوبنا، ونور صدورنا، وجلاء أحزاننا، وذهاب همومنا
          </p>
        </footer>
      </main>

      <CreateKhatmaSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
    </div>
  );
}
