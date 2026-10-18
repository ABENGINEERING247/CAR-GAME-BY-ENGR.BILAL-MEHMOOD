import React from 'react';
import { ArrowLeft, ArrowRight, ChevronUp, ChevronDown, Zap } from 'lucide-react';

interface MobileControlsProps {
  onControlChange: (key: 'up' | 'down' | 'left' | 'right' | 'nitro', active: boolean) => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ onControlChange }) => {
  const bindControl = (key: 'up' | 'down' | 'left' | 'right' | 'nitro') => ({
    onTouchStart: (e: React.TouchEvent) => {
      e.preventDefault();
      onControlChange(key, true);
    },
    onTouchEnd: (e: React.TouchEvent) => {
      e.preventDefault();
      onControlChange(key, false);
    },
    onTouchCancel: (e: React.TouchEvent) => {
      e.preventDefault();
      onControlChange(key, false);
    },
    onMouseDown: (e: React.MouseEvent) => {
      e.preventDefault();
      onControlChange(key, true);
    },
    onMouseUp: (e: React.MouseEvent) => {
      e.preventDefault();
      onControlChange(key, false);
    },
    onMouseLeave: () => {
      onControlChange(key, false);
    },
  });

  return (
    <div className="absolute inset-x-0 bottom-3 md:hidden z-20 pointer-events-none flex items-end justify-between px-4 pb-2">
      {/* Steering Buttons (Left side) */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          {...bindControl('left')}
          className="w-14 h-14 rounded-2xl bg-slate-900/80 border border-slate-700/80 active:bg-rose-600/60 active:border-rose-400 text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-transform active:scale-95 touch-none"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <button
          {...bindControl('right')}
          className="w-14 h-14 rounded-2xl bg-slate-900/80 border border-slate-700/80 active:bg-rose-600/60 active:border-rose-400 text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-transform active:scale-95 touch-none"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
      </div>

      {/* Throttle, Brake & Nitro (Right side) */}
      <div className="pointer-events-auto flex items-end gap-2">
        <button
          {...bindControl('nitro')}
          className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/60 active:bg-cyan-500 text-cyan-300 active:text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-transform active:scale-95 touch-none"
          title="Nitro Boost"
        >
          <Zap className="w-5 h-5 fill-current" />
        </button>

        <button
          {...bindControl('down')}
          className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-500/60 active:bg-rose-600 text-rose-300 active:text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-transform active:scale-95 touch-none"
          title="Brake"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <button
          {...bindControl('up')}
          className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 active:bg-emerald-500 text-emerald-300 active:text-white flex items-center justify-center shadow-lg backdrop-blur-md transition-transform active:scale-95 touch-none"
          title="Gas / Accelerate"
        >
          <ChevronUp className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};
