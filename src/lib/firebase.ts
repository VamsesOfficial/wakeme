// ============================================================
// src/lib/firebase.ts
// ============================================================

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDrgyV8m7LepKFhcrL_oMrgDVCYw9IicPk",
  authDomain: "wakeme-app-d5ef1.firebaseapp.com",
  projectId: "wakeme-app-d5ef1",
  storageBucket: "wakeme-app-d5ef1.firebasestorage.app",
  messagingSenderId: "784255796573",
  appId: "1:784255796573:web:7d1e04916c848a0396d4b4",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export default app;
