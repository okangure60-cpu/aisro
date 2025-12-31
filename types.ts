
export type ItemRarity = 'COMMON' | 'STAR' | 'MOON' | 'SUN';
export type ItemType = 'WEAPON' | 'SHIELD' | 'ARMOR' | 'HELMET' | 'ACCESSORY';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  lvl: number;
  atkBonus: number;
  defBonus: number;
  hpBonus: number;
  isEquipped: boolean;
}

export interface MarketListing {
  id: string;
  item: Item;
  sellerName: string;
  price: number;
  date: number;
}

export interface Skill {
  id: string;
  name: string;
  mpCost: number;
  damageMultiplier: number;
  cooldown: number;
  icon: string;
  color: string;
}

export type MobAbilityType = 'POISON' | 'CHARGE' | 'STUN';

export interface MobAbility {
  type: MobAbilityType;
  chance: number;
  cooldown: number;
}

export interface PlayerStats {
  lvl: number;
  xp: number;
  gold: number;
  hp: number;
  maxHp: number; 
  mp: number;
  maxMp: number;
  atk: number;    
  def: number;    
  inventory: Item[];
  potions: {
    hp: number;
    mp: number;
  };
  isPremium?: boolean;
  autoPotionEnabled?: boolean;
}

export interface PlayerDebuff {
  type: MobAbilityType;
  endTime: number;
  value?: number;
}

export interface MobTemplate {
  id: string;
  name: string;
  lvl: number;
  hp: number;
  atk: number;
  img: string;
  xpReward: number;
  goldReward: number;
  abilities?: MobAbility[];
}

export interface DungeonTemplate {
  id: string;
  name: string;
  minLvl: number;
  waves: number;
  mobPool: string[];
  bossId: string;
  entryFee: number;
  specialDropRate: number;
  description: string;
}

export interface ActiveMob extends MobTemplate {
  curHp: number;
  lastAbilityTime: Record<string, number>;
  isCharging?: boolean;
  isBoss?: boolean;
}

export interface DamagePop {
  id: number;
  value: number;
  color: string;
  x: number;
  y: number;
  textValue?: string;
  isSkill?: boolean;
}

declare global {
  interface Window {
    Telegram: any;
  }
}
