/**
 * Agent (Adventurer) for the dungeon
 */

import { TileType, isPassable, getReward } from './tiles.js';

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

    move(action, grid) {
        const stepReward = -0.1;  // Small penalty for each step

        if (!this.canMove(action, grid)) {
            // Wall bump
            const penalty = stepReward - 1;
            this.totalReward += penalty;
            return { reward: penalty, done: false, success: false };
        }

        // Execute move
        const next = this.getNextPosition(action);
        this.x = next.x;
        this.y = next.y;

        // Get tile at new position
        const tile = grid.getTile(this.x, this.y);
        const tileReward = getReward(tile);

        // Apply tile effects
        let done = false;

        if (tile === TileType.GOAL) {
            done = true;
        } else if (tile === TileType.TRAP) {
            this.hp -= 10;
            if (this.hp <= 0) {
                this.hp = 0;
                done = true;
            }
        } else if (tile === TileType.HEAL) {
            this.hp = Math.min(this.hp + 10, this.maxHp);
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
    }
}

export function randomAction() {
    return Math.floor(Math.random() * 4);
}
