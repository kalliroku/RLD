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
 * Standing father portrait — front-facing veteran hero (clear eyes, grizzled
 * beard, broad rust cape over leather, two brass points). Drawn around feet-base
 * (cx, baseY) and scaled up for the P5/P6 farewell; the caller owns the
 * spotlight/glow, so this draws character pixels only. Authored by Claude Design
 * from the locked reference (docs/PM/handoffs/assets/...father-ref-hero.png).
 */
export function drawFatherPortrait(ctx, cx, baseY, scale = 4) {
    const P = PAL;
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(baseY));
    ctx.scale(scale, scale);

    // local helpers — integer-unit rects keep the pixel grid crisp
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

    // ── 1. CAPE — broad mass over shoulders+chest, drapes down the flanks ─
    // The cape is the WIDEST shape; the body nests inside it. Clasped at the
    // throat, it opens in a V to reveal leather. Solid tonal blocks (no
    // scatter), STRAIGHT hems, one clean amber edge on the torch side (+x).
    R(-11, -33, 22, 11, P.rust);             // shoulder + chest mass (broad)
    R(-11, -33, 3, 11, P.fatherCloak);       // shadow side (−x)
    R(-3, -33, 6, 1, P.fatherCloak);         // collar fold under the chin
    R(-11, -22, 6, 16, P.rust);              // left flank drape
    R(-11, -22, 3, 16, P.fatherCloak);       // shadow side falls away (away from torch)
    R(-7, -21, 1, 15, P.fatherCloak);        // fold line
    R(-11, -6, 6, 1, P.fatherCloak);         // straight hem (left)
    R(5, -22, 6, 18, P.rust);                // right flank drape (longer)
    R(8, -21, 1, 17, P.fatherCloak);         // fold line
    R(5, -4, 6, 1, P.fatherCloak);           // straight hem (right)
    R(10, -22, 1, 18, P.accent);             // clean warm lit edge
    R(10, -18, 1, 9, P.accentHi);            // brightest glint

    // ── 2. LEATHER chest/belly — exposed in the cape's V ────────────────
    R(-2, -32, 4, 2, P.fatherBrown);         // throat (narrow top of V)
    R(-3, -30, 6, 3, P.fatherBrown);
    R(-4, -27, 8, 4, P.fatherBrown);
    R(-5, -23, 10, 6, P.fatherBrown);        // belly (widest, down to belt)
    R(-5, -23, 2, 6, P.fatherCloak);         // belly shadow (−x)
    R(3, -26, 2, 9, P.stoneHi);              // lit ridge (+x torch side)
    R(-4, -28, 8, 1, P.fatherCloak);         // chest seam

    // round brass clasp at the throat (one of only two brass points)
    R(-1, -33, 3, 2, P.accent);
    R(0, -33, 1, 1, P.accentHi);
    R(-1, -31, 3, 1, P.accentDim);

    // ── 3. BELT + brass buckle (the other brass point) ──────────────────
    R(-6, -19, 12, 2, P.fatherCloak);        // strap
    R(-2, -19, 4, 2, P.accentDim);           // buckle plate
    R(-1, -19, 2, 1, P.accent);              // buckle face
    R(0, -19, 1, 1, P.accentHi);             // glint

    // ── 4. SKIRT + LEGS + BOOTS ─────────────────────────────────────────
    R(-6, -17, 12, 3, P.fatherBrown);        // leather skirt
    R(-6, -17, 2, 3, P.fatherCloak);         // skirt shadow
    R(4, -17, 2, 3, P.stoneHi);              // skirt lit
    R(-5, -14, 4, 8, P.fatherCloak);         // left trouser
    R(1, -14, 4, 8, P.fatherCloak);          // right trouser
    R(3, -13, 1, 6, P.fatherBrown);          // lit shin (+x)
    R(-6, -7, 5, 7, P.fatherBrown);          // left boot
    R(1, -7, 5, 7, P.fatherBrown);           // right boot
    R(-6, -7, 5, 1, P.stoneHi);              // cuff (lit)
    R(1, -7, 5, 1, P.stoneHi);
    R(-6, -3, 5, 2, P.fatherCloak);          // boot shadow
    R(1, -3, 5, 2, P.fatherCloak);
    R(-6, -1, 5, 1, P.black);                // soles
    R(1, -1, 5, 1, P.black);

    // ── 5. ARMS + fists (over the cape flanks) ──────────────────────────
    R(-10, -30, 3, 9, P.fatherBrown);        // left upper arm (shadow side)
    R(-10, -30, 1, 9, P.fatherCloak);
    R(7, -30, 3, 9, P.fatherBrown);          // right upper arm (lit side)
    R(9, -30, 1, 9, P.stoneHi);
    R(-10, -21, 3, 3, P.fatherCloak);        // left bracer
    R(7, -21, 3, 3, P.fatherCloak);          // right bracer
    R(7, -21, 3, 1, P.stoneHi);              // bracer top (lit)
    R(-10, -18, 3, 3, P.playerSkin);         // left fist
    R(-10, -18, 1, 3, P.fatherBrown);        // knuckle shadow
    R(7, -18, 3, 3, P.playerSkin);           // right fist
    R(9, -18, 1, 3, P.text);                 // lit knuckle edge

    // ── 6. NECK + HEAD — clean & simple (less is more at this resolution).
    // A few confident shapes read far better than dense detail, which turns to
    // noise. Lit on the torch side (+x), one shadow side (−x). NO blindfold.
    R(-2, -34, 4, 1.5, P.playerSkin);          // neck
    R(-2, -34, 1.5, 1.5, P.fatherBrown);       // neck shadow (−x)

    // face — flat skin, one shadow side, one lit edge (gives form, no clutter)
    R(-4, -42, 8, 8, P.playerSkin);            // face mass
    R(-4, -42, 2, 8, P.fatherBrown);           // shadow side (−x)
    R(3, -42, 1, 7, P.text);                   // lit edge (+x)

    // hair — one clean mass + a single grizzled streak
    R(-4, -43, 8, 2, P.fatherBrown);           // hair top
    R(-4, -42, 1, 4, P.fatherBrown);           // left temple
    R(3, -42, 1, 4, P.fatherBrown);            // right temple
    R(-2, -43, 4, 1, P.textDim);               // gray streak

    // brows — one clean stroke each
    R(-3, -39, 2, 1, P.fatherBrown);
    R(1, -39, 2, 1, P.fatherBrown);

    // eyes — one clean dark mark each, a single lit glint
    R(-3, -37, 2, 1, P.fatherCloak);           // left eye
    R(1, -37, 2, 1, P.fatherCloak);            // right eye
    R(2, -37, 1, 1, P.text);                   // glint (lit eye)

    // nose — a single lit ridge
    R(0, -37, 1, 2, P.text);

    // beard — one clean shape with a shadow side + a touch of gray
    R(-4, -35, 8, 2, P.fatherBrown);           // beard mass
    R(-3, -33, 6, 1, P.fatherBrown);           // beard point
    R(-4, -35, 2, 2, P.fatherCloak);           // shadow side (−x)
    R(-2, -35, 4, 1, P.textDim);               // grizzled moustache hint

    ctx.restore();
}

/**
 * Standing child portrait — the protagonist ("you" as a boy): round face, big
 * hopeful eyes, blue tunic, no beard. Same clean idiom as drawFatherPortrait;
 * feet-base at (cx, baseY). Lit on the torch side (+x), shadow on −x.
 */
export function drawChildPortrait(ctx, cx, baseY, scale = 6) {
    const P = PAL;
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(baseY));
    ctx.scale(scale, scale);
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

    // ── tunic — narrow young shoulders, simple blue ──
    R(-6, -19, 12, 19, P.playerBlue);          // torso + shoulders
    R(-6, -19, 2, 19, P.fatherCloak);          // shadow side (−x)
    R(-3, -19, 6, 1, P.fatherCloak);           // collar

    // ── neck ──
    R(-2, -21, 4, 2, P.playerSkin);
    R(-2, -21, 1.5, 2, P.fatherBrown);         // shadow

    // ── head — round and large (child proportions) ──
    R(-5, -33, 10, 12, P.playerSkin);          // face
    R(-5, -33, 2, 12, P.fatherBrown);          // shadow side (−x)
    R(4, -33, 1, 11, P.text);                  // lit edge (+x)

    // hair — soft round cap, a small tuft
    R(-5, -34, 10, 3, P.fatherBrown);          // hair mass
    R(-5, -33, 1, 3, P.fatherBrown);           // left side
    R(4, -33, 1, 3, P.fatherBrown);            // right side
    R(-1, -35, 3, 1, P.fatherBrown);           // tuft

    // big hopeful eyes — bright glints
    R(-3.5, -29, 2.5, 2, P.fatherCloak);       // left eye
    R(1, -29, 2.5, 2, P.fatherCloak);          // right eye
    R(-3, -29, 1, 1, P.text);                  // left glint
    R(1.5, -29, 1, 1, P.text);                 // right glint

    // small nose + soft mouth
    R(-0.5, -26, 1, 1, P.fatherBrown);         // nose
    R(-1.5, -24, 3, 1, P.fatherBrown);         // mouth

    ctx.restore();
}

/**
 * 레플리 — 길드 직원. 금발 + 하늘색 눈동자, 20대 여성. PLACEHOLDER bust
 * (시나리오 외형 기반, 정식 아트는 Claude Design 위임 예정).
 */
export function drawRepliPortrait(ctx, cx, baseY, scale = 6) {
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(baseY));
    ctx.scale(scale, scale);
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const SKIN = '#e6b48e', SKIN_SH = '#c48f6c', HAIR = '#e8cf52', HAIR_SH = '#bd9f34';
    const EYE = '#7ec8e3', LIP = '#c07266';
    const JACKET = '#6c3a52', JACKET_SH = '#46243a', JACKET_HI = '#8a4d68';  // plum receptionist jacket
    const INNER = '#f4ecda', GOLD = '#e6b450';                  // white collar + gold trim

    // ── torso — tidy receptionist jacket (정장 + 흰 칼라 + 골드 단추, 모래시계) ──
    R(-7, -19, 14, 9, JACKET);                 // shoulders + chest (wide)
    R(-6, -10, 12, 10, JACKET);                // waist — tucked (hourglass)
    R(-7, -19, 2, 9, JACKET_SH);               // shadow side (upper)
    R(-6, -10, 2, 10, JACKET_SH);              // shadow side (lower)
    R(5, -10, 1, 10, JACKET_SH);               // far-side shade
    // crisp white collar + small V-neck peek
    R(-4, -19, 8, 1.5, INNER);
    R(-2, -19, 1, 3, INNER); R(1, -19, 1, 3, INNER);
    R(-4, -19, 8, 0.6, GOLD);                  // gold collar trim
    // bust volumes (jacket tone — rounded)
    R(-5, -17, 3, 2, JACKET_HI); R(1, -17, 3, 2, JACKET_HI);
    R(-1, -17, 2, 4, JACKET_SH);               // cleft
    R(-6.5, -16, 1, 3, JACKET_SH); R(5.5, -16, 1, 3, JACKET_SH); // outer-side shadow
    R(-6, -12, 5, 1, JACKET_SH); R(1, -12, 5, 1, JACKET_SH);     // under-curve
    // gold buttons down the front
    R(-0.5, -15, 1, 1, GOLD); R(-0.5, -12, 1, 1, GOLD);
    R(-0.5, -8, 1, 1, GOLD); R(-0.5, -5, 1, 1, GOLD);
    // ── neck ──
    R(-2, -21, 4, 2, SKIN);
    R(-2, -21, 1.5, 2, SKIN_SH);
    // ── head ──
    R(-5, -34, 10, 13, SKIN);
    R(-5, -34, 2, 13, SKIN_SH);                // shadow side
    R(4, -34, 1, 12, '#f2e4d4');               // lit edge (+x)
    // ── blonde hair — full, falls past the cheeks; crown rounded (no hard corners) ──
    R(-4, -38, 8, 1, HAIR);                    // crown top (narrow → rounded dome)
    R(-5, -37, 10, 1, HAIR);                   // crown upper
    R(-6, -36, 12, 4, HAIR);                   // crown body (wide)
    R(-6, -34, 2, 21, HAIR);                   // left fall (long — past the shoulder)
    R(4, -34, 2, 21, HAIR);                    // right fall (long)
    R(4, -34, 1, 21, HAIR_SH);                 // strand shading on the fall
    R(-6, -37, 1, 5, HAIR_SH);
    R(-5, -34, 10, 2, HAIR);                   // bangs
    // ── sky-blue eyes ──
    R(-3.5, -30, 2.5, 2, '#f4f4f4'); R(1, -30, 2.5, 2, '#f4f4f4');
    R(-3, -30, 1.5, 2, EYE);  R(1.5, -30, 1.5, 2, EYE);
    R(-2.6, -30, 0.8, 1, '#23323a'); R(1.9, -30, 0.8, 1, '#23323a');
    // ── nose + lips ──
    R(-0.5, -27, 1, 1, SKIN_SH);
    R(-1.5, -25, 3, 1, LIP);
    ctx.restore();
}

/**
 * 레타 — 모험가 길드 의뢰 전달. 갈색 모자 + 분홍 머리(모자 아래 단발로 보임),
 * 멜빵 청바지 + 하얀 티, 작은 키 10대 중반. PLACEHOLDER bust (시나리오 외형 기반).
 */
export function drawRetaPortrait(ctx, cx, baseY, scale = 6) {
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(baseY));
    ctx.scale(scale, scale);
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const SKIN = '#e6b48e', SKIN_SH = '#c48f6c', HAIR = '#e89ab0', HAIR_SH = '#c7798f';
    const CAP = '#6b4e2e', CAP_SH = '#4c3720', TEE = '#eef0ec', TEE_SH = '#c9cdc7';
    const DENIM = '#41618a', DENIM_SH = '#2e4866';

    // ── torso — white tee under denim overalls (멜빵) ──
    R(-6, -19, 12, 19, TEE);
    R(-6, -19, 2, 19, TEE_SH);                 // shadow side
    R(-6, -7, 12, 7, DENIM);                   // denim front panel (lower)
    R(-6, -7, 2, 7, DENIM_SH);
    R(-4.5, -19, 1.5, 13, DENIM);              // left strap (멜빵)
    R(3, -19, 1.5, 13, DENIM);                 // right strap
    // subtle bust on the tee (modest — 10대), between the straps
    R(-3, -15, 2.5, 2, '#f8faf6');             // left highlight
    R(0.5, -15, 2.5, 2, '#f8faf6');            // right highlight
    R(-3, -13, 2.5, 1, TEE_SH);                // soft under-curve (L)
    R(0.5, -13, 2.5, 1, TEE_SH);               // (R)
    // ── neck ──
    R(-2, -21, 4, 2, SKIN);
    // ── head — round, young (10대) ──
    R(-5, -33, 10, 12, SKIN);
    R(-5, -33, 2, 12, SKIN_SH);
    R(4, -33, 1, 11, '#f2e4d4');
    // ── pink hair framing (단발로 보이지만…) under the cap ──
    R(-6, -31, 1.5, 11, HAIR);                 // left side
    R(4.5, -31, 1.5, 11, HAIR);                // right side
    R(-5, -33, 10, 2, HAIR);                   // fringe under brim
    R(4.5, -31, 1.5, 3, HAIR_SH);
    // ── brown cap ──
    R(-6, -38, 12, 5, CAP);                    // dome
    R(-6, -38, 12, 1, CAP_SH);
    R(-8, -34, 16, 1.5, CAP);                  // brim
    R(-8, -34, 16, 0.5, CAP_SH);
    // ── big young eyes + small mouth ──
    R(-3.5, -29, 2.5, 2, '#3a2a30'); R(1, -29, 2.5, 2, '#3a2a30');
    R(-3, -29, 1, 1, '#fff'); R(1.5, -29, 1, 1, '#fff');
    R(-1, -25, 2, 1, '#b56a5e');
    ctx.restore();
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
