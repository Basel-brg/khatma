'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RECITERS, buildAyahAudioUrl } from '../lib/reciters';
import { Play, Pause, SkipBack, SkipForward, Volume2, UserCheck, ChevronDown, Loader2 } from 'lucide-react';

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
  className?: string;
}

export default function AudioReciterBar({
  currentSurahNumber,
  currentSurahNameAr,
  currentAyahNumber,
  onNextAyah,
  onPrevAyah,
  onAyahEnded,
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
      // Islam Sobhi full surah high-availability stream on MP3Quran CDN
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

  // Sync audio source and playback when ayah, surah, or reciter changes
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
    // If Islam Sobhi (Surah-level audio), stop at end of Surah; otherwise advance to next Ayah
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
      className={`sticky bottom-0 z-30 w-full border-t border-[#E6DEC8]/30 bg-[#0F2922] text-white px-3 sm:px-5 py-2.5 shadow-2xl ${className}`}
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

      <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 sm:gap-4">
        {/* Reciter Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsSelectorOpen(!isSelectorOpen)}
            className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-white/15 bg-white/10 px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm font-medium text-[#FDF6E7] hover:bg-white/15"
            aria-label="اختيار القارئ"
            aria-haspopup="listbox"
          >
            <UserCheck className="h-4 w-4 text-[#E8D39E] shrink-0" />
            <span className="truncate max-w-[115px] sm:max-w-none">{currentReciter.nameAr}</span>
            <ChevronDown className="h-3.5 w-3.5 text-white/70 shrink-0" />
          </button>

          {isSelectorOpen && (
            <div
              className="absolute bottom-full mb-2 right-0 w-60 rounded-2xl border border-[#E6DEC8] bg-[#FBF8F3] p-1.5 shadow-2xl z-50 text-right text-[#0F2922]"
              role="listbox"
            >
              <div className="px-3 py-1.5 text-[11px] font-bold text-[#4A5D54] border-b border-[#E6DEC8]/60 mb-1">
                اختر القارئ المفضل
              </div>
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
                        ? 'bg-[#0F2922] text-white font-bold'
                        : 'text-[#0F2922] hover:bg-[#F4EFE6]'
                    }`}
                  >
                    <span>{reciter.nameAr}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-[#E8D39E]' : 'text-[#4A5D54]'}`}>
                      {reciter.styleAr}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Current Ayah Info */}
        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-[#FDF6E7]/90">
          <Volume2 className={`h-4 w-4 text-[#E8D39E] shrink-0 ${isPlaying ? 'animate-pulse' : ''}`} />
          <span className="truncate">
            {currentSurahNameAr ? `${currentSurahNameAr} • ` : ''}
            الآية <strong className="text-white tabular-nums">{currentAyahNumber}</strong>
          </span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Previous Ayah */}
          <button
            type="button"
            onClick={onPrevAyah}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20"
            aria-label="الآية السابقة"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          {/* Play/Pause */}
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-[#B48327] text-white shadow-md hover:bg-[#9d701e]"
            aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل التلاوة'}
          >
            {isBuffering ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current" />
            )}
          </button>

          {/* Next Ayah */}
          <button
            type="button"
            onClick={onNextAyah}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20"
            aria-label="الآية التالية"
          >
            <SkipBack className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
