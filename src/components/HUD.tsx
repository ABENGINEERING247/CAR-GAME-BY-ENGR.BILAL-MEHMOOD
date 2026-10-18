import React from 'react';
import { GameStats, PlayerCar } from '../types';
import { sound } from '../audio';
import { Volume2, VolumeX, Music, Pause, Shield, Zap } from 'lucide-react';

interface HUDProps {
  stats: GameStats;
  player: PlayerCar;
  onPause: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isMusicOn: boolean;
  onToggleMusic: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  player,
  onPause,
  isMuted,
  onToggleMute,
  isMusicOn,
  onToggleMusic,
}) => {
  // Speedometer needle angle (-130 deg to +130 deg)
  const speedRatio = Math.min(1, stats.speed / 200);
  const needleAngle = -130 + speedRatio * 260;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 z-20 select-none">
      {/* Top Header Bar */}
      <div className="flex items-start justify-between w-full">
        {/* Left Cluster: Score & Multiplier */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">SCORE</span>
            {stats.multiplier > 1 && (
              <span className="text-xs font-black tracking-wide text-amber-400 animate-pulse">
                {stats.multiplier.toFixed(1)}x STREAK
              </span>
            )}
          </div>
          <div className="text-3xl md:text-4xl font-black tracking-tight text-white tabular-nums drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            {stats.score.toLocaleString()}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-300 font-medium tracking-wide">
            <span>HIGH: {stats.highScore.toLocaleString()}</span>
            <span>·</span>
            <span>{(stats.distance / 1000).toFixed(2)} KM</span>
          </div>
        </div>

        {/* Right Cluster: Control Buttons */}
        <div className="pointer-events-auto flex items-center gap-2">
          {stats.timeRemaining > 0 && (
            <div className="px-3 py-1.5 bg-rose-950/80 border border-rose-500/40 rounded-lg text-rose-300 font-mono text-sm font-bold tabular-nums shadow-lg mr-2">
              ⏱ {Math.ceil(stats.timeRemaining)}s
            </div>
          )}

          <button
            onClick={onToggleMusic}
            title="Toggle Music"
            className={`p-2.5 rounded-lg border transition-all backdrop-blur-sm ${
              isMusicOn
                ? 'bg-slate-900/70 border-slate-700/60 text-cyan-400 hover:border-cyan-500 hover:text-cyan-300'
                : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
          >
            <Music className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleMute}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className={`p-2.5 rounded-lg border transition-all backdrop-blur-sm ${
              !isMuted
                ? 'bg-slate-900/70 border-slate-700/60 text-slate-200 hover:border-slate-500'
                : 'bg-slate-900/50 border-slate-800 text-rose-400 hover:text-rose-300'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onPause}
            title="Pause Game (Esc)"
            className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-700/60 text-slate-200 hover:border-amber-500 hover:text-amber-400 transition-all backdrop-blur-sm"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Dashboard Cluster */}
      <div className="flex items-end justify-between w-full">
        {/* Left Gauge: Shield & Nitro Status */}
        <div className="flex flex-col gap-3 max-w-[200px] md:max-w-[240px]">
          {/* Shield Integrity */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-300 font-bold mb-1">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                SHIELD
              </span>
              <span className="font-mono tabular-nums">{stats.shield}%</span>
            </div>
            <div className="h-2 w-full bg-slate-950/80 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  stats.shield > 50
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_8px_#38bdf8]'
                    : stats.shield > 25
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-400'
                    : 'bg-gradient-to-r from-red-600 to-rose-400 animate-pulse'
                }`}
                style={{ width: `${stats.shield}%` }}
              />
            </div>
          </div>

          {/* Nitro Tank */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-300 font-bold mb-1">
              <span className="flex items-center gap-1 text-cyan-400">
                <Zap className="w-3.5 h-3.5" />
                NITRO BOOST
              </span>
              <span className="font-mono tabular-nums text-cyan-300">{stats.nitro}%</span>
            </div>
            <div className="h-2 w-full bg-slate-950/80 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  player.isBoosting
                    ? 'bg-cyan-300 shadow-[0_0_12px_#22d3ee] animate-pulse'
                    : 'bg-gradient-to-r from-cyan-600 to-teal-400'
                }`}
                style={{ width: `${stats.nitro}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Speedometer Cockpit Dial */}
        <div className="relative flex flex-col items-center justify-center">
          <div className="relative w-28 h-28 md:w-36 md:h-36 flex items-center justify-center">
            {/* Speedometer Arc SVG */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#1e293b"
                strokeWidth="6"
                strokeDasharray="200"
                strokeDashoffset="35"
                strokeLinecap="round"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="url(#speedGradient)"
                strokeWidth="6"
                strokeDasharray="200"
                strokeDashoffset={200 - (stats.speed / 200) * 165}
                strokeLinecap="round"
                className="transition-all duration-100 ease-out"
              />
              <defs>
                <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="60%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
            </svg>

            {/* Needle Pivot Indicator */}
            <div
              className="absolute w-full h-full flex items-center justify-center pointer-events-none transition-transform duration-100 ease-out"
              style={{ transform: `rotate(${needleAngle}deg)` }}
            >
              <div className="w-1 md:w-1.5 h-12 md:h-16 bg-gradient-to-t from-red-500 to-amber-300 rounded-full -translate-y-6 md:-translate-y-8 shadow-[0_0_8px_#ef4444]" />
            </div>

            {/* Center Speed Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl md:text-3xl font-black tracking-tighter text-white tabular-nums drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                {stats.speed}
              </span>
              <span className="text-[10px] md:text-xs font-bold text-slate-400 tracking-wider">
                MPH
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
