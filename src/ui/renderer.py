"""Pygame renderer for the dungeon grid."""
import pygame
from ..core.grid import Grid
from ..core.tiles import TileType

# Tile size in pixels
TILE_SIZE = 48

# Colors (RGB)
COLORS = {
    TileType.EMPTY: (240, 240, 240),   # Light gray
    TileType.WALL: (40, 40, 40),        # Dark gray
    TileType.START: (100, 150, 255),    # Blue
    TileType.GOAL: (100, 255, 100),     # Green
    TileType.TRAP: (255, 100, 100),     # Red
    TileType.HEAL: (255, 180, 200),     # Pink
}

# Agent color
AGENT_COLOR = (255, 220, 50)  # Yellow
AGENT_OUTLINE = (200, 150, 0)  # Dark yellow


class Renderer:
    """Pygame-based renderer for the dungeon."""

    def __init__(self, grid: Grid, title: str = "RL Dungeon"):
        """Initialize the renderer.

        Args:
            grid: The grid to render
            title: Window title
        """
        self.grid = grid
        self.title = title

        # Calculate window size
        self.window_width = grid.width * TILE_SIZE
        self.window_height = grid.height * TILE_SIZE

        # Initialize Pygame
        pygame.init()
        self.screen = pygame.display.set_mode((self.window_width, self.window_height))
        pygame.display.set_caption(title)

        self.clock = pygame.time.Clock()
        self.font = pygame.font.Font(None, 24)

        # Agent position (can be set externally)
        self.agent_pos: tuple[int, int] | None = None
        self.agent_hp: int = 100
        self.agent_max_hp: int = 100

    def set_agent(self, x: int, y: int, hp: int = 100, max_hp: int = 100):
        """Set the agent position and stats."""
        self.agent_pos = (x, y)
        self.agent_hp = hp
        self.agent_max_hp = max_hp

    def render_grid(self):
        """Render the grid tiles."""
        for y in range(self.grid.height):
            for x in range(self.grid.width):
                tile = self.grid.get_tile(x, y)
                color = COLORS.get(tile, (128, 128, 128))

                rect = pygame.Rect(
                    x * TILE_SIZE,
                    y * TILE_SIZE,
                    TILE_SIZE,
                    TILE_SIZE
                )

                # Fill tile
                pygame.draw.rect(self.screen, color, rect)

                # Draw grid lines
                pygame.draw.rect(self.screen, (200, 200, 200), rect, 1)

    def render_agent(self):
        """Render the agent as a circle."""
        if self.agent_pos is None:
            return

        x, y = self.agent_pos
        center_x = x * TILE_SIZE + TILE_SIZE // 2
        center_y = y * TILE_SIZE + TILE_SIZE // 2
        radius = TILE_SIZE // 3

        # Draw agent circle
        pygame.draw.circle(self.screen, AGENT_COLOR, (center_x, center_y), radius)
        pygame.draw.circle(self.screen, AGENT_OUTLINE, (center_x, center_y), radius, 2)

        # Draw HP bar
        bar_width = TILE_SIZE - 8
        bar_height = 6
        bar_x = x * TILE_SIZE + 4
        bar_y = y * TILE_SIZE + 4

        # Background (red)
        pygame.draw.rect(self.screen, (200, 50, 50),
                        (bar_x, bar_y, bar_width, bar_height))

        # Health (green)
        hp_ratio = self.agent_hp / self.agent_max_hp
        pygame.draw.rect(self.screen, (50, 200, 50),
                        (bar_x, bar_y, int(bar_width * hp_ratio), bar_height))

        # Border
        pygame.draw.rect(self.screen, (0, 0, 0),
                        (bar_x, bar_y, bar_width, bar_height), 1)

    def render_fps(self):
        """Render FPS in window title."""
        fps = int(self.clock.get_fps())
        pygame.display.set_caption(f"{self.title} - FPS: {fps}")

    def render(self):
        """Render the complete scene."""
        self.screen.fill((0, 0, 0))
        self.render_grid()
        self.render_agent()
        self.render_fps()
        pygame.display.flip()

    def handle_events(self) -> tuple[bool, int | None]:
        """Handle Pygame events.

        Returns:
            Tuple of (running, action)
            - running: False if window closed
            - action: 0=UP, 1=DOWN, 2=LEFT, 3=RIGHT, None=no action
        """
        action = None
        running = True

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_UP:
                    action = 0
                elif event.key == pygame.K_DOWN:
                    action = 1
                elif event.key == pygame.K_LEFT:
                    action = 2
                elif event.key == pygame.K_RIGHT:
                    action = 3
                elif event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key == pygame.K_r:
                    action = -1  # Reset signal

        return running, action

    def tick(self, fps: int = 60):
        """Limit frame rate."""
        self.clock.tick(fps)

    def close(self):
        """Close the renderer."""
        pygame.quit()


def run_viewer(grid: Grid):
    """Run a simple grid viewer.

    Args:
        grid: The grid to display
    """
    renderer = Renderer(grid)

    # Place agent at start position
    if grid.start_pos:
        renderer.set_agent(*grid.start_pos)

    running = True
    while running:
        running, _ = renderer.handle_events()
        renderer.render()
        renderer.tick(60)

    renderer.close()
