/**
 * Grid data structure for the dungeon
 */

import { TileType, charToTile, tileToChar } from './tiles.js';

export class Grid {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.tiles = [];
        this.startPos = null;
        this.goalPos = null;

        // Initialize with empty tiles
        for (let y = 0; y < height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                this.tiles[y][x] = TileType.EMPTY;
            }
        }
    }

    getTile(x, y) {
        if (!this.isValidPosition(x, y)) {
            return TileType.WALL;
        }
        return this.tiles[y][x];
    }

    setTile(x, y, tile) {
        if (!this.isValidPosition(x, y)) return;

        // Track special positions
        if (tile === TileType.START) {
            this.startPos = { x, y };
        } else if (tile === TileType.GOAL) {
            this.goalPos = { x, y };
        }

        this.tiles[y][x] = tile;
    }

    isValidPosition(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    toString() {
        let result = '';
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                result += tileToChar(this.tiles[y][x]);
            }
            result += '\n';
        }
        return result;
    }

    static fromString(text) {
        const lines = text.trim().split('\n').filter(line => line.length > 0);
        const height = lines.length;
        const width = Math.max(...lines.map(line => line.length));

        const grid = new Grid(width, height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < lines[y].length; x++) {
                const char = lines[y][x];
                const tile = charToTile(char);
                grid.setTile(x, y, tile);
            }
        }

        return grid;
    }
}

// Sample dungeons (embedded for easy deployment)
export const DUNGEONS = {
    level_01_easy: `#####
#S..#
#...#
#..G#
#####`,

    level_02_trap: `#######
#S....#
#.###.#
#.#T#.#
#.#H#.#
#....G#
#######`,

    level_03_maze: `#########
#S..#...#
###.#.#.#
#...#.#.#
#.###.#.#
#.....#.#
#.#####.#
#.....TG#
#########`
};

export function loadDungeon(name) {
    const dungeonText = DUNGEONS[name];
    if (!dungeonText) {
        throw new Error(`Unknown dungeon: ${name}`);
    }
    return Grid.fromString(dungeonText);
}
