"""Run the dungeon viewer."""
import sys
sys.path.insert(0, '.')

from src.core import load_grid_from_file
from src.ui import run_viewer

if __name__ == "__main__":
    # Load a dungeon
    dungeon_file = "assets/dungeons/level_02_trap.txt"

    if len(sys.argv) > 1:
        dungeon_file = sys.argv[1]

    print(f"Loading dungeon: {dungeon_file}")
    grid = load_grid_from_file(dungeon_file)

    print("Dungeon loaded:")
    print(grid)
    print()
    print("Controls:")
    print("  Arrow keys: Move (when agent is implemented)")
    print("  R: Reset")
    print("  ESC: Quit")
    print()

    run_viewer(grid)
