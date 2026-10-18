import React from 'react';
import { CAR_COLORS } from '../gameEngine';
import { GameMode } from '../types';
import { Play, Sparkles, Trophy, Volume2, VolumeX, Flame } from 'lucide-react';

interface StartScreenProps {
  onStart: () => void;
  selectedColorIndex: number;
  onSelectColor: (index: number) => void;
  gameMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  highScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStart,
  selectedColorIndex,
  onSelectColor,
  gameMode,
  onSelectMode,
  highScore,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between p-6 md:p-10 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent pointer-events-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 text-xs md:text-sm text-slate-300 font-semibold tracking-widest uppercase">
          <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
          <span>CAR GAME · ENGR. BILAL MEHMOOD</span>
        </div>

        <div className="flex items-center gap-4">
          {highScore > 0 && (
            <div className="flex items-center gap-1.5 text-xs md:text-sm text-amber-400 font-bold bg-amber-950/40 border border-amber-600/30 px-3 py-1.5 rounded-lg">
              <Trophy className="w-3.5 h-3.5" />
              <span>RECORD: {highScore.toLocaleString()}</span>
            </div>
          )}

          <button
            onClick={onToggleMute}
            className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
            title="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Center: Bespoke Inline SVG Title Lockup */}
      <div className="flex flex-col items-center justify-center my-auto text-center max-w-2xl mx-auto">
        {/* Bespoke Chrome/Neon SVG Typography */}
        <div className="w-full max-w-lg mb-2">
          <svg viewBox="0 0 540 135" className="w-full filter drop-shadow-[0_4px_24px_rgba(244,63,94,0.45)]">
            <defs>
              <linearGradient id="titleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="30%" stopColor="#38bdf8" />
                <stop offset="65%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <linearGradient id="strokeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>
            <text
              x="50%"
              y="60"
              textAnchor="middle"
              className="font-black italic"
              style={{
                fontFamily: 'Impact, "Arial Black", sans-serif',
                fontSize: '66px',
                letterSpacing: '5px',
                fill: 'url(#titleGrad)',
                stroke: 'url(#strokeGrad)',
                strokeWidth: '1.5px',
              }}
            >
              CAR GAME
            </text>
            <text
              x="50%"
              y="105"
              textAnchor="middle"
              className="font-black uppercase tracking-[5px]"
              style={{
                fontFamily: 'system-ui, sans-serif',
                fontSize: '15px',
                fill: '#38bdf8',
                letterSpacing: '4px',
              }}
            >
              BY ENGR. BILAL MEHMOOD
            </text>
          </svg>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-xl mb-6 backdrop-blur-md">
          <button
            onClick={() => onSelectMode('classic')}
            className={`px-4 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${
              gameMode === 'classic'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Classic Endless
          </button>
          <button
            onClick={() => onSelectMode('timeAttack')}
            className={`px-4 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${
              gameMode === 'timeAttack'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Time Attack 60s
          </button>
        </div>

        {/* Car Color Picker */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
            SELECT MACHINE LIVERY
          </span>
          <div className="flex items-center gap-3">
            {CAR_COLORS.map((col, idx) => (
              <button
                key={col.id}
                onClick={() => onSelectColor(idx)}
                className={`relative w-8 h-8 rounded-full border-2 transition-all transform hover:scale-110 ${
                  selectedColorIndex === idx
                    ? 'border-white scale-110 shadow-[0_0_12px_rgba(255,255,255,0.6)] ring-2 ring-rose-500/50'
                    : 'border-slate-700 opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: col.primary }}
                title={col.name}
              />
            ))}
          </div>
          <span className="text-xs text-slate-300 font-medium">
            {CAR_COLORS[selectedColorIndex].name}
          </span>
        </div>

        {/* Primary Start CTA */}
        <button
          onClick={onStart}
          className="group relative px-10 py-4 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-lg md:text-xl tracking-wider uppercase rounded-xl shadow-[0_0_25px_rgba(244,63,94,0.5)] hover:shadow-[0_0_35px_rgba(244,63,94,0.8)] transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-3 cursor-pointer"
        >
          <Play className="w-6 h-6 fill-white" />
          <span>START RACE</span>
          <Sparkles className="w-5 h-5 opacity-75 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

      {/* Flat Control-Hint Line */}
      <div className="text-center text-xs md:text-sm text-slate-400 font-medium tracking-wide">
        <span className="text-slate-200 font-bold">W / A / S / D</span> or <span className="text-slate-200 font-bold">Arrows</span> Steer & Throttle · <span className="text-cyan-400 font-bold">Space</span> Nitro Boost · <span className="text-slate-200 font-bold">Esc</span> Pause
      </div>
    </div>
  );
};
