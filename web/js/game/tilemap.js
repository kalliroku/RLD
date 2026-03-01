/**
 * Tilemap — Grid-to-layer decomposition with dirty tracking
 * Decomposes a Grid/MultiStageGrid into rendering layers and tracks
 * which tiles need redrawing.
 */

import { TileType } from './tiles.js';

export const Layer = {
    GROUND: 0,
    WALLS: 1,
    OBJECTS: 2,
    ENTITIES: 3,
    OVERLAYS: 4
};

const LAYER_COUNT = 5;

// Object tile types that go on the OBJECTS layer
const OBJECT_TILES = new Set([
    TileType.START, TileType.GOAL, TileType.TRAP,
    TileType.HEAL, TileType.PIT, TileType.GOLD, TileType.MONSTER
]);

export class Tilemap {
    constructor() {
        this.width = 0;
        this.height = 0;
        this.grid = null;

        // Layer data: layers[layer][y][x] = tileType or mask
        this.layers = null;

        // Dirty tracking per layer: Set of "x,y" strings
        this._dirty = null;
    }

    /**
     * Decompose a Grid into rendering layers and precompute wall masks.
     */
    buildFromGrid(grid) {
        this.grid = grid;
        this.width = grid.width;
        this.height = grid.height;

        // Initialize layers
        this.layers = new Array(LAYER_COUNT);
        this._dirty = new Array(LAYER_COUNT);
        for (let l = 0; l < LAYER_COUNT; l++) {
            this.layers[l] = [];
            this._dirty[l] = new Set();
            for (let y = 0; y < this.height; y++) {
                this.layers[l][y] = new Array(this.width).fill(0);
            }
        }

        // Decompose tiles into layers
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = grid.getTile(x, y);

                if (tile === TileType.WALL) {
                    // Wall goes to WALLS layer with autotile mask
                    this.layers[Layer.WALLS][y][x] = this._computeWallMask(grid, x, y);
                    this.layers[Layer.GROUND][y][x] = 0; // no floor under walls
                } else if (OBJECT_TILES.has(tile)) {
                    // Objects get floor underneath + object on top
                    this.layers[Layer.GROUND][y][x] = TileType.EMPTY;
                    this.layers[Layer.OBJECTS][y][x] = tile;
                } else {
                    // Empty floor
                    this.layers[Layer.GROUND][y][x] = TileType.EMPTY;
                }
            }
        }

        // Mark all dirty for initial render
        this.markAllDirty();
    }

    /**
     * Compute 4-bit cardinal neighbor wall mask for autotiling.
     * N=1, E=2, S=4, W=8
     */
    _computeWallMask(grid, x, y) {
        let mask = 0;
        if (this._isWall(grid, x, y - 1)) mask |= 1; // N
        if (this._isWall(grid, x + 1, y)) mask |= 2; // E
        if (this._isWall(grid, x, y + 1)) mask |= 4; // S
        if (this._isWall(grid, x - 1, y)) mask |= 8; // W
        return mask;
    }

    _isWall(grid, x, y) {
        // Out of bounds = treated as wall (for border autotiling)
        if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return true;
        return grid.getTile(x, y) === TileType.WALL;
    }

    /**
     * Get the wall autotile mask at position (x, y).
     * Returns 0 if not a wall.
     */
    getWallMask(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
        return this.layers[Layer.WALLS][y][x];
    }

    /**
     * Mark a specific tile as needing redraw on a layer.
     */
    markDirty(layer, x, y) {
        if (layer >= 0 && layer < LAYER_COUNT) {
            this._dirty[layer].add(x + y * this.width);
        }
    }

    /**
     * Mark all tiles on all layers as dirty (full redraw).
     */
    markAllDirty() {
        for (let l = 0; l < LAYER_COUNT; l++) {
            this._dirty[l].clear();
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    this._dirty[l].add(x + y * this.width);
                }
            }
        }
    }

    /**
     * Get and clear dirty set for a layer.
     * Returns Set of packed coordinates (x + y * width).
     * Caller can unpack with: x = key % width, y = Math.floor(key / width)
     */
    consumeDirty(layer) {
        if (layer < 0 || layer >= LAYER_COUNT) return new Set();
        const dirty = this._dirty[layer];
        this._dirty[layer] = new Set();
        return dirty;
    }

    /**
     * Check if any tile on a layer is dirty.
     */
    isDirty(layer) {
        return this._dirty[layer] && this._dirty[layer].size > 0;
    }
}
