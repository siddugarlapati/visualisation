/**
 * bst_api.js - Binary Search Tree API with Improved Layout
 */

export function registerBSTAPI(GSAPEngine) {

    // BST layout configuration
    GSAPEngine.prototype._bstBaseOffset = 4;
    GSAPEngine.prototype._bstDepthDecay = 0.55; // Each level gets this much smaller
    GSAPEngine.prototype._bstVerticalGap = 3;
    GSAPEngine.prototype._bstNodes = {};

    GSAPEngine.prototype.bstCreateRoot = function (id, value, x = 0, y = 2) {
        if (this.objects[id]) return;
        this._bstNodes[id] = { depth: 0, x, y };
        this.createSphereNode(id, value, { x, y, z: 0 });
    };

    GSAPEngine.prototype.bstCreateChild = function (id, value, parentId, side = "left", customOffset = null) {
        if (this.objects[id] || !this.objects[parentId]) return;

        const parent = this.objects[parentId].group.position;
        const parentData = this._bstNodes[parentId] || { depth: 0 };
        const depth = parentData.depth + 1;

        // Dynamic offset: larger at top, smaller at bottom
        const offset = customOffset || this._bstBaseOffset * Math.pow(this._bstDepthDecay, depth);

        const dx = side === "left" ? -offset : offset;
        const dy = -this._bstVerticalGap;
        const dz = (depth % 2) * 0.8 - 0.4; // Alternate Z for depth

        const newX = parent.x + dx;
        const newY = parent.y + dy;

        this._bstNodes[id] = { depth, x: newX, y: newY };
        this.createSphereNode(id, value, { x: newX, y: newY, z: dz });
        this.connect(parentId, id);
    };

    GSAPEngine.prototype.bstCompare = function (nodeId, probeId) {
        if (!this.objects[nodeId] || !this.objects[probeId]) return;
        this.bump(nodeId, probeId);
        this.focusCamera(nodeId);
    };

    GSAPEngine.prototype.bstHighlightDirection = function (nodeId, color = 0x3b82f6) {
        this.highlight(nodeId, color);
        this.focusCamera(nodeId);
    };

    GSAPEngine.prototype.bstFound = function (nodeId) {
        this.highlight(nodeId, 0x10b981);
        this.confetti(this.objects[nodeId].group.position, "green");
        this.focusCamera(nodeId);
    };

    GSAPEngine.prototype.bstNotFound = function (probeId) {
        this.shake(probeId);
    };
}
