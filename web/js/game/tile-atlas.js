/**
 * TileAtlas — 오브젝트/포그 스프라이트 캐시.
 *
 * 바닥·벽은 더 이상 여기서 캐시하지 않는다 — 렌더러가 정적 버퍼에 dungeon-art 로
 * **live-draw**(이웃 인지 AO + seamless + per-tile grain). 여기는 매 프레임 블릿되는
 * 오브젝트와 포그만 오프스크린 캔버스로 미리 굽는다.
 */

import { TileType } from './tiles.js';
import { PAL } from './opening-art.js';   // 오프닝과 같은 비주얼 언어 (D-2026-06-10 bm — 인던전 = 오프닝 문법)
import { drawStart, drawPit, drawTrap, drawHeal, drawGold, drawMonster } from './dungeon-art.js';

/** Parse hex color to {r, g, b} */
function hexToRgb(hex) {
    const v = parseInt(hex.slice(1), 16);
    return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff };
}

export class TileAtlas {
    constructor() {
        this.tileSize = 0;
        this._objectCache = {};   // keyed by TileType
        this._fogCache = [];      // 5 fog levels
    }

    build(tileSize) {
        this.tileSize = tileSize;
        this._buildObjects(tileSize);
        this._buildFog(tileSize);
    }

    rebuild(newTileSize) {
        this.build(newTileSize);
    }

    /** Get object sprite for a tile type (transparent background) */
    getObject(tileType) {
        return this._objectCache[tileType] || null;
    }

    /** Get fog overlay at given opacity index (0..4 → 0.2, 0.4, 0.6, 0.8, 1.0) */
    getFog(opacityIndex) {
        return this._fogCache[Math.max(0, Math.min(4, opacityIndex))];
    }

    /** Get fog for a specific visibility value (0.0 to 1.0) */
    getFogForVisibility(visibility) {
        if (visibility >= 1.0) return null;
        if (visibility <= 0.0) return this._fogCache[4]; // full fog
        // Map visibility (0..1) to fog index (4..0)
        const idx = Math.floor((1 - visibility) * 5);
        return this._fogCache[Math.min(4, idx)];
    }

    // ─── Object sprites (dungeon-art, 오프닝 픽셀 문법) ──────────────

    /** ts×ts 오프스크린 캔버스에 중앙 기준 드로잉을 굽는다. */
    _bake(ts, drawFn) {
        const c = this._createCanvas(ts, ts);
        drawFn(c.getContext('2d'));
        return c;
    }

    _buildObjects(ts) {
        const cx = ts / 2, cy = ts / 2;
        // seed = 타입별 고정 상수 (캐시 스프라이트는 위치 불변 — 결정론적 고정 grain)
        this._objectCache = {};
        this._objectCache[TileType.START]   = this._bake(ts, (c) => drawStart(c, cx, cy, ts, 0x5701));
        this._objectCache[TileType.GOAL]    = this._buildGoal(ts);   // 오프닝 픽셀 G (유지)
        this._objectCache[TileType.TRAP]    = this._bake(ts, (c) => drawTrap(c, cx, cy, ts, 0x5704));
        this._objectCache[TileType.HEAL]    = this._bake(ts, (c) => drawHeal(c, cx, cy, ts, 0x5705));
        this._objectCache[TileType.PIT]     = this._bake(ts, (c) => drawPit(c, cx, cy, ts, 0x5706));
        this._objectCache[TileType.GOLD]    = this._bake(ts, (c) => drawGold(c, cx, cy, ts, 0x5707));
        this._objectCache[TileType.MONSTER] = this._bake(ts, (c) => drawMonster(c, cx, cy, ts, 0x5708));
    }

    _buildGoal(ts) {
        // 골 = 오프닝의 "빛나는 금색 G" (opening-art drawCharacter('goal') 과 동일 문법)
        const c = this._createCanvas(ts, ts);
        const ctx = c.getContext('2d');
        const cx = ts / 2, cy = ts / 2;
        const px = ts / 8;

        // 따뜻한 후광 — 어둠 속에서 멀리서도 보이는 목적지 등불
        const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, ts * 0.55);
        g.addColorStop(0, 'rgba(230, 200, 120, 0.4)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, ts, ts);

        // 픽셀 G 글리프 (8px 그리드 — 오프닝과 동일 좌표)
        ctx.fillStyle = PAL.goal;
        ctx.fillRect(2 * px, 2 * px, 4 * px, px);       // top
        ctx.fillRect(2 * px, 2 * px, px, 4 * px);       // left
        ctx.fillRect(2 * px, 5 * px, 4 * px, px);       // bottom
        ctx.fillRect(4 * px, 4 * px, 2 * px, px);       // middle nub
        ctx.fillRect(5 * px, 4 * px, px, 2 * px);

        return c;
    }

    // ─── Fog overlays (fog-of-war 메커닉 — 타일 단위) ───────────────

    _buildFog(ts) {
        this._fogCache = [];
        const fogColor = '#070604';
        const rgb = hexToRgb(fogColor);

        for (let i = 0; i < 5; i++) {
            const opacity = (i + 1) * 0.2; // 0.2, 0.4, 0.6, 0.8, 1.0
            const c = this._createCanvas(ts, ts);
            const ctx = c.getContext('2d');

            ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${opacity})`;
            ctx.fillRect(0, 0, ts, ts);

            // Question mark for full fog
            if (opacity >= 0.9) {
                ctx.font = `${ts * 0.3}px monospace`;
                ctx.fillStyle = '#3a2d20';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('?', ts / 2, ts / 2);
            }

            this._fogCache.push(c);
        }
    }

    // ─── Utility ────────────────────────────────────────────────

    _createCanvas(w, h) {
        if (typeof OffscreenCanvas !== 'undefined') {
            return new OffscreenCanvas(w, h);
        }
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        return c;
    }
}
