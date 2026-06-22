"use client";

export const runtime = 'edge';

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ref, onValue, update, goOnline, goOffline } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { TribeStats, StageMaster } from "@/types";
import { Sparkles, LogOut, Dices, ShieldCheck, Plus, Minus, Home, Zap, Sword, Heart, TrendingUp, Flag, BookOpen, Tag, RefreshCw } from "lucide-react";
import Link from "next/link";

// 固定基礎值
const BASE_NORMAL = { stamina: 20, strength: 10, magic: 10 };
const BASE_BLESSED = { stamina: 23, strength: 13, magic: 13 };

const groupNames: Record<string, string> = { group1: "一", group2: "二", group3: "三", group4: "四", group5: "五", group6: "六" };

export default function GuideDashboardPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [selectedStageType, setSelectedStageType] = useState<'stamina' | 'strength' | 'magic'>('stamina');
  const [currentStats, setCurrentStats] = useState<TribeStats>({ stamina: 0, strength: 0, magic: 0, goddessBlessing: false });
  const [mastersData, setMastersData] = useState<Record<string, StageMaster>>({});
  const [difficulty, setDifficulty] = useState(1);
  const [diceRoll, setDiceRoll] = useState(1);
  const [manualValue, setManualValue] = useState<string>("5");
  const [confirmAction, setConfirmAction] = useState<any | null>(null);
  const [showStagePrompt, setShowStagePrompt] = useState(false);
  const [selectedStageOption, setSelectedStageOption] = useState<number | 'skip' | null>(null);

  // 根據女神祝福層數決定基礎值（固定，不可手動更改）
  const blessingCount = typeof currentStats.goddessBlessing === 'number'
    ? currentStats.goddessBlessing
    : (currentStats.goddessBlessing ? 1 : 0);

  const baseValues = {
    stamina: BASE_NORMAL.stamina + blessingCount * 3,
    strength: BASE_NORMAL.strength + blessingCount * 3,
    magic: BASE_NORMAL.magic + blessingCount * 3,
  };

  useEffect(() => {
    const allowedGroups = ["group1", "group2", "group3", "group4", "group5", "group6"];
    if (!allowedGroups.includes(groupId)) { router.push('/guide'); return; }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) router.push('/guide');
      else setIsCheckingAuth(false);
    });
    return () => unsubscribeAuth();
  }, [groupId, router]);

  useEffect(() => {
    if (!groupId) return;
    goOnline(db);
    const unsubTribe = onValue(ref(db, `tribes/${groupId}`), (snapshot) => {
      if (snapshot.val()) setCurrentStats(snapshot.val());
    });
    const unsubMasters = onValue(ref(db, `masters`), (snapshot) => {
      if (snapshot.val()) setMastersData(snapshot.val());
    });
    const handleVisibility = () => { if (document.hidden) goOffline(db); else goOnline(db); };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => { unsubTribe(); unsubMasters(); document.removeEventListener("visibilitychange", handleVisibility); };
  }, [groupId]);

  const handleConfirmStep1 = () => {
    setSelectedStageOption(null);
    setShowStagePrompt(true);
  };

  const handleExecuteFinal = async () => {
    if (!confirmAction || selectedStageOption === null) return;
    const targetStats = { ...confirmAction.payload.targetStats };
    if (selectedStageOption !== 'skip') {
      const stageKey = `stage${selectedStageOption}`;
      targetStats[stageKey] = (currentStats[stageKey as keyof TribeStats] as number || 0) + 1;
    }
    await update(ref(db, `tribes/${groupId}`), targetStats);
    setConfirmAction(null);
    setShowStagePrompt(false);
    setSelectedStageOption(null);
  };

  const handleCancelAll = () => {
    setConfirmAction(null);
    setShowStagePrompt(false);
    setSelectedStageOption(null);
  };

  const autoGain = baseValues[selectedStageType] + (difficulty * diceRoll);

  const triggerConfirm = (stat: keyof TribeStats, newVal: number, title: string, colorTheme: string, Icon: React.ElementType) => {
    const finalVal = Math.min(Math.max(0, newVal), 9999);
    setConfirmAction({ type: 'update', payload: { title, colorTheme, targetStats: { ...currentStats, [stat]: finalVal }, icon: Icon } });
  };

  const handleLogout = async () => {
    await auth.signOut();
    document.cookie = "tribe_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push('/guide');
  };

  const toggleBlessing = async () => {
    const newVal = !currentStats.goddessBlessing;
    await update(ref(db, `tribes/${groupId}`), { goddessBlessing: newVal });
  };

  const themeColors: Record<string, { bg: string, text: string, lightBg: string }> = {
    rose:    { bg: '#f43f5e', text: '#f43f5e', lightBg: '#ffe4e6' },
    amber:   { bg: '#f59e0b', text: '#d97706', lightBg: '#fef3c7' },
    cyan:    { bg: '#06b6d4', text: '#06b6d4', lightBg: '#cffafe' },
    red:     { bg: '#ef4444', text: '#ef4444', lightBg: '#fee2e2' },
    emerald: { bg: '#10b981', text: '#10b981', lightBg: '#d1fae5' },
    stone:   { bg: '#78716c', text: '#78716c', lightBg: '#f5f5f4' },
  };

  if (isCheckingAuth) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4 text-stone-500">
        <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="font-bold">正在驗證身分...</p>
      </div>
    </div>
  );

  // 決定顯示哪一關的關主資料（根據 groupId 對應 master）
  const groupIndex = parseInt(groupId.replace('group', ''));
  const currentMaster = mastersData[`master${groupIndex}`];

  return (
    <main className="guide-main">
      <Link href="/" className="btn-back-home guide-z-top">
        <Home size={18} /> 返回主選單
      </Link>

      <div className="layout-container guide-layout">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="guide-dashboard">

          {/* 頂部狀態列 */}
          <div className="guide-status-bar" style={{ marginTop: '2rem' }}>
            <div className="guide-status-info">
              <div className="guide-status-icon"><ShieldCheck size={32} /></div>
              <div>
                <p className="guide-status-subtitle">正在管理</p>
                <div className="flex items-center">
                  <select
                    value={groupId}
                    onChange={(e) => router.push(`/guide/${e.target.value}`)}
                    className="guide-status-title bg-transparent text-white font-black outline-none border-b-2 border-amber-400 cursor-pointer pr-4"
                  >
                    {Object.entries(groupNames).map(([key, val]) => (
                      <option key={key} value={key} className="bg-stone-900 text-stone-100">
                        第 {val} 組部落
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <button onClick={handleLogout} className="guide-op-btn guide-btn-logout">
              <LogOut size={18}/> 登出管理員
            </button>
          </div>



          {/* 當前屬性 + 快捷事件 + 微調 */}
          <div className="guide-dashboard-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* 當前屬性數值卡片 */}
              <div className="guide-card">
                <div className="guide-section-header">
                  <Sparkles size={24} className="icon-amber"/>
                  <h3 className="guide-section-title">當前屬性數值</h3>
                  {blessingCount > 0 && (
                    <span className="ml-auto text-xs font-black bg-amber-100 text-amber-600 px-2 py-1 rounded-full flex items-center gap-1">
                      <Sparkles size={12}/> 女神祝福 x{blessingCount}
                    </span>
                  )}
                </div>
                <div className="guide-stat-grid">
                  <div className="guide-stat-card stat-stamina">
                    <Heart className="text-rose" size={28}/>
                    <span className="stat-label">體力</span>
                    <p className="stat-value text-rose">{currentStats.stamina || 0}</p>
                  </div>
                  <div className="guide-stat-card stat-strength">
                    <Sword className="text-amber" size={28}/>
                    <span className="stat-label">力量</span>
                    <p className="stat-value text-amber">{currentStats.strength || 0}</p>
                  </div>
                  <div className="guide-stat-card stat-magic">
                    <Zap className="text-cyan" size={28}/>
                    <span className="stat-label">魔力</span>
                    <p className="stat-value text-cyan">{currentStats.magic || 0}</p>
                  </div>
                </div>
              </div>

              {/* 快捷事件結算 */}
              <div className="guide-card">
                <div className="guide-section-header">
                  <Dices size={24} className="icon-indigo"/>
                  <h3 className="guide-section-title">快捷事件結算</h3>
                </div>

                <div className="guide-calc-panel" style={{ marginBottom: '1rem' }}>
                  <label className="guide-calc-label">選擇關卡類型</label>
                  <div className="guide-btn-row">
                    <button onClick={() => setSelectedStageType('stamina')} className={`guide-btn-square ${selectedStageType === 'stamina' ? 'guide-btn-square-active-rose' : ''}`}>體力</button>
                    <button onClick={() => setSelectedStageType('strength')} className={`guide-btn-square ${selectedStageType === 'strength' ? 'guide-btn-square-active-amber' : ''}`}>力量</button>
                    <button onClick={() => setSelectedStageType('magic')} className={`guide-btn-square ${selectedStageType === 'magic' ? 'guide-btn-square-active-cyan' : ''}`}>魔力</button>
                  </div>
                </div>

                {/* 固定基礎值（唯讀顯示） */}
                <div className="guide-base-val-panel">
                  <label className="guide-calc-label">
                    關卡預設基礎值
                    {blessingCount > 0 && <span className="ml-2 text-amber-500 text-xs font-black">（女神祝福 x{blessingCount} 加成中）</span>}
                  </label>
                  <div className="guide-base-val-grid">
                    {(['stamina', 'strength', 'magic'] as const).map(key => {
                      const colors = key === 'stamina' ? { bg:'bg-rose-50', border:'border-rose-200', title:'text-rose-600', num:'text-rose-600' }
                        : key === 'strength' ? { bg:'bg-amber-50', border:'border-amber-200', title:'text-amber-600', num:'text-amber-600' }
                        : { bg:'bg-cyan-50', border:'border-cyan-200', title:'text-cyan-600', num:'text-cyan-600' };
                      const label = key === 'stamina' ? '體力' : key === 'strength' ? '力量' : '魔力';
                      return (
                        <div key={key} className={`guide-base-val-card ${colors.border} ${colors.bg} cursor-not-allowed`}>
                          <span className={`guide-base-val-title ${colors.title}`}>{label}</span>
                          <span className={`guide-base-val-num ${colors.num} text-2xl font-black`}>{baseValues[key]}</span>
                          <span className="text-[10px] text-stone-400 font-bold">固定值</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="guide-calc-space">
                  <div className="guide-calc-panel">
                    <label className="guide-calc-label">難度倍率</label>
                    <div className="guide-btn-row">
                      {[1,2,3,4,5].map(d => (
                        <button key={d} onClick={() => setDifficulty(d)} className={`guide-btn-square ${difficulty === d ? 'guide-btn-square-active-amber' : ''}`}>{d}x</button>
                      ))}
                    </div>
                  </div>
                  <div className="guide-calc-panel">
                    <label className="guide-calc-label">骰子點數</label>
                    <div className="guide-btn-row">
                      {[1,2,3,4,5,6].map(d => (
                        <button key={d} onClick={() => setDiceRoll(d)} className={`guide-btn-square ${diceRoll === d ? 'guide-btn-square-active-indigo' : ''}`}>{d}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="guide-result-box">
                  <p className="guide-result-label">預計獲得點數 (基礎 + 難度 × 骰子)</p>
                  <p className="guide-result-value">+{autoGain}</p>
                </div>

                <div className="guide-btn-row">
                  <button
                    onClick={() => {
                      const titles = { stamina: '體力', strength: '力量', magic: '魔力' };
                      const themes = { stamina: 'rose', strength: 'amber', magic: 'cyan' };
                      const icons = { stamina: Heart, strength: Sword, magic: Zap };
                      triggerConfirm(selectedStageType, (currentStats[selectedStageType] || 0) + autoGain, `增加 ${autoGain} 點${titles[selectedStageType]}`, themes[selectedStageType], icons[selectedStageType]);
                    }}
                    className={`guide-op-btn guide-btn-large bg-${selectedStageType === 'stamina' ? 'rose' : selectedStageType === 'strength' ? 'amber' : 'cyan'}`}
                  >
                    <Sparkles size={24}/> 增加數值
                  </button>
                </div>
              </div>
            </div>

            {/* 右欄：自訂微調 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="guide-card">
                <div className="guide-section-header">
                  <TrendingUp size={24} className="icon-emerald"/>
                  <h3 className="guide-section-title">自訂數值微調</h3>
                </div>

                <div className="guide-calc-panel" style={{ marginBottom: '1.5rem' }}>
                  <label className="guide-calc-label">輸入變更額度</label>
                  <input type="number" value={manualValue} onChange={(e) => setManualValue(e.target.value)} className="guide-input guide-manual-input" />
                  <div className="guide-btn-row">
                    {['1','5','10','50'].map(v => (
                      <button key={v} onClick={() => setManualValue(v)} className="guide-btn-square">{v}</button>
                    ))}
                  </div>
                </div>

                <div className="guide-adjust-list">
                  {(['stamina', 'strength', 'magic'] as const).map((key) => {
                    const label = key === 'stamina' ? '體力' : key === 'strength' ? '力量' : '魔力';
                    const val = Math.abs(parseInt(manualValue||'0'));
                    const theme = key === 'stamina' ? 'rose' : key === 'strength' ? 'amber' : 'cyan';
                    const StatIcon = key === 'stamina' ? Heart : key === 'strength' ? Sword : Zap;

                    return (
                      <div key={key} className="guide-adjust-row">
                        <div className="guide-adjust-title">
                          <StatIcon className={`text-${theme}`} size={24}/>
                          <span className="guide-adjust-name">{label}</span>
                        </div>
                        <div className="guide-adjust-actions">
                          <button onClick={() => triggerConfirm(key, (currentStats[key] || 0) - val, `扣除 ${val} 點${label}`, 'red', StatIcon)} className="guide-op-btn guide-btn-medium bg-red-light">
                            <Minus size={20}/> 扣除
                          </button>
                          <button onClick={() => triggerConfirm(key, (currentStats[key] || 0) + val, `增加 ${val} 點${label}`, 'emerald', StatIcon)} className="guide-op-btn guide-btn-medium bg-emerald">
                            <Plus size={20}/> 增加
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* 闖關進度管理 (手動修改每一關的通關次數) */}
              <div className="guide-card">
                <div className="guide-section-header">
                  <Flag size={24} className="icon-indigo text-indigo-500" />
                  <h3 className="guide-section-title">神廟通關次數手動調整</h3>
                </div>

                <div className="flex flex-col gap-3">
                  {[1, 2, 3, 4, 5, 6].map(stageNum => {
                    const templeNames = ["反偵察神廟", "曼巴神廟", "好帥神廟", "節奏神廟", "綜藝神廟", "特工神廟"];
                    const stageKey = `stage${stageNum}`;
                    const currentCount = currentStats[stageKey as keyof TribeStats] as number || 0;

                    return (
                      <div key={stageNum} className="flex justify-between items-center bg-stone-50 border border-stone-200 p-3 rounded-xl">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-stone-850">{templeNames[stageNum - 1]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              const next = Math.max(0, currentCount - 1);
                              await update(ref(db, `tribes/${groupId}`), { [stageKey]: next });
                            }}
                            className="bg-white border border-stone-300 hover:bg-stone-50 p-1.5 rounded-lg text-stone-600 shadow-sm transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="font-black text-base w-6 text-center text-stone-800">{currentCount}</span>
                          <button
                            onClick={async () => {
                              const next = currentCount + 1;
                              await update(ref(db, `tribes/${groupId}`), { [stageKey]: next });
                            }}
                            className="bg-amber-500 text-stone-900 hover:bg-amber-400 p-1.5 rounded-lg font-black shadow-sm transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>

          {/* 女神祝福 */}
          <div className="guide-card">
            <div className="guide-section-header">
              <Sparkles size={24} className="icon-amber"/>
              <h3 className="guide-section-title">特殊狀態管理</h3>
            </div>
            <div className="flex justify-between items-center bg-stone-50 border border-stone-200 p-4 rounded-2xl">
              <div className="flex flex-col gap-1">
                <span className="font-bold flex items-center gap-1 text-stone-800">
                  <Sparkles className={blessingCount > 0 ? "text-amber-500" : "text-stone-400"} size={20} />
                  女神的祝福 (累積 {blessingCount} 層)
                </span>
                <span className="text-xs text-stone-500">
                  當前基礎值：體力 {baseValues.stamina} / 力量 {baseValues.strength} / 魔力 {baseValues.magic}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const next = Math.max(0, blessingCount - 1);
                    await update(ref(db, `tribes/${groupId}`), { goddessBlessing: next });
                  }}
                  className="bg-white border border-stone-300 hover:bg-stone-50 p-2 rounded-lg text-stone-600 shadow-sm"
                >
                  <Minus size={16} />
                </button>
                <span className="font-black text-xl w-8 text-center text-stone-800">{blessingCount}</span>
                <button
                  onClick={async () => {
                    const next = blessingCount + 1;
                    await update(ref(db, `tribes/${groupId}`), { goddessBlessing: next });
                  }}
                  className="bg-amber-500 text-stone-900 hover:bg-amber-400 p-2 rounded-lg font-black shadow-sm"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* 系統重設 (恢復預設屬性值) */}
          <div className="guide-card mt-6">
            <div className="guide-section-header">
              <RefreshCw size={24} className="icon-red text-rose-500" />
              <h3 className="guide-section-title text-rose-600">系統危險區</h3>
            </div>
            <div className="flex justify-between items-center bg-rose-50 border border-rose-100 p-4 rounded-2xl">
              <div className="flex flex-col gap-1">
                <span className="font-bold text-rose-800 flex items-center gap-1.5">
                  ⚠️ 恢復預設屬性數值
                </span>
                <span className="text-xs text-rose-500 font-medium">
                  將體力恢復為 30，其餘屬性（力量、魔力、女神祝福）恢復為 10 / 0。
                </span>
              </div>
              <button
                onClick={() => {
                  const check = window.confirm("確認是否恢復預設數值？此小組的體力將變為 30，力量將變為 10，魔力將變為 10，且女神祝福將重設為 0。");
                  if (check) {
                    update(ref(db, `tribes/${groupId}`), {
                      stamina: 30,
                      strength: 10,
                      magic: 10,
                      goddessBlessing: 0
                    });
                    alert("已成功恢復預設屬性數值！");
                  }
                }}
                className="bg-rose-600 text-white hover:bg-rose-500 px-5 py-2.5 rounded-xl font-black text-sm transition-all shadow-md shadow-rose-600/20"
              >
                恢復預設值
              </button>
            </div>
          </div>

        </motion.div>

        {/* 確認 Modal */}
        <AnimatePresence>
          {confirmAction && (
            <div className="guide-modal-overlay">
              {!showStagePrompt ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="guide-modal-content">
                  {(() => {
                    const { title, colorTheme, icon: ActionIcon } = confirmAction.payload;
                    const colors = themeColors[colorTheme] || themeColors.stone;
                    return (
                      <>
                        <div className="guide-modal-icon" style={{ backgroundColor: colors.lightBg, color: colors.text }}><ActionIcon size={44} /></div>
                        <h3 className="guide-modal-title">執行確認</h3>
                        <p className="guide-modal-desc-text">{title}</p>
                        <div className="guide-modal-actions">
                          <button onClick={handleCancelAll} className="guide-op-btn guide-btn-medium bg-stone-100 text-stone-600">取消</button>
                          <button onClick={handleConfirmStep1} className="guide-op-btn guide-btn-medium" style={{ backgroundColor: colors.bg, color: 'white' }}>確認執行</button>
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="guide-modal-content max-w-md w-full">
                  <h3 className="guide-modal-title mb-2 text-stone-850 text-center">登錄完成的闖關關卡</h3>
                  <p className="text-sm text-stone-500 mb-6 font-medium text-center">請選擇本次調整同時登錄完成的神廟關卡（單選）：</p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4 w-full">
                    {["反偵察神廟", "曼巴神廟", "好帥神廟", "節奏神廟", "綜藝神廟", "特工神廟"].map((temple, idx) => {
                      const isSelected = selectedStageOption === (idx + 1);
                      return (
                        <button
                          key={temple}
                          type="button"
                          onClick={() => setSelectedStageOption(idx + 1)}
                          className={`py-3 px-2 rounded-xl border-2 text-sm font-black transition-all shadow-sm ${
                            isSelected 
                              ? 'bg-amber-500 text-stone-900 border-amber-400 font-extrabold' 
                              : 'bg-amber-50/50 text-amber-900 border-amber-100 hover:border-amber-400 font-bold'
                          }`}
                        >
                          {temple}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setSelectedStageOption('skip')}
                      className={`col-span-2 py-3 px-2 rounded-xl border-2 text-sm font-black transition-all shadow-sm ${
                        selectedStageOption === 'skip'
                          ? 'bg-stone-800 text-white border-stone-700 font-extrabold'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-400 font-bold'
                      }`}
                    >
                      略過 (僅調整數值，不登錄進度)
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 w-full border-t border-stone-200 pt-4 mt-2">
                    <button
                      onClick={handleCancelAll}
                      className="py-3.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-black text-sm transition-all"
                    >
                      取消本次變更
                    </button>
                    <button
                      disabled={selectedStageOption === null}
                      onClick={handleExecuteFinal}
                      className={`py-3.5 rounded-xl text-sm font-black transition-all shadow-md ${
                        selectedStageOption !== null
                          ? 'bg-amber-500 text-stone-900 hover:bg-amber-400 shadow-amber-500/20'
                          : 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                      }`}
                    >
                      確認送出
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}