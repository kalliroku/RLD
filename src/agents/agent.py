"""Agent (Adventurer) for the dungeon."""
from enum import IntEnum
from ..core.grid import Grid
from ..core.tiles import TileType, is_passable, get_reward


class Action(IntEnum):
    """Actions the agent can take."""
    UP = 0
    DOWN = 1
    LEFT = 2
    RIGHT = 3


# Direction vectors for each action (dx, dy)
ACTION_DELTAS = {
    Action.UP: (0, -1),
    Action.DOWN: (0, 1),
    Action.LEFT: (-1, 0),
    Action.RIGHT: (1, 0),
}


class Agent:
    """An agent that navigates the dungeon."""

    def __init__(self, x: int, y: int, hp: int = 100, max_hp: int = 100):
        """Initialize the agent.

        Args:
            x: Starting x position
            y: Starting y position
            hp: Starting health points
            max_hp: Maximum health points
        """
        self.x = x
        self.y = y
        self.hp = hp
        self.max_hp = max_hp
        self.total_reward = 0.0

    @property
    def position(self) -> tuple[int, int]:
        """Get current position."""
        return (self.x, self.y)

    @property
    def is_alive(self) -> bool:
        """Check if the agent is alive."""
        return self.hp > 0

    def get_next_position(self, action: Action) -> tuple[int, int]:
        """Calculate the next position for a given action.

        Args:
            action: The action to take

        Returns:
            The (x, y) position after the action
        """
        dx, dy = ACTION_DELTAS[action]
        return (self.x + dx, self.y + dy)

    def can_move(self, action: Action, grid: Grid) -> bool:
        """Check if a move is valid.

        Args:
            action: The action to take
            grid: The grid to check against

        Returns:
            True if the move is valid
        """
        next_x, next_y = self.get_next_position(action)

        # Check bounds
        if not grid.is_valid_position(next_x, next_y):
            return False

        # Check if tile is passable
        tile = grid.get_tile(next_x, next_y)
        return is_passable(tile)

    def move(self, action: Action, grid: Grid) -> tuple[float, bool, bool]:
        """Execute a move action.

        Args:
            action: The action to take
            grid: The grid to move on

        Returns:
            Tuple of (reward, done, success)
            - reward: The reward for this step
            - done: True if episode ended (goal reached or died)
            - success: True if move was successful
        """
        step_reward = -0.1  # Small penalty for each step

        if not self.can_move(action, grid):
            # Wall bump
            self.total_reward += step_reward - 1
            return step_reward - 1, False, False

        # Execute move
        self.x, self.y = self.get_next_position(action)

        # Get tile at new position
        tile = grid.get_tile(self.x, self.y)
        tile_reward = get_reward(tile)

        # Apply tile effects
        done = False
        if tile == TileType.GOAL:
            done = True
        elif tile == TileType.TRAP:
            self.hp -= 10
            if self.hp <= 0:
                done = True
        elif tile == TileType.HEAL:
            self.hp = min(self.hp + 10, self.max_hp)

        total_step_reward = step_reward + tile_reward
        self.total_reward += total_step_reward

        return total_step_reward, done, True

    def reset(self, x: int, y: int):
        """Reset the agent to a new position.

        Args:
            x: New x position
            y: New y position
        """
        self.x = x
        self.y = y
        self.hp = self.max_hp
        self.total_reward = 0.0


def random_action() -> Action:
    """Return a random action."""
    import random
    return Action(random.randint(0, 3))
