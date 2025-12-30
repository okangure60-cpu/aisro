
import React, { useMemo } from 'react';
import { PlayerStats } from '../types';
import { getXpRequired } from '../constants';

interface StatusBarProps {
  stats: PlayerStats;
}

export const StatusBar: React.FC<StatusBarProps> = ({ stats }) => {
  const xpRequired = useMemo(() => getXpRequired(stats.lvl), [stats.lvl]);
  const hpPercent = (stats.hp / stats.maxHp) * 100;
  const xpPercent = (stats.xp / xpRequired) * 100;

  // Visual logic for XP bar
  const isNearLevelUp = xpPercent >= 80;
  const isVeryClose = xpPercent >= 95;

  return (
    <div className="w-full bg-slate-900 border-b border-amber-900/40 p-3 pt-4 flex flex-col gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative z-30">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2.5">
          <div className="bg-amber-600 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded shadow-[0_0_10px_rgba(217,119,6,0.4)]">
            LVL {stats.lvl}
          </div>
          <span className="text-slate-200 text-xs font-bold tracking-wide">SAVAŞÇI</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-amber-500 text-[10px] font-black tracking-tight">💰 {stats.gold.toLocaleString()}</span>
          <span className="text-slate-500 text-[9px] font-bold uppercase">Altın</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Health Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] font-black px-1">
            <span className="text-red-500 uppercase tracking-tighter">Sağlık</span>
            <span className="text-slate-300 font-mono">{Math.round(stats.hp)}</span>
          </div>
          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(239,68,68,0.3)]"
              style={{ width: `${Math.max(0, hpPercent)}%` }}
            />
          </div>
        </div>

        {/* XP Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] font-black px-1">
            <span className={`uppercase tracking-tighter transition-colors duration-300 ${isNearLevelUp ? 'text-cyan-400 animate-pulse' : 'text-emerald-500'}`}>
              Tecrübe {isVeryClose ? '!!' : ''}
            </span>
            <span className="text-slate-300 font-mono">{Math.round(xpPercent)}%</span>
          </div>
          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 shadow-inner relative">
            {/* Base Progress Bar */}
            <div 
              className={`h-full transition-all duration-700 ease-out relative z-10 ${
                isNearLevelUp 
                  ? 'bg-gradient-to-r from-cyan-600 to-emerald-400' 
                  : 'bg-gradient-to-r from-emerald-700 to-emerald-400'
              }`}
              style={{ width: `${Math.min(100, xpPercent)}%` }}
            >
              {/* Shine effect for near level up */}
              {isNearLevelUp && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite] pointer-events-none" />
              )}
            </div>
            
            {/* Outer Glow when near level up */}
            {isNearLevelUp && (
              <div 
                className="absolute inset-0 bg-cyan-500/20 blur-[2px] animate-pulse"
                style={{ width: `${Math.min(100, xpPercent)}%` }}
              />
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};
