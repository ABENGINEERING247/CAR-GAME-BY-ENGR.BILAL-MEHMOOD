import React from 'react';
import { GameStats } from '../types';
import { RotateCcw, Home, Download, Trophy, Zap, Gauge, Award } from 'lucide-react';

interface GameOverModalProps {
  stats: GameStats;
  onRestart: () => void;
  onHome: () => void;
  onExportHtml: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  onRestart,
  onHome,
  onExportHtml,
}) => {
  const isNewRecord = stats.score >= stats.highScore && stats.score > 0;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md pointer-events-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Glow ambient light */}
        <div className="absolute -top-12 inset-x-0 mx-auto w-32 h-32 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header Badge */}
        {isNewRecord ? (
          <div className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-300 text-xs font-bold uppercase tracking-wider mb-3 animate-bounce">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>NEW HIGH SCORE!</span>
          </div>
        ) : (
          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-2">
            RACE REPORT
          </span>
        )}

        <h2 className="text-3xl md:text-4xl font-black italic tracking-wide text-white uppercase mb-1">
          {stats.shield <= 0 ? 'CRITICAL WRECK' : 'RACE COMPLETE'}
        </h2>
        <p className="text-xs text-slate-400 mb-6">Highway speed run concluded</p>

        {/* Primary Score Readout */}
        <div className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 mb-6">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">
            FINAL SCORE
          </span>
          <div className="text-4xl md:text-5xl font-black tabular-nums text-rose-500 tracking-tight">
            {stats.score.toLocaleString()}
          </div>
        </div>

        {/* Detailed Stats Grid */}
        <div className="grid grid-cols-3 gap-2 w-full mb-6">
          <div className="bg-slate-950/40 border border-slate-800/50 rounded-lg p-2.5">
            <div className="flex items-center justify-center text-cyan-400 mb-1">
              <Gauge className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">TOP SPEED</span>
            <span className="text-sm font-bold text-slate-200 tabular-nums">{stats.maxSpeed} MPH</span>
          </div>

          <div className="bg-slate-950/40 border border-slate-800/50 rounded-lg p-2.5">
            <div className="flex items-center justify-center text-amber-400 mb-1">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">DISTANCE</span>
            <span className="text-sm font-bold text-slate-200 tabular-nums">
              {(stats.distance / 1000).toFixed(2)} KM
            </span>
          </div>

          <div className="bg-slate-950/40 border border-slate-800/50 rounded-lg p-2.5">
            <div className="flex items-center justify-center text-rose-400 mb-1">
              <Award className="w-4 h-4" />
            </div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">NEAR MISSES</span>
            <span className="text-sm font-bold text-slate-200 tabular-nums">{stats.nearMisses}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={onRestart}
            className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-black text-sm md:text-base tracking-wider uppercase rounded-xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RACE AGAIN (R)</span>
          </button>

          <div className="flex items-center gap-2 w-full">
            <button
              onClick={onHome}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs md:text-sm font-bold rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Menu</span>
            </button>

            <button
              onClick={onExportHtml}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 text-xs md:text-sm font-bold rounded-lg border border-slate-700 hover:border-cyan-500/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title="Download standalone single-file game.html"
            >
              <Download className="w-4 h-4" />
              <span>Export HTML</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
