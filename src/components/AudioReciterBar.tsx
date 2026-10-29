'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RECITERS, buildAyahAudioUrl } from '../lib/reciters';
import { getIslamSobhiAyahTime } from '../lib/islam-sobhi-timings';
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
  const currentTimingRef = useRef<{ startMs: number; endMs: number } | null>(null);

  const currentReciter = RECITERS.find((r) => r.id === selectedReciterId) || RECITERS[0];

  const getPrimaryAudioUrl = (reciterId: string, folder: string, surah: number, ayah: number) => {
    if (reciterId === 'islam-sobhi') {
      const surahStr = String(surah).padStart(3, '0');
      return `https://cdn.mp3quran.net/audio/islam-sobhi/r1/${surahStr}.mp3`;
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

    // For Islam Sobhi: seek to the specific Ayah timestamp
    let isCancelled = false;
    if (selectedReciterId === 'islam-sobhi') {
      getIslamSobhiAyahTime(currentSurahNumber, currentAyahNumber).then((timing) => {
        if (isCancelled) return;
        currentTimingRef.current = timing;
        if (timing && audio) {
          const seekSec = timing.startMs / 1000;
          if (audio.readyState >= 1) {
            audio.currentTime = seekSec;
          } else {
            const onMeta = () => {
              audio.currentTime = seekSec;
              audio.removeEventListener('loadedmetadata', onMeta);
            };
            audio.addEventListener('loadedmetadata', onMeta);
          }
        }
      });
    } else {
      currentTimingRef.current = null;
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

    return () => {
      isCancelled = true;
    };
  }, [audioSrc, isPlaying, selectedReciterId, currentSurahNumber, currentAyahNumber]);

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

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (selectedReciterId === 'islam-sobhi' && currentTimingRef.current && isPlaying) {
      const endSec = currentTimingRef.current.endMs / 1000;
      if (audio.currentTime >= endSec - 0.15) {
        if (onAyahEnded) {
          onAyahEnded();
        } else {
          onNextAyah();
        }
      }
    }
  };

  const handleEnded = () => {
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
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPlaying={() => setIsBuffering(false)}
        onWaiting={() => isPlaying && setIsBuffering(true)}
        onError={handleAudioError}
        preload="none"
      />

      {/* Floating Audio Reciter Pill with Unified Playback Controls */}
      <div
        className={`pointer-events-auto mx-auto flex max-w-[440px] items-center justify-between gap-2.5 rounded-full px-3 py-1.5 backdrop-blur-md transition-colors ${
          isDarkMode
            ? 'border border-[#C5A059]/40 bg-[#07140E]/98 text-white shadow-[0_12px_36px_rgba(0,0,0,0.7)]'
            : 'border border-[#C5A059]/60 bg-white/98 text-[#091B15] shadow-xl'
        }`}
      >
        {/* Unified Playback Cluster: Right Arrow (Next) on the right, Play/Pause in center, Left Arrow (Prev) on the left */}
        <div className="flex items-center gap-1 shrink-0" dir="rtl">
          <button
            type="button"
            onClick={onNextAyah}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              isDarkMode
                ? 'text-white/80 hover:text-white hover:bg-white/10'
                : 'text-[#091B15]/80 hover:text-[#091B15] hover:bg-black/5'
            }`}
            aria-label="الآية التالية"
            title="الآية التالية"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={togglePlay}
            className={`flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-transform active:scale-95 ${
              isDarkMode
                ? 'bg-[#C5A059] text-[#07140E] hover:bg-[#D4A13E]'
                : 'bg-[#091B15] text-white hover:bg-[#143D30]'
            }`}
            aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل التلاوة'}
          >
            {isBuffering ? (
              <Loader2 className="h-4 w-4 animate-spin text-current" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4 fill-current text-current" />
            ) : (
              <Play className="h-4 w-4 fill-current ml-0.5 text-current" />
            )}
          </button>

          <button
            type="button"
            onClick={onPrevAyah}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              isDarkMode
                ? 'text-white/80 hover:text-white hover:bg-white/10'
                : 'text-[#091B15]/80 hover:text-[#091B15] hover:bg-black/5'
            }`}
            aria-label="الآية السابقة"
            title="الآية السابقة"
          >
            <SkipBack className="h-4 w-4" />
          </button>
        </div>

        {/* Reciter Selector in Center */}
        <div className="relative flex-1 flex justify-center">
          <button
            type="button"
            onClick={() => setIsSelectorOpen(!isSelectorOpen)}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold transition-colors ${
              isDarkMode
                ? 'text-white hover:text-[#E8D39E]'
                : 'text-[#091B15] hover:text-[#143D30]'
            }`}
            aria-label="اختيار القارئ"
            aria-haspopup="listbox"
          >
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" />
            <span className="truncate max-w-[130px] sm:max-w-none">{currentReciter.nameAr}</span>
          </button>

          {isSelectorOpen && (
            <div
              className={`absolute bottom-full mb-2.5 right-1/2 translate-x-1/2 w-64 rounded-2xl border p-2 shadow-2xl z-50 text-right ${
                isDarkMode
                  ? 'border-[#C5A059]/40 bg-[#091B15] text-white'
                  : 'border-[#C5A059]/40 bg-white text-[#091B15]'
              }`}
              role="listbox"
            >
              <div
                className={`px-3 py-1.5 text-xs font-bold border-b mb-1 ${
                  isDarkMode
                    ? 'text-[#C5A059] border-[#C5A059]/20'
                    : 'text-[#091B15] border-[#C5A059]/30'
                }`}
              >
                اختر القارئ المفضل
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
                          ? isDarkMode
                            ? 'bg-[#C5A059] text-[#07140E] font-bold'
                            : 'bg-[#091B15] text-white font-bold'
                          : isDarkMode
                          ? 'text-white/80 hover:bg-white/10'
                          : 'text-[#091B15]/80 hover:bg-black/5'
                      }`}
                    >
                      <span>{reciter.nameAr}</span>
                      <span
                        className={`text-[10px] ${
                          isSelected
                            ? isDarkMode
                              ? 'text-[#07140E]/80'
                              : 'text-white/80'
                            : isDarkMode
                            ? 'text-white/50'
                            : 'text-[#091B15]/50'
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

        {/* Current Ayah Indicator */}
        <div className="shrink-0 flex items-center pr-1">
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-bold tabular-nums ${
              isDarkMode
                ? 'bg-white/10 text-[#C5A059]'
                : 'bg-black/5 text-[#091B15]'
            }`}
          >
            آية {toArabicDigits(currentAyahNumber)}
          </span>
        </div>
      </div>
    </div>
  );
}
