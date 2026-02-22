/**
 * stack_api.js - Stack Data Structure API
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { MAT_CERAMIC, COLORS } from '../materials.js';

export function registerStackAPI(GSAPEngine) {

    GSAPEngine.prototype.createStack = function (stackId, x = 0, y = 0) {
        if (this.objects[stackId]) return;

        const group = new THREE.Group();
        group.position.set(x, y, 0);

        const base = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.4, 1.5), MAT_CERAMIC.clone());
        base.position.y = -0.2;
        group.add(base);

        const railMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3.2, 0.1), railMat);
        const rightRail = leftRail.clone();
        leftRail.position.set(-1.2, 1.3, 0);
        rightRail.position.set(1.2, 1.3, 0);

        group.add(leftRail);
        group.add(rightRail);

        this.scene.add(group);
        this.objects[stackId] = { group, type: "stack", items: [] };
    };

    GSAPEngine.prototype.stackPush = function (stackId, itemId, value) {
        const stack = this.objects[stackId];
        if (!stack) return;

        const index = stack.items.length;
        const finalY = index * 0.65 + 0.7; // Compact spacing while avoiding overlap

        // Create disk - uniform size for string labels (DFS), proportional for numbers (Hanoi)
        // If value is a string (like "A", "B"), use fixed size
        // If value is a number, use proportional sizing for Tower of Hanoi
        // Fixed size for all stack elements as requested by user
        const diskScale = 1.0;
        
        const group = new THREE.Group();
        group.position.set(
            stack.group.position.x,
            stack.group.position.y + 6,
            0
        );
        
        const geometry = new RoundedBoxGeometry(diskScale * 1.3, 0.6, 1.5, 4, 0.08);
        geometry.computeVertexNormals();
        
        const mesh = new THREE.Mesh(
            geometry,
            new THREE.MeshPhysicalMaterial({
                color: 0xef4444, // Red color
                metalness: 0.9,
                roughness: 0.1,
                clearcoat: 1.0,
                clearcoatRoughness: 0.05,
                envMapIntensity: 1.5,
                reflectivity: 1.0
            })
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Apply environment map after mesh creation
        if (this.scene && this.scene.environment) {
            mesh.material.envMap = this.scene.environment;
            mesh.material.needsUpdate = true;
        }
        group.add(mesh);
        
        this._addSpriteLabel(group, value.toString(), 0.7);
        this.scene.add(group);
        this.objects[itemId] = { group, mesh, type: 'cube', id: itemId };

        stack.items.push(itemId);

        this.move(itemId, { x: stack.group.position.x, y: stack.group.position.y + finalY, z: 0 }, 0.9);
        this.pulse(itemId);
        // Removed focusCamera to prevent camera reset during Tower of Hanoi
        // this.focusCamera(itemId);
    };

    GSAPEngine.prototype.stackPop = function (stackId) {
        const stack = this.objects[stackId];
        if (!stack || stack.items.length === 0) return;

        const topId = stack.items.pop();
        const obj = this.objects[topId];
        if (!obj) return;

        this._enableTransparency(obj.group);

        if (this.tl) {
            this.tl.to(obj.group.position, { y: obj.group.position.y + 2, duration: 0.4, ease: "power1.out" });
            this.tl.to(obj.group.scale, { x: 0, y: 0, z: 0, duration: 0.5, ease: "power2.in" }, "<");

            obj.group.traverse((child) => {
                if (child.isMesh && child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(mat => {
                        this.tl.to(mat, { opacity: 0, duration: 0.5, ease: "power2.in" }, "<");
                    });
                }
            });

            this.tl.call(() => { this.scene.remove(obj.group); delete this.objects[topId]; });
        }
    };

    GSAPEngine.prototype.stackPeek = function (stackId) {
        const stack = this.objects[stackId];
        if (!stack || stack.items.length === 0) return;
        const topId = stack.items[stack.items.length - 1];
        this.highlight(topId, COLORS.orange);
        this.focusCamera(topId);
    };
    // Move an item from one stack to another (for Tower of Hanoi)
    GSAPEngine.prototype.stackMove = function (fromStackId, toStackId, itemId) {
        const fromStack = this.objects[fromStackId];
        const toStack = this.objects[toStackId];
        if (!fromStack || !toStack) return;

        // Remove from source stack
        const index = fromStack.items.indexOf(itemId);
        if (index > -1) {
            fromStack.items.splice(index, 1);
        }

        const obj = this.objects[itemId];
        if (!obj) return;

        // Calculate target position on destination stack
        const targetIndex = toStack.items.length;
        const targetY = toStack.group.position.y + targetIndex * 0.65 + 0.7; // Match stackPush spacing

        // Animate: lift up, move across, place down
        if (this.tl) {
            // Lift up
            this.tl.to(obj.group.position, {
                y: obj.group.position.y + 1.5, // Reduced from 3 to 1.5
                duration: 0.3,
                ease: "power2.out"
            });

            // Move across
            this.tl.to(obj.group.position, {
                x: toStack.group.position.x,
                duration: 0.5,
                ease: "power1.inOut"
            });

            // Place down
            this.tl.to(obj.group.position, {
                y: targetY,
                z: toStack.group.position.z,
                duration: 0.3,
                ease: "power2.in"
            });
        }

        // Add to destination stack
        toStack.items.push(itemId);
    };

    GSAPEngine.prototype.stackUnderflow = function (stackId) {
        const stack = this.objects[stackId];
        if (!stack) return;
        this.shake(stackId);
    };
}


