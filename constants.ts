
import { MobTemplate } from './types';

/**
 * Balanced Silkroad-inspired mob database.
 * Higher level mobs provide exponentially better rewards to encourage progression.
 */
export const SRO_MOBS: MobTemplate[] = [
  { 
    id: 'mangyang', 
    name: "Mangyang", 
    lvl: 1, 
    hp: 80, 
    atk: 4, 
    img: "https://i.ibb.co/8mR0oXz/mangyang.png", 
    xpReward: 85, 
    goldReward: 12 
  },
  { 
    id: 'smalleye', 
    name: "Small Eye", 
    lvl: 3, 
    hp: 180, 
    atk: 9, 
    img: "https://i.ibb.co/YV7Nf2S/smalleye.png", 
    xpReward: 210, 
    goldReward: 35 
  },
  { 
    id: 'waterghost', 
    name: "Water Ghost", 
    lvl: 7, 
    hp: 450, 
    atk: 18, 
    img: "https://i.ibb.co/LhB2PzF/waterghost.png", 
    xpReward: 650, 
    goldReward: 120 
  },
  { 
    id: 'tiger', 
    name: "Tiger", 
    lvl: 13, 
    hp: 1100, 
    atk: 32, 
    img: "https://i.ibb.co/mS9X3J1/tiger.png", 
    xpReward: 2200, 
    goldReward: 450 
  },
  { 
    id: 'chakji', 
    name: "Chakji", 
    lvl: 18, 
    hp: 2400, 
    atk: 55, 
    img: "https://i.ibb.co/VvzK9R1/chakji.png", 
    xpReward: 5800, 
    goldReward: 1200 
  },
  { 
    id: 'hyeongcheon', 
    name: "Hyeongcheon", 
    lvl: 24, 
    hp: 5200, 
    atk: 95, 
    img: "https://i.ibb.co/S3XQp6S/hyeongcheon.png", 
    xpReward: 16500, 
    goldReward: 3400 
  },
  { 
    id: 'ongyeong', 
    name: "Ongyeong", 
    lvl: 30, 
    hp: 11500, 
    atk: 145, 
    img: "https://i.ibb.co/YyY1q4v/ongyeong.png", 
    xpReward: 42000, 
    goldReward: 8200 
  }
];

/**
 * Refined XP progression formula.
 * Provides a smooth early experience with significant difficulty jumps at level 10 and 20.
 */
export const getXpRequired = (lvl: number): number => {
  const base = 300;
  // Quadratic growth with an exponential kicker for mid-late game
  const difficultyMultiplier = lvl >= 20 ? 1.5 : (lvl >= 10 ? 1.2 : 1.0);
  return Math.floor((base * Math.pow(lvl, 1.6) + (lvl * 150)) * difficultyMultiplier);
};
