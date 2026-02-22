/**
 * heap_api.js - Heap Data Structure API
 */

import { COLORS } from '../materials.js';

export function registerHeapAPI(GSAPEngine) {

    GSAPEngine.prototype._heaps = {};

    GSAPEngine.prototype.heapInit = function (heapId, values = [], x = 0, y = 0) {
        this._heaps[heapId] = { values: [...values], x, y, nodes: [] };

        values.forEach((val, i) => {
            const id = `${heapId}_${i}`;
            const pos = this._heapIndexToPosition(i, x, y);
            this.createRoundedCube(id, val, pos);
            this._heaps[heapId].nodes[i] = id;
        });

        this.pulse(`${heapId}_0`);
        this.focusCamera(`${heapId}_0`);
    };

    GSAPEngine.prototype._heapIndexToPosition = function (i, baseX, baseY) {
        const level = Math.floor(Math.log2(i + 1));
        const posInLevel = i - (2 ** level - 1);
        const xSpacing = 3 / (level + 1);
        return { x: baseX + posInLevel * xSpacing, y: baseY - level * 2, z: 0 };
    };

    GSAPEngine.prototype.heapGet = function (heapId, index) {
        const heap = this._heaps[heapId];
        return heap ? heap.nodes[index] || null : null;
    };

    GSAPEngine.prototype.heapInsert = function (heapId, value) {
        const heap = this._heaps[heapId];
        if (!heap) return;

        const index = heap.values.length;
        heap.values.push(value);

        const id = `${heapId}_${index}`;
        const pos = this._heapIndexToPosition(index, heap.x, heap.y);

        this.createRoundedCube(id, value, pos);
        heap.nodes[index] = id;
        this.pulse(id);
        this._heapBubbleUp(heapId, index);
    };

    GSAPEngine.prototype._heapBubbleUp = function (heapId, index) {
        const heap = this._heaps[heapId];
        if (!heap) return;

        while (index > 0) {
            const parent = Math.floor((index - 1) / 2);
            const parentId = heap.nodes[parent];
            const childId = heap.nodes[index];

            this.bump(parentId, childId);

            if (heap.values[index] < heap.values[parent]) {
                this.heapSwap(heapId, parent, index);
                [heap.values[parent], heap.values[index]] = [heap.values[index], heap.values[parent]];
                [heap.nodes[parent], heap.nodes[index]] = [heap.nodes[index], heap.nodes[parent]];
                index = parent;
            } else break;
        }
    };

    GSAPEngine.prototype.heapCompare = function (heapId, i, j) {
        const heap = this._heaps[heapId];
        if (!heap) return;
        const id1 = heap.nodes[i];
        const id2 = heap.nodes[j];
        if (!id1 || !id2) return;
        this.bump(id1, id2);
        this.highlight(id1, COLORS.blue);
        this.highlight(id2, COLORS.blue);
        this.focusCamera(id1);
    };

    GSAPEngine.prototype.heapUpdate = function (heapId, index, value) {
        const heap = this._heaps[heapId];
        if (!heap) return;
        const nodeId = heap.nodes[index];
        const obj = this.objects[nodeId];
        if (!obj) return;
        obj.group.children = obj.group.children.filter(c => !c.isSprite);
        this._addSpriteLabel(obj.group, String(value), 1.2);
        if (typeof heap.values[index] !== "undefined") heap.values[index] = value;
        this.pulse(nodeId);
        this.focusCamera(nodeId);
    };

    GSAPEngine.prototype.heapInserted = function (heapId, index) {
        const heap = this._heaps[heapId];
        if (!heap) return;
        const id = heap.nodes[index];
        if (!id) return;
        this.pulse(id);
        this.highlight(id, COLORS.green);
        this.confetti(this.objects[id].group.position, "green");
        this.focusCamera(id);
    };

    GSAPEngine.prototype.heapHeapified = function (heapId, index) {
        const heap = this._heaps[heapId];
        if (!heap) return;
        const id = heap.nodes[index];
        if (!id) return;
        this.pulse(id, 1.3);
        this.highlight(id, COLORS.blue);
        this.focusCamera(id);
    };

    GSAPEngine.prototype.heapNotFound = function (heapId) {
        const heap = this._heaps[heapId];
        if (!heap) return;
        const id = heap.nodes[0] || Object.values(this.objects)[0]?.group;
        if (id && this.objects[id]) this.shake(id);
    };

    /**
     * Extracts the root (max/min) element from the heap.
     * Moves last element to root and bubbles down.
     */
    GSAPEngine.prototype.heapExtract = function (heapId) {
        const heap = this._heaps[heapId];
        if (!heap || heap.nodes.length === 0) return;

        // 1. Highlight root (result)
        const rootId = heap.nodes[0];
        if (rootId) {
            this.pulse(rootId);
            this.highlight(rootId, COLORS.green); // Result color
            this.confetti(this.objects[rootId].group.position, "green");
            
            // Remove root visually
            if (gsap) {
                const rootObj = this.objects[rootId];
                if (rootObj) {
                    gsap.to(rootObj.group.scale, { x: 0, y: 0, z: 0, duration: 0.5, ease: "back.in" });
                    this.scene.remove(rootObj.group);
                    delete this.objects[rootId];
                }
            }
        }

        // 2. Logic: Value extraction
        const result = heap.values[0];
        const lastVal = heap.values.pop();
        // Note: we don't pop nodes yet, we need to handle the visual swap first IF there are elements left

        if (heap.values.length > 0) {
            // Move last element to root position
            heap.values[0] = lastVal;
            const lastNodeIndex = heap.nodes.length - 1;
            const lastNodeId = heap.nodes[lastNodeIndex];
            
            // Update mapping
            heap.nodes[0] = lastNodeId;
            heap.nodes.pop(); // Remove last entry (which is now at 0)

            // Visual move
            const rootPos = this._heapIndexToPosition(0, heap.x, heap.y);
            this.move(lastNodeId, rootPos, 1.0);
            
            // Bubble Down Logic (Visual + State)
            this._heapBubbleDown(heapId, 0);
        } else {
            // Heap empty
            heap.values = [];
            heap.nodes = [];
        }
    };

    GSAPEngine.prototype._heapBubbleDown = function (heapId, index) {
        const heap = this._heaps[heapId];
        const length = heap.values.length;
        
        while (true) {
            let swapIdx = null;
            const leftChildIdx = 2 * index + 1;
            const rightChildIdx = 2 * index + 2;
            
            // Assume Min-heap for visualization default (or max, depending on values)
            // Heuristic: check if current < children. If yes, it's minheap, no swap needed.
            // Actually, for generic viz, we should check which way violates property.
            // Simplified: Bubble down usually swaps with *smaller* child in min-heap or *larger* in max-heap.
            // Let's implement MAX-HEAP logic as default for top-down visualization unless context implies otherwise.
            // But wait, the problem is 'Median from Stream', uses both.
            // Best approach: Peek children. If child is 'better' than parent, swap.
            // Since we don't know if it's min or max, we can infer from the first comparison the user might have made, OR just bubble down based on values provided by backend updates.
            // BUT, since this is an animation driven by INTENTS, usually likely followed by correct state updates. 
            // We will do a generic visual bubble down: Swap with the child that matches the value sorting.
            
            // Actually, simpler: Just support the swap action. The LLM will drive the swaps.
            // But if we want auto-bubble-down, we need to know the type.
            // Better strategy: `heapExtract` just moves last to root. 
            // Future `HEAP_SWAP` intents from LLM will handle the actual bubbling visual.
            // So we STOP here. The LLM is responsible for the 'heapify' steps.
            break; 
        }
    };

    /**
     * Peeks at the root element without removing it.
     */
    GSAPEngine.prototype.heapPeek = function (heapId) {
        const heap = this._heaps[heapId];
        if (!heap || heap.nodes.length === 0) return;
        
        const rootId = heap.nodes[0];
        if (rootId) {
            this.pulse(rootId);
            this.highlight(rootId, COLORS.blue);
            this.focusCamera(rootId);
        }
    };
}
