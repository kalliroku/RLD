"""Q-Learning algorithm implementation."""
import numpy as np
import random
from typing import Callable
from ..core.grid import Grid
from ..core.tiles import TileType
from ..agents.agent import Agent, Action, ACTION_DELTAS


class QLearning:
    """Q-Learning algorithm for grid world navigation."""

    def __init__(
        self,
        grid: Grid,
        alpha: float = 0.1,      # Learning rate
        gamma: float = 0.99,     # Discount factor
        epsilon: float = 1.0,    # Initial exploration rate
        epsilon_min: float = 0.01,
        epsilon_decay: float = 0.995,
    ):
        """Initialize Q-Learning.

        Args:
            grid: The grid environment
            alpha: Learning rate (how much to update Q values)
            gamma: Discount factor (importance of future rewards)
            epsilon: Exploration rate (probability of random action)
            epsilon_min: Minimum epsilon value
            epsilon_decay: Epsilon decay per episode
        """
        self.grid = grid
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon
        self.epsilon_min = epsilon_min
        self.epsilon_decay = epsilon_decay

        # Initialize Q-table: (height * width) states × 4 actions
        self.n_states = grid.height * grid.width
        self.n_actions = 4
        self.q_table = np.zeros((self.n_states, self.n_actions))

        # Training statistics
        self.episode_rewards: list[float] = []
        self.episode_steps: list[int] = []

    def state_to_index(self, x: int, y: int) -> int:
        """Convert (x, y) position to state index."""
        return y * self.grid.width + x

    def index_to_state(self, index: int) -> tuple[int, int]:
        """Convert state index to (x, y) position."""
        y = index // self.grid.width
        x = index % self.grid.width
        return (x, y)

    def get_q_value(self, x: int, y: int, action: Action) -> float:
        """Get Q value for a state-action pair."""
        state_idx = self.state_to_index(x, y)
        return self.q_table[state_idx, action.value]

    def get_q_values(self, x: int, y: int) -> np.ndarray:
        """Get all Q values for a state."""
        state_idx = self.state_to_index(x, y)
        return self.q_table[state_idx].copy()

    def get_best_action(self, x: int, y: int) -> Action:
        """Get the best action for a state (greedy)."""
        q_values = self.get_q_values(x, y)
        return Action(np.argmax(q_values))

    def get_max_q(self, x: int, y: int) -> float:
        """Get the maximum Q value for a state."""
        return np.max(self.get_q_values(x, y))

    def select_action(self, x: int, y: int) -> Action:
        """Select action using epsilon-greedy policy."""
        if random.random() < self.epsilon:
            return Action(random.randint(0, 3))
        else:
            return self.get_best_action(x, y)

    def update(
        self,
        x: int, y: int,
        action: Action,
        reward: float,
        next_x: int, next_y: int,
        done: bool
    ):
        """Update Q value using Q-Learning update rule.

        Q(s,a) <- Q(s,a) + alpha * [r + gamma * max(Q(s',a')) - Q(s,a)]
        """
        state_idx = self.state_to_index(x, y)
        current_q = self.q_table[state_idx, action.value]

        if done:
            target = reward
        else:
            next_max_q = self.get_max_q(next_x, next_y)
            target = reward + self.gamma * next_max_q

        # Q-Learning update
        self.q_table[state_idx, action.value] += self.alpha * (target - current_q)

    def decay_epsilon(self):
        """Decay epsilon after each episode."""
        self.epsilon = max(self.epsilon_min, self.epsilon * self.epsilon_decay)

    def run_episode(
        self,
        max_steps: int = 200,
        train: bool = True,
        callback: Callable[[Agent, Action, float], None] | None = None
    ) -> tuple[float, int, bool]:
        """Run a single episode.

        Args:
            max_steps: Maximum steps per episode
            train: Whether to update Q values
            callback: Optional callback(agent, action, reward) for visualization

        Returns:
            Tuple of (total_reward, steps, success)
        """
        # Initialize agent at start
        start = self.grid.start_pos
        if start is None:
            raise ValueError("Grid has no start position")

        agent = Agent(start[0], start[1])

        total_reward = 0.0
        steps = 0
        success = False

        for step in range(max_steps):
            # Current state
            x, y = agent.x, agent.y

            # Select action
            if train:
                action = self.select_action(x, y)
            else:
                action = self.get_best_action(x, y)

            # Execute action
            reward, done, _ = agent.move(action, self.grid)
            total_reward += reward
            steps += 1

            # Callback for visualization
            if callback:
                callback(agent, action, reward)

            # Update Q-table
            if train:
                self.update(x, y, action, reward, agent.x, agent.y, done)

            if done:
                # Check if success (reached goal)
                if self.grid.get_tile(agent.x, agent.y) == TileType.GOAL:
                    success = True
                break

        return total_reward, steps, success

    def train(
        self,
        n_episodes: int = 1000,
        max_steps: int = 200,
        verbose: bool = True,
        callback: Callable[[int, float, int, bool], None] | None = None
    ) -> dict:
        """Train the agent for multiple episodes.

        Args:
            n_episodes: Number of episodes to train
            max_steps: Maximum steps per episode
            verbose: Print progress
            callback: Optional callback(episode, reward, steps, success)

        Returns:
            Training statistics
        """
        self.episode_rewards = []
        self.episode_steps = []
        successes = 0

        for episode in range(n_episodes):
            reward, steps, success = self.run_episode(max_steps, train=True)

            self.episode_rewards.append(reward)
            self.episode_steps.append(steps)
            if success:
                successes += 1

            # Decay epsilon
            self.decay_epsilon()

            # Callback
            if callback:
                callback(episode, reward, steps, success)

            # Progress report
            if verbose and (episode + 1) % 100 == 0:
                avg_reward = np.mean(self.episode_rewards[-100:])
                avg_steps = np.mean(self.episode_steps[-100:])
                recent_success = sum(1 for i in range(-100, 0) if i + len(self.episode_rewards) >= 0 and
                                    self.episode_rewards[i] > 50) / min(100, episode + 1)
                print(f"Episode {episode + 1}/{n_episodes} | "
                      f"Avg Reward: {avg_reward:.1f} | "
                      f"Avg Steps: {avg_steps:.1f} | "
                      f"Epsilon: {self.epsilon:.3f} | "
                      f"Success Rate: {recent_success:.1%}")

        return {
            'episode_rewards': self.episode_rewards,
            'episode_steps': self.episode_steps,
            'total_successes': successes,
            'final_epsilon': self.epsilon,
        }

    def test(self, n_episodes: int = 100, max_steps: int = 200) -> dict:
        """Test the trained agent (no exploration, no learning).

        Returns:
            Test statistics
        """
        rewards = []
        steps_list = []
        successes = 0

        for _ in range(n_episodes):
            reward, steps, success = self.run_episode(max_steps, train=False)
            rewards.append(reward)
            steps_list.append(steps)
            if success:
                successes += 1

        return {
            'mean_reward': np.mean(rewards),
            'std_reward': np.std(rewards),
            'mean_steps': np.mean(steps_list),
            'success_rate': successes / n_episodes,
        }

    def get_policy_grid(self) -> list[list[str]]:
        """Get the learned policy as a grid of arrows."""
        arrows = {
            Action.UP: '^',
            Action.DOWN: 'v',
            Action.LEFT: '<',
            Action.RIGHT: '>',
        }

        policy = []
        for y in range(self.grid.height):
            row = []
            for x in range(self.grid.width):
                tile = self.grid.get_tile(x, y)
                if tile in (TileType.WALL, TileType.GOAL):
                    row.append('#' if tile == TileType.WALL else 'G')
                else:
                    best_action = self.get_best_action(x, y)
                    row.append(arrows[best_action])
            policy.append(row)

        return policy

    def print_policy(self):
        """Print the learned policy."""
        policy = self.get_policy_grid()
        print("Learned Policy:")
        for row in policy:
            print(' '.join(row))

    def get_value_grid(self) -> np.ndarray:
        """Get the state values (max Q) as a 2D grid."""
        values = np.zeros((self.grid.height, self.grid.width))
        for y in range(self.grid.height):
            for x in range(self.grid.width):
                values[y, x] = self.get_max_q(x, y)
        return values
