/**
 * Dungeon Editor - Browser-based dungeon creation tool
 */

import { Grid } from './grid.js';
import { TileType, TileProperties, getTileColor } from './tiles.js';

const STORAGE_KEY_STAGES = 'rld_stages';
const STORAGE_KEY_DUNGEONS = 'rld_dungeons';
const STORAGE_KEY_CUSTOM_LEGACY = 'rld_custom_dungeons';
const MAX_UNDO = 50;
const MAX_FLOORS = 5;
const MIN_SIZE = 3;
const MAX_SIZE = 25;

export class DungeonEditor {
    constructor(canvas, renderer, onPlayDungeon, onQuickTest) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.renderer = renderer;
        this.onPlayDungeon = onPlayDungeon; // callback(grid, name)
        this.onQuickTest = onQuickTest; // callback(grid, character, maxEpisodes, onProgress, onComplete, shouldAbort)

        this.grid = null;
        this.activeTile = TileType.WALL;
        this.activeTool = 'brush'; // 'brush' | 'eraser' | 'fill'
        this.isPainting = false;
        this.undoStack = [];
        this.redoStack = [];
        this.hoverPos = null;
        this.lastPaintedCell = null;

        this.active = false;

        // Quick Test state
        this.quickTestRunning = false;
        this.quickTestAbort = false;
        this._showingTestPolicy = false;
        this._lastTestValueGrid = null;
        this._lastTestPolicyGrid = null;

        // Bound event handlers (for add/remove)
        this._onMouseDown = (e) => this.handleCanvasMouseDown(e);
        this._onMouseMove = (e) => this.handleCanvasMouseMove(e);
        this._onMouseUp = (e) => this.handleCanvasMouseUp(e);
        this._onContextMenu = (e) => this.handleCanvasContextMenu(e);
        this._onMouseLeave = (e) => this.handleCanvasMouseLeave(e);
        this._onTouchStart = (e) => this.handleCanvasTouchStart(e);
        this._onTouchMove = (e) => this.handleCanvasTouchMove(e);
        this._onTouchEnd = (e) => this.handleCanvasTouchEnd(e);
        this._onKeyDown = (e) => this.handleKeyDown(e);
    }

    // ========== Lifecycle ==========

    activate() {
        if (this.active) return;
        this.active = true;

        if (!this.grid) {
            this.createGrid(7, 7);
        }

        this.canvas.addEventListener('mousedown', this._onMouseDown);
        this.canvas.addEventListener('mousemove', this._onMouseMove);
        window.addEventListener('mouseup', this._onMouseUp);
        this.canvas.addEventListener('contextmenu', this._onContextMenu);
        this.canvas.addEventListener('mouseleave', this._onMouseLeave);
        this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this._onTouchEnd, { passive: false });
        document.addEventListener('keydown', this._onKeyDown);

        this.render();
    }

    deactivate() {
        if (!this.active) return;
        this.active = false;

        if (this.quickTestRunning) {
            this.stopQuickTest();
        }

        this.canvas.removeEventListener('mousedown', this._onMouseDown);
        this.canvas.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('mouseup', this._onMouseUp);
        this.canvas.removeEventListener('contextmenu', this._onContextMenu);
        this.canvas.removeEventListener('mouseleave', this._onMouseLeave);
        this.canvas.removeEventListener('touchstart', this._onTouchStart);
        this.canvas.removeEventListener('touchmove', this._onTouchMove);
        this.canvas.removeEventListener('touchend', this._onTouchEnd);
        document.removeEventListener('keydown', this._onKeyDown);

        this.isPainting = false;
        this.hoverPos = null;
    }

    // ========== Grid Management ==========

    createGrid(w, h) {
        w = Math.max(MIN_SIZE, Math.min(MAX_SIZE, w));
        h = Math.max(MIN_SIZE, Math.min(MAX_SIZE, h));

        this.grid = new Grid(w, h);

        // Fill walls on border
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
                    this.grid.setTile(x, y, TileType.WALL);
                }
            }
        }

        // Place start and goal
        this.grid.setTile(1, 1, TileType.START);
        this.grid.setTile(w - 2, h - 2, TileType.GOAL);

        this.undoStack = [];
        this.redoStack = [];

        this.applyGridToRenderer();
        this.render();
    }

    clearGrid() {
        if (!this.grid) return;
        this.pushUndoState();

        const w = this.grid.width;
        const h = this.grid.height;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
                    this.grid.tiles[y][x] = TileType.WALL;
                } else {
                    this.grid.tiles[y][x] = TileType.EMPTY;
                }
            }
        }

        // Place start and goal
        this.grid.setTile(1, 1, TileType.START);
        this.grid.setTile(w - 2, h - 2, TileType.GOAL);

        this.render();
    }

    resizeGrid(newW, newH) {
        newW = Math.max(MIN_SIZE, Math.min(MAX_SIZE, newW));
        newH = Math.max(MIN_SIZE, Math.min(MAX_SIZE, newH));

        if (this.grid && newW === this.grid.width && newH === this.grid.height) return;

        this.pushUndoState();

        const oldGrid = this.grid;
        this.grid = new Grid(newW, newH);

        // Fill walls on border
        for (let y = 0; y < newH; y++) {
            for (let x = 0; x < newW; x++) {
                if (x === 0 || x === newW - 1 || y === 0 || y === newH - 1) {
                    this.grid.tiles[y][x] = TileType.WALL;
                }
            }
        }

        // Copy old interior tiles
        if (oldGrid) {
            for (let y = 1; y < newH - 1; y++) {
                for (let x = 1; x < newW - 1; x++) {
                    if (y < oldGrid.height - 1 && x < oldGrid.width - 1) {
                        const tile = oldGrid.tiles[y][x];
                        this.grid.setTile(x, y, tile);
                    }
                }
            }
        }

        // Ensure START exists
        if (!this.grid.startPos) {
            this.grid.setTile(1, 1, TileType.START);
        }
        // Ensure GOAL exists
        if (!this.grid.goalPos) {
            this.grid.setTile(newW - 2, newH - 2, TileType.GOAL);
        }

        this.applyGridToRenderer();
        this.render();
    }

    applyGridToRenderer() {
        this._showingTestPolicy = false;
        this.renderer.setGrid(this.grid);
        this.renderer.setAgent(null);
        this.renderer.fogOfWar = false;
        this.renderer.showQValues = false;
        this.renderer.showPolicy = false;
        this.renderer.setQData(null, null);
    }

    // ========== Tile Painting ==========

    paintTile(x, y, tileType) {
        if (!this.grid || !this.grid.isValidPosition(x, y)) return;

        // Don't paint on border walls (keep them as walls)
        // Allow only if placing WALL on border
        const isBorder = x === 0 || x === this.grid.width - 1 || y === 0 || y === this.grid.height - 1;
        if (isBorder) return;

        const currentTile = this.grid.tiles[y][x];
        if (currentTile === tileType) return;

        // START/GOAL single enforcement
        if (tileType === TileType.START && this.grid.startPos) {
            const sp = this.grid.startPos;
            if (sp.x !== x || sp.y !== y) {
                this.grid.tiles[sp.y][sp.x] = TileType.EMPTY;
            }
        }
        if (tileType === TileType.GOAL && this.grid.goalPos) {
            const gp = this.grid.goalPos;
            if (gp.x !== x || gp.y !== y) {
                this.grid.tiles[gp.y][gp.x] = TileType.EMPTY;
            }
        }

        // If painting over existing START/GOAL
        if (currentTile === TileType.START && tileType !== TileType.START) {
            this.grid.startPos = null;
        }
        if (currentTile === TileType.GOAL && tileType !== TileType.GOAL) {
            this.grid.goalPos = null;
        }

        this.grid.setTile(x, y, tileType);
    }

    // ========== Canvas Events ==========

    canvasToGrid(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const px = (clientX - rect.left) * scaleX;
        const py = (clientY - rect.top) * scaleY;
        const tileSize = this.renderer.tileSize;
        return {
            x: Math.floor(px / tileSize),
            y: Math.floor(py / tileSize)
        };
    }

    handleCanvasMouseDown(e) {
        if (e.button === 2) return; // right-click handled by contextmenu
        const pos = this.canvasToGrid(e.clientX, e.clientY);
        if (!this.grid || !this.grid.isValidPosition(pos.x, pos.y)) return;

        this.isPainting = true;
        this.lastPaintedCell = null;
        this.pushUndoState();

        if (this.activeTool === 'fill') {
            const targetTile = this.grid.tiles[pos.y][pos.x];
            const newTile = this.activeTile;
            if (targetTile !== newTile) {
                this.floodFill(pos.x, pos.y, newTile);
            }
            this.isPainting = false;
        } else {
            const tile = this.activeTool === 'eraser' ? TileType.EMPTY : this.activeTile;
            this.paintTile(pos.x, pos.y, tile);
            this.lastPaintedCell = `${pos.x},${pos.y}`;
        }

        this.render();
    }

    handleCanvasMouseMove(e) {
        const pos = this.canvasToGrid(e.clientX, e.clientY);
        if (!this.grid || !this.grid.isValidPosition(pos.x, pos.y)) {
            this.hoverPos = null;
            this.render();
            return;
        }

        this.hoverPos = pos;

        if (this.isPainting && this.activeTool !== 'fill') {
            const cellKey = `${pos.x},${pos.y}`;
            if (cellKey !== this.lastPaintedCell) {
                const tile = this.activeTool === 'eraser' ? TileType.EMPTY : this.activeTile;
                this.paintTile(pos.x, pos.y, tile);
                this.lastPaintedCell = cellKey;
            }
        }

        this.render();
    }

    handleCanvasMouseUp(e) {
        this.isPainting = false;
        this.lastPaintedCell = null;
    }

    handleCanvasContextMenu(e) {
        e.preventDefault();
        const pos = this.canvasToGrid(e.clientX, e.clientY);
        if (!this.grid || !this.grid.isValidPosition(pos.x, pos.y)) return;

        this.pushUndoState();
        this.paintTile(pos.x, pos.y, TileType.EMPTY);
        this.render();
    }

    handleCanvasMouseLeave(e) {
        this.hoverPos = null;
        this.render();
    }

    // ========== Touch Events ==========

    handleCanvasTouchStart(e) {
        e.preventDefault();
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        const pos = this.canvasToGrid(touch.clientX, touch.clientY);
        if (!this.grid || !this.grid.isValidPosition(pos.x, pos.y)) return;

        this.isPainting = true;
        this.lastPaintedCell = null;
        this.pushUndoState();

        if (this.activeTool === 'fill') {
            const targetTile = this.grid.tiles[pos.y][pos.x];
            const newTile = this.activeTile;
            if (targetTile !== newTile) {
                this.floodFill(pos.x, pos.y, newTile);
            }
            this.isPainting = false;
        } else {
            const tile = this.activeTool === 'eraser' ? TileType.EMPTY : this.activeTile;
            this.paintTile(pos.x, pos.y, tile);
            this.lastPaintedCell = `${pos.x},${pos.y}`;
        }

        this.render();
    }

    handleCanvasTouchMove(e) {
        e.preventDefault();
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        const pos = this.canvasToGrid(touch.clientX, touch.clientY);
        if (!this.grid || !this.grid.isValidPosition(pos.x, pos.y)) return;

        this.hoverPos = pos;

        if (this.isPainting && this.activeTool !== 'fill') {
            const cellKey = `${pos.x},${pos.y}`;
            if (cellKey !== this.lastPaintedCell) {
                const tile = this.activeTool === 'eraser' ? TileType.EMPTY : this.activeTile;
                this.paintTile(pos.x, pos.y, tile);
                this.lastPaintedCell = cellKey;
            }
        }

        this.render();
    }

    handleCanvasTouchEnd(e) {
        e.preventDefault();
        this.isPainting = false;
        this.lastPaintedCell = null;
        this.hoverPos = null;
        this.render();
    }

    // ========== Tools ==========

    selectTile(type) {
        this.activeTile = type;
    }

    setTool(name) {
        this.activeTool = name;
    }

    floodFill(startX, startY, newTile) {
        if (!this.grid) return;
        const targetTile = this.grid.tiles[startY][startX];
        if (targetTile === newTile) return;

        // Don't flood fill from border
        const isBorder = startX === 0 || startX === this.grid.width - 1 ||
                         startY === 0 || startY === this.grid.height - 1;
        if (isBorder) return;

        const queue = [{ x: startX, y: startY }];
        const visited = new Set();
        visited.add(`${startX},${startY}`);

        const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];

        while (queue.length > 0) {
            const { x, y } = queue.shift();

            // Don't fill border tiles
            const border = x === 0 || x === this.grid.width - 1 || y === 0 || y === this.grid.height - 1;
            if (border) continue;

            this.paintTile(x, y, newTile);

            for (const { dx, dy } of dirs) {
                const nx = x + dx;
                const ny = y + dy;
                const key = `${nx},${ny}`;
                if (!visited.has(key) && this.grid.isValidPosition(nx, ny) &&
                    this.grid.tiles[ny][nx] === targetTile) {
                    visited.add(key);
                    queue.push({ x: nx, y: ny });
                }
            }
        }
    }

    // ========== Undo/Redo ==========

    pushUndoState() {
        if (!this.grid) return;
        this.undoStack.push(this.grid.toString());
        if (this.undoStack.length > MAX_UNDO) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length === 0) return;
        // Save current state to redo
        this.redoStack.push(this.grid.toString());
        // Restore previous state
        const prev = this.undoStack.pop();
        this.grid = Grid.fromString(prev);
        this.applyGridToRenderer();
        this.render();
    }

    redo() {
        if (this.redoStack.length === 0) return;
        // Save current state to undo
        this.undoStack.push(this.grid.toString());
        // Restore next state
        const next = this.redoStack.pop();
        this.grid = Grid.fromString(next);
        this.applyGridToRenderer();
        this.render();
    }

    // ========== Validation ==========

    validate() {
        const errors = [];

        if (!this.grid) {
            return { valid: false, errors: ['No grid created'] };
        }

        // Check START
        if (!this.grid.startPos) {
            errors.push('START tile is missing');
        }

        // Check GOAL
        if (!this.grid.goalPos) {
            errors.push('GOAL tile is missing');
        }

        // Check path exists (BFS)
        if (this.grid.startPos && this.grid.goalPos) {
            if (!this.bfsPathExists(this.grid.startPos, this.grid.goalPos)) {
                errors.push('No path from START to GOAL');
            }
        }

        return { valid: errors.length === 0, errors };
    }

    bfsPathExists(start, goal) {
        const queue = [{ x: start.x, y: start.y }];
        const visited = new Set();
        visited.add(`${start.x},${start.y}`);

        const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];

        while (queue.length > 0) {
            const { x, y } = queue.shift();

            if (x === goal.x && y === goal.y) return true;

            for (const { dx, dy } of dirs) {
                const nx = x + dx;
                const ny = y + dy;
                const key = `${nx},${ny}`;

                if (!visited.has(key) && this.grid.isValidPosition(nx, ny)) {
                    const tile = this.grid.tiles[ny][nx];
                    const props = TileProperties[tile];
                    if (props && props.passable) {
                        visited.add(key);
                        queue.push({ x: nx, y: ny });
                    }
                }
            }
        }

        return false;
    }

    // ========== Stage Library (Save/Load) ==========

    _loadStages() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_STAGES);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    _saveStages(data) {
        try {
            localStorage.setItem(STORAGE_KEY_STAGES, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save stages:', e);
        }
    }

    _nameToId(name) {
        return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'unnamed';
    }

    saveStage(name) {
        if (!this.grid || !name.trim()) return null;

        const id = this._nameToId(name);
        const all = this._loadStages();
        all[id] = {
            id,
            name: name.trim(),
            gridString: this.grid.toString(),
            width: this.grid.width,
            height: this.grid.height,
            tags: all[id]?.tags || [],
            createdAt: all[id]?.createdAt || new Date().toISOString()
        };
        this._saveStages(all);
        return id;
    }

    loadStage(id) {
        const all = this._loadStages();
        const data = all[id];
        if (!data) return false;

        this.grid = Grid.fromString(data.gridString);
        this.undoStack = [];
        this.redoStack = [];
        this.applyGridToRenderer();
        this.render();
        return true;
    }

    deleteStage(id) {
        const all = this._loadStages();
        if (all[id]) {
            delete all[id];
            this._saveStages(all);
            return true;
        }
        return false;
    }

    getStageList() {
        const all = this._loadStages();
        return Object.entries(all).map(([id, data]) => ({
            id,
            name: data.name,
            width: data.width,
            height: data.height,
            tags: data.tags || [],
            createdAt: data.createdAt
        }));
    }

    // Static methods for external access (e.g., main.js)

    static getStageListStatic() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_STAGES);
            const all = raw ? JSON.parse(raw) : {};
            return Object.entries(all).map(([id, data]) => ({
                id,
                name: data.name,
                width: data.width,
                height: data.height
            }));
        } catch (e) {
            return [];
        }
    }

    static loadStageGrid(id) {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_STAGES);
            const all = raw ? JSON.parse(raw) : {};
            const data = all[id];
            if (!data) return null;
            return Grid.fromString(data.gridString);
        } catch (e) {
            return null;
        }
    }

    /**
     * Migrate legacy rld_custom_dungeons to rld_stages.
     * Called once on startup. Safe to call multiple times.
     */
    static migrateToStages() {
        try {
            const customRaw = localStorage.getItem(STORAGE_KEY_CUSTOM_LEGACY);
            if (!customRaw) return;

            const customs = JSON.parse(customRaw);
            if (Object.keys(customs).length === 0) return;

            const stagesRaw = localStorage.getItem(STORAGE_KEY_STAGES);
            const stages = stagesRaw ? JSON.parse(stagesRaw) : {};

            let migrated = 0;
            for (const [id, data] of Object.entries(customs)) {
                if (!stages[id]) {
                    stages[id] = {
                        id,
                        name: data.name,
                        gridString: data.gridString,
                        width: data.width,
                        height: data.height,
                        tags: [],
                        createdAt: data.createdAt || new Date().toISOString()
                    };
                    migrated++;
                }
            }

            if (migrated > 0) {
                localStorage.setItem(STORAGE_KEY_STAGES, JSON.stringify(stages));
                console.log(`Migrated ${migrated} custom dungeons to Stage Library`);
            }
        } catch (e) {
            console.warn('Stage migration failed:', e);
        }
    }

    // ========== Rendering ==========

    render() {
        if (!this.active || !this.grid) return;

        // Use renderer for base grid drawing (no agent, no fog)
        this.renderer.setAgent(null);
        this.renderer.fogOfWar = false;
        if (this._showingTestPolicy) {
            this.renderer.showQValues = true;
            this.renderer.showPolicy = true;
        } else {
            this.renderer.showQValues = false;
            this.renderer.showPolicy = false;
        }
        this.renderer.render();

        // Draw hover cursor highlight
        if (this.hoverPos) {
            this.renderCursorHighlight(this.hoverPos.x, this.hoverPos.y);
        }
    }

    renderCursorHighlight(x, y) {
        if (!this.grid || !this.grid.isValidPosition(x, y)) return;

        const tileSize = this.renderer.tileSize;
        const ctx = this.ctx;

        // Don't show preview on border
        const isBorder = x === 0 || x === this.grid.width - 1 || y === 0 || y === this.grid.height - 1;

        if (!isBorder) {
            // Semi-transparent tile color preview
            const tile = this.activeTool === 'eraser' ? TileType.EMPTY : this.activeTile;
            const color = getTileColor(tile);
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.4;
            ctx.fillRect(x * tileSize + 1, y * tileSize + 1, tileSize - 2, tileSize - 2);
            ctx.globalAlpha = 1.0;
        }

        // White border highlight
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x * tileSize + 2, y * tileSize + 2, tileSize - 4, tileSize - 4);
    }

    // ========== Keyboard ==========

    handleKeyDown(e) {
        // Number keys 0-8 for tile selection
        if (e.key >= '0' && e.key <= '8' && !e.ctrlKey && !e.metaKey) {
            const tileNum = parseInt(e.key);
            if (TileProperties[tileNum]) {
                this.selectTile(tileNum);
                this.updatePaletteUI();
                this.setTool('brush');
                this.updateToolUI();
            }
            return;
        }

        // Ctrl+Z: Undo
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.undo();
            return;
        }

        // Ctrl+Y or Ctrl+Shift+Z: Redo
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey) || (e.key === 'Z' && e.shiftKey))) {
            e.preventDefault();
            this.redo();
            return;
        }
    }

    // ========== UI Update Helpers ==========

    updatePaletteUI() {
        document.querySelectorAll('.palette-tile').forEach(btn => {
            const type = parseInt(btn.dataset.tile);
            btn.classList.toggle('active', type === this.activeTile);
        });
    }

    updateToolUI() {
        document.querySelectorAll('.btn-tool').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === this.activeTool);
        });
    }

    // ========== Quick Test ==========

    startQuickTest(character, maxEpisodes) {
        if (this.quickTestRunning) return { success: false, errors: ['Test already running'] };

        const result = this.validate();
        if (!result.valid) {
            return { success: false, errors: result.errors };
        }

        if (!this.onQuickTest) {
            return { success: false, errors: ['Quick test not configured'] };
        }

        this.quickTestRunning = true;
        this.quickTestAbort = false;
        this.clearTestPolicy();

        this.onQuickTest(
            this.grid,
            character,
            maxEpisodes,
            // onProgress
            (progress) => {
                this._onQuickTestProgress(progress);
            },
            // onComplete
            (result) => {
                this._onQuickTestComplete(result);
            },
            // shouldAbort
            () => this.quickTestAbort
        );

        return { success: true };
    }

    stopQuickTest() {
        this.quickTestAbort = true;
    }

    _onQuickTestProgress(progress) {
        // UI updates handled by main.js via DOM
    }

    _onQuickTestComplete(result) {
        this.quickTestRunning = false;
        this.quickTestAbort = false;
        if (result && result.valueGrid && result.policyGrid) {
            this._lastTestValueGrid = result.valueGrid;
            this._lastTestPolicyGrid = result.policyGrid;
        }
    }

    showTestPolicy(valueGrid, policyGrid) {
        if (!valueGrid || !policyGrid) {
            valueGrid = this._lastTestValueGrid;
            policyGrid = this._lastTestPolicyGrid;
        }
        if (!valueGrid || !policyGrid) return;
        this._showingTestPolicy = true;
        this.renderer.setQData(valueGrid, policyGrid);
        this.render();
    }

    clearTestPolicy() {
        this._showingTestPolicy = false;
        this.renderer.setQData(null, null);
        this.render();
    }

    // ========== Play Integration ==========

    playDungeon() {
        const result = this.validate();
        if (!result.valid) {
            return { success: false, errors: result.errors };
        }
        if (this.onPlayDungeon) {
            this.onPlayDungeon(this.grid, 'Custom Dungeon');
        }
        return { success: true };
    }

    // ========== Dungeon Composer (CRUD) ==========

    _loadDungeons() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_DUNGEONS);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    _saveDungeons(data) {
        try {
            localStorage.setItem(STORAGE_KEY_DUNGEONS, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to save dungeons:', e);
        }
    }

    saveDungeon(name, floors, rules) {
        if (!name.trim()) return null;
        const id = this._nameToId(name);
        const all = this._loadDungeons();
        all[id] = {
            id,
            name: name.trim(),
            floors,
            rules,
            createdAt: all[id]?.createdAt || new Date().toISOString()
        };
        this._saveDungeons(all);
        return id;
    }

    loadDungeonData(id) {
        const all = this._loadDungeons();
        return all[id] || null;
    }

    deleteDungeon(id) {
        const all = this._loadDungeons();
        if (all[id]) {
            delete all[id];
            this._saveDungeons(all);
            return true;
        }
        return false;
    }

    getDungeonList() {
        const all = this._loadDungeons();
        return Object.entries(all).map(([id, data]) => ({
            id,
            name: data.name,
            floorCount: data.floors ? data.floors.length : 0,
            createdAt: data.createdAt
        }));
    }

    static getDungeonListStatic() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_DUNGEONS);
            const all = raw ? JSON.parse(raw) : {};
            return Object.entries(all).map(([id, data]) => ({
                id,
                name: data.name,
                floorCount: data.floors ? data.floors.length : 0
            }));
        } catch (e) {
            return [];
        }
    }

    static loadDungeonDataStatic(id) {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_DUNGEONS);
            const all = raw ? JSON.parse(raw) : {};
            return all[id] || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Resolve a dungeon recipe into an array of Grids (for play/training).
     * For now, only handles "fixed" floors. Variant support in Phase 11-E.
     */
    /**
     * Resolve a dungeon recipe into playable grids.
     * Returns { grids, rules, floorVariants } where floorVariants[i] is
     * null (fixed) or an array of Grid objects (random variants).
     */
    static resolveDungeon(dungeonData) {
        if (!dungeonData || !dungeonData.floors) return null;

        const stagesRaw = localStorage.getItem(STORAGE_KEY_STAGES);
        const stages = stagesRaw ? JSON.parse(stagesRaw) : {};

        const grids = [];
        const floorVariants = [];

        for (const floor of dungeonData.floors) {
            if (floor.type === 'random' && floor.variants && floor.variants.length > 0) {
                // Random floor: resolve all variants
                const variantGrids = [];
                for (const v of floor.variants) {
                    if (!stages[v.stageId]) return null;
                    variantGrids.push(Grid.fromString(stages[v.stageId].gridString));
                }
                // Pick one for initial resolution (weighted random)
                const picked = DungeonEditor._weightedRandom(floor.variants);
                grids.push(Grid.fromString(stages[picked.stageId].gridString));
                floorVariants.push(variantGrids);
            } else {
                // Fixed floor
                const stageId = floor.stageId;
                if (!stageId || !stages[stageId]) return null;
                grids.push(Grid.fromString(stages[stageId].gridString));
                floorVariants.push(null);
            }
        }

        return { grids, rules: dungeonData.rules || {}, floorVariants };
    }

    static _weightedRandom(variants) {
        const totalWeight = variants.reduce((sum, v) => sum + (v.weight || 1), 0);
        let r = Math.random() * totalWeight;
        for (const v of variants) {
            r -= (v.weight || 1);
            if (r <= 0) return v;
        }
        return variants[variants.length - 1];
    }
}
