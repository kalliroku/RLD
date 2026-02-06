/**
 * Sound Manager - 8-bit style sound effects using Web Audio API
 */

export class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.3;
    }

    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }

    // Ensure AudioContext is resumed (required after user interaction)
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Create a gain node for volume control
    createGain(volume = this.volume) {
        const gain = this.ctx.createGain();
        gain.gain.value = volume;
        gain.connect(this.ctx.destination);
        return gain;
    }

    // Play a simple tone
    playTone(frequency, duration, type = 'square', volume = this.volume) {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.createGain(volume);

        osc.type = type;
        osc.frequency.value = frequency;
        osc.connect(gain);

        // Fade out to avoid clicks
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + duration);
    }

    // Play a sequence of tones (arpeggio)
    playArpeggio(frequencies, noteDuration = 0.08, type = 'square', volume = this.volume) {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        frequencies.forEach((freq, i) => {
            const startTime = this.ctx.currentTime + i * noteDuration;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = type;
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(this.ctx.destination);

            gain.gain.setValueAtTime(volume, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration * 0.9);

            osc.start(startTime);
            osc.stop(startTime + noteDuration);
        });
    }

    // Play noise burst
    playNoise(duration, volume = this.volume) {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.createGain(volume);
        noise.connect(gain);

        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        noise.start();
        noise.stop(this.ctx.currentTime + duration);
    }

    // === Sound Effects ===

    // Movement sound - short blip
    move() {
        this.playTone(220, 0.05, 'square', 0.15);
    }

    // Wall bump - low thud
    bump() {
        this.playTone(80, 0.1, 'triangle', 0.3);
        this.playNoise(0.05, 0.1);
    }

    // Gold pickup - ascending sparkle
    gold() {
        this.playArpeggio([587, 784, 988, 1175], 0.06, 'square', 0.25);
    }

    // Trap damage - harsh descending
    trap() {
        this.playArpeggio([400, 300, 200], 0.08, 'sawtooth', 0.3);
        this.playNoise(0.1, 0.15);
    }

    // Heal - pleasant ascending
    heal() {
        this.playArpeggio([523, 659, 784], 0.1, 'sine', 0.25);
    }

    // Pit fall - long descending
    pit() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.createGain(0.3);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.5);
        osc.connect(gain);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    // Victory fanfare
    victory() {
        // C E G C (major chord arpeggio)
        this.playArpeggio([523, 659, 784, 1047], 0.12, 'square', 0.3);

        // Second phrase after delay
        setTimeout(() => {
            this.playArpeggio([784, 988, 1175, 1318], 0.1, 'square', 0.25);
        }, 500);
    }

    // Death sound
    death() {
        this.playArpeggio([400, 350, 300, 250, 200, 150], 0.1, 'sawtooth', 0.3);
    }

    // Unlock sound - magical ascending
    unlock() {
        this.playArpeggio([392, 494, 587, 784, 988], 0.08, 'sine', 0.25);
    }

    // UI click
    click() {
        this.playTone(660, 0.03, 'square', 0.15);
    }

    // Start/Reset game
    start() {
        this.playArpeggio([262, 330, 392], 0.08, 'triangle', 0.2);
    }

    // Toggle sound on/off
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
    }
}

// Singleton instance
export const sound = new SoundManager();
