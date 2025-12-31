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
  // Jangan (1-20)
  { id: 'mangyang', name: "Mangyang", lvl: 1, hp: 80, atk: 12, img: "https://i.ibb.co/8mR0oXz/mangyang.png", xpReward: 2, goldReward: 15 },
  { id: 'smalleye', name: "Small Eye", lvl: 3, hp: 180, atk: 28, img: "https://i.ibb.co/YV7Nf2S/smalleye.png", xpReward: 5, goldReward: 40 },
  { id: 'oldweasel', name: "Old Weasel", lvl: 5, hp: 320, atk: 45, img: "https://i.ibb.co/mS9X3J1/tiger.png", xpReward: 12, goldReward: 80 },
  { id: 'waterghost', name: "Water Ghost", lvl: 8, hp: 650, atk: 110, img: "https://i.ibb.co/LhB2PzF/waterghost.png", xpReward: 25, goldReward: 150 },
  { id: 'bandit', name: "Bandit", lvl: 15, hp: 2200, atk: 280, img: "https://i.ibb.co/0XW5g9s/niya.png", xpReward: 60, goldReward: 450 },
  { id: 'tiger', name: "White Tiger", lvl: 18, hp: 3500, atk: 450, img: "https://i.ibb.co/mS9X3J1/tiger.png", xpReward: 90, goldReward: 600 },
  
  // Donwhang (20-40)
  { id: 'chakji', name: "Chakji", lvl: 22, hp: 6000, atk: 750, img: "https://i.ibb.co/YV7Nf2S/smalleye.png", xpReward: 180, goldReward: 1200 },
  { id: 'earthghost', name: "Earth Ghost", lvl: 26, hp: 8500, atk: 1100, img: "https://i.ibb.co/8mR0oXz/mangyang.png", xpReward: 250, goldReward: 1800 },
  { id: 'uruchi', name: "Uruchi (Unique)", lvl: 40, hp: 85000, atk: 3500, img: "https://i.ibb.co/mS9X3J1/tiger.png", xpReward: 5000, goldReward: 50000 },
  
  // Hotan (40-60)
  { id: 'maong', name: "Maong", lvl: 45, hp: 18000, atk: 2400, img: "https://i.ibb.co/0XW5g9s/niya.png", xpReward: 600, goldReward: 4500 },
  { id: 'penon', name: "Penon Fighter", lvl: 52, hp: 28000, atk: 3800, img: "https://i.ibb.co/LhB2PzF/waterghost.png", xpReward: 1200, goldReward: 7500 },
  { id: 'isyutaru', name: "Isyutaru (Unique)", lvl: 60, hp: 250000, atk: 8500, img: "https://i.ibb.co/LhB2PzF/waterghost.png", xpReward: 15000, goldReward: 150000 },
  
  // Karakoram & Taklamakan (60-80)
  { id: 'niya', name: "Niya Guard", lvl: 72, hp: 65000, atk: 9500, img: "https://i.ibb.co/0XW5g9s/niya.png", xpReward: 4500, goldReward: 18000 },
  { id: 'lordyarkan', name: "Lord Yarkan (Unique)", lvl: 80, hp: 850000, atk: 22000, img: "https://i.ibb.co/0XW5g9s/niya.png", xpReward: 45000, goldReward: 500000 },
  
  // Roc Mountain & Qin Tomb (80-100)
  { id: 'wingtribe', name: "Wing Tribe", lvl: 88, hp: 125000, atk: 18000, img: "https://i.ibb.co/8mR0oXz/mangyang.png", xpReward: 12000, goldReward: 45000 },
  { id: 'demonshaitan', name: "Demon Shaitan (Unique)", lvl: 100, hp: 2500000, atk: 55000, img: "https://i.ibb.co/mS9X3J1/tiger.png", xpReward: 120000, goldReward: 2500000 },
  
  // Alexandria (100-120)
  { id: 'sandhyena', name: "Sand Hyena", lvl: 105, hp: 280000, atk: 42000, img: "https://i.ibb.co/mS9X3J1/tiger.png", xpReward: 35000, goldReward: 85000 },
  { id: 'medusa', name: "Medusa (Unique)", lvl: 115, hp: 8000000, atk: 120000, img: "https://i.ibb.co/LhB2PzF/waterghost.png", xpReward: 500000, goldReward: 10000000 },
  
  // Mirror Dimension & Baghdad (120-140)
  { id: 'baghdad_soldier', name: "Baghdad Soldier", lvl: 130, hp: 650000, atk: 95000, img: "https://i.ibb.co/0XW5g9s/niya.png", xpReward: 95000, goldReward: 250000 },
  { id: 'karkadann', name: "Karkadann (Unique)", lvl: 140, hp: 25000000, atk: 350000, img: "https://i.ibb.co/mS9X3J1/tiger.png", xpReward: 2500000, goldReward: 50000000 }
];

export const SRO_DUNGEONS: DungeonTemplate[] = [
  { id: 'bandit_fort', name: 'Bandit Stronghold', minLvl: 10, waves: 10, mobPool: ['bandit', 'tiger'], bossId: 'tiger', entryFee: 5000, specialDropRate: 0.10, description: 'Eşkıya liderlerini temizle.' },
  { id: 'jangan_cave', name: 'Jangan Cave (B1)', minLvl: 25, waves: 15, mobPool: ['earthghost', 'chakji'], bossId: 'uruchi', entryFee: 25000, specialDropRate: 0.15, description: 'Yeraltı mezarlığı.' },
  { id: 'karakoram', name: 'Karakoram', minLvl: 45, waves: 20, mobPool: ['maong', 'penon'], bossId: 'isyutaru', entryFee: 75000, specialDropRate: 0.20, description: 'Buzullar diyarı.' },
  { id: 'taklamakan', name: 'Taklamakan', minLvl: 65, waves: 25, mobPool: ['niya'], bossId: 'lordyarkan', entryFee: 250000, specialDropRate: 0.25, description: 'Sonsuz çöl sıcağı.' },
  { id: 'roc_mt', name: 'Roc Mountain', minLvl: 85, waves: 30, mobPool: ['wingtribe'], bossId: 'demonshaitan', entryFee: 1000000, specialDropRate: 0.30, description: 'Efsanevi kuşun yuvası.' },
  { id: 'egypt', name: 'Alexandria', minLvl: 105, waves: 40, mobPool: ['sandhyena'], bossId: 'medusa', entryFee: 5000000, specialDropRate: 0.35, description: 'Firavunların gizemi.' },
  { id: 'baghdad', name: 'Baghdad', minLvl: 125, waves: 50, mobPool: ['baghdad_soldier'], bossId: 'karkadann', entryFee: 15000000, specialDropRate: 0.45, description: 'Büyük halifelik.' }
];

export const POTION_TIERS = {
  HP_S: { id: 'hp_s', name: 'HP Potion (S)', heal: 150, cost: 150 },
  HP_M: { id: 'hp_m', name: 'HP Potion (M)', heal: 800, cost: 850 },
  HP_L: { id: 'hp_l', name: 'HP Potion (L)', heal: 3500, cost: 4200 },
  MP_S: { id: 'mp_s', name: 'MP Potion (S)', heal: 100, cost: 150 },
  MP_M: { id: 'mp_m', name: 'MP Potion (M)', heal: 600, cost: 850 },
  MP_L: { id: 'mp_l', name: 'MP Potion (L)', heal: 2800, cost: 4200 },
};

export const getXpRequired = (lvl: number): number => {
  if (lvl < 10) return 10 * Math.pow(2, lvl - 1);
  return 2500 * Math.pow(1.15, lvl - 10);
};
