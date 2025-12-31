// src/constants.ts
import type { Item, ItemRarity, Skill, MobTemplate, DungeonTemplate } from './types';

/** ---------------------------
 *  COLORS / UI
 *  --------------------------- */
export const RARITY_COLORS: Record<ItemRarity, string> = {
  COMMON: '#94a3b8',
  STAR: '#a855f7',
  MOON: '#06b6d4',
  SUN: '#f97316',
};

/** ---------------------------
 *  RESELL
 *  --------------------------- */
export const ITEM_RESALE_MULTIPLIERS: Record<ItemRarity, number> = {
  COMMON: 0.10,
  STAR: 0.30,
  MOON: 0.80,
  SUN: 2.00,
};

export const getResalePrice = (item: Item): number => {
  // base: degree + lvl + stat
  const statSum = item.atkBonus + item.defBonus + item.hpBonus;
  const base = Math.floor((item.degree * 2500) + (item.lvl * 35) + (statSum * 0.25));

  // plus fiyat etkisi: her + için artan katsayı
  const plusMult = 1 + Math.min(15, item.plus) * 0.18;

  // rarity katsayısı
  const rarityMult = ITEM_RESALE_MULTIPLIERS[item.rarity] ?? 0.1;

  return Math.max(1, Math.floor(base * plusMult * rarityMult));
};

/** ---------------------------
 *  POTIONS
 *  --------------------------- */
export const POTION_TIERS = {
  HP_S: { id: 'hp_s', name: 'HP Potion (S)', heal: 150, cost: 150 },
  HP_M: { id: 'hp_m', name: 'HP Potion (M)', heal: 800, cost: 850 },
  HP_L: { id: 'hp_l', name: 'HP Potion (L)', heal: 3500, cost: 4200 },
  MP_S: { id: 'mp_s', name: 'MP Potion (S)', heal: 100, cost: 150 },
  MP_M: { id: 'mp_m', name: 'MP Potion (M)', heal: 600, cost: 850 },
  MP_L: { id: 'mp_l', name: 'MP Potion (L)', heal: 2800, cost: 4200 },
};

/** ---------------------------
 *  XP CURVE
 *  --------------------------- */
export const getXpRequired = (lvl: number): number => {
  // SRO hissi: ilk leveller hızlı, sonra kademeli zor
  if (lvl <= 1) return 10;
  if (lvl < 10) return Math.floor(10 * Math.pow(2, lvl - 1));
  if (lvl < 30) return Math.floor(900 + 260 * Math.pow(1.18, lvl - 10));
  if (lvl < 70) return Math.floor(6000 + 900 * Math.pow(1.14, lvl - 30));
  if (lvl < 100) return Math.floor(45000 + 3800 * Math.pow(1.11, lvl - 70));
  return Math.floor(180000 + 9500 * Math.pow(1.085, lvl - 100));
};

/** ---------------------------
 *  SKILLS
 *  --------------------------- */
export const SRO_SKILLS: Skill[] = [
  { id: 'normal',      name: 'Normal Vuruş', mpCost: 0,   damageMultiplier: 1.0, cooldown: 500,   icon: '⚔️', color: '#f8fafc', unlockLvl: 0,  unlockCost: 0 },
  { id: 'triple_swing',name: 'Üçlü Kesik',   mpCost: 15,  damageMultiplier: 2.2, cooldown: 4000,  icon: '🌪️', color: '#fcd34d', unlockLvl: 5,  unlockCost: 10000 },
  { id: 'soul_spear',  name: 'Ruh Mızrağı',  mpCost: 45,  damageMultiplier: 4.5, cooldown: 12000, icon: '✨', color: '#38bdf8', unlockLvl: 15, unlockCost: 50000 },
  { id: 'dragon_roar', name: 'Ejderha Nidası', mpCost: 120, damageMultiplier: 12.0, cooldown: 45000, icon: '🔥', color: '#ef4444', unlockLvl: 30, unlockCost: 200000 },
];

/** ---------------------------
 *  MOBS (EU + CH 1–140)
 *  - Oyun hissi için geniş havuz
 *  - HP/ATK/XP/Gold ölçekli (lvl arttıkça hızlı artar)
 *  --------------------------- */

// görsel linkleri (hafif)
const IMG_BEAST   = 'https://i.ibb.co/mS9X3J1/tiger.png';
const IMG_GHOST   = 'https://i.ibb.co/LhB2PzF/waterghost.png';
const IMG_BANDIT  = 'https://i.ibb.co/0XW5g9s/niya.png';
const IMG_EYE     = 'https://i.ibb.co/YV7Nf2S/smalleye.png';
const IMG_MANG    = 'https://i.ibb.co/8mR0oXz/mangyang.png';

type MobKind = 'NORMAL' | 'ELITE' | 'GIANT' | 'UNIQUE';

const mobScale = (lvl: number, kind: MobKind) => {
  // taban ölçek
  const hpBase  = Math.floor(60 + (lvl * lvl * 2.25) + lvl * 45);
  const atkBase = Math.floor(8 + (lvl * 6.4) + Math.pow(lvl, 1.18) * 1.2);

  const kindMult =
    kind === 'ELITE' ? { hp: 1.25, atk: 1.15, xp: 1.25, gold: 1.2 } :
    kind === 'GIANT' ? { hp: 1.80, atk: 1.35, xp: 1.9,  gold: 1.6 } :
    kind === 'UNIQUE'? { hp: 8.50, atk: 3.20, xp: 25,   gold: 20 } :
                       { hp: 1.00, atk: 1.00, xp: 1.00, gold: 1.00 };

  const hp = Math.floor(hpBase * kindMult.hp);
  const atk = Math.floor(atkBase * kindMult.atk);

  const xpReward = Math.max(1, Math.floor((lvl * 1.85 + Math.pow(lvl, 1.25) * 1.1) * kindMult.xp));
  const goldReward = Math.max(1, Math.floor((lvl * 12 + Math.pow(lvl, 1.18) * 7.5) * kindMult.gold));

  return { hp, atk, xpReward, goldReward };
};

const m = (id: string, name: string, lvl: number, img: string, kind: MobKind = 'NORMAL'): MobTemplate => {
  const s = mobScale(lvl, kind);
  return { id, name, lvl, hp: s.hp, atk: s.atk, img, xpReward: s.xpReward, goldReward: s.goldReward };
};

export const SRO_MOBS: MobTemplate[] = [
  /** ---------------------------
   *  CHINA 1–40 (Jangan / Donwhang)
   *  --------------------------- */
  m('mangyang', 'Mangyang', 1, IMG_MANG),
  m('mangyang_giant', 'Mangyang Giant', 2, IMG_MANG, 'GIANT'),
  m('smalleye', 'Small Eye', 3, IMG_EYE),
  m('smalleye_elite', 'Small Eye Elite', 4, IMG_EYE, 'ELITE'),
  m('oldweasel', 'Old Weasel', 5, IMG_BEAST),
  m('tigerwolf', 'Tigerwolf', 6, IMG_BEAST),
  m('bandit_low', 'Bandit (Low)', 7, IMG_BANDIT),
  m('waterghost', 'Water Ghost', 8, IMG_GHOST),
  m('waterghost_giant', 'Water Ghost Giant', 9, IMG_GHOST, 'GIANT'),
  m('hungrywolf', 'Hungry Wolf', 10, IMG_BEAST),
  m('bandit', 'Bandit', 12, IMG_BANDIT),
  m('bandit_leader', 'Bandit Leader', 14, IMG_BANDIT, 'ELITE'),
  m('tomb_snake', 'Tomb Snake', 16, IMG_GHOST),
  m('whitetiger', 'White Tiger', 18, IMG_BEAST, 'ELITE'),
  m('hun_raid', 'Hun Raider', 20, IMG_BANDIT),
  m('hun_raid_giant', 'Hun Raider Giant', 21, IMG_BANDIT, 'GIANT'),
  m('chakji', 'Chakji', 22, IMG_EYE),
  m('chakji_elite', 'Chakji Elite', 23, IMG_EYE, 'ELITE'),
  m('earthghost', 'Earth Ghost', 26, IMG_MANG),
  m('earthghost_giant', 'Earth Ghost Giant', 27, IMG_MANG, 'GIANT'),
  m('desert_thief', 'Desert Thief', 30, IMG_BANDIT),
  m('desert_thief_elite', 'Desert Thief Elite', 31, IMG_BANDIT, 'ELITE'),

  // Uniques (CH)
  m('uruchi_unique', 'Uruchi (Unique)', 40, IMG_BEAST, 'UNIQUE'),

  /** ---------------------------
   *  EU 1–40 (Jupiter / Jangan EU hissi)
   *  --------------------------- */
  m('eu_fox', 'Red Fox', 1, IMG_BEAST),
  m('eu_beetle', 'Forest Beetle', 4, IMG_MANG),
  m('eu_wildboar', 'Wild Boar', 8, IMG_BEAST),
  m('eu_ghoul', 'Ghoul', 12, IMG_GHOST),
  m('eu_thief', 'Thief Scout', 15, IMG_BANDIT),
  m('eu_thief_elite', 'Thief Rogue', 17, IMG_BANDIT, 'ELITE'),
  m('eu_skeleton', 'Skeleton', 20, IMG_GHOST),
  m('eu_skeleton_giant', 'Skeleton Giant', 22, IMG_GHOST, 'GIANT'),
  m('eu_bandit', 'Bandit (EU)', 26, IMG_BANDIT),
  m('eu_bandit_giant', 'Bandit Giant (EU)', 28, IMG_BANDIT, 'GIANT'),
  m('eu_blackmage', 'Black Mage', 33, IMG_GHOST, 'ELITE'),
  m('eu_knight', 'Fallen Knight', 38, IMG_BEAST, 'ELITE'),

  /** ---------------------------
   *  CHINA 40–80 (Hotan / Taklamakan / Karakoram)
   *  --------------------------- */
  m('maong', 'Maong', 45, IMG_BANDIT),
  m('maong_giant', 'Maong Giant', 46, IMG_BANDIT, 'GIANT'),
  m('penon', 'Penon Fighter', 52, IMG_GHOST),
  m('penon_elite', 'Penon Elite', 54, IMG_GHOST, 'ELITE'),
  m('isyutaru_unique', 'Isyutaru (Unique)', 60, IMG_GHOST, 'UNIQUE'),
  m('niya_guard', 'Niya Guard', 72, IMG_BANDIT),
  m('niya_guard_elite', 'Niya Guard Elite', 74, IMG_BANDIT, 'ELITE'),
  m('takla_scorp', 'Taklamakan Scorpion', 76, IMG_MANG),
  m('takla_scorp_giant', 'Taklamakan Scorpion Giant', 77, IMG_MANG, 'GIANT'),
  m('lordyarkan_unique', 'Lord Yarkan (Unique)', 80, IMG_BANDIT, 'UNIQUE'),

  /** ---------------------------
   *  EU 40–80 (Constantinople / Samarkand hattı)
   *  --------------------------- */
  m('eu_roman_soldier', 'Roman Soldier', 40, IMG_BANDIT),
  m('eu_roman_archer', 'Roman Archer', 43, IMG_BANDIT),
  m('eu_roman_elite', 'Roman Elite', 46, IMG_BANDIT, 'ELITE'),
  m('eu_minotaur', 'Minotaur', 50, IMG_BEAST),
  m('eu_minotaur_giant', 'Minotaur Giant', 52, IMG_BEAST, 'GIANT'),
  m('eu_harpie', 'Harpy', 55, IMG_GHOST),
  m('eu_harpie_elite', 'Harpy Elite', 57, IMG_GHOST, 'ELITE'),
  m('eu_cyclops', 'Cyclops', 62, IMG_BEAST),
  m('eu_cyclops_giant', 'Cyclops Giant', 64, IMG_BEAST, 'GIANT'),
  m('eu_ice_witch', 'Ice Witch', 70, IMG_GHOST, 'ELITE'),
  m('eu_ice_witch_giant', 'Ice Witch Giant', 72, IMG_GHOST, 'GIANT'),
  m('eu_titan', 'Titan', 78, IMG_BEAST, 'ELITE'),

  /** ---------------------------
   *  80–100 (Roc Mountain / Qin Tomb hissi)
   *  --------------------------- */
  m('wingtribe', 'Wing Tribe', 88, IMG_MANG),
  m('wingtribe_elite', 'Wing Tribe Elite', 90, IMG_MANG, 'ELITE'),
  m('qt_guard', 'Qin Tomb Guard', 92, IMG_BANDIT),
  m('qt_guard_giant', 'Qin Tomb Guard Giant', 94, IMG_BANDIT, 'GIANT'),
  m('demonshaitan_unique', 'Demon Shaitan (Unique)', 100, IMG_BEAST, 'UNIQUE'),

  /** ---------------------------
   *  100–120 (Alexandria / Egypt)
   *  --------------------------- */
  m('sandhyena', 'Sand Hyena', 105, IMG_BEAST),
  m('sandhyena_elite', 'Sand Hyena Elite', 107, IMG_BEAST, 'ELITE'),
  m('anubis_guard', 'Anubis Guard', 110, IMG_BANDIT),
  m('anubis_guard_giant', 'Anubis Guard Giant', 112, IMG_BANDIT, 'GIANT'),
  m('medusa_unique', 'Medusa (Unique)', 115, IMG_GHOST, 'UNIQUE'),
  m('pharaoh_mummy', 'Pharaoh Mummy', 118, IMG_GHOST, 'ELITE'),
  m('pharaoh_mummy_giant', 'Pharaoh Mummy Giant', 120, IMG_GHOST, 'GIANT'),

  /** ---------------------------
   *  120–140 (Baghdad / Mirror Dimension hissi)
   *  --------------------------- */
  m('mirror_warrior', 'Mirror Warrior', 122, IMG_BANDIT),
  m('mirror_warrior_elite', 'Mirror Warrior Elite', 124, IMG_BANDIT, 'ELITE'),
  m('baghdad_soldier', 'Baghdad Soldier', 130, IMG_BANDIT),
  m('baghdad_soldier_elite', 'Baghdad Soldier Elite', 132, IMG_BANDIT, 'ELITE'),
  m('baghdad_assassin', 'Baghdad Assassin', 135, IMG_BEAST, 'ELITE'),
  m('baghdad_assassin_giant', 'Baghdad Assassin Giant', 137, IMG_BEAST, 'GIANT'),
  m('karkadann_unique', 'Karkadann (Unique)', 140, IMG_BEAST, 'UNIQUE'),
];

/** ---------------------------
 *  DUNGEONS
 *  --------------------------- */
export const SRO_DUNGEONS: DungeonTemplate[] = [
  {
    id: 'bandit_fort',
    name: 'Bandit Stronghold',
    minLvl: 10,
    waves: 10,
    mobPool: ['bandit', 'bandit_leader', 'tigerwolf', 'hun_raid'],
    bossId: 'whitetiger',
    entryFee: 5000,
    specialDropRate: 0.10,
    description: 'Eşkıya liderlerini temizle.',
  },
  {
    id: 'jangan_cave',
    name: "Jangan Cave (B1)",
    minLvl: 25,
    waves: 15,
    mobPool: ['chakji', 'earthghost', 'desert_thief', 'eu_bandit'],
    bossId: 'uruchi_unique',
    entryFee: 25000,
    specialDropRate: 0.15,
    description: 'Yeraltı mezarlığı.',
  },
  {
    id: 'karakoram',
    name: 'Karakoram',
    minLvl: 45,
    waves: 20,
    mobPool: ['maong', 'penon', 'eu_minotaur', 'eu_harpie'],
    bossId: 'isyutaru_unique',
    entryFee: 75000,
    specialDropRate: 0.20,
    description: 'Buzullar diyarı.',
  },
  {
    id: 'taklamakan',
    name: 'Taklamakan',
    minLvl: 65,
    waves: 25,
    mobPool: ['niya_guard', 'takla_scorp', 'eu_cyclops'],
    bossId: 'lordyarkan_unique',
    entryFee: 250000,
    specialDropRate: 0.25,
    description: 'Sonsuz çöl sıcağı.',
  },
  {
    id: 'roc_mt',
    name: 'Roc Mountain',
    minLvl: 85,
    waves: 30,
    mobPool: ['wingtribe', 'qt_guard', 'wingtribe_elite'],
    bossId: 'demonshaitan_unique',
    entryFee: 1000000,
    specialDropRate: 0.30,
    description: 'Efsanevi kuşun yuvası.',
  },
  {
    id: 'egypt',
    name: 'Alexandria',
    minLvl: 105,
    waves: 40,
    mobPool: ['sandhyena', 'anubis_guard', 'pharaoh_mummy'],
    bossId: 'medusa_unique',
    entryFee: 5000000,
    specialDropRate: 0.35,
    description: 'Firavunların gizemi.',
  },
  {
    id: 'baghdad',
    name: 'Baghdad',
    minLvl: 125,
    waves: 50,
    mobPool: ['mirror_warrior', 'baghdad_soldier', 'baghdad_assassin'],
    bossId: 'karkadann_unique',
    entryFee: 15000000,
    specialDropRate: 0.45,
    description: 'Büyük halifelik.',
  },
];
