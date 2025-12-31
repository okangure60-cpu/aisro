
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StatusBar } from './components/StatusBar';
import { PlayerStats, ActiveMob, DamagePop, Item, ItemRarity, ItemType, Skill, PlayerDebuff, MobAbilityType, DungeonTemplate, MarketListing } from './types';
import { SRO_MOBS, SRO_SKILLS, SRO_DUNGEONS, getXpRequired, RARITY_COLORS, POTION_CONFIG } from './constants';

const STORAGE_KEY = 'sro_legend_journey_stats_v8';

type ActiveTab = 'GAME' | 'BAG' | 'NPC' | 'DNG' | 'MARKET' | 'VIP';

const App: React.FC = () => {
  const [stats, setStats] = useState<PlayerStats>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.potions) parsed.potions = { hp: 10, mp: 10 };
        return parsed;
      } catch (e) { console.warn(e); }
    }
    return {
      lvl: 1, xp: 0, gold: 0, hp: 300, maxHp: 300, mp: 200, maxMp: 200, atk: 25, def: 12,
      inventory: [], potions: { hp: 10, mp: 10 }, isPremium: false, autoPotionEnabled: false
    };
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('GAME');
  const [currentMob, setCurrentMob] = useState<ActiveMob | null>(null);
  const [damagePops, setDamagePops] = useState<DamagePop[]>([]);
  const [isHurt, setIsHurt] = useState(false);
  const [activeDungeon, setActiveDungeon] = useState<{ template: DungeonTemplate, currentWave: number } | null>(null);
  const [skillCooldowns, setSkillCooldowns] = useState<Record<string, number>>({});
  const [activeDebuffs, setActiveDebuffs] = useState<PlayerDebuff[]>([]);
  const nextPopId = useRef(0);
  
  const tg = (window as any).Telegram?.WebApp;

  useEffect(() => {
    if (tg) {
      try {
        tg.ready?.();
        tg.expand?.();
        if (typeof tg.isVersionAtLeast === 'function' && tg.isVersionAtLeast('6.1')) {
          tg.setHeaderColor?.('#020617');
          tg.setBackgroundColor?.('#020617');
        }
      } catch (e) { console.warn(e); }
    }
  }, [tg]);

  // Otomatik Kayıt: Her stats değişiminde localStorage'a yazar
  useEffect(() => { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); 
  }, [stats]);

  const equippedItems = useMemo(() => stats.inventory.filter(i => i.isEquipped), [stats.inventory]);
  const bonusAtk = useMemo(() => equippedItems.reduce((s, i) => s + i.atkBonus, 0), [equippedItems]);
  const bonusDef = useMemo(() => equippedItems.reduce((s, i) => s + i.defBonus, 0), [equippedItems]);
  const bonusHp = useMemo(() => equippedItems.reduce((s, i) => s + i.hpBonus, 0), [equippedItems]);

  const totalAtk = stats.atk + bonusAtk;
  const totalDef = stats.def + bonusDef;
  const totalMaxHp = stats.maxHp + bonusHp;

  const isStunned = useMemo(() => activeDebuffs.some(d => d.type === 'STUN' && d.endTime > Date.now()), [activeDebuffs]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setSkillCooldowns(prev => {
        const updated = { ...prev };
        let changed = false;
        for (const id in updated) { if (updated[id] <= now) { delete updated[id]; changed = true; } }
        return changed ? updated : prev;
      });
      setActiveDebuffs(prev => prev.filter(d => d.endTime > now));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  const generateRandomItem = (lvl: number): Item => {
    const types: ItemType[] = ['WEAPON', 'SHIELD', 'ARMOR', 'HELMET', 'ACCESSORY'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const roll = Math.random();
    let rarity: ItemRarity = 'COMMON';
    let multiplier = 1;
    let prefix = "";

    if (roll < 0.02) { rarity = 'SUN'; multiplier = 3.5; prefix = "Seal of Sun "; }
    else if (roll < 0.10) { rarity = 'MOON'; multiplier = 2.5; prefix = "Seal of Moon "; }
    else if (roll < 0.30) { rarity = 'STAR'; multiplier = 1.8; prefix = "Seal of Star "; }
    
    const baseVal = lvl * 2 * multiplier;
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      name: `${prefix}${type === 'WEAPON' ? 'Blade' : type === 'SHIELD' ? 'Shield' : 'Plate'}`,
      type,
      rarity,
      lvl,
      atkBonus: type === 'WEAPON' ? Math.floor(baseVal * 2.5) : 0,
      defBonus: (type === 'ARMOR' || type === 'SHIELD' || type === 'HELMET') ? Math.floor(baseVal * 1.2) : 0,
      hpBonus: (type === 'ACCESSORY' || type === 'HELMET') ? Math.floor(baseVal * 5) : 0,
      isEquipped: false
    };
  };

  const spawnMob = useCallback(() => {
    let template;
    if (activeDungeon) {
      const isLastWave = activeDungeon.currentWave === activeDungeon.template.waves;
      if (isLastWave) {
        template = SRO_MOBS.find(m => m.id === activeDungeon.template.bossId) || SRO_MOBS[0];
        setCurrentMob({ ...template, curHp: template.hp, lastAbilityTime: {}, isCharging: false, isBoss: true });
      } else {
        const pool = SRO_MOBS.filter(m => activeDungeon.template.mobPool.includes(m.id));
        template = pool[Math.floor(Math.random() * pool.length)];
        setCurrentMob({ ...template, curHp: template.hp, lastAbilityTime: {}, isCharging: false });
      }
    } else {
      const validMobs = SRO_MOBS.filter(m => Math.abs(m.lvl - stats.lvl) <= 3);
      template = validMobs.length > 0 ? validMobs[Math.floor(Math.random() * validMobs.length)] : SRO_MOBS[0];
      setCurrentMob({ ...template, curHp: template.hp, lastAbilityTime: {}, isCharging: false });
    }
  }, [stats.lvl, activeDungeon]);

  useEffect(() => { if (!currentMob) spawnMob(); }, [currentMob, spawnMob]);

  const addDamagePop = (value: number | string, color: string) => {
    const id = nextPopId.current++;
    setDamagePops(prev => [...prev, {
      id, value: typeof value === 'number' ? value : 0, textValue: typeof value === 'string' ? value : undefined,
      color, x: 35 + Math.random() * 30, y: 30 + Math.random() * 30
    }]);
    setTimeout(() => { setDamagePops(prev => prev.filter(p => p.id !== id)); }, 800);
  };

  const usePotion = (type: 'hp' | 'mp') => {
    if (stats.potions[type] <= 0) return;
    const config = type === 'hp' ? POTION_CONFIG.HP_POTION : POTION_CONFIG.MP_POTION;
    setStats(prev => ({
      ...prev,
      [type]: Math.min(type === 'hp' ? totalMaxHp : prev.maxMp, prev[type] + config.heal),
      potions: { ...prev.potions, [type]: prev.potions[type] - 1 }
    }));
    addDamagePop(`+${config.heal}`, type === 'hp' ? '#22c55e' : '#0ea5e9');
  };

  const mobAttack = useCallback(() => {
    if (!currentMob) return;
    setIsHurt(true);
    setTimeout(() => setIsHurt(false), 200);
    const finalDmg = Math.max(5, Math.floor((currentMob.atk - totalDef/4) * (0.8 + Math.random() * 0.4)));
    addDamagePop(finalDmg, '#ef4444');
    setStats(prev => {
      const newHp = prev.hp - finalDmg;
      if (newHp <= 0) {
        setActiveDungeon(null);
        return { ...prev, hp: totalMaxHp, mp: prev.maxMp };
      }
      return { ...prev, hp: newHp };
    });
  }, [currentMob, totalDef, totalMaxHp]);

  const useSkill = useCallback((skill: Skill) => {
    if (!currentMob || isStunned || skillCooldowns[skill.id]) return;
    if (stats.mp < skill.mpCost) { addDamagePop("MP!", "#0ea5e9"); return; }
    
    setStats(prev => ({ ...prev, mp: prev.mp - skill.mpCost }));
    // Bekleme süresini başlat (Normal vuruş dahil)
    setSkillCooldowns(prev => ({ ...prev, [skill.id]: Date.now() + skill.cooldown }));
    
    const dmg = Math.floor(totalAtk * skill.damageMultiplier * (Math.random() < 0.1 ? 2.0 : 1.0));
    addDamagePop(dmg, skill.color);
    
    setCurrentMob(prev => {
      if (!prev) return null;
      const newHp = prev.curHp - dmg;
      if (newHp <= 0) {
        // Zindanda ise 2x XP
        const xpMultiplier = activeDungeon ? 2 : 1;
        const xpReward = (prev.lvl / 2) * xpMultiplier;
        
        if (activeDungeon) {
          if (prev.isBoss) {
            const dropRoll = Math.random();
            if (dropRoll < activeDungeon.template.specialDropRate) {
              const newItem = generateRandomItem(stats.lvl);
              setStats(s => ({
                ...s,
                inventory: [...s.inventory, newItem],
                gold: s.gold + prev.goldReward
              }));
              addDamagePop("ITEM DROP!", RARITY_COLORS[newItem.rarity]);
            } else {
              setStats(s => ({...s, gold: s.gold + prev.goldReward}));
            }
            setActiveDungeon(null);
          } else {
            setStats(s => {
                let nx = s.xp + xpReward; let nl = s.lvl;
                while (nx >= getXpRequired(nl)) { nx -= getXpRequired(nl); nl++; }
                return {...s, lvl: nl, xp: nx, gold: s.gold + prev.goldReward};
            });
            setActiveDungeon(d => d ? ({...d, currentWave: d.currentWave+1}) : null);
          }
        } else {
          setStats(s => {
            let nx = s.xp + xpReward; let nl = s.lvl;
            while (nx >= getXpRequired(nl)) { nx -= getXpRequired(nl); nl++; }
            return {...s, lvl: nl, xp: nx, gold: s.gold + prev.goldReward};
          });
        }
        return null;
      }
      return { ...prev, curHp: newHp };
    });
    
    if (Math.random() < 0.3) mobAttack();
  }, [currentMob, isStunned, skillCooldowns, stats.mp, totalAtk, mobAttack, activeDungeon, stats.lvl]);

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-[#020617] text-slate-200">
      <div className="absolute top-0 left-0 z-[100] p-1 pointer-events-none">
        <span className="text-[8px] font-mono text-slate-600">v1.0.3</span>
      </div>
      <StatusBar stats={{...stats, maxHp: totalMaxHp}} totalAtk={totalAtk} totalDef={totalDef} />
      
      <div className={`fixed inset-0 z-[9999] bg-[#020617] flex flex-col p-6 transition-transform duration-300 ${activeTab === 'GAME' ? 'translate-y-full' : 'translate-y-0'}`}>
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-2">
           <h2 className="text-xl font-black text-amber-500 italic uppercase">{activeTab === 'DNG' ? 'ZINDANLAR' : activeTab === 'BAG' ? 'ÇANTA' : activeTab}</h2>
           <button onClick={() => setActiveTab('GAME')} className="text-slate-400 text-3xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto pb-24 custom-scrollbar">
           {activeTab === 'BAG' && (
             <div className="space-y-3">
               {stats.inventory.map(item => (
                 <div key={item.id} className={`bg-slate-900 border-2 p-4 rounded-2xl ${item.isEquipped ? 'border-amber-500' : 'border-slate-800'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-black" style={{color: RARITY_COLORS[item.rarity]}}>{item.name} (Lv.{item.lvl})</span>
                      <span className="text-[8px] font-bold text-slate-500">{item.type}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[8px] text-slate-400 mb-2 italic">
                       {item.atkBonus > 0 && <span>ATK +{item.atkBonus}</span>}
                       {item.defBonus > 0 && <span>DEF +{item.defBonus}</span>}
                       {item.hpBonus > 0 && <span>HP +{item.hpBonus}</span>}
                    </div>
                    <button onClick={() => {
                      setStats(prev => ({
                        ...prev, inventory: prev.inventory.map(i => i.id === item.id ? {...i, isEquipped: !i.isEquipped} : (i.type === item.type && i.isEquipped ? {...i, isEquipped: false} : i))
                      }));
                    }} className={`w-full py-2 rounded-xl font-bold text-[10px] ${item.isEquipped ? 'bg-amber-600 text-black' : 'bg-slate-800 text-slate-300'}`}>
                      {item.isEquipped ? 'ÇIKAR' : 'KUŞAN'}
                    </button>
                 </div>
               ))}
               {stats.inventory.length === 0 && <div className="text-center text-slate-500 text-xs py-10 italic">Çantanız boş...</div>}
             </div>
           )}
           {activeTab === 'NPC' && (
             <div className="space-y-4">
               {[POTION_CONFIG.HP_POTION, POTION_CONFIG.MP_POTION].map((pot, idx) => (
                  <div key={idx} className="bg-slate-900 p-5 rounded-2xl flex justify-between items-center border border-slate-800">
                     <div className="flex flex-col">
                        <span className="text-white text-xs font-bold">{pot.name}</span>
                        <span className="text-slate-500 text-[9px]">Stok: {idx === 0 ? stats.potions.hp : stats.potions.mp}</span>
                     </div>
                     <button onClick={() => { if (stats.gold >= pot.cost) setStats(prev => ({...prev, gold: prev.gold - pot.cost, potions: {...prev.potions, [idx === 0 ? 'hp' : 'mp']: prev.potions[idx === 0 ? 'hp' : 'mp'] + 1}})); }} className="bg-amber-600 text-black text-xs font-black px-6 py-2 rounded-xl">{pot.cost}G</button>
                  </div>
               ))}
             </div>
           )}
           {activeTab === 'DNG' && (
             <div className="space-y-4">
               {SRO_DUNGEONS.map(dng => (
                  <div key={dng.id} className="bg-slate-900 border-2 border-slate-800 p-6 rounded-3xl">
                     <div className="flex justify-between items-center mb-2">
                        <h3 className="text-amber-100 font-black text-sm">{dng.name} (Lv.{dng.minLvl})</h3>
                        <span className="text-[9px] font-black text-emerald-500">XP: x2 | DROP: %{Math.round(dng.specialDropRate * 100)}</span>
                     </div>
                     <p className="text-slate-400 text-[10px] mb-4 leading-relaxed">{dng.description}</p>
                     <button onClick={() => {
                       if (stats.lvl >= dng.minLvl && stats.gold >= dng.entryFee) {
                         setStats(prev => ({ ...prev, gold: prev.gold - dng.entryFee }));
                         setActiveDungeon({ template: dng, currentWave: 1 });
                         setCurrentMob(null); setActiveTab('GAME');
                       }
                     }} className={`w-full bg-amber-600 text-black py-3 rounded-2xl font-black text-[10px] ${stats.lvl < dng.minLvl ? 'opacity-50 grayscale' : ''}`}>
                       {stats.lvl < dng.minLvl ? `DÜŞÜK LEVEL (Lv.${dng.minLvl})` : `GİRİŞ: ${dng.entryFee}G`}
                     </button>
                  </div>
               ))}
             </div>
           )}
        </div>
      </div>

      <main className={`flex-1 flex flex-col items-center justify-center p-6 relative ${isHurt ? 'hit-shake bg-red-950/10' : ''}`}>
        {currentMob ? (
          <div className="flex flex-col items-center gap-6 w-full max-w-xs">
            <div className="bg-slate-900/90 border-2 border-slate-800 p-3 rounded-2xl w-full text-center relative overflow-hidden shadow-2xl">
              {activeDungeon && <div className="absolute top-0 right-0 bg-amber-600 text-[7px] px-2 font-black text-black uppercase">Dalga {activeDungeon.currentWave}/{activeDungeon.template.waves}</div>}
              <h2 className="text-[10px] font-black text-amber-200 uppercase tracking-widest">{currentMob.name} (Lv{currentMob.lvl})</h2>
              <div className="h-2 w-full bg-black rounded-full mt-2 overflow-hidden border border-slate-800">
                <div className="h-full bg-gradient-to-r from-red-800 to-red-500 transition-all duration-300" style={{ width: `${(currentMob.curHp/currentMob.hp)*100}%` }} />
              </div>
            </div>
            
            <div className="relative h-44 w-full flex items-center justify-center cursor-crosshair" onClick={() => !isStunned && useSkill(SRO_SKILLS[0])}>
              {damagePops.map(pop => (
                <div key={pop.id} className="absolute dmg-float font-black z-[60] text-3xl pointer-events-none perspective-text italic text-center" style={{ left: `${pop.x}%`, top: `${pop.y}%`, color: pop.color }}>
                  {pop.textValue || pop.value}
                </div>
              ))}
              <img src={currentMob.img} className={`w-40 h-40 object-contain transition-all duration-75 active:scale-90 ${currentMob.isBoss ? 'scale-125 brightness-125 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]' : ''}`} />
            </div>

            {/* Hızlı Potion Butonları */}
            <div className="flex gap-4 w-full justify-center -mb-2">
              <button onClick={() => usePotion('hp')} className="bg-red-900/40 border border-red-500/50 px-3 py-1.5 rounded-xl flex items-center gap-2 active:scale-95">
                <span className="text-lg">🧪</span>
                <span className="text-[10px] font-black text-red-200">{stats.potions.hp}</span>
              </button>
              <button onClick={() => usePotion('mp')} className="bg-sky-900/40 border border-sky-500/50 px-3 py-1.5 rounded-xl flex items-center gap-2 active:scale-95">
                <span className="text-lg">🧪</span>
                <span className="text-[10px] font-black text-sky-200">{stats.potions.mp}</span>
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3 w-full">
              {SRO_SKILLS.map(skill => (
                  <button key={skill.id} onClick={() => useSkill(skill)} disabled={!!skillCooldowns[skill.id] || isStunned}
                    className={`relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center transition-all shadow-lg ${skillCooldowns[skill.id] ? 'opacity-40 bg-black border-slate-900 scale-95' : 'bg-slate-900 border-slate-700 active:scale-90 active:border-amber-500'}`}>
                    {skillCooldowns[skill.id] && (
                      <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center z-10">
                        <span className="text-[10px] font-black text-white">{Math.ceil((skillCooldowns[skill.id] - Date.now())/1000)}s</span>
                      </div>
                    )}
                    <span className="text-2xl mb-1">{skill.icon}</span>
                    <span className="text-[6px] font-black text-slate-500 uppercase tracking-tighter">{skill.name.split(' ')[0]}</span>
                  </button>
              ))}
            </div>
          </div>
        ) : <div className="text-amber-500 animate-pulse font-black text-xs uppercase tracking-widest">Bölge Keşfediliyor...</div>}
      </main>

      <footer className="h-24 bg-[#0f172a] border-t-2 border-slate-800 grid grid-cols-5 gap-2 p-3 pb-6 relative z-[50]">
        <button onClick={() => setActiveTab('NPC')} className={`rounded-2xl flex flex-col items-center justify-center transition-colors ${activeTab === 'NPC' ? 'bg-amber-600 text-black' : 'bg-slate-800/40 text-slate-500'}`}>
           <span className="text-xl">🏪</span><span className="text-[8px] font-black">SHOP</span>
        </button>
        <button onClick={() => setActiveTab('DNG')} className={`rounded-2xl flex flex-col items-center justify-center transition-colors ${activeTab === 'DNG' ? 'bg-amber-600 text-black' : 'bg-slate-800/40 text-slate-500'}`}>
           <span className="text-xl">🏰</span><span className="text-[8px] font-black">DNG</span>
        </button>
        <button className="bg-gradient-to-t from-amber-600 to-amber-400 text-black font-black rounded-2xl flex flex-col items-center justify-center active:scale-95 shadow-lg">
           <span className="text-xl">⭐</span><span className="text-[8px] font-black">VIP</span>
        </button>
        <button onClick={() => setActiveTab('MARKET')} className={`rounded-2xl flex flex-col items-center justify-center transition-colors ${activeTab === 'MARKET' ? 'bg-indigo-600 text-white' : 'bg-slate-800/40 text-slate-500'}`}>
           <span className="text-xl">⚖️</span><span className="text-[8px] font-black">PAZAR</span>
        </button>
        <button onClick={() => setActiveTab('BAG')} className={`rounded-2xl flex flex-col items-center justify-center transition-colors ${activeTab === 'BAG' ? 'bg-amber-600 text-black' : 'bg-slate-800/40 text-slate-500'}`}>
           <span className="text-xl">🎒</span><span className="text-[8px] font-black">BAG</span>
        </button>
      </footer>
    </div>
  );
};

export default App;
