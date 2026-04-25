// src/app/member/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ref, onValue, goOnline, goOffline } from "firebase/database";
import { db } from "@/lib/firebase";
import { AllTribesData, StageMaster, TribeStats } from "@/types"; 
import { Home, Shield, Zap, Sword, Heart, Users, Trophy, Swords } from "lucide-react";
import { motion, useAnimation } from "framer-motion";

function AnimatedStat({ value }: { value: number }) {
  const controls = useAnimation();
  const prevValue = useRef(value);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (prevValue.current !== value) {
      controls.start({
        textShadow: ["1px 1px 0 rgba(0,0,0,0.8)", "0px 0px 15px rgba(16, 185, 129, 0.8)", "1px 1px 0 rgba(0,0,0,0.8)"],
        transition: { duration: 1.0 },
      });
      prevValue.current = value;
    }
  }, [value, controls]);

  return <motion.div animate={controls} className="huge-stat tabular-nums">{value}</motion.div>;
}

export default function MemberPage() {
  const [tribesData, setTribesData] = useState<AllTribesData>({});
  const [mastersData, setMastersData] = useState<Record<string, StageMaster>>({}); 
  const [viewMode, setViewMode] = useState<'tribes' | 'masters'>('tribes');

  useEffect(() => {
    goOnline(db);
    
    // 監聽部落資料
    const unsubscribeTribes = onValue(ref(db, "tribes"), (snapshot) => {
      if (snapshot.val()) setTribesData(snapshot.val());
    });

    // 監聽關主資料
    const unsubscribeMasters = onValue(ref(db, "masters"), (snapshot) => {
      if (snapshot.val()) setMastersData(snapshot.val());
    });

    const handleVisibility = () => {
      if (document.hidden) goOffline(db);
      else goOnline(db);
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      unsubscribeTribes();
      unsubscribeMasters();
      document.removeEventListener("visibilitychange", handleVisibility);
      goOffline(db);
    };
  }, []);

  const groupKeys = Array.from({ length: 6 }, (_, i) => `group${i + 1}`);
  const masterKeys = Array.from({ length: 6 }, (_, i) => `master${i + 1}`);
  const groupNames = ["一", "二", "三", "四", "五", "六"];

  return (
    <main className="relative flex flex-col items-center min-h-screen member-main-bg text-stone-900">
      <Link href="/" className="btn-back-home"><Home size={20} /> 返回主選單</Link>

      <div className="layout-container flex-1 w-full max-w-[1200px] py-16">
        <h1 className="page-header flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-4">
            <Shield className="w-12 h-12 text-amber-950" />
            {viewMode === 'tribes' ? '部落即時看板' : '關主狀態看板'}
            <div className="relative flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
            </div>
          </div>
          
          {/* ★ 這裡大幅縮小了選單、字體與間距 */}
          <div className="mt-2 flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-xl border border-stone-300 shadow-sm">
            <label className="text-xs font-bold text-stone-600">切換看板：</label>
            <select 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value as 'tribes' | 'masters')}
              className="bg-stone-800 text-amber-400 px-2 py-1 text-sm rounded-lg font-bold border-none outline-none cursor-pointer"
            >
              <option value="tribes">各組小組員</option>
              <option value="masters">各關關主</option>
            </select>
          </div>
        </h1>

        <div className="ancient-board-wrapper mb-12">
          <div className="ancient-board-header">
            <div className="ancient-header-cell align-left">
              {viewMode === 'tribes' ? <><Users size={18}/> 部落組別</> : <><Swords size={18}/> 關主稱號</>}
            </div>
            <div className="ancient-header-cell text-rose-300"><Heart size={18}/> 體力</div>
            <div className="ancient-header-cell text-amber-300"><Sword size={18}/> 力量</div>
            <div className="ancient-header-cell text-cyan-300"><Zap size={18}/> 魔力</div>
          </div>

          {(viewMode === 'tribes' ? groupKeys : masterKeys).map((key, index) => {
            const stats = viewMode === 'tribes' 
              ? (tribesData[key] || { stamina: 0, strength: 0, magic: 0, goddessBlessing: false })
              : (mastersData[key] || { name: `第 ${index + 1} 關關主`, stamina: 0, strength: 0, magic: 0 });
            
            const tStats = stats as TribeStats;

            // 計算小組才有的總通關數
            const totalStages = viewMode === 'tribes' 
              ? (tStats.stage1 || 0) + (tStats.stage2 || 0) + (tStats.stage3 || 0) + (tStats.stage4 || 0) + (tStats.stage5 || 0) + (tStats.stage6 || 0)
              : 0;

            return (
              <div key={key} className={`wood-plank ${viewMode === 'tribes' && tStats.goddessBlessing ? 'goddess-blessing' : ''}`}>
                <div className="wood-plank-stats">
                  <div className="member-group-name">
                    <span className="member-group-badge">{index + 1}</span>
                    {viewMode === 'tribes' ? `第 ${groupNames[index]} 小組` : (stats as StageMaster).name || `第 ${index + 1} 關關主`}
                  </div>
                  <div className="plank-stat-cell"><AnimatedStat value={stats.stamina || 0} /></div>
                  <div className="plank-stat-cell"><AnimatedStat value={stats.strength || 0} /></div>
                  <div className="plank-stat-cell"><AnimatedStat value={stats.magic || 0} /></div>
                </div>

                {/* 僅在部落模式下顯示通關進度 */}
                {viewMode === 'tribes' && (
                  <>
                    <div className="w-full h-[2px] bg-[#c2a188]/40 my-1 rounded-full relative z-10"></div>
                    <div className="grid grid-cols-3 md:grid-cols-7 gap-2 w-full mt-2 z-10 relative">
                      <div className="col-span-3 md:col-span-1 flex flex-col items-center justify-center py-2 bg-[#4e342e]/10 border-2 border-[#4e342e]/20 rounded-xl">
                        <div className="flex items-center gap-1 text-[#4e342e] font-black text-xs mb-1"><Trophy size={14}/> 總通關</div>
                        <span className="text-2xl font-black text-[#1a1a1a]">{totalStages}</span>
                      </div>
                      {[1, 2, 3, 4, 5, 6].map(stageNum => (
                        <div key={stageNum} className="flex flex-col items-center justify-center p-1 rounded-lg bg-[#e0d1c1]/30 border border-[#c2a188]/30">
                          <span className="text-[10px] font-bold text-[#795548]">第 {stageNum} 關</span>
                          <span className="text-xl font-black text-[#3e2723]">{tStats[`stage${stageNum}`] || 0}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}