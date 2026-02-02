"""Grid world data structure for the dungeon."""
from __future__ import annotations
import numpy as np
from pathlib import Path
from .tiles import TileType, tile_to_char, char_to_tile, TILE_PROPERTIES


class Grid:
    """A 2D grid representing a dungeon."""

    def __init__(self, width: int, height: int):
        """Initialize an empty grid.

        Args:
            width: Number of columns
            height: Number of rows
        """
        self.width = width
        self.height = height
        # Initialize with empty tiles
        self.tiles = np.full((height, width), TileType.EMPTY, dtype=object)
        self._start_pos: tuple[int, int] | None = None
        self._goal_pos: tuple[int, int] | None = None

    def get_tile(self, x: int, y: int) -> TileType:
        """Get the tile at position (x, y).

        Args:
            x: Column index
            y: Row index

        Returns:
            The tile type at that position
        """
        if not self.is_valid_position(x, y):
            raise IndexError(f"Position ({x}, {y}) is out of bounds")
        return self.tiles[y, x]

    def set_tile(self, x: int, y: int, tile: TileType) -> None:
        """Set the tile at position (x, y).

        Args:
            x: Column index
            y: Row index
            tile: The tile type to set
        """
        if not self.is_valid_position(x, y):
            raise IndexError(f"Position ({x}, {y}) is out of bounds")

        # Track special positions
        old_tile = self.tiles[y, x]
        if old_tile == TileType.START:
            self._start_pos = None
        if old_tile == TileType.GOAL:
            self._goal_pos = None

        if tile == TileType.START:
            # Remove old start if exists
            if self._start_pos:
                ox, oy = self._start_pos
                self.tiles[oy, ox] = TileType.EMPTY
            self._start_pos = (x, y)
        if tile == TileType.GOAL:
            # Remove old goal if exists
            if self._goal_pos:
                ox, oy = self._goal_pos
                self.tiles[oy, ox] = TileType.EMPTY
            self._goal_pos = (x, y)

        self.tiles[y, x] = tile

    def is_valid_position(self, x: int, y: int) -> bool:
        """Check if a position is within the grid bounds."""
        return 0 <= x < self.width and 0 <= y < self.height

    @property
    def start_pos(self) -> tuple[int, int] | None:
        """Get the start position."""
        return self._start_pos

    @property
    def goal_pos(self) -> tuple[int, int] | None:
        """Get the goal position."""
        return self._goal_pos

    def __str__(self) -> str:
        """Convert grid to string representation."""
        lines = []
        for y in range(self.height):
            row = ""
            for x in range(self.width):
                row += tile_to_char(self.tiles[y, x])
            lines.append(row)
        return "\n".join(lines)

    def __repr__(self) -> str:
        return f"Grid({self.width}x{self.height})"


def create_empty_grid(width: int, height: int) -> Grid:
    """Create an empty grid (all EMPTY tiles)."""
    return Grid(width, height)


def create_bordered_grid(width: int, height: int) -> Grid:
    """Create a grid with walls around the border."""
    grid = Grid(width, height)

    # Top and bottom walls
    for x in range(width):
        grid.set_tile(x, 0, TileType.WALL)
        grid.set_tile(x, height - 1, TileType.WALL)

    # Left and right walls
    for y in range(height):
        grid.set_tile(0, y, TileType.WALL)
        grid.set_tile(width - 1, y, TileType.WALL)

    return grid


def load_grid_from_string(text: str) -> Grid:
    """Load a grid from a multi-line string.

    Args:
        text: Multi-line string representation of the grid

    Returns:
        A Grid object
    """
    lines = [line for line in text.strip().split('\n') if line]
    height = len(lines)
    width = max(len(line) for line in lines)

    grid = Grid(width, height)

    for y, line in enumerate(lines):
        for x, char in enumerate(line):
            if char != ' ':  # Skip spaces (treated as empty)
                try:
                    tile = char_to_tile(char)
                    grid.set_tile(x, y, tile)
                except ValueError:
                    pass  # Unknown character, keep as EMPTY

    return grid


def load_grid_from_file(path: str | Path) -> Grid:
    """Load a grid from a text file."""
    with open(path, 'r') as f:
        return load_grid_from_string(f.read())


def save_grid_to_file(grid: Grid, path: str | Path) -> None:
    """Save a grid to a text file."""
    with open(path, 'w') as f:
        f.write(str(grid))
