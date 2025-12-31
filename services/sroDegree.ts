// SRO mantığı: yaklaşık her 8 level'da 1 degree artar
// D1: 1-8, D2: 9-16, D3: 17-24 ...
export function degreeFromLevel(lvl: number) {
  const d = Math.ceil(Math.max(1, lvl) / 8);
  return Math.max(1, Math.min(15, d));
}

export function requiredLevelForDegree(degree: number) {
  const d = Math.max(1, Math.min(15, degree));
  return (d - 1) * 8 + 1;
}
