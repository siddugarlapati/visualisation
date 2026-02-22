/**
 * SearchLogic.js - Search Algorithm Utilities
 * 
 * Provides abstracted search logic separate from visualization.
 * Useful for testing, generating step sequences, and validating inputs.
 */

/**
 * Validate input for binary search
 * @param {Array<number>} arr - Array to search in
 * @param {number} target - Target value
 * @returns {{ valid: boolean, error?: string, warnings: string[], sortedArr?: number[] }}
 */
export function validateSearchInput(arr, target) {
    const warnings = [];
    
    if (!Array.isArray(arr)) {
        return { valid: false, error: 'Input must be an array', warnings };
    }
    
    if (arr.length < 1) {
        return { valid: false, error: 'Array cannot be empty', warnings };
    }
    
    const sortedArr = [...arr].sort((a, b) => a - b);
    
    // Check if it was already sorted
    const wasSorted = arr.every((v, i) => v === sortedArr[i]);
    if (!wasSorted) {
        warnings.push('Array was not sorted; it has been sorted automatically');
    }
    
    // Check if target exists
    const targetExists = sortedArr.includes(target);
    if (!targetExists) {
        warnings.push(`Target ${target} may not exist in array`);
    }
    
    return { valid: true, warnings, sortedArr, targetExists };
}

/**
 * Calculate maximum iterations for binary search
 * @param {number} n - Array length
 * @returns {number}
 */
export function binarySearchMaxIterations(n) {
    return Math.ceil(Math.log2(n + 1));
}

/**
 * Generator function for Binary Search
 * Yields iteration events for visualization
 * @param {Array<number>} arr - Sorted array
 * @param {number} target - Target value
 * @yields {{ type: 'iteration' | 'found' | 'not_found', left: number, right: number, mid?: number, value?: number, eliminated?: 'left' | 'right', iterations: number }}
 */
export function* binarySearchGenerator(arr, target) {
    let left = 0;
    let right = arr.length - 1;
    let iterations = 0;
    
    while (left <= right) {
        iterations++;
        const mid = Math.floor((left + right) / 2);
        
        yield {
            type: 'iteration',
            left,
            right,
            mid,
            value: arr[mid],
            iterations
        };
        
        if (arr[mid] === target) {
            yield {
                type: 'found',
                index: mid,
                value: target,
                iterations
            };
            return;
        } else if (arr[mid] < target) {
            yield {
                type: 'eliminate',
                side: 'left',
                range: [left, mid],
                iterations
            };
            left = mid + 1;
        } else {
            yield {
                type: 'eliminate',
                side: 'right',
                range: [mid, right],
                iterations
            };
            right = mid - 1;
        }
    }
    
    yield {
        type: 'not_found',
        target,
        iterations,
        reason: 'Search space exhausted'
    };
}

/**
 * Generate educational explanation for binary search
 * @param {string} phase - 'intro' | 'iteration' | 'eliminate' | 'found' | 'not_found'
 * @param {Object} context - Additional context
 * @returns {string}
 */
export function getBinarySearchExplanation(phase, context = {}) {
    switch (phase) {
        case 'intro':
            return `Binary Search: Divide & conquer. Compare target with middle element and eliminate half each iteration.`;
        case 'formula':
            return `mid = ⌊(left + right) / 2⌋ = ⌊(${context.left} + ${context.right}) / 2⌋ = ${context.mid}`;
        case 'compare':
            return `Comparing arr[${context.mid}] = ${context.value} with target = ${context.target}`;
        case 'eliminate_left':
            return `${context.target} > ${context.value} → Eliminate left half [${context.left}..${context.mid}]`;
        case 'eliminate_right':
            return `${context.target} < ${context.value} → Eliminate right half [${context.mid}..${context.right}]`;
        case 'found':
            return `Found! Target ${context.target} is at index ${context.index}`;
        case 'not_found':
            return `Not found. Search space exhausted after ${context.iterations} iterations.`;
        case 'summary':
            return `Time: O(log n) | Space: O(1) | Iterations: ${context.iterations}/${context.maxIterations}`;
        default:
            return '';
    }
}

export default {
    validateSearchInput,
    binarySearchMaxIterations,
    binarySearchGenerator,
    getBinarySearchExplanation
};
