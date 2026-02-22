/**
 * dll_api.js - Doubly Linked List API
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { MAT_CERAMIC, MAT_LASER, COLORS } from '../materials.js';

export function registerDoublyLinkedListAPI(GSAPEngine) {

    GSAPEngine.prototype.createDLLNode = function (id, value, x = 0, y = 0) {
        if (this.objects[id]) return;

        const group = new THREE.Group();
        group.position.set(x, y, 0);

        const base = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 0.9, 0.4),
            MAT_CERAMIC.clone()
        );
        group.add(base);

        const sepMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const leftSep = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.41), sepMat);
        leftSep.position.x = -0.7;
        const rightSep = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.41), sepMat);
        rightSep.position.x = 0.7;

        group.add(leftSep);
        group.add(rightSep);

        this._addSpriteLabel(group, value.toString(), 0.5);

        this.scene.add(group);
        this.objects[id] = { group, type: "dll_node" };

        if (gsap) gsap.from(group.scale, { x: 0, y: 0, z: 0, duration: 0.7, ease: "back.out(1.8)" });
    };

    GSAPEngine.prototype.dllNext = function (id1, id2) {
        const obj1 = this.objects[id1];
        const obj2 = this.objects[id2];
        if (!obj1 || !obj2) return;

        const p1 = obj1.group.position.clone();
        const p2 = obj2.group.position.clone();
        const mid = p1.clone().lerp(p2, 0.5);
        mid.y += 0.4;

        const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
        const geometry = new THREE.TubeGeometry(curve, 20, 0.04, 8, false);
        const mesh = new THREE.Mesh(geometry, MAT_LASER.clone());
        this.scene.add(mesh);
        this.connections.push({ id1, id2, mesh, type: "dll_next" });

        if (gsap) {
            mesh.scale.set(0, 0, 0);
            gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: "power2.out" });
        }
    };

    GSAPEngine.prototype.dllPrev = function (id1, id2) {
        const obj1 = this.objects[id1];
        const obj2 = this.objects[id2];
        if (!obj1 || !obj2) return;

        const p1 = obj1.group.position.clone();
        const p2 = obj2.group.position.clone();
        const mid = p1.clone().lerp(p2, 0.5);
        mid.y -= 0.4;

        const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
        const geometry = new THREE.TubeGeometry(curve, 20, 0.04, 8, false);
        const mesh = new THREE.Mesh(geometry, MAT_LASER.clone());
        this.scene.add(mesh);
        this.connections.push({ id1, id2, mesh, type: "dll_prev" });

        if (gsap) {
            mesh.scale.set(0, 0, 0);
            gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: "power2.out" });
        }
    };

    GSAPEngine.prototype.dllHighlight = function (id, colorHex = COLORS.blue) {
        this.listHighlight(id, colorHex);
    };

    GSAPEngine.prototype.dllCompare = function (id1, id2) {
        this.listCompare(id1, id2);
    };

    GSAPEngine.prototype.dllInsertAfter = function (prevId, newId, offset = 2.5) {
        const prev = this.objects[prevId];
        const node = this.objects[newId];
        if (!prev || !node) return;

        const px = prev.group.position.x;
        const py = prev.group.position.y;

        this.move(newId, { x: px + offset, y: py, z: 0 }, 1);
        this.dllNext(prevId, newId);
        this.dllPrev(newId, prevId);
    };

    GSAPEngine.prototype.dllDelete = function (id) {
        const obj = this.objects[id];
        if (!obj || !this.tl) return;

        this._enableTransparency(obj.group);

        this.tl.to(obj.group.scale, { x: 0, y: 0, z: 0, duration: 0.5, ease: "power2.in" });

        obj.group.traverse((child) => {
            if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(mat => {
                    this.tl.to(mat, { opacity: 0, duration: 0.5, ease: "power2.in" }, "<");
                });
            }
        });

        this.tl.call(() => { this.scene.remove(obj.group); delete this.objects[id]; });
    };

    // Helper function to get pointer Y offset based on ID
    const getPointerYOffset = (pointerId) => {
        const lowerPtrId = pointerId.toLowerCase();
        if (lowerPtrId === 'head' || lowerPtrId === 'current' || lowerPtrId === 'slow' || lowerPtrId === 'p1') {
            return 1.8;
        } else if (lowerPtrId === 'tail' || lowerPtrId === 'prev' || lowerPtrId === 'fast' || lowerPtrId === 'p2') {
            return 2.6;
        } else if (lowerPtrId === 'temp' || lowerPtrId === 'next') {
            return -1.5;
        } else {
            const hash = pointerId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
            return (hash % 2 === 0) ? 1.6 + (hash % 3) * 0.6 : -1.4 - (hash % 2) * 0.6;
        }
    };

    GSAPEngine.prototype.createDLLPointer = function (id, label, x = 0, y = 0) {
        if (this.objects[id]) return;

        const yOffset = getPointerYOffset(label);
        const pointerColor = yOffset > 0 ? 0x00ff88 : 0xff6688;

        const group = new THREE.Group();
        group.position.set(x, y, 0.5);

        const arrow = new THREE.Mesh(
            new THREE.ConeGeometry(0.25, 0.6, 16),
            new THREE.MeshBasicMaterial({ color: pointerColor })
        );
        arrow.rotation.x = yOffset > 0 ? Math.PI : 0;
        arrow.position.y = yOffset > 0 ? -0.5 : 0.5;

        group.add(arrow);
        this._addSpriteLabel(group, label, yOffset > 0 ? 0.6 : -0.6);

        this.scene.add(group);
        this.objects[id] = { group, type: "dll_pointer", yOffset };

        if (gsap) gsap.from(group.scale, { x: 0, y: 0, z: 0, duration: 0.5, ease: "back.out(1.5)" });
    };

    GSAPEngine.prototype.dllMovePointer = function (ptrId, targetId) {
        const ptr = this.objects[ptrId];
        const target = this.objects[targetId];
        if (!ptr || !target) return;

        const yOffset = ptr.yOffset || getPointerYOffset(ptrId);
        const pos = target.group.position.clone();
        pos.y += yOffset;
        pos.z += 0.5;
        this.move(ptrId, pos, 0.6);
    };
}
