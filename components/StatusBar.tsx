
import React, { useMemo } from 'react';
import { PlayerStats } from '../types';
import { getXpRequired } from '../constants';

interface StatusBarProps {
  stats: PlayerStats;
  totalAtk: number;
  totalDef: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({ stats, totalAtk, totalDef }) => {
  const xpRequired = useMemo(() => getXpRequired(stats.lvl), [stats.lvl]);
  const hpPercent = (stats.hp / stats.maxHp) * 100;
  const mpPercent = (stats.mp / stats.maxMp) * 100;
  const xpPercent = (stats.xp / xpRequired) * 100;

  const isNearLevelUp = xpPercent >= 80;

  return (
    <div className="w-full bg-[#0f172a] border-b-2 border-amber-900/60 p-3 pt-4 flex flex-col gap-2 shadow-[0_4px_30px_rgba(0,0,0,0.8)] relative z-50">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-amber-400 to-amber-700 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded shadow-[0_0_10px_rgba(217,119,6,0.4)] border border-amber-300/30">
            LVL {stats.lvl}
          </div>
          <span className="text-amber-100 text-xs font-black tracking-widest italic">SAVAŞÇI</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
             <span className="text-[9px] font-black text-amber-500/80 leading-none">GOLD</span>
             <span className="text-amber-400 text-xs font-black tracking-tighter">💰 {stats.gold.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2 items-center">
        {/* HP/MP bars */}
        <div className="col-span-8 space-y-1.5">
          <div className="h-3 w-full bg-black rounded border border-slate-800 relative overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-800 to-red-500 transition-all duration-300"
              style={{ width: `${Math.max(0, hpPercent)}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white perspective-text">HP {Math.round(stats.hp)} / {Math.round(stats.maxHp)}</span>
          </div>
          <div className="h-3 w-full bg-black rounded border border-slate-800 relative overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-sky-800 to-sky-500 transition-all duration-300"
              style={{ width: `${Math.max(0, mpPercent)}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white perspective-text">MP {Math.round(stats.mp)} / {Math.round(stats.maxMp)}</span>
          </div>
        </div>

        {/* ATK/DEF display */}
        <div className="col-span-4 flex flex-col gap-1 bg-black/40 border border-slate-800 rounded p-1">
          <div className="flex justify-between items-center px-1">
            <span className="text-[7px] font-black text-amber-500">ATK</span>
            <span className="text-[9px] font-bold text-white leading-none">{totalAtk}</span>
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="text-[7px] font-black text-sky-500">DEF</span>
            <span className="text-[9px] font-bold text-white leading-none">{totalDef}</span>
          </div>
        </div>
      </div>

      {/* XP Bar footer */}
      <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-slate-900 mt-1">
        <div 
          className={`h-full transition-all duration-1000 ${isNearLevelUp ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-600'}`}
          style={{ width: `${Math.min(100, xpPercent)}%` }}
        />
      </div>
    </div>
  );
};
