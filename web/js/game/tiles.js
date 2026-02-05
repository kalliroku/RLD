/**
 * Tile system for the dungeon
 */

export const TileType = {
    EMPTY: 0,
    WALL: 1,
    START: 2,
    GOAL: 3,
    TRAP: 4,
    HEAL: 5,
    PIT: 6,      // 즉사 함정
    GOLD: 7      // 골드 아이템
};

export const TileProperties = {
    [TileType.EMPTY]: { passable: true, reward: 0, char: '.', name: 'Empty', color: '#1a1a2e', lethal: false },
    [TileType.WALL]: { passable: false, reward: -1, char: '#', name: 'Wall', color: '#374151', lethal: false },
    [TileType.START]: { passable: true, reward: 0, char: 'S', name: 'Start', color: '#3b82f6', lethal: false },
    [TileType.GOAL]: { passable: true, reward: 100, char: 'G', name: 'Goal', color: '#22c55e', lethal: false },
    [TileType.TRAP]: { passable: true, reward: -10, char: 'T', name: 'Trap', color: '#ef4444', lethal: false },
    [TileType.HEAL]: { passable: true, reward: 5, char: 'H', name: 'Heal', color: '#f472b6', lethal: false },
    [TileType.PIT]: { passable: true, reward: -100, char: 'P', name: 'Pit', color: '#18181b', lethal: true },
    [TileType.GOLD]: { passable: true, reward: 10, char: '$', name: 'Gold', color: '#fbbf24', lethal: false }
};

export function charToTile(char) {
    for (const [type, props] of Object.entries(TileProperties)) {
        if (props.char === char) {
            return parseInt(type);
        }
    }
    return TileType.EMPTY;
}

export function tileToChar(tile) {
    return TileProperties[tile]?.char || '.';
}

export function isPassable(tile) {
    return TileProperties[tile]?.passable ?? false;
}

export function getReward(tile) {
    return TileProperties[tile]?.reward ?? 0;
}

export function getTileColor(tile) {
    return TileProperties[tile]?.color || '#1a1a2e';
}

export function isLethal(tile) {
    return TileProperties[tile]?.lethal ?? false;
}
