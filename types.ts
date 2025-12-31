export type ItemRarity = 'COMMON' | 'STAR' | 'MOON' | 'SUN';
export type ItemType = 'WEAPON' | 'SHIELD' | 'ARMOR' | 'ACCESSORY';

export type ItemSlot =
  | 'WEAPON'
  | 'SHIELD'
  | 'HEAD'
  | 'SHOULDERS'
  | 'CHEST'
  | 'HANDS'
  | 'LEGS'
  | 'FEET'
  | 'NECKLACE'
  | 'EARRING'
  | 'RING1'
  | 'RING2';

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
}
