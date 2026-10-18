export type GameState = 'menu' | 'playing' | 'paused' | 'gameover';

export type GameMode = 'classic' | 'timeAttack' | 'endless';

export interface CarColor {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  glow: string;
  accent: string;
}

export interface PlayerCar {
  x: number;             // Center-relative horizontal position (-1 to 1 on road)
  y: number;             // Vertical position on canvas (e.g. 75% down)
  width: number;
  length: number;
  speed: number;         // Current road speed (mph)
  targetSpeed: number;   // Target speed from input
  maxSpeed: number;
  acceleration: number;
  braking: number;
  handling: number;
  steerAngle: number;    // Turning visual tilt (-1 to 1)
  isBoosting: boolean;
  nitroRemaining: number; // 0 to 100
  shield: number;        // 0 to 100
  color: CarColor;
  invulnerableTime: number; // brief immunity after hit
}

export type TrafficType = 'sedan' | 'sport' | 'truck' | 'taxi' | 'supercar';

export interface TrafficVehicle {
  id: number;
  x: number;             // -1 to 1 road relative
  y: number;             // Distance offset from player (-1000 to +3000)
  lane: number;          // 0, 1, 2, 3
  targetLane: number;
  laneChangeTimer: number;
  speed: number;         // In mph
  type: TrafficType;
  color: string;
  width: number;
  length: number;
  blinker: boolean;
  blinkerTimer: number;
  nearMissAwarded?: boolean;
}

export type PickupType = 'nitro' | 'coin' | 'shield';

export interface PickupItem {
  id: number;
  x: number;             // -1 to 1
  y: number;             // Distance offset
  lane: number;
  type: PickupType;
  collected: boolean;
  pulseTimer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
  type: 'smoke' | 'fire' | 'spark' | 'nitro' | 'confetti';
}

export interface ScorePopup {
  id: number;
  text: string;
  points: number;
  x: number;
  y: number;
  alpha: number;
  scale: number;
  color: string;
}

export interface RoadMarker {
  yOffset: number;
  curve: number;
}

export interface RoadEnvironment {
  theme: 'sunset' | 'neon' | 'cyberpunk';
  skyGradient: [string, string, string];
  horizonColor: string;
  roadColor: string;
  shoulderColor: string;
  lineColor: string;
  gridColor: string;
}

export interface GameStats {
  score: number;
  highScore: number;
  distance: number;       // meters
  speed: number;          // mph
  maxSpeed: number;
  multiplier: number;
  nitro: number;          // 0 to 100
  shield: number;         // 0 to 100
  nearMisses: number;
  coins: number;
  timeRemaining: number;  // seconds (Time attack)
}
