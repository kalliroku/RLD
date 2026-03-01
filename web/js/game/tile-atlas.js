/**
 * TileAtlas — Procedural tile sprite cache
 * Pre-renders all tile variants to offscreen canvases for fast blitting.
 */

import { TileType } from './tiles.js';

// Simple deterministic hash for coordinate-based variation
function coordHash(x, y) {
    let h = x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return (h ^ (h >> 16)) >>> 0;
}

/**
 * Draw subtle stone noise on a canvas context
 */
function drawStoneNoise(ctx, x, y, w, h, baseColor, intensity = 0.03) {
    const step = 4;
    for (let py = y; py < y + h; py += step) {
        for (let px = x; px < x + w; px += step) {
            const hash = coordHash(px, py);
            const variation = ((hash % 100) / 100 - 0.5) * intensity;
            const alpha = Math.abs(variation);
            ctx.fillStyle = variation > 0
                ? `rgba(255,255,255,${alpha})`
                : `rgba(0,0,0,${alpha})`;
            ctx.fillRect(px, py, step, step);
        }
    }
}

/**
 * Parse hex color to {r, g, b}
 */
function hexToRgb(hex) {
    const v = parseInt(hex.slice(1), 16);
    return { r: (v >> 16) & 0xff, g: (v >> 8) & 0xff, b: v & 0xff };
}

export class TileAtlas {
    constructor() {
        this.tileSize = 0;
        this._floorCache = [];    // 4 floor variants
        this._wallCache = [];     // 16 autotile variants
        this._objectCache = {};   // keyed by TileType
        this._fogCache = [];      // 5 fog levels
    }

    build(tileSize) {
        this.tileSize = tileSize;
        this._buildFloors(tileSize);
        this._buildWalls(tileSize);
        this._buildObjects(tileSize);
        this._buildFog(tileSize);
    }

    rebuild(newTileSize) {
        this.build(newTileSize);
    }

    /**
     * Get floor variant based on coordinate hash (deterministic)
     */
    getFloor(x, y) {
        const idx = coordHash(x, y) % this._floorCache.length;
        return this._floorCache[idx];
    }

    /**
     * Get wall variant based on 4-bit cardinal neighbor mask
     * N=1, E=2, S=4, W=8 (bits set if neighbor is also a wall)
     */
    getWall(mask) {
        return this._wallCache[mask & 0xf];
    }

    /**
     * Get object sprite for a tile type (transparent background)
     */
    getObject(tileType) {
        return this._objectCache[tileType] || null;
    }

    /**
     * Get fog overlay at given opacity index (0..4 → 0.2, 0.4, 0.6, 0.8, 1.0)
     */
    getFog(opacityIndex) {
        return this._fogCache[Math.max(0, Math.min(4, opacityIndex))];
    }

    /**
     * Get fog for a specific visibility value (0.0 to 1.0)
     */
    getFogForVisibility(visibility) {
        if (visibility >= 1.0) return null;
        if (visibility <= 0.0) return this._fogCache[4]; // full fog
        // Map visibility (0..1) to fog index (4..0)
        const idx = Math.floor((1 - visibility) * 5);
        return this._fogCache[Math.min(4, idx)];
    }

    // ─── Floor tiles ────────────────────────────────────────────

    _buildFloors(ts) {
        this._floorCache = [];
        const baseColor = '#1a1a2e';
        const rgb = hexToRgb(baseColor);

        for (let v = 0; v < 4; v++) {
            const c = this._createCanvas(ts, ts);
            const ctx = c.getContext('2d');

            // Base color with slight variation per variant
            const rOff = (v - 1.5) * 3;
            const gOff = (v - 1.5) * 2;
            const bOff = (v - 1.5) * 4;
            ctx.fillStyle = `rgb(${rgb.r + rOff},${rgb.g + gOff},${rgb.b + bOff})`;
            ctx.fillRect(0, 0, ts, ts);

            // Stone noise texture
            drawStoneNoise(ctx, 0, 0, ts, ts, baseColor, 0.04);

            // Subtle crack pattern (variant-specific)
            ctx.strokeStyle = 'rgba(0,0,0,0.12)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            if (v === 0) {
                // Horizontal crack
                const y1 = ts * 0.3;
                ctx.moveTo(ts * 0.1, y1);
                ctx.lineTo(ts * 0.5, y1 + 2);
                ctx.lineTo(ts * 0.7, y1 - 1);
            } else if (v === 1) {
                // Vertical crack
                const x1 = ts * 0.6;
                ctx.moveTo(x1, ts * 0.2);
                ctx.lineTo(x1 - 2, ts * 0.6);
            } else if (v === 2) {
                // L-shaped crack
                ctx.moveTo(ts * 0.2, ts * 0.7);
                ctx.lineTo(ts * 0.4, ts * 0.7);
                ctx.lineTo(ts * 0.4, ts * 0.9);
            }
            // v === 3: no crack (clean tile)
            ctx.stroke();

            // Grid edge line (very subtle)
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            ctx.strokeRect(0.5, 0.5, ts - 1, ts - 1);

            this._floorCache.push(c);
        }
    }

    // ─── Wall tiles (16 autotile variants) ──────────────────────

    _buildWalls(ts) {
        this._wallCache = [];
        const baseColor = '#374151';
        const highlight = '#4b5563';
        const shadow = '#1f2937';

        for (let mask = 0; mask < 16; mask++) {
            const c = this._createCanvas(ts, ts);
            const ctx = c.getContext('2d');

            const hasN = !!(mask & 1);
            const hasE = !!(mask & 2);
            const hasS = !!(mask & 4);
            const hasW = !!(mask & 8);

            // Base wall fill
            ctx.fillStyle = baseColor;
            ctx.fillRect(0, 0, ts, ts);

            // Stone noise
            drawStoneNoise(ctx, 0, 0, ts, ts, baseColor, 0.05);

            const bevel = Math.max(3, ts * 0.08);

            // Bevel edges — only draw bevel on exposed sides (no neighbor)
            // Top edge highlight (if no wall to north)
            if (!hasN) {
                ctx.fillStyle = highlight;
                ctx.fillRect(0, 0, ts, bevel);
            }
            // Left edge highlight (if no wall to west)
            if (!hasW) {
                ctx.fillStyle = highlight;
                ctx.fillRect(0, 0, bevel, ts);
            }
            // Bottom edge shadow (if no wall to south)
            if (!hasS) {
                ctx.fillStyle = shadow;
                ctx.fillRect(0, ts - bevel, ts, bevel);
            }
            // Right edge shadow (if no wall to east)
            if (!hasE) {
                ctx.fillStyle = shadow;
                ctx.fillRect(ts - bevel, 0, bevel, ts);
            }

            // Corner bevels — darkened inner corners where two bevels meet
            if (!hasN && !hasW) {
                ctx.fillStyle = highlight;
                ctx.fillRect(0, 0, bevel, bevel);
            }
            if (!hasS && !hasE) {
                ctx.fillStyle = shadow;
                ctx.fillRect(ts - bevel, ts - bevel, bevel, bevel);
            }
            if (!hasN && !hasE) {
                // Top-right: mix of highlight (top) and shadow (right)
                ctx.fillStyle = '#3d4a5c';
                ctx.fillRect(ts - bevel, 0, bevel, bevel);
            }
            if (!hasS && !hasW) {
                // Bottom-left: mix
                ctx.fillStyle = '#3d4a5c';
                ctx.fillRect(0, ts - bevel, bevel, bevel);
            }

            // Stone block lines (mortar)
            ctx.strokeStyle = 'rgba(0,0,0,0.15)';
            ctx.lineWidth = 1;
            // Horizontal mortar
            const midY = Math.floor(ts / 2);
            ctx.beginPath();
            ctx.moveTo(0, midY);
            ctx.lineTo(ts, midY);
            ctx.stroke();
            // Vertical mortar (offset per row for brick pattern)
            const q = Math.floor(ts / 2);
            ctx.beginPath();
            ctx.moveTo(q, 0);
            ctx.lineTo(q, midY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, midY);
            ctx.lineTo(0, midY); // reset
            const q2 = Math.floor(ts * 0.75);
            ctx.moveTo(q2, midY);
            ctx.lineTo(q2, ts);
            ctx.stroke();

            this._wallCache.push(c);
        }
    }

    // ─── Object sprites ─────────────────────────────────────────

    _buildObjects(ts) {
        this._objectCache = {};
        this._objectCache[TileType.START] = this._buildStart(ts);
        this._objectCache[TileType.GOAL] = this._buildGoal(ts);
        this._objectCache[TileType.TRAP] = this._buildTrap(ts);
        this._objectCache[TileType.HEAL] = this._buildHeal(ts);
        this._objectCache[TileType.PIT] = this._buildPit(ts);
        this._objectCache[TileType.GOLD] = this._buildGold(ts);
        this._objectCache[TileType.MONSTER] = this._buildMonster(ts);
    }

    _buildStart(ts) {
        const c = this._createCanvas(ts, ts);
        const ctx = c.getContext('2d');
        const cx = ts / 2, cy = ts / 2;
        const r = ts * 0.3;

        // Blue glow circle
        ctx.save();
        ctx.shadowColor = '#3b82f6';
        ctx.shadowBlur = ts * 0.25;

        // Outer ring
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Inner filled circle
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.fill();
        ctx.restore();

        // Arrow up symbol (entry marker)
        ctx.fillStyle = '#93c5fd';
        ctx.beginPath();
        ctx.moveTo(cx, cy - r * 0.35);
        ctx.lineTo(cx + r * 0.25, cy + r * 0.1);
        ctx.lineTo(cx - r * 0.25, cy + r * 0.1);
        ctx.closePath();
        ctx.fill();

        return c;
    }

    _buildGoal(ts) {
        const c = this._createCanvas(ts, ts);
        const ctx = c.getContext('2d');
        const cx = ts / 2, cy = ts / 2;
        const r = ts * 0.3;

        // Green portal glow
        ctx.save();
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = ts * 0.3;

        // Outer portal ring
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner swirl (simplified as concentric arcs)
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 1.5);
        ctx.strokeStyle = '#86efac';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.3, Math.PI * 0.5, Math.PI * 2);
        ctx.strokeStyle = '#bbf7d0';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.restore();

        return c;
    }

    _buildTrap(ts) {
        const c = this._createCanvas(ts, ts);
        const ctx = c.getContext('2d');
        const cx = ts / 2, cy = ts / 2;
        const s = ts * 0.28;

        // Red warning triangle
        ctx.save();
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = ts * 0.15;

        ctx.beginPath();
        ctx.moveTo(cx, cy - s);
        ctx.lineTo(cx + s * 0.9, cy + s * 0.6);
        ctx.lineTo(cx - s * 0.9, cy + s * 0.6);
        ctx.closePath();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.fill();
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Spikes at bottom
        const spikeH = ts * 0.12;
        const spikeW = ts * 0.06;
        ctx.fillStyle = '#dc2626';
        for (let i = 0; i < 3; i++) {
            const sx = cx - spikeW * 2.5 + i * spikeW * 2.5;
            const sy = cy + s * 0.15;
            ctx.beginPath();
            ctx.moveTo(sx, sy + spikeH);
            ctx.lineTo(sx + spikeW / 2, sy);
            ctx.lineTo(sx + spikeW, sy + spikeH);
            ctx.closePath();
            ctx.fill();
        }

        // "!" exclamation
        ctx.fillStyle = '#fca5a5';
        ctx.font = `bold ${ts * 0.22}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', cx, cy - s * 0.15);

        return c;
    }

    _buildHeal(ts) {
        const c = this._createCanvas(ts, ts);
        const ctx = c.getContext('2d');
        const cx = ts / 2, cy = ts / 2;

        // Pink glow
        ctx.save();
        ctx.shadowColor = '#f472b6';
        ctx.shadowBlur = ts * 0.2;

        // Heart shape
        const size = ts * 0.2;
        ctx.fillStyle = '#f472b6';
        ctx.beginPath();
        ctx.moveTo(cx, cy + size * 0.7);
        ctx.bezierCurveTo(cx - size * 1.5, cy - size * 0.2,
                          cx - size * 0.8, cy - size * 1.2,
                          cx, cy - size * 0.4);
        ctx.bezierCurveTo(cx + size * 0.8, cy - size * 1.2,
                          cx + size * 1.5, cy - size * 0.2,
                          cx, cy + size * 0.7);
        ctx.fill();
        ctx.restore();

        // Cross symbol overlay
        const crossW = ts * 0.06;
        const crossH = ts * 0.18;
        ctx.fillStyle = '#fce7f3';
        ctx.fillRect(cx - crossW / 2, cy - crossH / 2 - size * 0.1, crossW, crossH);
        ctx.fillRect(cx - crossH / 2, cy - crossW / 2 - size * 0.1, crossH, crossW);

        return c;
    }

    _buildPit(ts) {
        const c = this._createCanvas(ts, ts);
        const ctx = c.getContext('2d');
        const cx = ts / 2, cy = ts / 2;
        const r = ts * 0.35;

        // Dark void
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, '#000000');
        grad.addColorStop(0.7, '#0a0a0f');
        grad.addColorStop(1, 'rgba(10,10,15,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, ts, ts);

        // Edge shadow ring
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(50,50,60,0.5)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Inner jagged edge (danger)
        ctx.beginPath();
        const teeth = 8;
        for (let i = 0; i < teeth; i++) {
            const angle = (i / teeth) * Math.PI * 2;
            const nextAngle = ((i + 0.5) / teeth) * Math.PI * 2;
            const outerR = r * 0.55;
            const innerR = r * 0.35;
            ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
            ctx.lineTo(cx + Math.cos(nextAngle) * innerR, cy + Math.sin(nextAngle) * innerR);
        }
        ctx.closePath();
        ctx.fillStyle = '#000';
        ctx.fill();

        return c;
    }

    _buildGold(ts) {
        const c = this._createCanvas(ts, ts);
        const ctx = c.getContext('2d');
        const cx = ts / 2, cy = ts / 2;
        const r = ts * 0.2;

        // Gold coin with glow
        ctx.save();
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = ts * 0.2;

        // Coin body
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        const coinGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
        coinGrad.addColorStop(0, '#fde68a');
        coinGrad.addColorStop(0.7, '#fbbf24');
        coinGrad.addColorStop(1, '#d97706');
        ctx.fillStyle = coinGrad;
        ctx.fill();
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // "$" symbol
        ctx.fillStyle = '#78350f';
        ctx.font = `bold ${ts * 0.2}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', cx, cy);

        // Sparkle
        ctx.fillStyle = '#fef3c7';
        const sparkSize = ts * 0.04;
        const sparkX = cx + r * 0.5;
        const sparkY = cy - r * 0.6;
        ctx.fillRect(sparkX - sparkSize / 2, sparkY - sparkSize * 1.5, sparkSize, sparkSize * 3);
        ctx.fillRect(sparkX - sparkSize * 1.5, sparkY - sparkSize / 2, sparkSize * 3, sparkSize);

        return c;
    }

    _buildMonster(ts) {
        const c = this._createCanvas(ts, ts);
        const ctx = c.getContext('2d');
        const cx = ts / 2, cy = ts / 2;

        // Purple glow aura
        ctx.save();
        ctx.shadowColor = '#9333ea';
        ctx.shadowBlur = ts * 0.25;

        // Skull/creature silhouette
        const headR = ts * 0.22;

        // Head
        ctx.beginPath();
        ctx.arc(cx, cy - headR * 0.2, headR, 0, Math.PI * 2);
        ctx.fillStyle = '#7c3aed';
        ctx.fill();

        // Horns
        ctx.beginPath();
        ctx.moveTo(cx - headR * 0.6, cy - headR * 0.8);
        ctx.lineTo(cx - headR * 1.1, cy - headR * 1.6);
        ctx.lineTo(cx - headR * 0.2, cy - headR * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx + headR * 0.6, cy - headR * 0.8);
        ctx.lineTo(cx + headR * 1.1, cy - headR * 1.6);
        ctx.lineTo(cx + headR * 0.2, cy - headR * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Eyes (glowing red)
        ctx.save();
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#ef4444';
        const eyeR = headR * 0.18;
        ctx.beginPath();
        ctx.arc(cx - headR * 0.35, cy - headR * 0.35, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + headR * 0.35, cy - headR * 0.35, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Mouth (jagged)
        ctx.strokeStyle = '#4c1d95';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - headR * 0.4, cy + headR * 0.2);
        for (let i = 0; i < 4; i++) {
            const px = cx - headR * 0.4 + (headR * 0.8 / 4) * (i + 0.5);
            const py = cy + headR * (i % 2 === 0 ? 0.35 : 0.15);
            ctx.lineTo(px, py);
        }
        ctx.lineTo(cx + headR * 0.4, cy + headR * 0.2);
        ctx.stroke();

        return c;
    }

    // ─── Fog overlays ───────────────────────────────────────────

    _buildFog(ts) {
        this._fogCache = [];
        const fogColor = '#0a0a0f';
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
                ctx.fillStyle = '#333';
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
