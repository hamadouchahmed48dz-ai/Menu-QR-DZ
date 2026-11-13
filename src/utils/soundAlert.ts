/**
 * Synthesizes crystal-clear acoustic restaurant alerts using native Web Audio API.
 * No external MP3 files needed—zero risk of 404s, CORS, or missing audio assets.
 */

class SoundAlertService {
  private ctx: AudioContext | null = null;
  private isSoundEnabled: boolean = true;

  constructor() {
    const saved = localStorage.getItem('menuqr_sound_enabled');
    this.isSoundEnabled = saved !== 'false';
  }

  public setSoundEnabled(enabled: boolean) {
    this.isSoundEnabled = enabled;
    localStorage.setItem('menuqr_sound_enabled', enabled ? 'true' : 'false');
  }

  public isEnabled(): boolean {
    return this.isSoundEnabled;
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * New Kitchen Ticket Chime: Harmonious dual-tone chime (523.25Hz -> 659.25Hz -> 783.99Hz)
   */
  public playNewOrderChime() {
    if (!this.isSoundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        // Soft attack and smooth exponential decay
        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.5);
      });
    } catch (e) {
      console.warn('Audio playback not permitted yet (awaiting user gesture):', e);
    }
  }

  /**
   * Waiter Call / Bill Request Bell: Two crisp high-pitch service bell strikes (1046Hz, C6)
   */
  public playWaiterCallBell() {
    if (!this.isSoundEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [0, 0.18].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1046.5, now + offset); // High C6

        gain.gain.setValueAtTime(0, now + offset);
        gain.gain.linearRampToValueAtTime(0.35, now + offset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.4);
      });
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }
}

export const soundAlert = new SoundAlertService();
