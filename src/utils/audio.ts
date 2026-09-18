// Web Audio API based procedural sound synthesizer for realistic archery audio

class ArcheryAudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Draw string sound: rising friction & subtle wood/carbon tension
  public playDrawSound(tensionPercent: number = 0.5) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Filtered noise creak
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(400 + tensionPercent * 600, now);
      filter.Q.setValueAtTime(3, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
    } catch {
      // Audio fallback ignored
    }
  }

  // Bowstring release: sharp resonant snap & string vibration
  public playReleaseSound(drawWeight: number = 45) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Base string snap (oscillator sweep)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const baseFreq = 160 + (drawWeight / 70) * 120;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq * 2.5, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + 0.12);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);

      // Sub-harmonic "twang" buzz
      const twang = this.ctx.createOscillator();
      const twangGain = this.ctx.createGain();
      twang.type = 'sawtooth';
      twang.frequency.setValueAtTime(baseFreq, now);
      twang.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.25);

      twangGain.gain.setValueAtTime(0.2, now);
      twangGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      twang.connect(twangGain);
      twangGain.connect(this.ctx.destination);
      twang.start(now);
      twang.stop(now + 0.26);

      // Air whoosh
      const whooshBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
      const wData = whooshBuffer.getChannelData(0);
      for (let i = 0; i < wData.length; i++) {
        wData[i] = (Math.random() * 2 - 1) * Math.sin((i / wData.length) * Math.PI);
      }
      const whoosh = this.ctx.createBufferSource();
      whoosh.buffer = whooshBuffer;

      const wFilter = this.ctx.createBiquadFilter();
      wFilter.type = 'highpass';
      wFilter.frequency.setValueAtTime(800, now);

      const wGain = this.ctx.createGain();
      wGain.gain.setValueAtTime(0.18, now);
      wGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      whoosh.connect(wFilter);
      wFilter.connect(wGain);
      wGain.connect(this.ctx.destination);
      whoosh.start(now);
    } catch {
      // Audio fallback
    }
  }

  // Target impact: solid satisfying *THUMP*
  public playTargetHitSound(score: number) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Heavy bass thud
      const thud = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(140, now);
      thud.frequency.exponentialRampToValueAtTime(30, now + 0.18);

      thudGain.gain.setValueAtTime(0.6, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      thud.connect(thudGain);
      thudGain.connect(this.ctx.destination);
      thud.start(now);
      thud.stop(now + 0.22);

      // Foam/wood crack
      const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
      const nData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < nData.length; i++) {
        nData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nData.length * 0.3));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const nFilter = this.ctx.createBiquadFilter();
      nFilter.type = 'lowpass';
      nFilter.frequency.setValueAtTime(600, now);
      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.3, now);
      nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      noise.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(this.ctx.destination);
      noise.start(now);

      // If Bullseye (10 or X), play gold bell chime
      if (score >= 10) {
        setTimeout(() => {
          this.playBullseyeFanfare();
        }, 80);
      }
    } catch {
      // Audio fallback
    }
  }

  // Bullseye 10/X bell chime
  public playBullseyeFanfare() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const freqs = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7 chord
      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.18, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + idx * 0.05 + 0.7);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.75);
      });
    } catch {
      // Fallback
    }
  }

  // Horse hoof galloping sound (dirt thud + hoof clip-clop)
  public playGallopSound() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Two rapid hoof beats (da-dum)
      [0, 0.08].forEach((delay, i) => {
        if (!this.ctx) return;
        const t = now + delay;
        // Low ground thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(i === 0 ? 95 : 120, t);
        osc.frequency.exponentialRampToValueAtTime(35, t + 0.07);

        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.08);

        // Filtered dirt brush noise
        const bufSize = Math.floor(this.ctx.sampleRate * 0.05);
        const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let j = 0; j < bufSize; j++) {
          data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufSize * 0.3));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buf;
        const nFilter = this.ctx.createBiquadFilter();
        nFilter.type = 'lowpass';
        nFilter.frequency.setValueAtTime(500, t);
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.12, t);
        nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        noise.connect(nFilter);
        nFilter.connect(nGain);
        nGain.connect(this.ctx.destination);
        noise.start(t);
      });
    } catch {
      // Fallback
    }
  }

  // Traditional Korean Bronze Gong sound (징 / 관중 타종)
  public playJoseonGongSound() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Resonant deep brass gong harmonics (Jing 징)
      const gongFreqs = [185, 370, 560, 745];
      gongFreqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        // Slight pitch wave characteristic of traditional Korean brass
        osc.frequency.exponentialRampToValueAtTime(freq * 0.98, now + 1.2);

        const initialGain = idx === 0 ? 0.35 : 0.15;
        gain.gain.setValueAtTime(initialGain, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 1.6);
      });
    } catch {
      // Fallback
    }
  }

  // UI Click
  public playClickSound() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.04);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Fallback
    }
  }
}

export const archeryAudio = new ArcheryAudioManager();
