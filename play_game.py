"""Play the dungeon game with keyboard controls."""
import sys
import pygame
sys.path.insert(0, '.')

from src.core import load_grid_from_file, TileType
from src.agents import Agent, Action
from src.ui.renderer import Renderer, TILE_SIZE


class Game:
    """Main game class with keyboard controls."""

    def __init__(self, dungeon_file: str):
        self.grid = load_grid_from_file(dungeon_file)
        self.renderer = Renderer(self.grid, "RL Dungeon - Play Mode")

        # Initialize agent at start position
        start = self.grid.start_pos
        if start is None:
            raise ValueError("Dungeon has no start position!")
        self.agent = Agent(start[0], start[1])

        # Game state
        self.steps = 0
        self.done = False
        self.message = ""
        self.message_timer = 0

        # Font for UI
        self.font = pygame.font.Font(None, 28)
        self.small_font = pygame.font.Font(None, 22)

    def reset(self):
        """Reset the game."""
        start = self.grid.start_pos
        self.agent.reset(start[0], start[1])
        self.steps = 0
        self.done = False
        self.message = "Game Reset!"
        self.message_timer = 60

    def handle_action(self, action: Action):
        """Handle an action from the player."""
        if self.done:
            return

        reward, done, success = self.agent.move(action, self.grid)
        self.steps += 1

        # Set message based on result
        tile = self.grid.get_tile(self.agent.x, self.agent.y)
        if done:
            if tile == TileType.GOAL:
                self.message = f"GOAL! Total reward: {self.agent.total_reward:.1f}"
            else:
                self.message = f"DIED! Total reward: {self.agent.total_reward:.1f}"
            self.done = True
        elif not success:
            self.message = "Bump! (-1)"
        elif tile == TileType.TRAP:
            self.message = f"TRAP! HP -{10}, Reward: {reward:.1f}"
        elif tile == TileType.HEAL:
            self.message = f"Healed! HP +{10}"
        else:
            self.message = f"Step {self.steps}, Reward: {reward:.1f}"

        self.message_timer = 90

    def render_ui(self):
        """Render the game UI."""
        screen = self.renderer.screen

        # UI background at bottom
        ui_height = 80
        ui_rect = pygame.Rect(0, self.renderer.window_height,
                             self.renderer.window_width, ui_height)
        pygame.draw.rect(screen, (30, 30, 40), ui_rect)

        # Stats
        y_offset = self.renderer.window_height + 10

        # HP
        hp_text = self.font.render(f"HP: {self.agent.hp}/{self.agent.max_hp}", True, (255, 255, 255))
        screen.blit(hp_text, (10, y_offset))

        # Steps
        steps_text = self.font.render(f"Steps: {self.steps}", True, (255, 255, 255))
        screen.blit(steps_text, (150, y_offset))

        # Total reward
        reward_color = (100, 255, 100) if self.agent.total_reward >= 0 else (255, 100, 100)
        reward_text = self.font.render(f"Reward: {self.agent.total_reward:.1f}", True, reward_color)
        screen.blit(reward_text, (280, y_offset))

        # Message
        if self.message_timer > 0:
            msg_color = (255, 255, 100) if not self.done else (100, 255, 255)
            msg_text = self.font.render(self.message, True, msg_color)
            screen.blit(msg_text, (10, y_offset + 30))
            self.message_timer -= 1

        # Controls hint
        hint = "[Arrows: Move] [R: Reset] [ESC: Quit]"
        hint_text = self.small_font.render(hint, True, (150, 150, 150))
        screen.blit(hint_text, (10, y_offset + 55))

    def run(self):
        """Main game loop."""
        # Resize window to include UI
        ui_height = 80
        new_height = self.renderer.window_height + ui_height
        self.renderer.screen = pygame.display.set_mode(
            (self.renderer.window_width, new_height)
        )

        running = True
        while running:
            # Handle events
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        running = False
                    elif event.key == pygame.K_r:
                        self.reset()
                    elif event.key == pygame.K_UP:
                        self.handle_action(Action.UP)
                    elif event.key == pygame.K_DOWN:
                        self.handle_action(Action.DOWN)
                    elif event.key == pygame.K_LEFT:
                        self.handle_action(Action.LEFT)
                    elif event.key == pygame.K_RIGHT:
                        self.handle_action(Action.RIGHT)

            # Render
            self.renderer.screen.fill((0, 0, 0))
            self.renderer.render_grid()

            # Update renderer with agent position
            self.renderer.set_agent(self.agent.x, self.agent.y,
                                   self.agent.hp, self.agent.max_hp)
            self.renderer.render_agent()

            # Render UI
            self.render_ui()

            # Update display
            self.renderer.render_fps()
            pygame.display.flip()
            self.renderer.tick(60)

        self.renderer.close()


if __name__ == "__main__":
    dungeon_file = "assets/dungeons/level_02_trap.txt"

    if len(sys.argv) > 1:
        dungeon_file = sys.argv[1]

    print(f"Loading: {dungeon_file}")
    print()
    print("=== RL Dungeon ===")
    print("Arrow keys: Move")
    print("R: Reset")
    print("ESC: Quit")
    print()
    print("Try to reach the green GOAL!")
    print("Avoid red TRAPs, use pink HEAL spots.")
    print()

    game = Game(dungeon_file)
    game.run()
