import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  onSnapshot,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { KhatmaDocument, JuzReservation } from '../types/khatma';
import { createInitialJuzMap } from './quran-meta';
import {
  isFirebaseConfigured,
  getFirebaseDb,
  getFirebaseAuth,
} from './firebase';
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
} from './validation';

const LOCAL_STORAGE_DOCS_KEY = 'khatma_docs';
const LOCAL_STORAGE_UID_KEY = 'khatma_device_uid';
const LOCAL_STORAGE_RECENT_KEY = 'khatma_recent_list';
const LOCAL_STORAGE_LAST_NAME_KEY = 'khatma_last_reader_name';
const LOCAL_STORAGE_PROFILE_KEY = 'khatma_reader_profile';

// In-memory fallbacks
const memoryKhatmas = new Map<string, KhatmaDocument>();
const localSubscribers = new Map<string, Set<(doc: KhatmaDocument | null) => void>>();
let inMemoryDeviceUid: string | null = null;
let globalBroadcastChannel: BroadcastChannel | null = null;

// Initialize cross-tab synchronization listeners
if (typeof window !== 'undefined') {
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      globalBroadcastChannel = new BroadcastChannel('khatma_sync_channel');
      globalBroadcastChannel.onmessage = (event) => {
        const { khatmaId, doc: incomingDoc } = event.data || {};
        if (isValidKhatmaId(khatmaId)) {
          if (incomingDoc) {
            const safeDoc = sanitizeKhatmaDocument(incomingDoc);
            if (safeDoc && safeDoc.id === khatmaId) {
              memoryKhatmas.set(khatmaId, safeDoc);
              notifyLocalSubscribers(khatmaId, safeDoc);
            }
          } else {
            memoryKhatmas.delete(khatmaId);
            notifyLocalSubscribers(khatmaId, null);
          }
        }
      };
    } catch {}
  }

  window.addEventListener('storage', (e) => {
    if (e.key === LOCAL_STORAGE_DOCS_KEY) {
      const allDocs = loadAllLocalDocs();
      for (const [id, d] of Object.entries(allDocs)) {
        memoryKhatmas.set(id, d);
        notifyLocalSubscribers(id, d);
      }
    }
  });
}

function notifyLocalSubscribers(khatmaId: string, docData: KhatmaDocument | null): void {
  const subscribers = localSubscribers.get(khatmaId);
  if (subscribers) {
    subscribers.forEach((cb) => {
      try {
        cb(docData ? { ...docData, juzs: { ...docData.juzs } } : null);
      } catch (err) {
        console.error('Error in subscriber callback:', err);
      }
    });
  }
}

function broadcastKhatmaUpdate(khatmaId: string, docData: KhatmaDocument | null): void {
  if (globalBroadcastChannel) {
    try {
      globalBroadcastChannel.postMessage({ khatmaId, doc: docData });
    } catch {}
  }
}

function loadAllLocalDocs(): Record<string, KhatmaDocument> {
  if (typeof localStorage === 'undefined') {
    const result: Record<string, KhatmaDocument> = Object.create(null);
    memoryKhatmas.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DOCS_KEY);
    if (!raw) return Object.create(null);
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return Object.create(null);
    }
    const safeDocs: Record<string, KhatmaDocument> = Object.create(null);
    for (const [key, val] of Object.entries(parsed)) {
      if (isValidKhatmaId(key)) {
        const sanitized = sanitizeKhatmaDocument(val);
        if (sanitized && sanitized.id === key) {
          safeDocs[key] = sanitized;
        }
      }
    }
    return safeDocs;
  } catch {
    return Object.create(null);
  }
}

function getLocalKhatma(id: string): KhatmaDocument | null {
  if (!isValidKhatmaId(id)) {
    return null;
  }
  if (id === 'demo-ramadan' && !memoryKhatmas.has(id)) {
    const demo = createDemoKhatmaDoc();
    saveLocalKhatma(demo);
    return demo;
  }

  if (memoryKhatmas.has(id)) {
    return memoryKhatmas.get(id)!;
  }

  const all = loadAllLocalDocs();
  if (all[id]) {
    memoryKhatmas.set(id, all[id]);
    return all[id];
  }

  if (id === 'demo-ramadan') {
    const demo = createDemoKhatmaDoc();
    saveLocalKhatma(demo);
    return demo;
  }

  return null;
}

function saveLocalKhatma(docData: KhatmaDocument): void {
  const safeDoc = sanitizeKhatmaDocument(docData);
  if (!safeDoc) return;

  memoryKhatmas.set(safeDoc.id, safeDoc);

  if (typeof localStorage !== 'undefined') {
    try {
      const all = loadAllLocalDocs();
      all[safeDoc.id] = safeDoc;
      localStorage.setItem(LOCAL_STORAGE_DOCS_KEY, JSON.stringify(all));
    } catch {}
  }

  notifyLocalSubscribers(safeDoc.id, safeDoc);
  broadcastKhatmaUpdate(safeDoc.id, safeDoc);
}

function createDemoKhatmaDoc(): KhatmaDocument {
  const juzs = createInitialJuzMap();
  juzs['1'] = {
    number: 1,
    status: 'completed',
    holderName: 'أحمد المنصور',
    hideName: false,
    holderUid: 'demo-user-1',
    reservedAt: '2026-03-01T10:00:00.000Z',
    completedAt: '2026-03-02T15:30:00.000Z',
  };
  juzs['2'] = {
    number: 2,
    status: 'completed',
    holderName: 'فاعل خير',
    hideName: true,
    holderUid: 'demo-user-2',
    reservedAt: '2026-03-01T11:00:00.000Z',
    completedAt: '2026-03-02T18:00:00.000Z',
  };
  juzs['3'] = {
    number: 3,
    status: 'reserved',
    holderName: 'سارة العبدالله',
    hideName: false,
    holderUid: 'demo-user-3',
    reservedAt: '2026-03-02T12:00:00.000Z',
    completedAt: null,
  };
  juzs['29'] = {
    number: 29,
    status: 'reserved',
    holderName: 'عمر الشريف',
    hideName: false,
    holderUid: 'demo-user-4',
    reservedAt: '2026-03-02T14:00:00.000Z',
    completedAt: null,
  };

  return {
    id: 'demo-ramadan',
    title: 'ختمة رمضان المبارك التشاركية',
    intention: 'تقبل الله منا ومنكم صالح الأعمال وجعل القرآن ربيع قلوبنا وشفيعاً لنا يوم القيامة',
    targetDate: '2026-04-10',
    createdAt: '2026-03-01T08:00:00.000Z',
    creatorUid: 'demo-system',
    completedCount: 2,
    reservedCount: 2,
    juzs,
  };
}

export async function getDeviceUid(): Promise<string> {
  if (isFirebaseConfigured()) {
    try {
      const auth = getFirebaseAuth();
      if (auth) {
        if (auth.currentUser) {
          return auth.currentUser.uid;
        }
        const cred = await signInAnonymously(auth);
        return cred.user.uid;
      }
    } catch (err) {
      console.warn('Firebase anonymous auth error, falling back to local UID:', err);
    }
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_UID_KEY);
      if (stored && stored.length <= SECURITY_LIMITS.UID_MAX_LEN && /^[\w\-:.]+$/.test(stored)) {
        return stored;
      }
      const generated = 'device_' + generateSecureRandomHex(8) + '_' + Date.now().toString(36);
      localStorage.setItem(LOCAL_STORAGE_UID_KEY, generated);
      return generated;
    } catch {}
  }

  if (!inMemoryDeviceUid) {
    inMemoryDeviceUid = 'device_' + generateSecureRandomHex(8) + '_' + Date.now().toString(36);
  }
  return inMemoryDeviceUid;
}

export async function createKhatma(
  input: { title: string; intention: string; targetDate: string },
  creatorUid: string
): Promise<KhatmaDocument> {
  const validated = validateCreateKhatmaInput(input);
  const validUid = validateUid(creatorUid);

  const generatedId = 'khatma_' + Date.now().toString(36) + '_' + generateSecureRandomHex(6);
  const docData: KhatmaDocument = {
    id: generatedId,
    title: validated.title,
    intention: validated.intention,
    targetDate: validated.targetDate,
    createdAt: new Date().toISOString(),
    creatorUid: validUid,
    completedCount: 0,
    reservedCount: 0,
    juzs: createInitialJuzMap(),
  };

  if (isFirebaseConfigured() && getFirebaseDb()) {
    try {
      const db = getFirebaseDb()!;
      await setDoc(doc(db, 'khatmas', docData.id), docData);
    } catch (err) {
      console.warn('Firestore write failed, saving locally:', err);
    }
  }

  saveLocalKhatma(docData);
  recordVisitedKhatma(docData);
  return docData;
}

export function subscribeToKhatma(
  khatmaId: string,
  onData: (doc: KhatmaDocument | null) => void
): () => void {
  if (!isValidKhatmaId(khatmaId)) {
    onData(null);
    return () => {};
  }

  let unsubFirestore: (() => void) | null = null;

  if (isFirebaseConfigured() && getFirebaseDb()) {
    try {
      const db = getFirebaseDb()!;
      unsubFirestore = onSnapshot(doc(db, 'khatmas', khatmaId), (snap) => {
        if (snap.exists()) {
          const remoteDoc = sanitizeKhatmaDocument(snap.data());
          if (remoteDoc && remoteDoc.id === khatmaId) {
            saveLocalKhatma(remoteDoc);
            onData(remoteDoc);
          } else {
            onData(null);
          }
        } else if (khatmaId === 'demo-ramadan') {
          const demo = getLocalKhatma(khatmaId);
          onData(demo);
        } else {
          onData(null);
        }
      });
    } catch (err) {
      console.warn('Firestore subscription failed, using local subscriber:', err);
    }
  }

  // Register local subscriber for instant offline / fallback data
  let subscribers = localSubscribers.get(khatmaId);
  if (!subscribers) {
    subscribers = new Set();
    localSubscribers.set(khatmaId, subscribers);
  }
  subscribers.add(onData);

  // Immediately send current local state if available in cache/storage
  const currentLocal = getLocalKhatma(khatmaId);
  if (currentLocal) {
    onData(currentLocal);
  } else if (!isFirebaseConfigured() || !getFirebaseDb()) {
    // If Firebase is not configured, local cache is the only source
    onData(null);
  }

  return () => {
    if (unsubFirestore) {
      unsubFirestore();
    }
    const currentSubscribers = localSubscribers.get(khatmaId);
    if (currentSubscribers) {
      currentSubscribers.delete(onData);
      if (currentSubscribers.size === 0) {
        localSubscribers.delete(khatmaId);
      }
    }
  };
}

export async function reserveJuz(params: {
  khatmaId: string;
  juzNumber: number;
  readerName: string;
  hideName: boolean;
  uid: string;
}): Promise<KhatmaDocument> {
  const validKhatmaId = validateKhatmaId(params.khatmaId);
  const validJuzNumber = validateJuzNumber(params.juzNumber);
  const trimmedName = validateReaderName(params.readerName);
  const effectiveUid = params.uid ? params.uid : await getDeviceUid();
  const validUid = validateUid(effectiveUid);
  const hideName = Boolean(params.hideName);

  const juzKey = String(validJuzNumber);
  const now = new Date().toISOString();
  const displayName = hideName ? 'فاعل خير' : trimmedName;

  if (isFirebaseConfigured() && getFirebaseDb()) {
    try {
      const db = getFirebaseDb()!;
      const docRef = doc(db, 'khatmas', validKhatmaId);
      const updatedDoc = await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists()) {
          throw new Error('الختمة غير موجودة');
        }
        const current = sanitizeKhatmaDocument(snap.data());
        if (!current) {
          throw new Error('بيانات الختمة غير صالحة');
        }
        const currentJuz = current.juzs[juzKey];
        if (!currentJuz || currentJuz.status !== 'available') {
          throw new Error('هذا الجزء محجوز بالفعل');
        }

        const newJuzs = {
          ...current.juzs,
          [juzKey]: {
            number: validJuzNumber,
            status: 'reserved' as const,
            holderName: displayName,
            hideName,
            holderUid: validUid,
            reservedAt: now,
            completedAt: null,
          },
        };

        const reservedCount = Object.values(newJuzs).filter((j) => j.status === 'reserved').length;
        const completedCount = Object.values(newJuzs).filter((j) => j.status === 'completed').length;

        const nextDoc: KhatmaDocument = {
          ...current,
          juzs: newJuzs,
          reservedCount,
          completedCount,
        };

        tx.set(docRef, nextDoc);
        return nextDoc;
      });

      saveLocalKhatma(updatedDoc);
      saveReaderProfile(trimmedName, hideName);
      return updatedDoc;
    } catch (err) {
      if ((err as Error)?.message?.includes('هذا الجزء محجوز بالفعل')) {
        throw err;
      }
      console.warn('Firestore transaction failed, falling back to local store:', err);
    }
  }

  const current = getLocalKhatma(validKhatmaId);
  if (!current) {
    throw new Error('الختمة غير موجودة');
  }

  const currentJuz = current.juzs[juzKey];
  if (!currentJuz || currentJuz.status !== 'available') {
    throw new Error('هذا الجزء محجوز بالفعل');
  }

  const newJuzs = {
    ...current.juzs,
    [juzKey]: {
      number: validJuzNumber,
      status: 'reserved' as const,
      holderName: displayName,
      hideName,
      holderUid: validUid,
      reservedAt: now,
      completedAt: null,
    },
  };

  const reservedCount = Object.values(newJuzs).filter((j) => j.status === 'reserved').length;
  const completedCount = Object.values(newJuzs).filter((j) => j.status === 'completed').length;

  const updatedDoc: KhatmaDocument = {
    ...current,
    juzs: newJuzs,
    reservedCount,
    completedCount,
  };

  saveLocalKhatma(updatedDoc);
  saveReaderProfile(trimmedName, hideName);
  return updatedDoc;
}

export async function completeJuz(params: {
  khatmaId: string;
  juzNumber: number;
  uid: string;
}): Promise<KhatmaDocument> {
  const validKhatmaId = validateKhatmaId(params.khatmaId);
  const validJuzNumber = validateJuzNumber(params.juzNumber);
  const effectiveUid = params.uid ? params.uid : await getDeviceUid();
  const validUid = validateUid(effectiveUid);
  const juzKey = String(validJuzNumber);
  const now = new Date().toISOString();

  if (isFirebaseConfigured() && getFirebaseDb()) {
    try {
      const db = getFirebaseDb()!;
      const docRef = doc(db, 'khatmas', validKhatmaId);
      const updatedDoc = await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists()) {
          throw new Error('الختمة غير موجودة');
        }
        const current = sanitizeKhatmaDocument(snap.data());
        if (!current) {
          throw new Error('بيانات الختمة غير صالحة');
        }
        const currentJuz = current.juzs[juzKey];
        if (!currentJuz || currentJuz.status !== 'reserved') {
          throw new Error('الجزء غير محجوز حالياً');
        }

        const isDemo = validKhatmaId === 'demo-ramadan' || currentJuz.holderUid?.startsWith('demo-');
        if (currentJuz.holderUid !== validUid && !isDemo) {
          throw new Error('لا يمكن تأكيد إتمام جزء محجوز لمستخدم آخر');
        }

        const newJuzs = {
          ...current.juzs,
          [juzKey]: {
            ...currentJuz,
            status: 'completed' as const,
            completedAt: now,
          },
        };

        const reservedCount = Object.values(newJuzs).filter((j) => j.status === 'reserved').length;
        const completedCount = Object.values(newJuzs).filter((j) => j.status === 'completed').length;

        const nextDoc: KhatmaDocument = {
          ...current,
          juzs: newJuzs,
          reservedCount,
          completedCount,
        };

        tx.set(docRef, nextDoc);
        return nextDoc;
      });

      saveLocalKhatma(updatedDoc);
      return updatedDoc;
    } catch (err) {
      if (
        (err as Error)?.message?.includes('الجزء غير محجوز') ||
        (err as Error)?.message?.includes('لا يمكن تأكيد')
      ) {
        throw err;
      }
      console.warn('Firestore transaction failed, falling back to local store:', err);
    }
  }

  const current = getLocalKhatma(validKhatmaId);
  if (!current) {
    throw new Error('الختمة غير موجودة');
  }

  const currentJuz = current.juzs[juzKey];
  if (!currentJuz || currentJuz.status !== 'reserved') {
    throw new Error('الجزء غير محجوز حالياً');
  }

  const isDemo = validKhatmaId === 'demo-ramadan' || currentJuz.holderUid?.startsWith('demo-');
  if (currentJuz.holderUid !== validUid && !isDemo) {
    throw new Error('لا يمكن تأكيد إتمام جزء محجوز لمستخدم آخر');
  }

  const newJuzs = {
    ...current.juzs,
    [juzKey]: {
      ...currentJuz,
      status: 'completed' as const,
      completedAt: now,
    },
  };

  const reservedCount = Object.values(newJuzs).filter((j) => j.status === 'reserved').length;
  const completedCount = Object.values(newJuzs).filter((j) => j.status === 'completed').length;

  const updatedDoc: KhatmaDocument = {
    ...current,
    juzs: newJuzs,
    reservedCount,
    completedCount,
  };

  saveLocalKhatma(updatedDoc);
  return updatedDoc;
}

export async function unreserveJuz(params: {
  khatmaId: string;
  juzNumber: number;
  uid: string;
}): Promise<KhatmaDocument> {
  const validKhatmaId = validateKhatmaId(params.khatmaId);
  const validJuzNumber = validateJuzNumber(params.juzNumber);
  const effectiveUid = params.uid ? params.uid : await getDeviceUid();
  const validUid = validateUid(effectiveUid);
  const juzKey = String(validJuzNumber);

  if (isFirebaseConfigured() && getFirebaseDb()) {
    try {
      const db = getFirebaseDb()!;
      const docRef = doc(db, 'khatmas', validKhatmaId);
      const updatedDoc = await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists()) {
          throw new Error('الختمة غير موجودة');
        }
        const current = sanitizeKhatmaDocument(snap.data());
        if (!current) {
          throw new Error('بيانات الختمة غير صالحة');
        }
        const currentJuz = current.juzs[juzKey];
        if (!currentJuz || currentJuz.status === 'available') {
          throw new Error('الجزء غير محجوز بالفعل');
        }
        const isDemo = validKhatmaId === 'demo-ramadan' || currentJuz.holderUid?.startsWith('demo-');
        if (currentJuz.holderUid !== validUid && !isDemo) {
          throw new Error('لا يمكن إلغاء حجز مستخدم آخر');
        }

        const newJuzs = {
          ...current.juzs,
          [juzKey]: {
            number: validJuzNumber,
            status: 'available' as const,
            holderName: null,
            hideName: false,
            holderUid: null,
            reservedAt: null,
            completedAt: null,
          },
        };

        const reservedCount = Object.values(newJuzs).filter((j) => j.status === 'reserved').length;
        const completedCount = Object.values(newJuzs).filter((j) => j.status === 'completed').length;

        const nextDoc: KhatmaDocument = {
          ...current,
          juzs: newJuzs,
          reservedCount,
          completedCount,
        };

        tx.set(docRef, nextDoc);
        return nextDoc;
      });

      saveLocalKhatma(updatedDoc);
      return updatedDoc;
    } catch (err) {
      if (
        (err as Error)?.message?.includes('الجزء غير محجوز') ||
        (err as Error)?.message?.includes('لا يمكن إلغاء')
      ) {
        throw err;
      }
      console.warn('Firestore transaction failed, falling back to local store:', err);
    }
  }

  const current = getLocalKhatma(validKhatmaId);
  if (!current) {
    throw new Error('الختمة غير موجودة');
  }

  const currentJuz = current.juzs[juzKey];
  if (!currentJuz || currentJuz.status === 'available') {
    throw new Error('الجزء غير محجوز بالفعل');
  }
  const isDemo = validKhatmaId === 'demo-ramadan' || currentJuz.holderUid?.startsWith('demo-');
  if (currentJuz.holderUid !== validUid && !isDemo) {
    throw new Error('لا يمكن إلغاء حجز مستخدم آخر');
  }

  const newJuzs = {
    ...current.juzs,
    [juzKey]: {
      number: validJuzNumber,
      status: 'available' as const,
      holderName: null,
      hideName: false,
      holderUid: null,
      reservedAt: null,
      completedAt: null,
    },
  };

  const reservedCount = Object.values(newJuzs).filter((j) => j.status === 'reserved').length;
  const completedCount = Object.values(newJuzs).filter((j) => j.status === 'completed').length;

  const updatedDoc: KhatmaDocument = {
    ...current,
    juzs: newJuzs,
    reservedCount,
    completedCount,
  };

  saveLocalKhatma(updatedDoc);
  return updatedDoc;
}

export function getRecentKhatmas(): Array<{
  id: string;
  title: string;
  targetDate: string;
  lastVisitedAt: string;
}> {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === 'object' && isValidKhatmaId(item.id))
      .map((item) => ({
        id: String(item.id),
        title: sanitizeText(item.title, SECURITY_LIMITS.TITLE_MAX_LEN),
        targetDate: typeof item.targetDate === 'string' ? item.targetDate.slice(0, SECURITY_LIMITS.TARGET_DATE_MAX_LEN) : '',
        lastVisitedAt: typeof item.lastVisitedAt === 'string' ? item.lastVisitedAt.slice(0, SECURITY_LIMITS.ISO_DATE_MAX_LEN) : '',
      }))
      .filter((item) => item.title.length > 0)
      .slice(0, 20);
  } catch {
    return [];
  }
}

export function recordVisitedKhatma(
  docData: Pick<KhatmaDocument, 'id' | 'title' | 'targetDate'>
): void {
  if (typeof localStorage === 'undefined') return;
  if (!docData || !isValidKhatmaId(docData.id)) return;
  const cleanTitle = sanitizeText(docData.title, SECURITY_LIMITS.TITLE_MAX_LEN);
  if (!cleanTitle) return;

  try {
    const current = getRecentKhatmas();
    const filtered = current.filter((item) => item.id !== docData.id);
    filtered.unshift({
      id: docData.id,
      title: cleanTitle,
      targetDate: typeof docData.targetDate === 'string' ? docData.targetDate.slice(0, SECURITY_LIMITS.TARGET_DATE_MAX_LEN) : '',
      lastVisitedAt: new Date().toISOString(),
    });
    localStorage.setItem(LOCAL_STORAGE_RECENT_KEY, JSON.stringify(filtered.slice(0, 20)));
  } catch {}
}

export function getSavedReaderProfile(): { name: string; hideName: boolean } {
  if (typeof localStorage === 'undefined') {
    return { name: '', hideName: false };
  }
  try {
    const rawProfile = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
    if (rawProfile) {
      const parsed = JSON.parse(rawProfile);
      return {
        name: sanitizeText(parsed?.name, SECURITY_LIMITS.READER_NAME_MAX_LEN),
        hideName: Boolean(parsed?.hideName),
      };
    }
    const lastName = localStorage.getItem(LOCAL_STORAGE_LAST_NAME_KEY);
    if (lastName) {
      return { name: sanitizeText(lastName, SECURITY_LIMITS.READER_NAME_MAX_LEN), hideName: false };
    }
  } catch {}
  return { name: '', hideName: false };
}

export function saveReaderProfile(name: string, hideName: boolean): void {
  if (typeof localStorage === 'undefined') return;
  const cleanName = sanitizeText(name, SECURITY_LIMITS.READER_NAME_MAX_LEN);
  if (!cleanName) return;
  try {
    localStorage.setItem(LOCAL_STORAGE_LAST_NAME_KEY, cleanName);
    localStorage.setItem(
      LOCAL_STORAGE_PROFILE_KEY,
      JSON.stringify({ name: cleanName, hideName: Boolean(hideName) })
    );
  } catch {}
}

export function resetLocalKhatmaStoreForTests(): void {
  memoryKhatmas.clear();
  localSubscribers.clear();
  inMemoryDeviceUid = null;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(LOCAL_STORAGE_DOCS_KEY);
      localStorage.removeItem(LOCAL_STORAGE_UID_KEY);
      localStorage.removeItem(LOCAL_STORAGE_RECENT_KEY);
      localStorage.removeItem(LOCAL_STORAGE_LAST_NAME_KEY);
      localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
    } catch {}
  }
}
