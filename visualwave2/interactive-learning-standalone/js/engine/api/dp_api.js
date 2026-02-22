/**
 * dp_api.js - Dynamic Programming Table API
 */

import gsap from 'gsap';

export function registerDPTableAPI(GSAPEngine) {

    GSAPEngine.prototype.dpInit = function (rows, cols, startX = -6, startY = 4) {
        this.dpRows = rows;
        this.dpCols = cols;
        this.dpStartX = startX;
        this.dpStartY = startY;
        this.dpCellSize = 1.8; // Larger cell size for better visibility

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const id = `dp_${r}_${c}`;
                const x = startX + c * this.dpCellSize;
                const y = startY - r * this.dpCellSize;
                // Skip collision detection for aligned DP table cells
                this.createRoundedCube(id, 0, { x, y, z: 0 }, true);
            }
        }
    };

    GSAPEngine.prototype.dpSet = function (r, c, val) {
        const id = `dp_${r}_${c}`;
        const obj = this.objects[id];
        if (!obj) return;
        this._addSpriteLabel(obj.group, String(val), 1.2);
        this.pulse(id);
        this.highlight(id, 0x3b82f6);
        this.focusCamera(id);
    };

    GSAPEngine.prototype.dpHighlight = function (r, c, color = 0xf59e0b) {
        const id = `dp_${r}_${c}`;
        this.highlight(id, color);
        this.focusCamera(id);
    };

    GSAPEngine.prototype.dpTransition = function (fromCells = [], toR, toC) {
        const toId = `dp_${toR}_${toC}`;
        this.pulse(toId);
        fromCells.forEach(([r, c]) => {
            const id = `dp_${r}_${c}`;
            this.bump(id, toId);
            this.highlight(id, 0x10b981);
        });
        this.focusCamera(toId);
    };

    GSAPEngine.prototype.dpPointer = function (pointerId, r, c) {
        const id = `dp_${r}_${c}`;
        const obj = this.objects[id];
        if (!obj) return;

        // Tiered offset based on pointer ID
        const lowerPtrId = pointerId.toLowerCase();
        let yOffset = 1.6;
        if (lowerPtrId === 'i' || lowerPtrId === 'row') {
            yOffset = 1.6;
        } else if (lowerPtrId === 'j' || lowerPtrId === 'col') {
            yOffset = 2.4;
        } else if (lowerPtrId === 'k' || lowerPtrId === 'cur') {
            yOffset = -1.4;
        }

        if (!this.objects[pointerId]) {
            const pointerColor = yOffset > 0 ? 0x00ff88 : 0xff6688;
            this.createSphereNode(pointerId, "•", {
                x: obj.group.position.x,
                y: obj.group.position.y + yOffset,
                z: 0.5
            });
            // Color the pointer
            const ptrObj = this.objects[pointerId];
            if (ptrObj && ptrObj.core) {
                ptrObj.core.material.color.setHex(pointerColor);
                ptrObj.core.material.emissive.setHex(pointerColor);
            }
            this.objects[pointerId].yOffset = yOffset;
        }

        const storedYOffset = this.objects[pointerId].yOffset || yOffset;
        this.move(pointerId, { x: obj.group.position.x, y: obj.group.position.y + storedYOffset, z: 0.5 }, 0.6);
        this.focusCamera(id);
    };

    GSAPEngine.prototype.dpAnswer = function (r, c) {
        const id = `dp_${r}_${c}`;
        this.confetti(id, 0x10b981);
        this.highlight(id, 0x10b981);
        this.pulse(id);
    };

    GSAPEngine.prototype.dpClear = function () {
        for (let r = 0; r < this.dpRows; r++) {
            for (let c = 0; c < this.dpCols; c++) {
                const id = `dp_${r}_${c}`;
                const obj = this.objects[id];
                if (!obj) continue;

                if (gsap) {
                    gsap.to(obj.group.scale, {
                        x: 0, y: 0, z: 0, duration: 0.3, ease: "power2.in",
                        onComplete: () => {
                            this.scene.remove(obj.group);
                            obj.group.traverse((child) => {
                                if (child.geometry) child.geometry.dispose();
                                if (child.material) child.material.dispose();
                            });
                            delete this.objects[id];
                        }
                    });
                }
            }
        }
    };
}
