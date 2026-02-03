/**
 * Tile system for the dungeon
 */

export const TileType = {
    EMPTY: 0,
    WALL: 1,
    START: 2,
    GOAL: 3,
    TRAP: 4,
    HEAL: 5
};

export const TileProperties = {
    [TileType.EMPTY]: { passable: true, reward: 0, char: '.', name: 'Empty', color: '#1a1a2e' },
    [TileType.WALL]: { passable: false, reward: -1, char: '#', name: 'Wall', color: '#374151' },
    [TileType.START]: { passable: true, reward: 0, char: 'S', name: 'Start', color: '#3b82f6' },
    [TileType.GOAL]: { passable: true, reward: 100, char: 'G', name: 'Goal', color: '#22c55e' },
    [TileType.TRAP]: { passable: true, reward: -10, char: 'T', name: 'Trap', color: '#ef4444' },
    [TileType.HEAL]: { passable: true, reward: 5, char: 'H', name: 'Heal', color: '#f472b6' }
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
