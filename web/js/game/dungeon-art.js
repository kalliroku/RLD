/**
 * dungeon-art.js — 인던전 스테이지 비주얼 컴포넌트 (오프닝 idiom)
 *
 * Claude Design 산출물(2026-06-14 "Dungeon Stage Preview (standalone)")에서 이식.
 * opening-art.js 프리미티브(PAL · mulberry32 · flecks · drawFog · drawCharacter) 위에서 그린다.
 *
 * ── 계약 (깨지 말 것 — 이식이 여기 의존) ──────────────────────────────────────
 *   • 결정론만: Math.random()/Date.now() 금지. coordHash + mulberry32 만.
 *   • PAL 토큰만 (import). 신규 네온/고채도 X (drawHeal 의 GLASS 만 playerBlue 로컬 파생).
 *   • ts(타일 크기) 가변. 픽셀 그리드 = ts/8 → 모든 루틴 해상도 독립. 엣지는 round-both-edges 스냅.
 *   • sim/run-state/agent 미참조 — 순수 드로잉.
 */
import { PAL, mulberry32, flecks, drawFog, drawCharacter } from './opening-art.js';

// drawWall: which sides are OPEN (floor). drawFloorTile: which sides are WALL.
export const OPEN_N = 1, OPEN_E = 2, OPEN_S = 4, OPEN_W = 8;
export const WALL_N = 1, WALL_E = 2, WALL_S = 4, WALL_W = 8;

/**
 * Deterministic 32-bit hash of integer tile coords (+ optional salt) → a stable
 * uint32 seed for mulberry32. 같은 (x,y) → 같은 grain, 매 런 동일. Math.random 미사용.
 */
export function coordHash(x, y, salt = 0) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(salt | 0, 2246822519)) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return (h ^ (h >>> 16)) >>> 0;
}

// Edge-snapped pixel rect on a tile's ts/8 grid. Snapping BOTH edges to device
// pixels (not pos+size) guarantees neighbouring rects abut seamlessly at any ts.
function gpx(ctx, ox, oy, u, gx, gy, gw, gh, c) {
    const x0 = Math.round(ox + gx * u), y0 = Math.round(oy + gy * u);
    const x1 = Math.round(ox + (gx + gw) * u), y1 = Math.round(oy + (gy + gh) * u);
    ctx.fillStyle = c;
    ctx.fillRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
}

// ═════════════════════════════════════════════════════════════════════════════
// SURFACES — floor & wall
// ═════════════════════════════════════════════════════════════════════════════

/**
 * One floor tile, drawn SEAMLESS — no grout grid, no outline. A solid stone
 * fill + the opening's fleck grain + a per-tile tonal drift (coordHash) gives a
 * continuous, hand-textured floor. `wallMask` (WALL_*) softly darkens edges that
 * touch a wall — the ambient-occlusion that sells wall height WITHOUT a box.
 */
export function drawFloorTile(ctx, px, py, ts, seed = 0, wallMask = 0) {
    const u = ts / 8;
    // solid base so tiles never gap, then scatter grain on top
    gpx(ctx, px, py, u, 0, 0, 8, 8, PAL.stone);
    flecks(ctx, px, py, ts, ts, 'rgba(0,0,0,0)', PAL.bgDeep, PAL.stoneLight, seed, 0.16);

    // per-tile tonal drift — very low alpha so there is no visible tile checker
    const rng = mulberry32(seed);
    const drift = rng();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = drift < 0.5 ? PAL.black : PAL.stoneHi;
    ctx.fillRect(px, py, Math.ceil(ts), Math.ceil(ts));
    ctx.globalAlpha = 1;

    // occasional hairline crack — a short deterministic zig in the stone
    if (rng() < 0.16) {
        ctx.globalAlpha = 0.5;
        let cx = 2 + Math.floor(rng() * 4), cy = 2 + Math.floor(rng() * 4);
        for (let i = 0; i < 3; i++) {
            gpx(ctx, px, py, u, cx, cy, 1, 1, PAL.bgDeep);
            cx += rng() < 0.5 ? 1 : 0;
            cy += rng() < 0.5 ? 1 : -0;
            cx = Math.min(7, cx); cy = Math.min(7, cy);
        }
        ctx.globalAlpha = 1;
    }

    // soft drop-shadow from adjacent walls (ambient occlusion, gradient → no box)
    const depth = ts * 0.42;
    const aoFrom = 'rgba(7,6,10,0.55)', aoTo = 'rgba(7,6,10,0)';
    const band = (x, y, w, h, x0, y0, x1, y1) => {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, aoFrom); g.addColorStop(1, aoTo);
        ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    };
    if (wallMask & WALL_N) band(px, py, ts, depth, px, py, px, py + depth);
    if (wallMask & WALL_S) band(px, py + ts - depth, ts, depth, px, py + ts, px, py + ts - depth);
    if (wallMask & WALL_W) band(px, py, depth, ts, px, py, px + depth, py);
    if (wallMask & WALL_E) band(px + ts - depth, py, depth, ts, px + ts, py, px + ts - depth, py);
}

/**
 * One wall cell. `openMask` (OPEN_*) marks which sides face floor. The cell is a
 * dark "top of wall"; where floor is to the SOUTH it grows a torch-lit FACE with
 * a bright cap lip — this is the only strong tonal edge, and because every wall
 * cell along the boundary draws the same band, the wall reads as one connected
 * mass (seamless), not a grid of outlined boxes. Side-facing edges get a faint
 * lit/shadow hint for depth; back (north-facing) edges stay dark.
 */
export function drawWall(ctx, px, py, ts, openMask = 0, seed = 0) {
    const u = ts / 8;
    const R = (gx, gy, gw, gh, c) => gpx(ctx, px, py, u, gx, gy, gw, gh, c);

    // dark wall body (in shadow) + grain
    gpx(ctx, px, py, u, 0, 0, 8, 8, PAL.bgDeep);
    flecks(ctx, px, py, ts, ts, 'rgba(0,0,0,0)', PAL.black, PAL.stone, seed, 0.2);

    const openN = openMask & OPEN_N, openE = openMask & OPEN_E,
          openS = openMask & OPEN_S, openW = openMask & OPEN_W;

    // SOUTH face — the wall front the camera sees, lit by torchlight
    if (openS) {
        R(0, 5.5, 8, 2.5, PAL.stoneLight);            // lit stone face
        flecks(ctx, px, Math.round(py + 5.5 * u), ts, Math.ceil(2.5 * u),
            'rgba(0,0,0,0)', PAL.stone, PAL.stoneHi, seed * 3, 0.14);
        R(0, 5.5, 8, 0.7, PAL.stoneHi);               // bright cap lip
        R(0, 7.6, 8, 0.4, PAL.black);                 // base contact shadow
    }
    // NORTH (floor above) — faint back rim, kept dark
    if (openN) R(0, 0, 8, 0.6, PAL.black);
    // EAST / WEST faces — subtle vertical depth hint (+x catches a little light)
    if (openE) { R(7.2, openN ? 0.6 : 0, 0.8, 8, PAL.stone); R(7.7, 0, 0.3, 8, PAL.stoneLight); }
    if (openW) { R(0, openN ? 0.6 : 0, 0.8, 8, PAL.black); }
}

// ═════════════════════════════════════════════════════════════════════════════
// OBJECTS — 8px pixel THINGS (centred on a tile). Each: (ctx, cx, cy, ts, seed).
// ═════════════════════════════════════════════════════════════════════════════

function objBase(ctx, cx, cy, ts) {
    const u = ts / 8;
    const ox = cx - ts / 2, oy = cy - ts / 2;
    return { u, ox, oy, R: (gx, gy, gw, gh, c) => gpx(ctx, ox, oy, u, gx, gy, gw, gh, c) };
}

/** Soft floor contact shadow under a standing object, so it sits ON the stone. */
function contactShadow(ctx, cx, cy, ts, rw = ts * 0.32) {
    ctx.save();
    ctx.translate(cx, cy + ts * 0.30);
    ctx.scale(1, 0.34);
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, rw);
    g.addColorStop(0, 'rgba(7,6,10,0.5)'); g.addColorStop(1, 'rgba(7,6,10,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rw, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

/** START — the stone entry stair the player descended from. Faint amber breath
 *  of the surface still glows behind it (same warm light as the cave arch). */
export function drawStart(ctx, cx, cy, ts, seed = 0) {
    const { R } = objBase(ctx, cx, cy, ts);
    // warm entrance glow behind the threshold
    const g = ctx.createRadialGradient(cx, cy - ts * 0.1, 1, cx, cy - ts * 0.1, ts * 0.9);
    g.addColorStop(0, 'rgba(230,181,98,0.30)');
    g.addColorStop(0.5, 'rgba(192,138,58,0.10)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - ts, cy - ts, ts * 2, ts * 2);
    // two side posts
    R(0.5, 1, 1.5, 6, PAL.stone); R(0.5, 1, 1.5, 0.8, PAL.stoneHi);
    R(6, 1, 1.5, 6, PAL.stone);   R(6, 1, 1.5, 0.8, PAL.stoneHi);
    R(6, 1, 0.4, 6, PAL.bgDeep);  // shadow side of right post
    // descending steps between the posts (lit lip on each tread)
    R(2, 2, 4, 1.4, PAL.stoneLight); R(2, 2, 4, 0.5, PAL.stoneHi);
    R(2.4, 3.6, 3.2, 1.3, PAL.stone); R(2.4, 3.6, 3.2, 0.5, PAL.stoneLight);
    R(2.8, 5.1, 2.4, 1.2, PAL.bgDeep); R(2.8, 5.1, 2.4, 0.4, PAL.stone);
    R(2, 6.4, 4, 0.6, PAL.black);  // dark mouth at the bottom step
}

/** PIT — a hole punched through the floor. Lit near rim, black void, no bottom. */
export function drawPit(ctx, cx, cy, ts, seed = 0) {
    const { R } = objBase(ctx, cx, cy, ts);
    R(1, 6.2, 6, 1.4, PAL.bgDeep);          // shadow pooled at the near rim
    R(1.2, 1, 5.6, 6, PAL.black);           // the void
    R(1.6, 1, 4.8, 0.9, PAL.stoneLight);    // far rim catches torchlight
    R(1.6, 1, 4.8, 0.35, PAL.stoneHi);      // brightest lip
    R(1, 1.4, 0.6, 5, PAL.bgDeep);          // left inner wall
    R(6.4, 1.4, 0.6, 5, PAL.black);         // right inner wall (shadow)
    R(2.4, 5.6, 3.2, 0.6, PAL.bgDeep);      // a hint of depth at the bottom edge
}

/** TRAP — a recessed floor plate studded with small iron spikes (a caltrop
 *  field, viewed slightly top-down). Staggered tips never line up as bars, so it
 *  reads as a trap apparatus on the floor, never a "|||" glyph. Cold metal only. */
export function drawTrap(ctx, cx, cy, ts, seed = 0) {
    const { R } = objBase(ctx, cx, cy, ts);
    // recessed dark plate set into the floor
    R(0.8, 1.6, 6.4, 5.4, PAL.bgDeep);
    R(0.8, 1.6, 6.4, 0.5, PAL.black);        // top inner shadow
    R(0.8, 1.6, 0.6, 5.4, PAL.black);        // left inner shadow
    R(6.6, 1.6, 0.6, 5.4, PAL.stone);        // right inner (faint light)
    R(0.8, 6.4, 6.4, 0.6, PAL.stoneLight);   // front lip on the floor (lit)
    flecks(ctx, Math.round(cx - ts*0.28), Math.round(cy - ts*0.18), Math.ceil(ts*0.56), Math.ceil(ts*0.5),
        'rgba(0,0,0,0)', PAL.black, PAL.stone, seed, 0.16);
    // a small shaded pyramid spike (base → bright bone point), lit +x / shadow −x
    const tip = (bx, by) => {
        R(bx - 0.7, by + 0.9, 1.4, 0.55, PAL.stone);
        R(bx - 0.45, by + 0.4, 0.9, 0.6, PAL.stoneLight);
        R(bx - 0.2, by, 0.45, 0.6, PAL.text);          // point
        R(bx - 0.7, by + 0.9, 0.5, 0.55, PAL.bgDeep);  // shadow (−x)
        R(bx + 0.05, by + 0.3, 0.25, 1.0, PAL.text);   // lit edge (+x)
    };
    tip(2.3, 2.3); tip(4.1, 2.0); tip(5.7, 2.7);       // staggered front row
    tip(3.0, 4.1); tip(4.9, 4.3);                      // back row, offset
}

/** HEAL — a stoppered glass vial of cool elixir. Cool blue reads instantly as a
 *  potion and stays clear of the warm gold pile. Glass tones are local
 *  derivations of PAL.playerBlue (muted, never neon) — retune them here, the way
 *  the portrait routines keep local colour tokens at the top of the function. */
export function drawHeal(ctx, cx, cy, ts, seed = 0) {
    const { R } = objBase(ctx, cx, cy, ts);
    const GLASS = PAL.playerBlue, GLASS_SH = '#34404f', GLASS_HI = '#6675a0'; // ← muted playerBlue family
    contactShadow(ctx, cx, cy, ts, ts * 0.22);
    R(3, 1, 2, 1.2, PAL.fatherBrown);       // cork
    R(3, 0.7, 2, 0.5, PAL.textDim);         // cork top
    R(3.3, 2.2, 1.4, 0.8, PAL.bgLight);     // glass neck
    // rounded body
    R(2.4, 3, 3.2, 4.2, GLASS);
    R(2, 3.6, 0.6, 3, GLASS);               // left bulge
    R(5.4, 3.6, 0.6, 3, GLASS);             // right bulge
    R(2.4, 3, 1, 4.2, GLASS_SH);            // shadow side (−x)
    R(2.6, 7, 2.8, 0.6, PAL.bgDeep);        // base contact
    // liquid surface + bright glass glints (bone)
    R(2.6, 3.4, 2.8, 0.5, GLASS_HI);        // meniscus highlight
    R(4.6, 3.4, 0.6, 2.6, PAL.text);        // vertical glass glint (+x)
    R(4.8, 3.6, 0.4, 1, PAL.text);          // sparkle (bone, not pure white)
}

/** GOLD — a small heap of coins. Warm amber, clearly distinct from the vial. */
export function drawGold(ctx, cx, cy, ts, seed = 0) {
    const { R } = objBase(ctx, cx, cy, ts);
    contactShadow(ctx, cx, cy, ts, ts * 0.3);
    const coin = (bx, by) => {
        R(bx + 0.3, by, 2, 1.4, PAL.accent);       // disc
        R(bx, by + 0.3, 2.6, 0.9, PAL.accent);     // disc waist
        R(bx + 0.3, by, 2, 0.4, PAL.accentHi);     // lit top
        R(bx + 0.3, by + 1.1, 2, 0.4, PAL.accentDim); // shadow base
        R(bx + 0.8, by + 0.3, 0.6, 0.4, PAL.text); // glint
    };
    coin(1, 5); coin(4.4, 5);                       // bottom row
    coin(2.7, 3.5);                                 // stacked
    coin(1.6, 3.9); coin(4.0, 3.9);
}

/** MONSTER — a hunched lurker. Dark mass, two horns, two torch-lit eyes (the
 *  menace signal), a fang glint. Glowing eyes use amber (palette-consistent). */
export function drawMonster(ctx, cx, cy, ts, seed = 0) {
    const { R } = objBase(ctx, cx, cy, ts);
    contactShadow(ctx, cx, cy, ts, ts * 0.34);
    // body mass
    R(1.5, 3, 5, 4, PAL.fatherCloak);
    R(1.2, 4, 5.6, 3, PAL.fatherCloak);     // shoulders
    R(1.2, 4, 1.4, 3, PAL.black);           // shadow side (−x)
    R(5.6, 3.4, 1, 3, PAL.fatherBrown);     // lit back (+x)
    // crown / horns
    R(1.8, 2, 1.4, 1.6, PAL.fatherCloak);   // left horn
    R(4.8, 2, 1.4, 1.6, PAL.fatherCloak);   // right horn
    R(2.2, 1.4, 0.8, 1, PAL.black);         // left tip
    R(5.0, 1.4, 0.8, 1, PAL.fatherBrown);   // right tip (lit)
    // glowing eyes + soft eye-glow
    const g = ctx.createRadialGradient(cx, cy - ts * 0.05, 1, cx, cy - ts * 0.05, ts * 0.5);
    g.addColorStop(0, 'rgba(230,181,98,0.4)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - ts * 0.6, cy - ts * 0.6, ts * 1.2, ts * 1.2);
    R(2.4, 3.8, 1.2, 1, PAL.accent); R(2.6, 3.9, 0.7, 0.7, PAL.accentHi);
    R(4.4, 3.8, 1.2, 1, PAL.accent); R(4.6, 3.9, 0.7, 0.7, PAL.accentHi);
    // fangs
    R(3, 5.4, 0.7, 0.8, PAL.text); R(4.3, 5.4, 0.7, 0.8, PAL.text);
    // little clawed feet
    R(1.8, 6.6, 1.4, 0.8, PAL.black); R(4.8, 6.6, 1.4, 0.8, PAL.black);
}

// ═════════════════════════════════════════════════════════════════════════════
// LIGHTING — torch glow + radial fog-of-war (compose the opening's idiom)
// ═════════════════════════════════════════════════════════════════════════════

/** A wall torch fixture: iron bracket + a small ember flame. Pair with
 *  drawTorchLight at the same point for the glow. Flame shape is static
 *  (deterministic); the game may animate it by re-drawing per frame. */
export function drawWallTorch(ctx, cx, cy, ts, seed = 0) {
    const { R } = objBase(ctx, cx, cy, ts);
    R(3.4, 3.5, 1.2, 3.5, PAL.fatherBrown); // wooden shaft
    R(3.4, 3.5, 0.4, 3.5, PAL.fatherCloak); // shaft shadow
    R(2.8, 3.2, 2.4, 0.7, PAL.stone);       // iron cup
    R(2.8, 3.2, 2.4, 0.3, PAL.stoneHi);
    // flame — amber body, bright core, hot tip
    R(3.4, 1.4, 1.2, 2.2, PAL.accent);
    R(3.6, 0.8, 0.8, 1.4, PAL.accentHi);
    R(3.7, 0.4, 0.6, 0.8, PAL.text);
    R(3.2, 2.2, 0.5, 1, PAL.accentDim);     // base flicker (−x)
    R(4.5, 2.0, 0.5, 1, PAL.accentHi);      // base flicker (+x)
}

/** Torch glow — a warm pool of light. Radius scales with `ts` (resolution
 *  independent). `intensity` (0..1) lets the host flicker it per frame. */
export function drawTorchLight(ctx, x, y, ts, intensity = 1) {
    const r = ts * 3.0 * intensity;
    const g = ctx.createRadialGradient(x, y, ts * 0.2, x, y, r);
    g.addColorStop(0, `rgba(230,181,98,${0.42 * intensity})`);
    g.addColorStop(0.35, `rgba(192,138,58,${0.16 * intensity})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/**
 * Radial fog-of-war over the whole stage — a clear hole over `center`, fading to
 * black at the vision edge. Thin wrapper over the opening's drawFog so the
 * dungeon and the opening darken identically; `visionTiles` sets the radius in
 * tile units so it tracks `ts`.
 */
export function drawFogOfWar(ctx, w, h, center, visionTiles = 3.5, ts = 24) {
    drawFog(ctx, w, h, center, visionTiles * ts);
}

// 편의 재export (호출부가 한 군데서 import 하도록)
export { PAL, drawCharacter };
