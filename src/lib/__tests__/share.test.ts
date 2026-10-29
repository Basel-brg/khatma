import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getKhatmaShareUrl,
  getKhatmaShareMessage,
  copyTextToClipboard,
  shareKhatma,
} from '../share';

describe('Share Utility Functions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getKhatmaShareUrl', () => {
    it('returns empty string for invalid or placeholder khatmaId', () => {
      expect(getKhatmaShareUrl('')).toBe('');
      expect(getKhatmaShareUrl('view')).toBe('');
      expect(getKhatmaShareUrl('invalid id with spaces')).toBe('');
    });

    it('returns valid URL with khatmaId', () => {
      const url = getKhatmaShareUrl('demo-ramadan');
      expect(url).toContain('/khatma/demo-ramadan');
      expect(url).toMatch(/^https?:\/\//);
    });
  });

  describe('getKhatmaShareMessage', () => {
    it('formats invitation message with title and URL isolated on its own line', () => {
      const url = 'https://khatma-a9e15.web.app/khatma/khatma-123';
      const msg = getKhatmaShareMessage(
        { title: 'ختمة عائلة المنصور', intention: 'شفاء الوالدة' },
        url
      );

      expect(msg).toContain('📖 انضم معنا في ختمة عائلة المنصور');
      expect(msg).toContain('🤲 النية: شفاء الوالدة');
      expect(msg).toContain('✨ رابط المشاركة وحجز الأجزاء:\nhttps://khatma-a9e15.web.app/khatma/khatma-123');
      // Ensure the URL is preceded by a newline to avoid Arabic letters sticking to https
      expect(msg.endsWith(url)).toBe(true);
    });

    it('handles missing intention gracefully', () => {
      const url = 'https://khatma-a9e15.web.app/khatma/khatma-123';
      const msg = getKhatmaShareMessage(
        { title: 'ختمة الجمعة' },
        url
      );

      expect(msg).toContain('ختمة الجمعة');
      expect(msg).not.toContain('النية:');
      expect(msg).toContain(url);
    });
  });

  describe('copyTextToClipboard', () => {
    it('uses navigator.clipboard.writeText if available', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      const res = await copyTextToClipboard('https://example.com');
      expect(res).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith('https://example.com');
    });

    it('falls back to document.execCommand if navigator.clipboard fails', async () => {
      const writeTextMock = vi.fn().mockRejectedValue(new Error('Permission denied'));
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      document.execCommand = vi.fn().mockReturnValue(true);

      const res = await copyTextToClipboard('https://example.com');
      expect(res).toBe(true);
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });
  });

  describe('shareKhatma', () => {
    it('includes full message with URL in navigator.share text property', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        share: shareMock,
      });

      const res = await shareKhatma(
        { title: 'ختمة رمضان', intention: 'تقبل الله' },
        'demo-ramadan'
      );

      expect(res.success).toBe(true);
      expect(res.method).toBe('native');
      expect(shareMock).toHaveBeenCalled();
      const callArg = shareMock.mock.calls[0][0];
      expect(callArg.title).toBe('ختمة رمضان');
      // CRITICAL: The URL MUST be contained inside callArg.text so WhatsApp doesn't drop it!
      expect(callArg.text).toContain(callArg.url);
      expect(callArg.url).toContain('/khatma/demo-ramadan');
    });
  });
});
