// src/app/peak-battle/boss/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ref, onValue, update } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { Heart, Sword, Zap, Shield, ShieldAlert, Activity, RefreshCw, Home, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

export default function BossPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isBattleLoaded, setIsBattleLoaded] = useState(false);
  const [isTribesLoaded, setIsTribesLoaded] = useState(false);

  // 初始化 Boss 三圍設為 676, 76, 67，預設名稱為黑化原始馬——木馬
  const [bossState, setBossState] = useState({ hp: 676, maxHp: 676, strength: 76, magic: 67, action: "", status: "preparing" });
  const [bossName, setBossName] = useState("黑化原始馬——木馬");
  const [round, setRound] = useState(1);
  const [teamsState, setTeamsState] = useState<Record<string, any>>({});
  const [tribesData, setTribesData] = useState<Record<string, any>>({});
  
  const [selectedAction, setSelectedAction] = useState("");

  // 小組員恢復為原先的 6 組
  const groupKeys = ["group1", "group2", "group3", "group4", "group5", "group6"];
  const groupNames = ["一", "二", "三", "四", "五", "六"];

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
          setBossName(data.boss.name || "黑化原始馬——木馬");
          if (data.boss.status === "preparing" && !data.boss.action) {
            setSelectedAction("");
          }
        }
        if (data.teams) {
          setTeamsState(data.teams);
        }
      } else {
        // 初始化 peakBattle 資料 (三圍 676, 76, 67, 名稱黑化原始馬——木馬)
        update(ref(db, `peakBattle`), {
          round: 1,
          boss: { name: "黑化原始馬——木馬", hp: 676, maxHp: 676, strength: 76, magic: 67, action: "", status: "preparing" },
          teams: groupKeys.reduce((acc, key) => ({ ...acc, [key]: { action: "", status: "preparing" } }), {})
        });
      }
      setIsBattleLoaded(true);
    });

    const tribesRef = ref(db, `tribes`);
    const unsubscribeTribes = onValue(tribesRef, (snapshot) => {
      if (snapshot.exists()) {
        setTribesData(snapshot.val());
      }
      setIsTribesLoaded(true);
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

  const handleResetBossDefault = async () => {
    if (!confirm("確定要將 黑化原始馬——木馬 恢復成預設數值 (生命676, 力量76, 魔力67) 嗎？")) return;
    await update(ref(db, `peakBattle/boss`), {
      hp: 676,
      maxHp: 676,
      strength: 76,
      magic: 67
    });
    alert("已成功恢復預設值！");
  };

  // 陣亡的隊伍數量 (6組)
  const deadTeamsCount = groupKeys.filter(key => (tribesData[key]?.stamina || 0) <= 0).length;

  // 女神像復活能力僅能在三個以上的隊伍陣亡時使用
  const handleRevive = async () => {
    if (deadTeamsCount < 3) return alert("陣亡小組未達 3 組，無法使用女神像復活！");
    
    const updates: Record<string, any> = {};
    groupKeys.forEach(key => {
      const currentHp = tribesData[key]?.stamina || 0;
      if (currentHp <= 0) {
        updates[`tribes/${key}/stamina`] = 50; // 復活已陣亡的小組，恢復50點體力
        updates[`peakBattle/teams/${key}/action`] = "";
        updates[`peakBattle/teams/${key}/status`] = "preparing";
      }
    });
    await update(ref(db), updates);
    alert("已使用女神像！復活所有陣亡的小組並恢復 50 點體力！");
  };

  const handleCancelAllReady = async () => {
    if (!confirm("確定要將所有小組的準備狀態改為「準備中」嗎？")) return;
    
    const updates: Record<string, any> = {};
    groupKeys.forEach(key => {
      const currentHp = tribesData[key]?.stamina || 0;
      if (currentHp > 0) {
        updates[`peakBattle/teams/${key}/action`] = "";
        updates[`peakBattle/teams/${key}/status`] = "preparing";
      }
    });
    
    try {
      await update(ref(db), updates);
      alert("已將所有存活小組重置為準備中！");
    } catch (e) {
      console.error(e);
      alert("重置失敗，請檢查網路連線！");
    }
  };

  // 當前 Boss 血量與百分比 (小於 1 時顯示剩餘 1)
  const maxHp = Number(bossState.maxHp) || 676;
  const currentHp = Number(bossState.hp) || 0;
  const displayHp = currentHp < 1 ? 1 : currentHp;
  const hpPercent = Math.min(100, Math.max(0, (displayHp / maxHp) * 100));
  const hpColor = currentHp < 1 ? 'from-rose-600 to-red-500'
    : hpPercent > 60 ? 'from-emerald-500 to-green-400'
    : hpPercent > 30 ? 'from-amber-500 to-yellow-400'
    : 'from-rose-600 to-red-500';

  // 僅檢查存活隊伍是否準備完成
  const aliveKeys = groupKeys.filter(key => (tribesData[key]?.stamina || 0) > 0);
  const isAllTeamsReady = aliveKeys.length > 0
    ? aliveKeys.every(key => teamsState[key]?.status === "ready")
    : true;

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
      // 陣亡的隊伍不能行動 (跳過計算)
      const tHp = Number(tribesData[team]?.stamina) || 0;
      if (tHp <= 0) return;

      const teamA = teamsState[team]?.action || "physical";
      const teamStats = tribesData[team] || {};
      
      const bHp  = Number(bossState.hp)       || 0;
      const bStr = Number(bossState.strength)  || 0;
      const bMag = Number(bossState.magic)     || 0;

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

    // 彙整最終更新到 Firebase (取消每回合體力回血 +10)
    const updates: Record<string, any> = {};
    
    updates[`peakBattle/boss/hp`]       = Math.max(0, (Number(bossState.hp)       || 0) + bossHpDiff);
    updates[`peakBattle/boss/strength`] = Math.max(0, (Number(bossState.strength)  || 0) + bossStrDiff);
    updates[`peakBattle/boss/magic`]    = Math.max(0, (Number(bossState.magic)     || 0) + bossMagDiff);
    updates[`peakBattle/boss/action`]   = "";
    updates[`peakBattle/boss/status`]   = "preparing";
    
    updates[`peakBattle/round`] = (Number(round) || 1) + 1;

    groupKeys.forEach(team => {
      const cs = tribesData[team] || {};
      const curHp  = Number(cs.stamina)  || 0;
      const curStr = Number(cs.strength) || 0;
      const curMag = Number(cs.magic)    || 0;

      if (curHp <= 0) {
        // 已陣亡組別：體力鎖為 0，且狀態重置為準備中
        updates[`tribes/${team}/stamina`]  = 0;
        updates[`peakBattle/teams/${team}/action`] = "";
        updates[`peakBattle/teams/${team}/status`] = "preparing";
        return;
      }

      // 存活組別：更新扣血 (無 +10 回血)
      updates[`tribes/${team}/stamina`]  = Math.max(0, curHp  + teamUpdates[team].hp);
      updates[`tribes/${team}/strength`] = Math.max(0, curStr + teamUpdates[team].str);
      updates[`tribes/${team}/magic`]    = Math.max(0, curMag + teamUpdates[team].mag);
      
      updates[`peakBattle/teams/${team}/action`] = "";
      updates[`peakBattle/teams/${team}/status`] = "preparing";
    });

    await update(ref(db), updates);
    setSelectedAction("");
    alert("回合結算完成！");
  };

  if (isCheckingAuth || !isBattleLoaded || !isTribesLoaded) return (
    <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center text-stone-400 gap-4">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      <p className="font-bold text-lg">載入戰域資料中...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-stone-900 text-stone-100 p-4 md:p-8 relative pt-16 md:pt-8">
      <Link href="/peak-battle" className="absolute top-4 left-4 flex items-center gap-2 bg-stone-850 border border-stone-700 hover:bg-stone-800 px-4 py-2 rounded-full shadow-lg text-stone-300 transition-colors font-bold z-30">
        <Home size={18} /> 返回選角
      </Link>
      
      {/* === 程式馬/神獸血量小於1時，顯示血量剩餘1，並且血條大大顯示於螢幕中央 === */}
      {currentHp < 1 && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-4xl text-center flex flex-col gap-6"
          >
            <motion.h1
              animate={{ textShadow: ["0 0 10px #ef4444", "0 0 35px #ef4444", "0 0 10px #ef4444"] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-6xl md:text-8xl font-black text-rose-500 uppercase tracking-widest leading-none drop-shadow-2xl"
            >
              {bossName} 瀕死防線
            </motion.h1>
            <p className="text-xl md:text-2xl font-bold text-stone-400">生命值極限保留 1 點，請執行最終討伐！</p>
            
            {/* 螢幕中央的巨大血條 */}
            <div className="w-full bg-stone-950 border-4 border-rose-600 rounded-full h-20 relative overflow-hidden shadow-[0_0_60px_rgba(239,68,68,0.6)] my-8">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                className="h-full bg-gradient-to-r from-red-600 to-rose-500"
                style={{ width: `${(1 / maxHp) * 100}%`, minWidth: '35px' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white text-3xl md:text-4xl font-black tracking-widest drop-shadow-[0_3px_5px_rgba(0,0,0,0.9)] animate-pulse">
                  HP: 1 / {maxHp}
                </span>
              </div>
            </div>

            <p className="text-stone-500 text-sm font-bold">小組員可選用物理/魔法攻擊，將其徹底瓦解</p>

            <button
              onClick={handleResetBossDefault}
              className="mx-auto mt-6 bg-stone-850 border border-stone-700 hover:bg-stone-800 px-6 py-3 rounded-xl font-bold text-sm text-stone-300 transition-all flex items-center gap-2"
            >
              <RefreshCw size={16} /> 恢復預設數值 (生命 676, 力量 76, 魔力 67)
            </button>
          </motion.div>
        </div>
      )}

      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        {/* 上半部：Boss 控制面板 */}
        <div className="bg-stone-800 border border-stone-700 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -top-10 text-amber-500/10 pointer-events-none">
            <ShieldAlert size={200} />
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 relative z-10 gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-3xl font-black text-amber-500 flex items-center gap-3">
                <ShieldAlert /> {bossName} 面板
              </h1>
            </div>

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
                <span className="text-stone-300 font-bold text-sm uppercase tracking-widest">{bossName} 血量</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black tabular-nums" style={{ color: hpPercent > 60 ? '#34d399' : hpPercent > 30 ? '#fbbf24' : '#f87171' }}>
                  {displayHp.toLocaleString()}
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
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm font-bold text-stone-400 uppercase tracking-widest">數值調整</h2>
                <button
                  onClick={handleResetBossDefault}
                  className="text-xs bg-stone-800 hover:bg-stone-700 border border-stone-600 text-amber-400 px-3 py-1 rounded-lg transition-colors font-black flex items-center gap-1"
                >
                  <RefreshCw size={12} /> 設為預設 (676/76/67)
                </button>
              </div>
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
            const isDead = stats.stamina <= 0;
            
            return (
              <div key={key} className={`bg-stone-800 p-5 rounded-2xl border-2 transition-all ${isDead ? 'border-rose-500/30 opacity-60' : (isReady ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-stone-700')}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-lg text-stone-200">第 {groupNames[i]} 小組</h3>
                  <span className={`text-xs font-black px-2 py-1 rounded-full ${isDead ? 'bg-rose-500/20 text-rose-400' : (isReady ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-700 text-stone-400')}`}>
                    {isDead ? '已陣亡' : (isReady ? '已準備' : '準備中...')}
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
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mt-4 w-full">
          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            {/* 女神像復活能力僅能在三個以上的隊伍陣亡時使用 */}
            <button 
              onClick={handleRevive}
              disabled={deadTeamsCount < 3}
              className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black transition-all ${deadTeamsCount >= 3 ? 'bg-emerald-500 text-stone-900 hover:bg-emerald-400 shadow-lg shadow-emerald-500/30' : 'bg-stone-800 text-stone-600 cursor-not-allowed border border-stone-700'}`}
            >
              <RefreshCw size={20} /> 女神像 ({deadTeamsCount}/3 陣亡)
            </button>

            {/* 取消全員準備按鈕 */}
            <button 
              onClick={handleCancelAllReady}
              className="flex items-center gap-2 px-6 py-4 rounded-2xl font-black transition-all bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 shadow-lg"
            >
              <X size={20} /> 取消全員準備
            </button>
          </div>

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
