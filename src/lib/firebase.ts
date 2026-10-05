import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gestao-empresa-obra",
  appId: "1:903580302534:web:ef587c927fdcac7dadebc7",
  apiKey: "AIzaSyAiqAThF5PG8v4gRCgdlxGGo0ZEhho0SpI",
  authDomain: "gestao-empresa-obra.firebaseapp.com",
  storageBucket: "gestao-empresa-obra.firebasestorage.app",
  messagingSenderId: "903580302534",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-gestor360-efb1b887-14e4-43d0-aae6-da51e2c64571");

// Secondary app for admin creating users without signing out
export const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);
