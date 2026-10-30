'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  Check,
  Share2,
  MessageCircle,
  Send,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react';
import { CornerCrosshairs } from './IslamicOrnaments';
import {
  getKhatmaShareUrl,
  getKhatmaShareMessage,
  copyTextToClipboard,
} from '../lib/share';

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  khatmaId: string;
  title: string;
  intention?: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  khatmaId,
  title,
  intention,
}: ShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFullText, setCopiedFullText] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const shareUrl = getKhatmaShareUrl(khatmaId);
  const shareMessage = getKhatmaShareMessage({ title, intention }, shareUrl);
  const hasNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset copied states on open
  useEffect(() => {
    if (isOpen) {
      setCopiedLink(false);
      setCopiedFullText(false);
      setFeedbackMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3000);
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    const success = await copyTextToClipboard(shareUrl);
    if (success) {
      setCopiedLink(true);
      showToast('تم نسخ رابط الختمة بنجاح!');
      setTimeout(() => setCopiedLink(false), 2500);
    } else {
      // Fallback: focus and select the input so the user can easily copy manually
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
        showToast('يرجى الضغط على نسخ أو نسخ الرابط المحدد يدوياً');
      }
    }
  };

  const handleCopyFullText = async () => {
    const success = await copyTextToClipboard(shareMessage);
    if (success) {
      setCopiedFullText(true);
      showToast('تم نسخ نص الدعوة والرابط بنجاح!');
      setTimeout(() => setCopiedFullText(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (!hasNativeShare || !shareUrl) return;
    try {
      await navigator.share({
        title: title || 'ختمة القرآن الكريم',
        text: shareMessage, // Crucial: URL is explicitly in the text so WhatsApp won't drop it
        url: shareUrl,
      });
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        handleCopyLink();
      }
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
    `انضم معنا في ${title || 'ختمة القرآن الكريم'}${intention ? ` - ${intention}` : ''}`
  )}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#081A14]/80 backdrop-blur-xs p-3.5 sm:p-4 touch-manipulation"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      dir="rtl"
    >
      {/* Background click */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Card */}
      <div className="relative w-full max-w-lg mx-auto bg-[#F8F5EC] dark:bg-[#0B1914] rounded-2xl border-2 border-[#C5A059] shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto z-10 text-[#081A14] dark:text-[#F4EFE6]">
        <CornerCrosshairs />

        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#C5A059]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-[#C5A059] bg-[#081A14] text-[#C5A059] flex items-center justify-center shrink-0 shadow-xs">
              <Share2 className="w-5 h-5 text-[#C5A059]" />
            </div>
            <div>
              <h2
                id="share-modal-title"
                className="text-lg sm:text-xl font-bold font-quran text-[#081A14] dark:text-[#C5A059] leading-tight"
              >
                مشاركة رابط الختمة
              </h2>
              <p className="text-xs text-[#4A5D54] dark:text-[#A6B8B0] mt-0.5">
                شارك الرابط مع الأهل والأصدقاء ليتمكنوا من حجز أجزائهم وقراءتها مباشرة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#4A5D54] hover:text-[#081A14] dark:text-[#A6B8B0] dark:hover:text-[#F4EFE6] hover:bg-[#C5A059]/15 transition-colors"
            aria-label="إغلاق نافذة المشاركة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className="mt-3.5 p-2.5 rounded-lg border border-[#2D6A4F] bg-[#E8F5E9] dark:bg-[#0D261D] text-[#1B4332] dark:text-[#A7D7C5] text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <Check className="w-4 h-4 text-[#2D6A4F] dark:text-[#52B788] shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Primary Share Link Input & Copy Button */}
        <div className="mt-4 space-y-2">
          <label
            htmlFor="khatma-share-link"
            className="block text-xs font-bold text-[#081A14] dark:text-[#E8D39E] flex items-center gap-1.5"
          >
            <LinkIcon className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>رابط الختمة المباشر:</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              id="khatma-share-link"
              type="text"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.target.select()}
              className="flex-1 px-3 py-2.5 rounded-lg border border-[#C5A059]/50 bg-white dark:bg-[#081A14] text-base sm:text-xs font-mono text-[#081A14] dark:text-[#E8D39E] focus:outline-hidden focus:ring-2 focus:ring-[#C5A059] dir-ltr text-left selection:bg-[#C5A059]/30"
              dir="ltr"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              data-testid="share-modal-copy-btn"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-[#C5A059] bg-[#C5A059] hover:bg-[#D4B06A] text-[#081A14] font-bold text-xs transition-colors shrink-0 shadow-xs cursor-pointer active:scale-95"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>نسخ الرابط</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Social Share Buttons */}
        <div className="mt-4 pt-4 border-t border-[#C5A059]/20">
          <p className="text-xs font-bold text-[#081A14] dark:text-[#E8D39E] mb-2.5">
            مشاركة سريعة ومباشرة:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#25D366] bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] dark:text-[#25D366] font-bold text-xs transition-colors shadow-xs"
            >
              <MessageCircle className="w-4 h-4" />
              <span>مشاركة عبر واتساب (WhatsApp)</span>
            </a>

            {/* Telegram */}
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#229ED9] bg-[#229ED9]/10 hover:bg-[#229ED9]/20 text-[#229ED9] font-bold text-xs transition-colors shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>مشاركة عبر تيليجرام (Telegram)</span>
            </a>
          </div>

          {/* Native Share button if supported */}
          {hasNativeShare && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="w-full mt-2.5 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#C5A059]/60 bg-[#081A14] hover:bg-[#133328] text-[#E8D39E] font-bold text-xs transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-[#C5A059]" />
              <span>مشاركة عبر تطبيقات الهاتف الأخرى</span>
            </button>
          )}
        </div>

        {/* Formatted Invitation Preview Card */}
        <div className="mt-4 pt-4 border-t border-[#C5A059]/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#081A14] dark:text-[#E8D39E] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>معاينة رسالة الدعوة:</span>
            </span>
            <button
              type="button"
              onClick={handleCopyFullText}
              className="text-[11px] font-bold text-[#C5A059] hover:text-[#D4B06A] underline cursor-pointer"
            >
              {copiedFullText ? '✓ تم نسخ النص كاملاً' : 'نسخ نص الدعوة كاملاً'}
            </button>
          </div>

          <div className="p-3 rounded-lg border border-[#C5A059]/40 bg-[#EFE8D6]/70 dark:bg-[#071510] text-[11px] sm:text-xs text-[#081A14] dark:text-[#D4DFD8] leading-relaxed whitespace-pre-line font-sans select-all">
            {shareMessage}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-5 text-center">
          <p className="text-[11px] text-[#4A5D54] dark:text-[#8D9F96]">
            يمكن لأي شخص فتح الرابط مباشرة وحجز أجزائه وقراءتها دون الحاجة لتسجيل حساب.
          </p>
        </div>
      </div>
    </div>
  );
}
