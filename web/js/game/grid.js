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
###`,

    // Level 13: Cliff Walk - SARSA 쇼케이스 (절벽 길)
    // Q-Learning은 구덩이 바로 위 최적 경로, SARSA는 안전한 우회
    level_13_cliff: `##############
#............#
#............#
#S..........G#
#PPPPPPPPPPPP#
##############`,

    // Level 14: Long Hall - Monte Carlo 쇼케이스 (긴 복도)
    // 중간 보상 없는 장거리, MC의 정확한 리턴 vs TD 부트스트랩 오차
    level_14_long_hall: `###################
#S................#
#.###############.#
#.#...............#
#.#.###############
#.#...............#
#.###############.#
#................G#
###################`,

    // Level 15: Multi Room - SARSA(λ) 쇼케이스 (다중 방)
    // 3개 방을 통과, eligibility trace가 먼 과거 결정도 업데이트
    level_15_multi_room: `###############
#S...#...#...G#
#.##.#.#.#.##.#
#.##...#...##.#
#.#####.#####.#
#.............#
###############`,

    // Level 16: Open Field - Dyna-Q 쇼케이스 (넓은 광장)
    // 넓은 개방 공간, 모델 기반 계획의 효과 극대
    level_16_open_field: `#################
#S..............#
#...............#
#...............#
#...............#
#...............#
#...............#
#..............G#
#################`,

    // Level 17: Two Paths - REINFORCE 쇼케이스 (두 갈래 길)
    // 상하 대칭 경로, PG는 확률적 정책 학습
    level_17_two_paths: `###########
#....#....#
#.S..#..G.#
#....#....#
#.##...##.#
#.#.....#.#
#.#.....#.#
#.##...##.#
#....#....#
#....#....#
###########`,

    // Level 18: Dead End Labyrinth - TD > MC/REINFORCE
    // TD는 타임아웃에서도 데드엔드 가치를 점진 학습, MC/REINFORCE는 골 미도달 시 학습 불가
    level_18_dead_end: `###############
#S....#...#...#
#####.#.#.#.#.#
#.....#.#.#.#.#
#.#####.#.#.#.#
#.......#...#.#
#.###########.#
#.............#
#########.#.###
#.........#..G#
###############`,

    // Level 19: Narrow Bridge - SARSA > Q-Learning (안전성)
    // 양쪽 구덩이 사이 좁은 다리, SARSA는 안전한 우회 학습
    level_19_bridge: `#################
#S..............#
#.#############.#
#.PPPPPPPPPPPPP.#
#..............G#
#.PPPPPPPPPPPPP.#
#.#############.#
#...............#
#################`,

    // Level 20: The Sacrifice - 절벽 걷기 (Cliff Walking)
    // 절벽(PIT) 바로 위 유일한 경로. SARSA는 신중한 탐험으로 빠르게 수렴, Q-Learning은 낙관적 평가로 느림
    // 알고리즘별 위험 대처 방식 차이 시각화
    level_20_sacrifice: `#################
#...............#
#...............#
#...............#
#...............#
#...............#
#...............#
#S.............G#
#PPPPPPPPPPPPPPP#
#################`,

    // Level 21: Desert Crossing - Dyna-Q >> 전체 (10배 빠른 수렴)
    // 매우 큰 개방 공간, 모델 기반 계획의 효과 극대화
    level_21_desert: `###################
#S................#
#.................#
#.................#
#.................#
#.................#
#.................#
#.................#
#.................#
#.................#
#.................#
#................G#
###################`,

    // Level 22: Monster Arena - HP 관리 전투 (몬스터+힐 혼합)
    // 몬스터 3마리 + 힐 2개 필수 통과. useHpState로 HP 인식 학습 테스트
    level_22_arena: `#############
#S.M.H.M.HMG#
#...........#
#...........#
#...........#
#...........#
#############`,

    // Level 23: The Mirage - MC > TD (기만적 보상)
    // 골드 줄줄이 이어지다 마지막에 구덩이, MC는 1번 죽으면 즉시 학습
    level_23_mirage: `###############
#S............#
#..#########..#
#..$$$$$$$P#..#
#..#########..#
#............G#
###############`,

    // Level 24: Paper Maze - Wiering & van Hasselt (2008) 논문 원본
    // 앙상블 알고리즘 벤치마크용 6×9 그리드. 두 개의 수직 벽이 경로를 구획
    level_24_paper_maze: `###########
#.......#G#
#..#....#.#
#S.#....#.#
#..#......#
#.....#...#
#.........#
###########`,

    // Level 25: Paper Maze+ - 논문 미로에 함정·힐·몬스터·골드 추가
    // 앙상블 쇼케이스: 서브 알고리즘마다 위험 평가가 다름
    level_25_paper_hard: `###########
#.....T.#G#
#..#....#H#
#S.#....#.#
#..#.M....#
#.$...#...#
#.........#
###########`
};

export function loadDungeon(name) {
    const dungeonText = DUNGEONS[name];
    if (!dungeonText) {
        throw new Error(`Unknown dungeon: ${name}`);
    }
    return Grid.fromString(dungeonText);
}
