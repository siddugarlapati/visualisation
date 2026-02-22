/**
 * intentSchema.js - Intent Schema and Validation for LeetCode Visualization
 * 
 * This module defines the structured intent format that the LLM outputs.
 * Intents are mapped to GSAPEngine actions by the IntentDispatcher.
 */

// ═══════════════════════════════════════════════════════════════════
// ACTION TYPES - All valid actions the LLM can emit
// ═══════════════════════════════════════════════════════════════════

export const ACTION_TYPES = {
    // Array Operations
    ARRAY_CREATE: 'ARRAY_CREATE',
    ARRAY_HIGHLIGHT: 'ARRAY_HIGHLIGHT',
    ARRAY_COMPARE: 'ARRAY_COMPARE',
    ARRAY_SWAP: 'ARRAY_SWAP',
    ARRAY_UPDATE: 'ARRAY_UPDATE',
    ARRAY_INSERT: 'ARRAY_INSERT',
    ARRAY_DELETE: 'ARRAY_DELETE',
    ARRAY_MOVE_POINTER: 'ARRAY_MOVE_POINTER',
    ARRAY_CLEAR_HIGHLIGHTS: 'ARRAY_CLEAR_HIGHLIGHTS',

    // Stack Operations
    STACK_CREATE: 'STACK_CREATE',
    STACK_PUSH: 'STACK_PUSH',
    STACK_POP: 'STACK_POP',
    STACK_PEEK: 'STACK_PEEK',
    STACK_HIGHLIGHT: 'STACK_HIGHLIGHT',

    // Queue Operations
    QUEUE_CREATE: 'QUEUE_CREATE',
    QUEUE_ENQUEUE: 'QUEUE_ENQUEUE',
    QUEUE_DEQUEUE: 'QUEUE_DEQUEUE',
    QUEUE_HIGHLIGHT: 'QUEUE_HIGHLIGHT',

    // HashMap Operations
    HASHMAP_CREATE: 'HASHMAP_CREATE',
    HASHMAP_SET: 'HASHMAP_SET',
    HASHMAP_GET: 'HASHMAP_GET',
    HASHMAP_DELETE: 'HASHMAP_DELETE',
    HASHMAP_HIGHLIGHT: 'HASHMAP_HIGHLIGHT',

    // Heap Operations
    HEAP_INIT: 'HEAP_INIT',
    HEAP_INSERT: 'HEAP_INSERT',
    HEAP_EXTRACT: 'HEAP_EXTRACT',
    HEAP_PEEK: 'HEAP_PEEK',
    HEAP_SWAP: 'HEAP_SWAP',
    HEAP_GET: 'HEAP_GET',
    HEAP_COMPARE: 'HEAP_COMPARE',
    HEAP_UPDATE: 'HEAP_UPDATE',
    HEAP_INSERTED: 'HEAP_INSERTED',
    HEAP_HEAPIFIED: 'HEAP_HEAPIFIED',
    HEAP_NOT_FOUND: 'HEAP_NOT_FOUND',

    // BST/Tree Operations
    BST_CREATE: 'BST_CREATE',
    BST_INSERT: 'BST_INSERT',
    BST_SEARCH: 'BST_SEARCH',
    BST_HIGHLIGHT: 'BST_HIGHLIGHT',
    TREE_CREATE_NODE: 'TREE_CREATE_NODE',
    TREE_HIGHLIGHT: 'TREE_HIGHLIGHT',

    // Graph Operations
    GRAPH_CREATE_NODE: 'GRAPH_CREATE_NODE',
    GRAPH_CONNECT: 'GRAPH_CONNECT',
    GRAPH_HIGHLIGHT: 'GRAPH_HIGHLIGHT',
    GRAPH_HIGHLIGHT_EDGE: 'GRAPH_HIGHLIGHT_EDGE',
    GRAPH_TRAVERSE: 'GRAPH_TRAVERSE',

    // Linked List Operations
    LIST_CREATE_NODE: 'LIST_CREATE_NODE',
    LIST_CONNECT: 'LIST_CONNECT',
    LIST_HIGHLIGHT: 'LIST_HIGHLIGHT',
    LIST_DELETE: 'LIST_DELETE',

    // Visual Effects (decorators - do not alter state)
    EMPHASIS: 'EMPHASIS',
    FOCUS_CAMERA: 'FOCUS_CAMERA',
    LABEL_ADD: 'LABEL_ADD',
    LABEL_REMOVE: 'LABEL_REMOVE',
};

// ═══════════════════════════════════════════════════════════════════
// EMPHASIS TAGS - Visual effect modifiers
// ═══════════════════════════════════════════════════════════════════

export const EMPHASIS_TAGS = {
    COMPARE: 'compare',      // Yellow highlight, pulse
    SUCCESS: 'success',      // Green highlight, confetti
    FAILURE: 'failure',      // Red highlight, shake
    CURRENT: 'current',      // Blue highlight
    RESULT: 'result',        // Green highlight, camera focus
    VISITED: 'visited',      // Gray/muted color
    PROCESSING: 'processing', // Pulsing animation
};

// Color mapping for emphasis
export const EMPHASIS_COLORS = {
    compare: 0xfbbf24,    // Yellow
    success: 0x22c55e,    // Green
    failure: 0xef4444,    // Red
    current: 0x3b82f6,    // Blue
    result: 0x10b981,     // Emerald
    visited: 0x6b7280,    // Gray
    processing: 0xa855f7, // Purple
};

// ═══════════════════════════════════════════════════════════════════
// INTENT SCHEMA DEFINITION
// ═══════════════════════════════════════════════════════════════════

/**
 * Intent Schema:
 * {
 *   action: string,        // One of ACTION_TYPES
 *   targets: {             // Action-specific targets
 *     arrayId?: string,
 *     indices?: number[],
 *     nodeId?: string,
 *     value?: any,
 *     ...
 *   },
 *   reason?: string,       // Explanation for this step
 *   emphasis?: string[],   // Array of EMPHASIS_TAGS
 * }
 */

// Required fields for each action type
const ACTION_REQUIREMENTS = {
    [ACTION_TYPES.ARRAY_CREATE]: ['arrayId', 'values'],
    [ACTION_TYPES.ARRAY_HIGHLIGHT]: ['arrayId', 'index'],
    [ACTION_TYPES.ARRAY_COMPARE]: ['arrayId', 'indices'],
    [ACTION_TYPES.ARRAY_SWAP]: ['arrayId', 'indices'],
    [ACTION_TYPES.ARRAY_UPDATE]: ['arrayId', 'index', 'value'],
    [ACTION_TYPES.ARRAY_INSERT]: ['arrayId', 'index', 'value'],
    [ACTION_TYPES.ARRAY_DELETE]: ['arrayId', 'index'],
    [ACTION_TYPES.ARRAY_MOVE_POINTER]: ['arrayId', 'index', 'pointerId'],
    [ACTION_TYPES.ARRAY_CLEAR_HIGHLIGHTS]: ['arrayId'],
    
    [ACTION_TYPES.STACK_CREATE]: ['stackId'],
    [ACTION_TYPES.STACK_PUSH]: ['stackId', 'value'],
    [ACTION_TYPES.STACK_POP]: ['stackId'],
    [ACTION_TYPES.STACK_PEEK]: ['stackId'],
    [ACTION_TYPES.STACK_HIGHLIGHT]: ['stackId'],

    [ACTION_TYPES.QUEUE_CREATE]: ['queueId'],
    [ACTION_TYPES.QUEUE_ENQUEUE]: ['queueId', 'value'],
    [ACTION_TYPES.QUEUE_DEQUEUE]: ['queueId'],
    [ACTION_TYPES.QUEUE_HIGHLIGHT]: ['queueId'],

    [ACTION_TYPES.HASHMAP_CREATE]: ['hashmapId'],
    [ACTION_TYPES.HASHMAP_SET]: ['hashmapId', 'key', 'value'],
    [ACTION_TYPES.HASHMAP_GET]: ['hashmapId', 'key'],
    [ACTION_TYPES.HASHMAP_DELETE]: ['hashmapId', 'key'],
    [ACTION_TYPES.HASHMAP_HIGHLIGHT]: ['hashmapId', 'key'],

    [ACTION_TYPES.HASHMAP_HIGHLIGHT]: ['hashmapId', 'key'],

    [ACTION_TYPES.HEAP_INIT]: ['heapId', 'values'],
    [ACTION_TYPES.HEAP_INSERT]: ['heapId', 'value'],
    [ACTION_TYPES.HEAP_EXTRACT]: ['heapId'],
    [ACTION_TYPES.HEAP_PEEK]: ['heapId'],
    [ACTION_TYPES.HEAP_SWAP]: ['heapId', 'i', 'j'],
    [ACTION_TYPES.HEAP_GET]: ['heapId', 'index'],
    [ACTION_TYPES.HEAP_COMPARE]: ['heapId', 'i', 'j'],
    [ACTION_TYPES.HEAP_UPDATE]: ['heapId', 'index', 'value'],
    [ACTION_TYPES.HEAP_INSERTED]: ['heapId', 'index'],
    [ACTION_TYPES.HEAP_HEAPIFIED]: ['heapId', 'index'],
    [ACTION_TYPES.HEAP_NOT_FOUND]: ['heapId'],

    [ACTION_TYPES.BST_CREATE]: ['nodeId', 'value'],
    [ACTION_TYPES.BST_INSERT]: ['value'],
    [ACTION_TYPES.BST_SEARCH]: ['value'],
    [ACTION_TYPES.BST_HIGHLIGHT]: ['nodeId'],
    [ACTION_TYPES.TREE_CREATE_NODE]: ['nodeId', 'value'],
    [ACTION_TYPES.TREE_HIGHLIGHT]: ['nodeId'],

    [ACTION_TYPES.GRAPH_CREATE_NODE]: ['nodeId', 'value'],
    [ACTION_TYPES.GRAPH_CONNECT]: ['fromId', 'toId'],
    [ACTION_TYPES.GRAPH_HIGHLIGHT]: ['nodeId'],
    [ACTION_TYPES.GRAPH_HIGHLIGHT_EDGE]: ['fromId', 'toId'],
    [ACTION_TYPES.GRAPH_TRAVERSE]: ['nodeId'],

    [ACTION_TYPES.LIST_CREATE_NODE]: ['nodeId', 'value'],
    [ACTION_TYPES.LIST_CONNECT]: ['fromId', 'toId'],
    [ACTION_TYPES.LIST_HIGHLIGHT]: ['nodeId'],
    [ACTION_TYPES.LIST_DELETE]: ['nodeId'],

    [ACTION_TYPES.EMPHASIS]: ['targetId', 'effect'],
    [ACTION_TYPES.FOCUS_CAMERA]: ['targetId'],
    [ACTION_TYPES.LABEL_ADD]: ['targetId', 'text'],
    [ACTION_TYPES.LABEL_REMOVE]: ['labelId'],
};

// ═══════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Validate a single intent object
 * @param {Object} intent - Intent to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateIntent(intent) {
    const errors = [];

    // Check required top-level fields
    if (!intent || typeof intent !== 'object') {
        return { valid: false, errors: ['Intent must be an object'] };
    }

    if (!intent.action) {
        errors.push('Intent missing required field: action');
    } else if (!Object.values(ACTION_TYPES).includes(intent.action)) {
        errors.push(`Unknown action type: ${intent.action}`);
    }

    // Check targets
    if (!intent.targets || typeof intent.targets !== 'object') {
        errors.push('Intent missing required field: targets');
    } else if (intent.action && ACTION_REQUIREMENTS[intent.action]) {
        const required = ACTION_REQUIREMENTS[intent.action];
        for (const field of required) {
            if (intent.targets[field] === undefined) {
                errors.push(`Action ${intent.action} requires target field: ${field}`);
            }
        }
    }

    // Validate emphasis if present
    if (intent.emphasis) {
        if (!Array.isArray(intent.emphasis)) {
            errors.push('Emphasis must be an array');
        } else {
            const validEmphasis = Object.values(EMPHASIS_TAGS);
            for (const e of intent.emphasis) {
                if (!validEmphasis.includes(e)) {
                    errors.push(`Unknown emphasis tag: ${e}`);
                }
            }
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validate an array of intents
 * @param {Object[]} intents - Array of intents
 * @returns {{ valid: boolean, errors: Array<{index: number, errors: string[]}> }}
 */
export function validateIntentSequence(intents) {
    if (!Array.isArray(intents)) {
        return { valid: false, errors: [{ index: -1, errors: ['Intents must be an array'] }] };
    }

    const allErrors = [];
    intents.forEach((intent, index) => {
        const result = validateIntent(intent);
        if (!result.valid) {
            allErrors.push({ index, errors: result.errors });
        }
    });

    return { valid: allErrors.length === 0, errors: allErrors };
}

/**
 * Normalize intent format (handle common variations)
 * @param {Object} intent - Raw intent from LLM
 * @returns {Object} Normalized intent
 */
export function normalizeIntent(intent) {
    if (!intent || typeof intent !== 'object') {
        return null;
    }

    const normalized = {
        action: (intent.action || '').toUpperCase().replace(/-/g, '_'),
        targets: { ...intent.targets },
        reason: intent.reason || intent.explanation || intent.description || '',
        emphasis: intent.emphasis || [],
    };

    // Handle common field name variations
    const targets = normalized.targets;

    // Array ID variations
    if (!targets.arrayId && targets.arrId) {
        targets.arrayId = targets.arrId;
    }
    if (!targets.arrayId && targets.id && normalized.action.startsWith('ARRAY_')) {
        targets.arrayId = targets.id;
    }

    // Index variations
    if (targets.indices === undefined && targets.index !== undefined) {
        targets.indices = [targets.index];
    }
    if (targets.indices === undefined && targets.i !== undefined && targets.j !== undefined) {
        targets.indices = [targets.i, targets.j];
    }

    // Color handling - convert string to hex if needed
    if (targets.color && typeof targets.color === 'string') {
        if (targets.color.startsWith('#')) {
            targets.color = parseInt(targets.color.slice(1), 16);
        } else if (targets.color.startsWith('0x')) {
            targets.color = parseInt(targets.color, 16);
        }
    }

    // Apply emphasis color if no explicit color
    if (!targets.color && normalized.emphasis.length > 0) {
        targets.color = EMPHASIS_COLORS[normalized.emphasis[0]];
    }

    return normalized;
}

/**
 * Create a safe, validated intent (returns null if invalid)
 * Combines normalization and validation
 * @param {Object} rawIntent - Raw intent from LLM
 * @returns {Object|null} Validated intent or null
 */
export function createSafeIntent(rawIntent) {
    const normalized = normalizeIntent(rawIntent);
    if (!normalized) return null;

    const validation = validateIntent(normalized);
    if (!validation.valid) {
        console.warn('Intent validation failed:', validation.errors);
        return null;
    }

    return normalized;
}
