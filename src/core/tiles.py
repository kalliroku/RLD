"""Tile system for the dungeon grid world."""
from enum import Enum
from dataclasses import dataclass


class TileType(Enum):
    """Types of tiles in the dungeon."""
    EMPTY = 0
    WALL = 1
    START = 2
    GOAL = 3
    TRAP = 4
    HEAL = 5


@dataclass
class TileProperties:
    """Properties for each tile type."""
    passable: bool
    reward: float
    char: str
    name: str


# Tile properties lookup
TILE_PROPERTIES: dict[TileType, TileProperties] = {
    TileType.EMPTY: TileProperties(passable=True, reward=0, char='.', name='Empty'),
    TileType.WALL: TileProperties(passable=False, reward=-1, char='#', name='Wall'),
    TileType.START: TileProperties(passable=True, reward=0, char='S', name='Start'),
    TileType.GOAL: TileProperties(passable=True, reward=100, char='G', name='Goal'),
    TileType.TRAP: TileProperties(passable=True, reward=-10, char='T', name='Trap'),
    TileType.HEAL: TileProperties(passable=True, reward=5, char='H', name='Heal'),
}


def tile_to_char(tile: TileType) -> str:
    """Convert tile type to character representation."""
    return TILE_PROPERTIES[tile].char


def char_to_tile(char: str) -> TileType:
    """Convert character to tile type."""
    for tile_type, props in TILE_PROPERTIES.items():
        if props.char == char:
            return tile_type
    raise ValueError(f"Unknown tile character: {char}")


def is_passable(tile: TileType) -> bool:
    """Check if a tile is passable."""
    return TILE_PROPERTIES[tile].passable


def get_reward(tile: TileType) -> float:
    """Get the reward for stepping on a tile."""
    return TILE_PROPERTIES[tile].reward
