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
import { LogOut, Home, Swords, Heart, Sword, Zap, Save, ShieldAlert, BookOpen, Tag } from "lucide-react";
import Link from "next/link";

const defaultStageNames = ["日月神獸", "炎神獸", "海神獸", "雷神獸"];
const defaultMasters: Record<string, StageMaster> = {};
for (let i = 1; i <= 4; i++) {
  defaultMasters[`master${i}`] = { name: `${defaultStageNames[i-1]}`, stageName: defaultStageNames[i-1], description: '', stamina: 100, strength: 20, magic: 20 };
}

export default function MastersDashboardPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [masters, setMasters] = useState<Record<string, StageMaster>>(defaultMasters);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) router.push('/guide');
      else setIsCheckingAuth(false);
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    goOnline(db);
    const unsubscribe = onValue(ref(db, "masters"), (snapshot) => {
      if (snapshot.val()) setMasters(prev => ({ ...prev, ...snapshot.val() }));
    });
    const handleVisibility = () => { if (document.hidden) goOffline(db); else goOnline(db); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => { unsubscribe(); document.removeEventListener("visibilitychange", handleVisibility); };
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    document.cookie = "tribe_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push('/guide');
  };

  const handleLocalChange = (id: string, field: keyof StageMaster, value: string | number) => {
    setMasters(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleSave = async (id: string) => {
    setIsSaving(id);
    try {
      await update(ref(db, `masters/${id}`), masters[id]);
      setTimeout(() => setIsSaving(null), 1000);
    } catch (error) {
      console.error("Save error:", error);
      alert("儲存失敗，請檢查連線");
      setIsSaving(null);
    }
  };

  if (isCheckingAuth) return (
    <div className="flex items-center justify-center min-h-screen bg-stone-900">
      <div className="flex flex-col items-center gap-4 text-stone-400">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="font-bold">驗證身分中...</p>
      </div>
    </div>
  );

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
                    <h3 className="guide-section-title">{master.stageName || defaultStageNames[index]}</h3>
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* 關卡名稱 */}
                    <div>
                      <label className="text-xs font-extrabold text-stone-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-widest">
                        <Tag size={13}/> 關卡名稱
                      </label>
                      <input
                        type="text"
                        value={master.stageName || ''}
                        onChange={(e) => handleLocalChange(masterId, 'stageName', e.target.value)}
                        className="w-full bg-amber-50 border-2 border-amber-200 focus:border-amber-500 rounded-xl p-3 font-black text-center text-amber-800 outline-none transition-all placeholder:text-amber-300 placeholder:font-normal"
                        placeholder={`第 ${index + 1} 關關卡名稱`}
                      />
                    </div>

                    {/* 關主暱稱 */}
                    <div>
                      <label className="text-xs font-extrabold text-stone-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-widest">
                        <ShieldAlert size={13}/> 關主暱稱
                      </label>
                      <input
                        type="text"
                        value={master.name || ''}
                        onChange={(e) => handleLocalChange(masterId, 'name', e.target.value)}
                        className="w-full bg-stone-100 border-2 border-transparent focus:border-emerald-400 rounded-xl p-3 font-bold text-center text-stone-800 outline-none transition-all"
                        placeholder={`輸入第 ${index + 1} 關關主暱稱`}
                      />
                    </div>

                    {/* 關主簡介 */}
                    <div>
                      <label className="text-xs font-extrabold text-stone-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-widest">
                        <BookOpen size={13}/> 關主簡介
                      </label>
                      <textarea
                        value={master.description || ''}
                        onChange={(e) => handleLocalChange(masterId, 'description', e.target.value)}
                        rows={3}
                        className="w-full bg-stone-100 border-2 border-transparent focus:border-blue-400 rounded-xl p-3 font-medium text-stone-700 outline-none transition-all resize-none text-sm leading-relaxed"
                        placeholder="輸入關主介紹或Boss說明..."
                      />
                    </div>

                    {/* 三圍數值 */}
                    <div>
                      <label className="text-xs font-extrabold text-stone-400 mb-1.5 block uppercase tracking-widest">基礎能力值</label>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col items-center bg-rose-50 p-2 rounded-xl border border-rose-200">
                          <Heart size={16} className="text-rose-500 mb-1"/>
                          <span className="text-[10px] font-bold text-rose-400 mb-1">體力</span>
                          <input type="number" value={master.stamina || 0} onChange={e => handleLocalChange(masterId, 'stamina', Number(e.target.value))} className="w-full bg-white text-center font-black text-rose-600 text-lg rounded-lg py-1 outline-none focus:ring-2 focus:ring-rose-400 border border-transparent" />
                        </div>
                        <div className="flex flex-col items-center bg-amber-50 p-2 rounded-xl border border-amber-200">
                          <Sword size={16} className="text-amber-500 mb-1"/>
                          <span className="text-[10px] font-bold text-amber-400 mb-1">力量</span>
                          <input type="number" value={master.strength || 0} onChange={e => handleLocalChange(masterId, 'strength', Number(e.target.value))} className="w-full bg-white text-center font-black text-amber-600 text-lg rounded-lg py-1 outline-none focus:ring-2 focus:ring-amber-400 border border-transparent" />
                        </div>
                        <div className="flex flex-col items-center bg-cyan-50 p-2 rounded-xl border border-cyan-200">
                          <Zap size={16} className="text-cyan-500 mb-1"/>
                          <span className="text-[10px] font-bold text-cyan-400 mb-1">魔力</span>
                          <input type="number" value={master.magic || 0} onChange={e => handleLocalChange(masterId, 'magic', Number(e.target.value))} className="w-full bg-white text-center font-black text-cyan-600 text-lg rounded-lg py-1 outline-none focus:ring-2 focus:ring-cyan-400 border border-transparent" />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSave(masterId)}
                      disabled={isSaving === masterId}
                      className={`guide-op-btn w-full py-3 mt-1 transition-all ${isSaving === masterId ? 'bg-emerald-500 text-white scale-95' : 'bg-stone-800 text-white hover:bg-stone-700'}`}
                    >
                      {isSaving === masterId ? <><ShieldAlert size={18}/> 已儲存！</> : <><Save size={18}/> 儲存設定</>}
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