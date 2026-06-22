// src/app/battle/leader/page.tsx
"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ref, onValue, update } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { Heart, Sword, Zap, Shield, Home, CheckCircle, Swords } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

function LeaderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const team = searchParams.get("team"); // e.g., "group1"

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [stats, setStats] = useState({ stamina: 0, strength: 0, magic: 0 });
  const [selectedMaster, setSelectedMaster] = useState("master1");
  const [round, setRound] = useState(1);
  const [battleState, setBattleState] = useState({ action: "", status: "preparing" });
  const [selectedAction, setSelectedAction] = useState("");

  const groupNames: Record<string, string> = { group1: "一", group2: "二", group3: "三", group4: "四", group5: "五", group6: "六" };
  const beastNames = ["日月神獸", "炎神獸", "海神獸", "雷神獸"];
  const [mastersData, setMastersData] = useState<Record<string, any>>({});

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/battle');
      } else {
        setIsCheckingAuth(false);
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  // 監聽自己的三圍
  useEffect(() => {
    if (isCheckingAuth || !team || !groupNames[team]) return;

    const tribeRef = ref(db, `tribes/${team}`);
    const unsubscribeTribe = onValue(tribeRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setStats({
          stamina: data.stamina || 0,
          strength: data.strength || 0,
          magic: data.magic || 0,
        });
      }
    });

    return () => unsubscribeTribe();
  }, [team, isCheckingAuth]);

  // 監聽所有關主以取得實際關卡名稱
  useEffect(() => {
    if (isCheckingAuth) return;
    const mastersRef = ref(db, "masters");
    const unsubscribeMasters = onValue(mastersRef, (snapshot) => {
      if (snapshot.exists()) {
        setMastersData(snapshot.val());
      }
    });
    return () => unsubscribeMasters();
  }, [isCheckingAuth]);

  // 當關主載入完成，同步更新 selectedMaster 預設值
  useEffect(() => {
    if (Object.keys(mastersData).length > 0) {
      const keys = Object.keys(mastersData).sort((a, b) => {
        const numA = parseInt(a.replace("master", "")) || 0;
        const numB = parseInt(b.replace("master", "")) || 0;
        return numA - numB;
      }).slice(0, 4);
      if (!keys.includes(selectedMaster)) {
        setSelectedMaster(keys[0]);
      }
    }
  }, [mastersData]);

  // 監聽選定關主的戰鬥狀態
  useEffect(() => {
    if (isCheckingAuth || !team || !groupNames[team] || !selectedMaster) return;

    const battleRef = ref(db, `normalBattles/${selectedMaster}`);
    const unsubscribeBattle = onValue(battleRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setRound(data.round || 1);
        
        // 檢查該關主當前面對的組別是否是自己
        if (data.activeTribe === team) {
          const tState = data.tribe || { action: "", status: "preparing" };
          setBattleState({
            action: tState.action || "",
            status: tState.status || "preparing"
          });
          if (tState.status === "preparing") {
            setSelectedAction("");
          }
        } else {
          setBattleState({ action: "", status: "not_active" });
        }
      } else {
        // 初始化關主的對戰狀態
        update(ref(db, `normalBattles/${selectedMaster}`), {
          round: 1,
          activeTribe: team,
          master: { action: "", status: "preparing" },
          tribe: { action: "", status: "preparing" }
        }).catch(e => console.error("Firebase update error:", e));
      }
    });

    return () => unsubscribeBattle();
  }, [selectedMaster, team, isCheckingAuth]);

  // 處理死亡隊伍自動準備的邏輯
  const isDead = stats.stamina <= 0;

  useEffect(() => {
    if (isCheckingAuth || !team || !groupNames[team] || !selectedMaster) return;
    if (isDead && battleState.status === "preparing") {
      // 陣亡隊伍無法行動，自動在對戰房中標記準備完成
      update(ref(db, `normalBattles/${selectedMaster}/tribe`), {
        action: "dead",
        status: "ready"
      }).catch(e => console.error("Auto ready dead team error:", e));
    }
  }, [isDead, battleState.status, selectedMaster, team, isCheckingAuth]);

  const handleConfirmReady = async () => {
    if (isDead) return;
    if (!selectedAction) return alert("請先選擇一種攻擊方式！");
    
    // 更新對戰房的狀態
    await update(ref(db, `normalBattles/${selectedMaster}`), {
      activeTribe: team, // 確保 activeTribe 鎖定為自己
      "tribe/action": selectedAction,
      "tribe/status": "ready"
    });
  };

  if (isCheckingAuth) return (
    <div className="min-h-screen bg-[#f5f0e6] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-stone-500">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="font-bold text-lg">驗證身份中...</p>
      </div>
    </div>
  );

  if (!team || !groupNames[team]) return null;

  return (
    <main className="min-h-screen bg-[#f5f0e6] flex flex-col items-center p-4">
      <Link href="/battle" className="absolute top-4 left-4 flex items-center gap-2 bg-white/50 px-4 py-2 rounded-full shadow-sm text-stone-600 hover:bg-white transition-colors font-bold">
        <Home size={18} /> 返回選角
      </Link>

      <div className="w-full max-w-md mt-16 flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-black text-stone-800 mb-2">第 {groupNames[team]} 小組</h1>
          
          <div className="flex items-center gap-2 justify-center bg-white/80 p-3 rounded-2xl border border-stone-200 mt-3">
            <span className="text-sm font-bold text-stone-600">正在挑戰：</span>
            <select
              value={selectedMaster}
              onChange={(e) => setSelectedMaster(e.target.value)}
              className="bg-stone-800 text-amber-400 px-3 py-1 text-sm rounded-lg font-black border-none outline-none cursor-pointer"
            >
              {Object.keys(mastersData).length > 0 ? (
                Object.keys(mastersData).sort((a, b) => {
                  const numA = parseInt(a.replace("master", "")) || 0;
                  const numB = parseInt(b.replace("master", "")) || 0;
                  return numA - numB;
                }).slice(0, 4).map((key) => {
                  const idx = parseInt(key.replace("master", "")) - 1;
                  const name = mastersData[key]?.name || `${beastNames[idx] || '神'}獸`;
                  return (
                    <option key={key} value={key}>{name}</option>
                  );
                })
              ) : (
                ["master1", "master2", "master3", "master4"].map((key, i) => (
                  <option key={key} value={key}>{beastNames[i]}神獸</option>
                ))
              )}
            </select>
            <div className="bg-amber-500 text-stone-900 font-black px-3 py-1 rounded-lg text-xs">
              第 {round} 回合
            </div>
          </div>
        </div>

        {/* 狀態列 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-stone-200">
          <h2 className="text-sm font-bold text-stone-400 mb-4 text-center uppercase tracking-widest">隊伍狀態</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center p-3 bg-rose-50 rounded-2xl border border-rose-100">
              <Heart className="text-rose-500 mb-2" size={24}/>
              <span className="text-xs text-stone-500 font-bold mb-1">體力</span>
              <span className="text-2xl font-black text-rose-600">{stats.stamina}</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-amber-50 rounded-2xl border border-amber-100">
              <Sword className="text-amber-500 mb-2" size={24}/>
              <span className="text-xs text-stone-500 font-bold mb-1">力量</span>
              <span className="text-2xl font-black text-amber-600">{stats.strength}</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-cyan-50 rounded-2xl border border-cyan-100">
              <Zap className="text-cyan-500 mb-2" size={24}/>
              <span className="text-xs text-stone-500 font-bold mb-1">魔力</span>
              <span className="text-2xl font-black text-cyan-600">{stats.magic}</span>
            </div>
          </div>
        </div>

        {/* 行動選擇 */}
        <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-stone-200">
          {isDead ? (
            <div className="py-6 text-center">
              <span className="inline-block bg-rose-100 text-rose-600 px-4 py-2 rounded-2xl font-black text-lg border border-rose-200">
                ⚠️ 隊伍已陣亡，無法行動。
              </span>
              <p className="text-xs text-stone-400 mt-2">請向關主或隊輔尋求復活/治療</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-black text-stone-800">選擇行動</h2>
                {battleState.status === "ready" ? (
                  <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
                    <CheckCircle size={14} /> 準備完成
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-xs font-black">
                    準備中...
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  disabled={battleState.status === "ready"}
                  onClick={() => setSelectedAction("physical")}
                  className={`p-4 rounded-2xl flex items-center gap-4 font-black transition-all border-2 ${selectedAction === "physical" ? "border-amber-500 bg-amber-50 text-amber-600" : "border-stone-100 bg-stone-50 text-stone-400 hover:bg-stone-100"}`}
                >
                  <Sword size={24} /> 物理攻擊
                </button>
                <button 
                  disabled={battleState.status === "ready"}
                  onClick={() => setSelectedAction("magic")}
                  className={`p-4 rounded-2xl flex items-center gap-4 font-black transition-all border-2 ${selectedAction === "magic" ? "border-cyan-500 bg-cyan-50 text-cyan-600" : "border-stone-100 bg-stone-50 text-stone-400 hover:bg-stone-100"}`}
                >
                  <Zap size={24} /> 魔法攻擊
                </button>
                <button 
                  disabled={battleState.status === "ready"}
                  onClick={() => setSelectedAction("defense")}
                  className={`p-4 rounded-2xl flex items-center gap-4 font-black transition-all border-2 ${selectedAction === "defense" ? "border-stone-800 bg-stone-100 text-stone-800" : "border-stone-100 bg-stone-50 text-stone-400 hover:bg-stone-100"}`}
                >
                  <Shield size={24} /> 防禦反擊
                </button>
              </div>

              {battleState.status === "preparing" && (
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirmReady}
                  className="w-full mt-6 py-4 rounded-2xl bg-stone-900 text-white font-black text-lg shadow-lg hover:bg-stone-800 transition-colors"
                >
                  確認準備完成
                </motion.button>
              )}

              {battleState.status === "ready" && (
                <div className="w-full mt-6 py-4 rounded-2xl bg-emerald-50 text-emerald-600 font-black text-center border border-emerald-200">
                  等待 {mastersData[selectedMaster]?.name || "神獸"} 進行回合結算...
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LeaderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f5f0e6]">載入中...</div>}>
      <LeaderContent />
    </Suspense>
  );
}
