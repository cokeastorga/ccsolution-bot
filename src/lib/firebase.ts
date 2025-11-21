// src/lib/firebase.ts
import { browser } from '$app/environment';
import {
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_STORAGE_BUCKET,
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  PUBLIC_FIREBASE_APP_ID,
  PUBLIC_FIREBASE_MEASUREMENT_ID
} from '$env/static/public';

import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Configuración de Firebase usando SOLO variables públicas (válidas en el cliente)
const firebaseConfig = {
  apiKey: PUBLIC_FIREBASE_API_KEY,
  authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: PUBLIC_FIREBASE_APP_ID,
  measurementId: PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Pequeña validación por si falta algo en el .env
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    '[Firebase] Faltan apiKey o projectId. Revisa las variables PUBLIC_FIREBASE_* en tu .env'
  );
}

// Inicializar app (solo una vez)
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Analytics: solo en navegador y si es soportado
let analytics: Analytics | null = null;

if (browser) {
  isSupported()
    .then((ok) => {
      if (ok) {
        analytics = getAnalytics(app);
      } else {
        console.warn('[Firebase] Analytics no soportado en este entorno');
      }
    })
    .catch((error) => {
      console.warn('[Firebase] Error al inicializar Analytics', error);
    });
}

// Servicios principales
const auth: Auth | null = browser ? getAuth(app) : null;
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, analytics, auth, db, storage };
