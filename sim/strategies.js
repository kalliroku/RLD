/**
 * strategies.js — AI strategies for the balance simulator
 *
 * Each strategy implements decide(state) → { type, ...params } | null
 *
 * Action types:
 *   train:      { type: 'train', dungeonId, charName }
 *   farm:       { type: 'farm' }
 *   hire:       { type: 'hire', charName }
 *   upgrade:    { type: 'upgrade', charName }
 *   mapSell:    { type: 'mapSell', dungeonId }
 *   mapKeep:    { type: 'mapKeep', dungeonId }
 *   assignFarm: { type: 'assignFarm', charName, dungeonId }
 *   removeFarm: { type: 'removeFarm', charName }
 *   buyFood:    { type: 'buyFood', amount }
 *   manual:     { type: 'manual', dungeonId }
 */

// Estimate gold needed for a full training run on a dungeon
function estimateTrainingBudget(charName, dungeonId, state) {
    const opCost = state.getOperatingCost(charName, dungeonId);
    // Budget for ~150 episodes (generous: some dungeons need 100+)
    return opCost * 150;
}

// Find best dungeon to farm (highest reward per turn)
function getBestFarmDungeon(charName, state) {
    let best = null;
    let bestReward = 0;
    for (const did of state.dungeonOrder) {
        if (!state.clearedDungeons.has(did) || !state.answerPaths[did]) continue;
        if (!state.canFarm(charName, did)) continue;
        if (Object.values(state.farmingAssignments).includes(did)) continue;

        const config = state.dungeonConfig[did];
        const ms = state.mapStatus[did];
        let reward = config.repeatReward;
        if (ms && ms.status === 'exclusive' && ms.exclusiveRunsLeft > 0) {
            reward = 3 * config.repeatReward;
        }
        if (reward > bestReward) {
            bestReward = reward;
            best = did;
        }
    }
    return best;
}

// Ensure all idle chars (except trainer) are assigned to farm
function tryAssignIdleFarmers(state, trainerChar) {
    for (const charName of state.availableChars) {
        if (charName === trainerChar) continue;
        if (state.isFarming(charName)) continue;
        const farmDungeon = getBestFarmDungeon(charName, state);
        if (farmDungeon) {
            return { type: 'assignFarm', charName, dungeonId: farmDungeon };
        }
    }
    return null;
}

// Common: handle solo-char or multi-char farming/training cycle
function farmOrTrain(state, target, charName, budget) {
    const farmingChars = Object.keys(state.farmingAssignments);

    // If charName is null (all chars farming), check if we can unassign
    if (!charName && farmingChars.length > 0) {
        const soloChar = farmingChars[0];
        if (state.gold >= budget) {
            return { type: 'removeFarm', charName: soloChar };
        }
        return { type: 'farm' };
    }
    if (!charName) return null;

    // Need more gold? Farm first.
    if (state.gold < budget) {
        // Assign this char to farm if it's the only idle one
        if (!state.isFarming(charName)) {
            const farmDungeon = getBestFarmDungeon(charName, state);
            if (farmDungeon) {
                return { type: 'assignFarm', charName, dungeonId: farmDungeon };
            }
        }
        if (farmingChars.length > 0) return { type: 'farm' };
        // No farming possible, just train with what we have
        if (state.gold >= state.getOperatingCost(charName, target)) {
            if (state.isFarming(charName)) return { type: 'removeFarm', charName };
            return { type: 'train', dungeonId: target, charName };
        }
        return null;
    }

    // We have budget — unassign farmer and train
    if (state.isFarming(charName)) {
        return { type: 'removeFarm', charName };
    }

    return { type: 'train', dungeonId: target, charName };
}


// === Strategy 1: StraightForward ===
// Rush dungeons, sell maps, minimal farming (only when broke)
export const StraightForward = {
    name: 'StraightForward',
    decide(state) {
        if (state.pendingMapChoice) {
            return { type: 'mapSell', dungeonId: state.pendingMapChoice };
        }

        const target = state.nextUncleared;
        if (!target) return null;

        const charName = state.getCheapestChar(target);
        const budget = estimateTrainingBudget(charName || 'qkun', target, state);

        // Assign idle chars to farm while saving up
        const farmAssign = tryAssignIdleFarmers(state, charName);
        if (farmAssign && state.gold < budget) return farmAssign;

        return farmOrTrain(state, target, charName, budget);
    }
};


// === Strategy 2: BalancedPlayer ===
// Keep maps, farm exclusive runs, upgrade chars, balanced approach
export const BalancedPlayer = {
    name: 'BalancedPlayer',
    decide(state) {
        if (state.pendingMapChoice) {
            return { type: 'mapKeep', dungeonId: state.pendingMapChoice };
        }

        const target = state.nextUncleared;
        const farmingChars = Object.keys(state.farmingAssignments);

        // Assign idle chars to farm (keep 1 for training when ready)
        const charName = target ? state.getCheapestChar(target) : null;
        const farmAssign = tryAssignIdleFarmers(state, charName);
        if (farmAssign) return farmAssign;

        // Farm if exclusive maps exist
        if (farmingChars.length > 0) {
            const hasExclusive = farmingChars.some(c => {
                const did = state.farmingAssignments[c];
                const ms = state.mapStatus[did];
                return ms && ms.status === 'exclusive' && ms.exclusiveRunsLeft > 0;
            });
            if (hasExclusive) return { type: 'farm' };
        }

        if (!target) {
            if (farmingChars.length > 0) return { type: 'farm' };
            return null;
        }

        // Upgrade if we have surplus gold
        const budget = estimateTrainingBudget(charName || 'qkun', target, state);
        if (state.gold > budget * 1.5) {
            for (const c of state.availableChars) {
                if (state.canUpgrade(c)) {
                    return { type: 'upgrade', charName: c };
                }
            }
        }

        return farmOrTrain(state, target, charName, budget);
    }
};


// === Strategy 3: FarmHeavy ===
// Maximize farming income, only train when well-funded
export const FarmHeavy = {
    name: 'FarmHeavy',
    decide(state) {
        if (state.pendingMapChoice) {
            return { type: 'mapKeep', dungeonId: state.pendingMapChoice };
        }

        const target = state.nextUncleared;
        const farmingChars = Object.keys(state.farmingAssignments);

        // No target: assign all idle to farm, keep farming
        if (!target) {
            for (const c of state.availableChars) {
                if (state.isFarming(c)) continue;
                const fd = getBestFarmDungeon(c, state);
                if (fd) return { type: 'assignFarm', charName: c, dungeonId: fd };
            }
            if (farmingChars.length > 0) return { type: 'farm' };
            return null;
        }

        // Determine trainer and budget
        let charName = state.getCheapestChar(target);
        const budgetChar = charName || state.availableChars[0] || 'qkun';
        const budget = estimateTrainingBudget(budgetChar, target, state) * 2;

        // Budget met → unassign farmer if needed, then train
        if (state.gold >= budget) {
            if (!charName && farmingChars.length > 0) {
                // Pick cheapest farmer for target
                let best = farmingChars[0], bestCost = Infinity;
                for (const c of farmingChars) {
                    const cost = state.getOperatingCost(c, target);
                    if (cost < bestCost) { bestCost = cost; best = c; }
                }
                return { type: 'removeFarm', charName: best };
            }
            if (charName) {
                if (state.isFarming(charName)) return { type: 'removeFarm', charName };
                return { type: 'train', dungeonId: target, charName };
            }
            return null;
        }

        // Budget NOT met → assign idle chars to farm, then keep farming
        for (const c of state.availableChars) {
            if (state.isFarming(c)) continue;
            const fd = getBestFarmDungeon(c, state);
            if (fd) return { type: 'assignFarm', charName: c, dungeonId: fd };
        }
        if (farmingChars.length > 0) return { type: 'farm' };

        // Can't farm, train with what we have
        if (charName && state.gold >= state.getOperatingCost(charName, target)) {
            return { type: 'train', dungeonId: target, charName };
        }
        return null;
    }
};


// === Strategy 4: HybridPlayer ===
// Simulates a real player: manually clears cheap dungeons, AI trains harder ones
// Tracks failed manual attempts to decide when to switch to AI training
export const HybridPlayer = {
    name: 'HybridPlayer',
    _manualFailCounts: {},

    decide(state) {
        if (state.pendingMapChoice) {
            return { type: 'mapKeep', dungeonId: state.pendingMapChoice };
        }

        const target = state.nextUncleared;
        const farmingChars = Object.keys(state.farmingAssignments);

        // Assign idle chars (except trainer) to farm
        const charName = target ? state.getCheapestChar(target) : null;
        const farmAssign = tryAssignIdleFarmers(state, charName);
        if (farmAssign) return farmAssign;

        if (!target) {
            if (farmingChars.length > 0) return { type: 'farm' };
            return null;
        }

        // Manual play: try if path exists, cost-effective, and not failed too many times
        const manualCost = state.getManualCost(target);
        const aiBudget = estimateTrainingBudget(charName || 'qkun', target, state);
        const manualFails = this._manualFailCounts[target] || 0;
        const maxManualAttempts = 3; // give up manual after 3 failures

        const canManual = manualCost
            && manualCost.goldCost < aiBudget * 0.7
            && manualFails < maxManualAttempts
            && (manualCost.successRate || 0) > 0.3; // don't bother if too risky

        if (canManual) {
            const foodNeeded = manualCost.humanSteps;
            if (state.food < foodNeeded) {
                const needed = foodNeeded - state.food;
                if (state.gold >= needed + aiBudget * 0.3) {
                    // Keep a reserve for AI training fallback
                    return { type: 'buyFood', amount: needed };
                }
            } else {
                return { type: 'manual', dungeonId: target };
            }
        }

        // Upgrade if surplus gold
        if (state.gold > aiBudget * 1.5) {
            for (const c of state.availableChars) {
                if (state.canUpgrade(c)) {
                    return { type: 'upgrade', charName: c };
                }
            }
        }

        // Farm exclusive maps
        if (farmingChars.length > 0) {
            const hasExclusive = farmingChars.some(c => {
                const did = state.farmingAssignments[c];
                const ms = state.mapStatus[did];
                return ms && ms.status === 'exclusive' && ms.exclusiveRunsLeft > 0;
            });
            if (hasExclusive) return { type: 'farm' };
        }

        return farmOrTrain(state, target, charName, aiBudget);
    }
};
