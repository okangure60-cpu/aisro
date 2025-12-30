
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StatusBar } from './components/StatusBar';
import { PlayerStats, ActiveMob, DamagePop } from './types';
import { SRO_MOBS, getXpRequired } from './constants';
import { getOracleAdvice } from './services/geminiService';

const STORAGE_KEY = 'sro_legend_journey_stats';

const App: React.FC = () => {
  // Initialize stats from localStorage or defaults
  const [stats, setStats] = useState<PlayerStats>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Could not load local save data:", e);
      }
    }
    return {
      lvl: 1,
      xp: 0,
      gold: 0,
      hp: 250,
      maxHp: 250,
      atk: 22,
      def: 10
    };
  });

  const [currentMob, setCurrentMob] = useState<ActiveMob | null>(null);
  const [damagePops, setDamagePops] = useState<DamagePop[]>([]);
  const [oracleMsg, setOracleMsg] = useState("Kılıcını hazırla, macera başlıyor!");
  const [isHurt, setIsHurt] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const nextPopId = useRef(0);

  const tg = window.Telegram?.WebApp;

  // Auto-save to localStorage whenever stats change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    if (tg) {
      tg.expand();
      tg.ready();
      tg.setHeaderColor('#0f172a');
      tg.setBackgroundColor('#020617');
    }
  }, [tg]);

  const updateOracle = useCallback(async () => {
    const msg = await getOracleAdvice(stats.lvl, "Jang'an Outskirts");
    setOracleMsg(msg);
  }, [stats.lvl]);

  useEffect(() => {
    updateOracle();
  }, [updateOracle]);

  const spawnMob = useCallback(() => {
    const validMobs = SRO_MOBS.filter(m => Math.abs(m.lvl - stats.lvl) <= 5);
    const template = validMobs.length > 0 
      ? validMobs[Math.floor(Math.random() * validMobs.length)]
      : SRO_MOBS[0];
    
    setCurrentMob({
      ...template,
      curHp: template.hp
    });
  }, [stats.lvl]);

  useEffect(() => {
    if (!currentMob) spawnMob();
  }, [currentMob, spawnMob]);

  const addDamagePop = (value: number | string, color: string, isCrit = false, isAbsorb = false) => {
    const id = nextPopId.current++;
    const newPop = {
      id,
      value: typeof value === 'number' ? value : 0,
      textValue: typeof value === 'string' ? value : undefined,
      color: isCrit ? "#ffffff" : (isAbsorb ? "#94a3b8" : color),
      x: 35 + Math.random() * 30,
      y: 30 + Math.random() * 30
    };
    // @ts-ignore - Adding custom property for display flexibility
    newPop.isAbsorb = isAbsorb;
    
    setDamagePops(prev => [...prev, newPop as any]);
    setTimeout(() => {
      setDamagePops(prev => prev.filter(p => p.id !== id));
    }, 800);
  };

  const handleAttack = () => {
    if (!currentMob || stats.hp <= 0) return;

    const isCrit = Math.random() < 0.15;
    const baseDmg = stats.atk + Math.floor(Math.random() * 12);
    const finalDmg = isCrit ? Math.floor(baseDmg * 2.2) : baseDmg;
    
    addDamagePop(finalDmg, "#fcd34d", isCrit);

    setCurrentMob(prev => {
      if (!prev) return null;
      const newHp = prev.curHp - finalDmg;
      if (newHp <= 0) {
        handleMobDefeat(prev);
        return null;
      }
      return { ...prev, curHp: newHp };
    });

    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred('light');
    }
  };

  const handleMobDefeat = (mob: ActiveMob) => {
    setStats(prev => {
      let newXp = prev.xp + mob.xpReward;
      let newLvl = prev.lvl;
      let newMaxHp = prev.maxHp;
      let newAtk = prev.atk;
      let newDef = prev.def;
      let newHp = prev.hp;
      let leveledUp = false;

      while (newXp >= getXpRequired(newLvl)) {
        newXp -= getXpRequired(newLvl);
        newLvl++;
        newMaxHp += 75;
        newHp = newMaxHp;
        newAtk += 7;
        newDef += 5; // Direct defense improvement through leveling
        leveledUp = true;
      }

      if (leveledUp) {
        setShowLevelUp(true);
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        setTimeout(() => setShowLevelUp(false), 3000);
        updateOracle();
      }

      return {
        ...prev,
        lvl: newLvl,
        xp: newXp,
        gold: prev.gold + mob.goldReward,
        maxHp: newMaxHp,
        hp: newHp,
        atk: newAtk,
        def: newDef
      };
    });
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (currentMob && stats.hp > 0 && !showLevelUp) {
        // Wider range of attack (Balance) from mob: 30% variance
        const variance = currentMob.atk * 0.30;
        const rawDmg = currentMob.atk + (Math.random() * (variance * 2) - variance);
        
        // Defense logic: Flat reduction + percentage mitigation
        // Higher defense makes you significantly tankier against lower level mobs
        const flatReduction = stats.def * 0.8;
        const percentageMitigation = Math.min(0.5, stats.def / 500); // Caps at 50% extra reduction
        
        let mitigatedDmg = Math.floor((rawDmg - flatReduction) * (1 - percentageMitigation));
        
        // Block chance: Small chance to completely nullify low damage hits based on def
        const blockChance = Math.min(0.15, stats.def / 1000);
        const isBlock = Math.random() < blockChance;
        
        if (isBlock) mitigatedDmg = 0;
        
        // Minimum damage of 1 if hit connects
        const finalDmg = Math.max(isBlock ? 0 : 1, mitigatedDmg);
        const isAbsorb = finalDmg < rawDmg * 0.5 && !isBlock;

        if (isBlock) {
          addDamagePop("BLOCK", "#94a3b8", false, true);
        } else {
          addDamagePop(finalDmg, "#ef4444", false, isAbsorb);
        }
        
        setIsHurt(true);
        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        setTimeout(() => setIsHurt(false), 200);

        setStats(prev => {
          const nextHp = prev.hp - finalDmg;
          return { ...prev, hp: Math.max(0, nextHp) };
        });
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [currentMob, stats.hp, stats.def, showLevelUp, tg]);

  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      if (tg) {
        tg.sendData(JSON.stringify(stats));
      } else {
        console.log("Saving progress to simulated server:", stats);
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 800);
  };

  return (
    <div className="flex flex-col h-screen select-none overflow-hidden bg-slate-950 font-sans">
      <StatusBar stats={stats} />
      
      {showLevelUp && (
        <div className="absolute top-1/4 left-0 w-full z-50 flex flex-col items-center animate-bounce pointer-events-none">
          <h2 className="text-4xl font-black text-amber-400 perspective-text italic uppercase tracking-widest drop-shadow-[0_0_20px_rgba(251,191,36,0.8)] levelup-animate text-center">
            LEVEL UP!
          </h2>
          <p className="text-amber-200 text-sm font-bold bg-amber-950/90 px-6 py-2 rounded-full border border-amber-500/50 shadow-2xl backdrop-blur-md">
            GÜCÜN VE SAVUNMAN ARTTI!
          </p>
        </div>
      )}

      <div className="px-4 py-2 bg-slate-900/60 border-b border-amber-900/20 text-center relative z-10 backdrop-blur-md">
        <p className="text-[9px] text-amber-500/70 uppercase font-black tracking-[0.3em] mb-1">Kahinin Fısıltısı</p>
        <p className="text-xs italic text-slate-200 leading-relaxed font-serif">"{oracleMsg}"</p>
      </div>

      <main className={`flex-1 flex flex-col items-center justify-center relative p-6 transition-all duration-300 ${isHurt ? 'bg-red-950/30' : ''}`}>
        <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
           <div className="w-full h-full bg-[url('https://picsum.photos/seed/sro-land/800/1200')] bg-cover bg-center grayscale contrast-125 mix-blend-screen" />
           <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-transparent to-slate-950/90" />
        </div>

        {currentMob ? (
          <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-xs">
            <div className="text-center w-full">
              <div className="inline-block px-3 py-0.5 rounded-t-lg bg-amber-900/40 border-t border-x border-amber-500/20 text-[10px] font-bold text-amber-400 uppercase">
                Vahşi Yaratık
              </div>
              <div className="bg-slate-900/90 border border-amber-900/40 p-3 rounded-xl shadow-2xl backdrop-blur-sm">
                <h2 className="text-lg font-black text-amber-100 tracking-wider uppercase mb-2">
                  Lv{currentMob.lvl} {currentMob.name}
                </h2>
                <div className="h-2 w-full bg-slate-800 rounded-full border border-slate-700 p-0.5 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.4)]"
                    style={{ width: `${(currentMob.curHp / currentMob.hp) * 100}%` }}
                  />
                </div>
                <div className="mt-1 text-[9px] text-slate-500 font-mono flex justify-between px-1">
                   <span>HP: {Math.max(0, Math.floor(currentMob.curHp))}</span>
                   <span>{Math.floor((currentMob.curHp / currentMob.hp) * 100)}%</span>
                </div>
              </div>
            </div>

            <div className="relative group perspective-1000" onClick={handleAttack}>
              {damagePops.map(pop => (
                <div
                  key={pop.id}
                  className="absolute dmg-float font-black z-50 pointer-events-none"
                  style={{ 
                    left: `${pop.x}%`, 
                    top: `${pop.y}%`, 
                    color: pop.color,
                    fontSize: (pop as any).isAbsorb ? '1.2rem' : '2.5rem',
                    textShadow: '0 0 10px rgba(0,0,0,0.8), 2px 2px 0px black',
                    transform: pop.color === '#ffffff' ? 'scale(1.5)' : 'scale(1)',
                    opacity: (pop as any).isAbsorb ? 0.8 : 1
                  }}
                >
                  {(pop as any).textValue ? (pop as any).textValue : pop.value}{(pop as any).isAbsorb ? ' abs' : (pop.color === '#ffffff' ? '!' : '')}
                </div>
              ))}

              <img 
                src={currentMob.img} 
                alt={currentMob.name}
                className={`w-56 h-56 object-contain transition-transform duration-100 active:scale-90 active:brightness-125 drop-shadow-[0_25px_50px_rgba(0,0,0,0.9)] cursor-pointer ${isHurt ? 'hit-shake' : ''}`}
              />
              
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-amber-500/10 rounded-full -z-10 animate-pulse" />
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-40 h-10 bg-black/60 blur-2xl rounded-full -z-20" />
            </div>

            <div className="animate-pulse text-center">
               <span className="text-[10px] text-slate-500 font-bold tracking-[0.2em]">SALDIRMAK İÇİN DOKUN</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
             <div className="w-24 h-24 border-4 border-slate-800 border-t-amber-600 rounded-full animate-spin mb-4" />
             <span className="text-amber-500 font-bold uppercase tracking-widest text-xs">Yaratık Beliriyor...</span>
          </div>
        )}

        {stats.hp <= 0 && (
          <div className="absolute inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 backdrop-blur-xl">
             <div className="mb-6 w-20 h-20 bg-red-950/50 rounded-full border-4 border-red-900 flex items-center justify-center text-3xl">💀</div>
             <h1 className="text-6xl font-black text-red-600 mb-2 tracking-tighter uppercase italic drop-shadow-lg">Yenildin</h1>
             <p className="text-slate-400 mb-10 max-w-[280px] leading-relaxed">Gücün tükendi. Jang'an'ın güvenli surlarına geri dönüp iyileşmelisin.</p>
             <button 
                onClick={() => setStats(prev => ({...prev, hp: prev.maxHp}))}
                className="w-full bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-white font-black py-5 rounded-2xl shadow-[0_10px_40px_rgba(153,27,27,0.4)] border-b-4 border-red-900 active:translate-y-1 transition-all"
             >
                KENT MERKEZİNDE CANLAN
             </button>
          </div>
        )}
      </main>

      <footer className="p-4 bg-slate-900/90 border-t border-slate-800/50 backdrop-blur-lg flex items-center justify-between gap-4 relative z-20">
        <div className="flex flex-col gap-1 min-w-[70px]">
          <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest">Karakter</span>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-amber-100 flex items-center gap-1">
              ⚔️ {stats.atk} <span className="text-[8px] text-slate-500 uppercase font-black">Atk</span>
            </span>
            <span className="text-xs font-bold text-sky-300 flex items-center gap-1">
              🛡️ {stats.def} <span className="text-[8px] text-slate-500 uppercase font-black">Def</span>
            </span>
          </div>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={saveStatus !== 'idle'}
          className={`flex-[2] text-white font-black py-4 rounded-xl shadow-xl flex items-center justify-center gap-3 border transition-all active:scale-[0.98] ${
            saveStatus === 'saved' 
              ? 'bg-blue-600 border-blue-400' 
              : 'bg-gradient-to-b from-emerald-600 to-emerald-800 border-emerald-500/30'
          }`}
        >
          {saveStatus === 'idle' && (
            <>
              <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              OTURUMU KAYDET
            </>
          )}
          {saveStatus === 'saving' && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {saveStatus === 'saved' && <span>KAYDEDİLDİ! ✓</span>}
        </button>

        <div className="w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 shadow-inner group active:bg-slate-700 transition-colors">
           <span className="text-2xl filter drop-shadow-md">⚔️</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
