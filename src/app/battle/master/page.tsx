// src/app/battle/master/page.tsx
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ref, onValue, update } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { Heart, Sword, Zap, Shield, ShieldAlert, Activity, RefreshCw, Home, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

function MasterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const masterId = searchParams.get("id") || "master1";

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // 關主資料與選定組別資料
  const [masterStats, setMasterStats] = useState({ stamina: 0, strength: 0, magic: 0, name: "" });
  const [selectedTribe, setSelectedTribe] = useState("group1");
  const [tribeStats, setTribeStats] = useState({ stamina: 0, strength: 0, magic: 0 });

  // 對戰狀態
  const [round, setRound] = useState(1);
  const [battleState, setBattleState] = useState({
    activeTribe: "group1",
    masterAction: "",
    tribeAction: "",
    tribeStatus: "preparing"
  });

  // 當前暫存選擇
  const [selectedMasterAction, setSelectedMasterAction] = useState("");
  const [selectedTribeAction, setSelectedTribeAction] = useState("");

  // 每回合結算結果 Modal
  const [showResultModal, setShowResultModal] = useState(false);
  const [roundResultLog, setRoundResultLog] = useState<{
    round: number;
    masterAction: string;
    tribeAction: string;
    masterHpChange: number;
    tribeHpChange: number;
    masterStrChange: number;
    tribeStrChange: number;
    masterMagChange: number;
    tribeMagChange: number;
    masterName: string;
    tribeName: string;
  } | null>(null);

  const groupKeys = ["group1", "group2", "group3", "group4", "group5", "group6"];
  const groupNames = ["一", "二", "三", "四", "五", "六"];
  const templeNames = ["反偵察神廟", "曼巴神廟", "好帥神廟", "節奏神廟", "綜藝神廟", "特工神廟"];
  const masterIndex = parseInt(masterId.replace("master", "")) - 1;
  const currentTempleName = templeNames[masterIndex] || "未知神廟";

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) router.push('/battle');
      else setIsCheckingAuth(false);
    });
    return () => unsubscribeAuth();
  }, [router]);

  // 監聽關主自己的數值
  useEffect(() => {
    if (isCheckingAuth) return;
    const masterRef = ref(db, `masters/${masterId}`);
    const unsubscribeMaster = onValue(masterRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setMasterStats({
          stamina: data.stamina || 0,
          strength: data.strength || 0,
          magic: data.magic || 0,
          name: data.name || `${currentTempleName}關主`
        });
      }
    });
    return () => unsubscribeMaster();
  }, [masterId, isCheckingAuth, currentTempleName]);

  // 監聽選中小組的數值
  useEffect(() => {
    if (isCheckingAuth || !selectedTribe) return;
    const tribeRef = ref(db, `tribes/${selectedTribe}`);
    const unsubscribeTribe = onValue(tribeRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setTribeStats({
          stamina: data.stamina || 0,
          strength: data.strength || 0,
          magic: data.magic || 0
        });
      }
    });
    return () => unsubscribeTribe();
  }, [selectedTribe, isCheckingAuth]);

  // 監聽此關卡在對戰房中的對打狀態
  useEffect(() => {
    if (isCheckingAuth || !masterId) return;
    const battleRef = ref(db, `normalBattles/${masterId}`);
    const unsubscribeBattle = onValue(battleRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setRound(data.round || 1);
        
        // 取得當前面對的組別
        const currentActive = data.activeTribe || "group1";
        setSelectedTribe(currentActive);

        const mAct = data.master?.action || "";
        const tAct = data.tribe?.action || "";
        const tStat = data.tribe?.status || "preparing";

        setBattleState({
          activeTribe: currentActive,
          masterAction: mAct,
          tribeAction: tAct,
          tribeStatus: tStat
        });

        // 同步暫存的行動
        if (mAct) setSelectedMasterAction(mAct);
        if (tAct) setSelectedTribeAction(tAct);
      } else {
        // 初始化關主的對打狀態
        update(ref(db, `normalBattles/${masterId}`), {
          round: 1,
          activeTribe: selectedTribe,
          master: { action: "", status: "preparing" },
          tribe: { action: "", status: "preparing" }
        });
      }
    });

    return () => unsubscribeBattle();
  }, [masterId, isCheckingAuth]);

  // 當關主切換面對的組別時，同步寫入 Firebase
  const handleTribeChange = async (tribeKey: string) => {
    setSelectedTribe(tribeKey);
    setSelectedTribeAction("");
    await update(ref(db, `normalBattles/${masterId}`), {
      activeTribe: tribeKey,
      "tribe/action": "",
      "tribe/status": "preparing"
    });
  };

  // 關主手動為小組設定行動 (單機對戰/面面相覷時覆寫)
  const handleTribeActionSelect = async (action: string) => {
    setSelectedTribeAction(action);
    await update(ref(db, `normalBattles/${masterId}/tribe`), {
      action: action,
      status: "ready"
    });
  };

  // 關主點擊自己行動
  const handleMasterActionSelect = (action: string) => {
    setSelectedMasterAction(action);
  };

  // 結算對決回合
  const handleResolveRound = async () => {
    if (!selectedMasterAction) return alert("關主請先選擇行動！");
    if (!selectedTribeAction) return alert("請先輸入小組的行動！");

    const mHp = Number(masterStats.stamina) || 0;
    const mStr = Number(masterStats.strength) || 0;
    const mMag = Number(masterStats.magic) || 0;

    const tHp = Number(tribeStats.stamina) || 0;
    const tStr = Number(tribeStats.strength) || 0;
    const tMag = Number(tribeStats.magic) || 0;

    let mHpDiff = 0;
    let tHpDiff = 0;
    let mStrDiff = 0;
    let tStrDiff = 0;
    let mMagDiff = 0;
    let tMagDiff = 0;

    const mA = selectedMasterAction;
    const tA = selectedTribeAction;

    // 如果任何一方在回合開始前就已經陣亡，不進行傷害計算
    if (mHp > 0 && tHp > 0) {
      if (mA === "physical" && tA === "magic") {
        tHpDiff -= mStr;
      } else if (tA === "physical" && mA === "magic") {
        mHpDiff -= tStr;
      } else if (mA === "magic" && tA === "defense") {
        tHpDiff -= mMag;
      } else if (tA === "magic" && mA === "defense") {
        mHpDiff -= tMag;
      } else if (mA === "defense" && tA === "physical") {
        tHpDiff -= Math.floor(tStr / 2);
      } else if (tA === "defense" && mA === "physical") {
        mHpDiff -= Math.floor(mStr / 2);
      } else if (mA === "physical" && tA === "physical") {
        if (mStr > tStr) tHpDiff -= mStr;
        else if (mStr < tStr) mHpDiff -= tStr;
      } else if (mA === "magic" && tA === "magic") {
        if (mMag > tMag) tHpDiff -= mMag;
        else if (mMag < tMag) mHpDiff -= tMag;
      } else if (mA === "defense" && tA === "defense") {
        if (mHp > tHp) {
          tStrDiff -= 5;
          tMagDiff -= 5;
        } else if (mHp < tHp) {
          mStrDiff -= 5;
          mMagDiff -= 5;
        }
      }
    }

    // 準備寫入更新資料 (無每回合 +10 回血機制)
    const newMHp = Math.max(0, mHp + mHpDiff);
    const newTHp = Math.max(0, tHp + tHpDiff);
    const newMStr = Math.max(0, mStr + mStrDiff);
    const newTStr = Math.max(0, tStr + tStrDiff);
    const newMMag = Math.max(0, mMag + mMagDiff);
    const newTMag = Math.max(0, tMag + tMagDiff);

    const updates: Record<string, any> = {};
    updates[`masters/${masterId}/stamina`] = newMHp;
    updates[`masters/${masterId}/strength`] = newMStr;
    updates[`masters/${masterId}/magic`] = newMMag;

    updates[`tribes/${selectedTribe}/stamina`] = newTHp;
    updates[`tribes/${selectedTribe}/strength`] = newTStr;
    updates[`tribes/${selectedTribe}/magic`] = newTMag;

    // 重置對打回合狀態
    updates[`normalBattles/${masterId}/round`] = round + 1;
    updates[`normalBattles/${masterId}/master/action`] = "";
    updates[`normalBattles/${masterId}/master/status`] = "preparing";
    updates[`normalBattles/${masterId}/tribe/action`] = "";
    updates[`normalBattles/${masterId}/tribe/status`] = "preparing";

    // 紀錄結算資訊給彈出視窗
    setRoundResultLog({
      round: round,
      masterAction: mA,
      tribeAction: tA,
      masterHpChange: mHpDiff,
      tribeHpChange: tHpDiff,
      masterStrChange: mStrDiff,
      tribeStrChange: tStrDiff,
      masterMagChange: mMagDiff,
      tribeMagChange: tMagDiff,
      masterName: masterStats.name,
      tribeName: `第 ${groupNames[groupKeys.indexOf(selectedTribe)]} 小組`
    });

    await update(ref(db), updates);
    
    // 清空暫存並顯示結果 Modal
    setSelectedMasterAction("");
    setSelectedTribeAction("");
    setShowResultModal(true);
  };

  const actionNameMap: Record<string, string> = {
    physical: "⚔️ 物理攻擊",
    magic: "⚡ 魔法攻擊",
    defense: "🛡️ 防禦反擊",
    dead: "💀 陣亡不行動"
  };

  if (isCheckingAuth) return <div className="min-h-screen bg-stone-900 flex items-center justify-center text-white">驗證中...</div>;

  return (
    <main className="min-h-screen bg-stone-900 text-stone-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        
        {/* 頂部 Header & 關卡與組別對打設定 */}
        <div className="bg-stone-800 border border-stone-700 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -top-10 text-amber-500/10 pointer-events-none">
            <ShieldAlert size={200} />
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 relative z-10 gap-4">
            <div>
              <h1 className="text-3xl font-black text-amber-500 flex items-center gap-3">
                <ShieldAlert /> {currentTempleName}對戰台
              </h1>
              <p className="text-sm font-bold text-stone-400 mt-1">關主暱稱：{masterStats.name}</p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-stone-400 font-bold text-sm">迎戰隊伍：</span>
                <select
                  value={selectedTribe}
                  onChange={(e) => handleTribeChange(e.target.value)}
                  className="bg-stone-900 border border-stone-700 text-amber-400 font-black px-3 py-2 rounded-xl outline-none text-sm cursor-pointer"
                >
                  {groupKeys.map((key, i) => (
                    <option key={key} value={key}>第 {groupNames[i]} 小組</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 bg-stone-900 px-4 py-2 rounded-xl border border-stone-700">
                <span className="text-stone-400 font-bold text-sm">第</span>
                <span className="text-amber-400 font-black text-lg">{round}</span>
                <span className="text-stone-400 font-bold text-sm">回合</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            
            {/* 左側：關主我方 (Stamina, Strength, Magic, 行動選擇) */}
            <div className="bg-stone-900/50 p-6 rounded-2xl border border-stone-700 flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-stone-700 pb-3">
                <h2 className="text-base font-black text-amber-400 flex items-center gap-2">⚔️ 關主數值與行動</h2>
                {masterStats.stamina <= 0 && <span className="bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded text-xs font-black">已陣亡</span>}
              </div>

              {/* 三圍 */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-stone-800 p-3 rounded-xl border border-stone-700">
                  <Heart className="text-rose-400 mx-auto mb-1" size={18} />
                  <span className="text-xs text-stone-500 block font-bold">體力</span>
                  <span className="text-xl font-black text-stone-100">{masterStats.stamina}</span>
                </div>
                <div className="bg-stone-800 p-3 rounded-xl border border-stone-700">
                  <Sword className="text-amber-400 mx-auto mb-1" size={18} />
                  <span className="text-xs text-stone-500 block font-bold">力量</span>
                  <span className="text-xl font-black text-stone-100">{masterStats.strength}</span>
                </div>
                <div className="bg-stone-800 p-3 rounded-xl border border-stone-700">
                  <Zap className="text-cyan-400 mx-auto mb-1" size={18} />
                  <span className="text-xs text-stone-500 block font-bold">魔力</span>
                  <span className="text-xl font-black text-stone-100">{masterStats.magic}</span>
                </div>
              </div>

              {/* 選擇行動 */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">選擇我方行動：</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    disabled={masterStats.stamina <= 0}
                    onClick={() => handleMasterActionSelect("physical")}
                    className={`py-3 px-2 rounded-xl font-black text-sm flex flex-col items-center gap-1.5 transition-colors border ${selectedMasterAction === 'physical' ? 'bg-amber-500 text-stone-900 border-amber-400' : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700 disabled:opacity-50'}`}
                  >
                    <Sword size={16} /> 物理攻擊
                  </button>
                  <button
                    disabled={masterStats.stamina <= 0}
                    onClick={() => handleMasterActionSelect("magic")}
                    className={`py-3 px-2 rounded-xl font-black text-sm flex flex-col items-center gap-1.5 transition-colors border ${selectedMasterAction === 'magic' ? 'bg-cyan-500 text-stone-900 border-cyan-400' : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700 disabled:opacity-50'}`}
                  >
                    <Zap size={16} /> 魔法攻擊
                  </button>
                  <button
                    disabled={masterStats.stamina <= 0}
                    onClick={() => handleMasterActionSelect("defense")}
                    className={`py-3 px-2 rounded-xl font-black text-sm flex flex-col items-center gap-1.5 transition-colors border ${selectedMasterAction === 'defense' ? 'bg-stone-100 text-stone-900 border-stone-300' : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700 disabled:opacity-50'}`}
                  >
                    <Shield size={16} /> 防禦反擊
                  </button>
                </div>
                {masterStats.stamina <= 0 && <p className="text-rose-400 text-xs text-center font-bold">關主已陣亡，無法選擇行動</p>}
              </div>
            </div>

            {/* 右側：迎戰組別 (Stamina, Strength, Magic, 行動選擇與狀態) */}
            <div className="bg-stone-900/50 p-6 rounded-2xl border border-stone-700 flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-stone-700 pb-3">
                <h2 className="text-base font-black text-cyan-400 flex items-center gap-2">🛡️ 對手 第 {groupNames[groupKeys.indexOf(selectedTribe)]} 小組</h2>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${battleState.tribeStatus === "ready" ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-700 text-stone-400'}`}>
                  {tribeStats.stamina <= 0 ? '已陣亡' : (battleState.tribeStatus === "ready" ? '準備完成' : '決定中...')}
                </span>
              </div>

              {/* 三圍 */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-stone-800 p-3 rounded-xl border border-stone-700">
                  <Heart className="text-rose-400 mx-auto mb-1" size={18} />
                  <span className="text-xs text-stone-500 block font-bold">體力</span>
                  <span className="text-xl font-black text-stone-100">{tribeStats.stamina}</span>
                </div>
                <div className="bg-stone-800 p-3 rounded-xl border border-stone-700">
                  <Sword className="text-amber-400 mx-auto mb-1" size={18} />
                  <span className="text-xs text-stone-500 block font-bold">力量</span>
                  <span className="text-xl font-black text-stone-100">{tribeStats.strength}</span>
                </div>
                <div className="bg-stone-800 p-3 rounded-xl border border-stone-700">
                  <Zap className="text-cyan-400 mx-auto mb-1" size={18} />
                  <span className="text-xs text-stone-500 block font-bold">魔力</span>
                  <span className="text-xl font-black text-stone-100">{tribeStats.magic}</span>
                </div>
              </div>

              {/* 選擇行動 (供面面相覷時關主代點) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-widest">輸入對方行動 (或等待隊輔同步)：</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    disabled={tribeStats.stamina <= 0}
                    onClick={() => handleTribeActionSelect("physical")}
                    className={`py-3 px-2 rounded-xl font-black text-sm flex flex-col items-center gap-1.5 transition-colors border ${selectedTribeAction === 'physical' ? 'bg-amber-500 text-stone-900 border-amber-400' : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700 disabled:opacity-50'}`}
                  >
                    <Sword size={16} /> 物理攻擊
                  </button>
                  <button
                    disabled={tribeStats.stamina <= 0}
                    onClick={() => handleTribeActionSelect("magic")}
                    className={`py-3 px-2 rounded-xl font-black text-sm flex flex-col items-center gap-1.5 transition-colors border ${selectedTribeAction === 'magic' ? 'bg-cyan-500 text-stone-900 border-cyan-400' : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700 disabled:opacity-50'}`}
                  >
                    <Zap size={16} /> 魔法攻擊
                  </button>
                  <button
                    disabled={tribeStats.stamina <= 0}
                    onClick={() => handleTribeActionSelect("defense")}
                    className={`py-3 px-2 rounded-xl font-black text-sm flex flex-col items-center gap-1.5 transition-colors border ${selectedTribeAction === 'defense' ? 'bg-stone-100 text-stone-900 border-stone-300' : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700 disabled:opacity-50'}`}
                  >
                    <Shield size={16} /> 防禦反擊
                  </button>
                </div>
                {tribeStats.stamina <= 0 && <p className="text-rose-400 text-xs text-center font-bold">隊伍已陣亡，無法採取行動</p>}
              </div>
            </div>

          </div>

          {/* 結算按鈕 */}
          <div className="mt-8 flex justify-center border-t border-stone-700 pt-6">
            <button
              onClick={handleResolveRound}
              disabled={(!selectedMasterAction && masterStats.stamina > 0) || (!selectedTribeAction && tribeStats.stamina > 0)}
              className={`w-full md:w-auto px-16 py-4 rounded-2xl text-lg font-black transition-all ${
                ((selectedMasterAction || masterStats.stamina <= 0) && (selectedTribeAction || tribeStats.stamina <= 0))
                  ? "bg-amber-500 text-stone-900 hover:bg-amber-400 shadow-xl shadow-amber-500/20 scale-105"
                  : "bg-stone-800 text-stone-600 border border-stone-700 cursor-not-allowed"
              }`}
            >
              確認回合結算
            </button>
          </div>
        </div>

      </div>

      {/* 結算彈窗 Modal */}
      <AnimatePresence>
        {showResultModal && roundResultLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-stone-900 border border-stone-700 rounded-[2.5rem] p-6 md:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden text-center"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-cyan-500 to-rose-500" />
              
              <h2 className="text-2xl md:text-3xl font-black text-amber-400 mb-2">第 {roundResultLog.round} 回合戰鬥結算</h2>
              <p className="text-xs text-stone-500 font-bold uppercase tracking-wider mb-6">決鬥結果報告</p>

              <div className="flex items-center justify-center gap-4 md:gap-8 mb-8">
                {/* 關主行動 */}
                <div className="flex-1 bg-stone-800/50 border border-stone-700/50 p-4 rounded-2xl">
                  <p className="text-xs text-amber-500 font-bold mb-1">{roundResultLog.masterName}</p>
                  <p className="text-base font-black text-white">{actionNameMap[roundResultLog.masterAction] || "無行動"}</p>
                  {roundResultLog.masterHpChange !== 0 && (
                    <p className="text-sm font-black text-rose-500 mt-2">{roundResultLog.masterHpChange} 體力</p>
                  )}
                  {roundResultLog.masterStrChange !== 0 && (
                    <p className="text-sm font-black text-amber-500 mt-0.5">{roundResultLog.masterStrChange} 力量</p>
                  )}
                  {roundResultLog.masterMagChange !== 0 && (
                    <p className="text-sm font-black text-cyan-500 mt-0.5">{roundResultLog.masterMagChange} 魔力</p>
                  )}
                </div>

                <div className="text-xl font-black text-stone-500 italic shrink-0">VS</div>

                {/* 小組行動 */}
                <div className="flex-1 bg-stone-800/50 border border-stone-700/50 p-4 rounded-2xl">
                  <p className="text-xs text-cyan-400 font-bold mb-1">{roundResultLog.tribeName}</p>
                  <p className="text-base font-black text-white">{actionNameMap[roundResultLog.tribeAction] || "無行動"}</p>
                  {roundResultLog.tribeHpChange !== 0 && (
                    <p className="text-sm font-black text-rose-500 mt-2">{roundResultLog.tribeHpChange} 體力</p>
                  )}
                  {roundResultLog.tribeStrChange !== 0 && (
                    <p className="text-sm font-black text-amber-500 mt-0.5">{roundResultLog.tribeStrChange} 力量</p>
                  )}
                  {roundResultLog.tribeMagChange !== 0 && (
                    <p className="text-sm font-black text-cyan-500 mt-0.5">{roundResultLog.tribeMagChange} 魔力</p>
                  )}
                </div>
              </div>

              {/* 戰報敘述 */}
              <div className="bg-stone-950/60 rounded-2xl p-4 border border-stone-800 text-left text-sm text-stone-300 leading-relaxed mb-6 font-medium">
                <p className="font-bold text-amber-400 text-xs mb-1.5 uppercase tracking-wider">戰鬥記錄：</p>
                {roundResultLog.masterHpChange === 0 && roundResultLog.tribeHpChange === 0 && roundResultLog.masterStrChange === 0 && roundResultLog.tribeStrChange === 0 && roundResultLog.masterMagChange === 0 && roundResultLog.tribeMagChange === 0 ? (
                  <p>雙方防守或平手，未造成任何數值損耗。</p>
                ) : (
                  <ul className="list-disc pl-4 space-y-1">
                    {roundResultLog.masterHpChange < 0 && <li>{roundResultLog.masterName} 受到 {Math.abs(roundResultLog.masterHpChange)} 點傷害。</li>}
                    {roundResultLog.tribeHpChange < 0 && <li>{roundResultLog.tribeName} 受到 {Math.abs(roundResultLog.tribeHpChange)} 點傷害。</li>}
                    {roundResultLog.masterStrChange < 0 && <li>{roundResultLog.masterName} 被削弱了 {Math.abs(roundResultLog.masterStrChange)} 點力量。</li>}
                    {roundResultLog.tribeStrChange < 0 && <li>{roundResultLog.tribeName} 被削弱了 {Math.abs(roundResultLog.tribeStrChange)} 點力量。</li>}
                    {roundResultLog.masterMagChange < 0 && <li>{roundResultLog.masterName} 被削弱了 {Math.abs(roundResultLog.masterMagChange)} 點魔力。</li>}
                    {roundResultLog.tribeMagChange < 0 && <li>{roundResultLog.tribeName} 被削弱了 {Math.abs(roundResultLog.tribeMagChange)} 點魔力。</li>}
                  </ul>
                )}
              </div>

              <button
                onClick={() => setShowResultModal(false)}
                className="w-full py-4 rounded-xl bg-amber-500 text-stone-900 font-black text-lg hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
              >
                開始下一回合
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* 返回主選單懸浮按鈕 */}
      <Link href="/battle" className="fixed bottom-6 left-6 z-40 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 p-4 rounded-full shadow-2xl transition-colors flex items-center justify-center">
        <Home size={20} />
      </Link>
    </main>
  );
}

export default function MasterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-stone-900 text-white">載入中...</div>}>
      <MasterContent />
    </Suspense>
  );
}
