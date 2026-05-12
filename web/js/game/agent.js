/**
 * Agent (Adventurer) for the dungeon
 */

import { TileType, isPassable, getReward, isLethal, getTileDamage } from './tiles.js';

export const Action = {
    UP: 0,
    DOWN: 1,
    LEFT: 2,
    RIGHT: 3
};

export const ActionNames = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

export const ActionDeltas = {
    [Action.UP]: { dx: 0, dy: -1 },
    [Action.DOWN]: { dx: 0, dy: 1 },
    [Action.LEFT]: { dx: -1, dy: 0 },
    [Action.RIGHT]: { dx: 1, dy: 0 }
};

export class Agent {
    constructor(x, y, hp = 100, maxHp = 100) {
        this.x = x;
        this.y = y;
        this.hp = hp;
        this.maxHp = maxHp;
        this.totalReward = 0;
        this.turnCount = 0;
        this.actionHistory = [];
        this.visitHistory = new Map(); // "x,y" -> last visit turn
        // T2B-2: optional ModifierSet (slippery / heavy_fog). Set by main.js.
        this.modifierSet = null;
        // T2B-2: heavy_fog reduces this; default 5 reproduces legacy decay 1.0/0.8/0.6/0.4/0.2.
        this.visibilityRange = 5;
        this._recordVisit();
    }

    _recordVisit() {
        const key = `${this.x},${this.y}`;
        this.visitHistory.set(key, this.turnCount);
    }

    getVisibility(x, y) {
        // Returns opacity (0-1) based on how recently the cell was visited.
        const key = `${x},${y}`;
        if (!this.visitHistory.has(key)) {
            return 0; // Never visited - fog
        }
        const lastVisit = this.visitHistory.get(key);
        const turnsSince = this.turnCount - lastVisit;
        const range = this.visibilityRange || 5;
        if (turnsSince >= range) return 0;
        // Linear decay; at range=5 yields 1.0/0.8/0.6/0.4/0.2 (legacy values).
        return Math.max(0, 1 - turnsSince / range);
    }

    get position() {
        return { x: this.x, y: this.y };
    }

    get isAlive() {
        return this.hp > 0;
    }

    getNextPosition(action) {
        const delta = ActionDeltas[action];
        return {
            x: this.x + delta.dx,
            y: this.y + delta.dy
        };
    }

    canMove(action, grid) {
        const next = this.getNextPosition(action);

        if (!grid.isValidPosition(next.x, next.y)) {
            return false;
        }

        const tile = grid.getTile(next.x, next.y);
        return isPassable(tile);
    }

    /**
     * Apply stochastic transition.
     *   - grid.slippery (FrozenLake config-driven, Lv.26~28): 1/3 intended,
     *     1/3 perpendicular-left, 1/3 perpendicular-right (Math.random, legacy).
     *   - Modifier 'slippery' (T2B-2 runtime): 30% sideways via seeded RNG.
     *
     * D-2026-05-12-10: grid.slippery takes precedence — the modifier path only
     * runs when grid.slippery is false. We deliberately do NOT stack the two
     * slip models even if both are present (the FrozenLake dungeons are
     * already balanced around 2/3 slip).
     */
    _resolveAction(action, grid) {
        if (this.modifierSet && !grid.slippery) {
            const deflected = this.modifierSet.resolveMovement(action);
            if (deflected != null) return deflected;
        }
        if (!grid.slippery) return action;

        const r = Math.random();
        if (r < 1/3) {
            return action; // Intended direction
        } else if (r < 2/3) {
            // Perpendicular left (rotate -90°)
            // UP->LEFT, DOWN->RIGHT, LEFT->DOWN, RIGHT->UP
            return [Action.LEFT, Action.RIGHT, Action.DOWN, Action.UP][action];
        } else {
            // Perpendicular right (rotate +90°)
            // UP->RIGHT, DOWN->LEFT, LEFT->UP, RIGHT->DOWN
            return [Action.RIGHT, Action.LEFT, Action.UP, Action.DOWN][action];
        }
    }

    move(action, grid) {
        const stepReward = -0.1;  // Small penalty for each step

        // Stochastic transition: resolve actual action
        const resolvedAction = this._resolveAction(action, grid);
        this.actionHistory.push(resolvedAction);

        if (!this.canMove(resolvedAction, grid)) {
            // Wall bump (stay in place, still penalized)
            const penalty = stepReward - 1;
            this.totalReward += penalty;
            return { reward: penalty, done: false, success: false };
        }

        // Execute move with resolved action
        const next = this.getNextPosition(resolvedAction);
        this.x = next.x;
        this.y = next.y;
        this.turnCount++;
        this._recordVisit();

        // Get tile at new position
        const tile = grid.getTile(this.x, this.y);
        const tileReward = getReward(tile);

        // Apply tile effects
        let done = false;

        if (tile === TileType.GOAL) {
            done = true;
        } else if (tile === TileType.PIT) {
            // 즉사 함정
            this.hp = 0;
            done = true;
        } else if (tile === TileType.TRAP) {
            this.hp -= 10;
            if (this.hp <= 0) {
                this.hp = 0;
                done = true;
            }
        } else if (tile === TileType.HEAL) {
            this.hp = Math.min(this.hp + 10, this.maxHp);
        } else if (tile === TileType.GOLD) {
            // 골드는 보상만 (나중에 골드 시스템에서 처리)
        } else if (tile === TileType.MONSTER) {
            // 몬스터: 높은 데미지, 처치 후 사라짐
            const damage = getTileDamage(tile);
            this.hp -= damage;
            if (this.hp <= 0) {
                this.hp = 0;
                done = true;
            }
        }

        const totalStepReward = stepReward + tileReward;
        this.totalReward += totalStepReward;

        return { reward: totalStepReward, done, success: true, tile };
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.hp = this.maxHp;
        this.totalReward = 0;
        this.turnCount = 0;
        this.actionHistory = [];
        this.visitHistory.clear();
        // T2B-2: fail-safe defaults — callers (main.js) must re-apply modifiers
        // via _syncAgentModifiers if a daily ModifierSet should persist.
        this.modifierSet = null;
        this.visibilityRange = 5;
        this._recordVisit();
    }
}

export function randomAction() {
    return Math.floor(Math.random() * 4);
}
