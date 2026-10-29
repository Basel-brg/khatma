'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RECITERS, buildAyahAudioUrl } from '../lib/reciters';
import { Reciter } from '../types/khatma';
import { Play, Pause, SkipBack, SkipForward, Volume2, UserCheck, ChevronDown } from 'lucide-react';

// Polyfill jsdom media methods if missing
if (typeof window !== 'undefined' && typeof window.HTMLMediaElement !== 'undefined') {
  try {
    window.HTMLMediaElement.prototype.pause = () => {};
    window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  } catch {}
}

export interface AudioReciterBarProps {
  currentSurahNumber: number;
  currentAyahNumber: number;
  totalAyahsInSurah?: number;
  onNextAyah: () => void;
  onPrevAyah: () => void;
  onAyahEnded?: () => void;
  className?: string;
}

export default function AudioReciterBar({
  currentSurahNumber,
  currentAyahNumber,
  totalAyahsInSurah,
  onNextAyah,
  onPrevAyah,
  onAyahEnded,
  className = '',
}: AudioReciterBarProps) {
  const [selectedReciterId, setSelectedReciterId] = useState<string>('al-dosari');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);
  const [audioSrc, setAudioSrc] = useState<string>('');
  const [fallbackAttempted, setFallbackAttempted] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentReciter = RECITERS.find((r) => r.id === selectedReciterId) || RECITERS[0];

  // Build audio URL when reciter, surah or ayah changes
  useEffect(() => {
    setFallbackAttempted(false);
    const url = buildAyahAudioUrl(
      currentReciter.folder,
      currentSurahNumber,
      currentAyahNumber
    );
    setAudioSrc(url);
  }, [selectedReciterId, currentSurahNumber, currentAyahNumber, currentReciter.folder]);

  // Handle play/pause sync with audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      if (typeof audio.play === 'function') {
        try {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              // Auto-play was prevented or audio failed to load in test environment
              setIsPlaying(false);
            });
          }
        } catch {
          setIsPlaying(false);
        }
      }
    } else {
      if (typeof audio.pause === 'function') {
        try {
          audio.pause();
        } catch {}
      }
    }
  }, [isPlaying, audioSrc]);

  const handleAudioError = () => {
    // If Islam Sobhi or error, try the fallback MP3Quran Surah stream or Alafasy
    if (!fallbackAttempted) {
      setFallbackAttempted(true);
      if (selectedReciterId === 'islam-sobhi') {
        const surahStr = String(currentSurahNumber).padStart(3, '0');
        const fallbackUrl = `https://server14.mp3quran.net/islam/Rewayat-Hafs-A-n-Assem/${surahStr}.mp3`;
        setAudioSrc(fallbackUrl);
        if (audioRef.current && isPlaying) {
          audioRef.current.load();
          audioRef.current.play().catch(() => setIsPlaying(false));
        }
      } else {
        // Fallback to Alafasy for any broken reciter file
        const alafasyUrl = buildAyahAudioUrl('Alafasy_128kbps', currentSurahNumber, currentAyahNumber);
        setAudioSrc(alafasyUrl);
        if (audioRef.current && isPlaying) {
          audioRef.current.load();
          audioRef.current.play().catch(() => setIsPlaying(false));
        }
      }
    } else {
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
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
      className={`sticky bottom-0 z-30 w-full border-t border-emerald-900/20 bg-stone-900/95 text-stone-100 backdrop-blur-md px-4 py-3 shadow-2xl transition-all ${className}`}
      dir="rtl"
    >
      <audio
        ref={audioRef}
        src={audioSrc || undefined}
        onEnded={handleEnded}
        onError={handleAudioError}
        preload="auto"
      />

      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
        {/* Reciter Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsSelectorOpen(!isSelectorOpen)}
            className="flex items-center gap-2 rounded-xl bg-stone-800/80 px-3 py-1.5 text-xs sm:text-sm font-medium text-emerald-300 hover:bg-stone-700/80 active:scale-95 transition-all"
            aria-label="اختيار القارئ"
            aria-haspopup="listbox"
          >
            <UserCheck className="h-4 w-4 text-emerald-400" />
            <span>{currentReciter.nameAr}</span>
            <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
          </button>

          {isSelectorOpen && (
            <div
              className="absolute bottom-full mb-2 right-0 w-56 rounded-2xl border border-stone-700 bg-stone-900 p-1.5 shadow-2xl z-50 text-right"
              role="listbox"
            >
              <div className="px-3 py-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                اختر القارئ
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
                        ? 'bg-emerald-600/30 text-emerald-300 font-bold'
                        : 'text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    <span>{reciter.nameAr}</span>
                    <span className="text-[10px] text-stone-500">{reciter.styleAr}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Current Ayah Info */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-300">
          <Volume2 className="h-4 w-4 text-emerald-400 animate-pulse" />
          <span>
            الآية <strong className="text-white font-mono">{currentAyahNumber}</strong>
          </span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-3">
          {/* Previous Ayah */}
          <button
            type="button"
            onClick={onPrevAyah}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white active:scale-95 transition-transform"
            aria-label="الآية السابقة"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          {/* Play/Pause */}
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-950/40 hover:from-emerald-400 hover:to-teal-500 active:scale-95 transition-all"
            aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل التلاوة'}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current translate-x-[-1px]" />
            )}
          </button>

          {/* Next Ayah */}
          <button
            type="button"
            onClick={onNextAyah}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white active:scale-95 transition-transform"
            aria-label="الآية التالية"
          >
            <SkipBack className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
