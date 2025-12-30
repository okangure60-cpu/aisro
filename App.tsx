
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StatusBar } from './components/StatusBar';
import { PlayerStats, ActiveMob, DamagePop, Item, ItemRarity, ItemType, Skill, PlayerDebuff, MobAbilityType, DungeonTemplate, MarketListing } from './types';
import { SRO_MOBS, SRO_SKILLS, SRO_DUNGEONS, getXpRequired, RARITY_COLORS, POTION_CONFIG, ITEM_RESALE_MULTIPLIERS } from './constants';

const STORAGE_KEY = 'sro_legend_journey_stats_v7';
const MARKET_STORAGE_KEY = 'sro_global_pazar_listings_v7';

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
      lvl: 1, xp: 0, gold: 15000, hp: 300, maxHp: 300, mp: 200, maxMp: 200, atk: 25, def: 12,
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
  
  // Custom Modals State
  const [marketModal, setMarketModal] = useState<{item: Item, price: string} | null>(null);
  const [confirmModal, setConfirmModal] = useState<{title: string, message: string, onConfirm: () => void} | null>(null);
  const [infoModal, setInfoModal] = useState<{title: string, message: string} | null>(null);
  
  const [activeDungeon, setActiveDungeon] = useState<{ template: DungeonTemplate, currentWave: number } | null>(null);
  const [skillCooldowns, setSkillCooldowns] = useState<Record<string, number>>({});
  const [activeDebuffs, setActiveDebuffs] = useState<PlayerDebuff[]>([]);
  const nextPopId = useRef(0);
  
  const statsRef = useRef(stats);
  useEffect(() => { statsRef.current = stats; }, [stats]);

  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    if (tg) {
      tg.expand();
      tg.ready();
      tg.headerColor = '#020617';
      tg.backgroundColor = '#020617';
    }
  }, [tg]);

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

  // Skill & Debuff Timer
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
        name: `${randRarity} ${randType}`,
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
        maxHp: leveledUp ? prev.maxHp + 100 : prev.maxHp,
        hp: leveledUp ? (prev.maxHp + 100 + bonusHp) : prev.hp,
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
        setInfoModal({title: "Yenildin", message: "Şehre dönülüyor..."});
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
    const dmg = Math.floor((stats.atk + bonusAtk) * skill.damageMultiplier * (isCrit ? 2.2 : 1));
    addDamagePop(dmg, isCrit ? '#f59e0b' : skill.color);
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

  const confirmMarketListing = () => {
    if (!marketModal) return;
    const price = parseInt(marketModal.price);
    if (isNaN(price) || price <= 0) { setInfoModal({title: "Hata", message: "Geçersiz fiyat!"}); return; }
    
    const newListing: MarketListing = {
      id: Math.random().toString(36).substr(2, 9),
      item: { ...marketModal.item, isEquipped: false },
      sellerName: tg?.initDataUnsafe?.user?.first_name || "Gezgin",
      price,
      date: Date.now()
    };
    setGlobalMarket(prev => [...prev, newListing]);
    setStats(prev => ({ ...prev, inventory: prev.inventory.filter(i => i.id !== marketModal.item.id) }));
    setMarketModal(null);
    setInfoModal({title: "Başarılı", message: "Eşya pazara eklendi."});
  };

  const buyFromMarket = (listing: MarketListing) => {
    if (stats.gold < listing.price) { setInfoModal({title: "Hata", message: "Yetersiz altın!"}); return; }
    setStats(prev => ({
      ...prev,
      gold: prev.gold - listing.price,
      inventory: [...prev.inventory, listing.item]
    }));
    setGlobalMarket(prev => prev.filter(l => l.id !== listing.id));
    setInfoModal({title: "Başarılı", message: "Eşya satın alındı."});
  };

  const enterDungeon = (dungeon: DungeonTemplate) => {
    if (stats.lvl < dungeon.minLvl) { setInfoModal({title: "Kilitli", message: `Bu zindan için Lv${dungeon.minLvl} olmalısın!`}); return; }
    if (stats.gold < dungeon.entryFee) { setInfoModal({title: "Fakir", message: "Giriş ücreti için yeterli altının yok!"}); return; }
    
    setConfirmModal({
      title: "Zindana Gir",
      message: `${dungeon.name} zindanına ${dungeon.entryFee}G karşılığında girmek istiyor musun?`,
      onConfirm: () => {
        setStats(prev => ({ ...prev, gold: prev.gold - dungeon.entryFee }));
        setActiveDungeon({ template: dungeon, currentWave: 1 });
        setCurrentMob(null); 
        setActiveTab('GAME');
        setConfirmModal(null);
      }
    });
  };

  const buyPremium = () => {
    if (stats.isPremium) return;
    setConfirmModal({
      title: "VIP Üyelik",
      message: "250 Stars karşılığında VIP Üyelik almak istiyor musun?",
      onConfirm: () => {
        setStats(prev => ({ ...prev, isPremium: true, autoPotionEnabled: true }));
        setConfirmModal(null);
        setInfoModal({title: "Efsane Oldun!", message: "VIP Üyelik aktif edildi."});
        setActiveTab('GAME');
      }
    });
  };

  const saveToTelegram = () => {
    if (tg) {
      tg.sendData(JSON.stringify(stats));
    } else {
      setInfoModal({title: "Sistem", message: "Veriler kaydedildi."});
    }
  };

  return (
    <div className="flex flex-col h-screen select-none overflow-hidden bg-[#020617] font-sans text-slate-200">
      <StatusBar stats={{...stats, maxHp: totalMaxHp}} totalAtk={totalAtk} totalDef={totalDef} />
      
      {/* MODAL SYSTEM (Custom Dialogs) */}
      {confirmModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
           <div className="bg-[#0f172a] border-2 border-amber-500/50 p-6 rounded-2xl w-full max-w-xs text-center shadow-2xl">
              <h3 className="text-amber-500 font-black mb-2 uppercase">{confirmModal.title}</h3>
              <p className="text-xs text-slate-300 mb-6">{confirmModal.message}</p>
              <div className="flex gap-3">
                 <button onClick={() => setConfirmModal(null)} className="flex-1 py-2 rounded-lg bg-slate-800 font-bold text-xs">İPTAL</button>
                 <button onClick={confirmModal.onConfirm} className="flex-1 py-2 rounded-lg bg-amber-600 text-black font-black text-xs">ONAYLA</button>
              </div>
           </div>
        </div>
      )}

      {infoModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
           <div className="bg-[#0f172a] border-2 border-sky-500/50 p-6 rounded-2xl w-full max-w-xs text-center">
              <h3 className="text-sky-400 font-black mb-2 uppercase">{infoModal.title}</h3>
              <p className="text-xs text-slate-300 mb-6">{infoModal.message}</p>
              <button onClick={() => setInfoModal(null)} className="w-full py-2 rounded-lg bg-sky-600 text-white font-black text-xs">TAMAM</button>
           </div>
        </div>
      )}

      {marketModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
           <div className="bg-[#0f172a] border-2 border-indigo-500/50 p-6 rounded-2xl w-full max-w-xs">
              <h3 className="text-indigo-400 font-black mb-4 text-center uppercase tracking-widest text-sm">Pazara Koy</h3>
              <div className="bg-slate-900 p-3 rounded-lg mb-4 text-center">
                 <p className="text-[10px] font-black" style={{color: RARITY_COLORS[marketModal.item.rarity]}}>{marketModal.item.name}</p>
              </div>
              <input type="number" value={marketModal.price} onChange={e => setMarketModal({...marketModal, price: e.target.value})} placeholder="Fiyat girin (Gold)" 
                className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl text-center text-amber-500 font-bold mb-4 focus:outline-none focus:border-indigo-500" />
              <div className="flex gap-3">
                 <button onClick={() => setMarketModal(null)} className="flex-1 py-3 rounded-xl bg-slate-800 text-xs font-bold">İPTAL</button>
                 <button onClick={confirmMarketListing} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-black text-xs">SATIS</button>
              </div>
           </div>
        </div>
      )}

      {/* Main Game Screen */}
      <main className={`flex-1 flex flex-col items-center justify-center relative p-6 transition-all ${isHurt ? 'hit-shake bg-red-950/10' : ''} ${activeTab !== 'GAME' ? 'hidden' : 'flex'}`}>
        {currentMob ? (
          <div className="flex flex-col items-center gap-6 w-full max-w-xs">
            <div className={`bg-slate-900/90 border-2 p-2 rounded-lg w-full text-center ${currentMob.isBoss ? 'border-amber-400 bg-amber-950/20' : 'border-slate-800'}`}>
              <h2 className="text-[10px] font-black text-amber-200 uppercase tracking-widest">{currentMob.isBoss && "🔥 "}{currentMob.name} (Lv{currentMob.lvl})</h2>
              <div className="h-2 w-full bg-black rounded mt-2 overflow-hidden border border-slate-800">
                <div className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all" style={{ width: `${(currentMob.curHp/currentMob.hp)*100}%` }} />
              </div>
            </div>
            
            <div className="relative h-48 w-full flex items-center justify-center" onClick={() => !isStunned && useSkill(SRO_SKILLS[0])}>
              {damagePops.map(pop => (
                <div key={pop.id} className="absolute dmg-float font-black z-[60] text-2xl pointer-events-none" style={{ left: `${pop.x}%`, top: `${pop.y}%`, color: pop.color, textShadow: '2px 2px 4px black' }}>
                  {pop.textValue || pop.value}
                </div>
              ))}
              <img src={currentMob.img} className={`w-44 h-44 object-contain transition-transform active:scale-90 ${currentMob.isBoss ? 'scale-125' : ''}`} />
            </div>

            <div className="grid grid-cols-4 gap-2 w-full">
              {SRO_SKILLS.map(skill => {
                const cd = skillCooldowns[skill.id];
                return (
                  <button key={skill.id} onClick={(e) => { e.stopPropagation(); useSkill(skill); }} disabled={!!cd || isStunned}
                    className={`relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all active:scale-95 ${cd ? 'border-slate-900 bg-slate-950 opacity-80' : 'border-amber-500/30 bg-slate-900'}`}>
                    <span className="text-xl">{skill.icon}</span>
                    <span className="text-[6px] font-black text-amber-500 uppercase mt-1">{skill.name}</span>
                    {cd && <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-[10px] font-bold text-white rounded-xl">{((cd - Date.now())/1000).toFixed(1)}s</div>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : <div className="text-amber-500 animate-pulse text-xs font-bold uppercase tracking-widest">Bölge Keşfediliyor...</div>}
      </main>

      {/* OVERLAY TABS */}
      <div className={`fixed inset-0 z-[500] bg-[#020617] flex flex-col p-6 animate-in slide-in-from-bottom duration-300 ${activeTab === 'GAME' ? 'hidden' : 'flex'}`}>
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-2">
           <h2 className="text-xl font-black text-amber-500 uppercase italic">
             {activeTab === 'BAG' && 'Inventory'}
             {activeTab === 'NPC' && 'Market'}
             {activeTab === 'DNG' && 'Dungeons'}
             {activeTab === 'MARKET' && 'Global Pazar'}
             {activeTab === 'VIP' && 'VIP Shop'}
           </h2>
           <button onClick={() => setActiveTab('GAME')} className="text-slate-500 text-2xl px-2">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
           {activeTab === 'BAG' && (
             <div className="space-y-3 pb-20">
               {stats.inventory.length === 0 ? <p className="text-slate-600 text-center py-20 italic">Çanta boş.</p> : stats.inventory.map(item => (
                 <div key={item.id} className={`bg-[#0f172a] border-2 p-3 rounded-xl ${item.isEquipped ? 'border-amber-500 shadow-lg shadow-amber-900/10' : 'border-slate-800'}`}>
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[10px] font-black" style={{color: RARITY_COLORS[item.rarity]}}>{item.name} (Lv{item.lvl})</span>
                       <div className="text-[8px] font-bold text-slate-500 flex gap-2">
                          {item.atkBonus > 0 && <span className="text-amber-500">+{item.atkBonus} ATK</span>}
                          {item.defBonus > 0 && <span className="text-sky-500">+{item.defBonus} DEF</span>}
                       </div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => toggleEquip(item.id)} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase ${item.isEquipped ? 'bg-amber-600 text-black' : 'bg-slate-800 text-slate-300'}`}>{item.isEquipped ? 'UNEQUIP' : 'EQUIP'}</button>
                       <button onClick={() => setMarketModal({item, price: "1000"})} className="px-3 bg-indigo-950 text-indigo-400 py-2 rounded-lg text-[8px] font-black border border-indigo-500/30 uppercase">SAT</button>
                    </div>
                 </div>
               ))}
               <button onClick={saveToTelegram} className="w-full bg-emerald-600 text-black py-4 rounded-xl font-black uppercase tracking-widest text-xs mt-4">💾 KAYDET VE ÇIK</button>
             </div>
           )}

           {activeTab === 'NPC' && (
             <div className="space-y-4">
               {[POTION_CONFIG.HP_POTION, POTION_CONFIG.MP_POTION].map((pot, idx) => (
                  <div key={idx} className="bg-[#0f172a] border border-slate-800 p-4 rounded-2xl flex justify-between items-center">
                     <div className="flex items-center gap-4"><span className="text-3xl">{idx === 0 ? '❤️' : '💙'}</span><div><p className="text-xs font-black text-white">{pot.name}</p><p className="text-[8px] text-slate-500">+{pot.heal} {idx === 0 ? 'HP' : 'MP'}</p></div></div>
                     <button onClick={() => { if (stats.gold >= pot.cost) setStats(prev => ({...prev, gold: prev.gold - pot.cost, potions: {...prev.potions, [idx === 0 ? 'hp' : 'mp']: prev.potions[idx === 0 ? 'hp' : 'mp'] + 1}})); }} className="bg-amber-600 text-black text-[10px] font-black px-5 py-2 rounded-lg">{pot.cost}G</button>
                  </div>
               ))}
             </div>
           )}

           {activeTab === 'DNG' && (
             <div className="space-y-4 pb-20">
               {SRO_DUNGEONS.map(dng => (
                  <div key={dng.id} className={`bg-[#0f172a] border-2 p-5 rounded-2xl ${stats.lvl >= dng.minLvl ? 'border-amber-500/20 shadow-lg' : 'border-slate-900 opacity-50'}`}>
                     <h3 className="text-sm font-black text-amber-100 italic">{dng.name}</h3>
                     <p className="text-[8px] text-slate-400 mt-1 uppercase tracking-tighter leading-relaxed">{dng.description}</p>
                     <div className="flex justify-between items-center mt-4">
                        <span className="text-[9px] font-black text-amber-500/80 uppercase tracking-tighter">Lv.{dng.minLvl}+ | {dng.entryFee.toLocaleString()}G</span>
                        <button onClick={() => enterDungeon(dng)} className="bg-amber-600 text-black text-[9px] font-black px-6 py-2 rounded-lg uppercase">GİRİŞ</button>
                     </div>
                  </div>
               ))}
             </div>
           )}

           {activeTab === 'MARKET' && (
             <div className="space-y-3 pb-20">
               {globalMarket.length === 0 ? <p className="text-slate-600 text-center py-20 italic">Pazar şu an boş.</p> : globalMarket.map(listing => (
                  <div key={listing.id} className="bg-[#0f172a] border border-indigo-500/20 p-4 rounded-xl">
                     <div className="flex justify-between items-start mb-3">
                        <div>
                           <p className="text-[10px] font-black" style={{color: RARITY_COLORS[listing.item.rarity]}}>{listing.item.name}</p>
                           <p className="text-[7px] text-slate-500 uppercase font-bold">Satıcı: {listing.sellerName}</p>
                        </div>
                        <span className="text-amber-400 font-black text-[10px] tracking-tighter">💰 {listing.price.toLocaleString()}</span>
                     </div>
                     <button onClick={() => buyFromMarket(listing)} className="w-full bg-indigo-600 text-white text-[9px] font-black py-2 rounded-lg uppercase">SATIN AL</button>
                  </div>
               ))}
             </div>
           )}

           {activeTab === 'VIP' && (
             <div className="bg-gradient-to-br from-amber-900/30 to-slate-900 border-2 border-amber-500/50 p-6 rounded-3xl">
                <h3 className="text-xl font-black text-white italic tracking-tighter mb-4">VIP ÜYELİK</h3>
                <ul className="space-y-2 text-[10px] text-amber-100/70 font-bold uppercase mb-8">
                  <li>⚡ 2.0x XP & Altın Artışı</li>
                  <li>🧪 Otomatik HP/MP İksiri</li>
                  <li>🛡️ Özel VIP İsmi</li>
                </ul>
                <button onClick={buyPremium} disabled={stats.isPremium} className={`w-full py-4 rounded-xl font-black uppercase text-xs ${stats.isPremium ? 'bg-slate-800 text-emerald-500' : 'bg-amber-500 text-black'}`}>
                  {stats.isPremium ? 'VIP AKTİF ✔️' : '250 STARS - AL'}
                </button>
             </div>
           )}
        </div>
      </div>

      {/* Footer Nav */}
      <footer className="h-20 bg-[#0f172a] border-t-2 border-slate-800 grid grid-cols-5 gap-1 p-2 z-[600]">
        <button onClick={() => setActiveTab('NPC')} className={`rounded-xl flex flex-col items-center justify-center transition-all ${activeTab === 'NPC' ? 'bg-amber-600 text-black shadow-lg shadow-amber-500/20' : 'bg-slate-800/40 text-slate-400'}`}>
           <span className="text-lg">🏪</span><span className="text-[7px] font-black uppercase">Shop</span>
        </button>
        <button onClick={() => setActiveTab('DNG')} className={`rounded-xl flex flex-col items-center justify-center transition-all ${activeTab === 'DNG' ? 'bg-amber-600 text-black shadow-lg shadow-amber-500/20' : 'bg-slate-800/40 text-slate-400'}`}>
           <span className="text-lg">🏰</span><span className="text-[7px] font-black uppercase">Dungeon</span>
        </button>
        <button onClick={() => setActiveTab('VIP')} className="bg-gradient-to-b from-amber-400 to-amber-600 text-black font-black rounded-xl border-b-2 border-amber-800 flex items-center justify-center text-[10px] uppercase">
           ⭐ VIP
        </button>
        <button onClick={() => setActiveTab('MARKET')} className={`rounded-xl flex flex-col items-center justify-center transition-all ${activeTab === 'MARKET' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800/40 text-slate-400'}`}>
           <span className="text-lg">⚖️</span><span className="text-[7px] font-black uppercase">Pazar</span>
        </button>
        <button onClick={() => setActiveTab('BAG')} className={`rounded-xl flex flex-col items-center justify-center transition-all ${activeTab === 'BAG' ? 'bg-amber-600 text-black shadow-lg shadow-amber-500/20' : 'bg-slate-800/40 text-slate-400'}`}>
           <span className="text-lg">🎒</span><span className="text-[7px] font-black uppercase">Bag</span>
        </button>
      </footer>
    </div>
  );
};

export default App;
