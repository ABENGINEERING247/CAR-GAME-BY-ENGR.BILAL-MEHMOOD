/**
 * Procedural Web Audio Engine for Arcade Driving Game.
 * Uses Web Audio API synthesizers so no external audio files are required.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicEnabled: boolean = true;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Engine sound nodes
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private isEngineRunning: boolean = false;

  // Nitro sound nodes
  private nitroNoise: AudioBufferSourceNode | null = null;
  private nitroGain: GainNode | null = null;
  private nitroFilter: BiquadFilterNode | null = null;

  // Music sequence interval
  private musicInterval: number | null = null;
  private musicStep: number = 0;

  constructor() {
    // Check saved mute preferences
    try {
      const savedMute = localStorage.getItem('apex_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
      const savedMusic = localStorage.getItem('apex_music');
      if (savedMusic !== null) {
        this.musicEnabled = savedMusic !== 'false';
      }
    } catch {
      // ignore storage errors
    }
  }

  private initContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicEnabled ? 0.35 : 0, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);
    } catch {
      // AudioContext not supported or restricted
    }
  }

  public userInteracted() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      localStorage.setItem('apex_muted', String(muted));
    } catch {
      // ignore
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    try {
      localStorage.setItem('apex_music', String(enabled));
    } catch {
      // ignore
    }
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(enabled ? 0.35 : 0, this.ctx.currentTime, 0.05);
    }
    if (!enabled && this.musicInterval) {
      window.clearInterval(this.musicInterval);
      this.musicInterval = null;
    } else if (enabled && !this.musicInterval && this.isEngineRunning) {
      this.startMusic();
    }
  }

  public isMusicOn(): boolean {
    return this.musicEnabled;
  }

  // Engine Synthesis
  public startEngine() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.isEngineRunning) return;

    try {
      const now = this.ctx.currentTime;
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(45, now);

      this.engineSubOsc = this.ctx.createOscillator();
      this.engineSubOsc.type = 'triangle';
      this.engineSubOsc.frequency.setValueAtTime(22.5, now);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(280, now);
      this.engineFilter.Q.setValueAtTime(3, now);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.01, now);
      this.engineGain.gain.linearRampToValueAtTime(0.25, now + 0.3);

      this.engineOsc.connect(this.engineFilter);
      this.engineSubOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.sfxGain);

      this.engineOsc.start();
      this.engineSubOsc.start();
      this.isEngineRunning = true;

      if (this.musicEnabled) {
        this.startMusic();
      }
    } catch {
      // ignore
    }
  }

  public updateEngine(speedRatio: number, isAccelerating: boolean, isBraking: boolean) {
    if (!this.ctx || !this.engineOsc || !this.engineFilter || !this.engineGain || !this.isEngineRunning) return;

    const now = this.ctx.currentTime;
    // Base idle 50Hz, top speed up to 260Hz with gear shifting simulation
    const clamped = Math.max(0, Math.min(1.5, speedRatio));
    
    // Virtual 5-gear RPM oscillation
    const gearRatio = (clamped * 4) % 1;
    const baseFreq = 55 + clamped * 80 + gearRatio * 90;
    
    this.engineOsc.frequency.setTargetAtTime(baseFreq, now, 0.05);
    if (this.engineSubOsc) {
      this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);
    }

    // Filter frequency opens up as you step on gas
    const targetFilter = 220 + clamped * 500 + (isAccelerating ? 200 : 0);
    this.engineFilter.frequency.setTargetAtTime(targetFilter, now, 0.08);

    // Volume slight boost during acceleration
    const vol = isBraking ? 0.15 : isAccelerating ? 0.32 : 0.22;
    this.engineGain.gain.setTargetAtTime(vol, now, 0.05);
  }

  public stopEngine() {
    if (!this.isEngineRunning) return;
    try {
      if (this.engineGain && this.ctx) {
        this.engineGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      }
      setTimeout(() => {
        try {
          this.engineOsc?.stop();
          this.engineSubOsc?.stop();
          this.engineOsc?.disconnect();
          this.engineSubOsc?.disconnect();
        } catch {
          // ignore
        }
        this.isEngineRunning = false;
      }, 250);

      if (this.musicInterval) {
        window.clearInterval(this.musicInterval);
        this.musicInterval = null;
      }
    } catch {
      this.isEngineRunning = false;
    }
  }

  // Nitro Boost Sound
  public startNitro() {
    this.initContext();
    if (!this.ctx || !this.sfxGain || this.nitroNoise) return;

    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.nitroNoise = this.ctx.createBufferSource();
      this.nitroNoise.buffer = buffer;
      this.nitroNoise.loop = true;

      this.nitroFilter = this.ctx.createBiquadFilter();
      this.nitroFilter.type = 'bandpass';
      this.nitroFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
      this.nitroFilter.Q.setValueAtTime(2, this.ctx.currentTime);

      this.nitroGain = this.ctx.createGain();
      this.nitroGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      this.nitroGain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.15);

      this.nitroNoise.connect(this.nitroFilter);
      this.nitroFilter.connect(this.nitroGain);
      this.nitroGain.connect(this.sfxGain);

      this.nitroNoise.start();

      // Play introductory rocket flare tone
      const flare = this.ctx.createOscillator();
      const flareGain = this.ctx.createGain();
      flare.type = 'sawtooth';
      flare.frequency.setValueAtTime(120, this.ctx.currentTime);
      flare.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.3);
      flareGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      flareGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
      flare.connect(flareGain);
      flareGain.connect(this.sfxGain);
      flare.start();
      flare.stop(this.ctx.currentTime + 0.4);
    } catch {
      // ignore
    }
  }

  public stopNitro() {
    if (!this.nitroNoise || !this.ctx) return;
    try {
      if (this.nitroGain) {
        this.nitroGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      }
      setTimeout(() => {
        try {
          this.nitroNoise?.stop();
          this.nitroNoise?.disconnect();
        } catch {
          // ignore
        }
        this.nitroNoise = null;
      }, 160);
    } catch {
      this.nitroNoise = null;
    }
  }

  // Tire Screech
  public playTireScreech(intensity: number = 0.5) {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.6;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, now);
      filter.Q.setValueAtTime(6, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.05 * intensity, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start();
    } catch {
      // ignore
    }
  }

  // Near Miss Doppler Whoosh
  public playNearMiss() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Doppler drop
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.28);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.32);
    } catch {
      // ignore
    }
  }

  // Bonus Pickup Chime
  public playPickup(type: 'nitro' | 'coin' | 'shield' = 'coin') {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      const pitches = type === 'nitro' 
        ? [440, 660, 880] 
        : type === 'shield' 
        ? [330, 495, 660, 990] 
        : [523.25, 659.25, 783.99, 1046.5];

      pitches.forEach((freq, idx) => {
        if (!this.ctx || !this.sfxGain) return;
        const noteTime = now + idx * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type === 'nitro' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.2, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(noteTime);
        osc.stop(noteTime + 0.2);
      });
    } catch {
      // ignore
    }
  }

  // Crash Explosion Sound
  public playCrash() {
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    try {
      const now = this.ctx.currentTime;
      
      // 1. Noise burst
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.8);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.8);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.8, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);

      // 2. Heavy sub impact thud
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(140, now);
      sub.frequency.exponentialRampToValueAtTime(28, now + 0.5);

      subGain.gain.setValueAtTime(0.9, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      sub.connect(subGain);
      subGain.connect(this.sfxGain);

      noise.start(now);
      sub.start(now);
      noise.stop(now + 0.8);
      sub.stop(now + 0.6);
    } catch {
      // ignore
    }
  }

  // Procedural Synthwave Arcade Music Loop
  private startMusic() {
    if (this.musicInterval || !this.musicEnabled) return;

    // 16-step synth bass & arp pattern at 128 BPM
    // 16th note = (60 / 128) / 4 ~ 117ms
    const stepDuration = 117;
    const bassNotes = [
      110, 110, 110, 110,  // A2
      98,  98,  98,  98,   // G2
      87.3,87.3,87.3,87.3, // F2
      130.8,130.8,123.4,123.4 // C3 -> B2
    ];
    const arpNotes = [
      440, 523.25, 659.25, 880,
      392, 493.88, 587.33, 783.99,
      349.23, 440, 523.25, 698.46,
      523.25, 659.25, 783.99, 987.77
    ];

    this.musicInterval = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || !this.musicEnabled || this.isMuted) return;

      const now = this.ctx.currentTime;
      const step = this.musicStep % 16;
      this.musicStep++;

      // Synth Bass note on every step
      const bassFreq = bassNotes[step];
      const bassOsc = this.ctx.createOscillator();
      const bassFilter = this.ctx.createBiquadFilter();
      const bassGain = this.ctx.createGain();

      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassFreq, now);

      bassFilter.type = 'lowpass';
      bassFilter.frequency.setValueAtTime(380, now);
      bassFilter.Q.setValueAtTime(4, now);

      bassGain.gain.setValueAtTime(0.18, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      bassOsc.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(this.musicGain);

      bassOsc.start(now);
      bassOsc.stop(now + 0.11);

      // Four-on-the-floor kick beat (every 4 steps: 0, 4, 8, 12)
      if (step % 4 === 0) {
        const kickOsc = this.ctx.createOscillator();
        const kickGain = this.ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(150, now);
        kickOsc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

        kickGain.gain.setValueAtTime(0.35, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        kickOsc.connect(kickGain);
        kickGain.connect(this.musicGain);

        kickOsc.start(now);
        kickOsc.stop(now + 0.11);
      }

      // High-hat on offbeats (2, 6, 10, 14)
      if (step % 4 === 2) {
        const hhOsc = this.ctx.createOscillator();
        const hhFilter = this.ctx.createBiquadFilter();
        const hhGain = this.ctx.createGain();

        hhOsc.type = 'triangle';
        hhOsc.frequency.setValueAtTime(8000, now);

        hhFilter.type = 'highpass';
        hhFilter.frequency.setValueAtTime(7000, now);

        hhGain.gain.setValueAtTime(0.08, now);
        hhGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        hhOsc.connect(hhFilter);
        hhFilter.connect(hhGain);
        hhGain.connect(this.musicGain);

        hhOsc.start(now);
        hhOsc.stop(now + 0.05);
      }

      // Arpeggio melody lead
      const arpFreq = arpNotes[step];
      const arpOsc = this.ctx.createOscillator();
      const arpGain = this.ctx.createGain();

      arpOsc.type = 'triangle';
      arpOsc.frequency.setValueAtTime(arpFreq, now);

      arpGain.gain.setValueAtTime(0.07, now);
      arpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      arpOsc.connect(arpGain);
      arpGain.connect(this.musicGain);

      arpOsc.start(now);
      arpOsc.stop(now + 0.09);
    }, stepDuration);
  }
}

export const sound = new SoundEngine();
