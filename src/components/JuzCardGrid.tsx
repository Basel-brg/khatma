'use client';

import React from 'react';
import { JUZ_METADATA } from '../lib/quran-meta';
import { JuzReservation } from '../types/khatma';
import { CornerCrosshairs, KhatmSealStamp, toArabicDigits } from './IslamicOrnaments';

export interface JuzCardGridProps {
  juzs: Record<string, JuzReservation>;
  currentUid: string;
  onSelectReserve: (juzNumber: number) => void;
  onSelectRead: (juzNumber: number) => void;
  onBlockedAccess?: (message: string) => void;
}

export default function JuzCardGrid({
  juzs,
  currentUid,
  onSelectReserve,
  onSelectRead,
  onBlockedAccess,
}: JuzCardGridProps) {
  return (
    <div
      className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 sm:gap-3.5"
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
          juz.status === 'reserved' && Boolean(currentUid && juz.holderUid === currentUid);
        const isCompletedByMe =
          isCompleted && Boolean(currentUid && juz.holderUid === currentUid);
        const isReservedByOther = juz.status === 'reserved' && !isReservedByMe;
        const isCompletedByOther = isCompleted && !isCompletedByMe;

        const canOpen = isAvailable || isReservedByMe || isCompletedByMe;
        const displayHolderName = juz.hideName ? 'فاعل خير' : juz.holderName || 'فاعل خير';

        const handleClick = () => {
          if (isAvailable) {
            onSelectReserve(meta.number);
          } else if (isReservedByMe || isCompletedByMe) {
            onSelectRead(meta.number);
          } else {
            const msg = isCompleted
              ? `هذا الجزء مكتمل بواسطة ${displayHolderName} ولا يمكن فتحه`
              : `هذا الجزء محجوز لـ ${displayHolderName} ولا يمكن فتحه من قبل شخص آخر`;
            if (onBlockedAccess) {
              onBlockedAccess(msg);
            }
          }
        };

        let cellBorderClass =
          'border-[#C5A059]/80 dark:border-[#C5A059]/40 bg-[#F8F5EC] dark:bg-[#0B1914] hover:border-[#8C661E] dark:hover:border-[#E8D39E]';
        if (isCompleted) {
          cellBorderClass =
            'border-[#C5A059]/90 dark:border-[#C5A059]/55 bg-[#F6F2E6] dark:bg-[#091D15]';
        } else if (isReservedByMe) {
          cellBorderClass =
            'border-[#B48327] dark:border-[#E8D39E] ring-1 ring-[#B48327]/50 bg-[#FBF6E8] dark:bg-[#141D14]';
        } else if (isReservedByOther) {
          cellBorderClass =
            'border-[#C5A059]/85 dark:border-[#C5A059]/50 bg-[#F8F4E8] dark:bg-[#111A14]';
        }

        return (
          <div
            key={meta.number}
            data-testid={`juz-card-${meta.number}`}
            onClick={handleClick}
            className={`interactive-card group relative flex flex-col items-center justify-between rounded-[2px] border px-2 pt-3 pb-2.5 min-h-[124px] sm:min-h-[138px] select-none text-center transition-colors ${
              canOpen ? 'cursor-pointer' : 'cursor-not-allowed opacity-95'
            } ${cellBorderClass}`}
            title={
              !canOpen
                ? isCompleted
                  ? `مكتمل بواسطة ${displayHolderName} (لا يمكن فتحه)`
                  : `محجوز لـ ${displayHolderName} (لا يمكن فتحه)`
                : undefined
            }
          >
            {/* 4 Architectural Corner Registration Crosshairs (+) */}
            <CornerCrosshairs />

            {/* Top Ribbon Tab for Reserved States (matching Option 1 mockup) */}
            {(isReservedByMe || isReservedByOther) && (
              <div
                className={`absolute -top-[1px] inset-x-3 sm:inset-x-4 mx-auto rounded-b-md py-0.5 px-2 text-[10px] sm:text-[11px] font-bold shadow-xs ${
                  isReservedByMe
                    ? 'bg-gradient-to-b from-[#15803D] to-[#0F5328] text-white'
                    : 'bg-gradient-to-b from-[#D2AF66] to-[#B68B3A] text-[#091B15]'
                }`}
              >
                {isReservedByMe ? 'محجوز لك' : 'محجوز'}
              </div>
            )}

            {/* Center Content: Either Scalloped Khatm Seal OR Classical Arabic Numeral */}
            {isCompleted ? (
              <div className="my-auto flex flex-col items-center justify-center pt-1">
                <KhatmSealStamp className="w-16 h-16 sm:w-[72px] sm:h-[72px]" />
                <div className="mt-1.5 space-y-0.5">
                  <h4 className="text-[11px] font-bold text-[#0F2922] dark:text-[#E8D39E] font-quran leading-tight">
                    {meta.nameAr}
                  </h4>
                  <p className="text-[10px] font-medium text-[#11382A] dark:text-[#A7F3D0] line-clamp-1">
                    مكتمل • {displayHolderName}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div
                  className={`my-auto flex flex-col items-center justify-center ${
                    isReservedByMe || isReservedByOther ? 'pt-3' : 'pt-1'
                  }`}
                >
                  <span className="font-quran text-3xl sm:text-4xl font-bold leading-none text-[#11221C] dark:text-[#F4EFE6] group-hover:text-[#9A6F1E] dark:group-hover:text-[#E8D39E] transition-colors">
                    {toArabicDigits(meta.number)}
                  </span>
                  <span className="mt-1.5 font-quran text-xs sm:text-sm font-bold text-[#2C3E36] dark:text-[#D4AF61] line-clamp-1">
                    {meta.startSurahName}
                  </span>
                </div>

                {/* Subtle Architectural Metadata Row at Bottom */}
                <div className="w-full pt-1 border-t border-[#C5A059]/25 dark:border-[#C5A059]/20 mt-1">
                  <h4 className="sr-only">{meta.nameAr}</h4>
                  {isReservedByMe ? (
                    <p className="text-[10px] font-bold text-[#15803D] dark:text-[#4ADE80] line-clamp-1">
                      اقرأ الآن • {displayHolderName}
                    </p>
                  ) : isReservedByOther ? (
                    <p className="text-[10px] font-medium text-[#7A5413] dark:text-[#E8D39E] line-clamp-1">
                      {displayHolderName}
                    </p>
                  ) : (
                    <p className="text-[10px] font-medium text-[#5A6B63] dark:text-[#9AB0A6] line-clamp-1">
                      متاح للحجز
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
