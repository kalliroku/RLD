/**
 * TilemapRenderer — Layer-based rendering engine
 * Drop-in replacement for Renderer with the same API.
 * Uses TileAtlas for cached tile sprites and Tilemap for layer decomposition.
 */

import { TileType } from './tiles.js';
import { Action } from './agent.js';
import { TileAtlas } from './tile-atlas.js';
import { Tilemap, Layer } from './tilemap.js';
import { PAL, drawCharacter } from './opening-art.js';   // 인던전 = 오프닝 비주얼 문법 (D-2026-06-10 bm)

export class TilemapRenderer {
    constructor(canvas, tileSize = 64) {
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

        // 횃불 비네트 — 에이전트 중심의 따뜻한 광 + 가장자리 어둠(오프닝 P2~P4 문법).
        // 시각 전용. Q-히트맵/정책 화살표가 켜지면(분석 뷰) 가독성을 위해 자동 생략.
        this.torchVignette = true;

        // Treasure
        this.treasurePosition = null;
        this.carryingTreasure = false;

        // Stage viewport
        this.viewportYOffset = 0;
        this.viewportHeight = null;

        // Follow camera (render-only; sim/PPO coords unaffected).
        // Mutually exclusive with the stage viewport: disabled whenever
        // viewportHeight != null (multi-stage dungeons use the Y-crop above).
        this.cameraEnabled = false;
        this.cameraClamp = false; // false = center-lock (agent always centered);
                                  // true = stop at map bounds (no void, but small
                                  // maps freeze). Center-lock fits RLD's tiny maps.
        this.camX = 0;            // current camera top-left, world px (lerped)
        this.camY = 0;
        this._camScale = 1;       // displayPx / (viewTiles*ts) — applied via setTransform
        this._camSettled = true;  // true when cam reached its target (stops the RAF tick)
        this._camInit = false;    // snap to target on the first frame after enabling
        this._camRafPending = false;
        // Dynamic zoom: viewTiles is the world HEIGHT (in tiles) shown top-to-bottom.
        // Starts at 5 (zoomed in); raise targetViewTiles to zoom OUT. Lerped for smooth zoom.
        this.viewTiles = 5;
        this.targetViewTiles = 5;
        // 와이드스크린 카메라 — 오프닝 시네마틱 형태(16:9 풀블리드). 줌은 세로(displayH) 기준,
        // 가로는 aspect 만큼 더 보여줌. 캔버스 해상도 고정(줌은 순수 scale).
        this.aspect = 16 / 9;
        this.displayH = 9 * tileSize;                            // 576 — 세로 해상도
        this.displayW = Math.round(this.displayH * this.aspect); // 1024 — 가로(16:9)
        this.camLerp = 0.18;

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

    // ─── Follow camera ──────────────────────────────────────────

    /**
     * Enable/disable the player-follow camera. Render-only — does not touch
     * agent or grid coordinates, so sim/PPO determinism is unaffected.
     * No-op into "off" when a stage viewport is active (multi-stage dungeons),
     * since the two are mutually exclusive crop strategies.
     */
    setCameraFollow(enabled, viewTiles = 5) {
        if (enabled && this.viewportHeight != null) enabled = false;

        if (enabled) {
            this.targetViewTiles = viewTiles;
            if (!this.cameraEnabled) {
                // Fresh enable: snap zoom + position to target on first frame.
                this.viewTiles = viewTiles;
                this._camInit = true;
            }
            // Canvas resolution is fixed (displayW×displayH, 16:9); zoom is pure scale.
            if (this.canvas.width !== this.displayW || this.canvas.height !== this.displayH) {
                this.canvas.width = this.displayW;
                this.canvas.height = this.displayH;
            }
            this.cameraEnabled = true;
        } else {
            this.cameraEnabled = false;
            // Restore full-map canvas sizing (single-stage only; multi-stage
            // owns its own canvas dims via setViewportStage).
            if (this.grid && this.viewportHeight == null) {
                const w = this.grid.width * this.tileSize;
                const h = this.grid.height * this.tileSize;
                if (this.canvas.width !== w || this.canvas.height !== h) {
                    this.canvas.width = w;
                    this.canvas.height = h;
                }
            }
        }
    }

    /**
     * Dynamic zoom target: how many tiles wide the viewport shows. Lerped.
     * displayPx (canvas resolution) stays fixed — zoom comes purely from the
     * scale = displayPx / (viewTiles*ts) in _updateCamera, so a larger
     * targetViewTiles zooms OUT (more tiles, smaller).
     */
    setViewTiles(tiles) {
        this.targetViewTiles = tiles;
        this._camSettled = false;
        if (this.cameraEnabled) this._scheduleCameraFrame();
    }

    /**
     * Recompute camera scale + clamped top-left for the current agent position.
     * Lerps camX/camY/viewTiles toward their targets and sets _camSettled when
     * they've converged. Pure render math — no sim state touched.
     */
    _updateCamera() {
        const ts = this.tileSize;

        // Lerp the zoom (tiles-across) first; it feeds the scale + view width.
        this.viewTiles += (this.targetViewTiles - this.viewTiles) * this.camLerp;
        const viewH = this.viewTiles * ts;            // world px visible vertically (줌 기준)
        this._camScale = this.displayH / viewH;
        const viewW = this.displayW / this._camScale; // world px visible horizontally (와이드)

        // Target top-left so the agent sits centered, in world px.
        const ax = (this.agent.x + 0.5) * ts;
        const ay = (this.agent.y + 0.5) * ts;
        const mapW = this.grid.width * ts;
        const mapH = this.grid.height * ts;

        // Center-lock: keep the agent dead-center. RLD dungeons (5×5–~20) are
        // often smaller than the viewport, so clamping would freeze the camera;
        // center-lock makes the follow read on every map size (void beyond the
        // edges shows the dark clear color). Set cameraClamp=true to stop at map
        // bounds instead (only meaningful on maps larger than the viewport).
        let tx = ax - viewW / 2;
        let ty = ay - viewH / 2;                     // widescreen: viewW(가로) ≠ viewH(세로)
        if (this.cameraClamp) {
            tx = mapW > viewW ? Math.max(0, Math.min(tx, mapW - viewW)) : -(viewW - mapW) / 2;
            ty = mapH > viewH ? Math.max(0, Math.min(ty, mapH - viewH)) : -(viewH - mapH) / 2;
        }

        if (this._camInit) {
            // Snap on first frame after enabling — no slide-in from (0,0).
            this.camX = tx;
            this.camY = ty;
            this.viewTiles = this.targetViewTiles;
            this._camScale = this.displayH / (this.viewTiles * ts);
            this._camInit = false;
        } else {
            this.camX += (tx - this.camX) * this.camLerp;
            this.camY += (ty - this.camY) * this.camLerp;
        }

        const settled = Math.abs(tx - this.camX) < 0.5 &&
                        Math.abs(ty - this.camY) < 0.5 &&
                        Math.abs(this.targetViewTiles - this.viewTiles) < 0.01;
        if (settled) {
            this.camX = tx;
            this.camY = ty;
            this.viewTiles = this.targetViewTiles;
        }
        this._camSettled = settled;
    }

    /** Schedule one more render frame while the camera is still sliding. */
    _scheduleCameraFrame() {
        if (this._camRafPending || typeof requestAnimationFrame === 'undefined') return;
        this._camRafPending = true;
        requestAnimationFrame(() => {
            this._camRafPending = false;
            this.render();
        });
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

        // Clear (untransformed — fills the whole canvas regardless of camera)
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = PAL.bg;                       // 따뜻한 암흑 (#0a0907)
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.grid) return;

        // Follow camera: apply a single world→screen transform around the world
        // layers. Mutually exclusive with the stage viewport (guarded below).
        const camActive = this.cameraEnabled && this.viewportHeight == null && this.agent;
        if (camActive) {
            this._updateCamera();
            ctx.setTransform(this._camScale, 0, 0, this._camScale,
                             -this.camX * this._camScale, -this.camY * this._camScale);
        }

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

        // 8.5 횃불 비네트 (월드 좌표 — 카메라 변환 안에서 그려야 줌과 정합)
        this._renderTorchVignette();

        // Reset transform so HUD/overlays draw in screen space.
        if (camActive) ctx.setTransform(1, 0, 0, 1, 0, 0);

        // 9. HUD
        this._renderFloorIndicator();

        // B-201: optional minimap hook (mobile, large dungeons)
        if (this.onAfterRender) this.onAfterRender();

        // Keep animating while the camera slides toward its target.
        if (camActive && !this._camSettled) this._scheduleCameraFrame();
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

        ctx.fillStyle = PAL.bg;
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

        // 발밑 그림자 — 스프라이트가 바닥에 '서 있게'
        ctx.beginPath();
        ctx.ellipse(centerX, cy * ts + ts * 0.86, ts * 0.26, ts * 0.09, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(4, 3, 3, 0.45)';
        ctx.fill();

        // 픽셀 세르파 — 오프닝의 플레이어 스프라이트와 동일 문법(8px 그리드).
        // tile 인자를 8의 배수로 스냅해 px 그리드를 정수화(서브픽셀 블러 방지).
        drawCharacter(ctx, centerX, centerY, 'player', Math.max(8, Math.round(ts * 0.92 / 8) * 8));

        // HP bar
        const barWidth = ts * 0.8;
        const barHeight = 4;
        const barX = x * ts + (ts - barWidth) / 2;
        const barY = cy * ts + 4;

        ctx.fillStyle = 'rgba(7, 6, 4, 0.7)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const hpPercent = hp / maxHp;
        const hpColor = hpPercent > 0.5 ? '#5a8f4e' : (hpPercent > 0.25 ? '#e6b562' : '#c0392b');
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
    }

    // ─── 횃불 비네트 (시각 전용 — sim/좌표 무접촉) ───────────────
    //
    // 오프닝 P2~P4 의 "플레이어가 빛을 들고 다닌다" 문법. 에이전트 주변은 따뜻한
    // 횃불 광, 화면 가장자리는 어둠으로 가라앉는다. 분석 뷰(Q-히트맵/정책 화살표)
    // 에서는 셀 가독성이 우선이므로 생략. fogOfWar(타일 단위 메커닉)와는 독립 —
    // 포그가 켜져도 비네트는 분위기 레이어로 함께 동작한다.
    _renderTorchVignette() {
        if (!this.torchVignette || !this.agent || !this.grid) return;
        if (this.showQValues || this.showPolicy) return;
        const { ctx, tileSize: ts } = this;

        const cx = (this.agent.x + 0.5) * ts;
        const cy = (this.agent.y - this.viewportYOffset + 0.5) * ts;
        // 커버 범위: 카메라 모드에선 뷰포트(월드 px), 아니면 그리드 전체 + 여백
        const pad = ts * 2;
        const x0 = (this.cameraEnabled ? this.camX : 0) - pad;
        const y0 = (this.cameraEnabled ? this.camY : 0) - pad;
        const cw = (this.cameraEnabled ? this.viewTiles * ts * this.aspect : this.grid.width * ts) + pad * 2;
        const ch = (this.cameraEnabled ? this.viewTiles * ts
                   : (this.viewportHeight != null ? this.viewportHeight : this.grid.height) * ts) + pad * 2;

        const r = ts * 3.6;

        // 1) 따뜻한 횃불 광 — 중심의 미세한 amber tint
        let g = ctx.createRadialGradient(cx, cy, ts * 0.2, cx, cy, r * 0.5);
        g.addColorStop(0, 'rgba(230, 181, 98, 0.12)');
        g.addColorStop(1, 'rgba(230, 181, 98, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(x0, y0, cw, ch);

        // 2) 가장자리 어둠 — 오프닝 시네마틱(짙은 어둠). 최종 조명은 Claude Design drawFogRadial 로 교체 예정(interim).
        g = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r);
        g.addColorStop(0, 'rgba(5, 4, 7, 0)');
        g.addColorStop(0.55, 'rgba(5, 4, 7, 0.45)');
        g.addColorStop(1, 'rgba(5, 4, 7, 0.92)');
        ctx.fillStyle = g;
        ctx.fillRect(x0, y0, cw, ch);
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
        ctx.shadowColor = '#e6b562';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#e6b562';
        ctx.beginPath();
        const s = ts * 0.25;
        ctx.moveTo(centerX, centerY - s);
        ctx.lineTo(centerX + s, centerY);
        ctx.lineTo(centerX, centerY + s);
        ctx.lineTo(centerX - s, centerY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#c08a3a';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // "T" label
        ctx.font = `bold ${ts * 0.25}px monospace`;
        ctx.fillStyle = '#3a2a14';
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
        ctx.strokeStyle = '#c08a3a';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.shadowColor = '#c08a3a';
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

        ctx.fillStyle = 'rgba(10, 9, 7, 0.75)';
        ctx.beginPath();
        ctx.roundRect(bx, by, w, h, 4);
        ctx.fill();

        ctx.strokeStyle = '#c08a3a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bx, by, w, h, 4);
        ctx.stroke();

        ctx.fillStyle = '#e6b562';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, bx + w / 2, by + h / 2);
        ctx.restore();
    }
}
