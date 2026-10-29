import { KhatmaDocument, JuzReservation, JuzStatus } from '../types/khatma';
import { createInitialJuzMap } from './quran-meta';

export const SECURITY_LIMITS = {
  KHATMA_ID_MAX_LEN: 100,
  TITLE_MIN_LEN: 2,
  TITLE_MAX_LEN: 120,
  INTENTION_MAX_LEN: 500,
  TARGET_DATE_MAX_LEN: 40,
  READER_NAME_MIN_LEN: 2,
  READER_NAME_MAX_LEN: 80,
  UID_MAX_LEN: 128,
  ISO_DATE_MAX_LEN: 40,
  SEARCH_QUERY_MAX_LEN: 60,
} as const;

// Matches control characters (excluding normal whitespace like \n, \r, \t) and HTML/script brackets
const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;
const HTML_TAG_CHARS_REGEX = /[<>]/g;

// Valid Khatma ID: alphanumeric, underscores, hyphens (1..100 chars)
const KHATMA_ID_REGEX = /^[a-zA-Z0-9_-]{1,100}$/;

// Valid YYYY-MM-DD date format
const TARGET_DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Strips invisible bidi/control characters, HTML angle brackets, and normalizes whitespace.
 */
export function sanitizeText(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(CONTROL_CHARS_REGEX, '')
    .replace(HTML_TAG_CHARS_REGEX, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates and sanitizes a Khatma ID.
 */
export function isValidKhatmaId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  return KHATMA_ID_REGEX.test(id);
}

export function validateKhatmaId(id: unknown): string {
  if (!isValidKhatmaId(id)) {
    throw new Error('معرّف الختمة غير صالح');
  }
  return id;
}

/**
 * Validates and sanitizes Khatma creation inputs.
 */
export function validateCreateKhatmaInput(input: {
  title: unknown;
  intention?: unknown;
  targetDate?: unknown;
}): {
  title: string;
  intention: string;
  targetDate: string;
} {
  const rawTitle = typeof input?.title === 'string' ? input.title : '';
  if (HTML_TAG_CHARS_REGEX.test(rawTitle)) {
    throw new Error('اسم الختمة يحتوي على رموز غير مسموح بها');
  }
  const title = sanitizeText(rawTitle, SECURITY_LIMITS.TITLE_MAX_LEN + 10);
  if (!title || title.length < SECURITY_LIMITS.TITLE_MIN_LEN) {
    throw new Error('يرجى إدخال اسم الختمة (حرفين على الأقل)');
  }
  if (title.length > SECURITY_LIMITS.TITLE_MAX_LEN) {
    throw new Error(`اسم الختمة يجب ألا يتجاوز ${SECURITY_LIMITS.TITLE_MAX_LEN} حرفاً`);
  }

  const rawIntention = typeof input?.intention === 'string' ? input.intention : '';
  if (HTML_TAG_CHARS_REGEX.test(rawIntention)) {
    throw new Error('نص النية يحتوي على رموز غير مسموح بها');
  }
  const intention = sanitizeText(rawIntention, SECURITY_LIMITS.INTENTION_MAX_LEN + 10);
  if (intention.length > SECURITY_LIMITS.INTENTION_MAX_LEN) {
    throw new Error(`نص النية والدعاء يجب ألا يتجاوز ${SECURITY_LIMITS.INTENTION_MAX_LEN} حرفاً`);
  }

  const rawDate = typeof input?.targetDate === 'string' ? input.targetDate.trim() : '';
  if (rawDate && !TARGET_DATE_REGEX.test(rawDate)) {
    throw new Error('صيغة التاريخ غير صالحة (YYYY-MM-DD)');
  }

  return {
    title,
    intention,
    targetDate: rawDate,
  };
}

/**
 * Validates and sanitizes Reader Name for Juz reservation.
 */
export function validateReaderName(rawName: unknown): string {
  if (typeof rawName !== 'string') {
    throw new Error('اسم القارئ مطلوب');
  }
  if (HTML_TAG_CHARS_REGEX.test(rawName)) {
    throw new Error('الاسم يحتوي على رموز غير مسموح بها');
  }
  const sanitized = sanitizeText(rawName, SECURITY_LIMITS.READER_NAME_MAX_LEN + 10);
  if (!sanitized || sanitized.length < SECURITY_LIMITS.READER_NAME_MIN_LEN) {
    throw new Error('يرجى كتابة الاسم الكامل (حرفين على الأقل)');
  }
  if (sanitized.length > SECURITY_LIMITS.READER_NAME_MAX_LEN) {
    throw new Error(`الاسم يجب ألا يتجاوز ${SECURITY_LIMITS.READER_NAME_MAX_LEN} حرفاً`);
  }
  return sanitized;
}

/**
 * Validates a Juz number is an integer between 1 and 30.
 */
export function validateJuzNumber(juzNumber: unknown): number {
  if (typeof juzNumber !== 'number' || !Number.isInteger(juzNumber) || juzNumber < 1 || juzNumber > 30) {
    throw new Error('رقم الجزء يجب أن يكون عدداً صحيحاً بين 1 و 30');
  }
  return juzNumber;
}

/**
 * Validates a UID string.
 */
export function validateUid(uid: unknown): string {
  if (typeof uid !== 'string') {
    throw new Error('معرّف المستخدم غير صالح');
  }
  const trimmed = uid.trim();
  if (!trimmed || trimmed.length > SECURITY_LIMITS.UID_MAX_LEN || /[^\w\-:.]/.test(trimmed)) {
    throw new Error('معرّف المستخدم غير صالح');
  }
  return trimmed;
}

/**
 * Cryptographically strong random string generator using Web Crypto API.
 */
export function generateSecureRandomHex(byteLength = 8): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Fallback only if Web Crypto is unavailable
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

/**
 * Safe prototype-pollution-free JSON parsing and schema sanitization for KhatmaDocument
 * coming from untrusted sources (localStorage, BroadcastChannel, Firestore).
 */
export function sanitizeKhatmaDocument(raw: unknown): KhatmaDocument | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }

  const obj = raw as Record<string, unknown>;
  if (!isValidKhatmaId(obj.id)) {
    return null;
  }

  const title = sanitizeText(obj.title, SECURITY_LIMITS.TITLE_MAX_LEN);
  if (!title) {
    return null;
  }

  const intention = sanitizeText(obj.intention, SECURITY_LIMITS.INTENTION_MAX_LEN);
  const targetDate =
    typeof obj.targetDate === 'string' && TARGET_DATE_REGEX.test(obj.targetDate.trim())
      ? obj.targetDate.trim()
      : '';
  const createdAt =
    typeof obj.createdAt === 'string'
      ? obj.createdAt.slice(0, SECURITY_LIMITS.ISO_DATE_MAX_LEN)
      : new Date().toISOString();
  const creatorUid =
    typeof obj.creatorUid === 'string' && obj.creatorUid.trim().length > 0
      ? obj.creatorUid.trim().slice(0, SECURITY_LIMITS.UID_MAX_LEN)
      : 'anonymous';

  const cleanJuzs = createInitialJuzMap();
  const rawJuzs =
    obj.juzs && typeof obj.juzs === 'object' && !Array.isArray(obj.juzs)
      ? (obj.juzs as Record<string, unknown>)
      : {};

  for (let i = 1; i <= 30; i++) {
    const key = String(i);
    const rj = rawJuzs[key];
    if (rj && typeof rj === 'object' && !Array.isArray(rj)) {
      const juzObj = rj as Record<string, unknown>;
      const status: JuzStatus =
        juzObj.status === 'reserved' || juzObj.status === 'completed'
          ? juzObj.status
          : 'available';

      if (status === 'available') {
        cleanJuzs[key] = {
          number: i,
          status: 'available',
          holderName: null,
          hideName: false,
          holderUid: null,
          reservedAt: null,
          completedAt: null,
        };
      } else {
        const hideName = Boolean(juzObj.hideName);
        const rawHolderName = sanitizeText(juzObj.holderName, SECURITY_LIMITS.READER_NAME_MAX_LEN);
        const holderName = hideName ? 'فاعل خير' : rawHolderName || 'فاعل خير';
        const holderUid =
          typeof juzObj.holderUid === 'string' && juzObj.holderUid.trim().length > 0
            ? juzObj.holderUid.trim().slice(0, SECURITY_LIMITS.UID_MAX_LEN)
            : 'unknown';
        const reservedAt =
          typeof juzObj.reservedAt === 'string' && juzObj.reservedAt.trim().length > 0
            ? juzObj.reservedAt.trim().slice(0, SECURITY_LIMITS.ISO_DATE_MAX_LEN)
            : new Date().toISOString();
        const completedAt =
          status === 'completed'
            ? typeof juzObj.completedAt === 'string' && juzObj.completedAt.trim().length > 0
              ? juzObj.completedAt.trim().slice(0, SECURITY_LIMITS.ISO_DATE_MAX_LEN)
              : new Date().toISOString()
            : null;

        cleanJuzs[key] = {
          number: i,
          status,
          holderName,
          hideName,
          holderUid,
          reservedAt,
          completedAt,
        };
      }
    }
  }

  const reservedCount = Object.values(cleanJuzs).filter((j) => j.status === 'reserved').length;
  const completedCount = Object.values(cleanJuzs).filter((j) => j.status === 'completed').length;

  return {
    id: obj.id,
    title,
    intention,
    targetDate,
    createdAt,
    creatorUid,
    completedCount,
    reservedCount,
    juzs: cleanJuzs,
  };
}
