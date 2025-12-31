export type ItemRarity = 'COMMON' | 'STAR' | 'MOON' | 'SUN';
export type ItemType = 'WEAPON' | 'SHIELD' | 'ARMOR' | 'ACCESSORY';

export type ItemSlot =
  | 'WEAPON'
  | 'SHIELD'
  // Accessories (SRO tarzı)
  | 'NECKLACE'
  | 'EARRING'
  | 'RING1'
  | 'RING2'
  // Armor (6 slot)
  | 'HEAD'
  | 'SHOULDERS'
  | 'CHEST'
  | 'HANDS'
  | 'LEGS'
  | 'FEET';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  slot: ItemSlot;

  degree: number;
  rarity: ItemRarity;
  lvl: number;

  atkBonus: number;
  defBonus: number;
  hpBonus: number;

  plus: number;
  isEquipped: boolean;

  // ✅ only weapon uses this (0..1)
  critChance?: number;
}

export interface PotionStats {
  hp_s: number; hp_m: number; hp_l: number;
  mp_s: number; mp_m: number; mp_l: number;
}

export interface VipFeature {
  active: boolean;
  expiresAt: number;
}

export interface PlayerStats {
  charName: string;
  build: string;

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
  potions: PotionStats;
  unlockedSkills: string[];

  vip: {
    autoPotion: VipFeature;
    expBoost: VipFeature;
    dropBoost: VipFeature;
    premium: VipFeature;
  };
}

export interface Skill {
  id: string;
  name: string;
  mpCost: number;
  damageMultiplier: number;
  cooldown: number;
  icon: string;
  color: string;
  unlockLvl?: number;
  unlockCost?: number;
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
}
