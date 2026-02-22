/**
 * tree_api.js - Binary Tree API with Auto-Layout
 */

export function registerTreeAPI(GSAPEngine) {

    GSAPEngine.prototype.treeNodes = {};
    GSAPEngine.prototype.TREE_LAYER_Y_GAP = 3.5;    // Increased from 3
    GSAPEngine.prototype.TREE_BASE_X_SPREAD = 8;   // Increased from 6

    GSAPEngine.prototype.createTreeNodeAPI = function (id, value, parentId = null, isLeft = null, materialType = 'default') {
        if (this.treeNodes[id]) return;

        // Normalize parentId: treat empty string or 'null' string as null
        const normalizedParentId = (parentId === '' || parentId === 'null') ? null : parentId;

        if (normalizedParentId === null) {
            this.treeNodes[id] = { id, value, depth: 0, parent: null, isLeft: null, position: { x: 0, y: 0 } };
        } else {
            const parent = this.treeNodes[normalizedParentId];
            if (!parent) {
                console.warn(`createTreeNodeAPI: Parent '${normalizedParentId}' not found for node '${id}'`);
                return;
            }
            const depth = parent.depth + 1;
            this.treeNodes[id] = { id, value, depth, parent: normalizedParentId, isLeft, position: { x: 0, y: -depth * this.TREE_LAYER_Y_GAP } };
        }

        this._treeRecomputeLayout();
        const pos = this.treeNodes[id].position;

        if (materialType && materialType !== 'default') {
            this.createElementalNode(id, value, pos.x, pos.y, 0, materialType);
        } else {
            this.createSphereNode(id, value, { x: pos.x, y: pos.y, z: 0 });
        }

        if (normalizedParentId !== null) this.connect(normalizedParentId, id);

        this.pulse(id);
        this.focusCamera(id);
    };

    GSAPEngine.prototype._treeRecomputeLayout = function () {
        const nodes = this.treeNodes;
        if (Object.keys(nodes).length === 0) return;

        const levels = {};
        Object.values(nodes).forEach(node => {
            if (!levels[node.depth]) levels[node.depth] = [];
            levels[node.depth].push(node);
        });

        const depths = Object.keys(levels).map(n => Number(n));
        const maxDepth = Math.max(...depths);

        for (let depth = 0; depth <= maxDepth; depth++) {
            const levelNodes = levels[depth];
            const spread = this.TREE_BASE_X_SPREAD / Math.pow(1.6, depth);

            levelNodes.forEach(node => {
                if (node.parent === null) {
                    node.position = { x: 0, y: 0, z: 0 };
                } else {
                    const parent = nodes[node.parent];
                    const px = parent.position.x;
                    const pz = parent.position.z || 0;
                    // Z depth alternates and moves slightly forward per level
                    const zOffset = (depth % 2) * 1.0 - 0.5 + (node.isLeft ? 0.3 : -0.3);
                    node.position = {
                        x: px + (node.isLeft ? -spread : spread),
                        y: -depth * this.TREE_LAYER_Y_GAP,
                        z: zOffset
                    };
                }
            });
        }

        Object.values(nodes).forEach(node => {
            if (this.objects[node.id]) {
                const newPos = node.position;
                this.move(node.id, { x: newPos.x, y: newPos.y, z: newPos.z || 0 }, 1.0);
            }
        });
    };

    GSAPEngine.prototype.treeHighlight = function (id, color = 0x10b981) {
        this.highlight(id, color);
        this.focusCamera(id);
    };

    GSAPEngine.prototype.treeBump = function (id1, id2) {
        this.bump(id1, id2);
        this.focusCamera(id1);
    };

    GSAPEngine.prototype.treeShake = function (id) {
        this.shake(id);
        this.focusCamera(id);
    };

    GSAPEngine.prototype.treeConfetti = function (id) {
        const obj = this.objects[id];
        if (obj) this.confetti(obj.group.position);
    };
}
