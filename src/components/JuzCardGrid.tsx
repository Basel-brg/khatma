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

        // Card styling variants — Illuminated Mushaf Folio palette
        let borderClass = 'border-[#E6DEC8] hover:border-[#B48327]';
        let bgClass = 'bg-white';
        let badgeClass = 'bg-[#F4EFE6] text-[#0F2922] border border-[#E6DEC8]';
        let numberBadgeClass = 'bg-[#F4EFE6] text-[#0F2922] border border-[#E6DEC8]';
        let statusText = 'متاح للحجز';

        if (isCompleted) {
          borderClass = 'border-[#A7F3D0]';
          bgClass = 'bg-[#ECFDF5]/85';
          badgeClass = 'bg-[#D1FAE5] text-[#065F46] border border-[#A7F3D0] font-semibold';
          numberBadgeClass = 'bg-[#065F46] text-white';
          statusText = `مكتمل • ${displayHolderName}`;
        } else if (isReservedByMe) {
          borderClass = 'border-[#B48327] ring-2 ring-[#B48327]/25';
          bgClass = 'bg-[#FDF6E7]';
          badgeClass = 'bg-[#B48327] text-white font-bold shadow-xs';
          numberBadgeClass = 'bg-[#B48327] text-white';
          statusText = 'محجوز لك • اقرأ الآن';
        } else if (isReservedByOther) {
          borderClass = 'border-[#FDE68A]';
          bgClass = 'bg-[#FFFBEB]/80';
          badgeClass = 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]';
          numberBadgeClass = 'bg-[#FEF3C7] text-[#92400E]';
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
              <h4 className="text-base font-bold text-[#0F2922] font-quran">
                {meta.nameAr}
              </h4>
              <p className="mt-1 line-clamp-1 text-[11px] text-[#4A5D54]">
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
