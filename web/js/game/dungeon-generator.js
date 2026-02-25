/**
 * Procedural Dungeon Generator - BSP + Cellular Automata Hybrid
 *
 * 5-stage pipeline:
 * 1. BSP Partition: Recursively split grid into leaf partitions
 * 2. Room Placement: Place rooms within each leaf
 * 3. Corridor Connection: L-shaped corridors between sibling rooms
 * 4. CA Smoothing: Cellular automata for organic cave shapes
 * 5. Element Placement: BFS-distance-based S, G, T, M, $, H, P placement
 *
 * Usage:
 *   import { generateDungeon } from './dungeon-generator.js';
 *   const gridString = generateDungeon(50, 50, { seed: 42 });
 */

// ========== Seeded PRNG (Mulberry32) ==========

function mulberry32(seed) {
    let s = seed | 0;
    return function () {
        s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ========== BSP Tree ==========

class BSPNode {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.left = null;
        this.right = null;
        this.room = null;
    }

    isLeaf() {
        return !this.left && !this.right;
    }
}

function splitBSP(node, rng, minLeaf, maxLeaf) {
    if (node.w <= maxLeaf && node.h <= maxLeaf) {
        if (rng() > 0.25) return; // 75% chance to stop when small enough
    }

    if (node.w < minLeaf * 2 && node.h < minLeaf * 2) return;

    // Choose split direction
    let splitH;
    if (node.w < minLeaf * 2) {
        splitH = true; // Must split horizontally
    } else if (node.h < minLeaf * 2) {
        splitH = false; // Must split vertically
    } else {
        splitH = node.h > node.w ? true : (node.w > node.h ? false : rng() > 0.5);
    }

    if (splitH) {
        // Horizontal split
        const minSplit = minLeaf;
        const maxSplit = node.h - minLeaf;
        if (minSplit >= maxSplit) return;
        const split = minSplit + Math.floor(rng() * (maxSplit - minSplit));
        node.left = new BSPNode(node.x, node.y, node.w, split);
        node.right = new BSPNode(node.x, node.y + split, node.w, node.h - split);
    } else {
        // Vertical split
        const minSplit = minLeaf;
        const maxSplit = node.w - minLeaf;
        if (minSplit >= maxSplit) return;
        const split = minSplit + Math.floor(rng() * (maxSplit - minSplit));
        node.left = new BSPNode(node.x, node.y, split, node.h);
        node.right = new BSPNode(node.x + split, node.y, node.w - split, node.h);
    }

    splitBSP(node.left, rng, minLeaf, maxLeaf);
    splitBSP(node.right, rng, minLeaf, maxLeaf);
}

// ========== Room Placement ==========

function placeRooms(node, rng, minRoom, padding) {
    if (node.isLeaf()) {
        const maxRoomW = node.w - padding * 2;
        const maxRoomH = node.h - padding * 2;
        if (maxRoomW < minRoom || maxRoomH < minRoom) return;

        const roomW = minRoom + Math.floor(rng() * (maxRoomW - minRoom + 1));
        const roomH = minRoom + Math.floor(rng() * (maxRoomH - minRoom + 1));
        const roomX = node.x + padding + Math.floor(rng() * (maxRoomW - roomW + 1));
        const roomY = node.y + padding + Math.floor(rng() * (maxRoomH - roomH + 1));

        node.room = { x: roomX, y: roomY, w: roomW, h: roomH };
        return;
    }

    if (node.left) placeRooms(node.left, rng, minRoom, padding);
    if (node.right) placeRooms(node.right, rng, minRoom, padding);
}

// ========== Corridor Connection ==========

function getRoomCenter(node) {
    if (node.room) {
        return {
            x: Math.floor(node.room.x + node.room.w / 2),
            y: Math.floor(node.room.y + node.room.h / 2)
        };
    }
    // Recurse into children to find a room
    if (node.left) {
        const r = getRoomCenter(node.left);
        if (r) return r;
    }
    if (node.right) {
        const r = getRoomCenter(node.right);
        if (r) return r;
    }
    return null;
}

function connectRooms(node, grid, rng) {
    if (node.isLeaf()) return;

    if (node.left) connectRooms(node.left, grid, rng);
    if (node.right) connectRooms(node.right, grid, rng);

    const centerA = getRoomCenter(node.left);
    const centerB = getRoomCenter(node.right);

    if (!centerA || !centerB) return;

    // L-shaped corridor
    if (rng() > 0.5) {
        // Go horizontal first, then vertical
        carveCorridor(grid, centerA.x, centerA.y, centerB.x, centerA.y);
        carveCorridor(grid, centerB.x, centerA.y, centerB.x, centerB.y);
    } else {
        // Go vertical first, then horizontal
        carveCorridor(grid, centerA.x, centerA.y, centerA.x, centerB.y);
        carveCorridor(grid, centerA.x, centerB.y, centerB.x, centerB.y);
    }
}

function carveCorridor(grid, x1, y1, x2, y2) {
    const w = grid[0].length;
    const h = grid.length;

    let x = x1, y = y1;
    const dx = x2 > x1 ? 1 : (x2 < x1 ? -1 : 0);
    const dy = y2 > y1 ? 1 : (y2 < y1 ? -1 : 0);

    while (x !== x2 || y !== y2) {
        if (x >= 0 && x < w && y >= 0 && y < h) {
            grid[y][x] = 0; // Empty
        }
        if (x !== x2) x += dx;
        else if (y !== y2) y += dy;
    }
    if (x >= 0 && x < w && y >= 0 && y < h) {
        grid[y][x] = 0;
    }
}

// ========== Cellular Automata ==========

function applyCellularAutomata(grid, iterations, birthLimit, surviveLimit) {
    const h = grid.length;
    const w = grid[0].length;

    for (let iter = 0; iter < iterations; iter++) {
        const newGrid = grid.map(row => [...row]);

        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const neighbors = countWallNeighbors(grid, x, y);

                if (grid[y][x] === 1) {
                    // Wall: survive if enough wall neighbors
                    newGrid[y][x] = neighbors >= surviveLimit ? 1 : 0;
                } else {
                    // Empty: become wall if too many wall neighbors
                    newGrid[y][x] = neighbors >= birthLimit ? 1 : 0;
                }
            }
        }

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                grid[y][x] = newGrid[y][x];
            }
        }
    }
}

function countWallNeighbors(grid, x, y) {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (ny < 0 || ny >= grid.length || nx < 0 || nx >= grid[0].length) {
                count++; // Out of bounds counts as wall
            } else if (grid[ny][nx] === 1) {
                count++;
            }
        }
    }
    return count;
}

// ========== BFS for Connectivity & Distance ==========

function bfs(grid, startX, startY) {
    const h = grid.length;
    const w = grid[0].length;
    const dist = Array.from({ length: h }, () => new Int32Array(w).fill(-1));
    const queue = [[startX, startY]];
    dist[startY][startX] = 0;

    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    let head = 0;

    while (head < queue.length) {
        const [cx, cy] = queue[head++];
        for (const [dx, dy] of dirs) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && dist[ny][nx] === -1 && grid[ny][nx] === 0) {
                dist[ny][nx] = dist[cy][cx] + 1;
                queue.push([nx, ny]);
            }
        }
    }

    return dist;
}

function findReachableFloorTiles(grid, startX, startY) {
    const dist = bfs(grid, startX, startY);
    const tiles = [];
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
            if (dist[y][x] > 0) {
                tiles.push({ x, y, dist: dist[y][x] });
            }
        }
    }
    tiles.sort((a, b) => a.dist - b.dist);
    return { dist, tiles };
}

// ========== Ensure Connectivity ==========

function ensureConnectivity(grid) {
    const h = grid.length;
    const w = grid[0].length;

    // Find all floor tiles
    const floorTiles = [];
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            if (grid[y][x] === 0) {
                floorTiles.push([x, y]);
            }
        }
    }

    if (floorTiles.length === 0) return;

    // BFS from first floor tile to find connected component
    const visited = Array.from({ length: h }, () => new Uint8Array(w));
    const queue = [floorTiles[0]];
    visited[floorTiles[0][1]][floorTiles[0][0]] = 1;
    const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    let head = 0;

    while (head < queue.length) {
        const [cx, cy] = queue[head++];
        for (const [dx, dy] of dirs) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && !visited[ny][nx] && grid[ny][nx] === 0) {
                visited[ny][nx] = 1;
                queue.push([nx, ny]);
            }
        }
    }

    // Find disconnected floor tiles and connect them
    for (const [fx, fy] of floorTiles) {
        if (!visited[fy][fx]) {
            // Find nearest connected tile
            let bestDist = Infinity;
            let bestTarget = null;

            for (let i = 0; i < queue.length; i++) {
                const [cx, cy] = queue[i];
                const d = Math.abs(cx - fx) + Math.abs(cy - fy);
                if (d < bestDist) {
                    bestDist = d;
                    bestTarget = [cx, cy];
                }
            }

            if (bestTarget) {
                // Carve tunnel
                carveCorridor(grid, fx, fy, bestTarget[0], bestTarget[1]);

                // Re-run BFS to update visited
                const newFloors = [];
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        if (grid[y][x] === 0 && !visited[y][x]) {
                            visited[y][x] = 1;
                            queue.push([x, y]);
                        }
                    }
                }
            }
        }
    }
}

// ========== Element Placement ==========

function placeElements(grid, rng, options = {}) {
    const h = grid.length;
    const w = grid[0].length;

    // Find a good start position (corner-ish floor tile)
    const floorTiles = [];
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            if (grid[y][x] === 0) {
                floorTiles.push([x, y]);
            }
        }
    }

    if (floorTiles.length < 10) return null;

    // Choose start: prefer corner area
    const cornerScore = (x, y) => {
        const cx = w / 2, cy = h / 2;
        return Math.abs(x - cx) + Math.abs(y - cy);
    };

    floorTiles.sort((a, b) => cornerScore(b[0], b[1]) - cornerScore(a[0], a[1]));
    const startTile = floorTiles[Math.floor(rng() * Math.min(5, floorTiles.length))];
    const [startX, startY] = startTile;

    // BFS from start to get distances
    const { dist, tiles } = findReachableFloorTiles(grid, startX, startY);

    if (tiles.length < 10) return null;

    // Goal: furthest reachable tile
    const goalTile = tiles[tiles.length - 1];

    // Verify path exists
    if (dist[goalTile.y][goalTile.x] < 0) return null;

    // Place S and G
    grid[startY][startX] = 2; // START
    grid[goalTile.y][goalTile.x] = 3; // GOAL

    const maxDist = goalTile.dist;
    const usedPositions = new Set([`${startX},${startY}`, `${goalTile.x},${goalTile.y}`]);

    // Helper: place elements based on distance ratio
    function placeByDistance(count, minRatio, maxRatio, tileType) {
        const candidates = tiles.filter(t => {
            const ratio = t.dist / maxDist;
            return ratio >= minRatio && ratio <= maxRatio && !usedPositions.has(`${t.x},${t.y}`);
        });

        // Shuffle candidates
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }

        const placed = Math.min(count, candidates.length);
        for (let i = 0; i < placed; i++) {
            const t = candidates[i];
            grid[t.y][t.x] = tileType;
            usedPositions.add(`${t.x},${t.y}`);
        }
        return placed;
    }

    // Tile types: 4=TRAP, 5=HEAL, 6=PIT, 7=GOLD, 8=MONSTER
    const totalFloor = tiles.length;
    const scale = Math.max(1, Math.floor(totalFloor / 100));

    // Traps: mid-range (30-80% distance)
    placeByDistance(Math.max(3, scale * 5), 0.3, 0.8, 4);

    // Heals: scattered (20-70% distance)
    placeByDistance(Math.max(2, scale * 2), 0.2, 0.7, 5);

    // Pits: mid-late (40-90% distance), fewer
    placeByDistance(Math.max(1, scale * 2), 0.4, 0.9, 6);

    // Gold: scattered widely (10-90% distance)
    placeByDistance(Math.max(3, scale * 4), 0.1, 0.9, 7);

    // Monsters: mid-late (30-90% distance)
    placeByDistance(Math.max(2, scale * 3), 0.3, 0.9, 8);

    return { startX, startY, goalX: goalTile.x, goalY: goalTile.y, maxDist };
}

// ========== Main Generator ==========

/**
 * Generate a dungeon using BSP + Cellular Automata hybrid.
 *
 * @param {number} width - Grid width
 * @param {number} height - Grid height
 * @param {object} options - Generator options
 * @param {number} options.seed - Random seed (default: random)
 * @param {string} options.style - 'cave' or 'rooms' (default: 'rooms')
 * @param {number} options.minLeaf - BSP min leaf size (default: 10)
 * @param {number} options.maxLeaf - BSP max leaf size (default: 24)
 * @param {number} options.minRoom - Min room dimension (default: 4)
 * @param {number} options.padding - Room padding from leaf edge (default: 1)
 * @param {number} options.caIterations - CA iterations (default: 3)
 * @param {number} options.initialWall - Initial wall probability for CA (default: 0.42)
 * @returns {string} Grid string in the format used by Grid.fromString()
 */
export function generateDungeon(width, height, options = {}) {
    const seed = options.seed ?? Math.floor(Math.random() * 2147483647);
    const rng = mulberry32(seed);
    const style = options.style ?? 'rooms';

    const minLeaf = options.minLeaf ?? 10;
    const maxLeaf = options.maxLeaf ?? 24;
    const minRoom = options.minRoom ?? 4;
    const padding = options.padding ?? 1;
    const caIterations = options.caIterations ?? 3;
    const initialWall = options.initialWall ?? 0.42;

    // 1. Initialize grid as all walls
    const grid = Array.from({ length: height }, () => new Array(width).fill(1));

    // 2. BSP partition
    const root = new BSPNode(0, 0, width, height);
    splitBSP(root, rng, minLeaf, maxLeaf);

    // 3. Place rooms in leaves
    placeRooms(root, rng, minRoom, padding);

    // 4. Carve rooms into grid
    carveRoomsIntoGrid(root, grid);

    // 5. Connect rooms via corridors
    connectRooms(root, grid, rng);

    // 6. Apply CA if cave style
    if (style === 'cave') {
        // Add random floor tiles around rooms for CA to work with
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                if (grid[y][x] === 1 && rng() < initialWall * 0.6) {
                    // Check if near a floor tile
                    let nearFloor = false;
                    for (let dy = -2; dy <= 2; dy++) {
                        for (let dx = -2; dx <= 2; dx++) {
                            const ny = y + dy, nx = x + dx;
                            if (ny >= 0 && ny < height && nx >= 0 && nx < width && grid[ny][nx] === 0) {
                                nearFloor = true;
                            }
                        }
                    }
                    if (nearFloor && rng() < 0.4) {
                        grid[y][x] = 0;
                    }
                }
            }
        }

        applyCellularAutomata(grid, caIterations, 5, 4);
    }

    // 7. Ensure border walls
    for (let x = 0; x < width; x++) {
        grid[0][x] = 1;
        grid[height - 1][x] = 1;
    }
    for (let y = 0; y < height; y++) {
        grid[y][0] = 1;
        grid[y][width - 1] = 1;
    }

    // 8. Ensure connectivity
    ensureConnectivity(grid);

    // 9. Place elements (S, G, T, M, $, H, P)
    const result = placeElements(grid, rng);
    if (!result) {
        // Fallback: try again with different approach
        return generateDungeon(width, height, { ...options, seed: seed + 1 });
    }

    // 10. Convert to string format
    return gridToString(grid);
}

function carveRoomsIntoGrid(node, grid) {
    if (node.isLeaf() && node.room) {
        const r = node.room;
        for (let y = r.y; y < r.y + r.h; y++) {
            for (let x = r.x; x < r.x + r.w; x++) {
                if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) {
                    grid[y][x] = 0;
                }
            }
        }
        return;
    }
    if (node.left) carveRoomsIntoGrid(node.left, grid);
    if (node.right) carveRoomsIntoGrid(node.right, grid);
}

function gridToString(grid) {
    // Tile mapping: 0=empty, 1=wall, 2=start, 3=goal, 4=trap, 5=heal, 6=pit, 7=gold, 8=monster
    const charMap = {
        0: '.',
        1: '#',
        2: 'S',
        3: 'G',
        4: 'T',
        5: 'H',
        6: 'P',
        7: '$',
        8: 'M'
    };

    return grid.map(row => row.map(t => charMap[t] || '#').join('')).join('\n');
}
