
import { MobTemplate, ItemRarity, Skill, DungeonTemplate } from './types';

export const RARITY_COLORS: Record<ItemRarity, string> = {
  COMMON: '#94a3b8',
  STAR: '#a855f7',
  MOON: '#06b6d4',
  SUN: '#f97316',
};

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
  { id: 'movoi', name: "Movoi", lvl: 2, hp: 120, atk: 18, img: "https://i.ibb.co/YV7Nf2S/smalleye.png", xpReward: 1, goldReward: 25 },
  { id: 'smalleye', name: "Small Eye", lvl: 3, hp: 180, atk: 28, img: "https://i.ibb.co/YV7Nf2S/smalleye.png", xpReward: 1.5, goldReward: 40 },
  { id: 'oldweasel', name: "Old Weasel", lvl: 5, hp: 320, atk: 45, img: "https://i.ibb.co/mS9X3J1/tiger.png", xpReward: 2.5, goldReward: 80 },
  { id: 'waterghost', name: "Water Ghost", lvl: 7, hp: 1200, atk: 120, img: "https://i.ibb.co/LhB2PzF/waterghost.png", xpReward: 15, goldReward: 150 },
  { id: 'hyena', name: "Hyena", lvl: 9, hp: 720, atk: 105, img: "https://i.ibb.co/N1pXW5j/wolf.png", xpReward: 4.5, goldReward: 260 },
  { id: 'yeowa', name: "Yeowa", lvl: 12, hp: 1200, atk: 190, img: "https://i.ibb.co/VvzK9R1/chakji.png", xpReward: 6, goldReward: 620 },
  { id: 'tiger', name: "Tiger", lvl: 13, hp: 5000, atk: 350, img: "https://i.ibb.co/mS9X3J1/tiger.png", xpReward: 50, goldReward: 800 },
  { id: 'bandit', name: "Bandit", lvl: 16, hp: 2600, atk: 410, img: "https://i.ibb.co/0XW5g9s/niya.png", xpReward: 8, goldReward: 1700 },
  { id: 'chakji', name: "Chakji", lvl: 18, hp: 3500, atk: 550, img: "https://i.ibb.co/VvzK9R1/chakji.png", xpReward: 9, goldReward: 2500 },
  { id: 'ghostsungsung', name: "Ghost SungSung", lvl: 20, hp: 15000, atk: 850, img: "https://i.ibb.co/r7v9t7H/earthghost.png", xpReward: 150, goldReward: 4000 },
  { id: 'ishade', name: "Ishade", lvl: 25, hp: 8500, atk: 1200, img: "https://i.ibb.co/LhB2PzF/waterghost.png", xpReward: 15, goldReward: 5000 },
  { id: 'penon', name: "Penon Warrior", lvl: 28, hp: 11000, atk: 1600, img: "https://i.ibb.co/r7v9t7H/earthghost.png", xpReward: 18, goldReward: 7500 },
  { id: 'uruchi', name: "Uruchi", lvl: 30, hp: 65000, atk: 3800, img: "https://i.ibb.co/mS9X3J1/tiger.png", xpReward: 500, goldReward: 25000 },
  { id: 'niyasniper', name: "Niya Sniper", lvl: 35, hp: 18000, atk: 2500, img: "https://i.ibb.co/0XW5g9s/niya.png", xpReward: 35, goldReward: 15000 },
  { id: 'isyutaru', name: "Isyutaru", lvl: 40, hp: 180000, atk: 8500, img: "https://i.ibb.co/LhB2PzF/waterghost.png", xpReward: 2000, goldReward: 100000 },
  { id: 'niyaguard', name: "Niya Guard", lvl: 45, hp: 35000, atk: 5500, img: "https://i.ibb.co/0XW5g9s/niya.png", xpReward: 50, goldReward: 20000 },
  { id: 'lordyarkan', name: "Lord Yarkan", lvl: 50, hp: 600000, atk: 28000, img: "https://i.ibb.co/VvzK9R1/chakji.png", xpReward: 10000, goldReward: 500000 },
  { id: 'roc', name: "Roc", lvl: 60, hp: 1500000, atk: 60000, img: "https://i.ibb.co/N1pXW5j/wolf.png", xpReward: 50000, goldReward: 2500000 },
  { id: 'medusa', name: "Medusa", lvl: 70, hp: 6000000, atk: 140000, img: "https://i.ibb.co/LhB2PzF/waterghost.png", xpReward: 200000, goldReward: 10000000 },
];

export const SRO_DUNGEONS: DungeonTemplate[] = [
  {
    id: 'forgotten_cave',
    name: 'Unutulmuş Mağara',
    minLvl: 5,
    waves: 5,
    mobPool: ['smalleye', 'oldweasel'],
    bossId: 'waterghost',
    entryFee: 20000,
    specialDropRate: 0.10,
    description: 'Karanlık ve nemli bir mağara. İlk nadir eşyanı burada bulabilirsin.'
  },
  {
    id: 'bandit_fortress',
    name: 'Bandit Kalesi',
    minLvl: 12,
    waves: 8,
    mobPool: ['yeowa', 'bandit'],
    bossId: 'tiger',
    entryFee: 50000,
    specialDropRate: 0.12,
    description: 'Eşkıyaların kalesi. Boss mağlup edildiğinde değerli silahlar düşebilir.'
  },
  {
    id: 'tarim_basin',
    name: 'Tarim Havzası',
    minLvl: 20,
    waves: 10,
    mobPool: ['chakji', 'bandit'],
    bossId: 'ghostsungsung',
    entryFee: 120000,
    specialDropRate: 0.15,
    description: 'Kadim ruhların koruduğu bereketli topraklar. Drop şansı daha yüksek.'
  },
  {
    id: 'karakoram_glade',
    name: 'Karakoram Buzulu',
    minLvl: 30,
    waves: 12,
    mobPool: ['ishade', 'penon'],
    bossId: 'uruchi',
    entryFee: 300000,
    specialDropRate: 0.18,
    description: 'Dondurucu soğukta Uruchi\'nin hazinesini ele geçir.'
  },
  {
    id: 'taklamakan_desert',
    name: 'Taklamakan Çölü',
    minLvl: 40,
    waves: 15,
    mobPool: ['niyasniper', 'niyaguard'],
    bossId: 'isyutaru',
    entryFee: 750000,
    specialDropRate: 0.22,
    description: 'Sonsuz kumlarda Isyutaru\'nun nadir mühürlü ekipmanlarını ara.'
  },
  {
    id: 'roc_mountain',
    name: 'Roc Dağı',
    minLvl: 50,
    waves: 18,
    mobPool: ['niyaguard', 'niyasniper'],
    bossId: 'lordyarkan',
    entryFee: 1800000,
    specialDropRate: 0.26,
    description: 'Bulutların üzerinde Lord Yarkan\'dan SUN item düşürme şansı!'
  },
  {
    id: 'serpent_temple',
    name: 'Yılan Tapınağı',
    minLvl: 60,
    waves: 25,
    mobPool: ['niyaguard', 'niyasniper'],
    bossId: 'medusa',
    entryFee: 5000000,
    specialDropRate: 0.30,
    description: 'En yüksek drop şansı burada. Medusa seni bekliyor.'
  }
];

export const POTION_CONFIG = {
  HP_POTION: { heal: 350, cost: 350, name: "HP Potion" },
  MP_POTION: { heal: 250, cost: 350, name: "MP Potion" }
};

export const getXpRequired = (lvl: number): number => {
  return 10 * Math.pow(2, lvl - 1);
};
