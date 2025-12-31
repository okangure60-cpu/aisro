// Basit deterministic RNG: Mulberry32
export function createSeededRng(seed: number) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// Seed üretimi (ör. mob lvl + time gibi)
export function makeSeed(...parts: Array<number | string>) {
  const str = parts.join('|');
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Backward-compatible helper:
 * itemGenerator.ts eski sürümde `seededRandom(seed)` bekliyor.
 * Bu export ile build kesin düzelir.
 */
export function seededRandom(seed: number) {
  const r = createSeededRng(seed);
  return r();
}
