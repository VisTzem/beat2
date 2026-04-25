// src/app/guide/masters/page.tsx
"use client";

export const runtime = 'edge';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ref, onValue, update, goOnline, goOffline } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { StageMaster } from "@/types";
import { LogOut, Home, Swords, Heart, Sword, Zap, Save, ShieldAlert } from "lucide-react";
import Link from "next/link";

// 預設的 6 位關主資料
const defaultMasters: Record<string, StageMaster> = {};
for (let i = 1; i <= 6; i++) {
  defaultMasters[`master${i}`] = { name: `第 ${i} 關關主`, stamina: 0, strength: 0, magic: 0 };
}

export default function MastersDashboardPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [masters, setMasters] = useState<Record<string, StageMaster>>(defaultMasters);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  // 1. 授權檢查
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/guide');
      } else {
        setIsCheckingAuth(false);
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  // 2. 監聽 Firebase masters 節點資料
  useEffect(() => {
    goOnline(db);
    const unsubscribe = onValue(ref(db, "masters"), (snapshot) => {
      if (snapshot.val()) {
        // 合併 Firebase 的資料與預設資料，確保沒有缺漏欄位
        setMasters(prev => ({ ...prev, ...snapshot.val() }));
      }
    });

    const handleVisibility = () => {
      if (document.hidden) goOffline(db);
      else goOnline(db);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    document.cookie = "tribe_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push('/guide');
  };

  const handleLocalChange = (id: string, field: keyof StageMaster, value: string | number) => {
    setMasters(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleSave = async (id: string) => {
    setIsSaving(id);
    try {
      await update(ref(db, `masters/${id}`), masters[id]);
      // 你可以在這裡加入 Toast 通知，這邊先用簡單的按鈕狀態改變提示
      setTimeout(() => setIsSaving(null), 800);
    } catch (error) {
      console.error("Save error:", error);
      alert("儲存失敗，請檢查連線");
      setIsSaving(null);
    }
  };

  if (isCheckingAuth) {
    return <div className="flex items-center justify-center min-h-screen text-stone-100">正在驗證身分...</div>;
  }

  return (
    <main className="guide-main">

      <Link href="/" className="btn-back-home guide-z-top">
        <Home size={18} /> 返回主選單
      </Link>

      <div className="layout-container guide-layout">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="guide-dashboard w-full">
          
          <div className="guide-status-bar" style={{ marginTop: '2rem' }}>
            <div className="guide-status-info">
              <div className="guide-status-icon"><ShieldAlert size={32} /></div>
              <div>
                <p className="guide-status-subtitle">全域權限</p>
                <h2 className="guide-status-title">關主數值總管中心</h2>
              </div>
            </div>
            <button onClick={handleLogout} className="guide-op-btn guide-btn-logout">
              <LogOut size={18}/> 登出管理員
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-6">
            {Object.keys(defaultMasters).map((masterId, index) => {
              const master = masters[masterId] || defaultMasters[masterId];
              return (
                <div key={masterId} className="guide-card w-full" style={{ maxWidth: '100%' }}>
                  <div className="guide-section-header">
                    <Swords size={24} className="icon-emerald"/>
                    <h3 className="guide-section-title">第 {index + 1} 關關主</h3>
                  </div>
                  
                  <div className="flex flex-col gap-5">
                    {/* 暱稱輸入 */}
                    <div>
                      <label className="text-sm font-extrabold text-stone-500 mb-2 block">關主暱稱</label>
                      <input
                        type="text"
                        value={master.name || ''}
                        onChange={(e) => handleLocalChange(masterId, 'name', e.target.value)}
                        className="w-full bg-stone-100 border-2 border-transparent focus:border-emerald-400 rounded-xl p-3 font-bold text-center text-stone-800 outline-none transition-all"
                        placeholder={`輸入第 ${index + 1} 關關主暱稱`}
                      />
                    </div>

                    {/* 三圍數值輸入 */}
                    <div>
                      <label className="text-sm font-extrabold text-stone-500 mb-2 block">基礎能力值</label>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col items-center bg-rose-50 p-2 rounded-xl border border-rose-200">
                          <Heart size={20} className="text-rose-500 mb-1"/>
                          <input 
                            type="number" 
                            value={master.stamina || 0} 
                            onChange={e => handleLocalChange(masterId, 'stamina', Number(e.target.value))} 
                            className="w-full bg-white text-center font-black text-rose-600 text-lg rounded-lg py-1 outline-none focus:ring-2 focus:ring-rose-400 border border-transparent" 
                          />
                        </div>
                        <div className="flex flex-col items-center bg-amber-50 p-2 rounded-xl border border-amber-200">
                          <Sword size={20} className="text-amber-500 mb-1"/>
                          <input 
                            type="number" 
                            value={master.strength || 0} 
                            onChange={e => handleLocalChange(masterId, 'strength', Number(e.target.value))} 
                            className="w-full bg-white text-center font-black text-amber-600 text-lg rounded-lg py-1 outline-none focus:ring-2 focus:ring-amber-400 border border-transparent" 
                          />
                        </div>
                        <div className="flex flex-col items-center bg-cyan-50 p-2 rounded-xl border border-cyan-200">
                          <Zap size={20} className="text-cyan-500 mb-1"/>
                          <input 
                            type="number" 
                            value={master.magic || 0} 
                            onChange={e => handleLocalChange(masterId, 'magic', Number(e.target.value))} 
                            className="w-full bg-white text-center font-black text-cyan-600 text-lg rounded-lg py-1 outline-none focus:ring-2 focus:ring-cyan-400 border border-transparent" 
                          />
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleSave(masterId)} 
                      disabled={isSaving === masterId} 
                      className={`guide-op-btn w-full py-3 mt-2 ${isSaving === masterId ? 'bg-emerald-500 text-white' : 'bg-stone-800 text-white hover:bg-stone-700'}`}
                    >
                      {isSaving === masterId ? <><ShieldAlert size={18}/> 已儲存</> : <><Save size={18}/> 儲存關主設定</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </main>
  );
}