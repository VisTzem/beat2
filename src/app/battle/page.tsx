// src/app/battle/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Swords, Lock, Home } from "lucide-react";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function BattleLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return alert("請輸入密碼");
    
    setIsLoading(true);
    try {
      const hiddenEmail = "admin@beat2.com"; 
      const userCredential = await signInWithEmailAndPassword(auth, hiddenEmail, password);
      const token = await userCredential.user.getIdToken();
      
      document.cookie = `tribe_session=${token}; path=/; max-age=3600; SameSite=Strict`;
      router.push(`/battle/panel`);
    } catch (error: any) {
      console.error("Login Error:", error);
      alert("密碼錯誤，請重新輸入！");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="guide-main">
      <Link href="/" className="btn-back-home guide-z-top">
        <Home size={18} /> 返回主選單
      </Link>

      <div className="layout-container guide-layout justify-center">
        <header className="guide-header mt-10">
          <div className="guide-header-icon bg-amber-500 text-stone-900 shadow-[0_0_30px_rgba(245,158,11,0.5)]">
            <Swords size={36} />
          </div>
          <h1 className="guide-title">巔峰之爭對戰台</h1>
        </header>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="guide-login-box">
          <form onSubmit={handleLogin} className="guide-login-form">
            <div className="guide-login-group">
              <label className="guide-label"><Lock size={18} /> 對戰房密碼</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="輸入管理密碼" 
                className="guide-input"
                required
              />
            </div>
            <button type="submit" disabled={isLoading} className="guide-op-btn guide-btn-login bg-amber-500 text-stone-900 hover:bg-amber-400">
              {isLoading ? "驗證中..." : <><Swords size={20}/> 進入對戰面板</>}
            </button>
          </form>
        </motion.div>
      </div>
    </main>
  );
}