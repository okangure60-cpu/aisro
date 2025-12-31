import { Item, ItemRarity, ItemSlot, ItemType } from '../types';
import { degreeFromLevel } from './sroDegree.ts';
import { createSeededRng, makeSeed } from './seededRng.ts';

type GenerateDropArgs = {
  mobLvl: number;
  isBoss?: boolean;
  dropBoost?: boolean;
  seed?: number;
};

const SLOT_POOL: ItemSlot[] = [
  'WEAPON', 'SHIELD', 'ACCESSORY',
  'HEAD', 'SHOULDERS', 'CHEST', 'HANDS', 'LEGS', 'FEET',
];

function typeFromSlot(slot: ItemSlot): ItemType {
  if (slot === 'WEAPON') return 'WEAPON';
  if (slot === 'SHIELD') return 'SHIELD';
  if (slot === 'ACCESSORY') return 'ACCESSORY';
  return 'ARMOR';
}

function rarityRoll(rand: () => number): { rarity: ItemRarity; mult: number } {
  const r = rand();
  if (r < 0.002) return { rarity: 'SUN', mult: 2.5 };
  if (r < 0.010) return { rarity: 'MOON', mult: 1.8 };
  if (r < 0.050) return { rarity: 'STAR', mult: 1.4 };
  return { rarity: 'COMMON', mult: 1.0 };
}

function slotDisplay(slot: ItemSlot) {
  switch (slot) {
    case 'HEAD': return 'Head';
    case 'SHOULDERS': return 'Shoulder';
    case 'CHEST': return 'Chest';
    case 'HANDS': return 'Hands';
    case 'LEGS': return 'Legs';
    case 'FEET': return 'Feet';
    case 'WEAPON': return 'Weapon';
    case 'SHIELD': return 'Shield';
    case 'ACCESSORY': return 'Accessory';
    default: return slot;
  }
}

export function generateDrop(args: GenerateDropArgs): Item | null {
  const mobLvl = args.mobLvl;
  const isBoss = !!args.isBoss;
  const dropBoost = !!args.dropBoost;

  const seed = args.seed ?? makeSeed('drop', mobLvl, isBoss ? 1 : 0, Date.now());
  const rand = createSeededRng(seed);

  let baseRate = isBoss ? 0.80 : 0.12;
  if (dropBoost) baseRate = Math.min(0.95, baseRate * 2);
  if (rand() > baseRate) return null;

  const { rarity, mult: rarityMult } = rarityRoll(rand);
  const slot = SLOT_POOL[Math.floor(rand() * SLOT_POOL.length)];
  const type = typeFromSlot(slot);

  const degree = degreeFromLevel(mobLvl);
  const baseStat = degree * 15;

  let atkBonus = 0;
  let defBonus = 0;
  let hpBonus = 0;

  if (slot === 'WEAPON') {
    atkBonus = Math.floor(baseStat * 1.6 * rarityMult);
  } else if (slot === 'SHIELD') {
    defBonus = Math.floor(baseStat * 1.3 * rarityMult);
    hpBonus = Math.floor(baseStat * 2.5 * rarityMult);
  } else if (slot === 'ACCESSORY') {
    hpBonus = Math.floor(baseStat * 12 * rarityMult);
  } else {
    defBonus = Math.floor(baseStat * 0.9 * rarityMult);
    hpBonus = Math.floor(baseStat * 6.5 * rarityMult);
  }

  const rarityPrefix = rarity !== 'COMMON' ? `[${rarity}] ` : '';
  const name = `${rarityPrefix}D${degree} ${slotDisplay(slot)}`;

  return {
    id: Math.random().toString(36).slice(2, 11),
    name,
    type,
    slot,
    degree,
    rarity,
    lvl: mobLvl,
    atkBonus,
    defBonus,
    hpBonus,
    plus: 0,
    isEquipped: false,
  };
}
