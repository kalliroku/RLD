/**
 * TilemapRenderer — Layer-based rendering engine
 * Drop-in replacement for Renderer with the same API.
 * Uses TileAtlas for cached tile sprites and Tilemap for layer decomposition.
 */

import { TileType } from './tiles.js';
import { Action } from './agent.js';
import { TileAtlas } from './tile-atlas.js';
import { Tilemap, Layer } from './tilemap.js';

export class TilemapRenderer {
    constructor(canvas, tileSize = 48) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tileSize = tileSize;
        this.grid = null;
        this.agent = null;

        // Q-Learning visualization
        this.showQValues = false;
        this.showPolicy = false;
        this.qValues = null;
        this.policy = null;

        // Fog of War
        this.fogOfWar = false;

        // Treasure
        this.treasurePosition = null;
        this.carryingTreasure = false;

        // Stage viewport
        this.viewportYOffset = 0;
        this.viewportHeight = null;

        // Tilemap system
        this._atlas = new TileAtlas();
        this._atlas.build(tileSize);
        this._tilemap = new Tilemap();

        // Static buffer (floor + walls) — offscreen canvas
        this._staticBuffer = null;
        this._staticCtx = null;
        this._staticDirty = true;
    }

    // ─── API (identical to Renderer) ────────────────────────────

    setGrid(grid) {
        this.grid = grid;
        this.viewportYOffset = 0;
        this.viewportHeight = null;
        this.canvas.width = grid.width * this.tileSize;
        this.canvas.height = grid.height * this.tileSize;

        // Rebuild tilemap from grid
        this._tilemap.buildFromGrid(grid);
        this._rebuildStaticBuffer();
    }

    setAgent(agent) {
        this.agent = agent;
    }

    setViewportStage(stageIndex) {
        if (!this.grid || !this.grid.getStageOffset) return;
        this.viewportYOffset = this.grid.getStageOffset(stageIndex);
        this.viewportHeight = this.grid.stages[stageIndex].height;
        this.canvas.width = this.grid.width * this.tileSize;
        this.canvas.height = this.viewportHeight * this.tileSize;
    }

    clearViewport() {
        this.viewportYOffset = 0;
        this.viewportHeight = null;
        if (this.grid) {
            this.canvas.width = this.grid.width * this.tileSize;
            this.canvas.height = this.grid.height * this.tileSize;
        }
    }

    setQData(qValues, policy) {
        this.qValues = qValues;
        this.policy = policy;
    }

    flash(color, duration = 100) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: ${color};
            opacity: 0.3;
            pointer-events: none;
            z-index: 9999;
        `;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), duration);
    }

    // ─── Main render ────────────────────────────────────────────

    render() {
        const { ctx } = this;

        // Clear
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.grid) return;

        // 1. Static layers (floor + walls) from buffer
        this._blitStaticBuffer();

        // 2. Objects layer
        this._renderObjects();

        // 3. Stage separators
        this._renderStageSeparators();

        // 4. Q-values overlay
        if (this.showQValues && this.qValues) {
            this._renderQValues();
        }

        // 5. Policy arrows
        if (this.showPolicy && this.policy) {
            this._renderPolicy();
        }

        // 6. Fog overlay (after objects, before entities)
        this._renderFog();

        // 7. Treasure
        this._renderTreasure();

        // 8. Agent (entity layer)
        this._renderAgent();

        // 9. HUD
        this._renderFloorIndicator();

        // B-201: optional minimap hook (mobile, large dungeons)
        if (this.onAfterRender) this.onAfterRender();
    }

    // ─── Static buffer (floor + walls) ──────────────────────────

    _rebuildStaticBuffer() {
        if (!this.grid) return;
        const ts = this.tileSize;
        const w = this.grid.width * ts;
        const h = this.grid.height * ts;

        if (typeof OffscreenCanvas !== 'undefined') {
            this._staticBuffer = new OffscreenCanvas(w, h);
        } else {
            this._staticBuffer = document.createElement('canvas');
            this._staticBuffer.width = w;
            this._staticBuffer.height = h;
        }
        this._staticCtx = this._staticBuffer.getContext('2d');

        // Render all static tiles
        this._renderStaticLayers();
    }

    _renderStaticLayers() {
        if (!this._staticCtx || !this.grid) return;
        const ctx = this._staticCtx;
        const ts = this.tileSize;
        const atlas = this._atlas;

        // Check if tile size changed
        if (atlas.tileSize !== ts) {
            atlas.rebuild(ts);
        }

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this._staticBuffer.width, this._staticBuffer.height);

        for (let y = 0; y < this.grid.height; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                const tile = this.grid.getTile(x, y);
                const px = x * ts;
                const py = y * ts;

                if (tile === TileType.WALL) {
                    // Draw wall with autotile
                    const mask = this._tilemap.getWallMask(x, y);
                    ctx.drawImage(atlas.getWall(mask), px, py);
                } else {
                    // Draw floor
                    ctx.drawImage(atlas.getFloor(x, y), px, py);
                }
            }
        }
    }

    _blitStaticBuffer() {
        if (!this._staticBuffer) return;
        const ts = this.tileSize;
        const yStart = this.viewportYOffset;
        const visibleH = this.viewportHeight != null ? this.viewportHeight : this.grid.height;

        // Source rect in static buffer
        const sx = 0;
        const sy = yStart * ts;
        const sw = this.grid.width * ts;
        const sh = visibleH * ts;

        this.ctx.drawImage(this._staticBuffer, sx, sy, sw, sh, 0, 0, sw, sh);
    }

    // ─── Objects layer ──────────────────────────────────────────

    _renderObjects() {
        if (!this.grid) return;
        const { ctx, tileSize: ts } = this;
        const atlas = this._atlas;
        const yStart = this.viewportYOffset;
        const yEnd = this.viewportHeight != null ? yStart + this.viewportHeight : this.grid.height;

        for (let y = yStart; y < yEnd; y++) {
            const cy = y - this.viewportYOffset;
            for (let x = 0; x < this.grid.width; x++) {
                const tile = this.grid.getTile(x, y);
                const sprite = atlas.getObject(tile);
                if (sprite) {
                    ctx.drawImage(sprite, x * ts, cy * ts);
                }
            }
        }
    }

    // ─── Fog overlay ────────────────────────────────────────────

    _renderFog() {
        if (!this.fogOfWar || !this.agent || !this.grid) return;
        const { ctx, tileSize: ts } = this;
        const atlas = this._atlas;
        const yStart = this.viewportYOffset;
        const yEnd = this.viewportHeight != null ? yStart + this.viewportHeight : this.grid.height;

        for (let y = yStart; y < yEnd; y++) {
            const cy = y - this.viewportYOffset;
            for (let x = 0; x < this.grid.width; x++) {
                const visibility = this.agent.getVisibility(x, y);
                if (visibility >= 1.0) continue;

                const fogSprite = atlas.getFogForVisibility(visibility);
                if (fogSprite) {
                    ctx.drawImage(fogSprite, x * ts, cy * ts);
                }
            }
        }
    }

    // ─── Agent ──────────────────────────────────────────────────

    _renderAgent() {
        if (!this.agent) return;
        const { ctx, tileSize: ts } = this;
        const { x, y, hp, maxHp } = this.agent;

        const cy = y - this.viewportYOffset;
        const visibleRows = this.viewportHeight != null ? this.viewportHeight : this.grid.height;
        if (cy < 0 || cy >= visibleRows) return;

        const centerX = x * ts + ts / 2;
        const centerY = cy * ts + ts / 2;
        const radius = ts * 0.35;

        // Body circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Eyes
        const eyeOffset = radius * 0.3;
        const eyeRadius = radius * 0.15;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(centerX - eyeOffset, centerY - eyeOffset * 0.5, eyeRadius, 0, Math.PI * 2);
        ctx.arc(centerX + eyeOffset, centerY - eyeOffset * 0.5, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        // HP bar
        const barWidth = ts * 0.8;
        const barHeight = 4;
        const barX = x * ts + (ts - barWidth) / 2;
        const barY = cy * ts + 4;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const hpPercent = hp / maxHp;
        const hpColor = hpPercent > 0.5 ? '#22c55e' : (hpPercent > 0.25 ? '#fbbf24' : '#ef4444');
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
    }

    // ─── Treasure ───────────────────────────────────────────────

    _renderTreasure() {
        if (!this.treasurePosition || this.carryingTreasure) return;
        const { ctx, tileSize: ts } = this;
        const { x, y } = this.treasurePosition;

        const cy = y - this.viewportYOffset;
        const visibleRows = this.viewportHeight != null ? this.viewportHeight : this.grid.height;
        if (cy < 0 || cy >= visibleRows) return;

        // Fog check
        if (this.fogOfWar && this.agent) {
            const vis = this.agent.getVisibility(x, y);
            if (vis === 0) return;
        }

        const centerX = x * ts + ts / 2;
        const centerY = cy * ts + ts / 2;

        // Diamond shape with golden glow
        ctx.save();
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        const s = ts * 0.25;
        ctx.moveTo(centerX, centerY - s);
        ctx.lineTo(centerX + s, centerY);
        ctx.lineTo(centerX, centerY + s);
        ctx.lineTo(centerX - s, centerY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // "T" label
        ctx.font = `bold ${ts * 0.25}px monospace`;
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('T', centerX, centerY);
        ctx.restore();
    }

    // ─── Q-values heatmap ───────────────────────────────────────

    _renderQValues() {
        if (!this.qValues) return;
        const { ctx, tileSize: ts } = this;
        const yStart = this.viewportYOffset;
        const yEnd = this.viewportHeight != null ? yStart + this.viewportHeight : this.grid.height;

        // Find min/max
        let minQ = Infinity, maxQ = -Infinity;
        for (let y = yStart; y < yEnd; y++) {
            for (let x = 0; x < this.grid.width; x++) {
                const tile = this.grid.getTile(x, y);
                if (tile !== TileType.WALL && this.qValues[y]) {
                    const q = this.qValues[y][x];
                    minQ = Math.min(minQ, q);
                    maxQ = Math.max(maxQ, q);
                }
            }
        }
        const range = maxQ - minQ || 1;

        for (let y = yStart; y < yEnd; y++) {
            const cy = y - this.viewportYOffset;
            for (let x = 0; x < this.grid.width; x++) {
                const tile = this.grid.getTile(x, y);
                if (tile === TileType.WALL || tile === TileType.GOAL) continue;
                if (!this.qValues[y]) continue;

                const q = this.qValues[y][x];
                const normalized = (q - minQ) / range;
                const r = Math.floor(255 * (1 - normalized));
                const g = Math.floor(255 * normalized);

                ctx.fillStyle = `rgba(${r}, ${g}, 50, 0.4)`;
                ctx.fillRect(x * ts + 2, cy * ts + 2, ts - 4, ts - 4);

                ctx.font = `${ts * 0.22}px monospace`;
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(q.toFixed(1), x * ts + ts / 2, (cy + 1) * ts - 4);
            }
        }
    }

    // ─── Policy arrows ──────────────────────────────────────────

    _renderPolicy() {
        if (!this.policy) return;
        const { ctx, tileSize: ts } = this;
        const arrowSize = ts * 0.25;
        const yStart = this.viewportYOffset;
        const yEnd = this.viewportHeight != null ? yStart + this.viewportHeight : this.grid.height;

        const arrows = {
            [Action.UP]: { dx: 0, dy: -1 },
            [Action.DOWN]: { dx: 0, dy: 1 },
            [Action.LEFT]: { dx: -1, dy: 0 },
            [Action.RIGHT]: { dx: 1, dy: 0 }
        };

        for (let y = yStart; y < yEnd; y++) {
            const cy = y - this.viewportYOffset;
            for (let x = 0; x < this.grid.width; x++) {
                const tile = this.grid.getTile(x, y);
                if (tile === TileType.WALL || tile === TileType.GOAL) continue;
                if (!this.policy[y]) continue;

                const action = this.policy[y][x];
                const dir = arrows[action];
                if (!dir) continue;

                const centerX = x * ts + ts / 2;
                const centerY = cy * ts + ts / 2;

                ctx.beginPath();
                ctx.moveTo(centerX - dir.dx * arrowSize, centerY - dir.dy * arrowSize);
                ctx.lineTo(centerX + dir.dx * arrowSize, centerY + dir.dy * arrowSize);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Arrow head
                const headSize = arrowSize * 0.5;
                const tipX = centerX + dir.dx * arrowSize;
                const tipY = centerY + dir.dy * arrowSize;

                ctx.beginPath();
                if (dir.dx !== 0) {
                    ctx.moveTo(tipX, tipY);
                    ctx.lineTo(tipX - dir.dx * headSize, tipY - headSize);
                    ctx.lineTo(tipX - dir.dx * headSize, tipY + headSize);
                } else {
                    ctx.moveTo(tipX, tipY);
                    ctx.lineTo(tipX - headSize, tipY - dir.dy * headSize);
                    ctx.lineTo(tipX + headSize, tipY - dir.dy * headSize);
                }
                ctx.closePath();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fill();
            }
        }
    }

    // ─── Stage separators ───────────────────────────────────────

    _renderStageSeparators() {
        if (!this.grid || !this.grid.getTotalStages) return;
        if (this.viewportHeight != null) return;
        const total = this.grid.getTotalStages();
        if (total <= 1) return;

        const { ctx, tileSize: ts } = this;
        ctx.save();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 4;

        for (let s = 1; s < total; s++) {
            const yOffset = this.grid.getStageOffset(s);
            const py = (yOffset - this.viewportYOffset) * ts;
            ctx.beginPath();
            ctx.moveTo(0, py);
            ctx.lineTo(this.grid.width * ts, py);
            ctx.stroke();
        }
        ctx.restore();
    }

    // ─── Floor indicator badge ──────────────────────────────────

    _renderFloorIndicator() {
        if (!this.grid || !this.grid.getTotalStages) return;
        const total = this.grid.getTotalStages();
        if (total <= 1 || this.viewportHeight == null) return;

        const stageIndex = this.grid.getCurrentStageIndex();
        const label = `Floor ${stageIndex + 1}/${total}`;

        const { ctx, tileSize: ts } = this;
        ctx.save();
        ctx.font = `bold ${ts * 0.32}px monospace`;
        const metrics = ctx.measureText(label);
        const padX = 8, padY = 4;
        const w = metrics.width + padX * 2;
        const h = ts * 0.32 + padY * 2 + 4;
        const bx = this.canvas.width - w - 6;
        const by = 6;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.roundRect(bx, by, w, h, 4);
        ctx.fill();

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, by, w, h, 4);
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, bx + w / 2, by + h / 2);
        ctx.restore();
    }
}
