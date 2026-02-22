/**
 * HanoiLogic.js - Tower of Hanoi Logic Module
 * 
 * This module provides a clean abstraction of Tower of Hanoi logic
 * separate from visualization concerns. It can be used for:
 * - Educational explanations
 * - Testing the algorithm independently
 * - Generating move sequences without visualization
 * - Alternative visualizations
 */

/**
 * Configuration for Tower of Hanoi
 */
export const HANOI_CONFIG = {
    MIN_DISKS: 1,
    MAX_DISKS: 7,
    PEG_NAMES: {
        source: 'A',
        auxiliary: 'B', 
        target: 'C'
    }
};

/**
 * Clamp the number of disks to safe range
 * @param {number} n - Requested number of disks
 * @returns {{ value: number, clamped: boolean, original: number }}
 */
export function clampDiskCount(n) {
    const value = Math.max(HANOI_CONFIG.MIN_DISKS, Math.min(HANOI_CONFIG.MAX_DISKS, n));
    return {
        value,
        clamped: value !== n,
        original: n
    };
}

/**
 * Calculate total moves required for n disks
 * Uses the formula: 2^n - 1
 * @param {number} n - Number of disks
 * @returns {number} Total moves
 */
export function calculateTotalMoves(n) {
    return Math.pow(2, n) - 1;
}

/**
 * Generate the sequence of moves for Tower of Hanoi (non-async version)
 * Useful for pre-computing or testing
 * @param {number} n - Number of disks
 * @param {string} source - Source peg name
 * @param {string} target - Target peg name
 * @param {string} auxiliary - Auxiliary peg name
 * @returns {Array<{disk: number, from: string, to: string, depth: number, moveNumber: number}>}
 */
export function generateMoveSequence(n, source = 'A', target = 'C', auxiliary = 'B') {
    const moves = [];
    let moveNumber = 0;

    function solve(disks, from, to, aux, depth = 0) {
        if (disks === 1) {
            moveNumber++;
            moves.push({
                disk: 1,
                from,
                to,
                depth,
                moveNumber
            });
        } else {
            // Move n-1 disks from source to auxiliary
            solve(disks - 1, from, aux, to, depth + 1);
            
            // Move disk n from source to target
            moveNumber++;
            moves.push({
                disk: disks,
                from,
                to,
                depth,
                moveNumber
            });
            
            // Move n-1 disks from auxiliary to target
            solve(disks - 1, aux, to, from, depth + 1);
        }
    }

    solve(n, source, target, auxiliary);
    return moves;
}

/**
 * Create a move iterator for Tower of Hanoi (generator function)
 * Useful for step-by-step visualization with pause capability
 * @param {number} n - Number of disks
 * @param {string} source - Source peg name
 * @param {string} target - Target peg name
 * @param {string} auxiliary - Auxiliary peg name
 * @yields {{disk: number, from: string, to: string, depth: number, moveNumber: number, action: 'pickup'|'place'}}
 */
export function* createMoveIterator(n, source = 'A', target = 'C', auxiliary = 'B') {
    let moveNumber = 0;

    function* solve(disks, from, to, aux, depth = 0) {
        if (disks === 1) {
            moveNumber++;
            yield { disk: 1, from, to, depth, moveNumber, action: 'pickup' };
            yield { disk: 1, from, to, depth, moveNumber, action: 'place' };
        } else {
            yield* solve(disks - 1, from, aux, to, depth + 1);
            
            moveNumber++;
            yield { disk: disks, from, to, depth, moveNumber, action: 'pickup' };
            yield { disk: disks, from, to, depth, moveNumber, action: 'place' };
            
            yield* solve(disks - 1, aux, to, from, depth + 1);
        }
    }

    yield* solve(n, source, target, auxiliary);
}

/**
 * Validate a move according to Tower of Hanoi rules
 * @param {Array<number>} sourcePeg - Stack representing source peg (top = last element)
 * @param {Array<number>} targetPeg - Stack representing target peg
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateMove(sourcePeg, targetPeg) {
    if (sourcePeg.length === 0) {
        return { valid: false, reason: 'Source peg is empty' };
    }
    
    const diskToMove = sourcePeg[sourcePeg.length - 1];
    const topOfTarget = targetPeg[targetPeg.length - 1];
    
    if (targetPeg.length > 0 && diskToMove > topOfTarget) {
        return { valid: false, reason: `Cannot place disk ${diskToMove} on disk ${topOfTarget}` };
    }
    
    return { valid: true };
}

/**
 * Create initial peg states for n disks
 * @param {number} n - Number of disks
 * @returns {{ source: number[], auxiliary: number[], target: number[] }}
 */
export function createInitialState(n) {
    const source = [];
    for (let i = n; i >= 1; i--) {
        source.push(i);
    }
    return {
        source,
        auxiliary: [],
        target: []
    };
}

/**
 * Get educational explanation for a move
 * @param {Object} move - Move object
 * @param {number} totalMoves - Total moves
 * @returns {string}
 */
export function getMoveExplanation(move, totalMoves) {
    const { disk, from, to, depth, moveNumber, action } = move;
    
    if (action === 'pickup') {
        return `[Move ${moveNumber}/${totalMoves}] Pick up Disk ${disk} from peg ${from}`;
    } else {
        return `[Move ${moveNumber}/${totalMoves}] Place Disk ${disk} on peg ${to}`;
    }
}

/**
 * Get recursion explanation for educational purposes
 * @param {number} n - Current number of disks being solved
 * @param {number} depth - Current recursion depth
 * @param {string} phase - 'start' | 'middle' | 'end'
 * @returns {string}
 */
export function getRecursionExplanation(n, depth, phase) {
    switch (phase) {
        case 'start':
            return `[Depth ${depth}] Starting subproblem: Move ${n} disk${n > 1 ? 's' : ''}`;
        case 'middle':
            return `[Depth ${depth}] Moving disk ${n} after ${n-1} smaller disks moved to auxiliary`;
        case 'end':
            return `[Depth ${depth}] Now moving ${n-1} disk${n > 2 ? 's' : ''} from auxiliary to target`;
        default:
            return '';
    }
}

export default {
    HANOI_CONFIG,
    clampDiskCount,
    calculateTotalMoves,
    generateMoveSequence,
    createMoveIterator,
    validateMove,
    createInitialState,
    getMoveExplanation,
    getRecursionExplanation
};
