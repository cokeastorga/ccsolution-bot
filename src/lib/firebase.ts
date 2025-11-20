// src/lib/firebase.ts
import { browser } from '$app/environment';
import { env as publicEnv } from '$env/dynamic/public';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: publicEnv.PUBLIC_FIREBASE_API_KEY,
  authDomain: publicEnv.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: publicEnv.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: publicEnv.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: publicEnv.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: publicEnv.PUBLIC_FIREBASE_APP_ID,
  measurementId: publicEnv.PUBLIC_FIREBASE_MEASUREMENT_ID
};

// 👀 Debug: ver en consola qué está tomando
console.log('[Firebase config]', firebaseConfig);

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    '[Firebase] Faltan apiKey o projectId. Revisa PUBLIC_FIREBASE_* en .env'
  );
}

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Analytics solo en navegador
export let analytics: Analytics | null = null;
if (browser) {
  isSupported().then((ok) => {
    if (ok) {
      analytics = getAnalytics(app);
    }
  });
}

// Servicios
export const auth: Auth | null = browser ? getAuth(app) : null;
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
