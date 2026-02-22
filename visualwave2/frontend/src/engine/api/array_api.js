/**
 * array_api.js - Array Data Structure API
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { MAT_GLOW } from '../materials.js';

export function registerArrayAPI(GSAPEngine) {
    GSAPEngine.prototype.arrays = {};

    GSAPEngine.prototype.createArrayAPI = function (arrId, values, anchorX = null, y = 0) {
        if (!this.arrays[arrId]) this.arrays[arrId] = { baseX: 0, y, cellWidth: 2.2, cells: [] };
        const arr = this.arrays[arrId];
        arr.cells = [];
        
        // Dynamic centering if anchorX is not provided
        // Total width = len * cellWidth
        // Center x = -width / 2 + cellWidth / 2 (to center the block of cells)
        const totalWidth = values.length * arr.cellWidth;
        const startX = (anchorX !== null) ? anchorX : -(totalWidth / 2) + (arr.cellWidth / 2);
        
        arr.baseX = startX;

        values.forEach((val, i) => {
            const id = `${arrId}_${i}`;
            const x = startX + i * arr.cellWidth;
            // Skip collision detection for aligned array elements
            this.createRoundedCube(id, val, { x, y, z: 0 }, true);
            arr.cells.push(id);
        });
    };

    GSAPEngine.prototype.arrayHighlight = function (arrId, index, color = 0x10b981) {
        const arr = this.arrays[arrId]; if (!arr) return;
        const id = arr.cells[index];
        if (id) this.highlight(id, color);
    };

    GSAPEngine.prototype.arrayCompare = function (arrId, i, j) {
        const arr = this.arrays[arrId]; if (!arr) return;
        const id1 = arr.cells[i];
        const id2 = arr.cells[j];
        if (id1 && id2) this.bump(id1, id2);
    };

    GSAPEngine.prototype.arrayUpdate = function (arrId, index, newVal) {
        const arr = this.arrays[arrId]; if (!arr) return;
        const id = arr.cells[index];
        const obj = this.objects[id]; if (!obj) return;
        obj.group.children = obj.group.children.filter(c => !c.isSprite);
        this._addSpriteLabel(obj.group, newVal.toString(), 1.2);
        this.pulse(id);
    };

    GSAPEngine.prototype.arrayInsert = function (arrId, index, value) {
        const arr = this.arrays[arrId]; if (!arr) return;
        for (let i = arr.cells.length - 1; i >= index; i--) {
            const id = arr.cells[i];
            const newX = arr.baseX + (i + 1) * arr.cellWidth;
            this.move(id, { x: newX, y: arr.y }, 0.8);
            arr.cells[i + 1] = id;
        }
        const newId = `${arrId}_${Date.now()}`;
        const x = arr.baseX + index * arr.cellWidth;
        // Skip collision detection for aligned array elements
        this.createRoundedCube(newId, value, { x, y: arr.y, z: 0 }, true);
        arr.cells[index] = newId;
        this.pulse(newId);
    };

    GSAPEngine.prototype.arrayDelete = function (arrId, index) {
        const arr = this.arrays[arrId]; if (!arr) return;
        const id = arr.cells[index];
        const obj = this.objects[id]; if (obj) this.shake(id);
        if (obj && gsap) {
            gsap.to(obj.group.scale, {
                x: 0, y: 0, z: 0, duration: 0.3,
                onComplete: () => { this.scene.remove(obj.group); delete this.objects[id]; }
            });
        }
        for (let i = index + 1; i < arr.cells.length; i++) {
            const id2 = arr.cells[i];
            const newX = arr.baseX + (i - 1) * arr.cellWidth;
            this.move(id2, { x: newX, y: arr.y }, 0.8);
            arr.cells[i - 1] = id2;
        }
        arr.cells.pop();
    };

    GSAPEngine.prototype.arraySwap = function (arrId, i, j) {
        const arr = this.arrays[arrId]; if (!arr) return;
        const id1 = arr.cells[i];
        const id2 = arr.cells[j];
        
        // Calculate target X positions based on array indices
        const targetX1 = arr.baseX + j * arr.cellWidth;
        const targetX2 = arr.baseX + i * arr.cellWidth;
        
        // Pass explicit targets to avoid stale position data issues
        this.swap(id1, id2, 1.2, targetX1, targetX2);

        // Update tracking
        const tmp = arr.cells[i];
        arr.cells[i] = arr.cells[j];
        arr.cells[j] = tmp;
    };

    // Async version that returns Promise resolving when swap animation completes
    GSAPEngine.prototype.arraySwapAsync = function (arrId, i, j, duration = 1.2) {
        const arr = this.arrays[arrId]; if (!arr) return Promise.resolve();
        const id1 = arr.cells[i];
        const id2 = arr.cells[j];
        const obj1 = this.objects[id1];
        const obj2 = this.objects[id2];
        
        if (!obj1 || !obj2) return Promise.resolve();
        
        // Calculate target X positions based on array indices
        const targetX1 = arr.baseX + j * arr.cellWidth;
        const targetX2 = arr.baseX + i * arr.cellWidth;
        
        // Update tracking immediately
        const tmp = arr.cells[i];
        arr.cells[i] = arr.cells[j];
        arr.cells[j] = tmp;
        
        // Return Promise that resolves when animation completes
        return new Promise((resolve) => {
            const pos1Y = obj1.group.position.y;
            const pos1Z = obj1.group.position.z;
            const pos2Y = obj2.group.position.y;
            const pos2Z = obj2.group.position.z;
            
            // Track completion of both objects
            let completed = 0;
            const checkComplete = () => {
                completed++;
                if (completed >= 2) resolve();
            };
            
            // Animate obj1 to destination
            gsap.to(obj1.group.position, { x: targetX1, duration, ease: "power2.inOut", onComplete: checkComplete });
            gsap.to(obj1.group.position, { y: pos1Y + 1.5, duration: duration / 2, yoyo: true, repeat: 1, ease: "sine.inOut" });
            gsap.to(obj1.group.position, { z: pos1Z + 1.2, duration: duration / 2, yoyo: true, repeat: 1, ease: "sine.inOut" });
            
            // Animate obj2 to destination
            gsap.to(obj2.group.position, { x: targetX2, duration, ease: "power2.inOut", onComplete: checkComplete });
            gsap.to(obj2.group.position, { y: pos2Y - 1.5, duration: duration / 2, yoyo: true, repeat: 1, ease: "sine.inOut" });
            gsap.to(obj2.group.position, { z: pos2Z - 1.2, duration: duration / 2, yoyo: true, repeat: 1, ease: "sine.inOut" });
        });
    };

    GSAPEngine.prototype.arrayMovePointer = function (arrId, index, pointerId) {
        const ptrKey = `ptr_${pointerId}`;

        // Determine pointer vertical position based on ID
        // Maximum separation to prevent label interference
        let yOffset;
        const lowerPtrId = pointerId.toLowerCase();

        if (lowerPtrId === 'i' || lowerPtrId === 'left' || lowerPtrId === 'start' || lowerPtrId === 'lo' || lowerPtrId === 'l') {
            yOffset = 2.0;  // Above array, tier 1 (Compact)
        } else if (lowerPtrId === 'j' || lowerPtrId === 'right' || lowerPtrId === 'end' || lowerPtrId === 'hi' || lowerPtrId === 'r') {
            yOffset = 3.5;  // Above array, tier 2 (Compact)
        } else if (lowerPtrId === 'maxleft' || lowerPtrId === 'max_left') {
            yOffset = 5.0;  // High above (tier 3)
        } else if (lowerPtrId === 'maxright' || lowerPtrId === 'max_right') {
            yOffset = 5.0;  // High above (tier 3)
        } else if (lowerPtrId === 'k' || lowerPtrId === 'mid' || lowerPtrId === 'pivot') {
            yOffset = -2.2;  // Below array
        } else if (lowerPtrId === 'temp' || lowerPtrId === 'tmp' || lowerPtrId === 'current' || lowerPtrId === 'val' || !isNaN(Number(pointerId))) {
            // "Temp" variables or raw numbers (indices) get a special "Sky Zone"
            // Reduced from 8.0 to 5.5
            yOffset = 5.5; 
        } else if (lowerPtrId.startsWith('ptr_') || lowerPtrId === 'slow' || lowerPtrId === 'p1') {
            yOffset = -2.2; 
        } else if (lowerPtrId === 'fast' || lowerPtrId === 'p2') {
            yOffset = -3.8; 
        } else {
            // Default: distribute based on hash but keep away from center
            const hash = pointerId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
            yOffset = (hash % 2 === 0) ? 2.5 + (hash % 3) * 1.0 : -2.5 - (hash % 3) * 1.0;
        }

        if (!this.objects[ptrKey]) {
            const group = new THREE.Group();

            // Color coding based on pointer ID for better distinction
            let pointerColor;
            if (lowerPtrId === 'i') {
                pointerColor = 0x00ff88; // Green for i
            } else if (lowerPtrId === 'j') {
                pointerColor = 0xffaa00; // Orange for j
            } else {
                pointerColor = yOffset > 0 ? 0x00ff88 : 0xff6688;
            }
            
            const material = MAT_GLOW.clone();
            material.color.setHex(pointerColor);
            material.emissive.setHex(pointerColor);
            material.emissiveIntensity = 1.2;

            // Single cone pointing towards the array element
            // Cones point UP (+Y) by default. If pointer is above array, flip it to point DOWN.
            const coneHeight = 1.2;
            const coneRadius = 0.4;
            const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 8);
            if (yOffset > 0) {
                // Pointer is ABOVE array, flip cone to point DOWN
                coneGeo.rotateZ(Math.PI);
            }
            // If yOffset < 0, pointer is below and cone points up naturally
            const cone = new THREE.Mesh(coneGeo, material);
            // Offset cone so tip is at group origin
            cone.position.y = yOffset > 0 ? coneHeight / 2 : -coneHeight / 2;
            group.add(cone);

            // Position labels just above the cone base (as shown in user's sketch)
            // Both i and j labels positioned at the top of the cone
            let labelYOffset;
            if (lowerPtrId === 'i') {
                labelYOffset = 0.15; // Tighter to cone base
            } else if (lowerPtrId === 'j') {
                labelYOffset = 0.15; // Tighter to cone base (same as i)
            } else {
                labelYOffset = yOffset > 0 ? 0.4 : -0.4; // Standard position for others
            }
            
            this._addSpriteLabel(group, pointerId.toUpperCase(), labelYOffset, 1.0);

            this.scene.add(group);
            this.objects[ptrKey] = { group, type: 'pointer', yOffset };
        }

        const arr = this.arrays[arrId]; if (!arr) return;
        const targetId = arr.cells[index]; if (!targetId) return;
        const target = this.objects[targetId];
        if (!target || !target.group) return;

        const pos = target.group.position;
        const storedYOffset = this.objects[ptrKey].yOffset || yOffset;

        // Animate pointer to new position (faster for snappier movement)
        this.move(ptrKey, { x: pos.x, y: pos.y + storedYOffset, z: pos.z + 0.5 }, 0.4);
    };

    // Async version that returns a Promise resolving when pointer animation completes
    GSAPEngine.prototype.arrayMovePointerAsync = function (arrId, index, pointerId, duration = 0.4) {
        const ptrKey = `ptr_${pointerId}`;

        // Determine pointer vertical position based on ID
        let yOffset;
        const lowerPtrId = pointerId.toLowerCase();

        if (lowerPtrId === 'i' || lowerPtrId === 'left' || lowerPtrId === 'start' || lowerPtrId === 'lo' || lowerPtrId === 'l') {
            yOffset = 2.0;
        } else if (lowerPtrId === 'j' || lowerPtrId === 'right' || lowerPtrId === 'end' || lowerPtrId === 'hi' || lowerPtrId === 'r') {
            yOffset = 3.5;
        } else if (lowerPtrId === 'k' || lowerPtrId === 'mid' || lowerPtrId === 'pivot') {
            yOffset = -2.2;
        } else if (lowerPtrId.startsWith('ptr_') || lowerPtrId === 'slow' || lowerPtrId === 'p1') {
            yOffset = -2.2;
        } else if (lowerPtrId === 'fast' || lowerPtrId === 'p2') {
            yOffset = -3.8;
        } else {
            const hash = pointerId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
            yOffset = (hash % 2 === 0) ? 2.5 + (hash % 3) * 0.6 : -2.5 - (hash % 3) * 0.6;
        }

        if (!this.objects[ptrKey]) {
            const group = new THREE.Group();

            let pointerColor;
            if (lowerPtrId === 'i') {
                pointerColor = 0x00ff88;
            } else if (lowerPtrId === 'j') {
                pointerColor = 0xffaa00;
            } else {
                pointerColor = yOffset > 0 ? 0x00ff88 : 0xff6688;
            }
            
            const material = MAT_GLOW.clone();
            material.color.setHex(pointerColor);
            material.emissive.setHex(pointerColor);
            material.emissiveIntensity = 1.2;

            const coneHeight = 1.2;
            const coneRadius = 0.4;
            const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 8);
            if (yOffset > 0) {
                coneGeo.rotateZ(Math.PI);
            }
            const cone = new THREE.Mesh(coneGeo, material);
            cone.position.y = yOffset > 0 ? coneHeight / 2 : -coneHeight / 2;
            group.add(cone);

            let labelYOffset;
            if (lowerPtrId === 'i') {
                labelYOffset = 0.15;
            } else if (lowerPtrId === 'j') {
                labelYOffset = 0.15;
            } else {
                labelYOffset = yOffset > 0 ? 0.4 : -0.4;
            }
            
            this._addSpriteLabel(group, pointerId.toUpperCase(), labelYOffset, 1.0);

            this.scene.add(group);
            this.objects[ptrKey] = { group, type: 'pointer', yOffset };
        }

        const arr = this.arrays[arrId];
        if (!arr) return Promise.resolve();
        
        const targetId = arr.cells[index];
        if (!targetId) return Promise.resolve();
        
        const target = this.objects[targetId];
        if (!target || !target.group) return Promise.resolve();

        const pos = target.group.position;
        const storedYOffset = this.objects[ptrKey].yOffset || yOffset;

        const ptrObj = this.objects[ptrKey];
        if (!ptrObj || !ptrObj.group) return Promise.resolve();

        // Return Promise that resolves when animation completes
        return new Promise((resolve) => {
            gsap.to(ptrObj.group.position, {
                x: pos.x,
                y: pos.y + storedYOffset,
                z: pos.z + 0.5,
                duration: duration,
                ease: "power2.out",
                onComplete: resolve
            });
        });
    };

    // Clear highlights from array elements
    GSAPEngine.prototype.arrayClearHighlights = function (arrId, ...indices) {
        const arr = this.arrays[arrId];
        if (!arr) return;

        const targetIndices = indices.length > 0 ? indices : arr.cells.map((_, i) => i);
        const defaultColor = new THREE.Color(0x8b5cf6); // Default purple color

        targetIndices.forEach(index => {
            const id = arr.cells[index];
            const obj = this.objects[id];
            if (!obj) return;

            // Find material to reset
            let target = null;
            if (obj.mesh && obj.mesh.material) target = obj.mesh.material;
            else if (obj.group) {
                obj.group.traverse((child) => {
                    if (!target && child.isMesh && child.material && child.material.color) {
                        target = child.material;
                    }
                });
            }

            if (target && gsap) {
                gsap.to(target.color, { 
                    r: defaultColor.r, 
                    g: defaultColor.g, 
                    b: defaultColor.b, 
                    duration: 0.2 
                });
                if (target.emissive) {
                    gsap.to(target.emissive, { 
                        r: defaultColor.r, 
                        g: defaultColor.g, 
                        b: defaultColor.b, 
                        duration: 0.2 
                    });
                }
            }
        });
    };

    // Add floating text label above array element
    GSAPEngine.prototype.arrayAddLabel = function (arrId, index, text, color = '#ffff00', labelId = null) {
        const arr = this.arrays[arrId];
        if (!arr) return;

        const targetId = arr.cells[index];
        const target = this.objects[targetId];
        if (!target || !target.group) return;

        const pos = target.group.position;
        const id = labelId || `label_${arrId}_${index}_${Date.now()}`;

        // Create canvas for text
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, 512, 128);
        ctx.font = 'bold 48px Arial';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText(text, 256, 70);

        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(pos.x, pos.y + 4.25, pos.z);
        sprite.scale.set(0, 0, 0);

        this.scene.add(sprite);
        this.objects[id] = { group: sprite, type: 'label' };

        // Animate in
        if (gsap) {
            gsap.to(sprite.scale, { x: 5, y: 1.5, z: 1, duration: 0.3, ease: 'back.out(1.7)' });
        }

        return id;
    };

    // Clear specific label
    GSAPEngine.prototype.arrayClearLabel = function (labelId) {
        const obj = this.objects[labelId];
        if (!obj || obj.type !== 'label') return;

        if (gsap) {
            gsap.to(obj.group.scale, {
                x: 0, y: 0, z: 0,
                duration: 0.2,
                onComplete: () => {
                    if (obj.group.parent) obj.group.parent.remove(obj.group);
                    if (obj.group.material && obj.group.material.map) {
                        obj.group.material.map.dispose();
                    }
                    if (obj.group.material) obj.group.material.dispose();
                    delete this.objects[labelId];
                }
            });
        } else {
            this.scene.remove(obj.group);
            delete this.objects[labelId];
        }
    };

    // Clear all labels
    GSAPEngine.prototype.arrayClearAllLabels = function () {
        Object.keys(this.objects).forEach(id => {
            if (this.objects[id].type === 'label') {
                this.arrayClearLabel(id);
            }
        });
    };

    // Highlight a range of array elements with background
    GSAPEngine.prototype.arrayHighlightRange = function (arrId, startIdx, endIdx, color = 0x3b82f6, opacity = 0.2, rangeId = null) {
        const arr = this.arrays[arrId];
        if (!arr || startIdx < 0 || endIdx >= arr.cells.length) return;

        const id = rangeId || `range_${arrId}_${startIdx}_${endIdx}_${Date.now()}`;

        // Calculate dimensions
        const startId = arr.cells[startIdx];
        const endId = arr.cells[endIdx];
        const startObj = this.objects[startId];
        const endObj = this.objects[endId];
        
        if (!startObj || !endObj) return;

        const startX = startObj.group.position.x;
        const endX = endObj.group.position.x;
        const centerX = (startX + endX) / 2;
        const width = Math.abs(endX - startX) + arr.cellWidth;
        const height = 1.2;

        // Create semi-transparent plane
        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const plane = new THREE.Mesh(geometry, material);
        plane.position.set(centerX, arr.y, -0.5); // Behind the cubes

        this.scene.add(plane);
        this.objects[id] = { group: plane, type: 'range_highlight', mesh: plane };

        // Fade in
        if (gsap) {
            gsap.to(material, { opacity: opacity, duration: 0.4, ease: 'power2.out' });
        }

        return id;
    };

    // Remove range highlight
    GSAPEngine.prototype.arrayClearRangeHighlight = function (rangeId) {
        const obj = this.objects[rangeId];
        if (!obj || obj.type !== 'range_highlight') return;

        if (gsap && obj.mesh && obj.mesh.material) {
            gsap.to(obj.mesh.material, {
                opacity: 0,
                duration: 0.3,
                onComplete: () => {
                    if (obj.group.parent) obj.group.parent.remove(obj.group);
                    if (obj.mesh.geometry) obj.mesh.geometry.dispose();
                    if (obj.mesh.material) obj.mesh.material.dispose();
                    delete this.objects[rangeId];
                }
            });
        } else {
            this.scene.remove(obj.group);
            delete this.objects[rangeId];
        }
    };
}
