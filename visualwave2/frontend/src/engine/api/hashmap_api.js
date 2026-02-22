/**
 * hashmap_api.js - HashMap Data Structure API
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { MAT_CERAMIC } from '../materials.js';

function _hash_createTextSprite(text) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 128;
    ctx.font = "bold 56px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(text, 128, 80);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 1, 1);
    return sprite;
}

export function registerHashMapAPI(GSAPEngine) {

    GSAPEngine.prototype.hashmaps = {};

    GSAPEngine.prototype.createHashMap = function (mapId, bucketCount = 8, startX = -6, y = 0) {
        console.log(`[HashMapAPI] createHashMap called with: mapId=${mapId}, bucketCount=${bucketCount}, startX=${startX}, y=${y}`);
        if (this.hashmaps[mapId]) {
             console.warn(`[HashMapAPI] Map ${mapId} already exists!`);
             return;
        }

        // Initialize as empty dictionary style
        this.hashmaps[mapId] = { 
            items: [], // Stores { key, value, sprite, keyValString }
            leftBrace: null, 
            rightBrace: null,
            group: new THREE.Group(),
            x: startX,
            y: y
        };

        const map = this.hashmaps[mapId];
        map.group.position.set(startX, y, 0);
        this.scene.add(map.group);

        // Create Braces
        map.leftBrace = _hash_createTextSprite("{");
        map.rightBrace = _hash_createTextSprite("}");
        
        // Initial positions (centered empty set)
        map.leftBrace.position.set(-0.5, 0, 0);
        map.rightBrace.position.set(0.5, 0, 0);
        
        map.group.add(map.leftBrace);
        map.group.add(map.rightBrace);

        // Animate appearance
        if (gsap) {
            gsap.from(map.leftBrace.scale, { x: 0, y: 0, z: 0, duration: 0.5, ease: "back.out(1.7)" });
            gsap.from(map.rightBrace.scale, { x: 0, y: 0, z: 0, duration: 0.5, delay: 0.1, ease: "back.out(1.7)" });
        }
    };

    GSAPEngine.prototype.hashSet = function (mapId, bucketIndex, key, value) {
        const map = this.hashmaps[mapId];
        if (!map) return;

        // Check if key already exists
        const existingItem = map.items.find(item => item.key === key);

        if (existingItem) {
            // Update existing value
            existingItem.value = value;
            const newText = `${key}:${value}`;
            
            // Only update sprite if text changed
            if (existingItem.keyValString !== newText) {
                map.group.remove(existingItem.sprite);
                const newSprite = _hash_createTextSprite(newText);
                newSprite.position.copy(existingItem.sprite.position);
                map.group.add(newSprite);
                existingItem.sprite = newSprite;
                existingItem.keyValString = newText;
                
                // Pulse effect for update
                this.pulseObject(newSprite);
            }
        } else {
            // Add new item
            const newText = `${key}:${value}`;
            const sprite = _hash_createTextSprite(newText);
            
            // Add to list
            map.items.push({ key, value, sprite, keyValString: newText });
            map.group.add(sprite);
            
            // Animate entry
            if (gsap) gsap.from(sprite.scale, { x: 0, y: 0, z: 0, duration: 0.4, ease: "back.out(1.7)" });
        
            // Triggers layout update
            this._layoutHashMap(mapId);
        }
    };

    // Helper to layout the dictionary items linearly
    GSAPEngine.prototype._layoutHashMap = function(mapId) {
        const map = this.hashmaps[mapId];
        if (!map) return;

        // Constants
        const BRACE_WIDTH = 0.6;
        const ITEM_PADDING = 0.5; // Space between items
        const BRACE_PADDING = 0.4; // Space between brace and content
        
        let currentX = 0;

        // 1. Position Left Brace
        // We'll center the whole structure later, so just build from 0 for now
        map.leftBrace.position.set(currentX, 0, 0);
        currentX += BRACE_WIDTH + BRACE_PADDING;

        // 2. Position Items
        map.items.forEach((item, index) => {
            // Estimate width based on text length (approximate)
            const textLen = item.keyValString.length;
            const itemWidth = Math.max(1.0, textLen * 0.35); // Heuristic width
            
            item.sprite.position.set(currentX + itemWidth / 2, 0, 0);
            
            // Move cursor
            currentX += itemWidth;
            
            // Add padding if not last
            if (index < map.items.length - 1) {
                currentX += ITEM_PADDING;
            }
        });

        // 3. Position Right Brace
        currentX += BRACE_PADDING;
        map.rightBrace.position.set(currentX, 0, 0);
        
        // 4. Center the whole group visually around its origin
        const totalWidth = currentX;
        const offsetX = -totalWidth / 2;
        
        // Apply centering by shifting all children
        map.group.children.forEach(child => {
            child.position.x += offsetX;
        });

        // If we want to animate the expansion, we can tween the positions
        // But direct set is fine for now; the "entry" animation handles the pop-in
    };
    
    GSAPEngine.prototype.pulseObject = function(obj) {
       if (gsap) {
           gsap.to(obj.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 0.1, yoyo: true, repeat: 1 });
       }
    };

    // Convenience wrapper: auto-computes bucket index from key hash
    // This is what IntentDispatcher calls
    GSAPEngine.prototype.hashmapSet = function (mapId, key, value) {
         // We ignore bucketIndex logic now, just pass through
         this.hashSet(mapId, 0, key, value);
    };

    GSAPEngine.prototype.hashmapGet = function (mapId, key) {
        const map = this.hashmaps[mapId];
        if (!map) return;
        const item = map.items.find(i => i.key === key);
        if (item) {
             this.pulseObject(item.sprite);
             this.createBeam(item.sprite.position.clone().add(map.group.position), 0x10b981);
        }
    };

    GSAPEngine.prototype.hashmapDelete = function (mapId, key) {
         const map = this.hashmaps[mapId];
         if (!map) return;
         
         const index = map.items.findIndex(i => i.key === key);
         if (index !== -1) {
             const item = map.items[index];
             
             // Animate out
             if (gsap) {
                 gsap.to(item.sprite.scale, { 
                     x: 0, y: 0, z: 0, 
                     duration: 0.3, 
                     onComplete: () => {
                         map.group.remove(item.sprite);
                         map.items.splice(index, 1);
                         this._layoutHashMap(mapId); // Re-layout after removal
                     }
                 });
             } else {
                 map.group.remove(item.sprite);
                 map.items.splice(index, 1);
                 this._layoutHashMap(mapId);
             }
         }
    };

    GSAPEngine.prototype.hashmapHighlight = function (mapId, key, color) {
        const map = this.hashmaps[mapId];
        if (!map) return;
        const item = map.items.find(i => i.key === key);
        if (item) {
            // Cannot easily tint sprite without material change, use beam/highlight helper
             this.createBeam(item.sprite.position.clone().add(map.group.position), color);
        }
    };

    // Deprecated/Stubbed methods for compatibility
    GSAPEngine.prototype.hashRemove = function (mapId, bucketIndex) { /* No-op */ };
    GSAPEngine.prototype.hashBump = function (mapId, bucketIndex) { /* No-op */ };
    GSAPEngine.prototype.hashShake = function (mapId, bucketIndex) { /* No-op */ };
    GSAPEngine.prototype.hashHighlight = function (mapId, bucketIndex, color = 0x10b981) { /* No-op */ };
}
