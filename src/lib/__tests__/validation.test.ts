import { describe, it, expect, beforeEach } from 'vitest';
import {
  SECURITY_LIMITS,
  sanitizeText,
  isValidKhatmaId,
  validateKhatmaId,
  validateCreateKhatmaInput,
  validateReaderName,
  validateJuzNumber,
  validateUid,
  generateSecureRandomHex,
  sanitizeKhatmaDocument,
} from '../validation';
import {
  createKhatma,
  reserveJuz,
  resetLocalKhatmaStoreForTests,
} from '../khatma-service';
import { buildAyahAudioUrl } from '../reciters';

describe('Security & Input Validation Suite', () => {
  beforeEach(() => {
    resetLocalKhatmaStoreForTests();
  });

  describe('sanitizeText', () => {
    it('strips HTML tags, angle brackets, and invisible bidi/control characters', () => {
      const malicious = '  \u202Eختمة\u0000 <script>alert(1)</script>   رمضان  ';
      const cleaned = sanitizeText(malicious, 100);
      expect(cleaned).not.toContain('<');
      expect(cleaned).not.toContain('>');
      expect(cleaned).not.toContain('\u202E');
      expect(cleaned).not.toContain('\u0000');
      expect(cleaned).toBe('ختمة scriptalert(1)/script رمضان');
    });

    it('enforces maxLength truncation and handles non-strings safely', () => {
      expect(sanitizeText(null, 50)).toBe('');
      expect(sanitizeText(undefined, 50)).toBe('');
      expect(sanitizeText(12345, 50)).toBe('');
      expect(sanitizeText('أ'.repeat(200), 50)).toHaveLength(50);
    });
  });

  describe('validateKhatmaId', () => {
    it('accepts valid alphanumeric/underscore/hyphen IDs and rejects path traversal or XSS payloads', () => {
      expect(isValidKhatmaId('khatma_12345_abcdef')).toBe(true);
      expect(isValidKhatmaId('demo-ramadan')).toBe(true);

      // Path traversal / injection attempts
      expect(isValidKhatmaId('../etc/passwd')).toBe(false);
      expect(isValidKhatmaId('khatma/../../secret')).toBe(false);
      expect(isValidKhatmaId('<script>alert(1)</script>')).toBe(false);
      expect(isValidKhatmaId('a'.repeat(101))).toBe(false);
      expect(isValidKhatmaId('')).toBe(false);
      expect(() => validateKhatmaId('../admin')).toThrow('معرّف الختمة غير صالح');
    });
  });

  describe('validateCreateKhatmaInput', () => {
    it('validates title, intention, and targetDate strictly', () => {
      const valid = validateCreateKhatmaInput({
        title: '  ختمة شهر رمضان المبارك  ',
        intention: '  بنية القبول والرحمة  ',
        targetDate: '2026-11-15',
      });
      expect(valid).toEqual({
        title: 'ختمة شهر رمضان المبارك',
        intention: 'بنية القبول والرحمة',
        targetDate: '2026-11-15',
      });
    });

    it('rejects titles that are too short, too long, or contain HTML brackets', () => {
      expect(() =>
        validateCreateKhatmaInput({ title: 'أ', intention: '', targetDate: '' })
      ).toThrow();

      expect(() =>
        validateCreateKhatmaInput({
          title: 'أ'.repeat(SECURITY_LIMITS.TITLE_MAX_LEN + 1),
          intention: '',
          targetDate: '',
        })
      ).toThrow();

      expect(() =>
        validateCreateKhatmaInput({
          title: 'ختمة <img src=x onerror=alert(1)>',
          intention: '',
          targetDate: '',
        })
      ).toThrow('رموز غير مسموح بها');
    });

    it('rejects intentions exceeding maximum length or containing HTML brackets', () => {
      expect(() =>
        validateCreateKhatmaInput({
          title: 'ختمة النور',
          intention: 'ب'.repeat(SECURITY_LIMITS.INTENTION_MAX_LEN + 1),
          targetDate: '',
        })
      ).toThrow();

      expect(() =>
        validateCreateKhatmaInput({
          title: 'ختمة النور',
          intention: '<script>evil()</script>',
          targetDate: '',
        })
      ).toThrow('رموز غير مسموح بها');
    });

    it('rejects malformed targetDate strings', () => {
      expect(() =>
        validateCreateKhatmaInput({
          title: 'ختمة النور',
          intention: '',
          targetDate: '2026/11/01',
        })
      ).toThrow('صيغة التاريخ غير صالحة');

      expect(() =>
        validateCreateKhatmaInput({
          title: 'ختمة النور',
          intention: '',
          targetDate: '2026-13-45',
        })
      ).toThrow('صيغة التاريخ غير صالحة');
    });
  });

  describe('validateReaderName & validateJuzNumber & validateUid', () => {
    it('enforces reader name bounds and blocks HTML tags', () => {
      expect(validateReaderName('  عبدالله محمد  ')).toBe('عبدالله محمد');
      expect(() => validateReaderName('أ')).toThrow();
      expect(() => validateReaderName('أ'.repeat(SECURITY_LIMITS.READER_NAME_MAX_LEN + 1))).toThrow();
      expect(() => validateReaderName('<svg onload=alert(1)>')).toThrow('رموز غير مسموح بها');
    });

    it('enforces integer Juz numbers in range 1..30', () => {
      expect(validateJuzNumber(1)).toBe(1);
      expect(validateJuzNumber(30)).toBe(30);
      expect(() => validateJuzNumber(0)).toThrow();
      expect(() => validateJuzNumber(31)).toThrow();
      expect(() => validateJuzNumber(5.5)).toThrow();
      expect(() => validateJuzNumber(NaN)).toThrow();
    });

    it('validates UID format and length', () => {
      expect(validateUid('device_a1b2c3d4_m5n6')).toBe('device_a1b2c3d4_m5n6');
      expect(() => validateUid('')).toThrow();
      expect(() => validateUid('uid with spaces and <script>')).toThrow();
      expect(() => validateUid('u'.repeat(129))).toThrow();
    });
  });

  describe('sanitizeKhatmaDocument & Storage Deserialization Hardening', () => {
    it('sanitizes malformed or tampered document objects and recomputes counts accurately', () => {
      const tampered = {
        id: 'khatma_test_1',
        title: '  ختمة   <b>مباركة</b>  ',
        intention: 'نية طيبة',
        targetDate: 'invalid-date-format',
        createdAt: '2026-10-30T00:00:00.000Z',
        creatorUid: 'uid-creator',
        completedCount: 999, // forged count
        reservedCount: -50, // forged count
        extraMaliciousField: 'should-be-dropped',
        juzs: {
          '1': {
            number: 1,
            status: 'reserved',
            holderName: 'القارئ <script>',
            hideName: false,
            holderUid: 'uid-1',
            reservedAt: '2026-10-30T00:00:00.000Z',
            completedAt: null,
          },
          '2': {
            number: 2,
            status: 'invalid_status_value',
            holderName: 'Hacker',
          },
        },
      };

      const sanitized = sanitizeKhatmaDocument(tampered);
      expect(sanitized).not.toBeNull();
      expect(sanitized!.title).toBe('ختمة bمباركة/b');
      expect(sanitized!.targetDate).toBe(''); // invalid date stripped
      expect(sanitized!.reservedCount).toBe(1); // recomputed from actual valid juzs
      expect(sanitized!.completedCount).toBe(0);
      expect(sanitized!.juzs['1'].holderName).toBe('القارئ script');
      expect(sanitized!.juzs['2'].status).toBe('available'); // invalid status reset to available
      expect(sanitized!.juzs['2'].holderName).toBeNull();
      expect((sanitized as any).extraMaliciousField).toBeUndefined();
    });

    it('returns null for objects with invalid IDs or missing titles', () => {
      expect(sanitizeKhatmaDocument(null)).toBeNull();
      expect(sanitizeKhatmaDocument({ id: '../bad', title: 'ختمة' })).toBeNull();
      expect(sanitizeKhatmaDocument({ id: 'valid_id', title: '   ' })).toBeNull();
    });
  });

  describe('generateSecureRandomHex & Service Integration', () => {
    it('generates cryptographically random hex strings of expected length', () => {
      const h1 = generateSecureRandomHex(8);
      const h2 = generateSecureRandomHex(8);
      expect(h1).toMatch(/^[0-9a-f]{16}$/);
      expect(h2).toMatch(/^[0-9a-f]{16}$/);
      expect(h1).not.toBe(h2);
    });

    it('enforces validation inside createKhatma and reserveJuz', async () => {
      await expect(
        createKhatma(
          { title: '<script>alert(1)</script>', intention: '', targetDate: '2026-11-01' },
          'uid_1'
        )
      ).rejects.toThrow('رموز غير مسموح بها');

      const doc = await createKhatma(
        { title: 'ختمة الأمان', intention: 'حفظ الله', targetDate: '2026-11-01' },
        'uid_1'
      );

      await expect(
        reserveJuz({
          khatmaId: doc.id,
          juzNumber: 1,
          readerName: '<b>اسم</b>',
          hideName: false,
          uid: 'uid_2',
        })
      ).rejects.toThrow('رموز غير مسموح بها');
    });
  });

  describe('buildAyahAudioUrl Whitelist Protection', () => {
    it('whitelists reciterFolder and clamps out-of-range surah/ayah numbers', () => {
      const url = buildAyahAudioUrl('../../evil_path', 999, -5);
      expect(url).toBe('https://everyayah.com/data/Alafasy_128kbps/001001.mp3');
    });
  });
});
