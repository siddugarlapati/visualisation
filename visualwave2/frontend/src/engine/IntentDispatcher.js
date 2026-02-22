/**
 * IntentDispatcher.js - Maps LLM intents to GSAPEngine actions
 * 
 * This is the bridge between LLM-generated semantic intents and
 * the visualization engine. It validates intents and translates
 * them into actual engine method calls.
 * 
 * The LLM outputs intents like:
 *   { action: "ARRAY_COMPARE", targets: { arrayId: "arr", indices: [0, 1] } }
 * 
 * The dispatcher maps this to:
 *   engine.arrayCompare("arr", 0, 1)
 */

import { 
    ACTION_TYPES, 
    EMPHASIS_TAGS, 
    EMPHASIS_COLORS,
    validateIntent, 
    normalizeIntent, 
    createSafeIntent 
} from './intentSchema.js';

export class IntentDispatcher {
    /**
     * @param {GSAPEngine} engine - The visualization engine instance
     */
    constructor(engine) {
        this.engine = engine;
        this.executionLog = [];
    }

    /**
     * Execute a single intent
     * @param {Object} rawIntent - Intent from LLM
     * @returns {{ success: boolean, error?: string }}
     */
    execute(rawIntent) {
        // Normalize and validate
        const intent = createSafeIntent(rawIntent);
        if (!intent) {
            console.warn('❌ IntentDispatcher: Invalid intent rejected', rawIntent);
            return { success: false, error: 'Invalid intent' };
        }

        console.log('🎯 IntentDispatcher executing:', intent.action, intent.targets);

        try {
            // Execute the core action
            this._executeAction(intent);

            // Apply emphasis effects (decorative layer)
            if (intent.emphasis && intent.emphasis.length > 0) {
                this._applyEmphasis(intent);
            }

            // Log execution
            this.executionLog.push({
                timestamp: Date.now(),
                action: intent.action,
                targets: intent.targets,
                success: true
            });

            return { success: true };
        } catch (error) {
            console.error('❌ IntentDispatcher execution error:', error);
            this.executionLog.push({
                timestamp: Date.now(),
                action: intent.action,
                targets: intent.targets,
                success: false,
                error: error.message
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * Execute a sequence of intents with optional delay
     * @param {Object[]} intents - Array of intents
     * @param {number} delayMs - Delay between intents (default 0)
     * @returns {Promise<{ success: boolean, results: Object[] }>}
     */
    async executeSequence(intents, delayMs = 0) {
        const results = [];

        for (const intent of intents) {
            const result = this.execute(intent);
            results.push(result);

            if (delayMs > 0) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        return {
            success: results.every(r => r.success),
            results
        };
    }

    /**
     * Clear execution log
     */
    clearLog() {
        this.executionLog = [];
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRIVATE: Action Execution
    // ═══════════════════════════════════════════════════════════════════

    _ensureObjectExists(action, targets) {
        const engine = this.engine;
        if (!engine || !engine.objects) return;

        // Auto-create structures if they were used without a CREATE intent
        // CHECK SPECIFIC COLLECTIONS FIRST
        if (targets.hashmapId && !engine.hashmaps?.[targets.hashmapId] && !engine.objects[targets.hashmapId] && action !== ACTION_TYPES.HASHMAP_CREATE) {
            console.warn(`🛠 IntentDispatcher: Auto-creating missing HashMap: ${targets.hashmapId}`);
            engine.createHashMap?.(targets.hashmapId, 5, 0, -6);
        }
        if (targets.stackId && !engine.stacks?.[targets.stackId] && !engine.objects[targets.stackId] && action !== ACTION_TYPES.STACK_CREATE) {
            console.warn(`🛠 IntentDispatcher: Auto-creating missing Stack: ${targets.stackId}`);
            engine.createStack?.(targets.stackId, -5, 0);
        }
        if (targets.queueId && !engine.queues?.[targets.queueId] && !engine.objects[targets.queueId] && action !== ACTION_TYPES.QUEUE_CREATE) {
            console.warn(`🛠 IntentDispatcher: Auto-creating missing Queue: ${targets.queueId}`);
            engine.createQueue?.(targets.queueId, 5, 0);
        }
        if (targets.arrayId && !engine.arrays?.[targets.arrayId] && !engine.objects[targets.arrayId] && action !== ACTION_TYPES.ARRAY_CREATE) {
             console.warn(`🛠 IntentDispatcher: Auto-creating missing Array: ${targets.arrayId}`);
             engine.createArrayAPI?.(targets.arrayId, [0,0,0], -3, 0);
        }
    }

    _executeAction(intent) {
        const { action, targets } = intent;
        const engine = this.engine;

        if (!engine) {
            throw new Error('Engine not initialized');
        }

        // AUTO-VIVIFICATION: Ensure targets exist before operating on them
        this._ensureObjectExists(action, targets);

        switch (action) {
            // ───────────────────────────────────────────────────────────
            // ARRAY OPERATIONS
            // ───────────────────────────────────────────────────────────
            case ACTION_TYPES.ARRAY_CREATE:
                engine.createArrayAPI(
                    targets.arrayId,
                    targets.values,
                    targets.x ?? -3,
                    targets.y ?? 0
                );
                break;

            case ACTION_TYPES.ARRAY_HIGHLIGHT:
                engine.arrayHighlight(
                    targets.arrayId,
                    targets.index ?? targets.indices?.[0],
                    targets.color ?? EMPHASIS_COLORS.current
                );
                break;

            case ACTION_TYPES.ARRAY_COMPARE:
                if (targets.indices && targets.indices.length >= 2) {
                    engine.arrayCompare(targets.arrayId, targets.indices[0], targets.indices[1]);
                } else if (targets.indices && targets.indices.length === 1) {
                    engine.arrayHighlight(targets.arrayId, targets.indices[0], EMPHASIS_COLORS.compare);
                }
                break;

            case ACTION_TYPES.ARRAY_SWAP:
                if (targets.indices && targets.indices.length >= 2) {
                    engine.arraySwap(targets.arrayId, targets.indices[0], targets.indices[1]);
                }
                break;

            case ACTION_TYPES.ARRAY_UPDATE:
                engine.arrayUpdate(targets.arrayId, targets.index, targets.value);
                break;

            case ACTION_TYPES.ARRAY_INSERT:
                engine.arrayInsert(targets.arrayId, targets.index, targets.value);
                break;

            case ACTION_TYPES.ARRAY_DELETE:
                engine.arrayDelete(targets.arrayId, targets.index);
                break;

            case ACTION_TYPES.ARRAY_MOVE_POINTER:
                // Ensure array exists in engine.arrays (Arrays are stored in .arrays, not .objects)
                if (targets.arrayId && (engine.arrays?.[targets.arrayId] || engine.objects[targets.arrayId])) {
                     engine.arrayMovePointer?.(targets.arrayId, targets.index, targets.pointerId);
                } else if (targets.arrayId) {
                     // Failsafe: Try to auto-create array if genuinely missing
                     console.warn(`🛠 IntentDispatcher: Auto-creating missing Array for pointer: ${targets.arrayId}`);
                     engine.createArrayAPI?.(targets.arrayId, [0,0,0], -3, 0);
                     // Short delay to allow creation to register
                     setTimeout(() => engine.arrayMovePointer?.(targets.arrayId, targets.index, targets.pointerId), 50);
                }
                break;

            case ACTION_TYPES.ARRAY_CLEAR_HIGHLIGHTS:
                if (targets.indices && targets.indices.length > 0) {
                    engine.arrayClearHighlights(targets.arrayId, ...targets.indices);
                } else {
                    // GLOBAL RESET for this array
                    engine.arrayClearHighlights(targets.arrayId);
                }
                break;

            // ───────────────────────────────────────────────────────────
            // STACK OPERATIONS
            // ───────────────────────────────────────────────────────────
            case ACTION_TYPES.STACK_CREATE:
                engine.createStack?.(
                    targets.stackId,
                    targets.x ?? -5,
                    targets.y ?? 0
                );
                break;

            case ACTION_TYPES.STACK_PUSH:
                const stackObj = engine.objects?.[targets.stackId];
                const itemId = `${targets.stackId}_item_${stackObj?.items?.length || 0}`;
                engine.stackPush?.(targets.stackId, itemId, targets.value);
                break;

            case ACTION_TYPES.STACK_POP:
                engine.stackPop?.(targets.stackId);
                break;

            case ACTION_TYPES.STACK_PEEK:
                engine.stackPeek?.(targets.stackId);
                break;

            case ACTION_TYPES.STACK_HIGHLIGHT:
                engine.stackHighlight?.(targets.stackId, targets.color ?? EMPHASIS_COLORS.current);
                break;

            // ───────────────────────────────────────────────────────────
            // QUEUE OPERATIONS
            // ───────────────────────────────────────────────────────────
            case ACTION_TYPES.QUEUE_CREATE:
                engine.createQueue?.(
                    targets.queueId,
                    targets.x ?? 5,
                    targets.y ?? 0
                );
                break;

            case ACTION_TYPES.QUEUE_ENQUEUE:
                engine.queueEnqueue?.(targets.queueId, targets.value);
                break;

            case ACTION_TYPES.QUEUE_DEQUEUE:
                engine.queueDequeue?.(targets.queueId);
                break;

            case ACTION_TYPES.QUEUE_HIGHLIGHT:
                engine.queueHighlight?.(targets.queueId, targets.color ?? EMPHASIS_COLORS.current);
                break;

            // ───────────────────────────────────────────────────────────
            // HASHMAP OPERATIONS
            // ───────────────────────────────────────────────────────────
            case ACTION_TYPES.HASHMAP_CREATE:
                engine.createHashMap?.(
                    targets.hashmapId,
                    5, // bucketCount
                    targets.x ?? 0,
                    targets.y ?? -6
                );
                break;

            case ACTION_TYPES.HASHMAP_SET:
                engine.hashmapSet?.(targets.hashmapId, targets.key, targets.value);
                break;

            case ACTION_TYPES.HASHMAP_GET:
                engine.hashmapGet?.(targets.hashmapId, targets.key);
                break;

            case ACTION_TYPES.HASHMAP_DELETE:
                engine.hashmapDelete?.(targets.hashmapId, targets.key);
                break;

            case ACTION_TYPES.HASHMAP_HIGHLIGHT:
                engine.hashmapHighlight?.(targets.hashmapId, targets.key, targets.color ?? EMPHASIS_COLORS.current);
                break;

            // ───────────────────────────────────────────────────────────
            // BST / TREE OPERATIONS
            // ───────────────────────────────────────────────────────────
            case ACTION_TYPES.BST_CREATE:
                engine.bstCreateRoot?.(targets.nodeId, targets.value, targets.x ?? 0, targets.y ?? 8);
                break;

            case ACTION_TYPES.BST_INSERT:
                engine.bstInsert?.(targets.value);
                break;

            case ACTION_TYPES.BST_SEARCH:
                engine.bstSearch?.(targets.value);
                break;

            case ACTION_TYPES.BST_HIGHLIGHT:
                engine.bstHighlight?.(targets.nodeId, targets.color ?? EMPHASIS_COLORS.current);
                break;

            case ACTION_TYPES.TREE_CREATE_NODE:
                engine.createTreeNodeAPI?.(
                    targets.nodeId,
                    targets.value,
                    targets.parentId,
                    targets.isLeft
                );
                break;

            case ACTION_TYPES.TREE_HIGHLIGHT:
                engine.treeHighlight?.(targets.nodeId, targets.color ?? EMPHASIS_COLORS.current);
                break;

            // ───────────────────────────────────────────────────────────
            // HEAP OPERATIONS
            // ───────────────────────────────────────────────────────────
            case ACTION_TYPES.HEAP_INIT:
                engine.heapInit?.(targets.heapId, targets.values, targets.x ?? 0, targets.y ?? 2);
                break;
            case ACTION_TYPES.HEAP_SWAP:
                engine.heapSwap?.(targets.heapId, targets.i, targets.j);
                break;
            case ACTION_TYPES.HEAP_GET:
                engine.heapGet?.(targets.heapId, targets.index);
                break;
            case ACTION_TYPES.HEAP_INSERT:
                engine.heapInsert?.(targets.heapId, targets.value);
                break;
            case ACTION_TYPES.HEAP_EXTRACT:
                engine.heapExtract?.(targets.heapId);
                break;
            case ACTION_TYPES.HEAP_PEEK:
                engine.heapPeek?.(targets.heapId);
                break;
            case ACTION_TYPES.HEAP_COMPARE:
                engine.heapCompare?.(targets.heapId, targets.i, targets.j);
                break;
            case ACTION_TYPES.HEAP_UPDATE:
                engine.heapUpdate?.(targets.heapId, targets.index, targets.value);
                break;
            case ACTION_TYPES.HEAP_INSERTED:
                engine.heapInserted?.(targets.heapId, targets.index);
                break;
            case ACTION_TYPES.HEAP_HEAPIFIED:
                engine.heapHeapified?.(targets.heapId, targets.index);
                break;
            case ACTION_TYPES.HEAP_NOT_FOUND:
                engine.heapNotFound?.(targets.heapId);
                break;

            // ───────────────────────────────────────────────────────────
            // GRAPH OPERATIONS
            // ───────────────────────────────────────────────────────────
            case ACTION_TYPES.GRAPH_CREATE_NODE:
                engine.graphCreateNode?.(
                    targets.nodeId,
                    targets.value,
                    targets.x ?? 0,
                    targets.y ?? 0
                );
                break;

            case ACTION_TYPES.GRAPH_CONNECT:
                engine.graphConnect?.(
                    targets.fromId, 
                    targets.toId, 
                    targets.directed ?? false
                );
                break;

            case ACTION_TYPES.GRAPH_HIGHLIGHT:
                engine.graphHighlight?.(targets.nodeId, targets.color ?? EMPHASIS_COLORS.current);
                break;

            case ACTION_TYPES.GRAPH_HIGHLIGHT_EDGE:
                engine.graphHighlightEdge?.(
                    targets.fromId, 
                    targets.toId, 
                    targets.color ?? EMPHASIS_COLORS.current
                );
                break;

            case ACTION_TYPES.GRAPH_TRAVERSE:
                engine.graphVisitDFS?.(targets.nodeId);
                break;

            // ───────────────────────────────────────────────────────────
            // LINKED LIST OPERATIONS
            // ───────────────────────────────────────────────────────────
            case ACTION_TYPES.LIST_CREATE_NODE:
                engine.createListNode?.(
                    targets.nodeId,
                    targets.value,
                    targets.x ?? 0,
                    targets.y ?? 0
                );
                break;

            case ACTION_TYPES.LIST_CONNECT:
                engine.listNext?.(targets.fromId, targets.toId);
                break;

            case ACTION_TYPES.LIST_HIGHLIGHT:
                engine.listHighlight?.(targets.nodeId, targets.color ?? EMPHASIS_COLORS.current);
                break;

            case ACTION_TYPES.LIST_DELETE:
                engine.listDelete?.(targets.nodeId);
                break;

            // ───────────────────────────────────────────────────────────
            // VISUAL EFFECTS (EMPHASIS LAYER)
            // ───────────────────────────────────────────────────────────
            case ACTION_TYPES.EMPHASIS:
                this._applyEmphasisEffect(targets.targetId, targets.effect);
                break;

            case ACTION_TYPES.FOCUS_CAMERA:
                engine.focusCamera?.(targets.targetId, targets.padding ?? 2);
                break;

            case ACTION_TYPES.LABEL_ADD:
                if (targets.arrayId) {
                    engine.arrayAddLabel?.(
                        targets.arrayId, 
                        targets.index, 
                        targets.text, 
                        targets.color ?? '#ffff00',
                        targets.labelId
                    );
                } else {
                    // STANDALONE LABEL (e.g. for temporary variables/results)
                    engine.createLabel?.(
                        targets.labelId || `label_${Date.now()}`,
                        targets.text,
                        targets.x ?? -12,
                        targets.y ?? 8,
                        targets.color ?? '#ffffff'
                    );
                }
                break;

            case ACTION_TYPES.LABEL_REMOVE:
                if (targets.labelId) {
                    engine.arrayClearLabel?.(targets.labelId);
                    engine.removeObject?.(targets.labelId);
                }
                break;

            default:
                console.warn(`⚠️ IntentDispatcher: Unknown action type: ${action}`);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRIVATE: Emphasis Layer (Visual Effects)
    // ═══════════════════════════════════════════════════════════════════

    _applyEmphasis(intent) {
        const { targets, emphasis } = intent;

        for (const effect of emphasis) {
            this._applyEmphasisEffect(targets, effect);
        }
    }

    _applyEmphasisEffect(targets, effect) {
        const engine = this.engine;
        const color = EMPHASIS_COLORS[effect] ?? EMPHASIS_COLORS.current;

        // Determine target ID
        let targetId = null;
        if (typeof targets === 'string') {
            targetId = targets;
        } else if (targets.nodeId) {
            targetId = targets.nodeId;
        } else if (targets.arrayId && targets.index !== undefined) {
            targetId = `${targets.arrayId}_${targets.index}`;
        } else if (targets.targetId) {
            targetId = targets.targetId;
        } else if (targets.labelId) {
            targetId = targets.labelId;
        }

        if (!targetId) return;

        // Guard: Skip visual effects if target object doesn't exist
        // This avoids console errors for labels/variables that are state-only
        if (!engine.objects?.[targetId]) {
            console.log(`ℹ️ EMPHASIS skipped: object '${targetId}' not found (this is normal for state variables)`);
            return;
        }

        switch (effect) {
            case EMPHASIS_TAGS.COMPARE:
                engine.highlight?.(targetId, color);
                engine.pulse?.(targetId);
                break;

            case EMPHASIS_TAGS.SUCCESS:
                engine.highlight?.(targetId, color);
                engine.confetti?.(engine.objects?.[targetId]?.group?.position || { x: 0, y: 0, z: 0 });
                break;

            case EMPHASIS_TAGS.FAILURE:
                engine.highlight?.(targetId, color);
                engine.shake?.(targetId);
                break;

            case EMPHASIS_TAGS.CURRENT:
                engine.highlight?.(targetId, color);
                break;

            case EMPHASIS_TAGS.RESULT:
                engine.highlight?.(targetId, color);
                engine.focusCamera?.(targetId, 2);
                break;

            case EMPHASIS_TAGS.VISITED:
                engine.highlight?.(targetId, color);
                break;

            case EMPHASIS_TAGS.PROCESSING:
                engine.highlight?.(targetId, color);
                engine.pulse?.(targetId);
                break;

            default:
                engine.highlight?.(targetId, color);
        }
    }
}

export default IntentDispatcher;
