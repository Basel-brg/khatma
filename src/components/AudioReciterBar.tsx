'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RECITERS, buildAyahAudioUrl } from '../lib/reciters';
import { Play, Pause, SkipBack, SkipForward, Volume2, ChevronDown, Loader2 } from 'lucide-react';
import { toArabicDigits } from './IslamicOrnaments';

// Only stub HTMLMediaElement in Vitest/JSDOM test environment — NEVER in real browsers!
if (
  typeof process !== 'undefined' &&
  process.env.NODE_ENV === 'test' &&
  typeof window !== 'undefined' &&
  typeof window.HTMLMediaElement !== 'undefined'
) {
  try {
    window.HTMLMediaElement.prototype.pause = () => {};
    window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  } catch {}
}

export interface AudioReciterBarProps {
  currentSurahNumber: number;
  currentSurahNameAr?: string;
  currentAyahNumber: number;
  totalAyahsInSurah?: number;
  onNextAyah: () => void;
  onPrevAyah: () => void;
  onAyahEnded?: () => void;
  isDarkMode?: boolean;
  className?: string;
}

export default function AudioReciterBar({
  currentSurahNumber,
  currentSurahNameAr,
  currentAyahNumber,
  onNextAyah,
  onPrevAyah,
  onAyahEnded,
  isDarkMode = false,
  className = '',
}: AudioReciterBarProps) {
  const [selectedReciterId, setSelectedReciterId] = useState<string>('al-dosari');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);
  const [fallbackAttempted, setFallbackAttempted] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentReciter = RECITERS.find((r) => r.id === selectedReciterId) || RECITERS[0];

  const getPrimaryAudioUrl = (reciterId: string, folder: string, surah: number, ayah: number) => {
    if (reciterId === 'islam-sobhi') {
      const surahStr = String(surah).padStart(3, '0');
      return `https://server14.mp3quran.net/islam/Rewayat-Hafs-A-n-Assem/${surahStr}.mp3`;
    }
    return buildAyahAudioUrl(folder, surah, ayah);
  };

  const audioSrc = getPrimaryAudioUrl(
    currentReciter.id,
    currentReciter.folder,
    currentSurahNumber,
    currentAyahNumber
  );

  useEffect(() => {
    setFallbackAttempted(false);
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.src !== audioSrc) {
      audio.src = audioSrc;
      audio.load();
    }

    if (isPlaying) {
      setIsBuffering(true);
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsBuffering(false);
          })
          .catch(() => {
            setIsBuffering(false);
          });
      }
    }
  }, [audioSrc, isPlaying]);

  const handleAudioError = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!fallbackAttempted) {
      setFallbackAttempted(true);
      const fallbackUrl = buildAyahAudioUrl(
        'Alafasy_128kbps',
        currentSurahNumber,
        currentAyahNumber
      );
      audio.src = fallbackUrl;
      audio.load();
      if (isPlaying) {
        audio.play().catch(() => {
          setIsPlaying(false);
          setIsBuffering(false);
        });
      }
    } else {
      setIsPlaying(false);
      setIsBuffering(false);
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) {
      setIsPlaying((prev) => !prev);
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setIsBuffering(false);
    } else {
      if (!audio.src) {
        audio.src = audioSrc;
      }
      setIsPlaying(true);
      setIsBuffering(true);
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsBuffering(false);
          })
          .catch(() => {
            setIsBuffering(false);
          });
      }
    }
  };

  const handleEnded = () => {
    if (selectedReciterId === 'islam-sobhi') {
      setIsPlaying(false);
      return;
    }
    if (onAyahEnded) {
      onAyahEnded();
    } else {
      onNextAyah();
    }
  };

  return (
    <div
      data-testid="audio-reciter-bar"
      className={`sticky bottom-0 z-30 w-full px-3 sm:px-6 pb-3 pt-1 pointer-events-none ${className}`}
      dir="rtl"
    >
      <audio
        ref={audioRef}
        src={audioSrc}
        onEnded={handleEnded}
        onPlaying={() => setIsBuffering(false)}
        onWaiting={() => isPlaying && setIsBuffering(true)}
        onError={handleAudioError}
        preload="none"
      />

      {/* Floating Ayah App Style Pill Bar */}
      <div className="pointer-events-auto mx-auto flex max-w-[500px] items-center justify-between gap-3 rounded-full border border-white/10 bg-[#1C1C1E] px-3.5 py-1.5 text-white shadow-[0_12px_36px_rgba(0,0,0,0.6)] backdrop-blur-md">
        {/* Play/Pause Button on Left (Emerald Green matching Image 2) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10B981] text-white shadow-md hover:bg-[#059669] transition-transform active:scale-95"
            aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل التلاوة'}
          >
            {isBuffering ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={onPrevAyah}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="الآية السابقة"
          >
            <SkipBack className="h-4 w-4" />
          </button>
        </div>

        {/* Reciter Selector in Center (Emerald Green matching Image 2) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsSelectorOpen(!isSelectorOpen)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold text-[#10B981] hover:bg-white/5 transition-colors"
            aria-label="اختيار القارئ"
            aria-haspopup="listbox"
          >
            <span className="truncate max-w-[150px] sm:max-w-none">{currentReciter.nameAr}</span>
            <ChevronDown className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
          </button>

          {isSelectorOpen && (
            <div
              className="absolute bottom-full mb-2.5 right-1/2 translate-x-1/2 w-64 rounded-2xl border border-white/15 bg-[#242426] p-2 shadow-2xl z-50 text-right text-white"
              role="listbox"
            >
              <div className="px-3 py-1.5 text-xs font-bold text-[#10B981] border-b border-white/10 mb-1">
                اختر القارئ
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1">
                {RECITERS.map((reciter) => {
                  const isSelected = reciter.id === selectedReciterId;
                  return (
                    <button
                      key={reciter.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSelectedReciterId(reciter.id);
                        setIsSelectorOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors ${
                        isSelected
                          ? 'bg-[#10B981] text-white font-bold'
                          : 'text-[#E5E5EA] hover:bg-white/10'
                      }`}
                    >
                      <span>{reciter.nameAr}</span>
                      <span
                        className={`text-[10px] ${
                          isSelected ? 'text-white/90' : 'text-[#8E8E93]'
                        }`}
                      >
                        {reciter.styleAr}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Current Ayah indicator & Next Ayah button */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8E8E93] tabular-nums">
            {toArabicDigits(currentAyahNumber)}
          </span>
          <button
            type="button"
            onClick={onNextAyah}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="الآية التالية"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
