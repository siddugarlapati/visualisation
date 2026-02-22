/**
 * queue_api.js - Queue Data Structure API
 */

import * as THREE from 'three';
import { MAT_CERAMIC, COLORS } from '../materials.js';

export function registerQueueAPI(GSAPEngine) {

    GSAPEngine.prototype.createQueue = function (queueId, x = 0, y = 0) {
        if (this.objects[queueId]) return;

        const group = new THREE.Group();
        group.position.set(x, y, 0);

        // CHANNEL VISUALIZATION (Open-ended pipes)
        // Two horizontal rails with arrows pointing right to indicate flow/extension

        const railGeo = new THREE.BoxGeometry(8, 0.1, 0.1);
        const railMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        
        // 1. Bottom Rail
        const bottomRail = new THREE.Mesh(railGeo, railMat);
        bottomRail.position.set(0, -0.1, 0); // Slightly below items
        group.add(bottomRail);

        // 2. Top Rail
        const topRail = new THREE.Mesh(railGeo, railMat);
        topRail.position.set(0, 1.3, 0); // Slightly above items (assuming item height ~1)
        group.add(topRail);

        // 3. Arrow Heads (Indicating infinite extension)
        const arrowGeo = new THREE.ConeGeometry(0.2, 0.4, 8);
        const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        arrowGeo.rotateZ(-Math.PI / 2); // Rotate to point right

        // Bottom Arrow
        const bArrow = new THREE.Mesh(arrowGeo, arrowMat);
        bArrow.position.set(4.2, -0.1, 0); // At the end of bottom rail
        group.add(bArrow);

        // Top Arrow
        const tArrow = new THREE.Mesh(arrowGeo, arrowMat);
        tArrow.position.set(4.2, 1.3, 0); // At the end of top rail
        group.add(tArrow);

        this.scene.add(group);
        this.objects[queueId] = { group, type: "queue", items: [] };
    };

    GSAPEngine.prototype.queueEnqueue = function (queueId, itemId, value, focus = true) {
        const q = this.objects[queueId];
        if (!q) return;

        const index = q.items.length;
        const spacing = 1.4;
        const finalX = q.group.position.x - 3.5 + index * spacing;
        const finalY = q.group.position.y + 0.5;

        this.createRoundedCube(itemId, value, { x: q.group.position.x + 10, y: finalY, z: 0 });
        q.items.push(itemId);

        this.move(itemId, { x: finalX, y: finalY, z: 0 }, 1);
        this.pulse(itemId);
        if (focus) {
            // Wait for movement to finish before focusing
            if (this.tl) {
                this.tl.call(() => this.focusCamera(itemId));
            } else {
                this.focusCamera(itemId);
            }
        }
    };

    GSAPEngine.prototype.queueDequeue = function (queueId) {
        const q = this.objects[queueId];
        if (!q || q.items.length === 0) return;

        const frontId = q.items.shift();
        const obj = this.objects[frontId];
        if (!obj) return;

        this._enableTransparency(obj.group);

        if (this.tl) {
            this.tl.to(obj.group.position, { x: obj.group.position.x - 4, duration: 0.4, ease: "power1.out" });
            this.tl.to(obj.group.scale, { x: 0, y: 0, z: 0, duration: 0.5, ease: "power2.in" }, "<");

            obj.group.traverse((child) => {
                if (child.isMesh && child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(mat => {
                        this.tl.to(mat, { opacity: 0, duration: 0.5, ease: "power2.in" }, "<");
                    });
                }
            });

            this.tl.call(() => { this.scene.remove(obj.group); delete this.objects[frontId]; });
        }

        q.items.forEach((id, i) => {
            const finalX = q.group.position.x - 3.5 + i * 1.4;
            const finalY = q.group.position.y + 0.5;
            this.move(id, { x: finalX, y: finalY, z: 0 }, 0.8);
        });
    };

    GSAPEngine.prototype.queuePeek = function (queueId) {
        const q = this.objects[queueId];
        if (!q || q.items.length === 0) return;
        const id = q.items[0];
        this.highlight(id, COLORS.orange);
        this.focusCamera(id);
    };

    GSAPEngine.prototype.queueUnderflow = function (queueId) {
        this.shake(queueId);
    };
}
