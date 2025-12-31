export const DEGREE_START_LEVEL: Record<number, number> = {
  1: 1,
  2: 8,
  3: 16,
  4: 24,
  5: 32,
  6: 40,
  7: 48,
  8: 56,
  9: 64,
  10: 72,
  11: 80,
  12: 88,
  13: 96,
  14: 104,
  15: 112,
  16: 120,
  17: 128,
  18: 136,
};

export function degreeFromLevel(lvl: number): number {
  const degrees = Object.keys(DEGREE_START_LEVEL).map(Number).sort((a, b) => a - b);
  let d = 1;
  for (const deg of degrees) {
    if (lvl >= DEGREE_START_LEVEL[deg]) d = deg;
  }
  return d;
}

export function requiredLevelForDegree(deg: number): number {
  const clamped = Math.max(1, Math.min(18, deg));
  return DEGREE_START_LEVEL[clamped] ?? 1;
}

export function degreeRange(deg: number): { min: number; max: number } {
  const start = requiredLevelForDegree(deg);
  return { min: start, max: start + 7 };
}
