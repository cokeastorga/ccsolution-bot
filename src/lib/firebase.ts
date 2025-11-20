// src/lib/firebase.ts

import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ⚠️ Las variables vienen desde .env (local) o Vercel (producción)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY!,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.FIREBASE_PROJECT_ID!,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.FIREBASE_APP_ID!,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Inicializar app
const app = initializeApp(firebaseConfig);

// Analytics solo en navegador
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== "undefined") {
  isSupported().then((ok) => {
    if (ok) analytics = getAnalytics(app);
  });
}

// Servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
