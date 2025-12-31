import { ActiveMob, BlueOption, Item, ItemRarity, ItemSlot, ItemType, PlayerStats } from '../types';
import { degreeFromLevel, requiredLevelForDegree } from './sroDegree';
import { seededRandom } from './seededRng';

type MobRank = 'NORMAL' | 'BOSS';

const WEAPON_SLOTS: ItemSlot[] = ['WEAPON'];
const SHIELD_SLOTS: ItemSlot[] = ['SHIELD'];
const ARMOR_SLOTS: ItemSlot[] = ['HELMET', 'SHOULDER', 'CHEST', 'LEGS', 'GLOVES', 'BOOTS'];
const ACCESSORY_SLOTS: ItemSlot[] = ['RING', 'EARRING', 'NECKLACE'];

function pickTypeAndSlot(rng: ReturnType<typeof seededRandom>): { type: ItemType; slot: ItemSlot } {
  // basit dağılım: armor biraz daha çok düşsün
  const r = rng.next();
  if (r < 0.40) return { type: 'ARMOR', slot: rng.pick(ARMOR_SLOTS) };
  if (r < 0.60) return { type: 'WEAPON', slot: 'WEAPON' };
  if (r < 0.75) return { type: 'SHIELD', slot: 'SHIELD' };
  return { type: 'ACCESSORY', slot: rng.pick(ACCESSORY_SLOTS) };
}

function rarityRoll(rng: ReturnType<typeof seededRandom>, rank: MobRank): ItemRarity {
  const rareMult = rank === 'BOSS' ? 3.0 : 1.0;

  const sun = 0.002 * rareMult;   // 0.2%
  const moon = 0.008 * rareMult;  // 0.8%
  const star = 0.02 * rareMult;   // 2.0%

  const r = rng.next();
  if (r < sun) return 'SUN';
  if (r < sun + moon) return 'MOON';
  if (r < sun + moon + star) return 'STAR';
  return 'COMMON';
}

function plusRoll(rng: ReturnType<typeof seededRandom>, rarity: ItemRarity): number {
  const baseMax = 7;
  const boost = rarity === 'SUN' ? 2 : rarity === 'MOON' ? 1 : rarity === 'STAR' ? 1 : 0;
  const max = Math.min(12, baseMax + boost);

  const r = rng.next();
  if (r < 0.70) return 0;
  if (r < 0.85) return 1;
  if (r < 0.93) return 2;
  if (r < 0.97) return 3;
  if (r < 0.99) return 4;
  return rng.int(5, max);
}

function blueRoll(
  rng: ReturnType<typeof seededRandom>,
  rarity: ItemRarity,
  type: ItemType,
  deg: number
): BlueOption[] {
  const count =
    rarity === 'SUN' ? rng.int(3, 5) :
    rarity === 'MOON' ? rng.int(2, 4) :
    rarity === 'STAR' ? rng.int(1, 3) :
    (rng.next() < 0.18 ? 1 : 0);

  if (count === 0) return [];

  const pool: BlueOption['key'][] = ['HP', 'MP', 'DEF', 'ATK', 'STR', 'INT'];
  if (type === 'WEAPON') pool.push('CRIT', 'HIT');

  const scale = Math.max(1, Math.floor(deg / 2));

  const blues: BlueOption[] = [];
  for (let i = 0; i < count; i++) {
    const key = rng.pick(pool);
    const base =
      key === 'HP' ? rng.int(40, 120) :
      key === 'MP' ? rng.int(20, 80) :
      key === 'ATK' ? rng.int(3, 12) :
      key === 'DEF' ? rng.int(3, 12) :
      key === 'CRIT' ? rng.int(1, 3) :
      key === 'HIT' ? rng.int(1, 3) :
      rng.int(1, 4);

    blues.push({ key, value: base * scale });
  }
  return blues;
}

function calcBonuses(type: ItemType, deg: number, rarity: ItemRarity, plus: number, blues: BlueOption[]) {
  const rarityMult = rarity === 'SUN' ? 2.0 : rarity === 'MOON' ? 1.5 : rarity === 'STAR' ? 1.2 : 1.0;
  const plusMult = 1 + (type === 'WEAPON' ? plus * 0.06 : plus * 0.04);

  const baseStat = deg * 18;

  let atkBonus = 0, defBonus = 0, hpBonus = 0;

  if (type === 'WEAPON') atkBonus = Math.floor(baseStat * 1.6 * rarityMult * plusMult);
  else if (type === 'SHIELD') defBonus = Math.floor(baseStat * 1.3 * rarityMult * plusMult);
  else if (type === 'ARMOR') {
    defBonus = Math.floor(baseStat * 0.9 * rarityMult * plusMult);
    hpBonus = Math.floor(baseStat * 4.5 * rarityMult * (1 + plus * 0.03));
  } else {
    hpBonus = Math.floor(baseStat * 10 * rarityMult * (1 + plus * 0.03));
  }

  // Blues -> senin 3 bonusa projekte
  for (const b of blues) {
    if (b.key === 'ATK') atkBonus += b.value;
    if (b.key === 'DEF') defBonus += b.value;
    if (b.key === 'HP') hpBonus += b.value * 2;
    if (b.key === 'STR') atkBonus += b.value * 2;
    if (b.key === 'INT') hpBonus += b.value;
    if (b.key === 'CRIT') atkBonus += b.value * 3;
    if (b.key === 'HIT') atkBonus += b.value * 2;
  }

  return { atkBonus, defBonus, hpBonus };
}

export function generateDrop(params: {
  mob: ActiveMob;
  player: PlayerStats;
  dungeon?: { specialDropRate: number } | null;
}): Item | null {
  const { mob, player, dungeon } = params;
  const rank: MobRank = mob.isBoss ? 'BOSS' : 'NORMAL';

  let baseDrop = rank === 'BOSS' ? 0.35 : 0.10;

  const dropBoostActive = player.vip.premium.active || player.vip.dropBoost.active;
  if (dropBoostActive) baseDrop *= 1.8;

  const special = dungeon?.specialDropRate ?? 0;

  const seed = `${mob.id}:${mob.lvl}:${player.charName}:${Date.now()}`;
  const rng = seededRandom(seed);

  const dropped = (rng.next() < baseDrop) || (special > 0 && rng.next() < special);
  if (!dropped) return null;

  const mobDeg = degreeFromLevel(mob.lvl);

  // degree roll: -1 %15, +1 %8
  const r = rng.next();
  let deg = mobDeg;
  if (r < 0.15) deg = Math.max(1, mobDeg - 1);
  else if (r > 0.92) deg = Math.min(18, mobDeg + 1);

  const requiredLvl = requiredLevelForDegree(deg);

  const { type, slot } = pickTypeAndSlot(rng);

  const rarity = rarityRoll(rng, rank);
  const plus = plusRoll(rng, rarity);
  const blues = blueRoll(rng, rarity, type, deg);

  const { atkBonus, defBonus, hpBonus } = calcBonuses(type, deg, rarity, plus, blues);

  const rarityTag = rarity === 'COMMON' ? '' : ` [${rarity}]`;
  const plusTag = plus > 0 ? ` +${plus}` : '';
  const name = `D${deg} ${slot}${rarityTag}${plusTag}`;

  return {
    id: rng.int(100000000, 999999999).toString(36),
    seed,
    name,
    type,
    slot,
    degree: deg,
    rarity,
    requiredLvl,
    atkBonus,
    defBonus,
    hpBonus,
    plus,
    blues,
    isEquipped: false
  };
}
