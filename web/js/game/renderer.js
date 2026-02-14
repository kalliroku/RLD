/**
 * Canvas renderer for the dungeon
 */

import { getTileColor, TileType } from './tiles.js';
import { Action } from './agent.js';

export class Renderer {
    constructor(canvas, tileSize = 48) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.tileSize = tileSize;
        this.grid = null;
        this.agent = null;

        // Q-Learning visualization
        this.showQValues = false;
        this.showPolicy = false;
        this.qValues = null;  // 2D array of max Q-values
        this.policy = null;   // 2D array of best actions

        // Fog of War
        this.fogOfWar = false;

        // Stage viewport (multi-stage: show one floor at a time)
        this.viewportYOffset = 0;   // current stage's virtual y start
        this.viewportHeight = null; // null = show entire grid (single stage compat)
    }

    setGrid(grid) {
        this.grid = grid;
        // Reset viewport (single grid = show everything)
        this.viewportYOffset = 0;
        this.viewportHeight = null;
        // Resize canvas to fit grid
        this.canvas.width = grid.width * this.tileSize;
        this.canvas.height = grid.height * this.tileSize;
    }

    setAgent(agent) {
        this.agent = agent;
    }

    /**
     * Show only a single stage (floor) of a MultiStageGrid.
     * Resizes canvas to that stage's height.
     */
    setViewportStage(stageIndex) {
        if (!this.grid || !this.grid.getStageOffset) return;
        this.viewportYOffset = this.grid.getStageOffset(stageIndex);
        this.viewportHeight = this.grid.stages[stageIndex].height;
        this.canvas.width = this.grid.width * this.tileSize;
        this.canvas.height = this.viewportHeight * this.tileSize;
    }

    /**
     * Clear viewport — show the full grid (all stages stacked).
     */
    clearViewport() {
        this.viewportYOffset = 0;
        this.viewportHeight = null;
        if (this.grid) {
            this.canvas.width = this.grid.width * this.tileSize;
            this.canvas.height = this.grid.height * this.tileSize;
        }
    }

    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderGrid() {
        if (!this.grid) return;

        const { ctx, tileSize } = this;
        const yStart = this.viewportYOffset;
        const yEnd = this.viewportHeight != null ? yStart + this.viewportHeight : this.grid.height;

        for (let y = yStart; y < yEnd; y++) {
            const cy = y - this.viewportYOffset;
            for (let x = 0; x < this.grid.width; x++) {
                const tile = this.grid.getTile(x, y);

                // Check fog of war visibility
                let visibility = 1.0;
                if (this.fogOfWar && this.agent) {
                    visibility = this.agent.getVisibility(x, y);
                }

                if (visibility === 0) {
                    // Complete fog - draw dark tile
                    ctx.fillStyle = '#0a0a0f';
                    ctx.fillRect(
                        x * tileSize + 1,
                        cy * tileSize + 1,
                        tileSize - 2,
                        tileSize - 2
                    );
                    // Draw fog symbol
                    ctx.font = `${tileSize * 0.3}px monospace`;
                    ctx.fillStyle = '#333';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('?', x * tileSize + tileSize / 2, cy * tileSize + tileSize / 2);
                    continue;
                }

                const color = getTileColor(tile);

                // Draw tile background
                ctx.fillStyle = color;
                ctx.fillRect(
                    x * tileSize + 1,
                    cy * tileSize + 1,
                    tileSize - 2,
                    tileSize - 2
                );

                // Draw tile border
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.strokeRect(
                    x * tileSize + 1,
                    cy * tileSize + 1,
                    tileSize - 2,
                    tileSize - 2
                );

                // Draw special markers
                this.drawTileMarker(x, cy, tile);

                // Apply fog overlay for partial visibility
                if (visibility < 1.0) {
                    ctx.fillStyle = `rgba(10, 10, 15, ${1 - visibility})`;
                    ctx.fillRect(
                        x * tileSize + 1,
                        cy * tileSize + 1,
                        tileSize - 2,
                        tileSize - 2
                    );
                }
            }
        }
    }

    drawTileMarker(x, y, tile) {
        const { ctx, tileSize } = this;
        const centerX = x * tileSize + tileSize / 2;
        const centerY = y * tileSize + tileSize / 2;

        ctx.font = `bold ${tileSize * 0.4}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        switch (tile) {
            case TileType.START:
                ctx.fillStyle = '#fff';
                ctx.fillText('S', centerX, centerY);
                break;
            case TileType.GOAL:
                ctx.fillStyle = '#fff';
                ctx.fillText('G', centerX, centerY);
                // Add glow effect
                ctx.shadowColor = '#22c55e';
                ctx.shadowBlur = 10;
                ctx.fillText('G', centerX, centerY);
                ctx.shadowBlur = 0;
                break;
            case TileType.TRAP:
                ctx.fillStyle = '#fff';
                ctx.fillText('!', centerX, centerY);
                break;
            case TileType.HEAL:
                ctx.fillStyle = '#fff';
                ctx.fillText('+', centerX, centerY);
                break;
            case TileType.PIT:
                ctx.fillStyle = '#666';
                ctx.fillText('X', centerX, centerY);
                // Draw skull-like symbol
                ctx.font = `${tileSize * 0.25}px monospace`;
                ctx.fillText('PIT', centerX, centerY + tileSize * 0.25);
                break;
            case TileType.GOLD:
                ctx.fillStyle = '#000';
                ctx.fillText('$', centerX, centerY);
                // Add shine effect
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 8;
                ctx.fillStyle = '#fbbf24';
                ctx.fillText('$', centerX, centerY);
                ctx.shadowBlur = 0;
                break;
            case TileType.MONSTER:
                // Draw monster with menacing look
                ctx.fillStyle = '#fff';
                ctx.font = `bold ${tileSize * 0.5}px monospace`;
                ctx.fillText('M', centerX, centerY);
                // Add purple glow
                ctx.shadowColor = '#9333ea';
                ctx.shadowBlur = 12;
                ctx.fillText('M', centerX, centerY);
                ctx.shadowBlur = 0;
                break;
        }
    }

    renderAgent() {
        if (!this.agent) return;

        const { ctx, tileSize } = this;
        const { x, y, hp, maxHp } = this.agent;

        // Apply viewport offset
        const cy = y - this.viewportYOffset;
        const visibleRows = this.viewportHeight != null ? this.viewportHeight : this.grid.height;
        if (cy < 0 || cy >= visibleRows) return;

        const centerX = x * tileSize + tileSize / 2;
        const centerY = cy * tileSize + tileSize / 2;
        const radius = tileSize * 0.35;

        // Agent body (circle)
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';  // Yellow
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Agent eyes
        const eyeOffset = radius * 0.3;
        const eyeRadius = radius * 0.15;

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(centerX - eyeOffset, centerY - eyeOffset * 0.5, eyeRadius, 0, Math.PI * 2);
        ctx.arc(centerX + eyeOffset, centerY - eyeOffset * 0.5, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        // HP bar above agent
        const barWidth = tileSize * 0.8;
        const barHeight = 4;
        const barX = x * tileSize + (tileSize - barWidth) / 2;
        const barY = cy * tileSize + 4;

        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // HP fill
        const hpPercent = hp / maxHp;
        const hpColor = hpPercent > 0.5 ? '#22c55e' : (hpPercent > 0.25 ? '#fbbf24' : '#ef4444');
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
    }

    render() {
        this.clear();
        this.renderGrid();
        this.renderStageSeparators();

        if (this.showQValues && this.qValues) {
            this.renderQValues();
        }

        if (this.showPolicy && this.policy) {
            this.renderPolicy();
        }

        this.renderAgent();
        this.renderFloorIndicator();
    }

    /**
     * Draw "Floor X/Y" badge at top-right of canvas (viewport mode only)
     */
    renderFloorIndicator() {
        if (!this.grid || !this.grid.getTotalStages) return;
        const total = this.grid.getTotalStages();
        if (total <= 1 || this.viewportHeight == null) return;

        const stageIndex = this.grid.getCurrentStageIndex();
        const label = `Floor ${stageIndex + 1}/${total}`;

        const { ctx, tileSize } = this;
        ctx.save();
        ctx.font = `bold ${tileSize * 0.32}px monospace`;
        const metrics = ctx.measureText(label);
        const padX = 8, padY = 4;
        const w = metrics.width + padX * 2;
        const h = tileSize * 0.32 + padY * 2 + 4;
        const bx = this.canvas.width - w - 6;
        const by = 6;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.roundRect(bx, by, w, h, 4);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, by, w, h, 4);
        ctx.stroke();

        // Text
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, bx + w / 2, by + h / 2);
        ctx.restore();
    }

    /**
     * Draw horizontal lines between stages in a MultiStageGrid
     */
    renderStageSeparators() {
        if (!this.grid || !this.grid.getTotalStages) return;
        if (this.viewportHeight != null) return; // viewport mode: one floor shown, no separators
        const total = this.grid.getTotalStages();
        if (total <= 1) return;

        const { ctx, tileSize } = this;
        ctx.save();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 4;

        for (let s = 1; s < total; s++) {
            const yOffset = this.grid.getStageOffset(s);
            const py = yOffset * tileSize;
            ctx.beginPath();
            ctx.moveTo(0, py);
            ctx.lineTo(this.grid.width * tileSize, py);
            ctx.stroke();
        }

        ctx.restore();
    }

    setQData(qValues, policy) {
        this.qValues = qValues;
        this.policy = policy;
    }

    renderQValues() {
        if (!this.qValues) return;

        const { ctx, tileSize } = this;
        const yStart = this.viewportYOffset;
        const yEnd = this.viewportHeight != null ? yStart + this.viewportHeight : this.grid.height;

        // Find min/max for color scaling (within viewport)
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

                // Color from red (low) to green (high)
                const r = Math.floor(255 * (1 - normalized));
                const g = Math.floor(255 * normalized);
                const b = 50;

                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.4)`;
                ctx.fillRect(
                    x * tileSize + 2,
                    cy * tileSize + 2,
                    tileSize - 4,
                    tileSize - 4
                );

                // Show Q-value text
                ctx.font = `${tileSize * 0.22}px monospace`;
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(q.toFixed(1), x * tileSize + tileSize / 2, (cy + 1) * tileSize - 4);
            }
        }
    }

    renderPolicy() {
        if (!this.policy) return;

        const { ctx, tileSize } = this;
        const arrowSize = tileSize * 0.25;
        const yStart = this.viewportYOffset;
        const yEnd = this.viewportHeight != null ? yStart + this.viewportHeight : this.grid.height;

        // Arrow directions for each action
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

                const centerX = x * tileSize + tileSize / 2;
                const centerY = cy * tileSize + tileSize / 2;

                // Draw arrow
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
                    // Horizontal arrow
                    ctx.moveTo(tipX, tipY);
                    ctx.lineTo(tipX - dir.dx * headSize, tipY - headSize);
                    ctx.lineTo(tipX - dir.dx * headSize, tipY + headSize);
                } else {
                    // Vertical arrow
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

    // Flash effect for damage/heal
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

        setTimeout(() => {
            overlay.remove();
        }, duration);
    }
}
