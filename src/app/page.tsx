'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Sparkles,
  Calendar,
  Heart,
  ArrowLeft,
  Loader2,
  Clock,
  CheckCircle2,
  Users,
  Compass,
  Check,
  ShieldCheck,
  BookmarkCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { createKhatma, getDeviceUid, getRecentKhatmas } from '../lib/khatma-service';
import { useKhatmaTheme } from '../lib/theme';
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

function formatRelativeTime(isoStr: string): string {
  if (!isoStr) return '';
  try {
    const diffMs = Date.now() - new Date(isoStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'أمس';
    if (diffDays < 30) return `منذ ${diffDays} يوم`;
    return formatDateArabic(isoStr);
  } catch {
    return '';
  }
}

export default function HomePage() {
  const router = useRouter();
  const { isDark, toggleTheme } = useKhatmaTheme();

  // Creation form state
  const [title, setTitle] = useState('');
  const [intention, setIntention] = useState('');
  const [targetDate, setTargetDate] = useState(getTodayString());
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sheet modal state
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Recent Khatmas state
  const [recentKhatmas, setRecentKhatmas] = useState<RecentKhatmaItem[]>([]);
  const [hasLoadedRecents, setHasLoadedRecents] = useState(false);

  useEffect(() => {
    try {
      const recents = getRecentKhatmas();
      setRecentKhatmas(recents);
    } catch (e) {
      console.warn('Failed to load recent khatmas:', e);
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
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setErrorMessage('يرجى كتابة اسم الختمة للبدء');
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

      router.push(`/khatma/${created.id}`);
    } catch (err: any) {
      console.error('Failed to create khatma:', err);
      setErrorMessage(err?.message || 'تعذر إنشاء الختمة، يرجى المحاولة مرة أخرى');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF8F3] dark:bg-[#07120E] text-[#0F2922] dark:text-[#F4EFE6] pb-20 selection:bg-[#FDF6E7] dark:selection:bg-[#B48327]/30 selection:text-[#B48327] dark:selection:text-[#FDE68A] transition-colors duration-200">
      {/* Top Folio Header Accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#B48327] via-[#E8D39E] to-[#0F2922]" />

      <main className="max-w-xl mx-auto px-4 pt-5 sm:pt-8">
        {/* Top Theme Toggle Bar */}
        <div className="flex items-center justify-end mb-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6DEC8] dark:border-[#B48327]/40 bg-white dark:bg-[#0D1F1A] px-3 py-1.5 text-xs font-semibold text-[#0F2922] dark:text-[#E8D39E] shadow-xs hover:border-[#B48327] transition-colors"
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

        {/* Hero Area */}
        <header className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FFFFFF] dark:bg-[#0D1F1A] border border-[#E6DEC8] dark:border-[#1E3A31] shadow-xs text-[#B48327] dark:text-[#E8D39E] mb-1">
            <BookOpen className="w-8 h-8 stroke-[1.75]" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold font-quran text-[#0F2922] dark:text-[#F4EFE6] tracking-wide">
            خَتْمَة
          </h1>

          <p className="text-sm sm:text-base text-[#4A5D54] dark:text-[#A6B8B0] leading-relaxed max-w-md mx-auto">
            تنظيم ختمات القرآن الكريم الجماعية وقراءة الأجزاء مباشرة بالرسم العثماني
          </p>

          {/* Value Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFFFF] dark:bg-[#0D1F1A] border border-[#E6DEC8] dark:border-[#1E3A31] text-[#4A5D54] dark:text-[#A6B8B0]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#15803D] dark:text-[#4ADE80]" />
              دون تسجيل حساب
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFFFF] dark:bg-[#0D1F1A] border border-[#E6DEC8] dark:border-[#1E3A31] text-[#4A5D54] dark:text-[#A6B8B0]">
              <BookmarkCheck className="w-3.5 h-3.5 text-[#B48327] dark:text-[#E8D39E]" />
              رسم عثماني أصيل
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFFFF] dark:bg-[#0D1F1A] border border-[#E6DEC8] dark:border-[#1E3A31] text-[#4A5D54] dark:text-[#A6B8B0]">
              <Users className="w-3.5 h-3.5 text-[#0F2922] dark:text-[#F4EFE6]" />
              تزامن فوري للمجموعات
            </span>
          </div>
        </header>

        {/* Ready-to-Explore Demo Khatma Banner */}
        <section aria-label="معاينة الختمة التجريبية" className="mb-8">
          <Link
            href="/khatma/demo-ramadan"
            className="block interactive-card group p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#FFFFFF] to-[#FDF6E7] dark:from-[#0D1F1A] dark:to-[#18160E] border border-[#E8D39E] dark:border-[#B48327]/45 shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#B48327]/10 dark:bg-[#B48327]/20 text-[#B48327] dark:text-[#E8D39E] text-xs font-semibold">
                  <Compass className="w-3.5 h-3.5" />
                  معاينة تجريبية فورية
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#0F2922] dark:text-[#F4EFE6] font-quran group-hover:text-[#B48327] dark:group-hover:text-[#E8D39E] transition-colors">
                  ختمة رمضان المبارك التشاركية
                </h3>
                <p className="text-xs text-[#4A5D54] dark:text-[#A6B8B0] leading-relaxed">
                  جرّب شبكة الأجزاء الثلاثين، وحجز جزء، والقراءة بالرسم العثماني مباشرة بضغطة واحدة.
                </p>
              </div>

              <div className="w-9 h-9 rounded-xl bg-[#0F2922] dark:bg-[#B48327] text-white dark:text-[#08130F] flex items-center justify-center shrink-0 group-hover:bg-[#B48327] transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </div>
            </div>

            {/* Quick Demo Stats */}
            <div className="mt-3.5 pt-3 border-t border-[#E8D39E]/60 dark:border-[#B48327]/25 flex items-center justify-between text-xs tabular-nums text-[#4A5D54] dark:text-[#A6B8B0]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[#15803D] dark:text-[#4ADE80]">
                  <span className="w-2 h-2 rounded-full bg-[#15803D] dark:bg-[#4ADE80]" />
                  ٢ جزء مكتمل
                </span>
                <span className="flex items-center gap-1 text-[#B45309] dark:text-[#FBBF24]">
                  <span className="w-2 h-2 rounded-full bg-[#B45309] dark:bg-[#FBBF24]" />
                  ٢ محجوز
                </span>
                <span className="flex items-center gap-1 text-[#7D9087] dark:text-[#8CA399]">
                  <span className="w-2 h-2 rounded-full bg-[#E6DEC8] dark:bg-[#234238]" />
                  ٢٦ متاح
                </span>
              </div>
              <span className="text-[#B48327] dark:text-[#E8D39E] font-medium group-hover:underline">دخول المعاينة ←</span>
            </div>
          </Link>
        </section>

        {/* Primary Khatma Creation Card */}
        <section aria-label="إنشاء ختمة جديدة" className="mb-8">
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D1F1A] border border-[#E6DEC8] dark:border-[#1E3A31] shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E6DEC8] dark:border-[#1E3A31]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FDF6E7] dark:bg-[#1F190D] border border-[#E8D39E] dark:border-[#B48327]/50 flex items-center justify-center text-[#B48327] dark:text-[#E8D39E]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0F2922] dark:text-[#F4EFE6] font-quran">
                    إنشاء ختمة جديدة
                  </h2>
                  <p className="text-xs text-[#4A5D54] dark:text-[#A6B8B0]">
                    أدخل بيانات الختمة وشارك رابطها مع مجموعتك فوراً
                  </p>
                </div>
              </div>

              {/* Sheet modal trigger button alternative */}
              <button
                type="button"
                onClick={() => setIsSheetOpen(true)}
                className="hidden sm:inline-flex text-xs px-3 py-1.5 rounded-lg border border-[#E6DEC8] dark:border-[#234238] bg-[#FBF8F3] dark:bg-[#08130F] text-[#4A5D54] dark:text-[#A6B8B0] hover:border-[#B48327] transition-colors"
              >
                فتح كنافذة
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleInlineSubmit} className="space-y-4">
              {/* Title input */}
              <div>
                <label htmlFor="home-title" className="block text-xs font-semibold text-[#0F2922] dark:text-[#F4EFE6] mb-1">
                  اسم الختمة <span className="text-[#B48327]">*</span>
                </label>
                <input
                  id="home-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="مثال: ختمة شهر رمضان المبارك، ختمة في ثواب الوالدين..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E6DEC8] dark:border-[#234238] bg-[#FBF8F3] dark:bg-[#08130F] text-[#0F2922] dark:text-[#F4EFE6] placeholder:text-[#7D9087] text-sm focus:outline-none focus:ring-2 focus:ring-[#B48327]/30 focus:border-[#B48327] transition-[border-color,box-shadow]"
                />
              </div>

              {/* Quick Presets */}
              <div>
                <span className="block text-xs text-[#4A5D54] dark:text-[#A6B8B0] mb-1.5">نماذج سريعة للنية والاسم:</span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PRESETS.map((preset, index) => {
                    const isSelected = selectedPresetIndex === index;
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectPreset(preset, index)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                          isSelected
                            ? 'bg-[#FDF6E7] dark:bg-[#1F190D] border-[#B48327] text-[#B48327] dark:text-[#E8D39E] font-semibold'
                            : 'bg-[#FBF8F3] dark:bg-[#08130F] border-[#E6DEC8] dark:border-[#234238] text-[#4A5D54] dark:text-[#A6B8B0] hover:border-[#B48327]/50'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-[#B48327] dark:text-[#E8D39E]" />}
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Intention input */}
              <div>
                <label htmlFor="home-intention" className="block text-xs font-semibold text-[#0F2922] dark:text-[#F4EFE6] mb-1 flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-[#B48327]" />
                  نية الختمة والدعاء <span className="text-[11px] text-[#7D9087] font-normal">(اختياري)</span>
                </label>
                <textarea
                  id="home-intention"
                  rows={2}
                  value={intention}
                  onChange={(e) => setIntention(e.target.value)}
                  placeholder="اكتب نية الختمة أو دعاءً يظهر في أعلى صفحة الختمة..."
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E6DEC8] dark:border-[#234238] bg-[#FBF8F3] dark:bg-[#08130F] text-[#0F2922] dark:text-[#F4EFE6] placeholder:text-[#7D9087] text-sm focus:outline-none focus:ring-2 focus:ring-[#B48327]/30 focus:border-[#B48327] transition-[border-color,box-shadow] resize-none"
                />
              </div>

              {/* Target Date */}
              <div>
                <label htmlFor="home-date" className="block text-xs font-semibold text-[#0F2922] dark:text-[#F4EFE6] mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#B48327]" />
                  تاريخ القراءة / الإتمام
                </label>
                <input
                  id="home-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E6DEC8] dark:border-[#234238] bg-[#FBF8F3] dark:bg-[#08130F] text-[#0F2922] dark:text-[#F4EFE6] text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-[#B48327]/30 focus:border-[#B48327] transition-[border-color,box-shadow]"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="w-full py-3 px-5 rounded-xl bg-[#0F2922] dark:bg-[#B48327] hover:bg-[#14372e] dark:hover:bg-[#C99635] text-white dark:text-[#08130F] font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
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
            </form>
          </div>
        </section>

        {/* Recent Khatmas Section */}
        <section aria-label="ختماتي الأخيرة" className="mb-10">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-base font-bold text-[#0F2922] dark:text-[#F4EFE6] font-quran flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#B48327] dark:text-[#E8D39E]" />
              ختماتي الأخيرة
            </h2>
            {recentKhatmas.length > 0 && (
              <span className="text-xs text-[#7D9087] tabular-nums">
                {recentKhatmas.length} {recentKhatmas.length === 1 ? 'ختمة' : 'ختمات'}
              </span>
            )}
          </div>

          {!hasLoadedRecents ? (
            <div className="p-4 rounded-xl bg-white dark:bg-[#0D1F1A] border border-[#E6DEC8] dark:border-[#1E3A31] text-center text-xs text-[#7D9087]">
              جاري تحميل الختمات السابقة...
            </div>
          ) : recentKhatmas.length === 0 ? (
            <div className="p-5 rounded-2xl bg-white/70 dark:bg-[#0D1F1A]/80 border border-[#E6DEC8] dark:border-[#1E3A31] text-center space-y-2">
              <p className="text-xs text-[#4A5D54] dark:text-[#A6B8B0]">
                لا توجد ختمات محفوظة على هذا الجهاز بعد.
              </p>
              <p className="text-[11px] text-[#7D9087]">
                عند إنشائك أو زيارتك لأي ختمة، ستظهر هنا للرجوع إليها سريعاً في أي وقت.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentKhatmas.map((item) => (
                <Link
                  key={item.id}
                  href={`/khatma/${item.id}`}
                  className="block interactive-card p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#0D1F1A] border border-[#E6DEC8] dark:border-[#1E3A31] shadow-xs group"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h3 className="text-sm font-semibold text-[#0F2922] dark:text-[#F4EFE6] truncate group-hover:text-[#B48327] dark:group-hover:text-[#E8D39E] transition-colors">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-[#4A5D54] dark:text-[#A6B8B0]">
                        {item.targetDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#7D9087]" />
                            <span className="tabular-nums">{formatDateArabic(item.targetDate)}</span>
                          </span>
                        )}
                        {item.lastVisitedAt && (
                          <span className="text-[#7D9087] text-[11px]">
                            {formatRelativeTime(item.lastVisitedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-[#FBF8F3] dark:bg-[#142C24] group-hover:bg-[#FDF6E7] dark:group-hover:bg-[#B48327]/25 text-[#4A5D54] dark:text-[#E8D39E] group-hover:text-[#B48327] flex items-center justify-center shrink-0 transition-colors">
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Product Features Summary */}
        <section aria-label="مميزات ختمة" className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
          <div className="p-4 rounded-xl bg-white dark:bg-[#0D1F1A] border border-[#E6DEC8] dark:border-[#1E3A31] space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] dark:bg-[#0A261B] border border-[#A7F3D0] dark:border-[#15803D]/50 flex items-center justify-center text-[#15803D] dark:text-[#4ADE80] mb-1">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-[#0F2922] dark:text-[#F4EFE6]">توزيع ٣٠ جزءاً</h4>
            <p className="text-[11px] text-[#4A5D54] dark:text-[#A6B8B0] leading-relaxed">
              بطاقة مستقلة لكل جزء توضح السور والآيات ومتابعة مباشرة لمن أتمّ القراءة.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#0D1F1A] border border-[#E6DEC8] dark:border-[#1E3A31] space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-[#FDF6E7] dark:bg-[#1F190D] border border-[#E8D39E] dark:border-[#B48327]/50 flex items-center justify-center text-[#B48327] dark:text-[#E8D39E] mb-1">
              <BookOpen className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-[#0F2922] dark:text-[#F4EFE6]">مصحف عثماني مدمج</h4>
            <p className="text-[11px] text-[#4A5D54] dark:text-[#A6B8B0] leading-relaxed">
              اقرأ الجزء مباشرة داخل التطبيق بالرسم العثماني الموثوق مع حفظ موضع التوقف.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#0D1F1A] border border-[#E6DEC8] dark:border-[#1E3A31] space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFFBEB] dark:bg-[#221A0B] border border-[#FDE68A] dark:border-[#B45309]/50 flex items-center justify-center text-[#B45309] dark:text-[#FBBF24] mb-1">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-[#0F2922] dark:text-[#F4EFE6]">خصوصية و«فاعل خير»</h4>
            <p className="text-[11px] text-[#4A5D54] dark:text-[#A6B8B0] leading-relaxed">
              إمكانية حجز وقراءة الأجزاء دون إظهار الاسم علناً صيانةً للأجر وخلوصاً للنية.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center space-y-3 pt-6 border-t border-[#E6DEC8]/60 dark:border-[#1E3A31] text-xs text-[#7D9087]">
          <p className="font-quran text-sm text-[#0F2922] dark:text-[#E8D39E]">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          <p className="max-w-xs mx-auto leading-relaxed text-[#4A5D54] dark:text-[#A6B8B0]">
            اللهم اجعل القرآن الكريم ربيع قلوبنا، ونور صدورنا، وجلاء أحزاننا، وذهاب همومنا
          </p>
          <p className="text-[11px] text-[#7D9087] pt-1">
            ختمة • صدقة جارية لكل قارئ ومشارك
          </p>
        </footer>
      </main>

      {/* Sheet Modal */}
      <CreateKhatmaSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
    </div>
  );
}
