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

        // Card styling variants — Illuminated Mushaf Folio palette (Light & Dark)
        let borderClass = 'border-[#E6DEC8] dark:border-[#1E3A31] hover:border-[#B48327] dark:hover:border-[#D4A13E]';
        let bgClass = 'bg-white dark:bg-[#0D1F1A]';
        let badgeClass = 'bg-[#F4EFE6] dark:bg-[#142C24] text-[#0F2922] dark:text-[#E8D39E] border border-[#E6DEC8] dark:border-[#234238]';
        let numberBadgeClass = 'bg-[#F4EFE6] dark:bg-[#142C24] text-[#0F2922] dark:text-[#E8D39E] border border-[#E6DEC8] dark:border-[#234238]';
        let statusText = 'متاح للحجز';

        if (isCompleted) {
          borderClass = 'border-[#A7F3D0] dark:border-[#15803D]/60';
          bgClass = 'bg-[#ECFDF5]/85 dark:bg-[#0A261B]';
          badgeClass = 'bg-[#D1FAE5] dark:bg-[#15803D]/30 text-[#065F46] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#15803D]/50 font-semibold';
          numberBadgeClass = 'bg-[#065F46] dark:bg-[#15803D] text-white';
          statusText = `مكتمل • ${displayHolderName}`;
        } else if (isReservedByMe) {
          borderClass = 'border-[#B48327] dark:border-[#D4A13E] ring-2 ring-[#B48327]/25 dark:ring-[#D4A13E]/30';
          bgClass = 'bg-[#FDF6E7] dark:bg-[#1F190D]';
          badgeClass = 'bg-[#B48327] dark:bg-[#D4A13E] text-white dark:text-[#08130F] font-bold shadow-xs';
          numberBadgeClass = 'bg-[#B48327] dark:bg-[#D4A13E] text-white dark:text-[#08130F]';
          statusText = 'محجوز لك • اقرأ الآن';
        } else if (isReservedByOther) {
          borderClass = 'border-[#FDE68A] dark:border-[#B45309]/50';
          bgClass = 'bg-[#FFFBEB]/80 dark:bg-[#1C160B]';
          badgeClass = 'bg-[#FEF3C7] dark:bg-[#B45309]/25 text-[#92400E] dark:text-[#FDE68A] border border-[#FDE68A] dark:border-[#B45309]/40';
          numberBadgeClass = 'bg-[#FEF3C7] dark:bg-[#B45309]/30 text-[#92400E] dark:text-[#FDE68A]';
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
            className={`interactive-card group relative flex flex-col justify-between rounded-2xl border p-3.5 shadow-xs cursor-pointer select-none ${borderClass} ${bgClass}`}
          >
            {/* Top row: Juz Number and Icon */}
            <div className="flex items-center justify-between gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-xl tabular-nums text-xs font-bold ${numberBadgeClass}`}>
                {meta.number}
              </span>
              <div>
                {isCompleted && (
                  <CheckCircle2 className="h-4 w-4 text-[#15803D]" />
                )}
                {isReservedByMe && (
                  <BookOpen className="h-4 w-4 text-[#B48327]" />
                )}
                {isReservedByOther && (
                  <Lock className="h-3.5 w-3.5 text-[#B45309]" />
                )}
              </div>
            </div>

            {/* Middle: Juz Name & Surah Range */}
            <div className="my-2.5">
              <h4 className="text-base font-bold text-[#0F2922] dark:text-[#F4EFE6] font-quran">
                {meta.nameAr}
              </h4>
              <p className="mt-1 line-clamp-1 text-[11px] text-[#4A5D54] dark:text-[#A6B8B0]">
                من {meta.startSurahName} {meta.startAyah} إلى {meta.endSurahName} {meta.endAyah}
              </p>
            </div>

            {/* Bottom: Status Pill */}
            <div className="mt-auto pt-1">
              <div
                className={`line-clamp-1 rounded-lg px-2 py-1.5 text-center text-[11px] font-medium ${badgeClass}`}
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
