// src/app/page.tsx
"use client";

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Users, ShieldCheck, Swords, Settings, X } from "lucide-react";
import Matter from "matter-js";

function NavCard({ href, title, description, icon: Icon, isPrimary = false }: { href: string, title: string, description: string, icon: React.ComponentType<{ size?: number | string; className?: string }>, isPrimary?: boolean }) {
  const cardRef = useRef<HTMLAnchorElement>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    cardRef.current.style.setProperty("--mouse-x", `${x}px`);
    cardRef.current.style.setProperty("--mouse-y", `${y}px`);

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const offsetX = (x - centerX) / centerX; 
    const offsetY = (y - centerY) / centerY; 

    const moveRange = 8;
    const moveX = offsetX * moveRange;
    const moveY = offsetY * moveRange;

    cardRef.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
  };

  const handlePointerLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = "translate(0px, 0px)";
  };

  return (
    <Link 
      ref={cardRef}
      href={href}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`w-full max-w-[360px] shrink-0 group relative flex flex-col items-center justify-center text-center p-10 min-h-[300px] rounded-[2.5rem] shadow-2xl hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] glow-card elastic-card ${
        isPrimary 
          ? "bg-amber-950 text-amber-50 glow-card-dark" 
          : "bg-white text-stone-900" 
      }`}
    >
      <div className="flex flex-col items-center relative z-10 w-full">
        <div className={`mb-4 p-3 rounded-2xl shadow-inner ${isPrimary ? "bg-amber-400 text-amber-950" : "bg-stone-100 text-stone-900"}`}>
          <Icon size={32} />
        </div>
        <h2 className="text-3xl font-black mb-2 tracking-wider leading-tight w-full break-words">{title}</h2>
        <p className="text-base font-medium opacity-70 leading-relaxed max-w-[85%] break-words">{description}</p>
      </div>
      <div className={`mt-6 w-14 h-14 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 group-hover:gap-2 relative z-10 shadow-md ${isPrimary ? "bg-amber-400 text-amber-950" : "bg-stone-900 text-white"}`}>
        <ArrowRight size={28} className="transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

// === 修改：接收設定參數的武器物理引擎 ===
function WeaponPhysics({ spawnRate, forceMultiplier }: { spawnRate: number, forceMultiplier: number }) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef(Matter.Engine.create());
  
  // 使用 useRef 來追蹤最新的設定值，避免頻繁重建 useEffect
  const spawnRateRef = useRef(spawnRate);
  const forceMultiplierRef = useRef(forceMultiplier);

  useEffect(() => {
    spawnRateRef.current = spawnRate;
    forceMultiplierRef.current = forceMultiplier;
  }, [spawnRate, forceMultiplier]);

  useEffect(() => {
    if (!sceneRef.current) return;

    const engine = engineRef.current;
    
    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        background: 'transparent',
        wireframes: false,
      }
    });

    Matter.Render.run(render);
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    const createEmojiTexture = (emoji: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = '100px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 64, 70);
      }
      return canvas.toDataURL('image/png');
    };

    const weaponTextures = [
      createEmojiTexture('🏹'), 
      createEmojiTexture('🛡️'), 
      createEmojiTexture('🗡️'), 
      createEmojiTexture('🔱'), 
      createEmojiTexture('🪓')  
    ];

    const spawnWeapon = () => {
      const x = Math.random() * window.innerWidth;
      const y = window.innerHeight + 100;
      const size = 60 + Math.random() * 40;
      
      const weapon = Matter.Bodies.rectangle(x, y, size, size, {
        restitution: 0.6,
        render: {
          sprite: {
            texture: weaponTextures[Math.floor(Math.random() * weaponTextures.length)],
            xScale: size / 128, 
            yScale: size / 128,
          }
        }
      });

      // 乘上 forceMultiplierRef 來動態調整力道
      const forceMagnitude = 0.055 * weapon.mass * forceMultiplierRef.current;
      const forceX = (Math.random() - 0.5) * forceMagnitude * 1.5; 
      const forceY = -forceMagnitude * (0.8 + Math.random() * 1.4); 

      Matter.Body.applyForce(weapon, weapon.position, { x: forceX, y: forceY });
      Matter.Body.setAngularVelocity(weapon, (Math.random() - 0.5) * 0.4);

      Matter.World.add(engine.world, weapon);

      setTimeout(() => {
        Matter.World.remove(engine.world, weapon);
      }, 6000);
    };

    let timeoutId: NodeJS.Timeout;
    const scheduleNextSpawn = () => {
      spawnWeapon();
      // 使用最新的 spawnRate 來決定下一次丟出的時間
      timeoutId = setTimeout(scheduleNextSpawn, spawnRateRef.current);
    };
    
    // 啟動循環
    scheduleNextSpawn();

    const handleResize = () => {
      render.canvas.width = window.innerWidth;
      render.canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeoutId);
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      if (render.canvas) render.canvas.remove();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <div ref={sceneRef} className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-60" />;
}

export default function Home() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [spawnRate, setSpawnRate] = useState(300);
  const [forceMultiplier, setForceMultiplier] = useState(1.0);

  return (
    <main className="relative flex flex-col items-center min-h-screen bg-[#f5f0e6] text-stone-900 overflow-x-hidden">
      
      {/* 傳遞設定參數給物理引擎 */}
      <WeaponPhysics spawnRate={spawnRate} forceMultiplier={forceMultiplier} />

      <div className="layout-container justify-center py-12 relative z-10">
        <div className="text-center pointer-events-none mb-12 w-full">
          <h1 className="text-7xl md:text-[120px] font-black tracking-tighter mb-4 leading-none">原始部落</h1>
          <p className="text-lg md:text-2xl opacity-60 font-bold tracking-widest uppercase">陣營對決即時積分系統</p>
        </div>

        <div className="home-nav-grid" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <NavCard href="/member" title="我是組員" description="查看各組即時積分、排名與戰況" icon={Users} isPrimary={true} />
          <NavCard href="/guide" title="我是隊輔" description="登入控制台，管理組別與調整分數" icon={ShieldCheck} isPrimary={false} />
          <NavCard href="/battle" title="巔峰之爭" description="面對面雙人對戰控制面板" icon={Swords} isPrimary={true} />
          <NavCard href="/peak-battle" title="原始馬?" description="全體回合制對戰系統" icon={Swords} isPrimary={false} />
        </div>
      </div>

      <div className="relative z-10 w-full mt-auto pb-6">
        <p className="font-bold text-stone-400 text-sm tracking-widest uppercase text-center pointer-events-auto">
          powered by <a href="https://linktr.ee/vis_tzem" className="text-amber-700 underline hover:text-amber-600 transition-colors">vistzem</a>
        </p>
      </div>

      {/* === 新增：右下角浮動設定區塊 === */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* 設定面板 (加上 Tailwind 動畫效果) */}
        <div className={`mb-4 p-5 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-200 transition-all duration-300 origin-bottom-right ${isSettingsOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
          <div className="flex justify-between items-center mb-5 gap-6">
            <h3 className="font-black text-stone-800 flex items-center gap-2">
              <Settings size={18} className="text-amber-600"/> 背景物理特效
            </h3>
            <button onClick={() => setIsSettingsOpen(false)} className="text-stone-400 hover:text-stone-800 bg-stone-100 rounded-full p-1 transition-colors">
              <X size={16} />
            </button>
          </div>
          
          <div className="flex flex-col gap-5 min-w-[220px]">
            {/* 頻率滑桿 */}
            <div>
              <label className="text-xs font-bold text-stone-500 flex justify-between mb-2">
                <span>生成間隔 (毫秒)</span>
                <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-black">{spawnRate}</span>
              </label>
              {/* 數值越小，生成越快 */}
              <input 
                type="range" 
                min="50" max="1500" step="50" 
                value={spawnRate} 
                onChange={(e) => setSpawnRate(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-bold text-stone-400 mt-1">
                <span>極快</span>
                <span>極慢</span>
              </div>
            </div>
            
            {/* 力道滑桿 */}
            <div>
              <label className="text-xs font-bold text-stone-500 flex justify-between mb-2">
                <span>噴發力道倍率</span>
                <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-black">{forceMultiplier.toFixed(1)}x</span>
              </label>
              <input 
                type="range" 
                min="0.5" max="3.0" step="0.1" 
                value={forceMultiplier} 
                onChange={(e) => setForceMultiplier(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-bold text-stone-400 mt-1">
                <span>微弱</span>
                <span>猛烈</span>
              </div>
            </div>
          </div>
        </div>

        {/* 觸發按鈕 */}
        <button 
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className={`p-3.5 rounded-full shadow-xl transition-all duration-300 hover:scale-110 ${isSettingsOpen ? 'bg-amber-500 text-white shadow-amber-500/40' : 'bg-white text-stone-700 hover:bg-stone-50'}`}
        >
          <Settings size={24} className={isSettingsOpen ? 'animate-spin-slow' : ''} />
        </button>
      </div>
    </main>
  );
}