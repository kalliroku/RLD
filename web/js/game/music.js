/**
 * Music Manager — Procedural 8-bit BGM using Web Audio API
 *
 * 4 tracks (D-2026-05-21-1):
 *   T1 — Ch.1 (1~3관)  · A natural minor · 95 BPM · ~45s loop
 *   T2 — Ch.2 (4~5관)  · D minor · 85 BPM · ~60s loop
 *   T3 — Ch.3 (6~7관)  · E phrygian · 105 BPM · ~75s loop
 *   T4 — Daily         · seed-based · 110 BPM · ~30s loop (procedural per-seed)
 *
 * Tone: STORY ("차분 + 그늘 / 트라우마 + 미스터리") + D-2026-05-15-15 Crisp.
 * Adventurer-fanfare 회피 (모험가 = 적). RL 메타 자기참조 없음.
 */

// mulberry32 seeded PRNG (D-2026-05-12-10 패턴 정합)
function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
        t = (t + 0x6D2B79F5) >>> 0;
        let r = t;
        r = Math.imul(r ^ (r >>> 15), r | 1);
        r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

// MIDI → frequency. A4 (MIDI 69) = 440 Hz
function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

// Scale helpers — return MIDI offsets from root
const SCALES = {
    natural_minor: [0, 2, 3, 5, 7, 8, 10],   // A B C D E F G
    phrygian:      [0, 1, 3, 5, 7, 8, 10],   // E F G A B C D (when rooted at E)
    pentatonic_m:  [0, 3, 5, 7, 10],         // A C D E G
};

// Root MIDI numbers (octave 4 = around middle)
const ROOTS = {
    A_minor: 57,   // A3 root (so melody sits A3-A5)
    D_minor: 50,   // D3
    E_phrygian: 52, // E3
};

// Track definitions — each track is rendered procedurally each loop.
// Pattern fields: melody (array of [scale-degree, octave-offset, duration-beats]),
//                 bass (array of [scale-degree, octave-offset, duration-beats]),
//                 pad (array of [chord-degrees, duration-beats]).
const TRACKS = {
    T1: {
        name: 'Ch.1 — 입문',
        bpm: 95,
        loopBars: 8,           // ~45s at 95bpm (4/4)
        root: ROOTS.A_minor,
        scale: SCALES.natural_minor,
        // Melody phrase — 8 bars, gentle ascending-descending (curiosity)
        melody: [
            [0, 1, 1], [2, 1, 1], [4, 1, 1], [2, 1, 1],   // bar 1: A-C-E-C
            [3, 1, 0.5], [4, 1, 0.5], [5, 1, 1], [4, 1, 1], // bar 2: D-E-F-E
            [4, 1, 1], [2, 1, 1], [0, 1, 2],                // bar 3-4: E-C-A (long)
            [-1, 0, 1], [0, 1, 1], [2, 1, 1], [4, 1, 1],    // bar 5: rest-A-C-E
            [3, 1, 0.5], [2, 1, 0.5], [0, 1, 1], [-1, 0, 1], // bar 6: D-C-A-rest
            [4, 0, 1], [5, 0, 1], [0, 1, 1], [2, 1, 1],     // bar 7: low E-F-A-C
            [4, 1, 2], [0, 1, 2],                            // bar 8: E-A close
        ],
        // Bass — root-fifth pattern, half-note feel
        bass: [
            [0, -1, 2], [4, -1, 2],   // A2 E2
            [0, -1, 2], [3, -1, 2],   // A2 D2
            [0, -1, 2], [4, -1, 2],   // A2 E2
            [0, -1, 2], [0, -1, 2],   // A2 A2 (resolve)
        ].concat([
            [5, -1, 2], [4, -1, 2],   // F2 E2
            [0, -1, 2], [4, -1, 2],   // A2 E2
            [3, -1, 2], [4, -1, 2],   // D2 E2
            [0, -1, 4],                // A2 hold close
        ]),
        // Pad — sustained chord per 2 bars
        pad: [
            [[0, 2, 4], 4],   // A-C-E
            [[3, 5, 0], 4],   // D-F-A
            [[4, 6, 1], 4],   // E-G-B
            [[0, 2, 4], 4],   // A-C-E (resolve)
        ],
    },

    T2: {
        name: 'Ch.2 — 무거움 시작',
        bpm: 85,
        loopBars: 10,          // ~60s at 85bpm
        root: ROOTS.D_minor,
        scale: SCALES.natural_minor,
        // Melody — descending phrases, heavier
        melody: [
            [4, 1, 2], [2, 1, 1], [0, 1, 1],            // bar 1: A-F-D
            [1, 1, 1], [2, 1, 1], [0, 1, 2],            // bar 2: E-F-D
            [-1, 0, 1], [0, 1, 1], [-2, 1, 2],          // bar 3: rest-D-C↓
            [-1, 0, 2], [0, 0, 2],                      // bar 4: rest-D (low)
            [3, 1, 1], [2, 1, 1], [1, 1, 1], [0, 1, 1], // bar 5: G-F-E-D
            [4, 1, 2], [3, 1, 2],                       // bar 6: A-G
            [2, 1, 1], [1, 1, 1], [0, 1, 2],            // bar 7: F-E-D
            [-1, 0, 4],                                 // bar 8: rest
            [4, 0, 2], [0, 1, 2],                       // bar 9: low A-D
            [-2, 1, 4],                                 // bar 10: C↓ hold
        ],
        bass: [
            [0, -1, 2], [4, -1, 2],   // D2 A2
            [0, -1, 2], [3, -1, 2],   // D2 G2
            [0, -1, 4],                // D2 hold
            [5, -1, 2], [4, -1, 2],   // Bb2 A2 (b6)
            [0, -1, 2], [4, -1, 2],
            [3, -1, 2], [0, -1, 2],
            [4, -1, 4],
            [0, -1, 4],
            [4, -1, 2], [0, -1, 2],
            [0, -1, 4],
        ],
        pad: [
            [[0, 2, 4], 4],
            [[5, 0, 2], 4],   // Bb-D-F (b6 chord)
            [[4, 6, 1], 4],   // A-C-E
            [[0, 2, 4], 4],
            [[3, 5, 0], 4],
        ],
    },

    T3: {
        name: 'Ch.3 — 어둠 긴장',
        bpm: 105,
        loopBars: 12,          // ~75s at 105bpm
        root: ROOTS.E_phrygian,
        scale: SCALES.phrygian,
        // Melody — phrygian b2 emphasis (F natural), tense
        melody: [
            [0, 1, 1], [1, 1, 0.5], [0, 1, 0.5], [-1, 0, 1], [0, 1, 1],   // bar 1: E-F-E-rest-E
            [2, 1, 1], [1, 1, 1], [0, 1, 2],                              // bar 2: G-F-E
            [4, 1, 1], [3, 1, 1], [2, 1, 1], [1, 1, 1],                   // bar 3: B-A-G-F
            [0, 1, 4],                                                    // bar 4: E hold
            [0, 1, 0.5], [1, 1, 0.5], [2, 1, 0.5], [3, 1, 0.5],
            [4, 1, 0.5], [3, 1, 0.5], [2, 1, 0.5], [1, 1, 0.5],            // bar 5: scale run
            [0, 1, 2], [-1, 0, 2],                                        // bar 6: E-rest
            [4, 1, 2], [1, 1, 2],                                         // bar 7: B-F (tritone-ish)
            [0, 1, 4],                                                    // bar 8: E
            [1, 1, 1], [0, 1, 1], [1, 1, 1], [2, 1, 1],                   // bar 9: F-E-F-G
            [3, 1, 2], [4, 1, 2],                                         // bar 10: A-B
            [4, 1, 1], [3, 1, 1], [2, 1, 1], [1, 1, 1],                   // bar 11: B-A-G-F
            [0, 1, 4],                                                    // bar 12: E close
        ],
        bass: [
            [0, -1, 2], [1, -1, 2],   // E2 F2 (b2 movement, phrygian signature)
            [0, -1, 2], [4, -1, 2],   // E2 B2
            [3, -1, 2], [1, -1, 2],
            [0, -1, 4],
            [0, -1, 1], [1, -1, 1], [0, -1, 1], [4, -1, 1],
            [0, -1, 4],
            [1, -1, 2], [0, -1, 2],
            [0, -1, 4],
            [1, -1, 2], [0, -1, 2],
            [3, -1, 2], [4, -1, 2],
            [1, -1, 2], [0, -1, 2],
            [0, -1, 4],
        ],
        pad: [
            [[0, 2, 4], 4],
            [[1, 3, 5], 4],   // F-A-C (b2 chord, phrygian color)
            [[0, 2, 4], 4],
            [[3, 5, 0], 4],
            [[1, 3, 5], 4],
            [[0, 2, 4], 4],
        ],
        // T3 uses sawtooth lead (tension)
        leadWave: 'sawtooth',
    },

    T4: null,   // Procedural per-seed, generated in playTrack
};

// Daily track procedural generator — seed-based
function generateT4(seed) {
    const rng = mulberry32(seed || 1);
    // Pick root (A=57, D=50, E=52)
    const rootChoices = [ROOTS.A_minor, ROOTS.D_minor, ROOTS.E_phrygian];
    const root = rootChoices[Math.floor(rng() * 3)];
    // Pick scale (natural_minor or phrygian based on root)
    const scale = (root === ROOTS.E_phrygian) ? SCALES.phrygian : SCALES.natural_minor;
    // BPM 100~120
    const bpm = 100 + Math.floor(rng() * 21);
    // 4 bars = ~30s at 110bpm (short loop, repeats)
    const loopBars = 4;

    // Pentatonic-bias melody (5 notes per bar)
    const pentatonic = SCALES.pentatonic_m;
    const melody = [];
    for (let bar = 0; bar < loopBars; bar++) {
        const notesInBar = 4 + Math.floor(rng() * 3);   // 4~6 notes per bar
        let beatsLeft = 4;
        for (let i = 0; i < notesInBar && beatsLeft > 0; i++) {
            const degree = pentatonic[Math.floor(rng() * pentatonic.length)];
            const oct = (rng() < 0.7) ? 1 : 0;
            const dur = (i === notesInBar - 1) ? beatsLeft : (rng() < 0.5 ? 0.5 : 1);
            melody.push([degree, oct, Math.min(dur, beatsLeft)]);
            beatsLeft -= Math.min(dur, beatsLeft);
        }
    }

    // Bass — root + 5th alternating, half-note feel
    const bass = [];
    for (let bar = 0; bar < loopBars; bar++) {
        bass.push([0, -1, 2]);
        bass.push([(rng() < 0.5 ? 4 : 3), -1, 2]);
    }

    // Pad — root chord per 2 bars
    const pad = [];
    for (let i = 0; i < loopBars; i += 2) {
        pad.push([[0, 2, 4], 4]);
    }

    return {
        name: `Daily (seed ${seed})`,
        bpm,
        loopBars,
        root,
        scale,
        melody,
        bass,
        pad,
    };
}

export class MusicManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.12;       // softer than SFX (sound.js volume = 0.3)
        this.currentTrackId = null;
        this.masterGain = null;
        this.activeNodes = [];    // oscillators currently scheduled
        this.loopTimeout = null;  // setTimeout for next bar batch
        this.currentSeed = null;  // for T4
    }

    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.ctx.destination);
        } catch (e) {
            console.warn('Web Audio API not supported (music)');
            this.enabled = false;
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => this._flushPending()).catch(() => {});
        } else {
            this._flushPending();
        }
    }

    // C-2 fix: 사용자 첫 인터랙션 전에 시도된 playTrack 요청 flush.
    _flushPending() {
        if (this._pendingTrack && this.ctx && this.ctx.state === 'running') {
            const { id, fadeInSec } = this._pendingTrack;
            this._pendingTrack = null;
            this.playTrack(id, fadeInSec);
        }
    }

    // Convert (scale-degree, octave-offset) → MIDI
    degToMidi(track, degree, octOffset) {
        const scaleLen = track.scale.length;
        // Handle negative degrees (lower octave wrap)
        let adjusted = degree;
        let octWrap = 0;
        while (adjusted < 0) { adjusted += scaleLen; octWrap -= 1; }
        while (adjusted >= scaleLen) { adjusted -= scaleLen; octWrap += 1; }
        const semitones = track.scale[adjusted];
        return track.root + semitones + (octOffset + octWrap) * 12;
    }

    // Schedule a single note
    scheduleNote(startTime, durationSec, freq, waveType, velocity, outGain) {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        osc.type = waveType;
        osc.frequency.value = freq;
        osc.connect(noteGain);
        noteGain.connect(outGain);

        // ADSR-ish envelope (chiptune): quick attack, slight decay, sustain, release
        const attackTime = 0.01;
        const releaseTime = Math.min(0.1, durationSec * 0.3);
        noteGain.gain.setValueAtTime(0, startTime);
        noteGain.gain.linearRampToValueAtTime(velocity, startTime + attackTime);
        noteGain.gain.setValueAtTime(velocity, startTime + durationSec - releaseTime);
        noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);

        osc.start(startTime);
        osc.stop(startTime + durationSec + 0.02);

        this.activeNodes.push(osc);
        osc.onended = () => {
            const idx = this.activeNodes.indexOf(osc);
            if (idx >= 0) this.activeNodes.splice(idx, 1);
        };
    }

    // Render one full loop of a track starting at startTime
    renderLoop(track, startTime, trackGain) {
        const secPerBeat = 60 / track.bpm;
        const leadWave = track.leadWave || 'square';

        // Melody (lead, square or sawtooth)
        let t = startTime;
        for (const [deg, oct, durBeats] of track.melody) {
            if (deg === -1) {
                t += durBeats * secPerBeat;
                continue;
            }
            const midi = this.degToMidi(track, deg, oct);
            this.scheduleNote(t, durBeats * secPerBeat * 0.95, midiToFreq(midi), leadWave, 0.5, trackGain);
            t += durBeats * secPerBeat;
        }

        // Bass (triangle for T1/T4, sawtooth for T2, mix for T3)
        const bassWave = (track === TRACKS.T2) ? 'sawtooth' : 'triangle';
        t = startTime;
        for (const [deg, oct, durBeats] of track.bass) {
            const midi = this.degToMidi(track, deg, oct);
            this.scheduleNote(t, durBeats * secPerBeat * 0.9, midiToFreq(midi), bassWave, 0.35, trackGain);
            t += durBeats * secPerBeat;
        }

        // Pad (sine, soft sustained chord)
        t = startTime;
        for (const [chordDegs, durBeats] of track.pad) {
            for (const deg of chordDegs) {
                const midi = this.degToMidi(track, deg, 0);
                this.scheduleNote(t, durBeats * secPerBeat * 0.95, midiToFreq(midi), 'sine', 0.12, trackGain);
            }
            t += durBeats * secPerBeat;
        }

        return startTime + track.loopBars * 4 * secPerBeat;
    }

    // Play a track on continuous loop with optional fade-in
    playTrack(trackId, fadeInSec = 1.5) {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        this.resume();

        // C-2 fix: ctx 가 아직 suspended (사용자 첫 인터랙션 전) 면 pending 저장 + return.
        // resume() 가 user gesture 시 호출되어 _flushPending 으로 재시도.
        if (this.ctx.state === 'suspended') {
            this._pendingTrack = { id: trackId, fadeInSec };
            return;
        }

        if (this.currentTrackId === trackId) return;   // already playing
        if (this.currentTrackId) this.stop(false);     // stop without fade (instant)

        // W-2 guard: T4 데일리는 setDailySeed 선행 필수. 누락 시 fallback 1 로 재생.
        if (trackId === 'T4' && this.currentSeed == null) {
            console.warn('[music] T4 requested without setDailySeed — using fallback seed 1');
        }

        let track;
        if (trackId === 'T4') {
            track = generateT4(this.currentSeed || 1);
        } else {
            track = TRACKS[trackId];
        }
        if (!track) return;

        this.currentTrackId = trackId;
        const trackGain = this.ctx.createGain();
        trackGain.gain.value = 0;
        trackGain.connect(this.masterGain);
        trackGain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + fadeInSec);
        this.currentTrackGain = trackGain;

        // Schedule loops — 2 loops ahead for smooth chaining
        const scheduleNext = (startTime) => {
            if (this.currentTrackId !== trackId) return;
            const nextStart = this.renderLoop(track, startTime, trackGain);
            // Schedule next batch ~80% through loop length
            const loopSec = track.loopBars * 4 * 60 / track.bpm;
            const ms = (nextStart - this.ctx.currentTime - loopSec * 0.2) * 1000;
            this.loopTimeout = setTimeout(() => scheduleNext(nextStart), Math.max(100, ms));
        };
        scheduleNext(this.ctx.currentTime + 0.05);
    }

    // Stop current track. fadeOutSec=0 stops instantly.
    // C-3 fix: dying nodes/gain 을 closure 스냅샷으로 분리. 새 트랙이 시작되어도 이전 cleanup 이 새 oscillator 침범 X.
    stop(fade = true, fadeOutSec = 1.5) {
        if (this.loopTimeout) {
            clearTimeout(this.loopTimeout);
            this.loopTimeout = null;
        }
        const dyingNodes = this.activeNodes;
        const dyingGain = this.currentTrackGain;
        this.activeNodes = [];
        this.currentTrackId = null;
        this.currentTrackGain = null;

        if (dyingGain && fade && fadeOutSec > 0 && this.ctx) {
            const now = this.ctx.currentTime;
            dyingGain.gain.cancelScheduledValues(now);
            dyingGain.gain.setValueAtTime(dyingGain.gain.value, now);
            dyingGain.gain.linearRampToValueAtTime(0, now + fadeOutSec);
            setTimeout(() => {
                dyingNodes.forEach(n => { try { n.stop(); } catch (e) {} });
                try { dyingGain.disconnect(); } catch (e) {}
            }, (fadeOutSec + 0.1) * 1000);
        } else {
            dyingNodes.forEach(n => { try { n.stop(); } catch (e) {} });
            if (dyingGain) { try { dyingGain.disconnect(); } catch (e) {} }
        }
    }

    // Cross-fade to a new track
    crossFade(newTrackId, fadeSec = 1.5) {
        if (this.currentTrackId === newTrackId) return;
        this.stop(true, fadeSec);
        // Start new track at half-overlap
        setTimeout(() => this.playTrack(newTrackId, fadeSec), fadeSec * 500);
    }

    // Set daily seed before playing T4
    setDailySeed(seed) {
        this.currentSeed = seed | 0;
    }

    // Pick track ID from chapter (1-indexed)
    static trackForChapter(chapter) {
        if (chapter <= 3) return 'T1';
        if (chapter <= 5) return 'T2';
        return 'T3';
    }

    // Pick track for daily mode
    static trackForDaily() {
        return 'T4';
    }

    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) this.stop(false);
        return this.enabled;
    }

    setVolume(value) {
        this.volume = Math.max(0, Math.min(1, value));
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
    }
}

// Singleton instance — mirrors sound.js pattern
export const music = new MusicManager();
