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
import { Swords, Heart, Sword, Zap, Shield, Home, LogOut, CheckCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function BattlePanelPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // 資料庫資料
  const [mastersData, setMastersData] = useState<Record<string, StageMaster>>({});
  const [tribesData, setTribesData] = useState<Record<string, TribeStats>>({});

  // 當前選擇的小組與神獸
  const [selectedMaster, setSelectedMaster] = useState("master1");
  const [selectedTribe, setSelectedTribe] = useState("group1");

  // 當前選擇的行動
  const [masterAction, setMasterAction] = useState<string>("");
  const [tribeAction, setTribeAction] = useState<string>("");

  // 結算與 Modal 狀態
  const [isSettling, setIsSettling] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultLog, setResultLog] = useState<any | null>(null);

  const groupKeys = ["group1", "group2", "group3", "group4", "group5", "group6"];
  const groupNames = ["一", "二", "三", "四", "五", "六"];
  const beastNames = ["日月神獸", "炎神獸", "海神獸", "雷神獸"];

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

  const handleLogout = async () => {
    await auth.signOut();
    document.cookie = "tribe_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push('/');
  };

  const handleExecuteSettle = async () => {
    if (!masterAction || !tribeAction) return alert("請先選擇雙方的行動！");

    const mStats = mastersData[selectedMaster] || { stamina: 100, strength: 20, magic: 20, name: beastNames[0] };
    const tStats = tribesData[selectedTribe] || { stamina: 30, strength: 10, magic: 10 };

    const mHp = Number(mStats.stamina) || 0;
    const tHp = Number(tStats.stamina) || 0;
    const mStr = Number(mStats.strength) || 0;
    const tStr = Number(tStats.strength) || 0;
    const mMag = Number(mStats.magic) || 0;
    const tMag = Number(tStats.magic) || 0;

    if (mHp <= 0) return alert("該神獸已陣亡，無法進行對戰！");
    if (tHp <= 0) return alert("該小組已陣亡，無法進行對戰！");

    setIsSettling(true);

    let mHpDiff = 0;
    let tHpDiff = 0;
    let mStrDiff = 0;
    let tStrDiff = 0;
    let mMagDiff = 0;
    let tMagDiff = 0;

    // 傷害與數值結算邏輯
    if (masterAction === "physical" && tribeAction === "magic") {
      tHpDiff -= mStr;
    } else if (tribeAction === "physical" && masterAction === "magic") {
      mHpDiff -= tStr;
    } else if (masterAction === "magic" && tribeAction === "defense") {
      tHpDiff -= mMag;
    } else if (tribeAction === "magic" && masterAction === "defense") {
      mHpDiff -= tMag;
    } else if (masterAction === "defense" && tribeAction === "physical") {
      tHpDiff -= Math.floor(tStr / 2);
    } else if (tribeAction === "defense" && masterAction === "physical") {
      mHpDiff -= Math.floor(mStr / 2);
    } else if (masterAction === "physical" && tribeAction === "physical") {
      if (mStr > tStr) tHpDiff -= mStr;
      else if (mStr < tStr) mHpDiff -= tStr;
    } else if (masterAction === "magic" && tribeAction === "magic") {
      if (mMag > tMag) tHpDiff -= mMag;
      else if (mMag < tMag) mHpDiff -= tMag;
    } else if (masterAction === "defense" && tribeAction === "defense") {
      if (mHp > tHp) {
        tStrDiff -= 5;
        tMagDiff -= 5;
      } else if (mHp < tHp) {
        mStrDiff -= 5;
        mMagDiff -= 5;
      }
    }

    const finalMHp = Math.max(0, mHp + mHpDiff);
    const finalTHp = Math.max(0, tHp + tHpDiff);
    const finalMStr = Math.max(0, mStr + mStrDiff);
    const finalTStr = Math.max(0, tStr + tStrDiff);
    const finalMMag = Math.max(0, mMag + mMagDiff);
    const finalTMag = Math.max(0, tMag + tMagDiff);

    const updates: Record<string, any> = {};
    updates[`masters/${selectedMaster}/stamina`] = finalMHp;
    updates[`masters/${selectedMaster}/strength`] = finalMStr;
    updates[`masters/${selectedMaster}/magic`] = finalMMag;

    updates[`tribes/${selectedTribe}/stamina`] = finalTHp;
    updates[`tribes/${selectedTribe}/strength`] = finalTStr;
    updates[`tribes/${selectedTribe}/magic`] = finalTMag;

    try {
      await update(ref(db), updates);

      // 儲存結算紀錄
      setResultLog({
        masterName: mStats.name || beastNames[parseInt(selectedMaster.replace("master", "")) - 1] || "神獸",
        tribeName: `第 ${groupNames[groupKeys.indexOf(selectedTribe)]} 小組`,
        masterAction,
        tribeAction,
        mHpBefore: mHp,
        mHpAfter: finalMHp,
        mHpDiff,
        tHpBefore: tHp,
        tHpAfter: finalTHp,
        tHpDiff,
        mStrDiff,
        tStrDiff,
        mMagDiff,
        tMagDiff,
      });

      // 重置當前行動並打開結果視窗
      setMasterAction("");
      setTribeAction("");
      setShowResultModal(true);
    } catch (e) {
      console.error(e);
      alert("資料庫更新失敗，請檢查網路連線！");
    } finally {
      setIsSettling(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-stone-900 text-stone-100 flex items-center justify-center font-bold">
        驗證身份中...
      </div>
    );
  }

  const mStats = mastersData[selectedMaster] || { stamina: 100, strength: 20, magic: 20, name: beastNames[parseInt(selectedMaster.replace("master", "")) - 1] || "神獸" };
  const tStats = tribesData[selectedTribe] || { stamina: 30, strength: 10, magic: 10 };

  const actionNameMap: Record<string, string> = {
    physical: "⚔️ 物理攻擊",
    magic: "🔮 魔法攻擊",
    defense: "🛡️ 防禦反擊"
  };

  return (
    <main className="min-h-screen bg-stone-950 text-stone-100 p-4 md:p-8 flex flex-col items-center relative">
      <Link href="/" className="absolute top-4 left-4 flex items-center gap-2 bg-stone-900 border border-stone-800 px-4 py-2 rounded-full shadow-md text-stone-300 hover:bg-stone-800 transition-colors font-bold z-30">
        <Home size={18} /> 返回主選單
      </Link>
      
      <button onClick={handleLogout} className="absolute top-4 right-4 flex items-center gap-2 bg-rose-950/40 border border-rose-900/60 hover:bg-rose-900/40 px-4 py-2 rounded-full shadow-md text-rose-300 transition-colors font-bold z-30">
        <LogOut size={18} /> 登出控制台
      </button>

      <div className="w-full max-w-5xl mt-16 md:mt-12 flex flex-col gap-6 flex-1">
        <header className="text-center mb-4">
          <h1 className="text-3xl md:text-4xl font-black text-amber-500 flex items-center justify-center gap-3">
            <Swords size={36} /> 巔峰之爭對戰控制台
          </h1>
          <p className="text-stone-500 text-sm font-bold mt-2">裁判控制專用面板 — 輸入雙方行動一鍵進行公式結算</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* 左側：關主/神獸控制 */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 text-amber-500/5 pointer-events-none">
              <Swords size={180} />
            </div>
            
            <div className="relative z-10 flex-1 flex flex-col gap-5">
              <div className="flex justify-between items-center border-b border-stone-800 pb-4">
                <h2 className="text-xl font-black text-amber-400 flex items-center gap-2">
                  <Shield size={20} /> 選擇對抗神獸
                </h2>
                <select
                  value={selectedMaster}
                  onChange={(e) => {
                    setSelectedMaster(e.target.value);
                    setMasterAction("");
                  }}
                  className="bg-stone-950 border border-stone-800 text-amber-400 font-black px-4 py-2 rounded-xl outline-none text-sm cursor-pointer hover:border-amber-500/50 transition-colors"
                >
                  {Object.keys(mastersData).length > 0 ? (
                    Object.keys(mastersData).sort((a, b) => {
                      const numA = parseInt(a.replace("master", "")) || 0;
                      const numB = parseInt(b.replace("master", "")) || 0;
                      return numA - numB;
                    }).slice(0, 4).map((key) => {
                      const idx = parseInt(key.replace("master", "")) - 1;
                      const name = mastersData[key]?.name || beastNames[idx] || `神獸 ${idx + 1}`;
                      return (
                        <option key={key} value={key} className="bg-stone-900 text-stone-100">{name}</option>
                      );
                    })
                  ) : (
                    beastNames.map((name, i) => (
                      <option key={`master${i + 1}`} value={`master${i + 1}`} className="bg-stone-900 text-stone-100">{name}</option>
                    ))
                  )}
                </select>
              </div>

              {/* 神獸數值卡 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center bg-stone-950/60 p-3 rounded-2xl border border-stone-850">
                  <Heart className="text-rose-500 mb-1" size={20} />
                  <span className="text-[10px] text-stone-500 font-bold mb-1">體力</span>
                  <span className={`text-xl font-black ${Number(mStats.stamina) <= 0 ? 'text-stone-600 line-through' : 'text-rose-500'}`}>{mStats.stamina}</span>
                </div>
                <div className="flex flex-col items-center bg-stone-950/60 p-3 rounded-2xl border border-stone-850">
                  <Sword className="text-amber-500 mb-1" size={20} />
                  <span className="text-[10px] text-stone-500 font-bold mb-1">力量</span>
                  <span className="text-xl font-black text-amber-500">{mStats.strength}</span>
                </div>
                <div className="flex flex-col items-center bg-stone-950/60 p-3 rounded-2xl border border-stone-850">
                  <Zap className="text-cyan-500 mb-1" size={20} />
                  <span className="text-[10px] text-stone-500 font-bold mb-1">魔力</span>
                  <span className="text-xl font-black text-cyan-500">{mStats.magic}</span>
                </div>
              </div>

              {/* 神獸行動 */}
              <div className="flex flex-col gap-3 mt-2">
                <span className="text-stone-400 font-bold text-xs uppercase tracking-widest">選擇神獸行動</span>
                <button
                  disabled={Number(mStats.stamina) <= 0}
                  onClick={() => setMasterAction("physical")}
                  className={`py-4 px-5 rounded-2xl font-black text-left flex justify-between items-center border transition-all ${masterAction === 'physical' ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-lg shadow-amber-500/20' : 'bg-stone-950 text-stone-300 border-stone-850 hover:bg-stone-800 hover:text-white'}`}
                >
                  <span className="flex items-center gap-3"><Sword size={22}/> 物理攻擊</span>
                  {masterAction === 'physical' && <CheckCircle size={18}/>}
                </button>
                <button
                  disabled={Number(mStats.stamina) <= 0}
                  onClick={() => setMasterAction("magic")}
                  className={`py-4 px-5 rounded-2xl font-black text-left flex justify-between items-center border transition-all ${masterAction === 'magic' ? 'bg-cyan-500 text-stone-950 border-cyan-400 shadow-lg shadow-cyan-500/20' : 'bg-stone-950 text-stone-300 border-stone-850 hover:bg-stone-800 hover:text-white'}`}
                >
                  <span className="flex items-center gap-3"><Zap size={22}/> 魔法攻擊</span>
                  {masterAction === 'magic' && <CheckCircle size={18}/>}
                </button>
                <button
                  disabled={Number(mStats.stamina) <= 0}
                  onClick={() => setMasterAction("defense")}
                  className={`py-4 px-5 rounded-2xl font-black text-left flex justify-between items-center border transition-all ${masterAction === 'defense' ? 'bg-stone-100 text-stone-950 border-stone-200 shadow-lg shadow-white/10' : 'bg-stone-950 text-stone-300 border-stone-850 hover:bg-stone-800 hover:text-white'}`}
                >
                  <span className="flex items-center gap-3"><Shield size={22}/> 防禦反擊</span>
                  {masterAction === 'defense' && <CheckCircle size={18}/>}
                </button>
              </div>
            </div>
          </div>

          {/* 右側：小組控制 */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 text-cyan-500/5 pointer-events-none">
              <Swords size={180} />
            </div>

            <div className="relative z-10 flex-1 flex flex-col gap-5">
              <div className="flex justify-between items-center border-b border-stone-800 pb-4">
                <h2 className="text-xl font-black text-cyan-400 flex items-center gap-2">
                  <Shield size={20} /> 選擇交戰小組
                </h2>
                <select
                  value={selectedTribe}
                  onChange={(e) => {
                    setSelectedTribe(e.target.value);
                    setTribeAction("");
                  }}
                  className="bg-stone-950 border border-stone-800 text-cyan-450 font-black px-4 py-2 rounded-xl outline-none text-sm cursor-pointer hover:border-cyan-500/50 transition-colors"
                >
                  {groupKeys.map((key, i) => (
                    <option key={key} value={key} className="bg-stone-900 text-stone-100">第 {groupNames[i]} 小組</option>
                  ))}
                </select>
              </div>

              {/* 小組數值卡 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center bg-stone-950/60 p-3 rounded-2xl border border-stone-850">
                  <Heart className="text-rose-500 mb-1" size={20} />
                  <span className="text-[10px] text-stone-500 font-bold mb-1">體力</span>
                  <span className={`text-xl font-black ${Number(tStats.stamina) <= 0 ? 'text-stone-600 line-through' : 'text-rose-500'}`}>{tStats.stamina}</span>
                </div>
                <div className="flex flex-col items-center bg-stone-950/60 p-3 rounded-2xl border border-stone-850">
                  <Sword className="text-amber-500 mb-1" size={20} />
                  <span className="text-[10px] text-stone-500 font-bold mb-1">力量</span>
                  <span className="text-xl font-black text-amber-500">{tStats.strength}</span>
                </div>
                <div className="flex flex-col items-center bg-stone-950/60 p-3 rounded-2xl border border-stone-850">
                  <Zap className="text-cyan-500 mb-1" size={20} />
                  <span className="text-[10px] text-stone-500 font-bold mb-1">魔力</span>
                  <span className="text-xl font-black text-cyan-500">{tStats.magic}</span>
                </div>
              </div>

              {/* 小組行動 */}
              <div className="flex flex-col gap-3 mt-2">
                <span className="text-stone-400 font-bold text-xs uppercase tracking-widest">選擇小組行動</span>
                <button
                  disabled={Number(tStats.stamina) <= 0}
                  onClick={() => setTribeAction("physical")}
                  className={`py-4 px-5 rounded-2xl font-black text-left flex justify-between items-center border transition-all ${tribeAction === 'physical' ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-lg shadow-amber-500/20' : 'bg-stone-950 text-stone-300 border-stone-850 hover:bg-stone-800 hover:text-white'}`}
                >
                  <span className="flex items-center gap-3"><Sword size={22}/> 物理攻擊</span>
                  {tribeAction === 'physical' && <CheckCircle size={18}/>}
                </button>
                <button
                  disabled={Number(tStats.stamina) <= 0}
                  onClick={() => setTribeAction("magic")}
                  className={`py-4 px-5 rounded-2xl font-black text-left flex justify-between items-center border transition-all ${tribeAction === 'magic' ? 'bg-cyan-500 text-stone-950 border-cyan-400 shadow-lg shadow-cyan-500/20' : 'bg-stone-950 text-stone-300 border-stone-850 hover:bg-stone-800 hover:text-white'}`}
                >
                  <span className="flex items-center gap-3"><Zap size={22}/> 魔法攻擊</span>
                  {tribeAction === 'magic' && <CheckCircle size={18}/>}
                </button>
                <button
                  disabled={Number(tStats.stamina) <= 0}
                  onClick={() => setTribeAction("defense")}
                  className={`py-4 px-5 rounded-2xl font-black text-left flex justify-between items-center border transition-all ${tribeAction === 'defense' ? 'bg-stone-100 text-stone-950 border-stone-200 shadow-lg shadow-white/10' : 'bg-stone-950 text-stone-300 border-stone-850 hover:bg-stone-800 hover:text-white'}`}
                >
                  <span className="flex items-center gap-3"><Shield size={22}/> 防禦反擊</span>
                  {tribeAction === 'defense' && <CheckCircle size={18}/>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 結算按鈕 */}
        <div className="flex justify-center mt-6">
          <button
            onClick={handleExecuteSettle}
            disabled={isSettling || !masterAction || !tribeAction || Number(mStats.stamina) <= 0 || Number(tStats.stamina) <= 0}
            className={`w-full max-w-lg py-5 rounded-2xl text-xl font-black transition-all flex items-center justify-center gap-3 ${(!masterAction || !tribeAction || Number(mStats.stamina) <= 0 || Number(tStats.stamina) <= 0) ? 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed' : 'bg-amber-500 text-stone-950 hover:bg-amber-400 hover:scale-105 active:scale-98 shadow-[0_0_40px_rgba(245,158,11,0.35)]'}`}
          >
            <Swords size={28} />
            {isSettling ? "對戰資料計算中..." : "開始戰鬥結算"}
          </button>
        </div>
      </div>

      {/* 結算報告 Modal */}
      <AnimatePresence>
        {showResultModal && resultLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-stone-900 border border-stone-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden text-center"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-rose-500 to-cyan-500" />
              
              <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Swords size={32} />
              </div>

              <h3 className="text-2xl font-black text-amber-500 mb-6 uppercase tracking-wider">戰鬥結算報告</h3>

              {/* 戰力交鋒簡圖 */}
              <div className="flex items-center justify-between bg-stone-950/50 p-4 rounded-2xl border border-stone-850 mb-6">
                <div className="flex flex-col items-center flex-1">
                  <span className="text-xs text-stone-400 font-bold mb-1">{resultLog.masterName}</span>
                  <span className="text-sm font-black text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full">{actionNameMap[resultLog.masterAction]}</span>
                </div>
                <div className="text-stone-600 font-black px-2 text-xl">VS</div>
                <div className="flex flex-col items-center flex-1">
                  <span className="text-xs text-stone-400 font-bold mb-1">{resultLog.tribeName}</span>
                  <span className="text-sm font-black text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full">{actionNameMap[resultLog.tribeAction]}</span>
                </div>
              </div>

              {/* 數值異動詳細資訊 */}
              <div className="flex flex-col gap-4 text-left bg-stone-950/30 p-5 rounded-2xl border border-stone-850 mb-8 font-mono text-sm leading-relaxed">
                <div>
                  <h4 className="text-xs font-bold text-stone-400 mb-2 uppercase tracking-wider border-b border-stone-850 pb-1 flex justify-between">
                    <span>{resultLog.masterName} 數值變動</span>
                    <span className="text-amber-500 font-black">神獸</span>
                  </h4>
                  <div className="flex justify-between items-center">
                    <span>體力 HP:</span>
                    <span>
                      {resultLog.mHpBefore} 
                      <span className={`mx-2 font-black ${resultLog.mHpDiff < 0 ? 'text-rose-500' : 'text-stone-400'}`}>
                        {resultLog.mHpDiff === 0 ? '±0' : resultLog.mHpDiff}
                      </span> 
                      ➜ <span className="text-rose-400 font-black">{resultLog.mHpAfter}</span>
                    </span>
                  </div>
                  {resultLog.mStrDiff !== 0 && (
                    <div className="flex justify-between items-center text-xs mt-1">
                      <span>力量 STR:</span>
                      <span className="text-amber-400 font-black">{resultLog.mStrDiff > 0 ? `+${resultLog.mStrDiff}` : resultLog.mStrDiff}</span>
                    </div>
                  )}
                  {resultLog.mMagDiff !== 0 && (
                    <div className="flex justify-between items-center text-xs mt-1">
                      <span>魔力 MAG:</span>
                      <span className="text-cyan-400 font-black">{resultLog.mMagDiff > 0 ? `+${resultLog.mMagDiff}` : resultLog.mMagDiff}</span>
                    </div>
                  )}
                </div>

                <div className="mt-2">
                  <h4 className="text-xs font-bold text-stone-400 mb-2 uppercase tracking-wider border-b border-stone-850 pb-1 flex justify-between">
                    <span>{resultLog.tribeName} 數值變動</span>
                    <span className="text-cyan-500 font-black">小組</span>
                  </h4>
                  <div className="flex justify-between items-center">
                    <span>體力 HP:</span>
                    <span>
                      {resultLog.tHpBefore} 
                      <span className={`mx-2 font-black ${resultLog.tHpDiff < 0 ? 'text-rose-500' : 'text-stone-400'}`}>
                        {resultLog.tHpDiff === 0 ? '±0' : resultLog.tHpDiff}
                      </span> 
                      ➜ <span className="text-rose-400 font-black">{resultLog.tHpAfter}</span>
                    </span>
                  </div>
                  {resultLog.tStrDiff !== 0 && (
                    <div className="flex justify-between items-center text-xs mt-1">
                      <span>力量 STR:</span>
                      <span className="text-amber-400 font-black">{resultLog.tStrDiff > 0 ? `+${resultLog.tStrDiff}` : resultLog.tStrDiff}</span>
                    </div>
                  )}
                  {resultLog.tMagDiff !== 0 && (
                    <div className="flex justify-between items-center text-xs mt-1">
                      <span>魔力 MAG:</span>
                      <span className="text-cyan-400 font-black">{resultLog.tMagDiff > 0 ? `+${resultLog.tMagDiff}` : resultLog.tMagDiff}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowResultModal(false)}
                className="w-full py-4 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white font-black text-lg transition-colors border border-stone-700"
              >
                關閉報告
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}