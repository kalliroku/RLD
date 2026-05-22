/**
 * Opening sequence procedural pixel art.
 *
 * Two illustrations for the opening cutscene:
 *   - renderManInDungeon(canvas) — middle-aged man (father), eyes covered with a
 *     dark band (memory motif), confident stance, dungeon interior backdrop.
 *   - renderManLeaving(canvas)   — same man walking away toward a dungeon arch.
 *
 * Both share the title-art palette (Palette A — Darkest Dungeon-ish) so the
 * transitions from title → opening → guild feel cohesive.
 */

const PW = 240;
const PH = 120;
const SCALE = 4;

const COLOR = {
    bgTop:       '#08070a',
    bgMid:       '#12100e',
    bgBot:       '#1a1814',
    cave:        '#1f1c17',
    caveShadow:  '#0d0b08',
    stoneLight:  '#3a3530',
    stoneMid:    '#2a2520',
    stoneCrack:  '#0d0b08',
    voidInside:  '#050403',
    skin:        '#d4a878',
    bone:        '#e8dcc4',
    brass:       '#b8860b',
    crimson:     '#5a1a1a',
    rust:        '#8b3a1f',
    stoneDk:     '#3a3530',
    faded:       '#5a554d',
    capeMain:    '#8b3a1f',  // rust red cape (former hero)
    capeShadow:  '#3a1208',
    bodyDk:      '#1a1410',
    eyeBand:     '#000000',
};

function setupCanvas(canvas) {
    canvas.width = PW * SCALE;
    canvas.height = PH * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.scale(SCALE, SCALE);
    return ctx;
}

function drawCaveBackground(ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, PH);
    bg.addColorStop(0,    COLOR.bgTop);
    bg.addColorStop(0.55, COLOR.bgMid);
    bg.addColorStop(1,    COLOR.bgBot);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, PW, PH);

    // Ceiling stalactite hints
    for (let i = 0; i < 40; i++) {
        const x = (i * 73) % PW;
        const y = (i * 11) % 24;
        const alpha = 0.3 + ((i * 19) % 6) / 12;
        ctx.fillStyle = `rgba(8, 6, 4, ${alpha})`;
        ctx.fillRect(x, y, 2, 1);
    }
}

function drawCaveGround(ctx) {
    const groundY = PH - 22;
    ctx.fillStyle = COLOR.cave;
    ctx.fillRect(0, groundY, PW, PH - groundY);

    // Tile joints
    ctx.fillStyle = COLOR.caveShadow;
    for (let row = 0; row < 4; row++) {
        const y = groundY + 1 + row * 6;
        ctx.fillRect(0, y, PW, 1);
        const offset = (row % 2) * 8;
        for (let x = offset; x < PW; x += 16) {
            ctx.fillRect(x, y, 1, 5);
        }
    }

    // Dust speckles
    for (let i = 0; i < 60; i++) {
        const x = (i * 47) % PW;
        const y = groundY + 2 + ((i * 13) % (PH - groundY - 3));
        const alpha = 0.25 + ((i * 23) % 6) / 18;
        ctx.fillStyle = `rgba(58, 53, 48, ${alpha})`;
        ctx.fillRect(x, y, 1, 1);
    }
}

function drawSideWalls(ctx) {
    // Left and right cave-wall hints — simple darker columns
    const wallY = 16;
    const wallH = PH - wallY - 22;
    // Left
    ctx.fillStyle = COLOR.stoneMid;
    for (let y = wallY; y < wallY + wallH; y++) {
        const dx = Math.max(0, 18 - (y - wallY) * 0.1);
        ctx.fillRect(0, y, dx, 1);
    }
    // Right
    for (let y = wallY; y < wallY + wallH; y++) {
        const dx = Math.max(0, 18 - (y - wallY) * 0.1);
        ctx.fillRect(PW - dx, y, dx, 1);
    }
    // Crack details
    ctx.fillStyle = COLOR.stoneCrack;
    for (let i = 0; i < 8; i++) {
        ctx.fillRect(3 + (i * 17) % 13, 22 + i * 9, 1, 4);
        ctx.fillRect(PW - 4 - (i * 13) % 13, 30 + i * 8, 1, 3);
    }
}

function drawVignette(ctx, sides = true, topBottom = true) {
    if (sides) {
        const v = ctx.createLinearGradient(0, 0, PW, 0);
        v.addColorStop(0,    'rgba(0,0,0,0.7)');
        v.addColorStop(0.2,  'rgba(0,0,0,0)');
        v.addColorStop(0.8,  'rgba(0,0,0,0)');
        v.addColorStop(1,    'rgba(0,0,0,0.7)');
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, PW, PH);
    }
    if (topBottom) {
        const v2 = ctx.createLinearGradient(0, 0, 0, PH);
        v2.addColorStop(0,    'rgba(0,0,0,0.65)');
        v2.addColorStop(0.2,  'rgba(0,0,0,0)');
        v2.addColorStop(0.85, 'rgba(0,0,0,0)');
        v2.addColorStop(1,    'rgba(0,0,0,0.45)');
        ctx.fillStyle = v2;
        ctx.fillRect(0, 0, PW, PH);
    }
}

/**
 * Middle-aged man (the father) — front-facing, eyes covered by a horizontal
 * band (memory/unreliable-narration motif). Confident stance, sturdy build,
 * rust-red cape draped over shoulders. Stands center-stage in a cave.
 *
 *   Sprite footprint: ~9 wide × ~22 tall, drawn around (cx, baseY).
 */
function drawFather(ctx, cx, baseY) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(cx - 5, baseY + 1, 11, 2);
    ctx.fillRect(cx - 4, baseY + 3, 9, 1);

    // Legs (sturdy, wider than sherpa)
    ctx.fillStyle = COLOR.bodyDk;
    ctx.fillRect(cx - 3, baseY - 5, 2, 6);
    ctx.fillRect(cx + 1, baseY - 5, 2, 6);
    // Boots accent
    ctx.fillStyle = COLOR.stoneDk;
    ctx.fillRect(cx - 3, baseY, 2, 1);
    ctx.fillRect(cx + 1, baseY, 2, 1);

    // Body (chest out, broader than sherpa)
    ctx.fillStyle = COLOR.crimson;
    ctx.fillRect(cx - 4, baseY - 12, 9, 7);
    // Belt
    ctx.fillStyle = COLOR.stoneDk;
    ctx.fillRect(cx - 4, baseY - 6, 9, 1);
    ctx.fillStyle = COLOR.brass;
    ctx.fillRect(cx, baseY - 6, 1, 1);  // belt buckle

    // Cape (rust red, draping behind the shoulders down to mid-thigh)
    ctx.fillStyle = COLOR.capeMain;
    // shoulders extend
    ctx.fillRect(cx - 6, baseY - 12, 2, 8);
    ctx.fillRect(cx + 5, baseY - 12, 2, 8);
    // drape behind
    ctx.fillRect(cx - 5, baseY - 4, 11, 4);
    // cape inner shadow
    ctx.fillStyle = COLOR.capeShadow;
    ctx.fillRect(cx - 6, baseY - 10, 1, 5);
    ctx.fillRect(cx + 6, baseY - 10, 1, 5);

    // Head (a bit larger than sherpa, square jaw)
    ctx.fillStyle = COLOR.skin;
    ctx.fillRect(cx - 2, baseY - 17, 5, 5);

    // Eye band — horizontal black bar across the eyes (memory motif)
    ctx.fillStyle = COLOR.eyeBand;
    ctx.fillRect(cx - 3, baseY - 15, 7, 2);

    // Hair — short, neat (just a top crown)
    ctx.fillStyle = COLOR.stoneDk;
    ctx.fillRect(cx - 2, baseY - 18, 5, 1);
    ctx.fillRect(cx - 3, baseY - 17, 1, 1);
    ctx.fillRect(cx + 3, baseY - 17, 1, 1);

    // Faint torch glow at chest (former hero aura)
    const glow = ctx.createRadialGradient(cx, baseY - 9, 1, cx, baseY - 9, 14);
    glow.addColorStop(0,   'rgba(184, 134, 11, 0.30)');
    glow.addColorStop(0.5, 'rgba(139, 58, 31, 0.12)');
    glow.addColorStop(1,   'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 14, baseY - 22, 28, 24);
}

/**
 * Same father, but from behind, walking toward a distant dungeon arch.
 * Smaller frame to suggest distance.
 */
function drawFatherFromBehind(ctx, cx, baseY) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(cx - 4, baseY + 1, 9, 1);

    // Legs
    ctx.fillStyle = COLOR.bodyDk;
    ctx.fillRect(cx - 2, baseY - 4, 2, 5);
    ctx.fillRect(cx + 1, baseY - 4, 2, 5);

    // Body (back, narrower visible)
    ctx.fillStyle = COLOR.crimson;
    ctx.fillRect(cx - 3, baseY - 10, 7, 6);

    // Cape billowing behind (slight motion — wider at bottom)
    ctx.fillStyle = COLOR.capeMain;
    ctx.fillRect(cx - 5, baseY - 10, 2, 7);
    ctx.fillRect(cx + 4, baseY - 10, 2, 7);
    ctx.fillRect(cx - 6, baseY - 6, 1, 4);
    ctx.fillRect(cx + 6, baseY - 6, 1, 4);
    ctx.fillRect(cx - 4, baseY - 3, 9, 2);
    // shadow inner
    ctx.fillStyle = COLOR.capeShadow;
    ctx.fillRect(cx - 5, baseY - 8, 1, 4);
    ctx.fillRect(cx + 5, baseY - 8, 1, 4);

    // Head (back of head, just hair)
    ctx.fillStyle = COLOR.stoneDk;
    ctx.fillRect(cx - 2, baseY - 14, 5, 3);
}

/**
 * Distant dungeon arch — receding perspective for [3].
 */
function drawDistantArch(ctx, cx, archBaseY) {
    const archTopY = archBaseY - 36;
    const innerHalf = 12;
    const frameW = 2;
    const curveEnd = archTopY + innerHalf;

    // Outer stone frame
    ctx.fillStyle = COLOR.stoneMid;
    for (let y = archTopY; y < archBaseY; y++) {
        const halfW = halfWidthAtY(y, archTopY, curveEnd, innerHalf + frameW);
        if (halfW > 0) ctx.fillRect(Math.floor(cx - halfW), y, Math.ceil(halfW * 2), 1);
    }
    // Inner void
    ctx.fillStyle = COLOR.voidInside;
    for (let y = archTopY + 1; y < archBaseY; y++) {
        const halfW = halfWidthAtY(y, archTopY + 1, curveEnd, innerHalf);
        if (halfW > 0) ctx.fillRect(Math.floor(cx - halfW), y, Math.ceil(halfW * 2), 1);
    }

    // Faint torch glow from inside
    const glow = ctx.createRadialGradient(cx, archBaseY - 6, 2, cx, archBaseY - 6, 18);
    glow.addColorStop(0,    'rgba(184, 134, 11, 0.30)');
    glow.addColorStop(0.5,  'rgba(139, 58, 31, 0.15)');
    glow.addColorStop(1,    'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - innerHalf, archTopY, innerHalf * 2, archBaseY - archTopY);
}

function halfWidthAtY(y, topY, curveEndY, curveRadius) {
    if (y < curveEndY) {
        const dy = curveEndY - y;
        const r2 = curveRadius * curveRadius - dy * dy;
        return r2 > 0 ? Math.sqrt(r2) : 0;
    }
    return curveRadius;
}

// ─────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────

export function renderManInDungeon(canvas) {
    if (!canvas) return;
    const ctx = setupCanvas(canvas);

    drawCaveBackground(ctx);
    drawSideWalls(ctx);
    drawCaveGround(ctx);

    // Father stands center stage
    const cx = Math.floor(PW / 2);
    const groundY = PH - 22;
    drawFather(ctx, cx, groundY - 1);

    drawVignette(ctx, true, true);
    ctx.restore();
}

export function renderManLeaving(canvas) {
    if (!canvas) return;
    const ctx = setupCanvas(canvas);

    drawCaveBackground(ctx);
    drawSideWalls(ctx);
    drawCaveGround(ctx);

    // Distant arch toward which the father walks
    const cx = Math.floor(PW / 2);
    const groundY = PH - 22;
    drawDistantArch(ctx, cx, groundY);

    // Father (smaller, receding) — placed slightly ahead/below the arch
    drawFatherFromBehind(ctx, cx, groundY - 4);

    drawVignette(ctx, true, true);
    ctx.restore();
}
