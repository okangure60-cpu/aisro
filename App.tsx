
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StatusBar } from './components/StatusBar';
import { PlayerStats, ActiveMob, DamagePop, Item, ItemRarity, ItemType, Skill, PlayerDebuff, MobAbilityType, DungeonTemplate, MarketListing } from './types';
import { SRO_MOBS, SRO_SKILLS, SRO_DUNGEONS, getXpRequired, RARITY_COLORS, POTION_CONFIG, ITEM_RESALE_MULTIPLIERS } from './constants';

const STORAGE_KEY = 'sro_legend_journey_stats_v6_final';
const MARKET_STORAGE_KEY = 'sro_global_pazar_listings_v6';

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
      lvl: 1, xp: 0, gold: 500, hp: 300, maxHp: 300, mp: 200, maxMp: 200, atk: 25, def: 12,
      inventory: [], potions: { hp: 10, mp: 10 }, isPremium: false, autoPotionEnabled: false
    };
  });

  const [globalMarket, setGlobalMarket] = useState<MarketListing[]>(() => {
    const saved = localStorage.getItem(MARKET_STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [];
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('GAME');
  const [currentMob, setCurrentMob] = useState<ActiveMob | null>(null);
  const [damagePops, setDamagePops] = useState<DamagePop[]>([]);
  const [isHurt, setIsHurt] = useState(false);
  const [lastDrop, setLastDrop] = useState<Item | null>(null);
  
  const [activeDungeon, setActiveDungeon] = useState<{ template: DungeonTemplate, currentWave: number } | null>(null);
  const [skillCooldowns, setSkillCooldowns] = useState<Record<string, number>>({});
  const [activeDebuffs, setActiveDebuffs] = useState<PlayerDebuff[]>([]);
  const nextPopId = useRef(0);
  
  const statsRef = useRef(stats);
  useEffect(() => { statsRef.current = stats; }, [stats]);

  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    localStorage.setItem(MARKET_STORAGE_KEY, JSON.stringify(globalMarket));
  }, [globalMarket]);

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
        for (const id in updated) {
          if (updated[id] <= now) { delete updated[id]; changed = true; }
        }
        return changed ? updated : prev;
      });
      setActiveDebuffs(prev => {
        const filtered = prev.filter(d => d.endTime > now);
        return filtered.length !== prev.length ? filtered : prev;
      });
    }, 100);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { if (tg) { tg.expand(); tg.ready(); } }, [tg]);

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

  const addDamagePop = (value: number | string, color: string, isCrit = false, isSkill = false) => {
    const id = nextPopId.current++;
    setDamagePops(prev => [...prev, {
      id, value: typeof value === 'number' ? value : 0, textValue: typeof value === 'string' ? value : undefined,
      color, x: 35 + Math.random() * 30, y: 30 + Math.random() * 30, isSkill
    }]);
    setTimeout(() => { setDamagePops(prev => prev.filter(p => p.id !== id)); }, 1000);
  };

  const usePotion = (type: 'hp' | 'mp') => {
    if (statsRef.current.potions[type] <= 0) return;
    setStats(prev => {
      const maxVal = type === 'hp' ? (prev.maxHp + bonusHp) : prev.maxMp;
      const nextVal = Math.min(maxVal, prev[type] + (type === 'hp' ? POTION_CONFIG.HP_POTION.heal : POTION_CONFIG.MP_POTION.heal));
      return { ...prev, [type]: nextVal, potions: { ...prev.potions, [type]: prev.potions[type] - 1 } };
    });
    addDamagePop(type === 'hp' ? POTION_CONFIG.HP_POTION.heal : POTION_CONFIG.MP_POTION.heal, type === 'hp' ? '#22c55e' : '#0ea5e9');
  };

  const handleMobDefeat = (mob: ActiveMob) => {
    const multiplier = stats.isPremium ? 2.0 : 1.0;
    const xpReward = (mob.lvl / 2) * multiplier;
    const goldReward = mob.goldReward * multiplier;

    let droppedItem: Item | null = null;
    const dropChance = activeDungeon && mob.isBoss ? 1.0 : 0.15; 

    if (Math.random() < dropChance) {
      const types: ItemType[] = ['WEAPON', 'SHIELD', 'ARMOR', 'HELMET', 'ACCESSORY'];
      const rarities: ItemRarity[] = (activeDungeon && mob.isBoss && Math.random() < activeDungeon.template.specialDropRate) ? ['MOON', 'SUN'] : ['COMMON', 'STAR', 'MOON'];
      const randType = types[Math.floor(Math.random() * types.length)];
      const randRarity = rarities[Math.floor(Math.random() * rarities.length)] as ItemRarity;
      
      droppedItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: `${randRarity} ${randType === 'ACCESSORY' ? 'Jewelry' : randType}`,
        type: randType, rarity: randRarity, lvl: mob.lvl,
        atkBonus: randType === 'WEAPON' ? mob.lvl * (randRarity === 'SUN' ? 15 : 6) : 0,
        defBonus: (randType !== 'WEAPON' && randType !== 'ACCESSORY') ? mob.lvl * (randRarity === 'SUN' ? 10 : 4) : 0,
        hpBonus: mob.lvl * (randRarity === 'SUN' ? 150 : 35) + (randType === 'ACCESSORY' ? mob.lvl * 50 : 0),
        isEquipped: false
      };
      setLastDrop(droppedItem);
    }

    if (activeDungeon) {
      if (mob.isBoss) {
        setStats(prev => ({ ...prev, gold: prev.gold + activeDungeon.template.goldReward * multiplier }));
        setActiveDungeon(null);
      } else {
        setActiveDungeon(prev => prev ? ({ ...prev, currentWave: prev.currentWave + 1 }) : null);
      }
    }

    setStats(prev => {
      let newXp = prev.xp + xpReward;
      let newLvl = prev.lvl;
      let leveledUp = false;
      while (newXp >= getXpRequired(newLvl)) { newXp -= getXpRequired(newLvl); newLvl++; leveledUp = true; }
      return {
        ...prev, lvl: newLvl, xp: newXp, gold: prev.gold + goldReward,
        maxHp: leveledUp ? prev.maxHp + 100 : prev.maxHp, maxMp: leveledUp ? prev.maxMp + 40 : prev.maxMp,
        hp: leveledUp ? (prev.maxHp + 100 + bonusHp) : prev.hp, mp: leveledUp ? (prev.maxMp + 40) : prev.mp,
        atk: leveledUp ? prev.atk + 15 : prev.atk, def: leveledUp ? prev.def + 5 : prev.def,
        inventory: droppedItem ? [...prev.inventory, droppedItem] : prev.inventory
      };
    });
  };

  const mobAttack = useCallback(() => {
    if (!currentMob) return;
    setIsHurt(true);
    setTimeout(() => setIsHurt(false), 200);
    const rawDmg = currentMob.atk;
    const reducedDmg = Math.max(5, rawDmg - (stats.def + bonusDef) / 3);
    const finalDmg = Math.floor(reducedDmg * (0.9 + Math.random() * 0.2));
    addDamagePop(finalDmg, '#ef4444');
    setStats(prev => {
      const newHp = prev.hp - finalDmg;
      if (newHp <= 0) {
        alert("YENİLDİN! Şehre dönülüyor...");
        setActiveDungeon(null);
        return { ...prev, hp: prev.maxHp + bonusHp, mp: prev.maxMp, xp: Math.max(0, prev.xp - getXpRequired(prev.lvl) * 0.05) };
      }
      return { ...prev, hp: newHp };
    });
  }, [currentMob, bonusDef, bonusHp, stats.def]);

  const useSkill = useCallback((skill: Skill) => {
    if (!currentMob || isStunned || skillCooldowns[skill.id]) return;
    if (stats.mp < skill.mpCost) { addDamagePop("NO MP!", "#0ea5e9"); return; }
    setStats(prev => ({ ...prev, mp: prev.mp - skill.mpCost }));
    setSkillCooldowns(prev => ({ ...prev, [skill.id]: Date.now() + skill.cooldown }));
    const isCrit = Math.random() < 0.15;
    const baseDmg = (stats.atk + bonusAtk) * skill.damageMultiplier;
    const variance = 0.85 + Math.random() * 0.3;
    const dmg = Math.floor(baseDmg * variance * (isCrit ? 2.2 : 1));
    addDamagePop(dmg, isCrit ? '#f59e0b' : skill.color, isCrit, skill.id !== 'normal');
    setCurrentMob(prev => {
      if (!prev) return null;
      const newHp = prev.curHp - dmg;
      if (newHp <= 0) { handleMobDefeat(prev); return null; }
      return { ...prev, curHp: newHp };
    });
    if (Math.random() < 0.35) mobAttack();
  }, [currentMob, isStunned, skillCooldowns, stats.mp, stats.atk, bonusAtk, handleMobDefeat, mobAttack]);

  const toggleEquip = (itemId: string) => {
    setStats(prev => {
      const itemToEquip = prev.inventory.find(i => i.id === itemId);
      if (!itemToEquip) return prev;
      const isEquipping = !itemToEquip.isEquipped;
      const newInventory = prev.inventory.map(item => {
        if (item.id === itemId) return { ...item, isEquipped: isEquipping };
        if (isEquipping && item.isEquipped && item.type === itemToEquip.type) return { ...item, isEquipped: false };
        return item;
      });
      return { ...prev, inventory: newInventory };
    });
  };

  const listInMarket = (itemId: string) => {
    const item = stats.inventory.find(i => i.id === itemId);
    if (!item) return;
    const priceInput = prompt(`${item.name} kaça satılsın? (Pazar)`, "1000");
    const price = parseInt(priceInput || "0");
    if (isNaN(price) || price <= 0) return;
    const newListing: MarketListing = {
      id: Math.random().toString(36).substr(2, 9),
      item: { ...item, isEquipped: false },
      sellerName: tg?.initDataUnsafe?.user?.first_name || "Gezgin",
      price,
      date: Date.now()
    };
    setGlobalMarket(prev => [...prev, newListing]);
    setStats(prev => ({ ...prev, inventory: prev.inventory.filter(i => i.id !== itemId) }));
    alert("Pazara eklendi!");
  };

  const buyFromMarket = (listing: MarketListing) => {
    if (stats.gold < listing.price) { alert("Yetersiz altın!"); return; }
    setStats(prev => ({
      ...prev,
      gold: prev.gold - listing.price,
      inventory: [...prev.inventory, listing.item]
    }));
    setGlobalMarket(prev => prev.filter(l => l.id !== listing.id));
    alert("Satın alındı!");
  };

  const enterDungeon = (dungeon: DungeonTemplate) => {
    if (stats.lvl < dungeon.minLvl || stats.gold < dungeon.entryFee) {
      alert("Yetersiz altın veya seviye!");
      return;
    }
    setStats(prev => ({ ...prev, gold: prev.gold - dungeon.entryFee }));
    setActiveDungeon({ template: dungeon, currentWave: 1 });
    setCurrentMob(null); 
    setActiveTab('GAME');
  };

  const buyPremium = () => {
    if (stats.isPremium) return;
    const confirmed = confirm("250 Stars ile VIP Üyelik satın alınsın mı?");
    if (confirmed) {
      setStats(prev => ({ ...prev, isPremium: true, autoPotionEnabled: true }));
      alert("VIP Aktif!");
      setActiveTab('GAME');
    }
  };

  const saveToTelegram = () => {
    if (tg) {
      tg.sendData(JSON.stringify(stats));
    } else {
      alert("Veriler kaydedildi.");
    }
  };

  return (
    <div className="flex flex-col h-screen select-none overflow-hidden bg-[#020617] font-sans">
      <StatusBar stats={{...stats, maxHp: totalMaxHp}} totalAtk={totalAtk} totalDef={totalDef} />
      
      {/* Drop Animation */}
      {lastDrop && (
        <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
           <div className="bg-[#0f172a] border-4 border-amber-500/50 p-8 rounded-3xl shadow-[0_0_100px_rgba(245,158,11,0.3)] flex flex-col items-center gap-6 scale-up-center">
              <span className="text-7xl animate-bounce">💎</span>
              <h3 className="text-amber-500 font-black text-sm uppercase tracking-[0.4em] italic">Eşya Bulundu</h3>
              <p className="text-3xl font-black italic tracking-tighter" style={{color: RARITY_COLORS[lastDrop.rarity]}}>{lastDrop.name}</p>
              <button onClick={() => setLastDrop(null)} className="w-full bg-amber-600 text-slate-950 font-black py-4 rounded-xl uppercase shadow-lg active:scale-95 transition-transform">Envantere Al</button>
           </div>
        </div>
      )}

      {/* Main Game */}
      <main className={`flex-1 flex flex-col items-center justify-center relative p-6 transition-all duration-300 ${isHurt ? 'hit-shake bg-red-950/20' : ''} ${activeTab !== 'GAME' ? 'hidden' : 'flex'}`}>
        {currentMob ? (
          <div className="flex flex-col items-center gap-6 w-full max-w-xs">
            <div className={`bg-slate-900/95 border-2 p-2.5 rounded-lg shadow-2xl w-full text-center ${currentMob.isBoss ? 'border-amber-400 bg-amber-950/20' : 'border-slate-800'}`}>
              <h2 className="text-[10px] font-black text-amber-200 uppercase tracking-widest">{currentMob.isBoss && "🔥 "}{currentMob.name} (Lv{currentMob.lvl})</h2>
              <div className="h-2 w-full bg-black rounded mt-2 overflow-hidden border border-slate-800">
                <div className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-300" style={{ width: `${(currentMob.curHp/currentMob.hp)*100}%` }} />
              </div>
            </div>
            <div className="relative h-56 w-full flex items-center justify-center" onClick={() => !isStunned && useSkill(SRO_SKILLS[0])}>
              {damagePops.map(pop => (
                <div key={pop.id} className="absolute dmg-float font-black z-50 text-2xl" style={{ left: `${pop.x}%`, top: `${pop.y}%`, color: pop.color, textShadow: '2px 2px 4px black' }}>
                  {pop.textValue || pop.value}
                </div>
              ))}
              <img src={currentMob.img} className={`w-48 h-48 object-contain transition-transform active:scale-90 ${currentMob.isBoss ? 'scale-125' : ''}`} />
            </div>
            <div className="grid grid-cols-4 gap-2 w-full">
              {SRO_SKILLS.map(skill => {
                const cd = skillCooldowns[skill.id];
                return (
                  <button key={skill.id} onClick={(e) => { e.stopPropagation(); useSkill(skill); }} disabled={!!cd || isStunned}
                    className={`relative aspect-square rounded-lg border-2 flex flex-col items-center justify-center ${cd ? 'border-slate-900 bg-slate-950' : 'border-amber-500/40 bg-slate-900 active:scale-95'}`}>
                    <span className="text-xl">{skill.icon}</span>
                    <span className="text-[6px] font-black text-amber-500 uppercase mt-1">{skill.name}</span>
                    {cd && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-[10px] font-bold text-white">{((cd - Date.now())/1000).toFixed(1)}s</div>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : <div className="text-amber-500 animate-pulse text-xs font-bold uppercase tracking-widest">Bölge Keşfediliyor...</div>}
      </main>

      {/* OVERLAY TABS */}
      {activeTab === 'BAG' && (
          <div className="fixed inset-0 z-[200] bg-[#020617] flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-2">
              <h2 className="text-xl font-black text-amber-500 italic uppercase">Inventory</h2>
              <button onClick={() => setActiveTab('GAME')} className="text-slate-500 text-2xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {stats.inventory.length === 0 ? <p className="text-slate-600 text-center py-20 italic">Çanta boş.</p> : stats.inventory.map(item => (
                  <div key={item.id} className={`bg-[#0f172a] border-2 p-3 rounded-xl ${item.isEquipped ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-slate-800'}`}>
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[10px] font-black" style={{color: RARITY_COLORS[item.rarity]}}>{item.name} (Lv{item.lvl})</span>
                       <div className="text-[8px] font-bold text-slate-500 flex gap-2">
                          {item.atkBonus > 0 && <span className="text-amber-500">+{item.atkBonus} ATK</span>}
                          {item.defBonus > 0 && <span className="text-sky-500">+{item.defBonus} DEF</span>}
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => toggleEquip(item.id)} className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase ${item.isEquipped ? 'bg-amber-600 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>{item.isEquipped ? 'UNEQUIP' : 'EQUIP'}</button>
                       <button onClick={() => listInMarket(item.id)} className="px-3 bg-indigo-950 text-indigo-400 py-1.5 rounded-lg text-[8px] font-black border border-indigo-500/30 uppercase">SAT</button>
                    </div>
                  </div>
              ))}
            </div>
            <button onClick={saveToTelegram} className="mt-4 bg-emerald-600 text-slate-950 py-4 rounded-xl font-black uppercase tracking-widest text-xs">💾 KAYDET VE ÇIK</button>
          </div>
      )}

      {activeTab === 'NPC' && (
          <div className="fixed inset-0 z-[200] bg-[#020617] flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-2">
              <h2 className="text-xl font-black text-amber-500 uppercase">Market</h2>
              <button onClick={() => setActiveTab('GAME')} className="text-slate-500 text-2xl">✕</button>
            </div>
            <div className="space-y-4">
               {[POTION_CONFIG.HP_POTION, POTION_CONFIG.MP_POTION].map((pot, idx) => (
                  <div key={idx} className="bg-[#0f172a] border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                     <div className="flex items-center gap-4"><span className="text-3xl">{idx === 0 ? '❤️' : '💙'}</span><div><p className="text-xs font-black text-white">{pot.name}</p><p className="text-[8px] text-slate-500">+{pot.heal} {idx === 0 ? 'HP' : 'MP'}</p></div></div>
                     <button onClick={() => { if (stats.gold >= pot.cost) setStats(prev => ({...prev, gold: prev.gold - pot.cost, potions: {...prev.potions, [idx === 0 ? 'hp' : 'mp']: prev.potions[idx === 0 ? 'hp' : 'mp'] + 1}})); }} className="bg-amber-600 text-slate-950 text-[10px] font-black px-5 py-2 rounded-lg">{pot.cost}G</button>
                  </div>
               ))}
            </div>
          </div>
      )}

      {activeTab === 'DNG' && (
          <div className="fixed inset-0 z-[200] bg-[#020617] flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-2">
              <h2 className="text-xl font-black text-amber-500 uppercase">Zindanlar</h2>
              <button onClick={() => setActiveTab('GAME')} className="text-slate-500 text-2xl">✕</button>
            </div>
            <div className="space-y-4 overflow-y-auto pr-1 custom-scrollbar">
               {SRO_DUNGEONS.map(dng => (
                  <div key={dng.id} className={`bg-[#0f172a] border-2 p-5 rounded-2xl ${stats.lvl >= dng.minLvl ? 'border-amber-500/20 shadow-lg shadow-amber-900/10' : 'border-slate-900 opacity-50'}`}>
                     <h3 className="text-sm font-black text-amber-100 italic">{dng.name}</h3>
                     <p className="text-[8px] text-slate-400 mt-1 uppercase tracking-tighter leading-relaxed">{dng.description}</p>
                     <div className="flex justify-between items-center mt-4">
                        <span className="text-[9px] font-black text-amber-500/80 uppercase">Lv.{dng.minLvl}+ | {dng.entryFee}G</span>
                        <button onClick={() => enterDungeon(dng)} className="bg-amber-600 text-slate-950 text-[9px] font-black px-6 py-2 rounded-lg uppercase">GİRİŞ</button>
                     </div>
                  </div>
               ))}
            </div>
          </div>
      )}

      {activeTab === 'MARKET' && (
          <div className="fixed inset-0 z-[200] bg-[#020617] flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-indigo-500/30 pb-2">
              <h2 className="text-xl font-black text-indigo-400 uppercase">Küresel Pazar</h2>
              <button onClick={() => setActiveTab('GAME')} className="text-slate-500 text-2xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
               {globalMarket.length === 0 ? (
                 <div className="text-center py-20"><span className="text-4xl block mb-4">⚖️</span><p className="text-slate-500 text-xs italic">Şu an pazarda ürün yok.</p></div>
               ) : globalMarket.map(listing => (
                  <div key={listing.id} className="bg-[#0f172a] border border-indigo-500/20 p-4 rounded-xl">
                     <div className="flex justify-between items-start mb-3">
                        <div>
                           <p className="text-[10px] font-black" style={{color: RARITY_COLORS[listing.item.rarity]}}>{listing.item.name}</p>
                           <p className="text-[7px] text-slate-500 uppercase font-bold">Satıcı: {listing.sellerName}</p>
                        </div>
                        <span className="text-amber-400 font-black text-[10px] tracking-tighter">💰 {listing.price.toLocaleString()}</span>
                     </div>
                     <div className="flex gap-2 text-[7px] font-bold text-slate-400 mb-3 uppercase">
                        {listing.item.atkBonus > 0 && <span className="bg-amber-950/40 text-amber-500 px-1.5 py-0.5 rounded">+{listing.item.atkBonus} ATK</span>}
                        {listing.item.defBonus > 0 && <span className="bg-sky-950/40 text-sky-500 px-1.5 py-0.5 rounded">+{listing.item.defBonus} DEF</span>}
                     </div>
                     <button onClick={() => buyFromMarket(listing)} className="w-full bg-indigo-600 text-white text-[9px] font-black py-2 rounded-lg uppercase">SATIN AL</button>
                  </div>
               ))}
            </div>
          </div>
      )}

      {activeTab === 'VIP' && (
        <div className="fixed inset-0 z-[200] bg-[#020617] flex flex-col p-8 animate-in slide-in-from-bottom duration-300">
           <div className="flex justify-between items-center mb-8 border-b border-amber-500/40 pb-2">
              <h2 className="text-xl font-black text-amber-500 uppercase tracking-widest">VIP Shop</h2>
              <button onClick={() => setActiveTab('GAME')} className="text-slate-500 text-2xl">✕</button>
            </div>
            <div className="bg-gradient-to-br from-amber-900/40 to-slate-900 border-2 border-amber-500 p-8 rounded-3xl shadow-2xl">
               <div className="flex justify-between mb-4"><span className="bg-amber-500 text-black text-[9px] font-black px-2 py-0.5 rounded uppercase">Kalıcı Statü</span><span className="text-amber-500 font-black text-xs italic">⭐ 250 Stars</span></div>
               <h3 className="text-2xl font-black text-white italic tracking-tighter">VIP ÜYELİK</h3>
               <ul className="mt-6 space-y-3 text-[10px] text-amber-100/70 font-bold uppercase"><li>⚡ 2.0x XP & Altın Artışı</li><li>🧪 Otomatik HP/MP İksiri</li><li>💎 Özel Nadirlik Şansı</li><li>🛡️ Özel VIP İkonu</li></ul>
               <button onClick={buyPremium} disabled={stats.isPremium} className={`w-full mt-10 py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all ${stats.isPremium ? 'bg-slate-800 text-emerald-500' : 'bg-amber-500 text-black active:scale-95'}`}>
                 {stats.isPremium ? 'VIP AKTİF ✔️' : 'SATIN AL'}
               </button>
            </div>
            <p className="text-[8px] text-slate-500 mt-6 text-center italic">Premium ile efsanevi yolculuğunu hızlandır!</p>
        </div>
      )}

      {/* Footer Nav */}
      <footer className="p-4 bg-[#0f172a] border-t-2 border-slate-800 grid grid-cols-6 gap-1.5 z-[100]">
        <button onClick={() => setActiveTab('NPC')} className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${activeTab === 'NPC' ? 'bg-amber-600 text-slate-950' : 'bg-slate-800/50 text-slate-400'}`}>
           <span className="text-xl">🏪</span><span className="text-[6px] font-black uppercase mt-1">Market</span>
        </button>
        <button onClick={() => setActiveTab('DNG')} className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${activeTab === 'DNG' ? 'bg-amber-600 text-slate-950' : 'bg-slate-800/50 text-slate-400'}`}>
           <span className="text-xl">🏰</span><span className="text-[6px] font-black uppercase mt-1">Dungeon</span>
        </button>
        <button onClick={() => setActiveTab('VIP')} className="col-span-2 bg-gradient-to-b from-amber-400 to-amber-600 text-black font-black rounded-xl border-b-4 border-amber-800 active:translate-y-1 transition-all flex items-center justify-center gap-1 uppercase text-[10px] tracking-tighter">
           ⭐ {stats.isPremium ? 'VIP' : 'PREMIUM'}
        </button>
        <button onClick={() => setActiveTab('MARKET')} className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${activeTab === 'MARKET' ? 'bg-indigo-600 text-white' : 'bg-indigo-950/40 text-indigo-400'}`}>
           <span className="text-xl">⚖️</span><span className="text-[6px] font-black uppercase mt-1">Pazar</span>
        </button>
        <button onClick={() => setActiveTab('BAG')} className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${activeTab === 'BAG' ? 'bg-amber-600 text-slate-950' : 'bg-slate-800/50 text-slate-400'}`}>
           <span className="text-xl">🎒</span><span className="text-[6px] font-black uppercase mt-1">Bag</span>
        </button>
      </footer>
    </div>
  );
};

export default App;
