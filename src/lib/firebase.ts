import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      ? `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseapp.com`
      : undefined),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      ? `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`
      : undefined),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured()) return null;
  if (!appInstance) {
    appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return appInstance;
}

export function getFirebaseDb(): Firestore | null {
  if (!isFirebaseConfigured()) return null;
  if (!firestoreInstance) {
    const app = getFirebaseApp();
    if (app) {
      firestoreInstance = getFirestore(app);
    }
  }
  return firestoreInstance;
}

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured()) return null;
  if (!authInstance) {
    const app = getFirebaseApp();
    if (app) {
      authInstance = getAuth(app);
    }
  }
  return authInstance;
}
