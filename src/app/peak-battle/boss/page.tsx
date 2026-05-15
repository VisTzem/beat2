// src/app/peak-battle/boss/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ref, onValue, update } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { Heart, Sword, Zap, Shield, ShieldAlert, Activity, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export default function BossPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [bossState, setBossState] = useState({ hp: 5000, maxHp: 5000, strength: 100, magic: 100, action: "", status: "preparing" });
  const [round, setRound] = useState(1);
  const [teamsState, setTeamsState] = useState<Record<string, any>>({});
  const [tribesData, setTribesData] = useState<Record<string, any>>({});
  
  const [selectedAction, setSelectedAction] = useState("");

  const groupKeys = ["group1", "group2", "group3", "group4", "group5", "group6"];

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) router.push('/peak-battle');
      else setIsCheckingAuth(false);
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    const peakBattleRef = ref(db, `peakBattle`);
    const unsubscribeBattle = onValue(peakBattleRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setRound(data.round || 1);
        if (data.boss) {
          setBossState(data.boss);
          if (data.boss.status === "preparing" && !data.boss.action) {
            setSelectedAction("");
          }
        }
        if (data.teams) {
          setTeamsState(data.teams);
        }
      }
    });

    const tribesRef = ref(db, `tribes`);
    const unsubscribeTribes = onValue(tribesRef, (snapshot) => {
      if (snapshot.exists()) {
        setTribesData(snapshot.val());
      }
    });

    return () => {
      unsubscribeBattle();
      unsubscribeTribes();
    };
  }, []);

  const handleBossStatChange = async (stat: string, value: number) => {
    if (isNaN(value)) return;
    if (stat === "round") {
      await update(ref(db, `peakBattle`), { round: value });
    } else {
      await update(ref(db, `peakBattle/boss`), { [stat]: value });
    }
  };

  const handleSetMaxHp = async () => {
    const currentHp = Number(bossState.hp) || 0;
    if (currentHp <= 0) return alert("血量必須大於 0 才能設為基準！");
    await update(ref(db, `peakBattle/boss`), { maxHp: currentHp });
  };

  const handleRevive = async () => {
    const updates: Record<string, any> = {};
    groupKeys.forEach(key => {
      const currentHp = tribesData[key]?.stamina || 0;
      updates[`tribes/${key}/stamina`] = currentHp + 50;
    });
    await update(ref(db), updates);
    alert("已為所有隊伍恢復 50 點體力！");
  };

  const isAllTeamsDead = groupKeys.every(key => (tribesData[key]?.stamina || 0) <= 0);

  // 血條計算
  const maxHp = Number(bossState.maxHp) || 5000;
  const currentHp = Number(bossState.hp) || 0;
  const hpPercent = Math.min(100, Math.max(0, (currentHp / maxHp) * 100));
  const hpColor = hpPercent > 60 ? 'from-emerald-500 to-green-400'
    : hpPercent > 30 ? 'from-amber-500 to-yellow-400'
    : 'from-rose-600 to-red-500';
  const isAllTeamsReady = groupKeys.every(key => teamsState[key]?.status === "ready");

  const handleAttack = async () => {
    if (!selectedAction) return alert("Boss 請先選擇攻擊方式！");
    
    // 初始化變化量
    let bossHpDiff = 0;
    let bossStrDiff = 0;
    let bossMagDiff = 0;
    
    const teamUpdates: Record<string, { hp: number, str: number, mag: number }> = {};
    groupKeys.forEach(key => {
      teamUpdates[key] = { hp: 0, str: 0, mag: 0 };
    });

    const bossA = selectedAction;
    
    groupKeys.forEach(team => {
      const teamA = teamsState[team]?.action || "physical";
      const teamStats = tribesData[team] || {};
      
      // 所有數值都以 || 0 防護，避免 undefined 產生 NaN
      const bHp  = Number(bossState.hp)       || 0;
      const bStr = Number(bossState.strength)  || 0;
      const bMag = Number(bossState.magic)     || 0;

      const tHp  = Number(teamStats.stamina)   || 0;
      const tStr = Number(teamStats.strength)  || 0;
      const tMag = Number(teamStats.magic)     || 0;

      if (bossA === "physical" && teamA === "magic") {
        teamUpdates[team].hp -= bStr;
      } else if (teamA === "physical" && bossA === "magic") {
        bossHpDiff -= tStr;
      } else if (bossA === "magic" && teamA === "defense") {
        teamUpdates[team].hp -= bMag;
      } else if (teamA === "magic" && bossA === "defense") {
        bossHpDiff -= tMag;
      } else if (bossA === "defense" && teamA === "physical") {
        teamUpdates[team].hp -= Math.floor(tStr / 2);
      } else if (teamA === "defense" && bossA === "physical") {
        bossHpDiff -= Math.floor(bStr / 2);
      } else if (bossA === "physical" && teamA === "physical") {
        if (bStr > tStr) teamUpdates[team].hp -= bStr;
        else if (bStr < tStr) bossHpDiff -= tStr;
      } else if (bossA === "magic" && teamA === "magic") {
        if (bMag > tMag) teamUpdates[team].hp -= bMag;
        else if (bMag < tMag) bossHpDiff -= tMag;
      } else if (bossA === "defense" && teamA === "defense") {
        if (bHp > tHp) {
          teamUpdates[team].str -= 5;
          teamUpdates[team].mag -= 5;
        } else if (bHp < tHp) {
          bossStrDiff -= 5;
          bossMagDiff -= 5;
        }
      }
    });

    // 彙整最終更新到 Firebase
    const updates: Record<string, any> = {};
    
    // Boss：每回合結束體力 +10，所有值都轉為安全整數
    updates[`peakBattle/boss/hp`]       = Math.max(0, (Number(bossState.hp)       || 0) + bossHpDiff  + 10);
    updates[`peakBattle/boss/strength`] = Math.max(0, (Number(bossState.strength)  || 0) + bossStrDiff);
    updates[`peakBattle/boss/magic`]    = Math.max(0, (Number(bossState.magic)     || 0) + bossMagDiff);
    updates[`peakBattle/boss/action`]   = "";
    updates[`peakBattle/boss/status`]   = "preparing";
    
    updates[`peakBattle/round`] = (Number(round) || 1) + 1;

    groupKeys.forEach(team => {
      const cs = tribesData[team] || {};
      // 每個數值都防護 undefined/NaN
      const curHp  = Number(cs.stamina)  || 0;
      const curStr = Number(cs.strength) || 0;
      const curMag = Number(cs.magic)    || 0;

      updates[`tribes/${team}/stamina`]  = Math.max(0, curHp  + teamUpdates[team].hp  + 10);
      updates[`tribes/${team}/strength`] = Math.max(0, curStr + teamUpdates[team].str);
      updates[`tribes/${team}/magic`]    = Math.max(0, curMag + teamUpdates[team].mag);
      
      updates[`peakBattle/teams/${team}/action`] = "";
      updates[`peakBattle/teams/${team}/status`] = "preparing";
    });

    await update(ref(db), updates);
    setSelectedAction("");
    alert("回合結算完成！");
  };

  if (isCheckingAuth) return <div className="min-h-screen bg-stone-900 flex items-center justify-center text-white">驗證中...</div>;

  return (
    <main className="min-h-screen bg-stone-900 text-stone-100 p-4 md:p-8">
      
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        {/* 上半部：Boss 控制面板 */}
        <div className="bg-stone-800 border border-stone-700 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -top-10 text-amber-500/10 pointer-events-none">
            <ShieldAlert size={200} />
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 relative z-10 gap-4">
            <h1 className="text-3xl font-black text-amber-500 flex items-center gap-3">
              <ShieldAlert /> 原始碼 Boss 面板
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-stone-400 font-bold">第</span>
              <input 
                type="number" 
                value={round} 
                onChange={(e) => handleBossStatChange("round", parseInt(e.target.value))}
                className="bg-stone-900 border border-stone-700 text-amber-400 font-black text-center w-20 py-2 rounded-xl outline-none"
              />
              <span className="text-stone-400 font-bold">回合</span>
            </div>
          </div>

          {/* === 大螢幕血條 === */}
          <div className="relative z-10 mb-8">
            <div className="flex justify-between items-end mb-2">
              <div className="flex items-center gap-2">
                <Heart className="text-rose-400" size={20} />
                <span className="text-stone-300 font-bold text-sm uppercase tracking-widest">Boss 血量</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black tabular-nums" style={{ color: hpPercent > 60 ? '#34d399' : hpPercent > 30 ? '#fbbf24' : '#f87171' }}>
                  {currentHp.toLocaleString()}
                </span>
                <span className="text-stone-500 font-bold text-lg">/ {maxHp.toLocaleString()}</span>
                <button
                  onClick={handleSetMaxHp}
                  title="設為滿血基準"
                  className="text-xs font-black bg-stone-700 hover:bg-stone-600 text-stone-300 px-3 py-1.5 rounded-lg transition-colors border border-stone-600"
                >
                  設為滿血
                </button>
              </div>
            </div>
            <div className="w-full h-7 bg-stone-900 rounded-full overflow-hidden border border-stone-700 shadow-inner relative">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${hpColor} shadow-lg`}
                initial={{ width: 0 }}
                animate={{ width: `${hpPercent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
              {/* 玻璃反光效果 */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-full pointer-events-none" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-black text-sm drop-shadow-md">{hpPercent.toFixed(1)}%</span>
              </div>
            </div>
            {/* 低血量警告動畫 */}
            {hpPercent <= 30 && (
              <motion.p
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="text-rose-400 font-black text-center text-sm mt-2 tracking-widest"
              >
                ⚠ 血量危急！
              </motion.p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            {/* Boss 三圍調整 */}
            <div className="flex flex-col gap-4 bg-stone-900/50 p-6 rounded-2xl border border-stone-700">
              <h2 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-2">數值調整</h2>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-rose-400 font-black w-24"><Heart size={18}/> 血量</span>
                <input type="number" value={bossState.hp} onChange={e => handleBossStatChange("hp", parseInt(e.target.value))} className="bg-stone-800 text-white font-black text-center w-24 py-2 rounded-lg outline-none" />
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-stone-500 font-bold w-24 text-sm">最大血量</span>
                <input type="number" value={bossState.maxHp} onChange={e => handleBossStatChange("maxHp", parseInt(e.target.value))} className="bg-stone-800 text-stone-400 font-black text-center w-24 py-2 rounded-lg outline-none text-sm" />
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-amber-400 font-black w-24"><Sword size={18}/> 力量</span>
                <input type="number" value={bossState.strength} onChange={e => handleBossStatChange("strength", parseInt(e.target.value))} className="bg-stone-800 text-white font-black text-center w-24 py-2 rounded-lg outline-none" />
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-cyan-400 font-black w-24"><Zap size={18}/> 魔力</span>
                <input type="number" value={bossState.magic} onChange={e => handleBossStatChange("magic", parseInt(e.target.value))} className="bg-stone-800 text-white font-black text-center w-24 py-2 rounded-lg outline-none" />
              </div>
            </div>

            {/* Boss 行動選擇 */}
            <div className="flex flex-col gap-4 bg-stone-900/50 p-6 rounded-2xl border border-stone-700">
              <h2 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-2">決定行動</h2>
              <div className="flex flex-col gap-3">
                <button onClick={() => setSelectedAction("physical")} className={`py-3 px-4 rounded-xl font-black flex justify-between items-center transition-colors border ${selectedAction === 'physical' ? 'bg-amber-500 text-stone-900 border-amber-400' : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'}`}>
                  <span className="flex items-center gap-2"><Sword size={20}/> 物理攻擊</span>
                  {selectedAction === 'physical' && <Activity size={18} />}
                </button>
                <button onClick={() => setSelectedAction("magic")} className={`py-3 px-4 rounded-xl font-black flex justify-between items-center transition-colors border ${selectedAction === 'magic' ? 'bg-cyan-500 text-stone-900 border-cyan-400' : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'}`}>
                  <span className="flex items-center gap-2"><Zap size={20}/> 魔法攻擊</span>
                  {selectedAction === 'magic' && <Activity size={18} />}
                </button>
                <button onClick={() => setSelectedAction("defense")} className={`py-3 px-4 rounded-xl font-black flex justify-between items-center transition-colors border ${selectedAction === 'defense' ? 'bg-stone-100 text-stone-900 border-stone-300' : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'}`}>
                  <span className="flex items-center gap-2"><Shield size={20}/> 防禦反擊</span>
                  {selectedAction === 'defense' && <Activity size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 下半部：六組狀態與按鈕 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {groupKeys.map((key, i) => {
            const stats = tribesData[key] || { stamina: 0, strength: 0, magic: 0 };
            const status = teamsState[key]?.status || "preparing";
            const isReady = status === "ready";
            
            return (
              <div key={key} className={`bg-stone-800 p-5 rounded-2xl border-2 transition-all ${isReady ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-stone-700'}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-lg text-stone-200">第 {["一","二","三","四","五","六"][i]} 組</h3>
                  <span className={`text-xs font-black px-2 py-1 rounded-full ${isReady ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-700 text-stone-400'}`}>
                    {isReady ? '已準備' : '準備中...'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-center">
                  <div className="flex-1"><Heart size={16} className="text-rose-400 mx-auto mb-1"/><span className="text-lg font-black text-stone-100">{stats.stamina}</span></div>
                  <div className="flex-1"><Sword size={16} className="text-amber-400 mx-auto mb-1"/><span className="text-lg font-black text-stone-100">{stats.strength}</span></div>
                  <div className="flex-1"><Zap size={16} className="text-cyan-400 mx-auto mb-1"/><span className="text-lg font-black text-stone-100">{stats.magic}</span></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部控制區塊 */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mt-4">
          <button 
            onClick={handleRevive}
            disabled={!isAllTeamsDead}
            className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black transition-all ${isAllTeamsDead ? 'bg-emerald-500 text-stone-900 hover:bg-emerald-400 shadow-lg shadow-emerald-500/30' : 'bg-stone-800 text-stone-600 cursor-not-allowed border border-stone-700'}`}
          >
            <RefreshCw size={20} /> 六組群體復活 (+50體力)
          </button>

          <button 
            onClick={handleAttack}
            disabled={!isAllTeamsReady || !selectedAction}
            className={`flex-1 md:flex-none flex justify-center items-center gap-3 px-12 py-5 rounded-2xl text-xl font-black transition-all ${isAllTeamsReady && selectedAction ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-[0_0_30px_rgba(225,29,72,0.5)] scale-105' : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700'}`}
          >
            <Sword size={28} /> {isAllTeamsReady && selectedAction ? '發動攻擊！結算回合' : '等待全員準備完成...'}
          </button>
        </div>

      </div>
    </main>
  );
}
