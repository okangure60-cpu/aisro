import { MobTemplate, ItemRarity, Skill, DungeonTemplate } from './types';

export const RARITY_COLORS: Record<ItemRarity, string> = {
  COMMON: '#94a3b8',
  STAR: '#a855f7',
  MOON: '#06b6d4',
  SUN: '#f97316',
};

export const SRO_SKILLS: Skill[] = [
  { id: 'normal', name: 'Normal Vuruş', mpCost: 0, damageMultiplier: 1.0, cooldown: 500, icon: '⚔️', color: '#f8fafc', unlockLvl: 0, unlockCost: 0 },
  { id: 'triple_swing', name: 'Üçlü Kesik', mpCost: 15, damageMultiplier: 2.2, cooldown: 4000, icon: '🌪️', color: '#fcd34d', unlockLvl: 5, unlockCost: 10000 },
  { id: 'soul_spear', name: 'Ruh Mızrağı', mpCost: 45, damageMultiplier: 4.5, cooldown: 12000, icon: '✨', color: '#38bdf8', unlockLvl: 15, unlockCost: 50000 },
  { id: 'dragon_roar', name: 'Ejderha Nidası', mpCost: 120, damageMultiplier: 12.0, cooldown: 45000, icon: '🔥', color: '#ef4444', unlockLvl: 30, unlockCost: 200000 }
];

export const SRO_MOBS: MobTemplate[] = [
  { id: 'mangyang', name: "Mangyang", lvl: 1, hp: 80, atk: 12, img: "https://i.ibb.co/8mR0oXz/mangyang.png", xpReward: 0.5, goldReward: 15 },
  { id: 'smalleye', name: "Small Eye", lvl: 3, hp: 180, atk: 28, img: "https://i.ibb.co/YV7Nf2S/smalleye.png", xpReward: 1.5, goldReward: 40 },
  { id: 'oldweasel', name: "Old Weasel", lvl: 5, hp: 320, atk: 45, img: "https://i.ibb.co/mS9X3J1/tiger.png", xpReward: 2.5, goldReward: 80 },
  { id: 'waterghost', name: "Water Ghost", lvl: 8, hp: 1200, atk: 120, img: "https://i.ibb.co/LhB2PzF/waterghost.png", xpReward: 15, goldReward: 150 },
  { id: 'tiger', name: "Tiger", lvl: 13, hp: 5000, atk: 350, img: "https://i.ibb.co/mS9X3J1/tiger.png", xpReward: 50, goldReward: 800 },
  { id: 'bandit', name: "Bandit", lvl: 18, hp: 3500, atk: 550, img: "https://i.ibb.co/0XW5g9s/niya.png", xpReward: 15, goldReward: 2500 },
  { id: 'uruchi', name: "Uruchi", lvl: 30, hp: 65000, atk: 3800, img: "https://i.ibb.co/mS9X3J1/tiger.png", xpReward: 500, goldReward: 25000 },
];

export const SRO_DUNGEONS: DungeonTemplate[] = [
  { id: 'cave', name: 'Unutulmuş Mağara', minLvl: 5, waves: 5, mobPool: ['smalleye', 'oldweasel'], bossId: 'waterghost', entryFee: 20000, specialDropRate: 0.10, description: 'Karanlık mağara.' },
  { id: 'fortress', name: 'Bandit Kalesi', minLvl: 15, waves: 10, mobPool: ['bandit'], bossId: 'tiger', entryFee: 100000, specialDropRate: 0.15, description: 'Eşkıya sığınağı.' },
];

export const POTION_TIERS = {
  HP_S: { id: 'hp_s', name: 'HP Potion (S)', heal: 150, cost: 150 },
  HP_M: { id: 'hp_m', name: 'HP Potion (M)', heal: 600, cost: 750 },
  HP_L: { id: 'hp_l', name: 'HP Potion (L)', heal: 2500, cost: 3500 },
  MP_S: { id: 'mp_s', name: 'MP Potion (S)', heal: 100, cost: 150 },
  MP_M: { id: 'mp_m', name: 'MP Potion (M)', heal: 400, cost: 750 },
  MP_L: { id: 'mp_l', name: 'MP Potion (L)', heal: 1800, cost: 3500 },
};

export const getXpRequired = (lvl: number): number => 10 * Math.pow(2, lvl - 1);
