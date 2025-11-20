// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported  } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCQ6inptt35ogsCCv2ekTnIbihvqYzc8Os",
  authDomain: "chatbot-92330.firebaseapp.com",
  projectId: "chatbot-92330",
  storageBucket: "chatbot-92330.firebasestorage.app",
  messagingSenderId: "838750309874",
  appId: "1:838750309874:web:832f89946160fd7ae3af6b",
  measurementId: "G-SKN94LLZTW"
};
const app = initializeApp(firebaseConfig);

export let analytics: ReturnType<typeof getAnalytics> | null = null;

if (typeof window !== 'undefined') {
  isSupported().then((ok) => {
    if (ok) {
      analytics = getAnalytics(app);
    }
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);