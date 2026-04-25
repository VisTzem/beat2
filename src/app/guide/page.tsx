// src/app/guide/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, Users, LayoutDashboard, Home, Lock } from "lucide-react";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function GuideLoginPage() {
  const router = useRouter();
  const [selectedGroup, setSelectedGroup] = useState("group1");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return alert("請輸入密碼");
    
    setIsLoading(true);
    try {
      // 使用你在 Firebase 設定的管理員信箱
      const hiddenEmail = "admin@beat2.com"; 
      
      const userCredential = await signInWithEmailAndPassword(auth, hiddenEmail, password);
      const token = await userCredential.user.getIdToken();
      
      // 發放通行證 Cookie 給 Middleware 看
      document.cookie = `tribe_session=${token}; path=/; max-age=3600; SameSite=Strict`;
      
      // 判斷跳轉邏輯：如果是關主管理就跳轉到 masters，否則跳轉到對應組別
      if (selectedGroup === "masters") {
        router.push(`/guide/masters`);
      } else {
        router.push(`/guide/${selectedGroup}`);
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

      <div className="layout-container guide-layout">
        <header className="guide-header">
          <div className="guide-header-icon">
            <LayoutDashboard size={36} />
          </div>
          <h1 className="guide-title">部落控制終端</h1>
        </header>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="guide-login-box">
          <form onSubmit={handleLogin} className="guide-login-form">
            <div className="guide-login-group">
              <label className="guide-label"><Users size={18} className="icon-amber"/> 選擇管理單位</label>
              <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="guide-select">
                <optgroup label="部落隊輔管理">
                  {Array.from({length: 6}, (_, i) => `group${i+1}`).map((key, i) => (
                    <option key={key} value={key}>第 {groupNames[i]} 小組</option>
                  ))}
                </optgroup>
                <optgroup label="全域關主設定">
                  <option value="masters">⚔️ 關主數值總管</option>
                </optgroup>
              </select>
            </div>
            
            <div className="guide-login-group">
              <label className="guide-label"><Lock size={18} /> 通行密碼</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="輸入管理密碼" 
                className="guide-input"
                required
              />
            </div>
            <button type="submit" disabled={isLoading} className="guide-op-btn guide-btn-login">
              {isLoading ? "驗證中..." : <><ShieldCheck size={20}/> 啟動控制台</>}
            </button>
          </form>
        </motion.div>
      </div>
    </main>
  );
}