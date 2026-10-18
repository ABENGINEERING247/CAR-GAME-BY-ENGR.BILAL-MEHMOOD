import {
  CarColor,
  GameMode,
  GameState,
  GameStats,
  Particle,
  PickupItem,
  PickupType,
  PlayerCar,
  ScorePopup,
  TrafficType,
  TrafficVehicle,
} from './types';
import { sound } from './audio';

export const CAR_COLORS: CarColor[] = [
  { id: 'crimson', name: 'Apex Crimson', primary: '#e11d48', secondary: '#9f1239', glow: '#fb7185', accent: '#ffe4e6' },
  { id: 'cyan', name: 'Cyber Neon', primary: '#06b6d4', secondary: '#0e7490', glow: '#67e8f9', accent: '#cffafe' },
  { id: 'gold', name: 'Tokyo Gold', primary: '#f59e0b', secondary: '#b45309', glow: '#fcd34d', accent: '#fef3c7' },
  { id: 'purple', name: 'Midnight Violet', primary: '#8b5cf6', secondary: '#5b21b6', glow: '#c4b5fd', accent: '#f5f3ff' },
  { id: 'lime', name: 'Toxic Lime', primary: '#10b981', secondary: '#047857', glow: '#6ee7b7', accent: '#d1fae5' },
  { id: 'stealth', name: 'Stealth Onyx', primary: '#1e293b', secondary: '#0f172a', glow: '#f43f5e', accent: '#ffffff' },
];

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  public state: GameState = 'menu';
  public mode: GameMode = 'classic';
  public stats: GameStats = {
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
  };

  // Keyboard input states
  private keys: Record<string, boolean> = {
    up: false,
    down: false,
    left: false,
    right: false,
    nitro: false,
  };

  // Player car
  public player: PlayerCar;
  public selectedColorIndex: number = 0;

  // Road & Environment
  private roadOffset: number = 0;
  private roadCurvature: number = 0;
  private targetCurvature: number = 0;
  private curveTimer: number = 0;
  private horizonY: number = 0;
  private roadWidthBottom: number = 0;
  private roadWidthTop: number = 0;

  // Entities
  private traffic: TrafficVehicle[] = [];
  private pickups: PickupItem[] = [];
  private particles: Particle[] = [];
  private popups: ScorePopup[] = [];
  private roadsidePoles: { z: number; side: -1 | 1 }[] = [];

  // Spawn timers & progression
  private nextTrafficSpawn: number = 1.0;
  private nextPickupSpawn: number = 3.5;
  private vehicleIdCounter: number = 1;
  private gameTime: number = 0;
  private comboStreakTimer: number = 0;

  // Camera Shake & Hitstop
  private screenShake: number = 0;
  private hitstopTimer: number = 0;

  // Callbacks
  public onStatsUpdate?: (stats: GameStats) => void;
  public onGameOver?: (stats: GameStats) => void;
  public onStateChange?: (state: GameState) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;

    // Load highscore
    try {
      const saved = localStorage.getItem('apex_high_score');
      if (saved) this.stats.highScore = parseInt(saved, 10) || 0;
    } catch {
      // ignore
    }

    this.player = {
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
    };

    this.initRoadsidePoles();
    this.handleResize();
  }

  private initRoadsidePoles() {
    this.roadsidePoles = [];
    for (let i = 0; i < 18; i++) {
      this.roadsidePoles.push({
        z: (i / 18) * 1000,
        side: i % 2 === 0 ? -1 : 1,
      });
    }
  }

  public handleResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;
    this.horizonY = h * 0.38;
    this.roadWidthBottom = Math.min(w * 0.82, 680);
    this.roadWidthTop = this.roadWidthBottom * 0.16;
    this.player.y = h * 0.78;
  }

  public setCarColor(index: number) {
    this.selectedColorIndex = (index + CAR_COLORS.length) % CAR_COLORS.length;
    this.player.color = CAR_COLORS[this.selectedColorIndex];
  }

  public setMode(mode: GameMode) {
    this.mode = mode;
  }

  public startRace() {
    sound.userInteracted();
    this.state = 'playing';
    this.onStateChange?.(this.state);

    this.stats = {
      score: 0,
      highScore: this.stats.highScore,
      distance: 0,
      speed: 40,
      maxSpeed: 40,
      multiplier: 1,
      nitro: 100,
      shield: 100,
      nearMisses: 0,
      coins: 0,
      timeRemaining: this.mode === 'timeAttack' ? 60 : 0,
    };

    this.player.x = 0;
    this.player.speed = 40;
    this.player.steerAngle = 0;
    this.player.isBoosting = false;
    this.player.nitroRemaining = 100;
    this.player.shield = 100;
    this.player.invulnerableTime = 0;

    this.traffic = [];
    this.pickups = [];
    this.particles = [];
    this.popups = [];
    this.gameTime = 0;
    this.comboStreakTimer = 0;
    this.nextTrafficSpawn = 0.8;
    this.nextPickupSpawn = 2.0;

    sound.startEngine();
  }

  public pauseGame() {
    if (this.state === 'playing') {
      this.state = 'paused';
      sound.stopEngine();
      this.onStateChange?.(this.state);
    }
  }

  public resumeGame() {
    if (this.state === 'paused') {
      sound.userInteracted();
      this.state = 'playing';
      sound.startEngine();
      this.onStateChange?.(this.state);
    }
  }

  public returnToMenu() {
    this.state = 'menu';
    sound.stopEngine();
    this.onStateChange?.(this.state);
  }

  // Key controls
  public setKey(key: 'up' | 'down' | 'left' | 'right' | 'nitro', active: boolean) {
    this.keys[key] = active;
  }

  // Game update cycle
  public update(rawDt: number) {
    const dt = Math.min(rawDt, 0.05); // clamp delta time for stability

    // Handle hitstop freeze
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
      return;
    }

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 15);
    }

    // Dynamic curve generator
    this.curveTimer -= dt;
    if (this.curveTimer <= 0) {
      this.targetCurvature = (Math.random() - 0.5) * 1.6;
      this.curveTimer = 4 + Math.random() * 5;
    }
    this.roadCurvature += (this.targetCurvature - this.roadCurvature) * dt * 0.8;

    if (this.state === 'playing') {
      this.updatePlaying(dt);
    } else if (this.state === 'menu') {
      this.updateMenuDemo(dt);
    }

    this.updateParticles(dt);
    this.updatePopups(dt);
  }

  private updatePlaying(dt: number) {
    this.gameTime += dt;

    // Time attack countdown
    if (this.mode === 'timeAttack') {
      this.stats.timeRemaining = Math.max(0, this.stats.timeRemaining - dt);
      if (this.stats.timeRemaining <= 0) {
        this.triggerGameOver('Time Expired!');
        return;
      }
    }

    // Nitro consumption and recharge
    const wantsNitro = this.keys.nitro && this.player.nitroRemaining > 5;
    if (wantsNitro && !this.player.isBoosting) {
      this.player.isBoosting = true;
      sound.startNitro();
      this.addPopup('NITRO BURST!', 100, this.player.x, '#06b6d4');
      this.screenShake = Math.max(this.screenShake, 3);
    } else if (!wantsNitro && this.player.isBoosting) {
      this.player.isBoosting = false;
      sound.stopNitro();
    }

    if (this.player.isBoosting) {
      this.player.nitroRemaining = Math.max(0, this.player.nitroRemaining - dt * 28);
      if (this.player.nitroRemaining <= 0) {
        this.player.isBoosting = false;
        sound.stopNitro();
      }
    } else {
      // Slow automatic nitro recharge over time
      this.player.nitroRemaining = Math.min(100, this.player.nitroRemaining + dt * 4);
    }

    // Speed target calculation
    let maxAllowedSpeed = this.player.maxSpeed;
    if (this.player.isBoosting) {
      maxAllowedSpeed += 55; // 230 mph in nitro!
    }

    if (this.keys.up) {
      this.player.targetSpeed = maxAllowedSpeed;
    } else if (this.keys.down) {
      this.player.targetSpeed = 30; // brake
    } else {
      this.player.targetSpeed = 75; // cruising idle
    }

    // Acceleration physics
    if (this.player.speed < this.player.targetSpeed) {
      const accel = this.player.isBoosting ? this.player.acceleration * 2.2 : this.player.acceleration;
      this.player.speed = Math.min(this.player.targetSpeed, this.player.speed + accel * dt);
    } else if (this.player.speed > this.player.targetSpeed) {
      const decel = this.keys.down ? this.player.braking * 1.5 : this.player.braking * 0.4;
      this.player.speed = Math.max(this.player.targetSpeed, this.player.speed - decel * dt);
    }

    // Steering physics & lateral drag
    const steerSpeed = this.player.handling * (0.6 + (this.player.speed / 140) * 0.4);
    let targetSteerAngle = 0;
    if (this.keys.left) {
      this.player.x -= steerSpeed * dt;
      targetSteerAngle = -1;
    }
    if (this.keys.right) {
      this.player.x += steerSpeed * dt;
      targetSteerAngle = 1;
    }

    // Road curvature inertia pulls player slightly
    this.player.x -= this.roadCurvature * (this.player.speed / 140) * dt * 0.35;

    // Smooth steer body roll angle
    this.player.steerAngle += (targetSteerAngle - this.player.steerAngle) * dt * 10;

    // Road shoulder friction / boundary constraints
    if (Math.abs(this.player.x) > 0.95) {
      this.player.speed = Math.max(30, this.player.speed - dt * 60);
      this.screenShake = Math.max(this.screenShake, 2);
      this.emitTireSmoke(0.5);
      // Hard clamp
      this.player.x = Math.max(-1.1, Math.min(1.1, this.player.x));
    }

    // Tire smoke on hard turns or heavy braking
    if (this.keys.down && this.player.speed > 60) {
      this.emitTireSmoke(0.8);
      sound.playTireScreech(0.4);
    }

    // Nitro flame particles
    if (this.player.isBoosting) {
      this.emitNitroFlames();
    }

    // Audio update
    sound.updateEngine(this.player.speed / 120, this.keys.up, this.keys.down);

    // Progression: Distance & Score
    const metersPerSec = (this.player.speed * 1609.34) / 3600;
    this.stats.distance += metersPerSec * dt;
    this.roadOffset += this.player.speed * dt * 22;

    // Multiplier based on speed: higher speed = huge score boosts
    let speedMult = 1.0;
    if (this.player.speed > 160) speedMult = 3.5;
    else if (this.player.speed > 130) speedMult = 2.5;
    else if (this.player.speed > 100) speedMult = 1.8;
    else if (this.player.speed > 70) speedMult = 1.2;

    this.stats.multiplier = speedMult;
    this.stats.score += Math.floor(metersPerSec * speedMult * dt * 5);
    if (this.player.speed > this.stats.maxSpeed) {
      this.stats.maxSpeed = Math.floor(this.player.speed);
    }
    this.stats.speed = Math.floor(this.player.speed);
    this.stats.nitro = Math.floor(this.player.nitroRemaining);
    this.stats.shield = Math.floor(this.player.shield);

    if (this.stats.score > this.stats.highScore) {
      this.stats.highScore = this.stats.score;
      try {
        localStorage.setItem('apex_high_score', String(this.stats.highScore));
      } catch {
        // ignore
      }
    }

    if (this.player.invulnerableTime > 0) {
      this.player.invulnerableTime -= dt;
    }

    // Combo streak decay
    if (this.comboStreakTimer > 0) {
      this.comboStreakTimer -= dt;
    }

    // Traffic Spawning
    this.nextTrafficSpawn -= dt;
    if (this.nextTrafficSpawn <= 0) {
      this.spawnTrafficVehicle();
      // Difficulty ramp: spawns get faster as distance increases
      const minInterval = Math.max(0.45, 1.3 - (this.stats.distance / 12000) * 0.7);
      this.nextTrafficSpawn = minInterval + Math.random() * 0.65;
    }

    // Pickup Spawning
    this.nextPickupSpawn -= dt;
    if (this.nextPickupSpawn <= 0) {
      this.spawnPickupItem();
      this.nextPickupSpawn = 3.5 + Math.random() * 3.5;
    }

    // Update traffic vehicles
    this.updateTraffic(dt);

    // Update Pickups
    this.updatePickups(dt);

    // Update roadside poles
    this.roadsidePoles.forEach(p => {
      p.z -= this.player.speed * dt * 10;
      if (p.z < 0) p.z += 1000;
    });

    this.onStatsUpdate?.(this.stats);
  }

  private updateMenuDemo(dt: number) {
    this.player.speed = 105;
    this.roadOffset += this.player.speed * dt * 20;
    this.player.x = Math.sin(this.gameTime * 0.8) * 0.45;
    this.player.steerAngle = Math.cos(this.gameTime * 0.8) * 0.3;
    this.gameTime += dt;

    // Roadside poles
    this.roadsidePoles.forEach(p => {
      p.z -= this.player.speed * dt * 10;
      if (p.z < 0) p.z += 1000;
    });

    // Spawn occasional scenic cars in menu
    this.nextTrafficSpawn -= dt;
    if (this.nextTrafficSpawn <= 0) {
      this.spawnTrafficVehicle();
      this.nextTrafficSpawn = 1.2 + Math.random() * 1.0;
    }
    this.updateTraffic(dt);
  }

  private spawnTrafficVehicle() {
    // 4 lanes: -0.75, -0.25, 0.25, 0.75
    const lanes = [-0.72, -0.24, 0.24, 0.72];
    const laneIndex = Math.floor(Math.random() * 4);
    const targetX = lanes[laneIndex];

    // Check if there is already a car nearby in this lane
    const tooClose = this.traffic.some(t => Math.abs(t.x - targetX) < 0.25 && t.y > 700);
    if (tooClose && Math.random() > 0.3) return;

    const types: TrafficType[] = ['sedan', 'sedan', 'sport', 'truck', 'taxi', 'supercar'];
    const chosenType = types[Math.floor(Math.random() * types.length)];

    let length = 95;
    let width = 50;
    let baseSpeed = 50 + Math.random() * 45;
    let color = '#3b82f6';

    switch (chosenType) {
      case 'truck':
        length = 150;
        width = 56;
        baseSpeed = 42 + Math.random() * 20;
        color = '#64748b';
        break;
      case 'sport':
        length = 98;
        width = 52;
        baseSpeed = 75 + Math.random() * 30;
        color = '#f43f5e';
        break;
      case 'supercar':
        length = 96;
        width = 54;
        baseSpeed = 90 + Math.random() * 35;
        color = '#a855f7';
        break;
      case 'taxi':
        length = 95;
        width = 50;
        baseSpeed = 55 + Math.random() * 25;
        color = '#eab308';
        break;
      default:
        color = ['#3b82f6', '#10b981', '#f97316', '#ec4899', '#94a3b8'][Math.floor(Math.random() * 5)];
        break;
    }

    this.traffic.push({
      id: this.vehicleIdCounter++,
      x: targetX,
      y: 1100, // Spawn at horizon (far ahead in distance)
      lane: laneIndex,
      targetLane: laneIndex,
      laneChangeTimer: 2 + Math.random() * 6,
      speed: baseSpeed,
      type: chosenType,
      color,
      width,
      length,
      blinker: false,
      blinkerTimer: 0,
    });
  }

  private spawnPickupItem() {
    const lanes = [-0.72, -0.24, 0.24, 0.72];
    const laneIndex = Math.floor(Math.random() * 4);
    const types: PickupType[] = ['coin', 'coin', 'coin', 'nitro', 'shield'];
    const type = types[Math.floor(Math.random() * types.length)];

    this.pickups.push({
      id: this.vehicleIdCounter++,
      x: lanes[laneIndex],
      y: 1100,
      lane: laneIndex,
      type,
      collected: false,
      pulseTimer: 0,
    });
  }

  private updateTraffic(dt: number) {
    for (let i = this.traffic.length - 1; i >= 0; i--) {
      const v = this.traffic[i];

      // Relative speed relative to player
      // When player drives 120 mph and car drives 60 mph, car moves toward player at 60 mph
      const relSpeed = this.player.speed - v.speed;
      v.y -= relSpeed * dt * 10;

      // AI Lane changing behavior
      v.laneChangeTimer -= dt;
      if (v.laneChangeTimer <= 0 && v.lane === v.targetLane && Math.random() < 0.4) {
        // Pick adjacent lane
        const shift = Math.random() < 0.5 ? -1 : 1;
        const newLane = v.lane + shift;
        if (newLane >= 0 && newLane <= 3) {
          v.targetLane = newLane;
          v.blinker = true;
          v.laneChangeTimer = 4 + Math.random() * 4;
        }
      }

      // Smoothly steer towards target lane
      const lanes = [-0.72, -0.24, 0.24, 0.72];
      const targetX = lanes[v.targetLane];
      if (Math.abs(v.x - targetX) > 0.02) {
        v.x += (targetX - v.x) * dt * 2.2;
      } else {
        v.lane = v.targetLane;
        v.blinker = false;
      }

      // Blinker animation
      if (v.blinker) {
        v.blinkerTimer = (v.blinkerTimer + dt * 6) % 1;
      }

      // Collision Check with Player
      if (this.state === 'playing') {
        this.checkTrafficCollision(v);
      }

      // Remove vehicles that are far behind or despawned
      if (v.y < -300 || v.y > 1500) {
        this.traffic.splice(i, 1);
      }
    }
  }

  private checkTrafficCollision(v: TrafficVehicle) {
    // Player is at z=0 (in distance units). When v.y is close to 0, they are in the same plane
    const zDist = Math.abs(v.y);
    const xDist = Math.abs(v.x - this.player.x);

    // Collision Box
    const zCollisionThreshold = (v.length + this.player.length) * 0.32;
    const xCollisionThreshold = 0.24; // Road units ~ car width

    if (zDist < zCollisionThreshold && xDist < xCollisionThreshold) {
      if (this.player.invulnerableTime <= 0) {
        this.handleCrash(v);
      }
    } else if (zDist < 80 && xDist < 0.38 && !v.nearMissAwarded && v.y < 0) {
      // Near miss! Award bonus points
      v.nearMissAwarded = true;
      this.stats.nearMisses++;
      const bonus = 250 * this.stats.multiplier;
      this.stats.score += bonus;
      this.addPopup(`CLOSE CALL! +${bonus}`, bonus, this.player.x, '#fbbf24');
      sound.playNearMiss();
      this.screenShake = Math.max(this.screenShake, 4);
    }
  }

  private handleCrash(v: TrafficVehicle) {
    sound.playCrash();
    this.screenShake = 14;
    this.hitstopTimer = 0.08; // 80ms satisfying hitstop
    this.player.invulnerableTime = 1.2;

    // Damage absorption by shield
    const speedRatio = Math.max(1, this.player.speed / 70);
    const damage = Math.floor(35 * speedRatio);
    this.player.shield -= damage;

    // Speed penalty
    this.player.speed = Math.max(25, this.player.speed * 0.4);

    // Sparks & explosion particles
    const rect = this.canvas.getBoundingClientRect();
    const px = rect.width / 2 + this.player.x * (this.roadWidthBottom * 0.45);
    const py = this.player.y;

    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 220;
      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 6,
        alpha: 1,
        decay: 1.2 + Math.random() * 1.5,
        color: Math.random() > 0.4 ? '#f97316' : '#e11d48',
        type: 'fire',
      });
    }

    if (this.player.shield <= 0) {
      this.player.shield = 0;
      this.triggerGameOver('Wrecked!');
    } else {
      this.addPopup(`IMPACT! -${damage}% SHIELD`, 0, this.player.x, '#ef4444');
    }
  }

  private triggerGameOver(reason: string) {
    this.state = 'gameover';
    sound.stopEngine();
    sound.stopNitro();
    this.onStateChange?.(this.state);
    this.onGameOver?.(this.stats);
    this.addPopup(reason, 0, this.player.x, '#f43f5e');
  }

  private updatePickups(dt: number) {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      const relSpeed = this.player.speed;
      p.y -= relSpeed * dt * 10;
      p.pulseTimer += dt * 4;

      // Pickup collection
      if (!p.collected && Math.abs(p.y) < 60 && Math.abs(p.x - this.player.x) < 0.28) {
        p.collected = true;
        this.collectPickup(p);
      }

      if (p.collected || p.y < -150) {
        this.pickups.splice(i, 1);
      }
    }
  }

  private collectPickup(p: PickupItem) {
    sound.playPickup(p.type);
    switch (p.type) {
      case 'nitro':
        this.player.nitroRemaining = Math.min(100, this.player.nitroRemaining + 40);
        this.addPopup('NITRO REFILL!', 200, p.x, '#06b6d4');
        break;
      case 'coin':
        this.stats.coins++;
        const points = 500 * this.stats.multiplier;
        this.stats.score += points;
        this.addPopup(`BONUS +${points}`, points, p.x, '#f59e0b');
        break;
      case 'shield':
        this.player.shield = Math.min(100, this.player.shield + 35);
        this.addPopup('SHIELD REPAIR!', 150, p.x, '#3b82f6');
        break;
    }
  }

  private emitTireSmoke(intensity: number) {
    const rect = this.canvas.getBoundingClientRect();
    const px = rect.width / 2 + this.player.x * (this.roadWidthBottom * 0.45);
    const py = this.player.y + this.player.length * 0.4;

    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x: px + (Math.random() - 0.5) * this.player.width,
        y: py,
        vx: (Math.random() - 0.5) * 40,
        vy: 30 + Math.random() * 50,
        size: 8 + Math.random() * 12,
        alpha: 0.5 * intensity,
        decay: 1.8,
        color: '#e2e8f0',
        type: 'smoke',
      });
    }
  }

  private emitNitroFlames() {
    const rect = this.canvas.getBoundingClientRect();
    const px = rect.width / 2 + this.player.x * (this.roadWidthBottom * 0.45);
    const py = this.player.y + this.player.length * 0.46;

    // Dual exhaust positions
    const offsets = [-14, 14];
    offsets.forEach(off => {
      this.particles.push({
        x: px + off + (Math.random() - 0.5) * 4,
        y: py,
        vx: (Math.random() - 0.5) * 20,
        vy: 140 + Math.random() * 100,
        size: 4 + Math.random() * 8,
        alpha: 0.9,
        decay: 4.5,
        color: Math.random() > 0.3 ? '#38bdf8' : '#818cf8',
        type: 'nitro',
      });
    });
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= p.decay * dt;
      p.size += dt * 8;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private addPopup(text: string, points: number, roadX: number, color: string) {
    const rect = this.canvas.getBoundingClientRect();
    const x = rect.width / 2 + roadX * (this.roadWidthBottom * 0.45);
    const y = this.player.y - 40;
    this.popups.push({
      id: Date.now() + Math.random(),
      text,
      points,
      x,
      y,
      alpha: 1,
      scale: 1.4,
      color,
    });
  }

  private updatePopups(dt: number) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.y -= dt * 45;
      pop.alpha -= dt * 1.2;
      pop.scale = Math.max(1, pop.scale - dt * 2);
      if (pop.alpha <= 0) {
        this.popups.splice(i, 1);
      }
    }
  }

  // RENDER PIPELINE
  public render() {
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    const ctx = this.ctx;

    ctx.save();

    // Screen shake
    if (this.screenShake > 0) {
      const dx = (Math.random() - 0.5) * this.screenShake;
      const dy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(dx, dy);
    }

    // 1. Sky & Horizon Backdrop
    this.renderSky(ctx, w, h);

    // 2. Road & Ground
    this.renderRoad(ctx, w, h);

    // 3. Roadside Street Lights / Poles
    this.renderRoadside(ctx, w, h);

    // 4. Pickups
    this.renderPickups(ctx, w, h);

    // 5. Traffic Vehicles
    this.renderTraffic(ctx, w, h);

    // 6. Player Car
    this.renderPlayer(ctx, w, h);

    // 7. Particles
    this.renderParticles(ctx);

    // 8. Speed Lines at Extreme Speeds
    if (this.player.speed > 135 || this.player.isBoosting) {
      this.renderSpeedLines(ctx, w, h);
    }

    // 9. Score Popups
    this.renderPopups(ctx);

    ctx.restore();
  }

  private renderSky(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Synthwave Dusk Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.horizonY);
    skyGrad.addColorStop(0, '#090514');
    skyGrad.addColorStop(0.4, '#240a34');
    skyGrad.addColorStop(0.75, '#5b144b');
    skyGrad.addColorStop(1, '#ff4655');

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, this.horizonY);

    // Distant Neon Sun / Synth Moon
    const sunX = w * 0.5 - this.roadCurvature * 60;
    const sunY = this.horizonY - 24;
    const sunRadius = 55;

    ctx.save();
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    const sunGrad = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
    sunGrad.addColorStop(0, '#fffae0');
    sunGrad.addColorStop(0.35, '#ffaa00');
    sunGrad.addColorStop(0.8, '#ff007f');
    sunGrad.addColorStop(1, '#7900ff');
    ctx.fillStyle = sunGrad;
    ctx.fill();

    // Retro sun horizontal blinds / slats
    ctx.fillStyle = '#090514';
    for (let i = 0; i < 7; i++) {
      const slatY = sunY + 5 + i * 7;
      const slatH = 1.2 + i * 0.6;
      ctx.fillRect(sunX - sunRadius, slatY, sunRadius * 2, slatH);
    }
    ctx.restore();

    // Distant Skyline / Mountain Silhouettes
    ctx.fillStyle = '#140c26';
    ctx.beginPath();
    ctx.moveTo(0, this.horizonY);
    const step = 40;
    for (let x = 0; x <= w + step; x += step) {
      const p = x / w;
      const hillH = Math.sin(p * 14 + this.roadCurvature * 2) * 16 + Math.cos(p * 7) * 22 + 25;
      ctx.lineTo(x, this.horizonY - hillH);
    }
    ctx.lineTo(w, this.horizonY);
    ctx.closePath();
    ctx.fill();
  }

  private renderRoad(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const centerX = w / 2;
    const horizon = this.horizonY;
    const roadBottomW = this.roadWidthBottom;
    const roadTopW = this.roadWidthTop;

    // Horizon line glow
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(w, horizon);
    ctx.stroke();

    // Roadside ground terrain
    const groundGrad = ctx.createLinearGradient(0, horizon, 0, h);
    groundGrad.addColorStop(0, '#100c22');
    groundGrad.addColorStop(1, '#080512');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, horizon, w, h - horizon);

    // Retro Neon Ground Grid on the sides
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 65) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(centerX + (x - centerX) * 0.1, horizon);
      ctx.stroke();
    }

    // Asphalt Main Road Surface
    const p1x = centerX - roadTopW / 2 + this.roadCurvature * 40;
    const p2x = centerX + roadTopW / 2 + this.roadCurvature * 40;
    const p3x = centerX + roadBottomW / 2;
    const p4x = centerX - roadBottomW / 2;

    const asphaltGrad = ctx.createLinearGradient(0, horizon, 0, h);
    asphaltGrad.addColorStop(0, '#1e2230');
    asphaltGrad.addColorStop(0.5, '#161922');
    asphaltGrad.addColorStop(1, '#0e1118');

    ctx.fillStyle = asphaltGrad;
    ctx.beginPath();
    ctx.moveTo(p1x, horizon);
    ctx.lineTo(p2x, horizon);
    ctx.lineTo(p3x, h);
    ctx.lineTo(p4x, h);
    ctx.closePath();
    ctx.fill();

    // Road Rumble Strips (Shoulder Curbs)
    this.renderRumbleStrips(ctx, p1x, p2x, p3x, p4x, horizon, h);

    // Lane Dividers (4 lanes -> 3 divider lines)
    const laneFractions = [-0.5, 0, 0.5]; // Between 4 lanes: -1 to 1
    laneFractions.forEach(frac => {
      this.renderLaneLine(ctx, frac, horizon, h, centerX, roadTopW, roadBottomW);
    });
  }

  private renderRumbleStrips(
    ctx: CanvasRenderingContext2D,
    p1x: number,
    p2x: number,
    p3x: number,
    p4x: number,
    horizon: number,
    bottomY: number
  ) {
    const numSteps = 24;
    for (let i = 0; i < numSteps; i++) {
      const t1 = i / numSteps;
      const t2 = (i + 1) / numSteps;

      // Perspective curved projection
      const y1 = horizon + Math.pow(t1, 1.8) * (bottomY - horizon);
      const y2 = horizon + Math.pow(t2, 1.8) * (bottomY - horizon);

      // Alternating red/white stripes moving with roadOffset
      const stripePhase = Math.floor((this.roadOffset * 0.15 + i)) % 2 === 0;
      ctx.fillStyle = stripePhase ? '#ef4444' : '#f8fafc';

      const curbW1 = 4 + t1 * 18;
      const curbW2 = 4 + t2 * 18;

      // Left curb
      const lx1 = p1x + (p4x - p1x) * t1;
      const lx2 = p1x + (p4x - p1x) * t2;
      ctx.beginPath();
      ctx.moveTo(lx1, y1);
      ctx.lineTo(lx1 - curbW1, y1);
      ctx.lineTo(lx2 - curbW2, y2);
      ctx.lineTo(lx2, y2);
      ctx.closePath();
      ctx.fill();

      // Right curb
      const rx1 = p2x + (p3x - p2x) * t1;
      const rx2 = p2x + (p3x - p2x) * t2;
      ctx.beginPath();
      ctx.moveTo(rx1, y1);
      ctx.lineTo(rx1 + curbW1, y1);
      ctx.lineTo(rx2 + curbW2, y2);
      ctx.lineTo(rx2, y2);
      ctx.closePath();
      ctx.fill();
    }
  }

  private renderLaneLine(
    ctx: CanvasRenderingContext2D,
    laneOffset: number,
    horizon: number,
    bottomY: number,
    centerX: number,
    roadTopW: number,
    roadBottomW: number
  ) {
    const segments = 22;
    for (let i = 0; i < segments; i++) {
      // Dashed marker with moving road offset
      const cycle = (i - (this.roadOffset * 0.08) % 1 + segments) % segments;
      const t = cycle / segments;
      const tNext = Math.min(1, (cycle + 0.45) / segments);

      const y1 = horizon + Math.pow(t, 2) * (bottomY - horizon);
      const y2 = horizon + Math.pow(tNext, 2) * (bottomY - horizon);

      const topX = centerX + this.roadCurvature * 40 + (laneOffset * roadTopW * 0.48);
      const bottomX = centerX + (laneOffset * roadBottomW * 0.48);

      const x1 = topX + (bottomX - topX) * t;
      const x2 = topX + (bottomX - topX) * tNext;

      const lineWidth = 1.2 + t * 4;

      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  private renderRoadside(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const centerX = w / 2;
    const horizon = this.horizonY;

    this.roadsidePoles.forEach(pole => {
      // z goes from 0 (at player) to 1000 (at horizon)
      const t = 1 - pole.z / 1000;
      if (t <= 0 || t >= 1) return;

      const screenY = horizon + Math.pow(t, 2) * (h - horizon);
      const roadHalfW = (this.roadWidthTop + (this.roadWidthBottom - this.roadWidthTop) * t) / 2;
      const poleX = centerX + (pole.side * (roadHalfW + 20 + t * 40));
      const poleHeight = 15 + t * 85;

      // Draw futuristic neon street light
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.8)';
      ctx.lineWidth = 1 + t * 2.5;
      ctx.beginPath();
      ctx.moveTo(poleX, screenY);
      ctx.lineTo(poleX, screenY - poleHeight);
      ctx.lineTo(poleX - pole.side * (10 + t * 25), screenY - poleHeight);
      ctx.stroke();

      // Glowing light fixture
      const lampX = poleX - pole.side * (10 + t * 25);
      const lampY = screenY - poleHeight;

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(lampX, lampY, 2 + t * 4, 0, Math.PI * 2);
      ctx.fill();

      // Street lamp downward light cone
      if (t > 0.3) {
        ctx.fillStyle = `rgba(56, 189, 248, ${0.08 * t})`;
        ctx.beginPath();
        ctx.moveTo(lampX, lampY);
        ctx.lineTo(lampX - 15 * t, screenY);
        ctx.lineTo(lampX + 15 * t, screenY);
        ctx.closePath();
        ctx.fill();
      }
    });
  }

  // Convert game world coordinates (x: -1 to 1, y: distance offset) to 2D canvas coordinates
  private projectToScreen(roadX: number, distanceY: number, w: number, h: number) {
    // Player is at distance 0, which corresponds to screenY ~ player.y
    // Horizon is at distance 1000
    // distanceY > 0 is ahead of player (toward horizon)
    // distanceY < 0 is behind player
    const horizon = this.horizonY;
    const playerScreenY = this.player.y;

    // Normalize depth: 0 is at player, 1000 is horizon
    const depth = Math.max(-200, Math.min(1000, distanceY));
    const t = 1 - depth / 1000; // t=1 at player, t=0 at horizon

    const screenY = horizon + Math.pow(Math.max(0, t), 2) * (playerScreenY - horizon);
    const roadWidthAtDepth = this.roadWidthTop + (this.roadWidthBottom - this.roadWidthTop) * Math.max(0, t);
    const screenX = w / 2 + this.roadCurvature * 40 * (1 - t) + roadX * (roadWidthAtDepth * 0.45);
    const scale = Math.max(0.12, Math.pow(Math.max(0, t), 1.2));

    return { x: screenX, y: screenY, scale };
  }

  private renderPickups(ctx: CanvasRenderingContext2D, w: number, h: number) {
    this.pickups.forEach(p => {
      const proj = this.projectToScreen(p.x, p.y, w, h);
      if (proj.y < this.horizonY || proj.y > h + 50) return;

      const size = 26 * proj.scale;
      const bounce = Math.sin(p.pulseTimer) * 6 * proj.scale;
      const cy = proj.y + bounce;

      ctx.save();
      ctx.translate(proj.x, cy);

      if (p.type === 'coin') {
        // Glowing spinning gold coin
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2 * proj.scale;
        ctx.stroke();

        ctx.fillStyle = '#78350f';
        ctx.font = `bold ${Math.floor(16 * proj.scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
      } else if (p.type === 'nitro') {
        // Glowing blue nitro cylinder
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.roundRect(-size * 0.6, -size, size * 1.2, size * 2, 4 * proj.scale);
        ctx.fill();

        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-size * 0.4, -size * 0.7, size * 0.8, size * 1.4);

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.floor(10 * proj.scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('NOS', 0, 0);
      } else if (p.type === 'shield') {
        // Glowing blue forcefield orb
        ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2 * proj.scale;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.floor(14 * proj.scale)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛡️', 0, 0);
      }

      ctx.restore();
    });
  }

  private renderTraffic(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Sort traffic by y distance descending so distant cars render first (proper z-ordering)
    const sorted = [...this.traffic].sort((a, b) => b.y - a.y);

    sorted.forEach(v => {
      const proj = this.projectToScreen(v.x, v.y, w, h);
      if (proj.y < this.horizonY || proj.y > h + 150) return;

      const carW = v.width * proj.scale;
      const carL = v.length * proj.scale;

      ctx.save();
      ctx.translate(proj.x, proj.y);

      // Car underglow shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 4 * proj.scale, carW * 0.6, carL * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();

      // Car Body
      this.drawVehicleBody(ctx, v, carW, carL, proj.scale);

      // Taillights
      const isBraking = v.speed < 50 || v.blinker;
      ctx.fillStyle = isBraking ? '#ff1e1e' : '#b91c1c';
      ctx.shadowColor = '#ff1e1e';
      ctx.shadowBlur = isBraking ? 12 * proj.scale : 4 * proj.scale;

      const lightW = carW * 0.22;
      const lightH = 4 * proj.scale;
      // Left taillight
      ctx.fillRect(-carW * 0.42, carL * 0.44, lightW, lightH);
      // Right taillight
      ctx.fillRect(carW * 0.42 - lightW, carL * 0.44, lightW, lightH);

      // Flashing turn signal / blinker
      if (v.blinker && v.blinkerTimer > 0.5) {
        ctx.fillStyle = '#fbbf24';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10 * proj.scale;
        const blinkerX = v.targetLane > v.lane ? carW * 0.42 - lightW : -carW * 0.42;
        ctx.fillRect(blinkerX, carL * 0.44, lightW, lightH);
      }

      ctx.shadowBlur = 0;
      ctx.restore();
    });
  }

  private drawVehicleBody(
    ctx: CanvasRenderingContext2D,
    v: TrafficVehicle,
    w: number,
    l: number,
    scale: number
  ) {
    if (v.type === 'truck') {
      // Long Semi Freight Truck
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.roundRect(-w * 0.48, -l * 0.48, w * 0.96, l * 0.96, 6 * scale);
      ctx.fill();

      // Trailer roof corrugation lines
      ctx.fillStyle = '#475569';
      for (let y = -l * 0.35; y < l * 0.25; y += 14 * scale) {
        ctx.fillRect(-w * 0.44, y, w * 0.88, 3 * scale);
      }

      // Cabin windshield
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-w * 0.42, -l * 0.46, w * 0.84, 12 * scale);
      return;
    }

    // Sport / Sedan / Supercar / Taxi
    const radius = 8 * scale;
    ctx.fillStyle = v.color;
    ctx.beginPath();
    ctx.roundRect(-w * 0.48, -l * 0.48, w * 0.96, l * 0.96, radius);
    ctx.fill();

    // Dark tinted greenhouse/cockpit
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-w * 0.38, -l * 0.22, w * 0.76, l * 0.45, 5 * scale);
    ctx.fill();

    // Windshield reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.moveTo(-w * 0.3, -l * 0.18);
    ctx.lineTo(w * 0.3, -l * 0.18);
    ctx.lineTo(w * 0.2, -l * 0.05);
    ctx.lineTo(-w * 0.2, -l * 0.05);
    ctx.closePath();
    ctx.fill();

    // Taxi roof sign
    if (v.type === 'taxi') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(-w * 0.2, -l * 0.05, w * 0.4, 8 * scale);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-w * 0.18, -l * 0.04, w * 0.36, 6 * scale);
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const rect = this.canvas.getBoundingClientRect();
    const px = rect.width / 2 + this.player.x * (this.roadWidthBottom * 0.45);
    const py = this.player.y;
    const pw = this.player.width;
    const pl = this.player.length;
    const color = this.player.color;

    ctx.save();
    ctx.translate(px, py);

    // Dynamic body roll tilt when steering
    const rollAngle = this.player.steerAngle * 0.08;
    ctx.rotate(rollAngle);

    // Blinking flash during invulnerability
    if (this.player.invulnerableTime > 0 && Math.floor(this.player.invulnerableTime * 12) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // 1. Headlight Beams illuminating the highway ahead
    const beamGrad = ctx.createLinearGradient(0, pl * 0.2, 0, -320);
    beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.35)');
    beamGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.15)');
    beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');

    ctx.fillStyle = beamGrad;
    // Left beam
    ctx.beginPath();
    ctx.moveTo(-pw * 0.35, -pl * 0.4);
    ctx.lineTo(-pw * 1.8, -320);
    ctx.lineTo(-pw * 0.2, -320);
    ctx.lineTo(-pw * 0.15, -pl * 0.4);
    ctx.closePath();
    ctx.fill();

    // Right beam
    ctx.beginPath();
    ctx.moveTo(pw * 0.15, -pl * 0.4);
    ctx.lineTo(pw * 0.2, -320);
    ctx.lineTo(pw * 1.8, -320);
    ctx.lineTo(pw * 0.35, -pl * 0.4);
    ctx.closePath();
    ctx.fill();

    // 2. Underglow Neon & Shadow
    ctx.shadowColor = color.glow;
    ctx.shadowBlur = this.player.isBoosting ? 26 : 14;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.ellipse(0, 4, pw * 0.62, pl * 0.54, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 3. Wheels / Tires with steering angle
    const wheelAngle = this.player.steerAngle * 0.3;
    const wheelW = 10;
    const wheelL = 22;

    // Front Wheels
    this.drawWheel(ctx, -pw * 0.52, -pl * 0.28, wheelW, wheelL, wheelAngle);
    this.drawWheel(ctx, pw * 0.52, -pl * 0.28, wheelW, wheelL, wheelAngle);
    // Rear Wheels
    this.drawWheel(ctx, -pw * 0.52, pl * 0.32, wheelW, wheelL, 0);
    this.drawWheel(ctx, pw * 0.52, pl * 0.32, wheelW, wheelL, 0);

    // 4. Sleek Aerodynamic Car Body
    const carGrad = ctx.createLinearGradient(-pw / 2, 0, pw / 2, 0);
    carGrad.addColorStop(0, color.secondary);
    carGrad.addColorStop(0.3, color.primary);
    carGrad.addColorStop(0.5, color.accent);
    carGrad.addColorStop(0.7, color.primary);
    carGrad.addColorStop(1, color.secondary);

    ctx.fillStyle = carGrad;
    ctx.beginPath();
    // Aerodynamic wedge contours
    ctx.moveTo(-pw * 0.38, -pl * 0.48); // front nose left
    ctx.lineTo(pw * 0.38, -pl * 0.48);  // front nose right
    ctx.lineTo(pw * 0.48, -pl * 0.25);  // front fender right
    ctx.lineTo(pw * 0.45, pl * 0.15);   // waist right
    ctx.lineTo(pw * 0.50, pl * 0.40);   // rear hip right
    ctx.lineTo(pw * 0.42, pl * 0.48);   // rear corner right
    ctx.lineTo(-pw * 0.42, pl * 0.48);  // rear corner left
    ctx.lineTo(-pw * 0.50, pl * 0.40);  // rear hip left
    ctx.lineTo(-pw * 0.45, pl * 0.15);  // waist left
    ctx.lineTo(-pw * 0.48, -pl * 0.25); // front fender left
    ctx.closePath();
    ctx.fill();

    // 5. Hood Aerodynamic Vents & Racing Decal
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(-pw * 0.15, -pl * 0.42);
    ctx.lineTo(pw * 0.15, -pl * 0.42);
    ctx.lineTo(pw * 0.08, -pl * 0.28);
    ctx.lineTo(-pw * 0.08, -pl * 0.28);
    ctx.closePath();
    ctx.fill();

    // 6. Cockpit Canopy & Tinted Glass
    const glassGrad = ctx.createLinearGradient(0, -pl * 0.2, 0, pl * 0.2);
    glassGrad.addColorStop(0, '#020617');
    glassGrad.addColorStop(0.5, '#0f172a');
    glassGrad.addColorStop(1, '#1e293b');

    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.roundRect(-pw * 0.34, -pl * 0.18, pw * 0.68, pl * 0.42, 8);
    ctx.fill();

    // Windshield reflection streak
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-pw * 0.22, -pl * 0.14);
    ctx.lineTo(pw * 0.18, pl * 0.16);
    ctx.stroke();

    // 7. Rear Wing / Aerodynamic Spoiler
    ctx.fillStyle = color.secondary;
    ctx.fillRect(-pw * 0.48, pl * 0.44, pw * 0.96, 5);

    // 8. Glowing LED Taillight Bar
    const isBraking = this.keys.down;
    ctx.shadowColor = '#ff0033';
    ctx.shadowBlur = isBraking ? 18 : 8;
    ctx.fillStyle = isBraking ? '#ff3b30' : '#e11d48';
    ctx.fillRect(-pw * 0.42, pl * 0.47, pw * 0.84, 4);

    // 9. Nitro Thrusters Glow
    if (this.player.isBoosting) {
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 24;
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-16, pl * 0.48, 8, 4);
      ctx.fillRect(8, pl * 0.48, 8, 4);
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private drawWheel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    l: number,
    angle: number
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -l / 2, w, l, 3);
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-w * 0.25, -l * 0.3, w * 0.5, l * 0.6);
    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;

      if (p.type === 'nitro') {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  private renderSpeedLines(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    const count = this.player.isBoosting ? 26 : 14;
    ctx.strokeStyle = this.player.isBoosting ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;

    for (let i = 0; i < count; i++) {
      const isLeft = i % 2 === 0;
      const x = isLeft ? Math.random() * (w * 0.22) : w - Math.random() * (w * 0.22);
      const y1 = this.horizonY + Math.random() * (h - this.horizonY);
      const len = 40 + Math.random() * 80;

      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x + (isLeft ? -10 : 10), y1 + len);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderPopups(ctx: CanvasRenderingContext2D) {
    this.popups.forEach(pop => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pop.alpha);
      ctx.translate(pop.x, pop.y);
      ctx.scale(pop.scale, pop.scale);

      ctx.font = '900 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      ctx.strokeText(pop.text, 0, 0);

      // Fill
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, 0, 0);

      ctx.restore();
    });
  }
}
