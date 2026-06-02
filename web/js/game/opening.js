/**
 * Opening V2 — playable "tutorial-as-opening" sequence (runs once after the
 * first New Game). Replaces the V1 passive cutscene.
 *
 * Eight beats (Claude Design mockup, 2026-05-28 · narrative locked 2026-06-02):
 *   P1 진입의 무게   black → cave-arch fade-in                      (cinematic 1.8s)
 *   P2 이동 학습     dungeon A · arrow-key move (single char, no follower)  (interactive)
 *                    "…발 밑이 차다." → guidance dialogue · reach G → P3
 *   P3 목표(Clear)   cream wash bloom + "Clear · 1/2" → fade-out    (cinematic)
 *   P4 자원 학습     dungeon B · tighter fog · food gauge           (interactive)
 *                    food drains per step → "식량이 부족하다" · @6 moves → P5
 *   P5 작별          camera stop → letterbox → typed "너는 먼저 올라가." (gated)
 *   P6 귀환 메커닉   light column + radial burst, player fades out  (cinematic 1.6s)
 *   P7 사망의 무게   black + "아빠는 돌아오지 않았다." + ember 1px   (cinematic 8s)
 *   P8 본편 시작     guild hall (warm) + "— 세르파 길드 —"          (gated → guild)
 *
 * Self-contained: this is a scripted scene with its own grid + follower, NOT
 * the deterministic campaign engine (RunState/simulator untouched).
 *
 * Skip: ESC at any time → finish (enter guild). Suppressed entirely once
 * `rld_opening_seen` is set.
 *
 * Public API unchanged from V1: start(onComplete) + static hasBeenSeen/markSeen/reset.
 */

import {
    PAL, BASE_W, BASE_H, TILE,
    drawDungeon, drawFog, drawCaveArch, drawCharacter, drawTorch, drawGuildHall,
    drawFatherPortrait, drawChildPortrait, mulberry32,
} from './opening-art.js';
import { t } from '../i18n/index.js';
import { sound } from './sound.js';

const STORAGE_KEY_SEEN = 'rld_opening_seen';

// Floor layout is deterministic from drawDungeon's wall constants.
const WALL_SIDE = 20;
const WALL_TOP = 28;
const FX = WALL_SIDE;
const FY = WALL_TOP;
const FW = BASE_W - WALL_SIDE * 2;       // 440
const FH = BASE_H - WALL_TOP;            // 242
const COLS = Math.floor(FW / TILE);      // 18
const ROWS = Math.floor(FH / TILE);      // 10

// Beat timings (ms). Tunable during dogfooding.
const T = {
    p1: 1800, p1FadeIn: 1400,
    p2GuideAt: 3400,
    p3Bloom: 900, p3Hold: 1000, p3FadeOut: 1200,
    p4LeaveMoves: 6,
    p5Stop: 600, p5Letterbox: 400, p5Cps: 32,
    p6: 1600, p6FadeOut: 900,
    p7: 8000, p7FadeOut: 1100,
    p8Auto: 4500, p8FadeIn: 1100,
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export class OpeningManager {
    constructor() {
        this.screen = document.getElementById('screen-opening');
        this.canvas = document.getElementById('opening-canvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.onComplete = null;

        // refs to overlay layers
        this.el = {};
        if (this.screen) {
            this.canvas.width = BASE_W;
            this.canvas.height = BASE_H;
            this.ctx.imageSmoothingEnabled = false;
            const g = (id) => document.getElementById(id);
            this.el = {
                lbTop: this.screen.querySelector('.op-lb-top'),
                lbBottom: this.screen.querySelector('.op-lb-bottom'),
                resource: g('op-resource'),
                resourceFill: g('op-resource-fill'),
                warn: g('op-warn'),
                clear: g('op-clear'),
                clearProgress: g('op-clear-progress'),
                narrative: g('op-narrative'),
                ember: g('op-ember'),
                dialogue: g('op-dialogue'),
                dialogueSpeaker: g('op-dialogue-speaker'),
                dialogueText: g('op-dialogue-text'),
                dpad: g('op-dpad'),
                hint: g('op-hint'),
                skip: g('op-skip'),
            };
        }

        this._renderBound = (ts) => this._render(ts);
        this.raf = null;
        this.active = false;

        // input
        this._keyHandler = (e) => this._onKey(e);
        this._clickHandler = () => this._confirm();
        if (this.screen) {
            window.addEventListener('keydown', this._keyHandler);
            this.canvas.addEventListener('click', this._clickHandler);
            // touch D-pad — reuses the game's .dpad markup, wired to the opening
            this.screen.querySelectorAll('#op-dpad .dpad-btn[data-op-dir]').forEach((btn) => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const d = btn.getAttribute('data-op-dir');
                    if (d === 'up') this._move(0, -1);
                    else if (d === 'down') this._move(0, 1);
                    else if (d === 'left') this._move(-1, 0);
                    else if (d === 'right') this._move(1, 0);
                });
            });
        }
    }

    static hasBeenSeen() {
        try { return localStorage.getItem(STORAGE_KEY_SEEN) === '1'; } catch (e) { return false; }
    }
    static markSeen() {
        try { localStorage.setItem(STORAGE_KEY_SEEN, '1'); } catch (e) { /* private mode */ }
    }
    static reset() {
        try { localStorage.removeItem(STORAGE_KEY_SEEN); } catch (e) { /* private mode */ }
    }

    start(onComplete) {
        // headless / unmounted guard — resolve immediately so the caller's flow
        // doesn't stall.
        if (!this.screen || !this.ctx) { onComplete?.(); return; }
        if (this._finishTimer) { clearTimeout(this._finishTimer); this._finishTimer = null; }
        this.onComplete = onComplete;
        this.active = true;
        this.finished = false;
        this._resetOverlays();
        if (this.el.skip) this.el.skip.classList.add('show');
        this._enterBeat('p1', T.p1FadeIn);
        this.raf = requestAnimationFrame(this._renderBound);
    }

    // ── beat lifecycle ───────────────────────────────────────────────────────

    _enterBeat(name, fadeInDur = 0) {
        this.beat = name;
        this.beatStart = performance.now();
        this.fadeInDur = fadeInDur;
        this.fadeOut = null;
        this._leaving = false;
        this._resetOverlays();

        switch (name) {
            case 'p2':
                // single character — the child moves alone (no follower).
                // L-corridor (right, then up) forces movement on both axes; the
                // goal sits at the corridor's end, close and reachable.
                this._buildScene({
                    seed: 2, fogRadius: 132,   // ≈5 tiles, matching the real game's default vision
                    path: [
                        [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5],
                        [8, 4], [8, 3], [8, 2], [8, 1],
                    ],
                    player: { c: 2, r: 5 }, father: null, goal: { c: 8, r: 1 },
                });
                this.inputEnabled = true;
                this._p2GuideShown = false;
                this._showHint(t('opening.v2.move'));
                this._showNarrative(t('opening.v2.p2'), 'narrative');  // atmospheric first
                this._showDpad();
                break;
            case 'p3':
                // reuse dungeon A scene, frozen on the goal
                this.inputEnabled = false;
                if (this.el.clear) this.el.clear.classList.add('show');
                break;
            case 'p4':
                // second dungeon — heading for the exit, but food runs low and
                // the father calls it off (P5) before the player gets there.
                this._buildScene({
                    seed: 4, fogRadius: 116,   // slightly tighter — "deeper" beat
                    floor: '#221912', floorLight: '#2e2218', floorHi: '#3a2d20',
                    path: [
                        [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5],
                        [8, 5], [9, 5], [10, 5], [11, 5], [12, 5],
                    ],
                    player: { c: 2, r: 5 }, father: null, goal: { c: 12, r: 5 },
                });
                this.scene.food = 0.5;
                this.inputEnabled = true;
                this._foodShown = false;
                this._showResource(this.scene.food);
                this._showHint(t('opening.v2.move'));
                this._showDpad();
                break;
            case 'p5':
                // father appears for the farewell — a spotlit figure (interim
                // art; a richer standing illustration is commissioned separately),
                // NOT a grid follower (positions independent of the move grid).
                this.inputEnabled = false;
                // Chest-up two-shot: both feet baselines are pushed below the
                // canvas with large scales, so only head→chest shows — matching
                // dialogue portraits, not a figure that dwarfs the other. Father
                // (left, larger) faces the child (right, smaller — a boy). Both
                // front-facing busts in one spotlight.
                this.stage = {
                    fatherX: BASE_W * 0.36, fatherY: BASE_H * 1.5, fatherScale: 8,
                    childX: BASE_W * 0.70, childY: BASE_H * 1.18, childScale: 6,
                };
                // a short exchange, then the father uses the return scroll (P6)
                this._p5Script = [
                    { speaker: t('opening.v2.speaker_dad'), text: t('opening.v2.p5_a') },
                    { speaker: t('opening.v2.speaker_dad'), text: t('opening.v2.p5_b') },
                    { speaker: '', text: t('opening.v2.p5_c') },
                ];
                this._p5Step = 0;
                this._p5Started = false;
                this._p5ScrollUsed = false;
                break;
            case 'p6':
                // keep dungeon B scene; player dematerialises
                this.inputEnabled = false;
                break;
            case 'p7':
                this.inputEnabled = false;
                this._showNarrative(t('opening.v2.p7'), 'narrative');
                if (this.el.ember) this.el.ember.classList.add('show');   // dying flame, set apart from the text
                break;
            case 'p8':
                this.inputEnabled = false;
                OpeningManager.markSeen();
                this._showNarrative('—  ' + t('opening.v2.guild') + '  —', 'guild');
                this._showHint(t('opening.v2.continue'));
                break;
            default:
                break;
        }
    }

    _leave(next, fadeOutDur = 0, fadeInDur = 0) {
        if (this._leaving) return;
        this._leaving = true;
        if (fadeOutDur > 0) {
            this.fadeOut = { start: performance.now(), dur: fadeOutDur, then: next, thenFadeIn: fadeInDur };
        } else {
            this._enterBeat(next, fadeInDur);
        }
    }

    _finish() {
        if (this.finished) return;
        this.finished = true;
        this.active = false;
        if (this.raf) cancelAnimationFrame(this.raf);
        this.raf = null;
        if (this._scrollTimer) { clearTimeout(this._scrollTimer); this._scrollTimer = null; }
        this._clearTyping();
        this._resetOverlays();
        if (this.el.skip) this.el.skip.classList.remove('show');
        OpeningManager.markSeen();
        // Dip to black, swap to the guild screen under cover, then reveal —
        // softens the otherwise hard cut from the opening's guild title card.
        const fade = document.getElementById('transition-fade');
        if (fade) {
            fade.classList.add('show');
            // 500ms in sync with .transition-fade CSS transition (style.css).
            this._finishTimer = setTimeout(() => {
                this._finishTimer = null;
                // finally guarantees the black veil lifts even if onComplete throws —
                // a cosmetic layer must never leave the game blacked out.
                try {
                    this.onComplete?.();
                } finally {
                    requestAnimationFrame(() => fade.classList.remove('show'));
                }
            }, 500);
        } else {
            this.onComplete?.();
        }
    }

    // ── scene model ──────────────────────────────────────────────────────────

    _buildScene(opts) {
        // `path` (array of [c,r]) defines the walkable corridor — everything
        // else is a wall, which funnels the player and forces movement.
        const open = opts.path ? new Set(opts.path.map(([c, r]) => `${c},${r}`)) : null;
        this.scene = {
            seed: opts.seed,
            fogRadius: opts.fogRadius,
            floor: opts.floor || PAL.stone,
            floorLight: opts.floorLight || PAL.stoneLight,
            floorHi: opts.floorHi || PAL.stoneHi,
            player: { ...opts.player },
            father: opts.father ? { ...opts.father } : null,
            goal: opts.goal ? { ...opts.goal } : null,
            open,
            pathArr: opts.path || null,
            pathIndex: 0,
            moveCount: 0,
        };
    }

    _tileCenter(c, r) {
        return { x: FX + c * TILE + TILE / 2, y: FY + r * TILE + TILE / 2 };
    }

    _move(dc, dr) {
        if (!this.inputEnabled || !this.scene) return;
        const s = this.scene;
        // on-rails: only the next tile along the path counts as progress. Any
        // other direction is "wrong way" — the father blocks it with a line so
        // the player can't wander off and get lost.
        const fwd = s.pathArr ? s.pathArr[s.pathIndex + 1] : null;
        if (fwd && s.player.c + dc === fwd[0] && s.player.r + dr === fwd[1]) {
            s.pathIndex++;
            s.player.c = fwd[0];
            s.player.r = fwd[1];
            s.moveCount++;
            this._footstep(s.moveCount);
            this._hideDialogue();
            this._onMove();
        } else {
            this._wrongWay();
        }
    }

    /** Varied footstep — cycles pitch so steps don't sound identical (opening only). */
    _footstep(n) {
        const tones = [196, 220, 208, 233, 202];   // subtle pitch variation
        sound.playTone(tones[n % tones.length], 0.05, 'square', 0.13);
    }

    /** Wrong-direction attempt — father interjects (rotating guidance lines). */
    _wrongWay() {
        const lines = ['opening.v2.guide_a', 'opening.v2.guide_b', 'opening.v2.guide_c'];
        const i = this._guideIdx || 0;
        this._showDialogue(t(lines[i % lines.length]), t('opening.v2.speaker_dad'));
        this._guideIdx = i + 1;
    }

    _onMove() {
        const s = this.scene;
        if (this.beat === 'p2') {
            if (s.goal && s.player.c === s.goal.c && s.player.r === s.goal.r) {
                this.inputEnabled = false;
                this._hideHint();
                this._hideNarrative();
                this._leave('p3', 0, 0);
            }
        } else if (this.beat === 'p4') {
            // food drains with every step — the visible cost of moving
            s.food = Math.max(0, s.food - 0.07);
            this._showResource(s.food);
            if (!this._foodShown && s.food <= 0.28) this._triggerFood();
            if (s.moveCount >= T.p4LeaveMoves) {
                this.inputEnabled = false;
                this._hideHint();
                this._hideNarrative();
                this._hideDialogue();
                this._leave('p5', 0, 0);
            }
        }
    }

    _triggerFood() {
        this._foodShown = true;
        if (this.el.warn) this.el.warn.classList.add('show');
        this._showNarrative(t('opening.v2.food_low'), 'system', { blink: true });
    }

    // ── render loop ──────────────────────────────────────────────────────────

    _render(now) {
        if (!this.active) return;
        const ctx = this.ctx, w = BASE_W, h = BASE_H;
        const el = now - this.beatStart;

        ctx.fillStyle = PAL.black;
        ctx.fillRect(0, 0, w, h);
        this._drawBeat(ctx, w, h, el, now);
        this._tick(el, now);

        // fades (cover = darkest of fade-in residue / fade-out progress)
        let cover = 0;
        if (this.fadeInDur > 0) cover = Math.max(cover, Math.max(0, 1 - el / this.fadeInDur));
        if (this.fadeOut) {
            const p = Math.min(1, (now - this.fadeOut.start) / this.fadeOut.dur);
            cover = Math.max(cover, p);
            if (p >= 1) {
                const fo = this.fadeOut;
                this.fadeOut = null;
                this._enterBeat(fo.then, fo.thenFadeIn);
            }
        }
        if (cover > 0) {
            ctx.fillStyle = `rgba(7,6,10,${cover})`;
            ctx.fillRect(0, 0, w, h);
        }

        this.raf = requestAnimationFrame(this._renderBound);
    }

    /** Time-based advance for cinematic beats + scheduled overlays. */
    _tick(el, now) {
        switch (this.beat) {
            case 'p1':
                if (el >= T.p1) this._leave('p2', 600, 600);
                break;
            case 'p2':
                // after the atmospheric line, swap to an explicit guidance line
                // (dialogue box) so the player knows exactly where to head.
                if (!this._p2GuideShown && el >= T.p2GuideAt) {
                    this._p2GuideShown = true;
                    if (this.scene.moveCount === 0) {
                        this._hideNarrative();
                        this._showDialogue(t('opening.v2.guide'), t('opening.v2.speaker_dad'));
                    }
                }
                break;
            case 'p3':
                if (el >= T.p3Bloom + T.p3Hold) this._leave('p4', T.p3FadeOut, 600);
                break;
            case 'p5':
                if (!this._p5Started && el >= T.p5Stop + T.p5Letterbox) {
                    this._p5Started = true;
                    const ln = this._p5Script[0];
                    this._typeDialogue(ln.text, ln.speaker);
                }
                break;
            case 'p6':
                if (el >= T.p6) this._leave('p7', T.p6FadeOut, 600);
                break;
            case 'p7':
                if (el >= T.p7) this._leave('p8', T.p7FadeOut, T.p8FadeIn);
                break;
            case 'p8':
                if (el >= T.p8Auto) this._finish();
                break;
            default:
                break;
        }
    }

    _drawBeat(ctx, w, h, el, now) {
        switch (this.beat) {
            case 'p1': {
                const glow = clamp(el / T.p1FadeIn, 0, 1) * 0.85;
                drawCaveArch(ctx, w, h, { glow });
                break;
            }
            case 'p2':
                this._drawDungeonScene(ctx, w, h, now, { showGoal: true });
                break;
            case 'p3': {
                this._drawDungeonScene(ctx, w, h, now, { showGoal: true, fogBoost: true });
                // cream wash bloom over the goal
                const s = this.scene;
                if (s && s.goal) {
                    const g = this._tileCenter(s.goal.c, s.goal.r);
                    const k = clamp(el / T.p3Bloom, 0, 1);
                    const wash = ctx.createRadialGradient(g.x, g.y, 4, g.x, g.y, 30 + 200 * k);
                    wash.addColorStop(0, `rgba(212,192,122,${0.45 * k})`);
                    wash.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = wash;
                    ctx.fillRect(0, 0, w, h);
                }
                break;
            }
            case 'p4':
                this._drawDungeonScene(ctx, w, h, now, { showGoal: true });
                break;
            case 'p5':
                this._drawFarewell(ctx, w, h, el, now);
                break;
            case 'p6':
                this._drawReturnBurst(ctx, w, h, el);
                break;
            case 'p7':
                // pure black; DOM shows the line + ember
                break;
            case 'p8': {
                drawGuildHall(ctx, w, h);
                drawCharacter(ctx, w * 0.5, h * 0.78, 'player', TILE);
                const beam = ctx.createLinearGradient(0, 0, w * 0.5, h * 0.7);
                beam.addColorStop(0, 'rgba(230,200,140,0.25)');
                beam.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = beam;
                ctx.fillRect(0, 0, w, h);
                break;
            }
            default:
                break;
        }
    }

    /**
     * Tilemap-style walls: every non-walkable tile is filled solid black, and a
     * jagged pixel-art rim is drawn on the floor side of each floor↔wall border
     * so the corridor reads as a continuous rocky outline around black.
     */
    _drawWalls(ctx, s) {
        const isWall = (c, r) => c < 0 || r < 0 || c >= COLS || r >= ROWS || !s.open.has(`${c},${r}`);
        // solid-black interior
        ctx.fillStyle = '#040303';
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (isWall(c, r)) ctx.fillRect(FX + c * TILE, FY + r * TILE, TILE, TILE);
            }
        }
        // pixel-art rim on the floor tiles facing a wall
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (isWall(c, r)) continue;
                const x = FX + c * TILE, y = FY + r * TILE;
                if (isWall(c, r - 1)) this._rim(ctx, x, y, 'top', (c * 7 + r * 13) | 1);
                if (isWall(c, r + 1)) this._rim(ctx, x, y, 'bottom', (c * 11 + r * 5) | 1);
                if (isWall(c - 1, r)) this._rim(ctx, x, y, 'left', (c * 3 + r * 17) | 1);
                if (isWall(c + 1, r)) this._rim(ctx, x, y, 'right', (c * 19 + r * 2) | 1);
            }
        }
    }

    _rim(ctx, x, y, side, seed) {
        const rng = mulberry32(seed);
        const tones = ['#2a2520', '#382c20', '#4c3c2c', '#1a1610'];
        for (let i = 0; i < TILE; i += 2) {
            const d = 2 + Math.floor(rng() * 4);   // 2–5 px of rock into the floor
            ctx.fillStyle = tones[Math.floor(rng() * tones.length)];
            if (side === 'top') ctx.fillRect(x + i, y, 2, d);
            else if (side === 'bottom') ctx.fillRect(x + i, y + TILE - d, 2, d);
            else if (side === 'left') ctx.fillRect(x, y + i, d, 2);
            else if (side === 'right') ctx.fillRect(x + TILE - d, y + i, d, 2);
        }
    }

    /** Dungeon + single character + fog + persistent goal beacon. P2/P3/P4. */
    _drawDungeonScene(ctx, w, h, now, opts = {}) {
        const s = this.scene;
        if (!s) return;

        // Center-lock follow camera (matches in-game): translate the world so the
        // player's tile is always at screen center; the camera follows as they
        // move. Fog/torch/player stay screen-fixed at the center; the goal beacon
        // is positioned in screen space so it slides in with the camera. Area
        // beyond the room shows the deep-wall backdrop.
        const p = this._tileCenter(s.player.c, s.player.r);
        const camX = Math.round(w / 2 - p.x);
        const camY = Math.round(h / 2 - p.y);

        // backdrop to cover edges the camera exposes beyond the room
        ctx.fillStyle = PAL.bgDeep;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.translate(camX, camY);
        drawDungeon(ctx, w, h, {
            seed: s.seed, tile: TILE,
            floor: s.floor, floorLight: s.floorLight, floorHi: s.floorHi,
        });
        // corridor walls — solid-black interior, pixel-art rim along the edge
        if (s.open) this._drawWalls(ctx, s);
        ctx.restore();

        const radius = opts.fogBoost ? s.fogRadius + 40 : s.fogRadius;
        drawFog(ctx, w, h, { x: w / 2, y: h / 2 }, radius);

        // the player carries the light — a warm torch glow punches through the
        // fog so the player (always screen-center under center-lock) is visible.
        const flick = 0.92 + 0.1 * Math.sin(now / 140);
        drawTorch(ctx, w / 2, h / 2, flick);
        drawCharacter(ctx, w / 2, h / 2, 'player', TILE);

        // goal beacon — drawn AFTER fog so it stays visible as a distant light,
        // the "저기로 가자" landmark. Positioned in screen space (world + camera).
        if (opts.showGoal && s.goal) {
            const g = this._tileCenter(s.goal.c, s.goal.r);
            const gx = g.x + camX, gy = g.y + camY;
            const pulse = 0.5 + 0.3 * Math.sin(now / 320);
            const beac = ctx.createRadialGradient(gx, gy, 1, gx, gy, 36);
            beac.addColorStop(0, `rgba(230,200,120,${0.55 * pulse})`);
            beac.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = beac;
            ctx.fillRect(gx - 44, gy - 44, 88, 88);
            drawCharacter(ctx, gx, gy, 'goal', TILE);
        }
    }

    /** P5 farewell — dimmed dungeon B + father standing portrait in spotlight. */
    _drawFarewell(ctx, w, h, el, now) {
        const s = this.scene;
        if (s) {
            drawDungeon(ctx, w, h, {
                seed: s.seed, tile: TILE,
                floor: s.floor, floorLight: s.floorLight, floorHi: s.floorHi,
            });
        }
        // dim the scene — time-stop / memory feel
        ctx.fillStyle = 'rgba(5,4,3,0.55)';
        ctx.fillRect(0, 0, w, h);
        const st = this.stage;
        if (!st) return;
        // one soft spotlight spanning both busts
        const mid = (st.fatherX + st.childX) / 2;
        const sp = ctx.createRadialGradient(mid, h * 0.44, 12, mid, h * 0.44, 220);
        sp.addColorStop(0, 'rgba(192,138,58,0.22)');
        sp.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sp;
        ctx.fillRect(0, 0, w, h);
        // warm key light between them (the father's lit +x side faces the child)
        drawTorch(ctx, mid, h * 0.20, 0.8);
        drawFatherPortrait(ctx, st.fatherX, st.fatherY, st.fatherScale);
        drawChildPortrait(ctx, st.childX, st.childY, st.childScale);
        this._bustVignette(ctx, w, h);
    }

    /** Bottom-up darkness that fades the chest-up portrait's cropped lower body. */
    _bustVignette(ctx, w, h) {
        const vg = ctx.createLinearGradient(0, h * 0.68, 0, h);
        vg.addColorStop(0, 'rgba(5,4,3,0)');
        vg.addColorStop(1, 'rgba(5,4,3,0.96)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, h * 0.68, w, h * 0.32);
    }

    /** P6 return — father remains, child dematerialises in a burst of light. */
    _drawReturnBurst(ctx, w, h, el) {
        const s = this.scene, st = this.stage;
        if (s) {
            drawDungeon(ctx, w, h, {
                seed: s.seed, tile: TILE,
                floor: s.floor, floorLight: s.floorLight, floorHi: s.floorHi,
            });
        }
        ctx.fillStyle = 'rgba(5,4,3,0.55)';
        ctx.fillRect(0, 0, w, h);
        if (!st) return;
        const k = clamp(el / T.p6, 0, 1);
        const cx = st.childX, cy = h * 0.58;   // child's visible chest — return-light origin
        // father fades as the return light overtakes the scene
        ctx.globalAlpha = clamp(1 - k * 1.6, 0, 1);
        drawFatherPortrait(ctx, st.fatherX, st.fatherY, st.fatherScale);
        ctx.globalAlpha = 1;
        // the child (you) dissolves into the light — the scroll carries you off
        ctx.globalAlpha = clamp(1 - k * 1.2, 0, 1);
        drawChildPortrait(ctx, st.childX, st.childY, st.childScale);
        ctx.globalAlpha = 1;
        this._bustVignette(ctx, w, h);

        // vertical light column where the child stood — the "portal" of return
        // light. Widened (was 36px) so the beam envelops the child bust instead
        // of being a thin slit through it. Child bust ≈ 72px wide at scale 6.
        const colA = 0.6 * Math.sin(Math.PI * k);
        const colW = 96;
        const col = ctx.createLinearGradient(cx, 0, cx, h);
        col.addColorStop(0, 'rgba(230,200,120,0)');
        col.addColorStop(0.5, `rgba(230,200,120,${colA})`);
        col.addColorStop(1, 'rgba(230,200,120,0)');
        ctx.fillStyle = col;
        ctx.fillRect(cx - colW / 2, 0, colW, h);

        // radial burst
        const peak = Math.sin(Math.PI * k);
        const burst = ctx.createRadialGradient(cx, cy, 4, cx, cy, 130);
        burst.addColorStop(0, `rgba(255,235,180,${0.85 * peak})`);
        burst.addColorStop(0.3, `rgba(230,181,98,${0.45 * peak})`);
        burst.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = burst;
        ctx.fillRect(0, 0, w, h);

        // rising sparkle pixels (stable seed)
        const rng = mulberry32(99);
        ctx.globalAlpha = peak;
        ctx.fillStyle = PAL.accentHi;
        for (let i = 0; i < 14; i++) {
            const sx = cx + (rng() - 0.5) * 60;
            const sy = cy - rng() * 80 * k;
            ctx.fillRect(sx, sy, 2, 2);
        }
        ctx.globalAlpha = 1;
    }

    // ── overlay helpers (DOM) ────────────────────────────────────────────────

    _resetOverlays() {
        const e = this.el;
        if (!e || !e.narrative) return;
        this._clearTyping();
        this._clearDialogueTimer();
        ['lbTop', 'lbBottom', 'resource', 'warn', 'clear', 'dpad', 'ember'].forEach((k) => e[k] && e[k].classList.remove('show'));
        e.narrative.className = 'op-narrative';
        e.narrative.textContent = '';
        if (e.dialogue) e.dialogue.classList.remove('show', 'ready');
        if (e.dialogueText) e.dialogueText.textContent = '';
        if (e.dialogueSpeaker) e.dialogueSpeaker.textContent = '';
        if (e.hint) { e.hint.classList.remove('show'); e.hint.textContent = ''; }
        // letterbox only for P5
        if (this.beat === 'p5' && e.lbTop && e.lbBottom) {
            e.lbTop.classList.add('show');
            e.lbBottom.classList.add('show');
        }
    }

    _showNarrative(text, tone = 'narrative', { blink = false } = {}) {
        const n = this.el.narrative;
        if (!n) return;
        this._hideDialogue();   // single text channel — never overlap the dialogue box
        n.className = 'op-narrative op-narrative--' + tone + (blink ? ' op-blink3' : '');
        n.textContent = text;
        // force reflow then reveal
        void n.offsetWidth;
        n.classList.add('show');
    }

    _hideNarrative() {
        const n = this.el.narrative;
        if (n) n.classList.remove('show');
    }

    _showHint(text) {
        const hint = this.el.hint;
        if (!hint) return;
        hint.textContent = text;
        hint.classList.add('show');
    }
    _hideHint() {
        if (this.el.hint) this.el.hint.classList.remove('show');
    }

    _showDpad() {
        if (this.el.dpad) this.el.dpad.classList.add('show');
    }

    // ── dialogue window (guidance + dialogue beats) ──────────────────────────

    _showDialogue(text, speaker = '', autoHideMs = 2600) {
        const d = this.el.dialogue;
        if (!d) return;
        this._clearTyping();
        this._clearDialogueTimer();
        this._hideNarrative();          // never overlap the floating narration
        this.el.dialogueSpeaker.textContent = speaker;
        this.el.dialogueText.textContent = text;
        d.classList.remove('ready');
        d.classList.add('show');
        // auto-dismiss so a guidance line never lingers over the map
        if (autoHideMs) this._dialogueTimer = setTimeout(() => this._hideDialogue(), autoHideMs);
    }

    _hideDialogue() {
        this._clearDialogueTimer();
        if (this.el.dialogue) this.el.dialogue.classList.remove('show', 'ready');
    }

    _clearDialogueTimer() {
        if (this._dialogueTimer) { clearTimeout(this._dialogueTimer); this._dialogueTimer = null; }
    }

    _showResource(fill) {
        if (this.el.resource) this.el.resource.classList.add('show');
        if (this.el.resourceFill) this.el.resourceFill.style.width = Math.round(fill * 100) + '%';
    }

    // ── typewriter (P5 dialogue, into the dialogue window) ───────────────────

    _typeDialogue(text, speaker = '') {
        const d = this.el.dialogue, tx = this.el.dialogueText;
        if (!d) return;
        this._clearTyping();
        this._clearDialogueTimer();     // typed dialogue waits for confirm — no auto-hide
        this._hideNarrative();
        this.el.dialogueSpeaker.textContent = speaker;
        tx.textContent = '';
        d.classList.remove('ready');
        d.classList.add('show');
        this._typeFull = text;
        let i = 0;
        this._typeTimer = setInterval(() => {
            i++;
            tx.textContent = text.slice(0, i);
            if (i >= text.length) {
                this._clearTyping();
                this._typingDone = true;
                d.classList.add('ready');
                this._showHint(t('opening.v2.continue'));
            }
        }, T.p5Cps);
    }

    _finishTypingNow() {
        if (this._typeTimer && this.el.dialogueText) {
            this.el.dialogueText.textContent = this._typeFull;
        }
        this._clearTyping();
        this._typingDone = true;
        if (this.el.dialogue) this.el.dialogue.classList.add('ready');
        this._showHint(t('opening.v2.continue'));
    }

    _clearTyping() {
        if (this._typeTimer) { clearInterval(this._typeTimer); this._typeTimer = null; }
    }

    // ── input ────────────────────────────────────────────────────────────────

    _onKey(e) {
        if (!this.active || !this.screen.classList.contains('active')) return;
        const k = e.key;
        if (k === 'Escape') { e.preventDefault(); this._finish(); return; }
        let dir = null;
        if (k === 'ArrowLeft') dir = [-1, 0];
        else if (k === 'ArrowRight') dir = [1, 0];
        else if (k === 'ArrowUp') dir = [0, -1];
        else if (k === 'ArrowDown') dir = [0, 1];
        if (dir) {
            e.preventDefault();
            // movement beats: arrows move. gated beats (P5/P7/P8): arrows advance.
            if (this.inputEnabled) this._move(dir[0], dir[1]);
            else this._confirm();
            return;
        }
        if (k === ' ' || k === 'Enter') { e.preventDefault(); this._confirm(); return; }
    }

    _confirm() {
        if (!this.active) return;
        if (this.beat === 'p5') {
            if (this._typeTimer) { this._finishTypingNow(); return; }   // complete current line
            this._p5Step++;
            if (this._p5Step < this._p5Script.length) {
                const ln = this._p5Script[this._p5Step];
                this._typeDialogue(ln.text, ln.speaker);
            } else if (!this._p5ScrollUsed) {
                this._p5ScrollUsed = true;
                this._useReturnScroll();
            }
            return;
        }
        // P7 (loss) and P8 (guild title card) are one perceived "ending" — a click
        // anywhere in it should land on the guild in one go. P8 still auto-shows as
        // a bridge for players who don't click through.
        if (this.beat === 'p7' || this.beat === 'p8') { this._finish(); return; }
    }

    /** Father uses the return scroll — system message + chime, then the burst. */
    _useReturnScroll() {
        this._hideDialogue();
        this._hideHint();
        this._showNarrative(t('opening.v2.scroll'), 'system');
        sound.playArpeggio([523, 784, 1047, 1319], 0.07, 'sine', 0.25);   // 삐용~
        this._scrollTimer = setTimeout(() => this._leave('p6', 0, 0), 1300);
    }
}
