import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StatusBar } from './components/StatusBar';
import { PlayerStats, ActiveMob, DamagePop, Item, ItemRarity, ItemType, Skill, DungeonTemplate, PotionStats } from './types';
import { SRO_MOBS, SRO_SKILLS, SRO_DUNGEONS, getXpRequired, RARITY_COLORS, POTION_TIERS } from './constants';

const STORAGE_KEY = 'sro_v12_degree_system';
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

type ActiveTab = 'GAME' | 'BAG' | 'NPC' | 'DNG' | 'VIP' | 'CREATE';

const INITIAL_VIP: PlayerStats['vip'] = {
  autoPotion: { active: false, expiresAt: 0 },
  expBoost: { active: false, expiresAt: 0 },
  dropBoost: { active: false, expiresAt: 0 },
  premium: { active: false, expiresAt: 0 }
};

const INITIAL_POTIONS: PotionStats = { hp_s: 10, hp_m: 0, hp_l: 0, mp_s: 10, mp_m: 0, mp_l: 0 };

const App: React.FC = () => {
  const [stats, setStats] = useState<PlayerStats | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.charName) return parsed;
      } catch (e) { console.warn(e); }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>(stats?.charName ? 'GAME' : 'CREATE');
  const [currentMob, setCurrentMob] = useState<ActiveMob | null>(null);
  const [damagePops, setDamagePops] = useState<DamagePop[]>([]);
  const [isHurt, setIsHurt] = useState(false);
  const [activeDungeon, setActiveDungeon] = useState<{ template: DungeonTemplate, currentWave: number } | null>(null);
  const [skillCooldowns, setSkillCooldowns] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [shopQuantities, setShopQuantities] = useState<Record<string, number>>({});
  
  const [tempName, setTempName] = useState('');
  const [tempBuild, setTempBuild] = useState('Blade');

  const nextPopId = useRef(0);

  useEffect(() => { 
    if (stats) localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); 
  }, [stats]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const totalMaxHp = useMemo(() => {
    if (!stats) return 300;
    const bonus = stats.inventory.filter(i => i.isEquipped).reduce((s, i) => s + i.hpBonus, 0);
    return stats.maxHp + bonus;
  }, [stats]);

  const totalAtk = useMemo(() => {
    if (!stats) return 25;
    const bonus = stats.inventory.filter(i => i.isEquipped).reduce((s, i) => s + i.atkBonus, 0);
    return stats.atk + bonus;
  }, [stats]);

  const totalDef = useMemo(() => {
    if (!stats) return 12;
    const bonus = stats.inventory.filter(i => i.isEquipped).reduce((s, i) => s + i.defBonus, 0);
    return stats.def + bonus;
  }, [stats]);

  // --- ITEM DROP LOGIC ---
  const generateItem = useCallback((mobLvl: number, isBoss: boolean = false): Item | null => {
    // Drop Rates
    const baseRate = isBoss ? 0.8 : 0.12; // %12 Normal, %80 Boss
    if (Math.random() > baseRate) return null;

    const roll = Math.random();
    let rarity: ItemRarity = 'COMMON';
    let rarityMult = 1;

    if (roll < 0.002) { rarity = 'SUN'; rarityMult = 2.5; }
    else if (roll < 0.01) { rarity = 'MOON'; rarityMult = 1.8; }
    else if (roll < 0.05) { rarity = 'STAR'; rarityMult = 1.4; }

    const types: ItemType[] = ['WEAPON', 'SHIELD', 'ARMOR', 'HELMET', 'ACCESSORY'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    // Degree calculation: SRO style roughly every 8-9 levels
    const degree = Math.max(1, Math.min(15, Math.ceil(mobLvl / 9)));
    
    const baseStat = degree * 15;
    let atkBonus = 0, defBonus = 0, hpBonus = 0;

    if (type === 'WEAPON') atkBonus = Math.floor(baseStat * 1.5 * rarityMult);
    else if (type === 'SHIELD') defBonus = Math.floor(baseStat * 1.2 * rarityMult);
    else if (type === 'ARMOR' || type === 'HELMET') {
      defBonus = Math.floor(baseStat * 0.8 * rarityMult);
      hpBonus = Math.floor(baseStat * 5 * rarityMult);
    } else {
      hpBonus = Math.floor(baseStat * 12 * rarityMult);
    }

    const rarityPrefix = rarity !== 'COMMON' ? `[${rarity}] ` : '';
    const name = `${rarityPrefix}D${degree} ${type.charAt(0) + type.slice(1).toLowerCase()}`;

    return {
      id: Math.random().toString(36).substr(2, 9),
      name,
      type,
      degree,
      rarity,
      lvl: mobLvl,
      atkBonus,
      defBonus,
      hpBonus,
      isEquipped: false
    };
  }, []);

  const handleEquip = (itemId: string) => {
    setStats(prev => {
      if (!prev) return null;
      const item = prev.inventory.find(i => i.id === itemId);
      if (!item) return prev;

      const newInventory = prev.inventory.map(i => {
        // Aynı tipteki diğer eşyayı çıkar
        if (i.type === item.type && i.id !== itemId) {
          return { ...i, isEquipped: false };
        }
        // Seçilen eşyayı giy/çıkar
        if (i.id === itemId) {
          return { ...i, isEquipped: !i.isEquipped };
        }
        return i;
      });

      return { ...prev, inventory: newInventory };
    });
  };

  // Mob Spawning
  const spawnMob = useCallback(() => {
    if (!stats) return;
    let template;
    if (activeDungeon) {
      const isBoss = activeDungeon.currentWave === activeDungeon.template.waves;
      if (isBoss) {
        template = SRO_MOBS.find(m => m.id === activeDungeon.template.bossId);
      } else {
        const pool = SRO_MOBS.filter(m => activeDungeon.template.mobPool.includes(m.id));
        template = pool[Math.floor(Math.random() * pool.length)];
      }
      if (!template) template = SRO_MOBS[0];
      setCurrentMob({ ...template, curHp: template.hp, lastAbilityTime: {}, isBoss });
    } else {
      const validMobs = SRO_MOBS.filter(m => Math.abs(m.lvl - stats.lvl) <= 5);
      template = validMobs[Math.floor(Math.random() * validMobs.length)] || SRO_MOBS[0];
      setCurrentMob({ ...template, curHp: template.hp, lastAbilityTime: {} });
    }
  }, [stats?.lvl, activeDungeon]);

  useEffect(() => {
    if (stats && !currentMob && activeTab === 'GAME') {
      spawnMob();
    }
  }, [currentMob, spawnMob, activeTab, stats]);

  // Cooldown Cleanup
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setSkillCooldowns(prev => {
        const next = { ...prev };
        let changed = false;
        for (const id in next) {
          if (next[id] <= now) {
            delete next[id];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Auto Potion Logic
  useEffect(() => {
    if (!stats) return;
    const isAuto = stats.vip.autoPotion.active || stats.vip.premium.active;
    if (isAuto) {
      const timer = setInterval(() => {
        setStats(prev => {
          if (!prev) return null;
          let updated = { ...prev };
          let used = false;
          const maxHp = prev.maxHp + prev.inventory.filter(i => i.isEquipped).reduce((s, i) => s + i.hpBonus, 0);
          
          if (updated.hp < (maxHp * 0.5)) {
            if (updated.potions.hp_l > 0) { updated.hp = Math.min(maxHp, updated.hp + POTION_TIERS.HP_L.heal); updated.potions.hp_l--; used = true; }
            else if (updated.potions.hp_m > 0) { updated.hp = Math.min(maxHp, updated.hp + POTION_TIERS.HP_M.heal); updated.potions.hp_m--; used = true; }
            else if (updated.potions.hp_s > 0) { updated.hp = Math.min(maxHp, updated.hp + POTION_TIERS.HP_S.heal); updated.potions.hp_s--; used = true; }
          }
          return used ? updated : prev;
        });
      }, 1500);
      return () => clearInterval(timer);
    }
  }, [stats?.vip]);

  const usePotion = (id: keyof PotionStats) => {
    if (!stats || stats.potions[id] <= 0) return;
    const config = (POTION_TIERS as any)[id.toUpperCase()];
    setStats(prev => {
      if (!prev) return null;
      const isHp = id.startsWith('hp');
      const maxVal = isHp ? totalMaxHp : prev.maxMp;
      return {
        ...prev,
        [isHp ? 'hp' : 'mp']: Math.min(maxVal, prev[isHp ? 'hp' : 'mp'] + config.heal),
        potions: { ...prev.potions, [id]: prev.potions[id] - 1 }
      };
    });
    addDamagePop(`+${config.heal}`, id.startsWith('hp') ? '#22c55e' : '#0ea5e9');
  };

  const addDamagePop = (value: number | string, color: string) => {
    const id = nextPopId.current++;
    setDamagePops(prev => [...prev, { id, value: 0, textValue: String(value), color, x: 30+Math.random()*40, y: 20+Math.random()*40 }]);
    setTimeout(() => setDamagePops(prev => prev.filter(p => p.id !== id)), 800);
  };

  const mobAttack = useCallback(() => {
    if (!currentMob) return;
    setIsHurt(true);
    setTimeout(() => setIsHurt(false), 200);
    const dmg = Math.max(5, Math.floor(currentMob.atk - totalDef/4));
    addDamagePop(dmg, '#ef4444');
    setStats(prev => {
      if (!prev) return null;
      const newHp = prev.hp - dmg;
      if (newHp <= 0) {
        const penalty = Math.floor(getXpRequired(prev.lvl) * 0.03);
        showToast(`Öldün! -%3 XP`);
        setActiveDungeon(null);
        return { ...prev, hp: totalMaxHp, xp: Math.max(0, prev.xp - penalty) };
      }
      return { ...prev, hp: newHp };
    });
  }, [currentMob, totalDef, totalMaxHp]);

  const useSkill = useCallback((skill: Skill) => {
    if (!currentMob || !stats) return;
    if (skillCooldowns[skill.id]) return;
    
    if (!stats.unlockedSkills.includes(skill.id)) {
      if (stats.lvl < (skill.unlockLvl || 0)) { showToast(`Lv.${skill.unlockLvl} gerekli!`); return; }
      if (stats.gold < (skill.unlockCost || 0)) { showToast(`${skill.unlockCost} Gold gerekli!`); return; }
      setStats(prev => ({ ...prev!, gold: prev!.gold - skill.unlockCost!, unlockedSkills: [...prev!.unlockedSkills, skill.id] }));
      return;
    }

    if (stats.mp < skill.mpCost) { addDamagePop("MP!", "#0ea5e9"); return; }
    
    setStats(prev => ({ ...prev!, mp: prev!.mp - skill.mpCost }));
    setSkillCooldowns(prev => ({ ...prev, [skill.id]: Date.now() + skill.cooldown }));
    
    const dmg = Math.floor(totalAtk * skill.damageMultiplier);
    addDamagePop(dmg, skill.color);
    
    setCurrentMob(prev => {
      if (!prev) return null;
      const nh = prev.curHp - dmg;
      if (nh <= 0) {
        const xpMult = stats.vip.premium.active ? 2.5 : stats.vip.expBoost.active ? 2 : 1;
        const xp = Math.floor(prev.xpReward * xpMult);
        
        // --- DROP SYSTEM TRIGGER ---
        const drop = generateItem(prev.lvl, prev.isBoss);

        setStats(s => {
          if (!s) return null;
          let nx = s.xp + xp; 
          let nl = s.lvl;
          while (nx >= getXpRequired(nl) && nl < 140) { nx -= getXpRequired(nl); nl++; }
          
          const newInv = [...s.inventory];
          if (drop) {
            newInv.push(drop);
            showToast(`${drop.name} düştü!`);
          }

          return { ...s, xp: nx, lvl: nl, gold: s.gold + prev.goldReward, inventory: newInv };
        });

        if (activeDungeon) {
          if (activeDungeon.currentWave >= activeDungeon.template.waves) {
            showToast("DUNGEON TAMAMLANDI!");
            setActiveDungeon(null);
          } else {
            setActiveDungeon(d => d ? { ...d, currentWave: d.currentWave + 1 } : null);
          }
        }
        return null;
      }
      return { ...prev, curHp: nh };
    });
    
    if (Math.random() < 0.4) mobAttack();
  }, [currentMob, stats, skillCooldowns, totalAtk, mobAttack, activeDungeon, generateItem]);

  const startDungeon = (dng: DungeonTemplate) => {
    if (!stats) return;
    if (stats.lvl < dng.minLvl) return showToast(`Min. Lv.${dng.minLvl} gerekli!`);
    if (stats.gold < dng.entryFee) return showToast("Yetersiz Gold!");
    
    setStats(prev => ({ ...prev!, gold: prev!.gold - dng.entryFee }));
    setActiveDungeon({ template: dng, currentWave: 1 });
    setActiveTab('GAME');
    setCurrentMob(null); 
    showToast(`${dng.name} bölgesine girildi!`);
  };

  if (!stats || activeTab === 'CREATE') {
    return (
      <div className="flex flex-col h-[100dvh] bg-[#020617] items-center justify-center p-8 text-center">
        <h1 className="text-3xl font-black text-amber-500 mb-6 italic tracking-tighter">SRO: EFSANE YOLCULUK</h1>
        <div className="w-full max-w-xs space-y-4">
          <input value={tempName} onChange={e => setTempName(e.target.value)} placeholder="Karakter Adı" maxLength={12} className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl p-4 text-white outline-none focus:border-amber-500" />
          <div className="grid grid-cols-2 gap-2">
            {['Blade', 'Bow', 'Glavie', 'Spear'].map(b => (
              <button key={b} onClick={() => setTempBuild(b)} className={`p-3 rounded-xl font-black text-[10px] border-2 ${tempBuild === b ? 'bg-amber-600 border-amber-400 text-black' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>{b.toUpperCase()}</button>
            ))}
          </div>
          <button onClick={() => {
            if (tempName.length < 3) return showToast("İsim çok kısa!");
            setStats({ charName: tempName, build: tempBuild, lvl: 1, xp: 0, gold: 0, hp: 300, maxHp: 300, mp: 200, maxMp: 200, atk: 25, def: 12, inventory: [], potions: INITIAL_POTIONS, unlockedSkills: ['normal'], vip: INITIAL_VIP });
            setActiveTab('GAME');
          }} className="w-full bg-amber-600 py-4 rounded-2xl font-black text-black shadow-xl">BAŞLA</button>
        </div>
      </div>
    );
  }

  const buyVip = (type: keyof PlayerStats['vip'], cost: number) => {
    const confirmed = confirm(`${cost} TON karşılığında bu özelliği 1 haftalık almak istiyor musunuz?`);
    if (!confirmed) return;
    setStats(prev => {
      if (!prev) return null;
      const nextVip = { ...prev.vip };
      nextVip[type] = { active: true, expiresAt: Date.now() + WEEK_IN_MS };
      return { ...prev, vip: nextVip };
    });
    showToast("VIP Aktif!");
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#020617] text-slate-200 overflow-hidden">
      {toast && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1000] bg-amber-600 text-black px-6 py-2 rounded-full text-[10px] font-black shadow-2xl">{toast}</div>}
      <StatusBar stats={{...stats, maxHp: totalMaxHp}} totalAtk={totalAtk} totalDef={totalDef} />

      {activeTab !== 'GAME' && (
        <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col p-6 pt-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-amber-500 uppercase">{activeTab}</h2>
            <button onClick={() => setActiveTab('GAME')} className="text-3xl text-slate-500">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto pb-20 custom-scrollbar">
            {activeTab === 'NPC' && (
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(POTION_TIERS).map(([key, pot]) => {
                  const qty = shopQuantities[key] || 1;
                  const currentCost = pot.cost * qty;
                  return (
                    <div key={key} className="bg-slate-900 p-4 rounded-2xl flex justify-between items-center border border-slate-800">
                      <div>
                        <div className="text-white text-xs font-bold">{pot.name}</div>
                        <div className="text-[9px] text-slate-500">+{pot.heal} Can/Mana | Adet: {stats.potions[key.toLowerCase() as keyof PotionStats]}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input type="number" min="1" max="999" value={qty} onChange={e => setShopQuantities({...shopQuantities, [key]: parseInt(e.target.value) || 1})} className="w-12 bg-black border border-slate-700 rounded p-1 text-center text-xs" />
                        <button onClick={() => {
                          if (stats.gold < currentCost) return showToast("Yetersiz Gold!");
                          setStats(s => ({ ...s!, gold: s!.gold - currentCost, potions: { ...s!.potions, [key.toLowerCase() as keyof PotionStats]: s!.potions[key.toLowerCase() as keyof PotionStats] + qty } }));
                          showToast(`${qty} adet satın alındı!`);
                        }} className="bg-amber-600 text-black text-[9px] font-black px-3 py-2 rounded-lg">{currentCost.toLocaleString()}G</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {activeTab === 'BAG' && (
              <div className="grid grid-cols-1 gap-3 pb-8">
                {stats.inventory.length === 0 ? (
                  <div className="text-center text-slate-500 mt-20 text-xs">Çantan henüz boş. Canavar avlayarak eşya topla!</div>
                ) : (
                  stats.inventory.slice().reverse().map(item => (
                    <div key={item.id} className={`bg-slate-900/50 border-2 rounded-2xl p-4 flex justify-between items-center transition-all ${item.isEquipped ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-slate-800'}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-tighter" style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</span>
                          <span className="bg-slate-800 text-[8px] px-1.5 py-0.5 rounded text-slate-400 font-bold">D{item.degree}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {item.atkBonus > 0 && <div className="text-[9px] text-amber-500 font-bold">ATK +{item.atkBonus}</div>}
                          {item.defBonus > 0 && <div className="text-[9px] text-sky-500 font-bold">DEF +{item.defBonus}</div>}
                          {item.hpBonus > 0 && <div className="text-[9px] text-red-500 font-bold">HP +{item.hpBonus}</div>}
                        </div>
                      </div>
                      <button onClick={() => handleEquip(item.id)} className={`ml-4 px-4 py-2 rounded-xl text-[9px] font-black transition-all ${item.isEquipped ? 'bg-red-600 text-white' : 'bg-amber-600 text-black shadow-lg'}`}>
                        {item.isEquipped ? 'ÇIKAR' : 'GİY'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
            {activeTab === 'DNG' && (
              <div className="grid grid-cols-1 gap-4">
                {SRO_DUNGEONS.map(dng => (
                  <div key={dng.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-white font-black text-lg">{dng.name}</h3>
                      <p className="text-[10px] text-slate-400 mb-4">{dng.description}</p>
                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <div className="text-[8px] font-bold text-amber-500">Lv.{dng.minLvl}+</div>
                          <div className="text-[8px] font-bold text-slate-500">{dng.waves} Dalga</div>
                        </div>
                        <button onClick={() => startDungeon(dng)} className="bg-amber-600 text-black px-6 py-2 rounded-xl font-black text-xs shadow-lg active:scale-95 transition-transform">
                          GİR ({dng.entryFee.toLocaleString()}G)
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'VIP' && (
              <div className="space-y-4">
                <div className="bg-indigo-900/40 p-6 rounded-3xl border-2 border-indigo-500/30 text-center">
                  <h3 className="text-white font-black italic">PREMIUM (3 TON)</h3>
                  <p className="text-[10px] text-slate-400 my-2">Oto Pot, 2.5x EXP & Drop. 1 Hafta geçerli.</p>
                  <button onClick={() => buyVip('premium', 3)} className="bg-indigo-600 w-full py-3 rounded-xl font-black text-xs">SATIN AL</button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div><div className="text-xs font-bold">Oto HP/MP</div><div className="text-[8px] text-slate-500">0.25 TON</div></div>
                    <button onClick={() => buyVip('autoPotion', 0.25)} className="bg-amber-600 text-black px-3 py-1 rounded font-black text-[10px]">AL</button>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div><div className="text-xs font-bold">2x EXP Rate</div><div className="text-[8px] text-slate-500">1 TON</div></div>
                    <button onClick={() => buyVip('expBoost', 1)} className="bg-amber-600 text-black px-3 py-1 rounded font-black text-[10px]">AL</button>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                    <div><div className="text-xs font-bold">2x Drop Rate</div><div className="text-[8px] text-slate-500">1 TON</div></div>
                    <button onClick={() => buyVip('dropBoost', 1)} className="bg-amber-600 text-black px-3 py-1 rounded font-black text-[10px]">AL</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <main className={`flex-1 flex flex-col items-center justify-center p-6 relative ${isHurt ? 'hit-shake bg-red-950/10' : ''}`}>
        {activeDungeon && (
          <div className="absolute top-4 left-4 bg-black/60 border border-amber-900/40 px-3 py-1 rounded-full text-[8px] font-black text-amber-500 uppercase tracking-widest z-40">
            {activeDungeon.template.name} - DALGA {activeDungeon.currentWave}/{activeDungeon.template.waves}
          </div>
        )}
        
        {currentMob ? (
          <div className="flex flex-col items-center gap-4 w-full max-w-xs">
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl w-full text-center relative overflow-hidden">
               {currentMob.isBoss && <div className="absolute top-0 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_10px_red]"></div>}
              <div className="text-[9px] font-black text-amber-200 uppercase">{currentMob.name} (Lv{currentMob.lvl})</div>
              <div className="h-1.5 w-full bg-black rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-red-600 transition-all" style={{ width: `${(currentMob.curHp/currentMob.hp)*100}%` }} />
              </div>
            </div>

            <div className="relative h-44 w-full flex items-center justify-center" onClick={() => useSkill(SRO_SKILLS[0])}>
              {damagePops.map(p => <div key={p.id} className="absolute dmg-float font-black text-3xl italic pointer-events-none z-50" style={{left: p.x+'%', top: p.y+'%', color: p.color}}>{p.textValue}</div>)}
              <img src={currentMob.img} className={`w-32 h-32 object-contain active:scale-95 transition-transform ${currentMob.isBoss ? 'scale-150 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]' : ''}`} />
            </div>

            <div className="flex gap-2 w-full justify-center">
              {['hp_s', 'hp_m', 'hp_l'].map(id => stats.potions[id as keyof PotionStats] > 0 && (
                <button key={id} onClick={() => usePotion(id as any)} className="bg-red-900/30 border border-red-500/50 p-2 rounded-xl flex items-center gap-1">
                  <span className="text-xs">🧪</span><span className="text-[9px] font-bold text-red-200">{stats.potions[id as keyof PotionStats]}</span>
                </button>
              ))}
              {['mp_s', 'mp_m', 'mp_l'].map(id => stats.potions[id as keyof PotionStats] > 0 && (
                <button key={id} onClick={() => usePotion(id as any)} className="bg-sky-900/30 border border-sky-500/50 p-2 rounded-xl flex items-center gap-1">
                  <span className="text-xs">💧</span><span className="text-[9px] font-bold text-sky-200">{stats.potions[id as keyof PotionStats]}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2 w-full">
              {SRO_SKILLS.map(s => {
                const unlocked = stats.unlockedSkills.includes(s.id);
                const cd = !!skillCooldowns[s.id];
                return (
                  <button key={s.id} onClick={() => useSkill(s)} className={`relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all ${!unlocked ? 'bg-black/50 border-slate-800 opacity-60' : cd ? 'bg-slate-800 border-slate-900' : 'bg-slate-900 border-slate-700 active:scale-90 shadow-xl'}`}>
                    {unlocked ? <span className="text-xl">{s.icon}</span> : <span className="text-[8px] font-black text-amber-600">Lv.{s.unlockLvl}</span>}
                    {cd && s.id !== 'normal' && <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[9px] font-black rounded-xl">CD</div>}
                  </button>
                );
              })}
            </div>
          </div>
        ) : <div className="text-amber-500 font-black animate-pulse uppercase tracking-widest text-[10px]">Bölge Keşfediliyor...</div>}
      </main>

      <footer className="h-20 bg-[#0f172a] border-t border-slate-800 grid grid-cols-4 gap-1 p-2 pb-4">
        <button onClick={() => setActiveTab('NPC')} className={`flex flex-col items-center justify-center ${activeTab === 'NPC' ? 'text-amber-500' : 'text-slate-500'}`}><span className="text-lg">🏪</span><span className="text-[7px] font-bold">SHOP</span></button>
        <button onClick={() => setActiveTab('DNG')} className={`flex flex-col items-center justify-center ${activeTab === 'DNG' ? 'text-amber-500' : 'text-slate-500'}`}><span className="text-lg">🏰</span><span className="text-[7px] font-bold">DNG</span></button>
        <button onClick={() => setActiveTab('VIP')} className={`flex flex-col items-center justify-center ${activeTab === 'VIP' ? 'text-amber-500' : 'text-slate-500'}`}><span className="text-lg">⭐</span><span className="text-[7px] font-bold">VIP</span></button>
        <button onClick={() => setActiveTab('BAG')} className={`flex flex-col items-center justify-center ${activeTab === 'BAG' ? 'text-amber-500' : 'text-slate-500'}`}><span className="text-lg">🎒</span><span className="text-[7px] font-bold">BAG</span></button>
      </footer>
    </div>
  );
};

export default App;
