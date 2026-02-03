"""Demo script for Gymnasium environment."""
import sys
sys.path.insert(0, '.')

from src.env import DungeonEnv


def demo_basic():
    """Basic usage of DungeonEnv."""
    print("=" * 50)
    print("BASIC GYMNASIUM ENV DEMO")
    print("=" * 50)

    # Create environment
    env = DungeonEnv(
        dungeon_file="assets/dungeons/level_01_easy.txt",
        render_mode="ansi"
    )

    # Reset
    obs, info = env.reset()
    print(f"\nInitial observation: {obs}")
    print(f"Info: {info}")
    print(f"\nAction space: {env.action_space}")
    print(f"Observation space: {env.observation_space}")

    # Show initial state
    print("\nInitial state:")
    print(env.render())

    # Run a few steps
    print("\n--- Running episode ---")
    actions = [1, 1, 3, 3]  # DOWN, DOWN, RIGHT, RIGHT (to goal)
    action_names = ["UP", "DOWN", "LEFT", "RIGHT"]

    for action in actions:
        obs, reward, terminated, truncated, info = env.step(action)
        print(f"\nAction: {action_names[action]}")
        print(f"Reward: {reward:.1f}, Terminated: {terminated}, Truncated: {truncated}")
        print(env.render())

        if terminated or truncated:
            break

    print(f"\nFinal info: {info}")
    env.close()


def demo_random_agent():
    """Run a random agent for one episode."""
    print("\n" + "=" * 50)
    print("RANDOM AGENT DEMO")
    print("=" * 50)

    env = DungeonEnv(
        dungeon_file="assets/dungeons/level_02_trap.txt",
        max_steps=50
    )

    obs, info = env.reset()
    total_reward = 0
    steps = 0

    while True:
        action = env.action_space.sample()  # Random action
        obs, reward, terminated, truncated, info = env.step(action)
        total_reward += reward
        steps += 1

        if terminated or truncated:
            break

    status = "GOAL" if info["hp"] > 0 and terminated else ("DIED" if info["hp"] <= 0 else "TIMEOUT")
    print(f"Episode finished: {status}")
    print(f"Steps: {steps}, Total reward: {total_reward:.1f}, HP: {info['hp']}")
    env.close()


def demo_multiple_episodes():
    """Run multiple episodes and collect stats."""
    print("\n" + "=" * 50)
    print("MULTIPLE EPISODES DEMO (100 episodes)")
    print("=" * 50)

    env = DungeonEnv(
        dungeon_file="assets/dungeons/level_01_easy.txt",
        max_steps=100
    )

    successes = 0
    total_rewards = []
    total_steps = []

    for episode in range(100):
        obs, info = env.reset()
        episode_reward = 0
        steps = 0

        while True:
            action = env.action_space.sample()
            obs, reward, terminated, truncated, info = env.step(action)
            episode_reward += reward
            steps += 1

            if terminated or truncated:
                break

        total_rewards.append(episode_reward)
        total_steps.append(steps)

        if terminated and info["hp"] > 0:
            successes += 1

    env.close()

    import numpy as np
    print(f"Success rate: {successes}%")
    print(f"Mean reward: {np.mean(total_rewards):.1f} (+/- {np.std(total_rewards):.1f})")
    print(f"Mean steps: {np.mean(total_steps):.1f}")


def demo_gymnasium_make():
    """Demo using gymnasium.make() with registered envs."""
    print("\n" + "=" * 50)
    print("GYMNASIUM.MAKE() DEMO")
    print("=" * 50)

    # Register environments
    from src.env import register_envs
    register_envs()

    import gymnasium as gym

    # Now we can use gym.make()
    env = gym.make("Dungeon-v0")
    print(f"Created: {env}")
    print(f"Action space: {env.action_space}")
    print(f"Observation space: {env.observation_space}")

    obs, info = env.reset()
    print(f"Reset observation shape: {obs.shape}")

    env.close()
    print("Environment closed successfully!")


if __name__ == "__main__":
    demo_basic()
    demo_random_agent()
    demo_multiple_episodes()
    demo_gymnasium_make()

    print("\n" + "=" * 50)
    print("ALL DEMOS COMPLETED!")
    print("=" * 50)
