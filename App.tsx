
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StatusBar } from './components/StatusBar';
import { PlayerStats, ActiveMob, DamagePop, Item, ItemRarity, ItemType, Skill, PlayerDebuff, MobAbilityType, DungeonTemplate, MarketListing } from './types';
import { SRO_MOBS, SRO_SKILLS, SRO_DUNGEONS, getXpRequired, RARITY_COLORS, POTION_CONFIG, ITEM_RESALE_MULTIPLIERS } from './constants';

const STORAGE_KEY = 'sro_legend_journey_stats_v5_prod';
const MARKET_STORAGE_KEY = 'sro_global_pazar_listings_v5';

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
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [lastDrop, setLastDrop] = useState<Item | null>(null);
  const [marketFilter, setMarketFilter] = useState<ItemType | 'ALL'>('ALL');
  
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
  const totalMaxMp = stats.maxMp;

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

  useEffect(() => {
    const autoPotionTimer = setInterval(() => {
      if (statsRef.current.isPremium && statsRef.current.autoPotionEnabled) {
        if (statsRef.current.hp < totalMaxHp * 0.4 && statsRef.current.potions.hp > 0) usePotion('hp');
        if (statsRef.current.mp < totalMaxMp * 0.3 && statsRef.current.potions.mp > 0) usePotion('mp');
      }
    }, 2000);
    return () => clearInterval(autoPotionTimer);
  }, [totalMaxHp, totalMaxMp]);

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
      const nextVal = type === 'hp' ? Math.min(totalMaxHp, prev.hp + POTION_CONFIG.HP_POTION.heal) : Math.min(totalMaxMp, prev.mp + POTION_CONFIG.MP_POTION.heal);
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
      
      const accNames = ["Necklace", "Earring", "Ring"];
      const finalName = randType === 'ACCESSORY' ? accNames[Math.floor(Math.random()*accNames.length)] : randType;

      droppedItem = {
        id: Math.random().toString(36).substr(2, 9),
        name: `${randRarity} ${finalName}`,
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
      if (leveledUp) { setShowLevelUp(true); setTimeout(() => setShowLevelUp(false), 3000); }
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
    const reducedDmg = Math.max(5, rawDmg - totalDef / 3);
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
  }, [currentMob, totalDef, bonusHp]);

  const useSkill = useCallback((skill: Skill) => {
    if (!currentMob || isStunned || skillCooldowns[skill.id]) return;
    if (stats.mp < skill.mpCost) { addDamagePop("NO MP!", "#0ea5e9"); return; }
    setStats(prev => ({ ...prev, mp: prev.mp - skill.mpCost }));
    setSkillCooldowns(prev => ({ ...prev, [skill.id]: Date.now() + skill.cooldown }));
    const isCrit = Math.random() < 0.15;
    const baseDmg = totalAtk * skill.damageMultiplier;
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
  }, [currentMob, isStunned, skillCooldowns, stats.mp, totalAtk, handleMobDefeat, mobAttack]);

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

  const sellItemNPC = (itemId: string) => {
    const item = stats.inventory.find(i => i.id === itemId);
    if (!item) return;
    const price = Math.floor((item.lvl * 50) * ITEM_RESALE_MULTIPLIERS[item.rarity]);
    setStats(prev => ({ ...prev, gold: prev.gold + price, inventory: prev.inventory.filter(i => i.id !== itemId) }));
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
    alert("Ürün küresel pazara eklendi!");
  };

  const enterDungeon = (dungeon: DungeonTemplate) => {
    if (stats.lvl < dungeon.minLvl || stats.gold < dungeon.entryFee) {
      alert("Seviye veya altın yetersiz!");
      return;
    }
    setStats(prev => ({ ...prev, gold: prev.gold - dungeon.entryFee }));
    setActiveDungeon({ template: dungeon, currentWave: 1 });
    setCurrentMob(null); 
    setActiveTab('GAME');
  };

  const buyPremium = () => {
    const confirmed = confirm("250 Stars ile VIP Üyelik satın alınsın mı? (2x XP/Gold ve Oto-Pot)");
    if (confirmed) {
      setStats(prev => ({ ...prev, isPremium: true, autoPotionEnabled: true }));
      alert("Tebrikler! VIP Statüsü aktif edildi.");
      setActiveTab('GAME');
    }
  };

  const filteredMarket = useMemo(() => {
    if (marketFilter === 'ALL') return globalMarket;
    return globalMarket.filter(l => l.item.type === marketFilter);
  }, [globalMarket, marketFilter]);

  return (
    <div className="flex flex-col h-screen select-none overflow-hidden bg-[#020617] font-sans">
      <StatusBar stats={{...stats, maxHp: totalMaxHp}} totalAtk={totalAtk} totalDef={totalDef} />
      
      {/* Drop Notification */}
      {lastDrop && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
           <div className="bg-slate-900 border-2 border-amber-500 p-8 rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.4)] flex flex-col items-center gap-4 scale-up-center">
              <span className="text-6xl animate-bounce">✨</span>
              <h3 className="text-amber-500 font-black text-xs uppercase tracking-[0.3em]">Yeni Eşya!</h3>
              <p className="text-2xl font-black italic" style={{color: RARITY_COLORS[lastDrop.rarity]}}>{lastDrop.name}</p>
              <button onClick={() => setLastDrop(null)} className="mt-6 w-full bg-amber-600 text-slate-950 font-black py-4 rounded-xl uppercase tracking-widest">Tamam</button>
           </div>
        </div>
      )}

      {/* Main Game Screen */}
      <main className={`flex-1 flex flex-col items-center justify-center relative p-6 transition-all duration-300 ${isHurt ? 'hit-shake bg-red-950/20' : ''} ${activeTab !== 'GAME' ? 'hidden' : 'flex'}`}>
        {currentMob ? (
          <div className="relative z-10 flex flex-col items-center gap-4 w-full max-w-xs">
            <div className={`bg-slate-900/95 border-2 p-2 rounded shadow-2xl w-full text-center transition-colors ${currentMob.isCharging ? 'border-orange-500' : currentMob.isBoss ? 'border-amber-400 bg-amber-950/20' : 'border-amber-900/40'}`}>
              <h2 className="text-xs font-black text-amber-100 uppercase tracking-widest">{currentMob.isBoss && "[BOSS] "}{currentMob.name} <span className="text-slate-500">(Lv{currentMob.lvl})</span></h2>
              <div className="h-2 w-full bg-slate-950 rounded mt-1.5 overflow-hidden border border-slate-800">
                <div className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-300" style={{ width: `${(currentMob.curHp/currentMob.hp)*100}%` }} />
              </div>
            </div>
            <div className="relative h-48 w-full flex items-center justify-center" onClick={() => { if (!isStunned) useSkill(SRO_SKILLS[0]); }}>
              {damagePops.map(pop => (
                <div key={pop.id} className={`absolute dmg-float font-black z-50 text-2xl ${pop.isSkill ? 'scale-125' : ''}`} style={{ left: `${pop.x}%`, top: `${pop.y}%`, color: pop.color, textShadow: '2px 2px 4px black' }}>
                  {pop.textValue || pop.value.toLocaleString()}
                </div>
              ))}
              <img src={currentMob.img} className={`w-44 h-44 object-contain transition-transform active:scale-90 ${currentMob.isBoss ? 'scale-125 drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]' : ''}`} />
            </div>
            <div className="grid grid-cols-4 gap-2 w-full mt-2">
              {SRO_SKILLS.map(skill => {
                const cd = skillCooldowns[skill.id];
                const canAfford = stats.mp >= skill.mpCost;
                return (
                  <button key={skill.id} onClick={(e) => { e.stopPropagation(); useSkill(skill); }} disabled={!!cd || isStunned}
                    className={`relative aspect-square rounded border-2 flex flex-col items-center justify-center transition-all active:scale-95 ${cd ? 'border-slate-800 bg-slate-900' : canAfford ? 'border-amber-500/50 bg-slate-900' : 'border-red-900/40 bg-red-950/20'}`}>
                    <span className="text-xl mb-1">{skill.icon}</span>
                    <span className="text-[7px] font-black text-amber-400 uppercase truncate px-1">{skill.name}</span>
                    {cd && <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-[10px] font-black text-white">{( (cd - Date.now())/1000 ).toFixed(1)}s</div>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : <div className="text-amber-500 animate-pulse font-bold tracking-widest text-xs uppercase italic">Canavarlar aranıyor...</div>}
      </main>

      {/* OVERLAY TABS */}
      {activeTab === 'BAG' && (
          <div className="absolute inset-0 z-[100] bg-[#020617] flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-amber-900/40 pb-2">
              <h2 className="text-xl font-black text-amber-500 uppercase tracking-widest italic">Inventory</h2>
              <button onClick={() => setActiveTab('GAME')} className="text-slate-500 text-2xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {stats.inventory.length === 0 ? <div className="text-slate-600 text-center py-20 italic">Çanta boş.</div> : stats.inventory.map(item => {
                const sellPrice = Math.floor((item.lvl * 50) * ITEM_RESALE_MULTIPLIERS[item.rarity]);
                return (
                  <div key={item.id} className={`bg-[#0f172a] border-2 p-3 rounded flex flex-col gap-2 ${item.isEquipped ? 'border-amber-500' : 'border-slate-800'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-950 border border-slate-700 rounded flex items-center justify-center text-xl" style={{borderColor: RARITY_COLORS[item.rarity] + '60', color: RARITY_COLORS[item.rarity]}}>
                          {item.type === 'WEAPON' ? '⚔️' : item.type === 'ACCESSORY' ? '💍' : '🛡️'}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase" style={{color: RARITY_COLORS[item.rarity]}}>{item.name}</p>
                          <p className="text-[8px] text-slate-500">Lv.{item.lvl} {item.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {item.atkBonus > 0 && <p className="text-[8px] text-amber-500">+{item.atkBonus} ATK</p>}
                        {item.defBonus > 0 && <p className="text-[8px] text-sky-500">+{item.defBonus} DEF</p>}
                        {item.hpBonus > 0 && <p className="text-[8px] text-red-500">+{item.hpBonus} HP</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toggleEquip(item.id)} className={`flex-1 py-1.5 rounded text-[9px] font-black uppercase ${item.isEquipped ? 'bg-amber-600 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>{item.isEquipped ? 'UNEQUIP' : 'EQUIP'}</button>
                      <button onClick={() => listInMarket(item.id)} className="px-3 bg-indigo-900/30 border border-indigo-500/50 text-indigo-400 py-1.5 rounded text-[8px] font-black uppercase">PAZAR</button>
                      <button onClick={() => sellItemNPC(item.id)} className="px-3 bg-red-900/20 border border-red-900/40 text-red-600 py-1.5 rounded text-[8px] font-black uppercase">NPC ({sellPrice}G)</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
      )}

      {activeTab === 'MARKET' && (
          <div className="absolute inset-0 z-[100] bg-[#020617] flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-4 border-b border-amber-900/40 pb-2">
              <h2 className="text-xl font-black text-amber-500 uppercase italic">Global Pazar</h2>
              <button onClick={() => setActiveTab('GAME')} className="text-slate-500 text-2xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {globalMarket.length === 0 ? <div className="text-slate-600 text-center py-20 italic">Henüz ürün yok.</div> : globalMarket.map(listing => (
                  <div key={listing.id} className="bg-[#0f172a] border border-slate-800 p-3 rounded flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-slate-950 border border-slate-700 rounded flex items-center justify-center text-xl" style={{color: RARITY_COLORS[listing.item.rarity]}}>{listing.item.type === 'WEAPON' ? '⚔️' : '💍'}</div>
                       <div><p className="text-[10px] font-black" style={{color: RARITY_COLORS[listing.item.rarity]}}>{listing.item.name}</p><p className="text-[7px] text-slate-500 uppercase">SATICI: {listing.sellerName}</p></div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                       <span className="text-xs font-black text-amber-400">💰 {listing.price}</span>
                       <button onClick={() => {
                          if (stats.gold >= listing.price) {
                             setStats(prev => ({...prev, gold: prev.gold - listing.price, inventory: [...prev.inventory, listing.item]}));
                             setGlobalMarket(prev => prev.filter(l => l.id !== listing.id));
                             alert("Satın alındı!");
                          } else alert("Yetersiz altın!");
                       }} className="bg-amber-600 text-slate-950 px-3 py-1 rounded text-[8px] font-black uppercase">AL</button>
                    </div>
                  </div>
              ))}
            </div>
          </div>
      )}

      {activeTab === 'NPC' && (
          <div className="absolute inset-0 z-[100] bg-[#020617] flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-amber-900/40 pb-2">
              <h2 className="text-xl font-black text-amber-500 uppercase italic">Jang'an Market</h2>
              <button onClick={() => setActiveTab('GAME')} className="text-slate-500 text-2xl">✕</button>
            </div>
            <div className="space-y-4">
               <div className="bg-[#0f172a] border border-slate-800 p-4 rounded flex justify-between items-center">
                  <div className="flex items-center gap-4"><span className="text-3xl">🧪</span><div><p className="text-xs font-black text-red-400 uppercase">HP Potion</p><p className="text-[9px] text-slate-500 font-bold">+350 HP</p></div></div>
                  <button onClick={() => { if (stats.gold >= 350) setStats(prev => ({ ...prev, gold: prev.gold - 350, potions: { ...prev.potions, hp: prev.potions.hp + 1 } })); }} className="bg-amber-600 text-slate-950 text-[10px] font-black px-4 py-2 rounded">350G</button>
               </div>
               <div className="bg-[#0f172a] border border-slate-800 p-4 rounded flex justify-between items-center">
                  <div className="flex items-center gap-4"><span className="text-3xl">🧪</span><div><p className="text-xs font-black text-sky-400 uppercase">MP Potion</p><p className="text-[9px] text-slate-500 font-bold">+250 MP</p></div></div>
                  <button onClick={() => { if (stats.gold >= 350) setStats(prev => ({ ...prev, gold: prev.gold - 350, potions: { ...prev.potions, mp: prev.potions.mp + 1 } })); }} className="bg-amber-600 text-slate-950 text-[10px] font-black px-4 py-2 rounded">350G</button>
               </div>
            </div>
          </div>
      )}

      {activeTab === 'DNG' && (
          <div className="absolute inset-0 z-[100] bg-[#020617] flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6 border-b border-amber-900/40 pb-2">
              <h2 className="text-xl font-black text-amber-500 uppercase italic">Zindanlar</h2>
              <button onClick={() => setActiveTab('GAME')} className="text-slate-500 text-2xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4">
              {SRO_DUNGEONS.map(dungeon => (
                <div key={dungeon.id} className={`bg-[#0f172a] border-2 p-4 rounded ${stats.lvl >= dungeon.minLvl ? 'border-amber-500/30' : 'border-slate-800 opacity-60'}`}>
                  <h3 className="text-sm font-black text-white uppercase">{dungeon.name}</h3>
                  <p className="text-[9px] text-slate-400 mt-1">{dungeon.description}</p>
                  <div className="flex justify-between items-center mt-3">
                     <span className="text-[10px] text-amber-400 font-black">Lv.{dungeon.minLvl} | 💰 {dungeon.entryFee}G</span>
                     <button onClick={() => enterDungeon(dungeon)} className="bg-amber-600 text-slate-950 text-[9px] font-black px-4 py-1.5 rounded uppercase">GİRİŞ</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
      )}

      {activeTab === 'VIP' && (
        <div className="absolute inset-0 z-[150] bg-[#020617] flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
           <div className="flex justify-between items-center mb-8 border-b border-amber-500 pb-2">
              <h2 className="text-xl font-black text-amber-500 uppercase italic tracking-widest">Premium Shop</h2>
              <button onClick={() => setActiveTab('GAME')} className="text-slate-500 text-2xl">✕</button>
            </div>
            <div className="bg-gradient-to-br from-amber-900/40 to-slate-900 border-2 border-amber-500 p-6 rounded-2xl shadow-2xl">
               <div className="flex justify-between items-start mb-4"><span className="bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">VIP Üyelik</span><span className="text-amber-500 font-black text-sm">⭐ 250 Stars</span></div>
               <h3 className="text-xl font-black text-white italic">EFSANEVİ PAKET</h3>
               <ul className="mt-4 space-y-2 text-[11px] text-amber-100/80 font-bold uppercase tracking-wide"><li>✓ 2.0x Tecrübe (XP)</li><li>✓ 2.0x Altın (Gold)</li><li>✓ Otomatik İksir Desteği</li><li>✓ Özel VIP İkonu</li></ul>
               <button onClick={buyPremium} className="w-full mt-8 bg-amber-500 text-black py-4 rounded-xl font-black uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(245,158,11,0.5)] active:scale-95 transition-all">HEMEN SATIN AL</button>
            </div>
            <button onClick={() => setActiveTab('GAME')} className="mt-auto bg-slate-800/50 py-4 rounded-xl text-xs font-black uppercase text-slate-400 tracking-widest">GERİ DÖN</button>
        </div>
      )}

      {/* FOOTER CONTROLS */}
      <footer className="p-4 bg-[#0f172a] border-t-2 border-amber-900/30 grid grid-cols-6 gap-1 relative z-[90]">
        <button onClick={() => setActiveTab('NPC')} className={`aspect-square rounded border flex flex-col items-center justify-center transition-all ${activeTab === 'NPC' ? 'bg-amber-600 border-amber-400 text-slate-950' : 'bg-slate-800/80 border-slate-700/50 text-slate-400'}`}>
           <span className="text-lg">🏪</span><span className="text-[6px] font-black mt-1 uppercase">NPC</span>
        </button>
        <button onClick={() => setActiveTab('DNG')} className={`aspect-square rounded border flex flex-col items-center justify-center transition-all ${activeTab === 'DNG' ? 'bg-amber-600 border-amber-400 text-slate-950' : 'bg-slate-800/80 border-slate-700/50 text-slate-400'}`}>
           <span className="text-lg">🏰</span><span className="text-[6px] font-black mt-1 uppercase">DNG</span>
        </button>
        <button onClick={() => setActiveTab('VIP')} className="col-span-2 bg-gradient-to-b from-amber-400 to-amber-600 text-black font-black rounded shadow-[0_0_15px_rgba(251,191,36,0.3)] active:translate-y-1 transition-all uppercase tracking-widest text-[10px] border-b-4 border-amber-800 flex items-center justify-center gap-1">
           ⭐ PREMIUM
        </button>
        <button onClick={() => setActiveTab('MARKET')} className={`aspect-square rounded border flex flex-col items-center justify-center transition-all ${activeTab === 'MARKET' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'}`}>
           <span className="text-lg">⚖️</span><span className="text-[6px] font-black mt-1 uppercase">PAZAR</span>
        </button>
        <button onClick={() => setActiveTab('BAG')} className={`aspect-square rounded border flex flex-col items-center justify-center transition-all ${activeTab === 'BAG' ? 'bg-amber-600 border-amber-400 text-slate-950' : 'bg-slate-800/80 border-slate-700/50 text-slate-400'}`}>
           <span className="text-lg">🎒</span><span className="text-[6px] font-black mt-1 uppercase">BAG</span>
        </button>
      </footer>
    </div>
  );
};

export default App;
