class AudioService {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private vibrationEnabled: boolean = true;

  constructor() {
    // Lazy init AudioContext on first user interaction
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setSoundEnabled(val: boolean) {
    this.soundEnabled = val;
  }

  public setVibrationEnabled(val: boolean) {
    this.vibrationEnabled = val;
  }

  // Counter tap sound and click vibration completely disabled for silent devotional counting
  public playBeadClick() {
    // Intentionally silent: No sound or haptic feedback on regular counter taps
    return;
  }

  // Play resonant temple bell chime for Mala completion (108 beads)
  public playMalaBell() {
    if (this.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([40, 60, 40]);
      } catch {}
    }

    if (!this.soundEnabled) return;

    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // Rich harmonic bell chime (Frequencies: 440, 880, 1320, 1760)
      const freqs = [587.33, 880, 1174.66, 1760];
      const gains = [0.25, 0.15, 0.08, 0.04];

      freqs.forEach((f, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now);

        gain.gain.setValueAtTime(gains[idx], now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now);
        osc.stop(now + 1.8);
      });
    } catch (e) {}
  }
}

export const audioService = new AudioService();
