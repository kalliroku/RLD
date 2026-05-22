/**
 * Title screen procedural pixel art — dungeon entrance + 3 sherpas walking in.
 * Drawn at 240×100 internal resolution and CSS-scaled up; imageSmoothing off
 * preserves the chunky pixel feel that matches the in-game tile atlas.
 *
 * Palette A (Darkest Dungeon-ish): aged bone / stone gray / crimson / rust /
 * brass. Aligned with the title CSS so the canvas blends into the page.
 */

const PW = 240;
const PH = 100;
const SCALE = 4;

// Palette A — keep in sync with .title-* CSS.
const COLOR = {
    bgTop:        '#0a0907',
    bgMid:        '#15120e',
    bgBot:        '#1a1814',
    ground:       '#1f1c17',
    groundJoint:  '#0d0b08',
    groundDust:   'rgba(58, 53, 48, 0.45)',
    stoneLight:   '#3a3530',
    stoneMid:     '#2a2520',
    stoneCrack:   '#0d0b08',
    voidInside:   '#050403',
    torchGlowA:   'rgba(184, 134, 11, 0.40)',
    torchGlowB:   'rgba(139, 58, 31, 0.20)',
    arrowBright:  'rgba(184, 134, 11, 0.55)',
    arrowFaint:   'rgba(184, 134, 11, 0.30)',
    skin:         '#d4a878',
    bone:         '#e8dcc4',
    brass:        '#b8860b',
    crimson:      '#5a1a1a',
    rust:         '#8b3a1f',
    stoneDk:      '#3a3530',
    faded:        '#5a554d',
};

export function renderTitleArt(canvas) {
    if (!canvas) return;
    canvas.width = PW * SCALE;
    canvas.height = PH * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.scale(SCALE, SCALE);

    drawBackground(ctx);
    drawCeilingSpeckles(ctx);
    drawGround(ctx);
    drawArch(ctx);
    drawArrows(ctx);
    drawSherpas(ctx);
    drawVignette(ctx);

    ctx.restore();
}

function drawBackground(ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, PH);
    bg.addColorStop(0, COLOR.bgTop);
    bg.addColorStop(0.55, COLOR.bgMid);
    bg.addColorStop(1, COLOR.bgBot);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, PW, PH);
}

function drawCeilingSpeckles(ctx) {
    // Crude noise via deterministic hash — adds cave texture in the top band.
    for (let i = 0; i < 36; i++) {
        const x = (i * 67) % PW;
        const y = (i * 11) % 22;
        const alpha = 0.3 + ((i * 19) % 6) / 14;
        ctx.fillStyle = `rgba(8, 6, 4, ${alpha})`;
        ctx.fillRect(x, y, 2, 1);
    }
}

function drawGround(ctx) {
    const groundY = PH - 18;
    ctx.fillStyle = COLOR.ground;
    ctx.fillRect(0, groundY, PW, PH - groundY);

    // Tile joints — staggered brick pattern, vertical seams every 16px alternating.
    ctx.fillStyle = COLOR.groundJoint;
    for (let row = 0; row < 3; row++) {
        const y = groundY + 1 + row * 6;
        ctx.fillRect(0, y, PW, 1);
        const offset = (row % 2) * 8;
        for (let x = offset; x < PW; x += 16) {
            ctx.fillRect(x, y, 1, 5);
        }
    }

    // Dust speckles
    for (let i = 0; i < 50; i++) {
        const x = (i * 47) % PW;
        const y = groundY + 2 + ((i * 13) % (PH - groundY - 3));
        const alpha = 0.25 + ((i * 23) % 6) / 18;
        ctx.fillStyle = `rgba(58, 53, 48, ${alpha})`;
        ctx.fillRect(x, y, 1, 1);
    }
}

function drawArch(ctx) {
    const archCx = Math.floor(PW / 2);
    const archBaseY = PH - 19;
    const archTopY = 22;
    const innerHalf = 22;
    const frameW = 3;

    const curveEnd = archTopY + innerHalf;

    // Outer stone frame (mid stone)
    ctx.fillStyle = COLOR.stoneMid;
    for (let y = archTopY; y < archBaseY; y++) {
        const halfW = halfWidthAtY(y, archTopY, curveEnd, innerHalf + frameW, innerHalf + frameW);
        if (halfW > 0) ctx.fillRect(Math.floor(archCx - halfW), y, Math.ceil(halfW * 2), 1);
    }

    // Inner void
    ctx.fillStyle = COLOR.voidInside;
    for (let y = archTopY + 2; y < archBaseY; y++) {
        const halfW = halfWidthAtY(y, archTopY + 2, curveEnd, innerHalf, innerHalf);
        if (halfW > 0) ctx.fillRect(Math.floor(archCx - halfW), y, Math.ceil(halfW * 2), 1);
    }

    // Stone frame lit edge (left side highlight = light source from inside arch)
    ctx.fillStyle = COLOR.stoneLight;
    for (let y = archTopY + 1; y < archBaseY; y++) {
        const halfW = halfWidthAtY(y, archTopY, curveEnd, innerHalf + frameW, innerHalf + frameW);
        if (halfW > 0) {
            ctx.fillRect(Math.floor(archCx - halfW), y, 1, 1);
            // also right edge subtle
            ctx.fillStyle = COLOR.stoneDk;
            ctx.fillRect(Math.floor(archCx + halfW) - 1, y, 1, 1);
            ctx.fillStyle = COLOR.stoneLight;
        }
    }

    // Horizontal stone joints on the side pillars
    ctx.fillStyle = COLOR.stoneCrack;
    for (let yy = archTopY + innerHalf + 4; yy < archBaseY; yy += 8) {
        ctx.fillRect(archCx - innerHalf - frameW, yy, frameW, 1);
        ctx.fillRect(archCx + innerHalf,         yy, frameW, 1);
    }

    // Crooked keystone at apex
    ctx.fillStyle = COLOR.stoneLight;
    ctx.fillRect(archCx - 3, archTopY + 1, 6, 2);
    ctx.fillStyle = COLOR.stoneCrack;
    ctx.fillRect(archCx,     archTopY + 1, 1, 2);

    // Torchlight glow from inside
    const glow = ctx.createRadialGradient(archCx, archBaseY - 7, 2, archCx, archBaseY - 7, 30);
    glow.addColorStop(0,    COLOR.torchGlowA);
    glow.addColorStop(0.45, COLOR.torchGlowB);
    glow.addColorStop(1,    'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(archCx - innerHalf, archTopY, innerHalf * 2, archBaseY - archTopY);
}

function halfWidthAtY(y, topY, curveEndY, curveRadius, sidewallHalf) {
    if (y < curveEndY) {
        const dy = curveEndY - y;
        const r2 = curveRadius * curveRadius - dy * dy;
        return r2 > 0 ? Math.sqrt(r2) : 0;
    }
    return sidewallHalf;
}

function drawArrows(ctx) {
    const archCx = Math.floor(PW / 2);
    const groundY = PH - 18;
    // Three faint Q-value chevrons pointing toward the arch — RL signature.
    chevron(ctx, archCx - 18, groundY + 4, COLOR.arrowBright);
    chevron(ctx, archCx - 34, groundY + 9, COLOR.arrowFaint);
    chevron(ctx, archCx + 10, groundY + 7, COLOR.arrowFaint);
    chevron(ctx, archCx + 30, groundY + 12, COLOR.arrowFaint);
}

function chevron(ctx, x, y, color) {
    // Left-pointing arrow head — points toward the arch (which is at center).
    // Composition: shaft + tip (3 pixels wide).
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 5, 1);
    ctx.fillRect(x, y - 1, 1, 3);
    ctx.fillRect(x + 1, y - 2, 1, 5);
}

function drawSherpas(ctx) {
    const archCx = Math.floor(PW / 2);
    const groundY = PH - 18;
    const baseY = groundY - 2;

    // Three sherpas advancing from right toward the arch. The closer one is
    // smaller (perspective hack — actually we keep them same size, just spaced
    // and tinted, since chunky pixels don't take kindly to true perspective).
    const sherpas = [
        { x: archCx + 6,  body: COLOR.bone,    pack: COLOR.rust,    hat: COLOR.crimson, torch: true  },
        { x: archCx + 22, body: COLOR.brass,   pack: COLOR.stoneDk, hat: COLOR.stoneMid, torch: false },
        { x: archCx + 38, body: COLOR.faded,   pack: COLOR.crimson, hat: COLOR.stoneDk, torch: false },
    ];

    for (const s of sherpas) {
        drawSherpa(ctx, s.x, baseY, s);
    }
}

/**
 * 4×8 sherpa sprite, facing LEFT (toward the arch at center).
 *  - shadow under feet
 *  - 2 leg pixels
 *  - 3×3 body
 *  - 1×3 backpack on the right side (= behind, since facing left)
 *  - 2×2 head
 *  - 1×2 hood
 *  - optional torch (lit dot in front)
 */
function drawSherpa(ctx, x, baseY, s) {
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - 1, baseY + 2, 6, 1);

    // Legs
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(x,     baseY,     1, 2);
    ctx.fillRect(x + 2, baseY,     1, 2);

    // Body
    ctx.fillStyle = s.body;
    ctx.fillRect(x, baseY - 3, 3, 3);

    // Backpack (behind = right side when facing left)
    ctx.fillStyle = s.pack;
    ctx.fillRect(x + 3, baseY - 3, 1, 3);
    // pack strap accent
    ctx.fillStyle = COLOR.stoneCrack;
    ctx.fillRect(x + 2, baseY - 3, 1, 1);

    // Head
    ctx.fillStyle = COLOR.skin;
    ctx.fillRect(x, baseY - 5, 2, 2);

    // Hood
    ctx.fillStyle = s.hat;
    ctx.fillRect(x,     baseY - 6, 3, 1);
    ctx.fillRect(x + 2, baseY - 5, 1, 1);

    // Optional torch (lit dot in front = left)
    if (s.torch) {
        ctx.fillStyle = COLOR.brass;
        ctx.fillRect(x - 1, baseY - 3, 1, 1);
        // small flicker glow
        ctx.fillStyle = 'rgba(184, 134, 11, 0.5)';
        ctx.fillRect(x - 2, baseY - 4, 1, 1);
        ctx.fillRect(x - 2, baseY - 3, 1, 1);
        ctx.fillRect(x - 1, baseY - 4, 1, 1);
    }
}

function drawVignette(ctx) {
    // Side darkening
    const side = ctx.createLinearGradient(0, 0, PW, 0);
    side.addColorStop(0,    'rgba(0, 0, 0, 0.85)');
    side.addColorStop(0.18, 'rgba(0, 0, 0, 0)');
    side.addColorStop(0.82, 'rgba(0, 0, 0, 0)');
    side.addColorStop(1,    'rgba(0, 0, 0, 0.85)');
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, PW, PH);

    // Top darkening (cave roof shadow)
    const top = ctx.createLinearGradient(0, 0, 0, PH);
    top.addColorStop(0,    'rgba(0, 0, 0, 0.7)');
    top.addColorStop(0.25, 'rgba(0, 0, 0, 0)');
    top.addColorStop(0.85, 'rgba(0, 0, 0, 0)');
    top.addColorStop(1,    'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, PW, PH);
}
