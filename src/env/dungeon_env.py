"""Gymnasium-compatible dungeon environment."""
import gymnasium as gym
from gymnasium import spaces
import numpy as np
from typing import Optional, Any

from ..core.grid import Grid, load_grid_from_file
from ..core.tiles import TileType
from ..agents.agent import Agent, Action


class DungeonEnv(gym.Env):
    """Dungeon environment following Gymnasium interface.

    Observation:
        Type: Box(2,) or Box(width, height) depending on obs_type
        - "position": [x, y] normalized to [0, 1]
        - "grid": 2D array with tile types

    Actions:
        Type: Discrete(4)
        0: UP
        1: DOWN
        2: LEFT
        3: RIGHT

    Rewards:
        - Step: -0.1
        - Goal: +100
        - Trap: -10
        - Heal: +5
        - Wall bump: -1
    """

    metadata = {"render_modes": ["human", "rgb_array", "ansi"], "render_fps": 30}

    def __init__(
        self,
        dungeon_file: Optional[str] = None,
        grid: Optional[Grid] = None,
        max_steps: int = 200,
        render_mode: Optional[str] = None,
        obs_type: str = "position"
    ):
        """Initialize the environment.

        Args:
            dungeon_file: Path to dungeon file (mutually exclusive with grid)
            grid: Grid object directly (mutually exclusive with dungeon_file)
            max_steps: Maximum steps before truncation
            render_mode: "human", "rgb_array", or "ansi"
            obs_type: "position" for (x, y) or "grid" for full grid observation
        """
        super().__init__()

        # Load or use provided grid
        if dungeon_file is not None:
            self.grid = load_grid_from_file(dungeon_file)
        elif grid is not None:
            self.grid = grid
        else:
            raise ValueError("Either dungeon_file or grid must be provided")

        self.max_steps = max_steps
        self.render_mode = render_mode
        self.obs_type = obs_type

        # Action space: 4 directions
        self.action_space = spaces.Discrete(4)

        # Observation space
        if obs_type == "position":
            # Normalized (x, y) position
            self.observation_space = spaces.Box(
                low=0.0, high=1.0, shape=(2,), dtype=np.float32
            )
        elif obs_type == "grid":
            # Full grid observation (tile type values)
            self.observation_space = spaces.Box(
                low=0, high=len(TileType) - 1,
                shape=(self.grid.height, self.grid.width),
                dtype=np.int32
            )
        else:
            raise ValueError(f"Unknown obs_type: {obs_type}")

        # Find start position
        self.start_pos = self.grid.start_pos
        if self.start_pos is None:
            raise ValueError("Dungeon has no start position!")

        # Initialize agent (will be reset in reset())
        self.agent: Optional[Agent] = None
        self.steps = 0

        # Renderer (lazy init)
        self._renderer = None

    def _get_obs(self) -> np.ndarray:
        """Get current observation."""
        if self.obs_type == "position":
            return np.array([
                self.agent.x / (self.grid.width - 1),
                self.agent.y / (self.grid.height - 1)
            ], dtype=np.float32)
        else:  # grid
            obs = np.zeros((self.grid.height, self.grid.width), dtype=np.int32)
            for y in range(self.grid.height):
                for x in range(self.grid.width):
                    obs[y, x] = self.grid.get_tile(x, y).value
            # Mark agent position (special value)
            obs[self.agent.y, self.agent.x] = -1
            return obs

    def _get_info(self) -> dict[str, Any]:
        """Get additional info."""
        return {
            "position": (self.agent.x, self.agent.y),
            "hp": self.agent.hp,
            "total_reward": self.agent.total_reward,
            "steps": self.steps
        }

    def reset(
        self,
        seed: Optional[int] = None,
        options: Optional[dict] = None
    ) -> tuple[np.ndarray, dict]:
        """Reset the environment.

        Args:
            seed: Random seed (for Gymnasium compatibility)
            options: Additional options (unused)

        Returns:
            observation, info
        """
        super().reset(seed=seed)

        # Create or reset agent
        if self.agent is None:
            self.agent = Agent(self.start_pos[0], self.start_pos[1])
        else:
            self.agent.reset(self.start_pos[0], self.start_pos[1])

        self.steps = 0

        return self._get_obs(), self._get_info()

    def step(self, action: int) -> tuple[np.ndarray, float, bool, bool, dict]:
        """Execute one step.

        Args:
            action: Action to take (0-3)

        Returns:
            observation, reward, terminated, truncated, info
        """
        # Convert int to Action enum
        action_enum = Action(action)

        # Execute action
        reward, terminated, _ = self.agent.move(action_enum, self.grid)
        self.steps += 1

        # Check truncation (max steps)
        truncated = self.steps >= self.max_steps

        return self._get_obs(), reward, terminated, truncated, self._get_info()

    def render(self):
        """Render the environment."""
        if self.render_mode == "ansi":
            return self._render_ansi()
        elif self.render_mode in ("human", "rgb_array"):
            return self._render_pygame()
        return None

    def _render_ansi(self) -> str:
        """Render as ASCII string."""
        lines = []
        for y in range(self.grid.height):
            row = ""
            for x in range(self.grid.width):
                if (x, y) == (self.agent.x, self.agent.y):
                    row += "@"  # Agent
                else:
                    tile = self.grid.get_tile(x, y)
                    from ..core.tiles import tile_to_char
                    row += tile_to_char(tile)
            lines.append(row)
        return "\n".join(lines)

    def _render_pygame(self):
        """Render using Pygame."""
        if self._renderer is None:
            from ..ui.renderer import Renderer
            self._renderer = Renderer(self.grid, "RL Dungeon - Gym Env")

        self._renderer.render_grid()
        self._renderer.set_agent(
            self.agent.x, self.agent.y,
            self.agent.hp, self.agent.max_hp
        )
        self._renderer.render_agent()

        if self.render_mode == "human":
            import pygame
            pygame.display.flip()
            self._renderer.tick(self.metadata["render_fps"])
            return None
        else:  # rgb_array
            import pygame
            return np.transpose(
                pygame.surfarray.array3d(self._renderer.screen),
                axes=(1, 0, 2)
            )

    def close(self):
        """Clean up resources."""
        if self._renderer is not None:
            self._renderer.close()
            self._renderer = None


# Register with Gymnasium
def register_envs():
    """Register dungeon environments with Gymnasium."""
    from gymnasium.envs.registration import register

    # Basic environment with default dungeon
    register(
        id="Dungeon-v0",
        entry_point="src.env.dungeon_env:DungeonEnv",
        kwargs={"dungeon_file": "assets/dungeons/level_01_easy.txt"}
    )

    register(
        id="Dungeon-Trap-v0",
        entry_point="src.env.dungeon_env:DungeonEnv",
        kwargs={"dungeon_file": "assets/dungeons/level_02_trap.txt"}
    )

    register(
        id="Dungeon-Maze-v0",
        entry_point="src.env.dungeon_env:DungeonEnv",
        kwargs={"dungeon_file": "assets/dungeons/level_03_maze.txt"}
    )
