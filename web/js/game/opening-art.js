/**
 * Opening V2 — procedural pixel-art toolkit.
 *
 * Ported from the Claude Design mockup (canvas-art.jsx, 2026-05-28) into a
 * dependency-free ES module. All routines write to a 2D context at the base
 * resolution (BASE_W × BASE_H); the canvas element is CSS-scaled up with
 * `image-rendering: pixelated` so the chunky pixel grain reads as intentional.
 *
 * Palette A is mirrored here as JS values — the SAME hex live in :root via
 * --col-* in style.css. Two accent tones coexist by design:
 *   rust (brick-red)  → menu / title UI only   (untouched by the opening)
 *   amber             → opening + in-dungeon    (torch / return / ember)
 *
 * Synced to RLD V1 source (title-art.js + style.css); V1 names noted inline.
 */

export const BASE_W = 480;
export const BASE_H = 270;
export const TILE = 24;

export const PAL = {
    black:       '#07060a',
    bg:          '#0a0907',   // V1 bgTop          (--col-bg)
    bgDeep:      '#15120e',   // V1 bgMid
    bgLight:     '#1c1813',
    stone:       '#2a2520',   // V1 stoneMid       (dungeon wall/floor)
    stoneLight:  '#382c20',   // PDF brown, kept
    stoneHi:     '#4c3c2c',
    text:        '#e8dcc4',   // V1 bone           (--col-text, higher contrast)
    textDim:     '#8a7a59',   // PDF warm, kept
    textMuted:   '#544a37',
    accent:      '#c08a3a',   // amber — IN-GAME accent (torch/return/ember)
    accentHi:    '#e6b562',   // PDF amber-hi, kept
    accentDim:   '#6a4a1f',
    rust:        '#8b3a1f',   // V1 brick-red — MENU/TITLE accent only
    playerBlue:  '#4c5a72',
    playerSkin:  '#a07a55',
    fatherBrown: '#3a2a1c',
    fatherCloak: '#241810',
    goal:        '#d4c07a',   // PDF, kept
};

// ── Seeded RNG so pixel noise is stable per scene ────────────────────────────
export function mulberry32(a) {
    return function () {
        let t = (a += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Fill a rect with a base color + scattered darker/lighter "pixel" flecks —
// gives every surface that canvas-textured feel.
export function flecks(ctx, x, y, w, h, base, dark, light, seed, density = 0.12) {
    const rng = mulberry32(seed);
    if (base !== 'rgba(0,0,0,0)') {
        ctx.fillStyle = base;
        ctx.fillRect(x, y, w, h);
    }
    const px = 2;
    const count = Math.floor((w * h * density) / (px * px));
    for (let i = 0; i < count; i++) {
        const fx = x + Math.floor(rng() * (w / px)) * px;
        const fy = y + Math.floor(rng() * (h / px)) * px;
        ctx.fillStyle = rng() < 0.55 ? dark : light;
        ctx.fillRect(fx, fy, px, px);
    }
}

/**
 * Dungeon floor grid with subtle stone variation + thin grout lines and a dark
 * wall band on top/sides. Returns the floor rect + tile size so callers can
 * place characters in tile coordinates.
 */
export function drawDungeon(ctx, w, h, opts = {}) {
    const {
        tile = TILE,
        seed = 1,
        wallTop = 28,
        wallSide = 20,
        floor = PAL.stone,
        floorLight = PAL.stoneLight,
        floorHi = PAL.stoneHi,
    } = opts;

    // backdrop wall (above the floor area)
    flecks(ctx, 0, 0, w, wallTop, PAL.bg, PAL.black, PAL.stone, seed * 3, 0.18);
    // side strips
    flecks(ctx, 0, wallTop, wallSide, h - wallTop, PAL.bgDeep, PAL.black, PAL.stone, seed * 5, 0.16);
    flecks(ctx, w - wallSide, wallTop, wallSide, h - wallTop, PAL.bgDeep, PAL.black, PAL.stone, seed * 7, 0.16);

    const fx = wallSide;
    const fy = wallTop;
    const fw = w - wallSide * 2;
    const fh = h - wallTop;

    flecks(ctx, fx, fy, fw, fh, floor, PAL.bgDeep, floorLight, seed * 11, 0.2);

    // tile lines (low-contrast)
    ctx.fillStyle = PAL.bgDeep;
    for (let x = fx; x <= fx + fw; x += tile) ctx.fillRect(x, fy, 1, fh);
    for (let y = fy; y <= fy + fh; y += tile) ctx.fillRect(fx, y, fw, 1);

    // occasional brighter "stone" tile
    const rng = mulberry32(seed * 13);
    const cols = Math.floor(fw / tile);
    const rows = Math.floor(fh / tile);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (rng() < 0.08) {
                flecks(ctx, fx + c * tile + 1, fy + r * tile + 1, tile - 1, tile - 1,
                    floorLight, PAL.bgDeep, floorHi, seed * (c + 1) * (r + 1), 0.18);
            }
        }
    }

    // wall cap highlight just above the floor
    ctx.fillStyle = PAL.stoneHi;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(fx, fy, fw, 1);
    ctx.globalAlpha = 1;

    return { fx, fy, fw, fh, tile, cols, rows };
}

// Radial darkness — the fog-of-war feel. Soft outer black with a hole over the
// focal point.
export function drawFog(ctx, w, h, center, radius) {
    const grd = ctx.createRadialGradient(center.x, center.y, radius * 0.25, center.x, center.y, radius);
    // tiles within vision stay clearly lit; only the outer edge fades to black
    grd.addColorStop(0, 'rgba(8,6,4,0)');
    grd.addColorStop(0.5, 'rgba(8,6,4,0.04)');
    grd.addColorStop(0.78, 'rgba(8,6,4,0.6)');
    grd.addColorStop(1, 'rgba(5,4,2,0.98)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
}

/** Cave-entrance arch silhouette with a glow inside — Page 1 fade-in target. */
export function drawCaveArch(ctx, w, h, opts = {}) {
    const { glow = 0.6 } = opts;
    // outside — desaturated slate, light enough that a black silhouette reads
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#46453f');
    sky.addColorStop(0.6, '#2d2a23');
    sky.addColorStop(1, '#1a1610');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    flecks(ctx, 0, 0, w, h, 'rgba(0,0,0,0)', PAL.bgDeep, PAL.stoneHi, 21, 0.08);

    // ground line — darker dirt
    flecks(ctx, 0, h - 36, w, 36, PAL.bgDeep, PAL.black, PAL.stone, 23, 0.2);

    // arch silhouette (jagged rocky frame around an arched opening)
    ctx.fillStyle = PAL.black;
    const cx = w / 2;
    const archW = w * 0.5;
    const archH = h * 0.72;
    const rng = mulberry32(31);
    const steps = 40;
    const left = cx - archW / 2;
    const right = cx + archW / 2;
    const baseY = h - 36;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, h);
    ctx.lineTo(right + rng() * 8, h - 36);
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const ang = Math.PI * (1 - t);
        const jitter = (rng() - 0.5) * 14;
        const ax = cx + Math.cos(ang) * (archW / 2 + jitter);
        const ay = baseY - Math.sin(ang) * archH + jitter * 0.3;
        ctx.lineTo(ax, ay);
    }
    ctx.lineTo(left - rng() * 8, h - 36);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // inner glow (torch beyond the arch)
    const glowGrd = ctx.createRadialGradient(cx, baseY - archH * 0.55, 4, cx, baseY - archH * 0.55, archH * 0.7);
    glowGrd.addColorStop(0, `rgba(230,181,98,${0.55 * glow})`);
    glowGrd.addColorStop(0.4, `rgba(192,138,58,${0.22 * glow})`);
    glowGrd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrd;
    ctx.fillRect(0, 0, w, h);
}

/**
 * Tiny character on a tile. player = blue tunic boy (short); father = brown
 * cloak (tall); goal = a faintly glowing G glyph.
 */
export function drawCharacter(ctx, cx, cy, kind = 'player', tile = TILE) {
    const px = tile / 8;
    const x0 = Math.floor(cx - tile / 2);
    const y0 = Math.floor(cy - tile / 2);

    if (kind === 'player') {
        ctx.fillStyle = PAL.playerSkin;
        ctx.fillRect(x0 + 3 * px, y0 + 2 * px, 2 * px, 2 * px);   // head
        ctx.fillStyle = PAL.playerBlue;
        ctx.fillRect(x0 + 2 * px, y0 + 4 * px, 4 * px, 3 * px);   // tunic
        ctx.fillStyle = PAL.fatherCloak;
        ctx.fillRect(x0 + 2 * px, y0 + 7 * px, 2 * px, px);       // legs
        ctx.fillRect(x0 + 4 * px, y0 + 7 * px, 2 * px, px);
        ctx.fillStyle = PAL.fatherBrown;
        ctx.fillRect(x0 + 3 * px, y0 + 1 * px, 2 * px, px);       // hair tuft
    } else if (kind === 'father') {
        ctx.fillStyle = PAL.fatherBrown;
        ctx.fillRect(x0 + 2 * px, y0, 4 * px, 2 * px);            // hood
        ctx.fillStyle = PAL.playerSkin;
        ctx.fillRect(x0 + 3 * px, y0 + 2 * px, 2 * px, px);       // face
        ctx.fillStyle = PAL.fatherCloak;
        ctx.fillRect(x0 + 2 * px, y0 + 3 * px, 4 * px, 5 * px);   // cloak
        ctx.fillStyle = PAL.fatherBrown;
        ctx.fillRect(x0 + 5 * px, y0 + 3 * px, px, 4 * px);       // highlight
    } else if (kind === 'goal') {
        ctx.fillStyle = PAL.goal;
        ctx.fillRect(x0 + 2 * px, y0 + 2 * px, 4 * px, px);       // G — top
        ctx.fillRect(x0 + 2 * px, y0 + 2 * px, px, 4 * px);       // left
        ctx.fillRect(x0 + 2 * px, y0 + 5 * px, 4 * px, px);       // bottom
        ctx.fillRect(x0 + 4 * px, y0 + 4 * px, 2 * px, px);       // middle nub
        ctx.fillRect(x0 + 5 * px, y0 + 4 * px, px, 2 * px);
        const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, tile * 0.9);
        g.addColorStop(0, 'rgba(230,200,120,0.35)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x0 - tile, y0 - tile, tile * 3, tile * 3);
    }
}

/**
 * Standing father portrait (VN-style) — front-facing, eyes covered by a dark
 * band (memory motif), rust cape, faint hero glow. Ported from the V1 opening
 * art; drawn around feet-base (cx, baseY) and scaled up for dialogue beats.
 */
export function drawFatherPortrait(ctx, cx, baseY, scale = 5) {
    const C = {
        skin: '#d4a878', brass: '#b8860b', crimson: '#5a1a1a',
        stoneDk: '#3a3530', bodyDk: '#1a1410',
        capeMain: '#8b3a1f', capeShadow: '#3a1208', eyeBand: '#000000',
    };
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(baseY));
    ctx.scale(scale, scale);
    // legs
    ctx.fillStyle = C.bodyDk; ctx.fillRect(-3, -5, 2, 6); ctx.fillRect(1, -5, 2, 6);
    ctx.fillStyle = C.stoneDk; ctx.fillRect(-3, 0, 2, 1); ctx.fillRect(1, 0, 2, 1);
    // body
    ctx.fillStyle = C.crimson; ctx.fillRect(-4, -12, 9, 7);
    // belt
    ctx.fillStyle = C.stoneDk; ctx.fillRect(-4, -6, 9, 1);
    ctx.fillStyle = C.brass; ctx.fillRect(0, -6, 1, 1);
    // cape
    ctx.fillStyle = C.capeMain;
    ctx.fillRect(-6, -12, 2, 8); ctx.fillRect(5, -12, 2, 8); ctx.fillRect(-5, -4, 11, 4);
    ctx.fillStyle = C.capeShadow; ctx.fillRect(-6, -10, 1, 5); ctx.fillRect(6, -10, 1, 5);
    // head
    ctx.fillStyle = C.skin; ctx.fillRect(-2, -17, 5, 5);
    // eye band (memory motif)
    ctx.fillStyle = C.eyeBand; ctx.fillRect(-3, -15, 7, 2);
    // hair
    ctx.fillStyle = C.stoneDk;
    ctx.fillRect(-2, -18, 5, 1); ctx.fillRect(-3, -17, 1, 1); ctx.fillRect(3, -17, 1, 1);
    ctx.restore();
    // faint hero glow (world-space gradient, not scaled rects)
    const gy = baseY - 9 * scale;
    const glow = ctx.createRadialGradient(cx, gy, 1, cx, gy, 14 * scale);
    glow.addColorStop(0, 'rgba(184,134,11,0.30)');
    glow.addColorStop(0.5, 'rgba(139,58,31,0.12)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 14 * scale, baseY - 22 * scale, 28 * scale, 24 * scale);
}

/** Small flickering torch glow at (x,y). intensity 0..1. */
export function drawTorch(ctx, x, y, intensity = 1) {
    const g = ctx.createRadialGradient(x, y, 1, x, y, 60 * intensity);
    g.addColorStop(0, `rgba(230,181,98,${0.7 * intensity})`);
    g.addColorStop(0.4, `rgba(192,138,58,${0.25 * intensity})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 80, y - 80, 160, 160);
    ctx.fillStyle = PAL.accentHi;
    ctx.fillRect(x - 1, y - 1, 2, 2);   // bright core
}

/** Guild hall — wider, warmer interior. Page 8. */
export function drawGuildHall(ctx, w, h) {
    // back wall — wooden plank pattern
    flecks(ctx, 0, 0, w, h * 0.62, PAL.bgLight, PAL.bgDeep, PAL.stoneLight, 41, 0.18);
    ctx.fillStyle = PAL.bgDeep;
    for (let y = 24; y < h * 0.62; y += 22) ctx.fillRect(0, y, w, 1);
    // floor — stone
    flecks(ctx, 0, h * 0.62, w, h * 0.38, PAL.stone, PAL.bgDeep, PAL.stoneHi, 43, 0.2);
    ctx.fillStyle = PAL.bgDeep;
    for (let x = 0; x <= w; x += 36) ctx.fillRect(x, h * 0.62, 1, h * 0.38);

    // bulletin board
    const boardX = w * 0.18, boardY = h * 0.12, boardW = w * 0.22, boardH = h * 0.32;
    flecks(ctx, boardX, boardY, boardW, boardH, PAL.fatherBrown, PAL.fatherCloak, PAL.stoneLight, 47, 0.22);
    ctx.fillStyle = PAL.text;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(boardX + 12, boardY + 14, 28, 22);
    ctx.fillRect(boardX + 50, boardY + 20, 22, 18);
    ctx.fillRect(boardX + 14, boardY + 50, 32, 26);
    ctx.fillRect(boardX + 60, boardY + 56, 26, 20);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = PAL.black;
    ctx.lineWidth = 2;
    ctx.strokeRect(boardX, boardY, boardW, boardH);

    // fireplace center-right
    const fpX = w * 0.6, fpY = h * 0.28, fpW = w * 0.18, fpH = h * 0.34;
    flecks(ctx, fpX, fpY, fpW, fpH, PAL.stone, PAL.bgDeep, PAL.stoneHi, 53, 0.2);
    ctx.fillStyle = PAL.black;
    ctx.fillRect(fpX + fpW * 0.18, fpY + fpH * 0.35, fpW * 0.64, fpH * 0.55);
    ctx.fillStyle = PAL.accent;
    ctx.fillRect(fpX + fpW * 0.3, fpY + fpH * 0.65, fpW * 0.4, fpH * 0.2);
    ctx.fillStyle = PAL.accentHi;
    ctx.fillRect(fpX + fpW * 0.4, fpY + fpH * 0.72, fpW * 0.2, fpH * 0.1);
    const g = ctx.createRadialGradient(fpX + fpW / 2, fpY + fpH * 0.8, 6, fpX + fpW / 2, fpY + fpH * 0.8, 140);
    g.addColorStop(0, 'rgba(230,181,98,0.45)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // desk in foreground
    const dx = w * 0.32, dy = h * 0.74, dw = w * 0.36, dh = h * 0.1;
    flecks(ctx, dx, dy, dw, dh, PAL.fatherBrown, PAL.fatherCloak, PAL.stoneLight, 59, 0.2);
    ctx.fillStyle = PAL.bgDeep;
    ctx.fillRect(dx, dy, dw, 2);
    ctx.fillStyle = PAL.bgLight;
    ctx.fillRect(dx + 30, dy - 8, 28, 8);
    ctx.fillStyle = PAL.text;
    ctx.fillRect(dx + dw - 50, dy - 5, 26, 5);
}
