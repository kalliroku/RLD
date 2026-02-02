"""Train an agent using Q-Learning and visualize results."""
import sys
import time
import numpy as np
import matplotlib.pyplot as plt
sys.path.insert(0, '.')

from src.core import load_grid_from_file
from src.algorithms import QLearning


def plot_training(rewards: list, steps: list, window: int = 50):
    """Plot training progress."""
    fig, axes = plt.subplots(2, 1, figsize=(10, 8))

    episodes = range(len(rewards))

    # Reward plot
    ax1 = axes[0]
    ax1.plot(episodes, rewards, alpha=0.3, color='blue', label='Episode Reward')

    # Moving average
    if len(rewards) >= window:
        moving_avg = np.convolve(rewards, np.ones(window)/window, mode='valid')
        ax1.plot(range(window-1, len(rewards)), moving_avg, color='red',
                linewidth=2, label=f'{window}-Episode Average')

    ax1.axhline(y=0, color='gray', linestyle='--', alpha=0.5)
    ax1.set_xlabel('Episode')
    ax1.set_ylabel('Total Reward')
    ax1.set_title('Training Rewards')
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    # Steps plot
    ax2 = axes[1]
    ax2.plot(episodes, steps, alpha=0.3, color='green', label='Episode Steps')

    if len(steps) >= window:
        moving_avg = np.convolve(steps, np.ones(window)/window, mode='valid')
        ax2.plot(range(window-1, len(steps)), moving_avg, color='orange',
                linewidth=2, label=f'{window}-Episode Average')

    ax2.set_xlabel('Episode')
    ax2.set_ylabel('Steps')
    ax2.set_title('Episode Length')
    ax2.legend()
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig('training_progress.png', dpi=100)
    print("Saved training_progress.png")
    plt.show()


def plot_q_values(ql: QLearning):
    """Plot Q-value heatmap."""
    values = ql.get_value_grid()

    fig, ax = plt.subplots(figsize=(8, 8))

    im = ax.imshow(values, cmap='RdYlGn', aspect='equal')
    plt.colorbar(im, ax=ax, label='Max Q-Value')

    # Add policy arrows
    arrows = {0: (0, -0.3), 1: (0, 0.3), 2: (-0.3, 0), 3: (0.3, 0)}  # UP, DOWN, LEFT, RIGHT

    for y in range(ql.grid.height):
        for x in range(ql.grid.width):
            tile = ql.grid.get_tile(x, y)
            if tile.name == 'Wall':
                ax.add_patch(plt.Rectangle((x-0.5, y-0.5), 1, 1, color='black'))
            elif tile.name == 'Goal':
                ax.add_patch(plt.Rectangle((x-0.5, y-0.5), 1, 1, color='green', alpha=0.5))
                ax.text(x, y, 'G', ha='center', va='center', fontsize=12, fontweight='bold')
            elif tile.name == 'Start':
                ax.text(x, y, 'S', ha='center', va='center', fontsize=10, color='blue')
                best = ql.get_best_action(x, y)
                dx, dy = arrows[best.value]
                ax.arrow(x, y, dx, dy, head_width=0.15, head_length=0.1, fc='blue', ec='blue')
            else:
                best = ql.get_best_action(x, y)
                dx, dy = arrows[best.value]
                ax.arrow(x, y, dx, dy, head_width=0.15, head_length=0.1, fc='black', ec='black')

    ax.set_xticks(range(ql.grid.width))
    ax.set_yticks(range(ql.grid.height))
    ax.set_title('Learned Q-Values and Policy')
    ax.grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig('q_values.png', dpi=100)
    print("Saved q_values.png")
    plt.show()


def run_demo(ql: QLearning, delay: float = 0.3):
    """Run a visual demo of the trained agent using Pygame."""
    import pygame
    from src.ui.renderer import Renderer
    from src.agents import Agent

    renderer = Renderer(ql.grid, "RL Dungeon - Trained Agent Demo")

    # Resize for UI
    ui_height = 60
    new_height = renderer.window_height + ui_height
    renderer.screen = pygame.display.set_mode((renderer.window_width, new_height))

    font = pygame.font.Font(None, 28)

    start = ql.grid.start_pos
    agent = Agent(start[0], start[1])

    running = True
    step = 0
    total_reward = 0.0
    done = False
    auto_play = True

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key == pygame.K_SPACE:
                    auto_play = not auto_play
                elif event.key == pygame.K_r:
                    agent.reset(start[0], start[1])
                    step = 0
                    total_reward = 0.0
                    done = False

        # Auto-play step
        if auto_play and not done:
            action = ql.get_best_action(agent.x, agent.y)
            reward, done, _ = agent.move(action, ql.grid)
            total_reward += reward
            step += 1
            time.sleep(delay)

        # Render
        renderer.screen.fill((0, 0, 0))
        renderer.render_grid()
        renderer.set_agent(agent.x, agent.y, agent.hp, agent.max_hp)
        renderer.render_agent()

        # UI
        ui_rect = pygame.Rect(0, renderer.window_height - ui_height + 60, renderer.window_width, ui_height)
        pygame.draw.rect(renderer.screen, (30, 30, 40), ui_rect)

        status = "GOAL!" if done and total_reward > 50 else ("FAILED" if done else "Running...")
        color = (100, 255, 100) if "GOAL" in status else ((255, 100, 100) if "FAIL" in status else (255, 255, 255))

        text = font.render(f"Step: {step} | Reward: {total_reward:.1f} | {status} | [SPACE: pause] [R: reset]",
                          True, color)
        renderer.screen.blit(text, (10, renderer.window_height - ui_height + 70))

        pygame.display.flip()
        renderer.tick(60)

    renderer.close()


if __name__ == "__main__":
    dungeon_file = "assets/dungeons/level_01_easy.txt"
    n_episodes = 500

    if len(sys.argv) > 1:
        dungeon_file = sys.argv[1]
    if len(sys.argv) > 2:
        n_episodes = int(sys.argv[2])

    print(f"Loading dungeon: {dungeon_file}")
    grid = load_grid_from_file(dungeon_file)
    print(grid)
    print()

    print("=" * 50)
    print("Q-LEARNING TRAINING")
    print("=" * 50)
    print(f"Episodes: {n_episodes}")
    print(f"Grid size: {grid.width}x{grid.height}")
    print(f"States: {grid.width * grid.height}")
    print(f"Actions: 4 (UP, DOWN, LEFT, RIGHT)")
    print()

    # Create Q-Learning agent
    ql = QLearning(
        grid,
        alpha=0.1,          # Learning rate
        gamma=0.99,         # Discount factor
        epsilon=1.0,        # Start with full exploration
        epsilon_min=0.01,   # Minimum exploration
        epsilon_decay=0.995 # Decay rate
    )

    # Train
    print("Training started...")
    start_time = time.time()
    stats = ql.train(n_episodes=n_episodes, max_steps=200, verbose=True)
    elapsed = time.time() - start_time
    print(f"\nTraining completed in {elapsed:.1f} seconds")
    print()

    # Test
    print("=" * 50)
    print("TESTING (100 episodes, no exploration)")
    print("=" * 50)
    test_stats = ql.test(n_episodes=100)
    print(f"Success Rate: {test_stats['success_rate']:.1%}")
    print(f"Mean Reward: {test_stats['mean_reward']:.1f} (+/- {test_stats['std_reward']:.1f})")
    print(f"Mean Steps: {test_stats['mean_steps']:.1f}")
    print()

    # Print policy
    print("=" * 50)
    print("LEARNED POLICY")
    print("=" * 50)
    ql.print_policy()
    print()

    # Plot training progress
    print("Plotting training progress...")
    plot_training(stats['episode_rewards'], stats['episode_steps'])

    # Plot Q-values
    print("Plotting Q-values...")
    plot_q_values(ql)

    # Run visual demo
    print("\nStarting visual demo...")
    print("[SPACE] to pause/resume, [R] to reset, [ESC] to quit")
    run_demo(ql, delay=0.3)
