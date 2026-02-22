/**
 * SortingLogic.js - Sorting Algorithm Utilities
 * 
 * Provides abstracted sorting logic separate from visualization.
 * Useful for testing, generating move sequences, and validating inputs.
 */

/**
 * Configuration for sorting algorithms
 */
export const SORTING_CONFIG = {
    MIN_ARRAY_LENGTH: 2,
    MAX_ARRAY_LENGTH: 12
};

/**
 * Validate array input for sorting
 * @param {Array<number>} arr - Array to validate
 * @returns {{ valid: boolean, error?: string, warnings: string[] }}
 */
export function validateSortInput(arr) {
    const warnings = [];
    
    if (!Array.isArray(arr)) {
        return { valid: false, error: 'Input must be an array', warnings };
    }
    
    if (arr.length < SORTING_CONFIG.MIN_ARRAY_LENGTH) {
        return { valid: false, error: `Array must have at least ${SORTING_CONFIG.MIN_ARRAY_LENGTH} elements`, warnings };
    }
    
    if (arr.length > SORTING_CONFIG.MAX_ARRAY_LENGTH) {
        warnings.push(`Array will be truncated to ${SORTING_CONFIG.MAX_ARRAY_LENGTH} elements`);
    }
    
    if (isSorted(arr)) {
        warnings.push('Array appears to be already sorted');
    }
    
    return { valid: true, warnings };
}

/**
 * Check if array is sorted in ascending order
 * @param {Array<number>} arr 
 * @returns {boolean}
 */
export function isSorted(arr) {
    return arr.every((v, i, a) => i === 0 || a[i-1] <= v);
}

/**
 * Generator function for Bubble Sort
 * Yields comparison and swap events for visualization
 * @param {Array<number>} arr 
 * @yields {{ type: 'compare' | 'swap' | 'pass_end' | 'sorted', indices: number[], values?: number[], pass?: number }}
 */
export function* bubbleSortGenerator(arr) {
    const sortedArr = [...arr];
    const n = sortedArr.length;
    let comparisons = 0;
    let swaps = 0;
    
    for (let i = 0; i < n - 1; i++) {
        let swappedThisPass = false;
        
        for (let j = 0; j < n - i - 1; j++) {
            comparisons++;
            yield { 
                type: 'compare', 
                indices: [j, j + 1], 
                values: [sortedArr[j], sortedArr[j + 1]],
                comparisons,
                swaps
            };
            
            if (sortedArr[j] > sortedArr[j + 1]) {
                // Swap
                [sortedArr[j], sortedArr[j + 1]] = [sortedArr[j + 1], sortedArr[j]];
                swaps++;
                swappedThisPass = true;
                
                yield {
                    type: 'swap',
                    indices: [j, j + 1],
                    values: [sortedArr[j], sortedArr[j + 1]],
                    comparisons,
                    swaps
                };
            }
        }
        
        yield {
            type: 'pass_end',
            pass: i + 1,
            sortedIndex: n - i - 1,
            value: sortedArr[n - i - 1],
            swappedThisPass
        };
        
        // Early termination
        if (!swappedThisPass) {
            break;
        }
    }
    
    yield {
        type: 'sorted',
        array: sortedArr,
        comparisons,
        swaps
    };
}

/**
 * Calculate worst-case comparisons for bubble sort
 * @param {number} n - Array length
 * @returns {number}
 */
export function bubbleSortWorstCase(n) {
    return (n * (n - 1)) / 2;
}

/**
 * Generate educational explanation for bubble sort
 * @param {string} phase - 'intro' | 'pass' | 'swap' | 'complete'
 * @param {Object} context - Additional context
 * @returns {string}
 */
export function getBubbleSortExplanation(phase, context = {}) {
    switch (phase) {
        case 'intro':
            return `Bubble Sort: Compare adjacent elements and swap if out of order. Largest element "bubbles" to the end each pass.`;
        case 'pass':
            return `Pass ${context.pass}: Each pass reduces the unsorted region by 1.`;
        case 'swap':
            return `Swapping ${context.a} and ${context.b} because ${context.a} > ${context.b}`;
        case 'early_exit':
            return `No swaps in this pass — array is sorted! Early termination saves time.`;
        case 'complete':
            return `Complete! ${context.comparisons} comparisons, ${context.swaps} swaps. Time: O(n²), Space: O(1)`;
        default:
            return '';
    }
}

export default {
    SORTING_CONFIG,
    validateSortInput,
    isSorted,
    bubbleSortGenerator,
    bubbleSortWorstCase,
    getBubbleSortExplanation
};
