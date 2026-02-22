/**
 * set_api.js - Set Data Structure API
 */

import gsap from 'gsap';

export function registerSetAPI(GSAPEngine) {

    GSAPEngine.prototype.setInit = function (setId, values = [], startX = -4, y = 0) {
        values.forEach((val, i) => {
            const id = `${setId}_${i}`;
            const pos = { x: startX + i * 1.5, y, z: 0 };
            this.createRoundedCube(id, val, pos);
        });
    };

    GSAPEngine.prototype.setCheck = function (setId, valueIndex, probeId) {
        const elemId = `${setId}_${valueIndex}`;
        if (!this.objects[elemId] || !this.objects[probeId]) return;
        this.bump(elemId, probeId);
        this.focusCamera(elemId);
    };

    GSAPEngine.prototype.setFound = function (setId, index, color = 0x10b981) {
        const elemId = `${setId}_${index}`;
        this.highlight(elemId, color);
        this.focusCamera(elemId);
        this.confetti(this.objects[elemId].group.position, "green");
    };

    GSAPEngine.prototype.setInsert = function (setId, value, index, startX = -4, y = 0) {
        const elemId = `${setId}_${index}`;
        if (this.objects[elemId]) {
            this.shake(elemId);
            return;
        }
        const pos = { x: startX + index * 1.5, y, z: 0 };
        this.createRoundedCube(elemId, value, pos);
        this.pulse(elemId);
        this.highlight(elemId, 0x3b82f6);
    };

    GSAPEngine.prototype.setRemove = function (setId, index) {
        const elemId = `${setId}_${index}`;
        const obj = this.objects[elemId];
        if (!obj) return;

        if (gsap) {
            const g = obj.group;
            gsap.to(g.position, { y: g.position.y - 2, duration: 0.4 });
            gsap.to(g.scale, { x: 0, y: 0, z: 0, duration: 0.5 });

            g.traverse((child) => {
                if (child.isMesh && child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(mat => gsap.to(mat, { opacity: 0, duration: 0.5 }));
                }
            });

            gsap.delayedCall(0.5, () => { this.scene.remove(g); delete this.objects[elemId]; });
        }
    };

    GSAPEngine.prototype.setNotFound = function (probeId) {
        this.shake(probeId);
    };
}
