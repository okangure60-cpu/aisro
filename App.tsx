
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StatusBar } from './components/StatusBar';
import { PlayerStats, ActiveMob, DamagePop, Item, ItemRarity, ItemType, Skill, PlayerDebuff, MobAbilityType, DungeonTemplate, MarketListing, VipFeature } from './types';
import { SRO_MOBS, SRO_SKILLS, SRO_DUNGEONS, getXpRequired, RARITY_COLORS, POTION_CONFIG } from './constants';

const STORAGE_KEY = 'sro_legend_journey_stats_v10';
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

type ActiveTab = 'GAME' | 'BAG' | 'NPC' | 'DNG' | 'MARKET' | 'VIP' | 'CREATE';

const INITIAL_VIP: PlayerStats['vip'] = {
  autoPotion: { active: false, expiresAt: 0 },
  expBoost: { active: false, expiresAt: 0 },
  dropBoost: { active: false, expiresAt: 0 },
  premium: { active: false, expiresAt: 0 }
};

const App: React.FC = () => {
  const [stats, setStats] = useState<PlayerStats>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.vip) parsed.vip = INITIAL_VIP;
        if (!parsed.charName) return null as any; // Trigger creation
        return parsed;
      } catch (e) { console.warn(e); }
    }
    return null as any;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>(stats?.charName ? 'GAME' : 'CREATE');
  const [currentMob, setCurrentMob] = useState<ActiveMob | null>(null);
  const [damagePops, setDamagePops] = useState<DamagePop[]>([]);
  const [isHurt, setIsHurt] = useState(false);
  const [activeDungeon, setActiveDungeon] = useState<{ template: DungeonTemplate, currentWave: number } | null>(null);
  const [skillCooldowns, setSkillCooldowns] = useState<Record<string, number>>({});
  const [activeDebuffs, setActiveDebuffs] = useState<PlayerDebuff[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [shopQuantities, setShopQuantities] = useState<Record<string, number>>({ hp: 1, mp: 1 });
  
  // Creation state
  const [tempName, setTempName] = useState('');
  const [tempBuild, setTempBuild] = useState('Blade');

  const nextPopId = useRef(0);
  const tg = (window as any).Telegram?.WebApp;

  useEffect(() => {
    if (tg) {
      try {
        tg.ready?.();
        tg.expand?.();
      } catch (e) { console.warn(e); }
    }
  }, [tg]);

  useEffect(() => { 
    if (stats) localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); 
  }, [stats]);

  // VIP Expiry check
  useEffect(() => {
    if (!stats) return;
    const interval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      const newVip = { ...stats.vip };
      
      (Object.keys(newVip) as Array<keyof typeof newVip>).forEach(key => {
        if (newVip[key].active && now > newVip[key].expiresAt) {
          newVip[key] = { active: false, expiresAt: 0 };
          changed = true;
          showToast(`${key.toUpperCase()} süresi doldu!`);
        }
      });

      if (changed) setStats(prev => ({ ...prev, vip: newVip }));
    }, 10000);
    return () => clearInterval(interval);
  }, [stats]);

  // Auto Potion logic
  useEffect(() => {
    if (!stats) return;
    const isPremiumActive = stats.vip.premium.active;
    const isAutoPotActive = stats.vip.autoPotion.active || isPremiumActive;

    if (isAutoPotActive) {
      const interval = setInterval(() => {
        setStats(prev => {
          let updated = { ...prev };
          let used = false;
          
          // HP Check
          if (updated.hp < (updated.maxHp * 0.4) && updated.potions.hp > 0) {
            updated.hp = Math.min(updated.maxHp, updated.hp + POTION_CONFIG.HP_POTION.heal);
            updated.potions.hp -= 1;
            used = true;
          }
          // MP Check
          if (updated.mp < (updated.maxMp * 0.3) && updated.potions.mp > 0) {
            updated.mp = Math.min(updated.maxMp, updated.mp + POTION_CONFIG.MP_POTION.heal);
            updated.potions.mp -= 1;
            used = true;
          }
          
          return used ? updated : prev;
        });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [stats?.vip]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const equippedItems = useMemo(() => stats?.inventory.filter(i => i.isEquipped) || [], [stats?.inventory]);
  const bonusAtk = useMemo(() => equippedItems.reduce((s, i) => s + i.atkBonus, 0), [equippedItems]);
  const bonusDef = useMemo(() => equippedItems.reduce((s, i) => s + i.defBonus, 0), [equippedItems]);
  const bonusHp = useMemo(() => equippedItems.reduce((s, i) => s + i.hpBonus, 0), [equippedItems]);

  const totalAtk = (stats?.atk || 0) + bonusAtk;
  const totalDef = (stats?.def || 0) + bonusDef;
  const totalMaxHp = (stats?.maxHp || 300) + bonusHp;

  const isStunned = useMemo(() => activeDebuffs.some(d => d.type === 'STUN' && d.endTime > Date.now()), [activeDebuffs]);

  const buyVip = (type: keyof PlayerStats['vip'], cost: number) => {
    // TON Payment Simulation
    const confirmed = confirm(`${cost} TON karşılığında bu özelliği 1 haftalık almak istiyor musunuz?`);
    if (!confirmed) return;

    setStats(prev => {
      const newVip = { ...prev.vip };
      newVip[type] = { active: true, expiresAt: Date.now() + WEEK_IN_MS };
      return { ...prev, vip: newVip };
    });
    showToast("Ödeme başarılı! Özellik 1 hafta aktif.");
  };

  const finalizeCreation = () => {
    if (tempName.length < 3) { showToast("İsim en az 3 karakter olmalı!"); return; }
    const initialStats: PlayerStats = {
      charName: tempName, build: tempBuild, lvl: 1, xp: 0, gold: 0, hp: 300, maxHp: 300, mp: 200, maxMp: 200, atk: 25, def: 12,
      inventory: [], potions: { hp: 10, mp: 10 }, unlockedSkills: ['normal'], vip: INITIAL_VIP
    };
    setStats(initialStats);
    setActiveTab('GAME');
  };

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
        const xpPenalty = Math.floor(getXpRequired(prev.lvl) * 0.03);
        showToast(`Öldün! %3 XP (${xpPenalty}) kaybedildi.`);
        setActiveDungeon(null);
        return { ...prev, hp: totalMaxHp, mp: prev.maxMp, xp: Math.max(0, prev.xp - xpPenalty) };
      }
      return { ...prev, hp: newHp };
    });
  }, [currentMob, totalDef, totalMaxHp]);

  const useSkill = useCallback((skill: Skill) => {
    if (!currentMob || isStunned || skillCooldowns[skill.id]) return;
    if (!stats.unlockedSkills.includes(skill.id)) {
      if (stats.lvl < (skill.unlockLvl || 0)) { showToast(`Lv.${skill.unlockLvl} gerekli!`); return; }
      if (stats.gold < (skill.unlockCost || 0)) { showToast(`${skill.unlockCost} Gold gerekli!`); return; }
      setStats(prev => ({ ...prev, gold: prev.gold - (skill.unlockCost || 0), unlockedSkills: [...prev.unlockedSkills, skill.id] }));
      showToast(`${skill.name} açıldı!`); return;
    }
    if (stats.mp < skill.mpCost) { addDamagePop("MP!", "#0ea5e9"); return; }
    
    setStats(prev => ({ ...prev, mp: prev.mp - skill.mpCost }));
    setSkillCooldowns(prev => ({ ...prev, [skill.id]: Date.now() + skill.cooldown }));
    const dmg = Math.floor(totalAtk * skill.damageMultiplier * (Math.random() < 0.1 ? 2.0 : 1.0));
    addDamagePop(dmg, skill.color);
    
    setCurrentMob(prev => {
      if (!prev) return null;
      const newHp = prev.curHp - dmg;
      if (newHp <= 0) {
        // Boost calculations
        let xpRate = 1;
        if (stats.vip.premium.active) xpRate = 2.5;
        else if (stats.vip.expBoost.active) xpRate = 2;
        if (activeDungeon) xpRate *= 2;

        let dropRate = 1;
        if (stats.vip.premium.active) dropRate = 2.5;
        else if (stats.vip.dropBoost.active) dropRate = 2;

        const xpReward = (prev.lvl / 2) * xpRate;
        
        setStats(s => {
          let nx = s.xp + xpReward; let nl = s.lvl;
          while (nx >= getXpRequired(nl)) { nx -= getXpRequired(nl); nl++; }
          
          let inventory = [...s.inventory];
          if (activeDungeon && prev.isBoss) {
            if (Math.random() < (activeDungeon.template.specialDropRate * dropRate)) {
              inventory.push({
                id: Math.random().toString(36).substr(2, 9),
                name: "Mühürlü Ekipman", type: 'WEAPON', rarity: 'STAR', lvl: s.lvl,
                atkBonus: s.lvl * 10, defBonus: 0, hpBonus: 0, isEquipped: false
              });
              addDamagePop("DROP!", "#fcd34d");
            }
          }
          return { ...s, lvl: nl, xp: nx, gold: s.gold + prev.goldReward, inventory };
        });

        if (activeDungeon) {
          if (prev.isBoss) setActiveDungeon(null);
          else setActiveDungeon(d => d ? ({...d, currentWave: d.currentWave+1}) : null);
        }
        return null;
      }
      return { ...prev, curHp: newHp };
    });
    if (Math.random() < 0.3) mobAttack();
  }, [currentMob, isStunned, skillCooldowns, stats, totalAtk, mobAttack, activeDungeon]);

  if (activeTab === 'CREATE') {
    return (
      <div className="flex flex-col h-[100dvh] bg-[#020617] p-8 items-center justify-center text-center">
        <h1 className="text-3xl font-black text-amber-500 mb-2 italic">KARAKTER OLUŞTUR</h1>
        <p className="text-slate-500 text-xs mb-8">Efsanevi yolculuğuna başlamadan önce kendini tanıt.</p>
        
        <div className="w-full max-w-xs space-y-6">
          <div className="text-left">
            <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Karakter Adı</label>
            <input value={tempName} onChange={e => setTempName(e.target.value)} maxLength={12} placeholder="İsim giriniz..."
              className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl px-5 py-3 text-sm focus:border-amber-500 outline-none transition-all mt-1" />
          </div>

          <div className="text-left">
            <label className="text-[10px] font-black text-slate-400 ml-2 uppercase">Build Seçimi</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {['Blade', 'Bow', 'Glavie', 'Spear'].map(b => (
                <button key={b} onClick={() => setTempBuild(b)}
                  className={`py-3 rounded-xl text-[10px] font-black transition-all border-2 ${tempBuild === b ? 'bg-amber-600 border-amber-400 text-black shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                  {b.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <button onClick={finalizeCreation} className="w-full bg-gradient-to-r from-amber-600 to-amber-500 py-4 rounded-2xl text-black font-black text-xs uppercase shadow-2xl active:scale-95 transition-transform mt-4">
            Maceraya Başla
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-[#020617] text-slate-200">
      {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1000] bg-amber-600 text-black px-6 py-2 rounded-full text-xs font-black shadow-2xl animate-bounce">{toast}</div>}
      <StatusBar stats={{...stats, maxHp: totalMaxHp}} totalAtk={totalAtk} totalDef={totalDef} />
      
      <div className={`fixed inset-0 z-[9999] bg-[#020617] flex flex-col p-6 transition-transform duration-300 ${activeTab === 'GAME' ? 'translate-y-full' : 'translate-y-0'}`}>
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-2">
           <h2 className="text-xl font-black text-amber-500 italic uppercase">{activeTab}</h2>
           <button onClick={() => setActiveTab('GAME')} className="text-slate-400 text-3xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto pb-24 custom-scrollbar">
           {activeTab === 'VIP' && (
             <div className="space-y-6">
               <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 p-6 rounded-3xl border-2 border-indigo-500/30">
                  <h3 className="text-indigo-400 font-black text-lg italic">PREMIUM PACK</h3>
                  <p className="text-slate-400 text-[10px] mb-4">Oto HP/MP + 2.5x EXP + 2.5x DROP özellikleri 1 hafta boyunca seninle!</p>
                  <div className="flex justify-between items-center">
                    <span className="text-white font-black text-xl">3.00 TON</span>
                    <button onClick={() => buyVip('premium', 3)} className="bg-indigo-600 px-6 py-2 rounded-xl text-[10px] font-black text-white">SATIN AL</button>
                  </div>
                  {stats.vip.premium.active && <div className="mt-2 text-[8px] text-emerald-400 font-bold uppercase italic">Aktif: {Math.ceil((stats.vip.premium.expiresAt - Date.now())/3600000)} saat kaldı</div>}
               </div>

               <div className="grid grid-cols-1 gap-4">
                 <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <h4 className="text-amber-100 font-bold text-xs uppercase">Oto HP/MP Potion</h4>
                      <p className="text-[8px] text-slate-500">Canın %40 altına düştüğünde otomatik iksir basar.</p>
                    </div>
                    <button onClick={() => buyVip('autoPotion', 0.25)} className="bg-amber-600/20 text-amber-500 border border-amber-600 px-3 py-1.5 rounded-lg text-[9px] font-black">0.25 TON</button>
                 </div>
                 <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <h4 className="text-emerald-100 font-bold text-xs uppercase">2x EXP Rate</h4>
                      <p className="text-[8px] text-slate-500">Kazanılan tecrübe puanını 2 katına çıkarır.</p>
                    </div>
                    <button onClick={() => buyVip('expBoost', 1)} className="bg-emerald-600/20 text-emerald-500 border border-emerald-600 px-3 py-1.5 rounded-lg text-[9px] font-black">1.00 TON</button>
                 </div>
                 <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex justify-between items-center">
                    <div>
                      <h4 className="text-sky-100 font-bold text-xs uppercase">2x Drop Rate</h4>
                      <p className="text-[8px] text-slate-500">Eşya düşürme şansını 2 katına çıkarır.</p>
                    </div>
                    <button onClick={() => buyVip('dropBoost', 1)} className="bg-sky-600/20 text-sky-500 border border-sky-600 px-3 py-1.5 rounded-lg text-[9px] font-black">1.00 TON</button>
                 </div>
               </div>
               <p className="text-center text-[8px] text-slate-500 italic">* Tüm VIP özellikleri alındığı andan itibaren 7 gün (1 hafta) geçerlidir.</p>
             </div>
           )}
           {activeTab === 'NPC' && (
             <div className="space-y-4">
               {[POTION_CONFIG.HP_POTION, POTION_CONFIG.MP_POTION].map((pot, idx) => {
                 const type = idx === 0 ? 'hp' : 'mp';
                 return (
                  <div key={idx} className="bg-slate-900 p-5 rounded-2xl flex flex-col gap-4 border border-slate-800">
                     <div className="flex justify-between items-center">
                       <div className="flex flex-col">
                          <span className="text-white text-xs font-bold">{pot.name}</span>
                          <span className="text-slate-500 text-[9px]">Stok: {stats.potions[type]} | Birim: {pot.cost}G</span>
                       </div>
                       <div className="flex items-center gap-2 bg-black rounded-xl p-1 px-3 border border-slate-700">
                          <button onClick={() => setShopQuantities(p => ({...p, [type]: Math.max(1, p[type] - 1)}))} className="text-amber-500 font-black">-</button>
                          <span className="text-[10px] w-6 text-center">{shopQuantities[type]}</span>
                          <button onClick={() => setShopQuantities(p => ({...p, [type]: Math.min(999, p[type] + 1)}))} className="text-amber-500 font-black">+</button>
                       </div>
                     </div>
                     <button onClick={() => {
                        const cost = pot.cost * shopQuantities[type];
                        if (stats.gold < cost) { showToast("Yetersiz Gold!"); return; }
                        setStats(s => ({ ...s, gold: s.gold - cost, potions: { ...s.potions, [type]: s.potions[type] + shopQuantities[type] } }));
                        showToast(`${shopQuantities[type]} adet alındı!`);
                     }} className="w-full bg-amber-600 text-black text-[10px] font-black py-2.5 rounded-xl uppercase">
                        {pot.cost * shopQuantities[type]}G SATIN AL
                     </button>
                  </div>
                 );
               })}
             </div>
           )}
           {activeTab === 'BAG' && (
             <div className="space-y-3">
               {stats.inventory.map(item => (
                 <div key={item.id} className={`bg-slate-900 border-2 p-4 rounded-2xl ${item.isEquipped ? 'border-amber-500' : 'border-slate-800'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-black" style={{color: RARITY_COLORS[item.rarity]}}>{item.name} (Lv.{item.lvl})</span>
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
             </div>
           )}
           {activeTab === 'DNG' && (
             <div className="space-y-4">
               {SRO_DUNGEONS.map(dng => (
                  <div key={dng.id} className="bg-slate-900 border-2 border-slate-800 p-6 rounded-3xl">
                     <h3 className="text-amber-100 font-black text-sm mb-2">{dng.name} (Lv.{dng.minLvl})</h3>
                     <button onClick={() => {
                       if (stats.lvl >= dng.minLvl && stats.gold >= dng.entryFee) {
                         setStats(prev => ({ ...prev, gold: prev.gold - dng.entryFee }));
                         setActiveDungeon({ template: dng, currentWave: 1 });
                         setCurrentMob(null); setActiveTab('GAME');
                       }
                     }} className={`w-full bg-amber-600 text-black py-3 rounded-2xl font-black text-[10px] ${stats.lvl < dng.minLvl ? 'opacity-50 grayscale' : ''}`}>
                       {stats.lvl < dng.minLvl ? `DÜŞÜK LEVEL` : `GİRİŞ: ${dng.entryFee}G`}
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
              <img src={currentMob.img} className={`w-40 h-40 object-contain transition-all duration-75 active:scale-90 ${currentMob.isBoss ? 'scale-125 brightness-125' : ''}`} />
            </div>

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
                  className={`relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center transition-all shadow-lg ${!stats.unlockedSkills.includes(skill.id) ? 'bg-black/80 border-slate-800' : !!skillCooldowns[skill.id] ? 'opacity-40 bg-black border-slate-900 scale-95' : 'bg-slate-900 border-slate-700 active:scale-90 active:border-amber-500'}`}>
                  {skillCooldowns[skill.id] && <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center z-10"><span className="text-[10px] font-black text-white">{Math.ceil((skillCooldowns[skill.id] - Date.now())/1000)}s</span></div>}
                  {!stats.unlockedSkills.includes(skill.id) ? (
                    <div className="flex flex-col items-center opacity-60">
                      <span className="text-lg">🔒</span>
                      <span className="text-[6px] font-black text-amber-500">LV.{skill.unlockLvl}</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-2xl mb-1">{skill.icon}</span>
                      <span className="text-[6px] font-black text-slate-500 uppercase tracking-tighter">{skill.name.split(' ')[0]}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : <div className="text-amber-500 animate-pulse font-black text-xs uppercase tracking-widest">Bölge Keşfediliyor...</div>}
      </main>

      <footer className="h-24 bg-[#0f172a] border-t-2 border-slate-800 grid grid-cols-5 gap-2 p-3 pb-6 relative z-[50]">
        <button onClick={() => setActiveTab('NPC')} className={`rounded-2xl flex flex-col items-center justify-center transition-colors ${activeTab === 'NPC' ? 'bg-amber-600 text-black' : 'bg-slate-800/40 text-slate-500'}`}><span className="text-xl">🏪</span><span className="text-[8px] font-black">SHOP</span></button>
        <button onClick={() => setActiveTab('DNG')} className={`rounded-2xl flex flex-col items-center justify-center transition-colors ${activeTab === 'DNG' ? 'bg-amber-600 text-black' : 'bg-slate-800/40 text-slate-500'}`}><span className="text-xl">🏰</span><span className="text-[8px] font-black">DNG</span></button>
        <button onClick={() => setActiveTab('VIP')} className={`rounded-2xl flex flex-col items-center justify-center transition-all ${activeTab === 'VIP' ? 'bg-indigo-600 text-white' : 'bg-gradient-to-t from-amber-600/20 to-amber-400/20 border border-amber-500/30 text-amber-500'} active:scale-95`}><span className="text-xl">⭐</span><span className="text-[8px] font-black">VIP</span></button>
        <button onClick={() => setActiveTab('MARKET')} className={`rounded-2xl flex flex-col items-center justify-center transition-colors ${activeTab === 'MARKET' ? 'bg-indigo-600 text-white' : 'bg-slate-800/40 text-slate-500'}`}><span className="text-xl">⚖️</span><span className="text-[8px] font-black">PAZAR</span></button>
        <button onClick={() => setActiveTab('BAG')} className={`rounded-2xl flex flex-col items-center justify-center transition-colors ${activeTab === 'BAG' ? 'bg-amber-600 text-black' : 'bg-slate-800/40 text-slate-500'}`}><span className="text-xl">🎒</span><span className="text-[8px] font-black">BAG</span></button>
      </footer>
    </div>
  );
};

export default App;
