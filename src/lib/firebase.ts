// 引入必需的核心功能與資料庫功能
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

// 這是你剛剛貼上的專屬設定 (這裡會自動去讀取 .env.local 裡面的值)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// 確保 Firebase App 只會被初始化一次 (避免在 Next.js 的開發模式中重複報錯)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 【最重要的一行】把資料庫實例建立起來，並 export 出去讓 page.tsx 可以用
export const db = getDatabase(app);
export const auth = getAuth(app);