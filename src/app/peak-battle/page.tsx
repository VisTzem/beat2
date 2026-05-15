// src/app/peak-battle/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Swords, ShieldAlert, Users, Home, Lock } from "lucide-react";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function PeakBattleLoginPage() {
  const router = useRouter();
  const [role, setRole] = useState("boss");
  const [selectedGroup, setSelectedGroup] = useState("group1");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return alert("請輸入密碼");

    setIsLoading(true);
    try {
      const hiddenEmail = "vis.tzem.always@gmail.com";
      const userCredential = await signInWithEmailAndPassword(auth, hiddenEmail, password);
      const token = await userCredential.user.getIdToken();

      document.cookie = `tribe_session=${token}; path=/; max-age=3600; SameSite=Strict`;

      if (role === "boss") {
        router.push(`/peak-battle/boss`);
      } else {
        router.push(`/peak-battle/leader?team=${selectedGroup}`);
      }
    } catch (error: any) {
      console.error("Login Error:", error);
      alert("密碼錯誤，請重新輸入！");
    } finally {
      setIsLoading(false);
    }
  };

  const groupNames = ["一", "二", "三", "四", "五", "六"];

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
          <h1 className="guide-title">頂峰之爭登入</h1>
        </header>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="guide-login-box">
          <form onSubmit={handleLogin} className="guide-login-form">

            <div className="flex gap-4 mb-6">
              <button
                type="button"
                onClick={() => setRole("leader")}
                className={`flex-1 py-4 rounded-2xl flex flex-col items-center gap-2 font-black transition-all ${role === 'leader' ? 'bg-stone-900 text-amber-400 shadow-xl scale-105' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
              >
                <Users size={28} />
                <span>我是隊輔</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("boss")}
                className={`flex-1 py-4 rounded-2xl flex flex-col items-center gap-2 font-black transition-all ${role === 'boss' ? 'bg-amber-500 text-stone-900 shadow-xl shadow-amber-500/30 scale-105' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
              >
                <ShieldAlert size={28} />
                <span>我是Boss</span>
              </button>
            </div>

            {role === "leader" && (
              <div className="guide-login-group">
                <label className="guide-label"><Users size={18} className="icon-amber" /> 選擇您的隊伍</label>
                <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="guide-select">
                  {Array.from({ length: 6 }, (_, i) => `group${i + 1}`).map((key, i) => (
                    <option key={key} value={key}>第 {groupNames[i]} 小組</option>
                  ))}
                </select>
              </div>
            )}

            <div className="guide-login-group">
              <label className="guide-label"><Lock size={18} /> 房間密碼</label>
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
              {isLoading ? "驗證中..." : <><Swords size={20} /> 進入戰場</>}
            </button>
          </form>
        </motion.div>
      </div>
    </main>
  );
}
