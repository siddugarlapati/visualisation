/**
 * list_api.js - Singly Linked List API
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { MAT_CERAMIC, MAT_LASER, COLORS } from '../materials.js';

export function registerLinkedListAPI(GSAPEngine) {

    GSAPEngine.prototype.createListNode = function (id, value, x = 0, y = 0) {
        if (this.objects[id]) return;

        const group = new THREE.Group();
        group.position.set(x, y, 0);

        // Create custom metallic red material with high reflectivity
        const nodeMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xef4444,        // Red color
            metalness: 0.9,
            roughness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            envMapIntensity: 1.5,
            reflectivity: 1.0
        });
        
        // Use RoundedBoxGeometry for smooth rounded edges
        const rect = new THREE.Mesh(
            new RoundedBoxGeometry(1.4, 0.8, 0.4, 4, 0.08),
            nodeMaterial
        );
        group.add(rect);

        this._addSpriteLabel(group, value.toString(), 0.6);

        this.scene.add(group);
        this.objects[id] = { group, type: "ll_node" };

        if (gsap) gsap.from(group.scale, { x: 0, y: 0, z: 0, duration: 0.6, ease: "back.out(1.7)" });
    };

    GSAPEngine.prototype.listNext = function (id1, id2) {
        const obj1 = this.objects[id1];
        const obj2 = this.objects[id2];
        if (!obj1 || !obj2) return;

        const p1 = obj1.group.position;
        const p2 = obj2.group.position;

        const mid = new THREE.Vector3((p1.x + p2.x) / 2, p1.y, 0);
        const curve = new THREE.QuadraticBezierCurve3(
            p1.clone(),
            mid.clone().add(new THREE.Vector3(0, 0.4, 0)),
            p2.clone()
        );

        const geometry = new THREE.TubeGeometry(curve, 20, 0.04, 8, false);
        const mesh = new THREE.Mesh(geometry, MAT_LASER.clone());

        this.scene.add(mesh);
        this.connections.push({ id1, id2, mesh });

        if (gsap) {
            mesh.scale.set(0, 0, 0);
            gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: "power2.out" });
        }
    };

    GSAPEngine.prototype.listHighlight = function (id, colorHex = COLORS.blue) {
        const obj = this.objects[id];
        if (!obj || !this.tl) return;
        this.highlight(id, colorHex);
    };

    GSAPEngine.prototype.listCompare = function (id1, id2) {
        const obj1 = this.objects[id1];
        const obj2 = this.objects[id2];
        if (!obj1 || !obj2 || !this.tl) return;
        this.bump(id1, id2);
    };

    GSAPEngine.prototype.listInsertAfter = function (prevId, newId, offset = 1.8) {
        const prev = this.objects[prevId];
        const node = this.objects[newId];
        if (!prev || !node || !this.tl) return;

        const px = prev.group.position.x;
        const py = prev.group.position.y;

        this.move(newId, { x: px + offset, y: py, z: 0 }, 1);
        this.listNext(prevId, newId);
    };

    GSAPEngine.prototype.listDelete = function (id) {
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
            return 1.4;  // Above node, tier 1 (reduced from 1.8)
        } else if (lowerPtrId === 'tail' || lowerPtrId === 'prev' || lowerPtrId === 'fast' || lowerPtrId === 'p2') {
            return 2.4;  // Above node, tier 2 (reduced from 2.6)
        } else if (lowerPtrId === 'temp' || lowerPtrId === 'next') {
            return -1.3; // Below node, tier 1 (slightly closer)
        } else {
            const hash = pointerId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
            // Compact hashing distribution
            return (hash % 2 === 0) ? 1.4 + (hash % 3) * 0.5 : -1.3 - (hash % 2) * 0.5;
        }
    };

    GSAPEngine.prototype.listMovePointer = function (ptrId, targetId) {
        const ptr = this.objects[ptrId];
        const target = this.objects[targetId];
        if (!ptr || !target || !this.tl) return;

        const yOffset = ptr.yOffset || getPointerYOffset(ptrId);
        const pos = target.group.position.clone();
        pos.y += yOffset;
        pos.z += 0.5;
        this.move(ptrId, pos, 0.6);
    };

    GSAPEngine.prototype.createListPointer = function (id, label, x = 0, y = 0) {
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
        this.objects[id] = { group, type: "pointer", yOffset };

        if (gsap) gsap.from(group.scale, { x: 0, y: 0, z: 0, duration: 0.5, ease: "back.out(1.5)" });
    };
}
