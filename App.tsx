import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StatusBar } from './components/StatusBar';
import { PlayerStats, ActiveMob, DamagePop, Skill, DungeonTemplate, PotionStats, Item, ItemSlot } from './types';
import { SRO_MOBS, SRO_SKILLS, SRO_DUNGEONS, getXpRequired, RARITY_COLORS, POTION_TIERS, getResalePrice } from './constants';
import { generateDrop } from './services/itemGenerator';

const STORAGE_KEY = 'sro_v13_slots_enhance_stats';
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

type ActiveTab = 'GAME' | 'BAG' | 'NPC' | 'DNG' | 'VIP' | 'STAT' | 'CREATE';

const INITIAL_VIP: PlayerStats['vip'] = {
  autoPotion: { active: false, expiresAt: 0 },
  expBoost: { active: false, expiresAt: 0 },
  dropBoost: { active: false, expiresAt: 0 },
  premium: { active: false, expiresAt: 0 }
};

const INITIAL_POTIONS: PotionStats = { hp_s: 10, hp_m: 0, hp_l: 0, mp_s: 10, mp_m: 0, mp_l: 0 };

const ARMOR_SLOTS: ItemSlot[] = ['HEAD','SHOULDERS','CHEST','HANDS','LEGS','FEET'];

// ✅ BAG sıralama: WEAPON -> SHIELD -> ARMOR(6) -> Takılar -> legacy ACCESSORY
const INVENTORY_SLOT_ORDER: ItemSlot[] = [
  'WEAPON',
  'SHIELD',
  'HEAD', 'SHOULDERS', 'CHEST', 'HANDS', 'LEGS', 'FEET',
  'NECKLACE', 'EARRING', 'RING1', 'RING2',
  'ACCESSORY', // legacy (eski itemler bozulmasın diye en sonda)
];

const slotOrderIndex = (slot: ItemSlot) => {
  const idx = INVENTORY_SLOT_ORDER.indexOf(slot);
  return idx === -1 ? 999 : idx;
};

const rarityRank = (r: any) => {
  // COMMON < STAR < MOON < SUN
  if (r === 'SUN') return 4;
  if (r === 'MOON') return 3;
  if (r === 'STAR') return 2;
  return 1;
};

const rollDamage = (base: number, spreadPct = 0.10) => {
  const min = 1 - spreadPct;
  const max = 1 + spreadPct;
  const r = min + Math.random() * (max - min);
  return Math.max(1, Math.floor(base * r));
};


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
  const [shopQuantities, setShopQuantities] = useState<Record<string, string>>({});

  // Enhance UI
  const [enhanceTargetId, setEnhanceTargetId] = useState<string>('');

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

  const equippedItems = useMemo(() => (stats?.inventory || []).filter(i => i.isEquipped), [stats]);

  // + scaling (MVP): her + için item bonusları %8 artıyor
  const scaledBonuses = useMemo(() => {
    let gearAtk = 0, gearDef = 0, gearHp = 0;
    for (const it of equippedItems) {
      const weaponCritChance = useMemo(() => {
  const w = equippedItems.find(i => i.slot === 'WEAPON');
  if (!w) return 0;

  let chance = 0.05 + Math.min(15, w.plus) * 0.01; // %5 + her + için %1

  if (w.rarity === 'STAR') chance += 0.02;
  if (w.rarity === 'MOON') chance += 0.04;
  if (w.rarity === 'SUN')  chance += 0.07;

  // üst limit (abartmasın)
  return Math.min(0.35, chance); // max %35


      const mult = 1 + Math.min(15, it.plus) * 0.08;
      gearAtk += Math.floor(it.atkBonus * mult);
      gearDef += Math.floor(it.defBonus * mult);
      gearHp  += Math.floor(it.hpBonus  * mult);
    }
    return { gearAtk, gearDef, gearHp };
  }, [equippedItems]);

  // ✅ Set bonus (6 armor slot doluysa)
  const setBonus = useMemo(() => {
    if (!stats) return { hp: 0, def: 0, label: 'Yok' };

    const armorEquipped = equippedItems.filter(i => ARMOR_SLOTS.includes(i.slot));
    const full = ARMOR_SLOTS.every(s => armorEquipped.some(i => i.slot === s));
    if (!full) return { hp: 0, def: 0, label: 'Yok' };

    // aynı degree mi?
    const degrees = ARMOR_SLOTS.map(s => armorEquipped.find(i => i.slot === s)!.degree);
    const sameDegree = degrees.every(d => d === degrees[0]);

    // aynı rarity mi?
    const rarities = ARMOR_SLOTS.map(s => armorEquipped.find(i => i.slot === s)!.rarity);
    const sameRarity = rarities.every(r => r === rarities[0]);

    // Bonuslar: full set -> +%5 def, +%8 hp
    // aynı degree -> ekstra +%7 def, +%10 hp
    // aynı rarity -> ekstra +%5 def, +%5 hp
    let defPct = 0.05, hpPct = 0.08;
    let label = 'Full Set';

    if (sameDegree) { defPct += 0.07; hpPct += 0.10; label = 'Full Set + Same Degree'; }
    if (sameRarity) { defPct += 0.05; hpPct += 0.05; label = label + ' + Same Rarity'; }

    const def = Math.floor((stats.def + scaledBonuses.gearDef) * defPct);
    const hp  = Math.floor((stats.maxHp + scaledBonuses.gearHp) * hpPct);
    return { hp, def, label };
  }, [stats, equippedItems, scaledBonuses]);

  const totalMaxHp = useMemo(() => {
    if (!stats) return 300;
    return stats.maxHp + scaledBonuses.gearHp + setBonus.hp;
  }, [stats, scaledBonuses, setBonus]);

  const totalAtk = useMemo(() => {
    if (!stats) return 25;
    return stats.atk + scaledBonuses.gearAtk;
  }, [stats, scaledBonuses]);

  const totalDef = useMemo(() => {
    if (!stats) return 12;
    return stats.def + scaledBonuses.gearDef + setBonus.def;
  }, [stats, scaledBonuses, setBonus]);

  // Equip/Unequip -> SLOT bazlı
  const handleEquip = (itemId: string) => {
    setStats(prev => {
      if (!prev) return null;
      const item = prev.inventory.find(i => i.id === itemId);
      if (!item) return prev;

      const newInventory = prev.inventory.map(i => {
        if (i.slot === item.slot && i.id !== itemId) return { ...i, isEquipped: false };
        if (i.id === itemId) return { ...i, isEquipped: !i.isEquipped };
        return i;
      });

      return { ...prev, inventory: newInventory };
    });
  };

  // ✅ Sell item
  const sellItem = (itemId: string) => {
    setStats(prev => {
      if (!prev) return null;
      const item = prev.inventory.find(i => i.id === itemId);
      if (!item) return prev;

      const price = getResalePrice(item);
      const inv = prev.inventory.filter(i => i.id !== itemId);
      return { ...prev, gold: prev.gold + price, inventory: inv };
    });
    showToast('Item satıldı!');
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
    if (stats && !currentMob && activeTab === 'GAME') spawnMob();
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

          if (updated.hp < (totalMaxHp * 0.5)) {
            if (updated.potions.hp_l > 0) { updated.hp = Math.min(totalMaxHp, updated.hp + POTION_TIERS.HP_L.heal); updated.potions.hp_l--; used = true; }
            else if (updated.potions.hp_m > 0) { updated.hp = Math.min(totalMaxHp, updated.hp + POTION_TIERS.HP_M.heal); updated.potions.hp_m--; used = true; }
            else if (updated.potions.hp_s > 0) { updated.hp = Math.min(totalMaxHp, updated.hp + POTION_TIERS.HP_S.heal); updated.potions.hp_s--; used = true; }
          }
          return used ? updated : prev;
        });
      }, 1500);
      return () => clearInterval(timer);
    }
  }, [stats?.vip, totalMaxHp]);

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
    setDamagePops(prev => [...prev, { id, value: 0, textValue: String(value), color, x: 30 + Math.random() * 40, y: 20 + Math.random() * 40 }]);
    setTimeout(() => setDamagePops(prev => prev.filter(p => p.id !== id)), 800);
  };

  const mobAttack = useCallback(() => {
    if (!currentMob) return;
    setIsHurt(true);
    setTimeout(() => setIsHurt(false), 200);
    const dmg = Math.max(5, Math.floor(currentMob.atk - totalDef / 4));
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

  const base = totalAtk * skill.damageMultiplier;

  const isCrit = Math.random() < weaponCritChance;
  const critMult = 1.8; // SRO hissi: 1.8 iyi
  const finalBase = isCrit ? base * critMult : base;

  const dmg = rollDamage(finalBase, 0.10);

  if (isCrit) {
    addDamagePop('CRIT!', '#facc15'); // sarı
  }
  addDamagePop(dmg, skill.color);


    setCurrentMob(prev => {
      if (!prev) return null;
      const nh = prev.curHp - dmg;
      if (nh <= 0) {
        const xpMult = stats.vip.premium.active ? 2.5 : stats.vip.expBoost.active ? 2 : 1;
        const xp = Math.floor(prev.xpReward * xpMult);

        const drop = generateDrop({
          mobLvl: prev.lvl,
          isBoss: !!prev.isBoss,
          dropBoost: stats.vip.dropBoost.active || stats.vip.premium.active
        });

        setStats(s => {
          if (!s) return null;
          let nx = s.xp + xp;
          let nl = s.lvl;

          let baseAtk = s.atk;
          let baseDef = s.def;
          let baseMaxHp = s.maxHp;
          let baseMaxMp = s.maxMp;

        while (nx >= getXpRequired(nl) && nl < 140) {
          nx -= getXpRequired(nl);
          nl++;

        // ✅ Level up stat artışları (MVP ayar)
        baseAtk += 2;
        baseDef += 1;
        baseMaxHp += 20;
        baseMaxMp += 10;
    }

const newInv = [...s.inventory];
if (drop) { newInv.push(drop); showToast(`${drop.name} düştü!`); }

return {
  ...s,
  xp: nx,
  lvl: nl,
  atk: baseAtk,
  def: baseDef,
  maxHp: baseMaxHp,
  maxMp: baseMaxMp,
  // can/mana taşmasın (istersen level-up'ta full da yapabiliriz)
  hp: Math.min(s.hp, baseMaxHp),
  mp: Math.min(s.mp, baseMaxMp),
  gold: s.gold + prev.goldReward,
  inventory: newInv
};

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
  }, [currentMob, stats, skillCooldowns, totalAtk, mobAttack, activeDungeon]);

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

  // ✅ Enhance logic
  const enhanceChance = (plus: number) => {
    if (plus <= 2) return 0.85;
    if (plus <= 5) return 0.65;
    if (plus <= 8) return 0.45;
    if (plus <= 11) return 0.28;
    return 0.18;
  };

  const enhanceCost = (item: Item) => {
    return Math.floor((item.degree * 4500 + item.lvl * 40) * (1 + item.plus * 0.55));
  };

  const doEnhance = () => {
    if (!stats) return;
    const item = stats.inventory.find(i => i.id === enhanceTargetId);
    if (!item) return showToast("Item seç!");
    if (item.plus >= 15) return showToast("Max +15!");

    const cost = enhanceCost(item);
    if (stats.gold < cost) return showToast("Yetersiz Gold!");

    const chance = enhanceChance(item.plus);
    const ok = Math.random() < chance;

    setStats(prev => {
      if (!prev) return null;
      const inv = prev.inventory.map(it => {
        if (it.id !== item.id) return it;

        if (ok) return { ...it, plus: it.plus + 1 };

        // fail: +5 üstünde düşür (MVP SRO hissi)
        const newPlus = it.plus >= 5 ? Math.max(0, it.plus - 1) : it.plus;
        return { ...it, plus: newPlus };
      });

      return { ...prev, gold: prev.gold - cost, inventory: inv };
    });

    showToast(ok ? `Bastı! +${item.plus + 1}` : `Fail! (${Math.round(chance * 100)}%)`);
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

  // ✅ Enhance dropdown'u da slot sırasına göre şık dursun (reverse değil)
  const invForEnhance = useMemo(() => {
    const copy = [...stats.inventory];
    copy.sort((a, b) => {
      const so = slotOrderIndex(a.slot) - slotOrderIndex(b.slot);
      if (so !== 0) return so;

      // Equipped önce
      if (a.isEquipped !== b.isEquipped) return a.isEquipped ? -1 : 1;

      // Degree desc
      if (a.degree !== b.degree) return b.degree - a.degree;

      // Rarity desc
      const rr = rarityRank(b.rarity) - rarityRank(a.rarity);
      if (rr !== 0) return rr;

      // Plus desc
      if (a.plus !== b.plus) return b.plus - a.plus;

      // Lvl desc
      if (a.lvl !== b.lvl) return b.lvl - a.lvl;

      return a.name.localeCompare(b.name);
    });
    return copy;
  }, [stats.inventory]);

  // ✅ BAG listesi: slot order + içeride güzel sıralama
  const invForBag = useMemo(() => {
    const copy = [...stats.inventory];
    copy.sort((a, b) => {
      const so = slotOrderIndex(a.slot) - slotOrderIndex(b.slot);
      if (so !== 0) return so;

      // Slot içinde: equipped önce
      if (a.isEquipped !== b.isEquipped) return a.isEquipped ? -1 : 1;

      // Degree desc
      if (a.degree !== b.degree) return b.degree - a.degree;

      // Rarity desc
      const rr = rarityRank(b.rarity) - rarityRank(a.rarity);
      if (rr !== 0) return rr;

      // Plus desc
      if (a.plus !== b.plus) return b.plus - a.plus;

      // Lvl desc
      if (a.lvl !== b.lvl) return b.lvl - a.lvl;

      return a.name.localeCompare(b.name);
    });
    return copy;
  }, [stats.inventory]);

  return (
    <div className="flex flex-col h-[100dvh] bg-[#020617] text-slate-200 overflow-hidden">
      {toast && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1000] bg-amber-600 text-black px-6 py-2 rounded-full text-[10px] font-black shadow-2xl">{toast}</div>}
      <StatusBar stats={{ ...stats, maxHp: totalMaxHp }} totalAtk={totalAtk} totalDef={totalDef} />

      {activeTab !== 'GAME' && (
        <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col p-6 pt-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-amber-500 uppercase">{activeTab}</h2>
            <button onClick={() => setActiveTab('GAME')} className="text-3xl text-slate-500">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto pb-24 custom-scrollbar">

            {/* ✅ STAT SCREEN */}
            {activeTab === 'STAT' && (
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
                  <div className="text-sm font-black text-white">Stat Breakdown</div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-[10px]">
                    <div className="bg-black/40 rounded-2xl p-3 border border-slate-800">
                      <div className="text-slate-400 font-bold">BASE</div>
                      <div className="mt-2 space-y-1">
                        <div>ATK: <b className="text-amber-400">{stats.atk}</b></div>
                        <div>DEF: <b className="text-sky-400">{stats.def}</b></div>
                        <div>HP: <b className="text-red-400">{stats.maxHp}</b></div>
                      </div>
                    </div>
                    <div className="bg-black/40 rounded-2xl p-3 border border-slate-800">
                      <div className="text-slate-400 font-bold">GEAR (+scaled)</div>
                      <div className="mt-2 space-y-1">
                        <div>ATK: <b className="text-amber-400">+{scaledBonuses.gearAtk}</b></div>
                        <div>DEF: <b className="text-sky-400">+{scaledBonuses.gearDef}</b></div>
                        <div>HP: <b className="text-red-400">+{scaledBonuses.gearHp}</b></div>
                      </div>
                    </div>
                    <div className="bg-black/40 rounded-2xl p-3 border border-slate-800 col-span-2">
                      <div className="text-slate-400 font-bold">SET BONUS</div>
                      <div className="mt-2 space-y-1">
                        <div>Durum: <b className="text-emerald-400">{setBonus.label}</b></div>
                        <div>DEF Bonus: <b className="text-sky-400">+{setBonus.def}</b></div>
                        <div>HP Bonus: <b className="text-red-400">+{setBonus.hp}</b></div>
                      </div>
                    </div>
                    <div className="bg-black/40 rounded-2xl p-3 border border-slate-800 col-span-2">
                      <div className="text-slate-400 font-bold">TOTAL</div>
                      <div className="mt-2 space-y-1">
                        <div>ATK: <b className="text-amber-400">{totalAtk}</b></div>
                        <div>DEF: <b className="text-sky-400">{totalDef}</b></div>
                        <div>MAX HP: <b className="text-red-400">{totalMaxHp}</b></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
                  <div className="text-sm font-black text-white mb-2">Equipped Items</div>
                  {equippedItems.length === 0 ? (
                    <div className="text-[10px] text-slate-500">Henüz equip yok.</div>
                  ) : (
                    <div className="space-y-2">
                      {equippedItems.map(it => (
                        <div key={it.id} className="bg-black/40 border border-slate-800 rounded-2xl p-3 text-[10px] flex justify-between">
                          <div>
                            <div className="font-black" style={{ color: RARITY_COLORS[it.rarity] }}>
                              {it.name} <span className="text-slate-500">({it.slot})</span>
                            </div>
                            <div className="text-slate-500">D{it.degree} • +{it.plus}</div>
                          </div>
                          <div className="text-right">
                            {it.atkBonus > 0 && <div className="text-amber-400">ATK +{it.atkBonus}</div>}
                            {it.defBonus > 0 && <div className="text-sky-400">DEF +{it.defBonus}</div>}
                            {it.hpBonus > 0 && <div className="text-red-400">HP +{it.hpBonus}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ✅ NPC: Potions + Enhance */}
            {activeTab === 'NPC' && (
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
                  <div className="text-white font-black">Potion Shop</div>
                  <div className="mt-3 grid grid-cols-1 gap-3">
                    {Object.entries(POTION_TIERS).map(([key, pot]) => {
                      const qtyStr = shopQuantities[key] ?? '1';
                      const qty = Math.max(1, parseInt(qtyStr || '1', 10));
                      const currentCost = pot.cost * qty;

                      return (
                        <div key={key} className="bg-black/30 p-4 rounded-2xl flex justify-between items-center border border-slate-800">
                          <div>
                            <div className="text-white text-xs font-bold">{pot.name}</div>
                            <div className="text-[9px] text-slate-500">+{pot.heal} | Adet: {stats.potions[key.toLowerCase() as keyof PotionStats]}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
  type="number"
  min={1}
  max={999}
  value={qtyStr}
  onFocus={(e) => e.currentTarget.select()} // ✅ tıklayınca komple seç
  onChange={(e) => {
    const v = e.target.value; // '' olabilir
    setShopQuantities(prev => ({ ...prev, [key]: v }));
  }}
  className="w-12 bg-black border border-slate-700 rounded p-1 text-center text-xs"
/>

                            <button onClick={() => {
                              if (stats.gold < currentCost) return showToast("Yetersiz Gold!");
                              setStats(s => ({
                                ...s!,
                                gold: s!.gold - currentCost,
                                potions: { ...s!.potions, [key.toLowerCase() as keyof PotionStats]: s!.potions[key.toLowerCase() as keyof PotionStats] + qty }
                              }));
                              showToast(`${qty} adet satın alındı!`);
                            }} className="bg-amber-600 text-black text-[9px] font-black px-3 py-2 rounded-lg">{currentCost.toLocaleString()}G</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
                  <div className="text-white font-black">Enhance (+ Basma)</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Her +, item bonuslarını <b>%8</b> güçlendirir. Fail olursa +5 üstünde -1 düşürür.
                  </div>

                  <div className="mt-3 space-y-2">
                    <select
                      value={enhanceTargetId}
                      onChange={(e) => setEnhanceTargetId(e.target.value)}
                      className="w-full bg-black border border-slate-700 rounded-xl p-3 text-xs"
                    >
                      <option value="">Item seç...</option>
                      {invForEnhance.map(it => (
                        <option key={it.id} value={it.id}>
                          {it.name} (D{it.degree} / +{it.plus} / {it.slot})
                        </option>
                      ))}
                    </select>

                    {(() => {
                      const it = stats.inventory.find(i => i.id === enhanceTargetId);
                      if (!it) return null;
                      const cost = enhanceCost(it);
                      const chance = enhanceChance(it.plus);
                      return (
                        <div className="bg-black/30 border border-slate-800 rounded-2xl p-4 text-[10px]">
                          <div className="flex justify-between">
                            <div><b style={{ color: RARITY_COLORS[it.rarity] }}>{it.name}</b></div>
                            <div className="text-slate-400">+{it.plus}</div>
                          </div>
                          <div className="mt-2 text-slate-400">
                            Şans: <b className="text-emerald-400">{Math.round(chance * 100)}%</b> •
                            Maliyet: <b className="text-amber-400">{cost.toLocaleString()}G</b>
                          </div>
                          <button
                            onClick={doEnhance}
                            className="mt-3 w-full bg-emerald-600 text-black py-3 rounded-2xl font-black text-xs"
                          >
                            BAS
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* ✅ BAG: sıralı inventory */}
            {activeTab === 'BAG' && (
              <div className="grid grid-cols-1 gap-3 pb-8">
                {stats.inventory.length === 0 ? (
                  <div className="text-center text-slate-500 mt-20 text-xs">Çantan henüz boş.</div>
                ) : (
                  invForBag.map(item => (
                    <div key={item.id} className={`bg-slate-900/50 border-2 rounded-2xl p-4 flex justify-between items-center transition-all ${item.isEquipped ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-slate-800'}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black uppercase tracking-tighter" style={{ color: RARITY_COLORS[item.rarity] }}>
                            {item.name}
                          </span>
                          <span className="bg-slate-800 text-[8px] px-1.5 py-0.5 rounded text-slate-400 font-bold">D{item.degree}</span>
                          <span className="bg-black/50 text-[8px] px-1.5 py-0.5 rounded text-slate-500 font-bold">{item.slot}</span>
                          <span className="bg-amber-600/20 border border-amber-500/30 text-[8px] px-1.5 py-0.5 rounded text-amber-300 font-black">+{item.plus}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {item.atkBonus > 0 && <div className="text-[9px] text-amber-500 font-bold">ATK +{item.atkBonus}</div>}
                          {item.defBonus > 0 && <div className="text-[9px] text-sky-500 font-bold">DEF +{item.defBonus}</div>}
                          {item.hpBonus > 0 && <div className="text-[9px] text-red-500 font-bold">HP +{item.hpBonus}</div>}
                        </div>

                        <div className="mt-2 text-[9px] text-slate-500">
                          Satış: <b className="text-amber-300">{getResalePrice(item).toLocaleString()}G</b>
                        </div>
                      </div>

                      <div className="ml-4 flex flex-col gap-2">
                        <button onClick={() => handleEquip(item.id)} className={`px-4 py-2 rounded-xl text-[9px] font-black transition-all ${item.isEquipped ? 'bg-red-600 text-white' : 'bg-amber-600 text-black shadow-lg'}`}>
                          {item.isEquipped ? 'ÇIKAR' : 'GİY'}
                        </button>
                        <button
                          onClick={() => sellItem(item.id)}
                          className="px-4 py-2 rounded-xl text-[9px] font-black bg-slate-800 text-slate-200 border border-slate-700"
                        >
                          SAT
                        </button>
                      </div>
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
                <div className="h-full bg-red-600 transition-all" style={{ width: `${(currentMob.curHp / currentMob.hp) * 100}%` }} />
              </div>
            </div>

            <div className="relative h-44 w-full flex items-center justify-center" onClick={() => useSkill(SRO_SKILLS[0])}>
              {damagePops.map(p => <div key={p.id} className="absolute dmg-float font-black text-3xl italic pointer-events-none z-50" style={{ left: p.x + '%', top: p.y + '%', color: p.color }}>{p.textValue}</div>)}
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

      {/* ✅ Footer 5 tab */}
      <footer className="h-20 bg-[#0f172a] border-t border-slate-800 grid grid-cols-5 gap-1 p-2 pb-4">
        <button onClick={() => setActiveTab('NPC')} className={`flex flex-col items-center justify-center ${activeTab === 'NPC' ? 'text-amber-500' : 'text-slate-500'}`}><span className="text-lg">🏪</span><span className="text-[7px] font-bold">SHOP</span></button>
        <button onClick={() => setActiveTab('DNG')} className={`flex flex-col items-center justify-center ${activeTab === 'DNG' ? 'text-amber-500' : 'text-slate-500'}`}><span className="text-lg">🏰</span><span className="text-[7px] font-bold">DNG</span></button>
        <button onClick={() => setActiveTab('VIP')} className={`flex flex-col items-center justify-center ${activeTab === 'VIP' ? 'text-amber-500' : 'text-slate-500'}`}><span className="text-lg">⭐</span><span className="text-[7px] font-bold">VIP</span></button>
        <button onClick={() => setActiveTab('BAG')} className={`flex flex-col items-center justify-center ${activeTab === 'BAG' ? 'text-amber-500' : 'text-slate-500'}`}><span className="text-lg">🎒</span><span className="text-[7px] font-bold">BAG</span></button>
        <button onClick={() => setActiveTab('STAT')} className={`flex flex-col items-center justify-center ${activeTab === 'STAT' ? 'text-amber-500' : 'text-slate-500'}`}><span className="text-lg">📊</span><span className="text-[7px] font-bold">STAT</span></button>
      </footer>
    </div>
  );
};

export default App;
