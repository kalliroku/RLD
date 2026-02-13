/**
 * MultiStageGrid: Virtual Coordinate Stacking
 *
 * Stacks multiple Grid stages vertically into a single virtual coordinate space.
 * Algorithms see it as "one tall grid" — no algorithm changes needed for basic operation.
 * Only addition: tryAdvanceStage() check after result.done in runEpisode/test loops.
 *
 * Virtual layout (3 stages, each 5x5):
 *   y=0..4   → Stage 0
 *   y=5..9   → Stage 1
 *   y=10..14 → Stage 2
 */

import { TileType } from './tiles.js';

export class MultiStageGrid {
    /**
     * @param {Grid[]} stages - Array of Grid objects (one per floor)
     * @param {Object} [rules] - Dungeon rules
     * @param {boolean} [rules.hpCarryOver=true] - Carry HP between stages
     * @param {boolean} [rules.goldOnClear=false] - Bank gold only on full clear
     * @param {Array} [floorVariants] - Per-floor variant arrays (null = fixed, Grid[] = random)
     */
    constructor(stages, rules = {}, floorVariants = null) {
        if (!stages || stages.length === 0) {
            throw new Error('MultiStageGrid requires at least one stage');
        }

        this.stages = stages;
        this.rules = {
            hpCarryOver: rules.hpCarryOver ?? true,
            goldOnClear: rules.goldOnClear ?? false
        };

        // Variant data: floorVariants[i] = null (fixed) or Grid[] (random pool)
        this._floorVariants = floorVariants;

        // All stages must have the same width for clean stacking
        this.width = stages[0].width;

        // Compute y-offsets for each stage
        this._stageOffsets = [];
        this._tiles = [];
        this.currentStage = 0;

        this._buildTiles();
    }

    /**
     * Build/rebuild the _tiles array from current stages
     */
    _buildTiles() {
        this._stageOffsets = [];
        this._tiles = [];

        let yOffset = 0;
        for (let i = 0; i < this.stages.length; i++) {
            this._stageOffsets.push(yOffset);

            // Push references to original stage row arrays
            for (let ly = 0; ly < this.stages[i].height; ly++) {
                // Pad narrower stages with WALL if widths differ
                if (this.stages[i].width < this.width) {
                    const padded = [...this.stages[i].tiles[ly]];
                    while (padded.length < this.width) padded.push(TileType.WALL);
                    this._tiles.push(padded);
                } else {
                    this._tiles.push(this.stages[i].tiles[ly]);
                }
            }

            yOffset += this.stages[i].height;
        }

        this.height = yOffset;
    }

    /**
     * Re-pick random variants for floors that have them.
     * Called at the start of each episode (from startPos getter).
     */
    _resolveVariants() {
        if (!this._floorVariants) return;

        let changed = false;
        for (let i = 0; i < this.stages.length; i++) {
            const variants = this._floorVariants[i];
            if (!variants || variants.length <= 1) continue;

            // Pick a random variant
            const picked = variants[Math.floor(Math.random() * variants.length)];
            this.stages[i] = picked;
            changed = true;
        }

        if (changed) {
            this._buildTiles();
        }
    }

    /**
     * tiles property — algorithms access this.grid.tiles[y][x] directly
     */
    get tiles() {
        return this._tiles;
    }

    /**
     * startPos — reading this resets currentStage to 0 (episode start).
     * Also re-picks random variants if any exist.
     * Called once per episode by all algorithms.
     */
    get startPos() {
        this.currentStage = 0;
        this._resolveVariants();
        const stageStart = this.stages[0].startPos;
        if (!stageStart) return null;
        return {
            x: stageStart.x,
            y: stageStart.y + this._stageOffsets[0]
        };
    }

    /**
     * goalPos — returns current stage's goal in virtual coordinates.
     * Important for Local Q-Learning (getGoalDirection, getGoalDistance).
     */
    get goalPos() {
        const stage = this.stages[this.currentStage];
        const stageGoal = stage.goalPos;
        if (!stageGoal) return null;
        return {
            x: stageGoal.x,
            y: stageGoal.y + this._stageOffsets[this.currentStage]
        };
    }

    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return TileType.WALL;
        }
        const row = this._tiles[y];
        if (!row || x >= row.length) return TileType.WALL;
        return row[x];
    }

    setTile(x, y, tile) {
        if (!this.isValidPosition(x, y)) return;
        this._tiles[y][x] = tile;
    }

    isValidPosition(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    /**
     * Try to advance to next stage after agent reaches current stage's goal.
     * Called by algorithms after result.done = true.
     *
     * @param {Agent} agent - The agent to teleport
     * @returns {boolean} true if advanced (episode continues), false if done (last stage or dead)
     */
    tryAdvanceStage(agent) {
        // Can't advance if dead
        if (!agent.isAlive) return false;

        // Can't advance from last stage
        if (this.currentStage >= this.stages.length - 1) return false;

        // Verify agent is at current stage's goal
        const goal = this.goalPos;
        if (!goal || agent.x !== goal.x || agent.y !== goal.y) return false;

        // Advance to next stage
        this.currentStage++;
        const nextStart = this.stages[this.currentStage].startPos;
        if (!nextStart) return false;

        const yOffset = this._stageOffsets[this.currentStage];
        agent.x = nextStart.x;
        agent.y = yOffset + nextStart.y;

        // HP carry-over: if disabled, reset HP
        if (!this.rules.hpCarryOver) {
            agent.hp = agent.maxHp;
        }

        return true;
    }

    /**
     * Current stage index (0-based)
     */
    getCurrentStageIndex() {
        return this.currentStage;
    }

    /**
     * Total number of stages
     */
    getTotalStages() {
        return this.stages.length;
    }

    /**
     * Suggested max steps for multi-stage (scales with number of stages)
     */
    get suggestedMaxSteps() {
        return 200 * this.stages.length;
    }

    /**
     * Get the y-offset for a specific stage
     */
    getStageOffset(stageIndex) {
        return this._stageOffsets[stageIndex] || 0;
    }

    /**
     * Determine which stage a virtual y-coordinate belongs to
     */
    getStageAt(y) {
        for (let i = this.stages.length - 1; i >= 0; i--) {
            if (y >= this._stageOffsets[i]) return i;
        }
        return 0;
    }
}
