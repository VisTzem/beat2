// src/app/battle/panel/page.tsx
"use client";

export const runtime = 'edge';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ref, onValue, update, goOnline, goOffline } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { TribeStats, StageMaster } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Heart, Sword, Zap, Plus, Minus, Home, ShieldAlert, Users, LogOut } from "lucide-react";

export default function BattlePanelPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // 資料狀態
  const [mastersData, setMastersData] = useState<Record<string, StageMaster>>({});
  const [tribesData, setTribesData] = useState<Record<string, TribeStats>>({});
  
  // 選擇狀態
  const [selectedMaster, setSelectedMaster] = useState("master1");
  const [selectedTribe, setSelectedTribe] = useState("group1");
  
  // 輸入狀態
  const [masterInput, setMasterInput] = useState("5");
  const [tribeInput, setTribeInput] = useState("5");
  
  // 確認視窗狀態
  const [confirmAction, setConfirmAction] = useState<any | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) router.push('/battle');
      else setIsCheckingAuth(false);
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    goOnline(db);
    const unSubMasters = onValue(ref(db, 'masters'), (snapshot) => {
      if (snapshot.val()) setMastersData(snapshot.val());
    });
    const unSubTribes = onValue(ref(db, 'tribes'), (snapshot) => {
      if (snapshot.val()) setTribesData(snapshot.val());
    });

    const handleVisibility = () => {
      if (document.hidden) goOffline(db);
      else goOnline(db);
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      unSubMasters();
      unSubTribes();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const handleTrigger = (type: 'master' | 'tribe', stat: keyof TribeStats, currentVal: number, isAdd: boolean) => {
    const amount = parseInt(type === 'master' ? masterInput : tribeInput) || 0;
    if (amount <= 0) return;

    const finalVal = Math.max(0, currentVal + (isAdd ? amount : -amount));
    const targetPath = type === 'master' ? `masters/${selectedMaster}` : `tribes/${selectedTribe}`;
    const label = type === 'master' ? mastersData[selectedMaster]?.name || '關主' : `第 ${selectedTribe.replace('group', '')} 組`;
    const statName = stat === 'stamina' ? '體力' : stat === 'strength' ? '力量' : '魔力';
    const actionName = isAdd ? '增加' : '扣除';

    setConfirmAction({
      path: targetPath,
      updates: { [stat]: finalVal },
      message: `確定要為 ${label}\n${actionName} ${amount} 點 ${statName} 嗎？\n\n(變更後為: ${finalVal})`,
      isMaster: type === 'master'
    });
  };

  const executeAction = async () => {
    if (!confirmAction) return;
    await update(ref(db, confirmAction.path), confirmAction.updates);
    setConfirmAction(null);
  };

  const handleLogout = async () => {
    await auth.signOut();
    document.cookie = "tribe_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push('/');
  };

  if (isCheckingAuth) return <div className="min-h-screen bg-stone-900 text-white flex items-center justify-center">驗證中...</div>;

  const mData = mastersData[selectedMaster] || { stamina: 0, strength: 0, magic: 0, name: '' };
  const tData = tribesData[selectedTribe] || { stamina: 0, strength: 0, magic: 0 };

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden font-sans relative bg-stone-900">
      
      {/* 上半部：關主 (黑底，反轉 180 度給對面看) - 加上 overflow-y-auto */}
      <div className="flex-1 bg-stone-900 text-stone-100 flex flex-col items-center p-3 md:p-4 rotate-180 overflow-y-auto w-full">
        {/* 用 my-auto 讓內容在空間夠大時置中，空間不夠時可以滑動 */}
        <div className="w-full max-w-md my-auto py-2">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-black flex items-center gap-2 text-amber-500"><ShieldAlert /> 關主面板</h2>
            <select value={selectedMaster} onChange={e => setSelectedMaster(e.target.value)} className="bg-stone-800 text-stone-100 px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl font-bold border border-stone-700 outline-none text-sm md:text-base">
              {[1,2,3,4,5,6].map(i => (
                <option key={i} value={`master${i}`}>
                  {mastersData[`master${i}`]?.name || `第 ${i} 關關主`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-between gap-2 mb-4 md:mb-6">
            <div className="flex-1 flex flex-col items-center bg-stone-800 p-2 md:p-3 rounded-xl md:rounded-2xl"><Heart className="text-rose-500 mb-1" size={18}/><span className="text-xs text-stone-400">體力</span><span className="text-xl md:text-2xl font-black text-rose-500">{mData.stamina||0}</span></div>
            <div className="flex-1 flex flex-col items-center bg-stone-800 p-2 md:p-3 rounded-xl md:rounded-2xl"><Sword className="text-amber-500 mb-1" size={18}/><span className="text-xs text-stone-400">力量</span><span className="text-xl md:text-2xl font-black text-amber-500">{mData.strength||0}</span></div>
            <div className="flex-1 flex flex-col items-center bg-stone-800 p-2 md:p-3 rounded-xl md:rounded-2xl"><Zap className="text-cyan-500 mb-1" size={18}/><span className="text-xs text-stone-400">魔力</span><span className="text-xl md:text-2xl font-black text-cyan-500">{mData.magic||0}</span></div>
          </div>

          <div className="bg-stone-800 p-3 md:p-4 rounded-2xl md:rounded-3xl flex flex-col items-center border border-stone-700">
            <label className="text-xs md:text-sm font-bold text-stone-400 mb-2">數值變更額度</label>
            <div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">
              <button onClick={() => setMasterInput(String(Math.max(1, (parseInt(masterInput) || 0) - 1)))} className="bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700 p-2 md:p-3 rounded-xl border border-stone-700 transition-colors flex items-center justify-center">
                <Minus size={20} />
              </button>
              <input type="number" value={masterInput} onChange={e => setMasterInput(e.target.value)} className="text-center text-3xl md:text-4xl font-black bg-stone-900 text-white rounded-xl md:rounded-2xl py-1 px-2 w-20 md:w-28 outline-none border border-stone-700" />
              <button onClick={() => setMasterInput(String((parseInt(masterInput) || 0) + 1))} className="bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700 p-2 md:p-3 rounded-xl border border-stone-700 transition-colors flex items-center justify-center">
                <Plus size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-2 md:gap-3 w-full">
              <div className="flex flex-col gap-1.5 md:gap-2">
                <button onClick={()=>handleTrigger('master', 'stamina', mData.stamina, false)} className="bg-rose-500/20 text-rose-400 py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-black flex justify-center items-center gap-1"><Minus size={18}/> 體力</button>
                <button onClick={()=>handleTrigger('master', 'stamina', mData.stamina, true)} className="bg-rose-500 text-white py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-black flex justify-center items-center gap-1"><Plus size={18}/> 體力</button>
              </div>
              <div className="flex flex-col gap-1.5 md:gap-2">
                <button onClick={()=>handleTrigger('master', 'strength', mData.strength, false)} className="bg-amber-500/20 text-amber-400 py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-black flex justify-center items-center gap-1"><Minus size={18}/> 力量</button>
                <button onClick={()=>handleTrigger('master', 'strength', mData.strength, true)} className="bg-amber-500 text-stone-900 py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-black flex justify-center items-center gap-1"><Plus size={18}/> 力量</button>
              </div>
              <div className="flex flex-col gap-1.5 md:gap-2">
                <button onClick={()=>handleTrigger('master', 'magic', mData.magic, false)} className="bg-cyan-500/20 text-cyan-400 py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-black flex justify-center items-center gap-1"><Minus size={18}/> 魔力</button>
                <button onClick={()=>handleTrigger('master', 'magic', mData.magic, true)} className="bg-cyan-500 text-white py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-black flex justify-center items-center gap-1"><Plus size={18}/> 魔力</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 中間分隔線與按鈕 - 加上 shrink-0 防止被擠壓 */}
      <div className="h-2 md:h-3 w-full bg-amber-500 relative z-20 flex items-center justify-center shadow-2xl shrink-0">
        <button onClick={handleLogout} className="absolute left-4 md:left-6 bg-stone-900 text-stone-100 p-2 md:p-3 rounded-full border-2 border-stone-700 hover:bg-stone-800 shadow-lg z-30 flex items-center gap-2">
          <Home size={20} />
        </button>
        <div className="bg-stone-900 text-amber-400 rounded-full p-2 md:p-3 shadow-lg border-4 border-amber-500 absolute z-30">
          <Swords size={24} className="md:w-8 md:h-8" />
        </div>
      </div>

      {/* 下半部：組員 (白底，正向給自己看) - 加上 overflow-y-auto */}
      <div className="flex-1 bg-[#f5f0e6] text-stone-900 flex flex-col items-center p-3 md:p-4 overflow-y-auto w-full">
        <div className="w-full max-w-md my-auto py-2">
          <div className="flex justify-between items-center mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-black flex items-center gap-2 text-stone-800"><Users /> 部落面板</h2>
            <select value={selectedTribe} onChange={e => setSelectedTribe(e.target.value)} className="bg-white text-stone-800 px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl font-bold border border-stone-300 outline-none text-sm md:text-base">
              {["一","二","三","四","五","六"].map((n, i) => <option key={i} value={`group${i+1}`}>第 {n} 小組</option>)}
            </select>
          </div>

          <div className="flex justify-between gap-2 mb-4 md:mb-6">
            <div className="flex-1 flex flex-col items-center bg-white shadow-sm border border-stone-200 p-2 md:p-3 rounded-xl md:rounded-2xl"><Heart className="text-rose-500 mb-1" size={18}/><span className="text-xs text-stone-500">體力</span><span className="text-xl md:text-2xl font-black text-rose-500">{tData.stamina||0}</span></div>
            <div className="flex-1 flex flex-col items-center bg-white shadow-sm border border-stone-200 p-2 md:p-3 rounded-xl md:rounded-2xl"><Sword className="text-amber-500 mb-1" size={18}/><span className="text-xs text-stone-500">力量</span><span className="text-xl md:text-2xl font-black text-amber-500">{tData.strength||0}</span></div>
            <div className="flex-1 flex flex-col items-center bg-white shadow-sm border border-stone-200 p-2 md:p-3 rounded-xl md:rounded-2xl"><Zap className="text-cyan-500 mb-1" size={18}/><span className="text-xs text-stone-500">魔力</span><span className="text-xl md:text-2xl font-black text-cyan-500">{tData.magic||0}</span></div>
          </div>

          <div className="bg-white p-3 md:p-4 rounded-2xl md:rounded-3xl flex flex-col items-center border border-stone-200 shadow-sm">
            <label className="text-xs md:text-sm font-bold text-stone-500 mb-2">數值變更額度</label>
            <div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">
              <button onClick={() => setTribeInput(String(Math.max(1, (parseInt(tribeInput) || 0) - 1)))} className="bg-white text-stone-500 hover:text-stone-800 hover:bg-stone-100 p-2 md:p-3 rounded-xl border border-stone-200 shadow-sm transition-colors flex items-center justify-center">
                <Minus size={20} />
              </button>
              <input type="number" value={tribeInput} onChange={e => setTribeInput(e.target.value)} className="text-center text-3xl md:text-4xl font-black bg-stone-100 text-stone-800 rounded-xl md:rounded-2xl py-1 px-2 w-20 md:w-28 outline-none border border-stone-200" />
              <button onClick={() => setTribeInput(String((parseInt(tribeInput) || 0) + 1))} className="bg-white text-stone-500 hover:text-stone-800 hover:bg-stone-100 p-2 md:p-3 rounded-xl border border-stone-200 shadow-sm transition-colors flex items-center justify-center">
                <Plus size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-2 md:gap-3 w-full">
              <div className="flex flex-col gap-1.5 md:gap-2">
                <button onClick={()=>handleTrigger('tribe', 'stamina', tData.stamina, false)} className="bg-rose-100 text-rose-600 py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-black flex justify-center items-center gap-1"><Minus size={18}/> 體力</button>
                <button onClick={()=>handleTrigger('tribe', 'stamina', tData.stamina, true)} className="bg-rose-500 text-white py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-black flex justify-center items-center gap-1"><Plus size={18}/> 體力</button>
              </div>
              <div className="flex flex-col gap-1.5 md:gap-2">
                <button onClick={()=>handleTrigger('tribe', 'strength', tData.strength, false)} className="bg-amber-100 text-amber-700 py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-black flex justify-center items-center gap-1"><Minus size={18}/> 力量</button>
                <button onClick={()=>handleTrigger('tribe', 'strength', tData.strength, true)} className="bg-amber-500 text-stone-900 py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-black flex justify-center items-center gap-1"><Plus size={18}/> 力量</button>
              </div>
              <div className="flex flex-col gap-1.5 md:gap-2">
                <button onClick={()=>handleTrigger('tribe', 'magic', tData.magic, false)} className="bg-cyan-100 text-cyan-700 py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-black flex justify-center items-center gap-1"><Minus size={18}/> 魔力</button>
                <button onClick={()=>handleTrigger('tribe', 'magic', tData.magic, true)} className="bg-cyan-500 text-white py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-black flex justify-center items-center gap-1"><Plus size={18}/> 魔力</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 彈出確認視窗：如果是由關主觸發，視窗自動轉 180 度！ */}
      <AnimatePresence>
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`bg-white rounded-[2rem] p-6 md:p-8 max-w-sm w-full shadow-2xl text-center ${confirmAction.isMaster ? 'rotate-180' : ''}`}
            >
              <div className={`mx-auto w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-4 ${confirmAction.isMaster ? 'bg-amber-100 text-amber-600' : 'bg-stone-100 text-stone-600'}`}>
                {confirmAction.isMaster ? <ShieldAlert size={28}/> : <Users size={28}/>}
              </div>
              <h3 className="text-xl md:text-2xl font-black text-stone-900 mb-2">確認變更</h3>
              <p className="text-base md:text-lg font-bold text-stone-600 mb-6 whitespace-pre-line leading-relaxed">{confirmAction.message}</p>
              <div className="flex gap-3 md:gap-4">
                <button onClick={() => setConfirmAction(null)} className="flex-1 py-3 md:py-4 rounded-xl bg-stone-100 text-stone-500 hover:bg-stone-200 font-black transition-colors">取消</button>
                <button onClick={executeAction} className="flex-1 py-3 md:py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-black transition-colors shadow-lg shadow-emerald-500/30">確認執行</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}