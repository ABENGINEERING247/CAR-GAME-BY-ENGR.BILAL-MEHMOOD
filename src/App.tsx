/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, CAR_COLORS } from './gameEngine';
import { GameMode, GameState, GameStats, PlayerCar } from './types';
import { sound } from './audio';
import { HUD } from './components/HUD';
import { StartScreen } from './components/StartScreen';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { MobileControls } from './components/MobileControls';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getMuted());
  const [isMusicOn, setIsMusicOn] = useState<boolean>(() => sound.isMusicOn());

  // HUD stats state
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: 0,
    distance: 0,
    speed: 0,
    maxSpeed: 0,
    multiplier: 1,
    nitro: 100,
    shield: 100,
    nearMisses: 0,
    coins: 0,
    timeRemaining: 90,
  });

  const [playerData, setPlayerData] = useState<PlayerCar>({
    x: 0,
    y: 0,
    width: 58,
    length: 110,
    speed: 0,
    targetSpeed: 0,
    maxSpeed: 175,
    acceleration: 48,
    braking: 75,
    handling: 2.2,
    steerAngle: 0,
    isBoosting: false,
    nitroRemaining: 100,
    shield: 100,
    color: CAR_COLORS[0],
    invulnerableTime: 0,
  });

  // Handle Export Standalone game.html
  const handleExportHtml = useCallback(async () => {
    try {
      // Fetch the generated game.html directly or generate blob
      const res = await fetch('/game.html');
      let htmlContent = '';
      if (res.ok) {
        htmlContent = await res.text();
      } else {
        htmlContent = `<!DOCTYPE html><html><head><title>Apex Nitro</title></head><body><h1>Apex Nitro</h1></body></html>`;
      }

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'game.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback direct window location
      window.open('/game.html', '_blank');
    }
  }, []);

  // Initialize Canvas and Game Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas);
    engineRef.current = engine;

    engine.onStatsUpdate = (newStats) => {
      setStats({ ...newStats });
      setPlayerData({ ...engine.player });
    };

    engine.onStateChange = (newState) => {
      setGameState(newState);
    };

    engine.onGameOver = (finalStats) => {
      setStats({ ...finalStats });
    };

    // Load initial high score
    setStats((prev) => ({ ...prev, highScore: engine.stats.highScore }));

    // Game loop running outside React renders
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      animId = requestAnimationFrame(loop);
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      engine.update(dt);
      engine.render();
    };

    animId = requestAnimationFrame(loop);

    // Resize listener
    const onResize = () => {
      engine.handleResize();
    };
    window.addEventListener('resize', onResize);

    // Keyboard bindings
    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        engine.setKey('up', true);
      }
      if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        engine.setKey('down', true);
      }
      if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        engine.setKey('left', true);
      }
      if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        engine.setKey('right', true);
      }
      if (e.code === 'Space') {
        e.preventDefault();
        engine.setKey('nitro', true);
        if (engine.state === 'menu') {
          engine.startRace();
        }
      }
      if (e.code === 'Enter') {
        if (engine.state === 'menu') {
          engine.startRace();
        }
      }
      if (e.code === 'KeyR') {
        if (engine.state === 'gameover' || engine.state === 'paused') {
          engine.startRace();
        }
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (engine.state === 'playing') {
          engine.pauseGame();
        } else if (engine.state === 'paused') {
          engine.resumeGame();
        }
      }
      if (e.code === 'KeyM') {
        const muted = sound.toggleMute();
        setIsMuted(muted);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) engine.setKey('up', false);
      if (['ArrowDown', 'KeyS'].includes(e.code)) engine.setKey('down', false);
      if (['ArrowLeft', 'KeyA'].includes(e.code)) engine.setKey('left', false);
      if (['ArrowRight', 'KeyD'].includes(e.code)) engine.setKey('right', false);
      if (e.code === 'Space') engine.setKey('nitro', false);
    };

    const onBlur = () => {
      engine.setKey('up', false);
      engine.setKey('down', false);
      engine.setKey('left', false);
      engine.setKey('right', false);
      engine.setKey('nitro', false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      sound.stopEngine();
    };
  }, []);

  // Control handlers
  const handleStart = () => {
    engineRef.current?.startRace();
  };

  const handlePause = () => {
    engineRef.current?.pauseGame();
  };

  const handleResume = () => {
    engineRef.current?.resumeGame();
  };

  const handleRestart = () => {
    engineRef.current?.startRace();
  };

  const handleHome = () => {
    engineRef.current?.returnToMenu();
  };

  const handleSelectColor = (index: number) => {
    setSelectedColorIndex(index);
    engineRef.current?.setCarColor(index);
  };

  const handleSelectMode = (mode: GameMode) => {
    setGameMode(mode);
    engineRef.current?.setMode(mode);
  };

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleMusic = () => {
    const next = !isMusicOn;
    sound.setMusicEnabled(next);
    setIsMusicOn(next);
  };

  const handleMobileControl = (key: 'up' | 'down' | 'left' | 'right' | 'nitro', active: boolean) => {
    engineRef.current?.setKey(key, active);
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* Isolated Canvas Viewport for 60fps simulation */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none cursor-default"
      />

      {/* Start / Menu Screen */}
      {gameState === 'menu' && (
        <StartScreen
          onStart={handleStart}
          selectedColorIndex={selectedColorIndex}
          onSelectColor={handleSelectColor}
          gameMode={gameMode}
          onSelectMode={handleSelectMode}
          highScore={stats.highScore}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Live In-Game HUD */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <HUD
          stats={stats}
          player={playerData}
          onPause={handlePause}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          isMusicOn={isMusicOn}
          onToggleMusic={handleToggleMusic}
        />
      )}

      {/* Mobile Touch Controls when playing */}
      {gameState === 'playing' && (
        <MobileControls onControlChange={handleMobileControl} />
      )}

      {/* Pause Modal */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={handleResume}
          onRestart={handleRestart}
          onHome={handleHome}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'gameover' && (
        <GameOverModal
          stats={stats}
          onRestart={handleRestart}
          onHome={handleHome}
          onExportHtml={handleExportHtml}
        />
      )}
    </main>
  );
}
