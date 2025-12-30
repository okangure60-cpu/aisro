
import { MobTemplate, ItemRarity, Skill, DungeonTemplate } from './types';

export const RARITY_COLORS: Record<ItemRarity, string> = {
  COMMON: '#94a3b8',
  STAR: '#a855f7',
  MOON: '#06b6d4',
  SUN: '#f97316',
};

// Resale values as percentage of level-based base value
export const ITEM_RESALE_MULTIPLIERS: Record<ItemRarity, number> = {
  COMMON: 0.1,
  STAR: 0.3,
  MOON: 0.8,
  SUN: 2.0,
};

export const SRO_SKILLS: Skill[] = [
  {
    id: 'normal',
    name: 'Normal Vuruş',
    mpCost: 0,
    damageMultiplier: 1.0,
    cooldown: 500,
    icon: '⚔️',
    color: '#f8fafc'
  },
  {
    id: 'triple_swing',
    name: 'Üçlü Kesik',
    mpCost: 15,
    damageMultiplier: 2.2,
    cooldown: 4000,
    icon: '🌪️',
    color: '#fcd34d'
  },
  {
    id: 'soul_spear',
    name: 'Ruh Mızrağı',
    mpCost: 45,
    damageMultiplier: 4.5,
    cooldown: 12000,
    icon: '✨',
    color: '#38bdf8'
  },
  {
    id: 'dragon_roar',
    name: 'Ejderha Nidası',
    mpCost: 120,
    damageMultiplier: 12.0,
    cooldown: 45000,
    icon: '🔥',
    color: '#ef4444'
  }
];

export const SRO_MOBS: MobTemplate[] = [
  { id: 'mangyang', name: "Mangyang", lvl: 1, hp: 80, atk: 12, img: "https://i.ibb.co/8mR0oXz/mangyang.png", xpReward: 0.5, goldReward: 15 },
  { id: 'movoi', name: "Movoi", lvl: 2, hp: 120, atk: 18, img: "https://i.ibb.co/YV7Nf2S/smalleye.png", xpReward: 1, goldReward: 25, abilities: [{ type: 'CHARGE', chance: 0.2, cooldown: 8000 }] },
  { id: 'smalleye', name: "Small Eye", lvl: 3, hp: 180, atk: 28, img: "https://i.ibb.co/YV7Nf2S/smalleye.png", xpReward: 1.5, goldReward: 40 },
  { id: 'bigeye', name: "Big Eye", lvl: 4, hp: 250, atk: 35, img: "https://i.ibb.co/YV7Nf2S/smalleye.png", xpReward: 2, goldReward: 60, abilities: [{ type: 'CHARGE', chance: 0.25, cooldown: 10000 }] },
  { id: 'oldweasel', name: "Old Weasel", lvl: 5, hp: 320, atk: 45, img: "https://i.ibb.co/mS9X3J1/tiger.png", xpReward: 2.5, goldReward: 80 },
  { id: 'weasel', name: "Weasel", lvl: 6, hp: 400, atk: 55, img: "https://i.ibb.co/mS9X3J1/tiger.png", xpReward: 3, goldReward: 110, abilities: [{ type: 'CHARGE', chance: 0.3, cooldown: 12000 }] },
  { id: 'waterghost', name: "Water Ghost", lvl: 7, hp: 1200, atk: 120, img: "https://i.ibb.co/LhB2PzF/waterghost.png", xpReward: 15, goldReward: 150, abilities: [{ type: 'POISON', chance: 0.3, cooldown: 8000 }] },
  { id: 'waterghostslave', name: "Water Ghost Slave", lvl: 8, hp: 600, atk: 85, img: "https://i.ibb.co/LhB2PzF/waterghost.png", xpReward: 4, goldReward: 200 },
  { id: 'hyena', name: "Hyena", lvl: 9, hp: 720, atk: 105, img: "https://i.ibb.co/N1pXW5j/wolf.png", xpReward: 4.5, goldReward: 260, abilities: [{ type: 'STUN', chance: 0.15, cooldown: 20000 }] },
  { id: 'hyenahound', name: "Hyena Hound", lvl: 10, hp: 850, atk: 125, img: "https://i.ibb.co/N1pXW5j/wolf.png", xpReward: 5, goldReward: 350, abilities: [{ type: 'CHARGE', chance: 0.3, cooldown: 15000 }] },
  { id: 'yeowa', name: "Decayed Yeowa", lvl: 11, hp: 1000, atk: 155, img: "https://i.ibb.co/VvzK9R1/chakji.png", xpReward: 5.5, goldReward: 480, abilities: [{ type: 'POISON', chance: 0.3, cooldown: 15000 }] },
  { id: 'yeowa_full', name: "Yeowa", lvl: 12, hp: 1200, atk: 190, img: "https://i.ibb.co/VvzK9R1/chakji.png", xpReward: 6, goldReward: 620, abilities: [{ type: 'STUN', chance: 0.2, cooldown: 20000 }] },
  { id: 'tiger', name: "Tiger", lvl: 13, hp: 5000, atk: 350, img: "https://i.ibb.co/mS9X3J1/tiger.png", xpReward: 50, goldReward: 800, abilities: [{ type: 'CHARGE', chance: 0.5, cooldown: 8000 }, { type: 'STUN', chance: 0.2, cooldown: 15000 }] },
  { id: 'tigerslave', name: "Tiger Slave", lvl: 14, hp: 1800, atk: 280, img: "https://i.ibb.co/mS9X3J1/tiger.png", xpReward: 7, goldReward: 1000 },
  { id: 'banditarcher', name: "Bandit Archer", lvl: 15, hp: 2200, atk: 340, img: "https://i.ibb.co/0XW5g9s/niya.png", xpReward: 7.5, goldReward: 1300, abilities: [{ type: 'CHARGE', chance: 0.35, cooldown: 10000 }] },
  { id: 'bandit', name: "Bandit", lvl: 16, hp: 2600, atk: 410, img: "https://i.ibb.co/0XW5g9s/niya.png", xpReward: 8, goldReward: 1700, abilities: [{ type: 'STUN', chance: 0.2, cooldown: 15000 }] },
  { id: 'chakji', name: "Chakji", lvl: 18, hp: 3500, atk: 550, img: "https://i.ibb.co/VvzK9R1/chakji.png", xpReward: 9, goldReward: 2500, abilities: [{ type: 'POISON', chance: 0.4, cooldown: 10000 }] },
  { id: 'ghostsungsung', name: "Ghost SungSung", lvl: 20, hp: 15000, atk: 850, img: "https://i.ibb.co/r7v9t7H/earthghost.png", xpReward: 150, goldReward: 4000, abilities: [{ type: 'CHARGE', chance: 0.5, cooldown: 10000 }, { type: 'STUN', chance: 0.3, cooldown: 15000 }, { type: 'POISON', chance: 0.2, cooldown: 20000 }] },
];

export const SRO_DUNGEONS: DungeonTemplate[] = [
  {
    id: 'forgotten_cave',
    name: 'Unutulmuş Mağara',
    minLvl: 5,
    waves: 5,
    mobPool: ['smalleye', 'bigeye', 'oldweasel'],
    bossId: 'waterghost',
    goldReward: 5000,
    entryFee: 1000,
    specialDropRate: 0.15,
    description: 'Karanlık ve nemli bir mağara. Giriş için 1.000 Altın gerekir.'
  },
  {
    id: 'bandit_fortress',
    name: 'Bandit Kalesi',
    minLvl: 12,
    waves: 8,
    mobPool: ['banditarcher', 'bandit', 'yeowa'],
    bossId: 'tiger',
    goldReward: 15000,
    entryFee: 5000,
    specialDropRate: 0.2,
    description: 'Eşkıyaların kalesi. Giriş için 5.000 Altın gerekir.'
  },
  {
    id: 'taklamakan_tomb',
    name: 'Taklamakan Mezarı',
    minLvl: 18,
    waves: 10,
    mobPool: ['chakji', 'yeowa_full', 'hyenahound'],
    bossId: 'ghostsungsung',
    goldReward: 50000,
    entryFee: 25000,
    specialDropRate: 0.25,
    description: 'Kadim ruhların mezarı. Giriş için 25.000 Altın gerekir.'
  }
];

export const POTION_CONFIG = {
  HP_POTION: { heal: 350, cost: 350, name: "HP Potion" },
  MP_POTION: { heal: 250, cost: 350, name: "MP Potion" }
};

export const getXpRequired = (lvl: number): number => {
  return 10 * Math.pow(2, lvl - 1);
};
