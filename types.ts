
export interface PlayerStats {
  lvl: number;
  xp: number;
  gold: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
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

export interface ActiveMob extends MobTemplate {
  curHp: number;
}

export interface DamagePop {
  id: number;
  value: number;
  color: string;
  x: number;
  y: number;
}

declare global {
  interface Window {
    Telegram: any;
  }
}
