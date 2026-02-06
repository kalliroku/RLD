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
    // Level 1: Tutorial - 단순한 길
    level_01_easy: `#####
#S..#
#...#
#..G#
#####`,

    // Level 2: First Trap - 함정 & 몬스터 소개
    level_02_trap: `#######
#S....#
#.###.#
#.#T#.#
#.#H#.#
#..M.G#
#######`,

    // Level 3: Maze - 미로 탐험
    level_03_maze: `#########
#S..#...#
###.#.#.#
#...#.#.#
#.###.#.#
#.....#.#
#.#####.#
#.....TG#
#########`,

    // Level 4: Pit Danger - 즉사 함정 소개
    level_04_pit: `#######
#S....#
#.###.#
#.#P#.#
#..M..#
#..H..#
#....G#
#######`,

    // Level 5: Gold Rush - 골드 수집
    level_05_gold: `#########
#S......#
#.#####.#
#.$.$...#
#.#####.#
#.$.$.$.#
#.#####.#
#......G#
#########`,

    // Level 6: Risk & Reward - 위험과 보상
    level_06_risk: `#########
#S......#
#.#P#P#.#
#.#$#$#.#
#.#.M.#.#
#.#T#T#.#
#.#H#H#.#
#......G#
#########`,

    // Level 7: The Gauntlet - 시련의 길
    level_07_gauntlet: `###########
#S........#
#.#######.#
#.#TPMPT#.#
#.#.....#.#
#.#.###.#.#
#.#.$H$.#.#
#.#.###.#.#
#.#..M..#.#
#.........G
###########`,

    // Level 8: Deadly Maze - 죽음의 미로
    level_08_deadly: `###########
#S..#.....#
###.#.###.#
#P..#.#P#.#
#.###.#.#.#
#.$.#...#.#
#.#.###.#.#
#.#H..#.#.#
#.#####.#.#
#.......#G#
###########`,

    // Level 9: Treasure Hunt - 보물 사냥
    level_09_treasure: `#############
#S..........#
#.#########.#
#.#$.$.$.$#.#
#.#.#####.#.#
#.#.#PPP#.#.#
#.#.#.M.#.#.#
#.#.#.H.#.#.#
#.#.#...#.#.#
#.#.#####.#.#
#.#...M...#.#
#.#########.#
#..........G#
#############`,

    // Level 10: Final Challenge - 최종 도전
    level_10_final: `###############
#S............#
#.###########.#
#.#P.$.P.$.P#.#
#.#.#######.#.#
#.#.#T.H.T#.#.#
#.#.#.###.#.#.#
#.#.#.#G#.#.#.#
#.#.#.#M#.#.#.#
#.#.#...#.#.#.#
#.#.#####.#.#.#
#.#...M...#.#.#
#.#########.#.#
#.............#
###############`,

    // Level 11: Monster Gauntlet - HP 관리 테스트 (우회 가능)
    level_11_hp_test: `#########
#S......#
#H......#
#.......#
#..MMM..#
#.......#
#..MMM..#
#.......#
#......G#
#########`,

    // Level 12: HP Gauntlet - 반드시 몬스터 통과 필요 (진짜 좁은 복도)
    level_12_hp_gauntlet: `###
#S#
#H#
#.#
#M#
#.#
#M#
#.#
#M#
#.#
#M#
#.#
#G#
###`
};

export function loadDungeon(name) {
    const dungeonText = DUNGEONS[name];
    if (!dungeonText) {
        throw new Error(`Unknown dungeon: ${name}`);
    }
    return Grid.fromString(dungeonText);
}
