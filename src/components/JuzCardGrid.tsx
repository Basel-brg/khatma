'use client';

import React from 'react';
import { JUZ_METADATA } from '../lib/quran-meta';
import { JuzReservation } from '../types/khatma';
import { CheckCircle2, BookOpen, Clock, Lock } from 'lucide-react';

export interface JuzCardGridProps {
  juzs: Record<string, JuzReservation>;
  currentUid: string;
  onSelectReserve: (juzNumber: number) => void;
  onSelectRead: (juzNumber: number) => void;
}

export default function JuzCardGrid({
  juzs,
  currentUid,
  onSelectReserve,
  onSelectRead,
}: JuzCardGridProps) {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3"
      dir="rtl"
    >
      {JUZ_METADATA.map((meta) => {
        const juz = juzs[String(meta.number)] || {
          number: meta.number,
          status: 'available',
          holderName: null,
          hideName: false,
          holderUid: null,
          reservedAt: null,
          completedAt: null,
        };

        const isAvailable = juz.status === 'available';
        const isCompleted = juz.status === 'completed';
        const isReservedByMe =
          juz.status === 'reserved' && !!currentUid && juz.holderUid === currentUid;
        const isReservedByOther = juz.status === 'reserved' && !isReservedByMe;

        // Determine displayed holder name
        const displayHolderName = juz.hideName ? 'فاعل خير' : juz.holderName || 'فاعل خير';

        // Card styling variants
        let borderClass = 'border-stone-200 dark:border-stone-800 hover:border-emerald-500/50';
        let bgClass = 'bg-white dark:bg-stone-900/90';
        let badgeClass = 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300';
        let statusText = 'متاح للحجز';

        if (isCompleted) {
          borderClass = 'border-emerald-500/40 dark:border-emerald-500/30';
          bgClass = 'bg-emerald-50/40 dark:bg-emerald-950/20';
          badgeClass = 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300';
          statusText = `مكتمل • ${displayHolderName}`;
        } else if (isReservedByMe) {
          borderClass = 'border-amber-500/60 dark:border-amber-500/40 ring-1 ring-amber-500/40';
          bgClass = 'bg-amber-50/50 dark:bg-amber-950/25';
          badgeClass = 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold';
          statusText = 'محجوز لك • اقرأ الآن';
        } else if (isReservedByOther) {
          borderClass = 'border-stone-200 dark:border-stone-800';
          bgClass = 'bg-stone-50/80 dark:bg-stone-900/60 opacity-90';
          badgeClass = 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400';
          statusText = `محجوز • ${displayHolderName}`;
        }

        const handleClick = () => {
          if (isAvailable) {
            onSelectReserve(meta.number);
          } else {
            onSelectRead(meta.number);
          }
        };

        return (
          <div
            key={meta.number}
            data-testid={`juz-card-${meta.number}`}
            onClick={handleClick}
            className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 shadow-sm transition-all duration-150 cursor-pointer select-none active:scale-[0.97] hover:shadow-md ${borderClass} ${bgClass}`}
          >
            {/* Top row: Juz Number and Icon */}
            <div className="flex items-center justify-between gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800 font-mono text-xs font-bold text-stone-700 dark:text-stone-200">
                {meta.number}
              </span>
              <div>
                {isCompleted && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                )}
                {isReservedByMe && (
                  <BookOpen className="h-4 w-4 text-amber-500 animate-pulse" />
                )}
                {isReservedByOther && (
                  <Lock className="h-3.5 w-3.5 text-stone-400" />
                )}
              </div>
            </div>

            {/* Middle: Juz Name & Surah Range */}
            <div className="my-2.5">
              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 font-serif">
                {meta.nameAr}
              </h4>
              <p className="mt-1 line-clamp-1 text-[11px] text-stone-500 dark:text-stone-400">
                من {meta.startSurahName} {meta.startAyah} إلى {meta.endSurahName} {meta.endAyah}
              </p>
            </div>

            {/* Bottom: Status Pill */}
            <div className="mt-auto pt-1">
              <div
                className={`line-clamp-1 rounded-lg px-2 py-1 text-center text-[10px] font-medium transition-colors ${badgeClass}`}
              >
                {statusText}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
