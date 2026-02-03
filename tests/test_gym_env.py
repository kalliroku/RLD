"""Test Gymnasium environment compatibility."""
import sys
sys.path.insert(0, '.')

import numpy as np
import pytest
from gymnasium.utils.env_checker import check_env

from src.env import DungeonEnv


class TestDungeonEnv:
    """Test suite for DungeonEnv."""

    @pytest.fixture
    def env(self):
        """Create a test environment."""
        return DungeonEnv(dungeon_file="assets/dungeons/level_01_easy.txt")

    @pytest.fixture
    def env_grid_obs(self):
        """Create environment with grid observation."""
        return DungeonEnv(
            dungeon_file="assets/dungeons/level_01_easy.txt",
            obs_type="grid"
        )

    def test_gymnasium_compatibility(self, env):
        """Test that environment passes Gymnasium's env_checker."""
        # This will raise if environment doesn't follow Gymnasium API
        check_env(env, skip_render_check=True)

    def test_reset_returns_correct_types(self, env):
        """Test reset returns observation and info."""
        obs, info = env.reset()

        assert isinstance(obs, np.ndarray)
        assert obs.dtype == np.float32
        assert obs.shape == (2,)
        assert isinstance(info, dict)
        assert "position" in info
        assert "hp" in info

    def test_step_returns_correct_types(self, env):
        """Test step returns correct tuple."""
        env.reset()
        obs, reward, terminated, truncated, info = env.step(0)

        assert isinstance(obs, np.ndarray)
        assert isinstance(reward, (int, float))
        assert isinstance(terminated, bool)
        assert isinstance(truncated, bool)
        assert isinstance(info, dict)

    def test_action_space(self, env):
        """Test action space is Discrete(4)."""
        assert env.action_space.n == 4

    def test_observation_space_position(self, env):
        """Test observation space for position mode."""
        assert env.observation_space.shape == (2,)
        assert env.observation_space.low[0] == 0.0
        assert env.observation_space.high[0] == 1.0

    def test_observation_space_grid(self, env_grid_obs):
        """Test observation space for grid mode."""
        assert len(env_grid_obs.observation_space.shape) == 2
        # Grid should match dungeon size
        assert env_grid_obs.observation_space.shape[0] == env_grid_obs.grid.height
        assert env_grid_obs.observation_space.shape[1] == env_grid_obs.grid.width

    def test_reset_seed(self, env):
        """Test that reset accepts seed."""
        obs1, _ = env.reset(seed=42)
        obs2, _ = env.reset(seed=42)

        # Position should be same (deterministic start)
        np.testing.assert_array_equal(obs1, obs2)

    def test_truncation_at_max_steps(self):
        """Test that episode truncates at max_steps."""
        env = DungeonEnv(
            dungeon_file="assets/dungeons/level_01_easy.txt",
            max_steps=5
        )
        env.reset()

        for i in range(5):
            _, _, terminated, truncated, _ = env.step(0)  # Keep going UP (into wall)
            if i < 4:
                assert not truncated
            else:
                assert truncated

        env.close()

    def test_goal_terminates(self, env):
        """Test that reaching goal terminates episode."""
        env.reset()

        # Navigate to goal in level_01_easy (simple path)
        # Start at (1,1), Goal at (3,3)
        # Go DOWN twice, RIGHT twice
        actions = [1, 1, 3, 3]  # DOWN, DOWN, RIGHT, RIGHT

        terminated = False
        for action in actions:
            _, reward, terminated, _, info = env.step(action)
            if terminated:
                break

        assert terminated
        assert info["position"] == env.grid.goal_pos

    def test_render_ansi(self):
        """Test ANSI rendering."""
        env = DungeonEnv(
            dungeon_file="assets/dungeons/level_01_easy.txt",
            render_mode="ansi"
        )
        env.reset()

        output = env.render()
        assert isinstance(output, str)
        assert "@" in output  # Agent marker
        assert "#" in output  # Wall
        env.close()


def test_all_dungeons_load():
    """Test that all sample dungeons can be loaded."""
    dungeons = [
        "assets/dungeons/level_01_easy.txt",
        "assets/dungeons/level_02_trap.txt",
        "assets/dungeons/level_03_maze.txt"
    ]

    for dungeon in dungeons:
        env = DungeonEnv(dungeon_file=dungeon)
        obs, info = env.reset()
        assert obs is not None
        assert info["hp"] == 100
        env.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
