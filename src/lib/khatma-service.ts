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
        if (khatmaId) {
          if (incomingDoc) {
            memoryKhatmas.set(khatmaId, incomingDoc);
          } else {
            memoryKhatmas.delete(khatmaId);
          }
          notifyLocalSubscribers(khatmaId, incomingDoc || null);
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
    const result: Record<string, KhatmaDocument> = {};
    memoryKhatmas.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DOCS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getLocalKhatma(id: string): KhatmaDocument | null {
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
  memoryKhatmas.set(docData.id, docData);

  if (typeof localStorage !== 'undefined') {
    try {
      const all = loadAllLocalDocs();
      all[docData.id] = docData;
      localStorage.setItem(LOCAL_STORAGE_DOCS_KEY, JSON.stringify(all));
    } catch {}
  }

  notifyLocalSubscribers(docData.id, docData);
  broadcastKhatmaUpdate(docData.id, docData);
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
  juzs['30'] = {
    number: 30,
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
      if (stored) return stored;
      const generated = 'device_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(LOCAL_STORAGE_UID_KEY, generated);
      return generated;
    } catch {}
  }

  if (!inMemoryDeviceUid) {
    inMemoryDeviceUid = 'device_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
  }
  return inMemoryDeviceUid;
}

export async function createKhatma(
  input: { title: string; intention: string; targetDate: string },
  creatorUid: string
): Promise<KhatmaDocument> {
  const trimmedTitle = input.title ? input.title.trim() : '';
  if (!trimmedTitle) {
    throw new Error('عنوان الختمة مطلوب');
  }

  const generatedId = 'khatma_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
  const docData: KhatmaDocument = {
    id: generatedId,
    title: trimmedTitle,
    intention: (input.intention || '').trim(),
    targetDate: input.targetDate || '',
    createdAt: new Date().toISOString(),
    creatorUid,
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
  let unsubFirestore: (() => void) | null = null;

  if (isFirebaseConfigured() && getFirebaseDb()) {
    try {
      const db = getFirebaseDb()!;
      unsubFirestore = onSnapshot(doc(db, 'khatmas', khatmaId), (snap) => {
        if (snap.exists()) {
          const remoteDoc = snap.data() as KhatmaDocument;
          saveLocalKhatma(remoteDoc);
          onData(remoteDoc);
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

  // Immediately send current local state
  const currentLocal = getLocalKhatma(khatmaId);
  onData(currentLocal);

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
  const trimmedName = params.readerName ? params.readerName.trim() : '';
  if (!trimmedName) {
    throw new Error('اسم القارئ مطلوب');
  }
  if (params.juzNumber < 1 || params.juzNumber > 30) {
    throw new Error('رقم الجزء يجب أن يكون بين 1 و 30');
  }

  const juzKey = String(params.juzNumber);
  const now = new Date().toISOString();
  const displayName = params.hideName ? 'فاعل خير' : trimmedName;

  if (isFirebaseConfigured() && getFirebaseDb()) {
    try {
      const db = getFirebaseDb()!;
      const docRef = doc(db, 'khatmas', params.khatmaId);
      const updatedDoc = await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists()) {
          throw new Error('الختمة غير موجودة');
        }
        const current = snap.data() as KhatmaDocument;
        const currentJuz = current.juzs[juzKey];
        if (!currentJuz || currentJuz.status !== 'available') {
          throw new Error('هذا الجزء محجوز بالفعل');
        }

        const newJuzs = {
          ...current.juzs,
          [juzKey]: {
            number: params.juzNumber,
            status: 'reserved' as const,
            holderName: displayName,
            hideName: params.hideName,
            holderUid: params.uid,
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
      saveReaderProfile(trimmedName, params.hideName);
      return updatedDoc;
    } catch (err) {
      if ((err as Error)?.message?.includes('هذا الجزء محجوز بالفعل')) {
        throw err;
      }
      console.warn('Firestore transaction failed, falling back to local store:', err);
    }
  }

  const current = getLocalKhatma(params.khatmaId);
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
      number: params.juzNumber,
      status: 'reserved' as const,
      holderName: displayName,
      hideName: params.hideName,
      holderUid: params.uid,
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
  saveReaderProfile(trimmedName, params.hideName);
  return updatedDoc;
}

export async function completeJuz(params: {
  khatmaId: string;
  juzNumber: number;
  uid: string;
}): Promise<KhatmaDocument> {
  if (params.juzNumber < 1 || params.juzNumber > 30) {
    throw new Error('رقم الجزء يجب أن يكون بين 1 و 30');
  }
  const juzKey = String(params.juzNumber);
  const now = new Date().toISOString();

  if (isFirebaseConfigured() && getFirebaseDb()) {
    try {
      const db = getFirebaseDb()!;
      const docRef = doc(db, 'khatmas', params.khatmaId);
      const updatedDoc = await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists()) {
          throw new Error('الختمة غير موجودة');
        }
        const current = snap.data() as KhatmaDocument;
        const currentJuz = current.juzs[juzKey];
        if (!currentJuz || currentJuz.status !== 'reserved') {
          throw new Error('الجزء غير محجوز حالياً');
        }
        if (currentJuz.holderUid !== params.uid) {
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

  const current = getLocalKhatma(params.khatmaId);
  if (!current) {
    throw new Error('الختمة غير موجودة');
  }

  const currentJuz = current.juzs[juzKey];
  if (!currentJuz || currentJuz.status !== 'reserved') {
    throw new Error('الجزء غير محجوز حالياً');
  }
  if (currentJuz.holderUid !== params.uid) {
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
  if (params.juzNumber < 1 || params.juzNumber > 30) {
    throw new Error('رقم الجزء يجب أن يكون بين 1 و 30');
  }
  const juzKey = String(params.juzNumber);

  if (isFirebaseConfigured() && getFirebaseDb()) {
    try {
      const db = getFirebaseDb()!;
      const docRef = doc(db, 'khatmas', params.khatmaId);
      const updatedDoc = await runTransaction(db, async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists()) {
          throw new Error('الختمة غير موجودة');
        }
        const current = snap.data() as KhatmaDocument;
        const currentJuz = current.juzs[juzKey];
        if (!currentJuz || currentJuz.status === 'available') {
          throw new Error('الجزء غير محجوز بالفعل');
        }
        if (currentJuz.holderUid !== params.uid) {
          throw new Error('لا يمكن إلغاء حجز مستخدم آخر');
        }

        const newJuzs = {
          ...current.juzs,
          [juzKey]: {
            number: params.juzNumber,
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

  const current = getLocalKhatma(params.khatmaId);
  if (!current) {
    throw new Error('الختمة غير موجودة');
  }

  const currentJuz = current.juzs[juzKey];
  if (!currentJuz || currentJuz.status === 'available') {
    throw new Error('الجزء غير محجوز بالفعل');
  }
  if (currentJuz.holderUid !== params.uid) {
    throw new Error('لا يمكن إلغاء حجز مستخدم آخر');
  }

  const newJuzs = {
    ...current.juzs,
    [juzKey]: {
      number: params.juzNumber,
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
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function recordVisitedKhatma(
  docData: Pick<KhatmaDocument, 'id' | 'title' | 'targetDate'>
): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const current = getRecentKhatmas();
    const filtered = current.filter((item) => item.id !== docData.id);
    filtered.unshift({
      id: docData.id,
      title: docData.title,
      targetDate: docData.targetDate || '',
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
        name: typeof parsed.name === 'string' ? parsed.name : '',
        hideName: Boolean(parsed.hideName),
      };
    }
    const lastName = localStorage.getItem(LOCAL_STORAGE_LAST_NAME_KEY);
    if (lastName) {
      return { name: lastName, hideName: false };
    }
  } catch {}
  return { name: '', hideName: false };
}

export function saveReaderProfile(name: string, hideName: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_LAST_NAME_KEY, name);
    localStorage.setItem(
      LOCAL_STORAGE_PROFILE_KEY,
      JSON.stringify({ name, hideName })
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
