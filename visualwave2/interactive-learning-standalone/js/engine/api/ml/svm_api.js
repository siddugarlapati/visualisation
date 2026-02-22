/**
 * svm_api.js - Support Vector Machine Visualization
 * Implements hyperplane rotation, margin expansion, and support vector highlighting
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { ML_COLORS, microAutoFocus } from './ml_base.js';

/**
 * Register SVM visualization methods on GSAPEngine
 */
export function registerSVMAPI(GSAPEngine) {
    
    // SVM data storage
    GSAPEngine.prototype.svmData = {
        points: [],
        hyperplane: null,
        marginPlanes: [],
        supportVectors: []
    };

    /**
     * Spawn SVM data point
     */
    GSAPEngine.prototype.spawnSVMPoint = function (id, x, y, classLabel, options = {}) {
        if (this.objects[id]) return;

        const { size = 0.3, delay = 0 } = options;
        const color = classLabel === 0 ? ML_COLORS.class0 : ML_COLORS.class1;

        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.3,
            roughness: 0.4,
            metalness: 0.6,
            transparent: true
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, 0);
        mesh.scale.set(0, 0, 0);

        this.scene.add(mesh);
        this.objects[id] = { group: mesh, mesh, type: 'svm_point', classLabel, x, y, isSupportVector: false };
        this.svmData.points.push({ id, x, y, classLabel, mesh });

        gsap.to(mesh.scale, {
            x: 1, y: 1, z: 1,
            duration: 0.4,
            delay,
            ease: "back.out(1.7)"
        });
    };

    /**
     * Spawn hyperplane (decision boundary)
     */
    GSAPEngine.prototype.spawnHyperplane = function (id, angle = 0, offset = 0) {
        if (this.objects[id]) return;

        // Main hyperplane
        const planeGeo = new THREE.PlaneGeometry(25, 0.1);
        const planeMat = new THREE.MeshBasicMaterial({
            color: 0xaa44ff,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.z = angle;
        plane.position.x = offset;
        this.scene.add(plane);
        
        this.objects[id] = { group: plane, type: 'hyperplane', angle, offset };
        this.svmData.hyperplane = { id, plane, angle, offset };

        gsap.to(planeMat, { opacity: 0.8, duration: 0.8 });
    };

    /**
     * Spawn margin planes (parallel to hyperplane)
     */
    GSAPEngine.prototype.spawnMarginPlanes = function (marginWidth = 0) {
        const hyperplane = this.svmData.hyperplane;
        if (!hyperplane) return;

        const createMarginPlane = (direction, id) => {
            const planeGeo = new THREE.PlaneGeometry(25, 0.05);
            const planeMat = new THREE.MeshBasicMaterial({
                color: 0xaa44ff,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            });
            const plane = new THREE.Mesh(planeGeo, planeMat);
            plane.rotation.z = hyperplane.angle;
            plane.position.y = hyperplane.plane.position.y + direction * marginWidth;
            this.scene.add(plane);
            this.objects[id] = { group: plane, type: 'margin_plane', direction };
            return { id, plane, direction };
        };

        const upperMargin = createMarginPlane(1, 'margin_upper');
        const lowerMargin = createMarginPlane(-1, 'margin_lower');
        this.svmData.marginPlanes = [upperMargin, lowerMargin];

        // Also create margin region fill
        const regionGeo = new THREE.PlaneGeometry(25, marginWidth * 2);
        const regionMat = new THREE.MeshBasicMaterial({
            color: 0xaa44ff,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        const region = new THREE.Mesh(regionGeo, regionMat);
        region.rotation.z = hyperplane.angle;
        region.position.copy(hyperplane.plane.position);
        this.scene.add(region);
        this.objects['margin_region'] = { group: region, type: 'margin_region', width: marginWidth };
    };

    /**
     * Update hyperplane angle and position
     */
    GSAPEngine.prototype.updateHyperplane = function (id, newAngle, newOffset, duration = 1) {
        const obj = this.objects[id];
        if (!obj || obj.type !== 'hyperplane') return;

        const plane = obj.group;

        if (this.camera) {
            microAutoFocus(this.camera, new THREE.Vector3(newOffset, 0, 0), 0.1, duration);
        }

        gsap.to(plane.rotation, { z: newAngle, duration, ease: "sine.inOut" });
        gsap.to(plane.position, { x: newOffset, duration, ease: "power2.out" });

        // Update margin planes too
        this.svmData.marginPlanes.forEach(m => {
            gsap.to(m.plane.rotation, { z: newAngle, duration, ease: "sine.inOut" });
        });

        obj.angle = newAngle;
        obj.offset = newOffset;
    };

    /**
     * Expand margin width
     */
    GSAPEngine.prototype.expandMargin = function (newWidth, duration = 0.8) {
        this.svmData.marginPlanes.forEach(m => {
            const targetY = m.direction * newWidth;
            gsap.to(m.plane.position, { y: targetY, duration, ease: "power2.out" });
        });

        // Update margin region
        const region = this.objects['margin_region'];
        if (region) {
            gsap.to(region.group.scale, { y: newWidth * 2, duration, ease: "power2.out" });
        }
    };

    /**
     * Mark points as support vectors
     */
    GSAPEngine.prototype.markSupportVectors = function (pointIds) {
        pointIds.forEach(id => {
            const obj = this.objects[id];
            if (!obj || !obj.mesh) return;

            obj.isSupportVector = true;
            this.svmData.supportVectors.push(id);

            // Enlarge
            gsap.to(obj.mesh.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.4 });

            // Add glow ring
            const ringGeo = new THREE.RingGeometry(0.4, 0.5, 32);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0xffcc00,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.copy(obj.mesh.position);
            ring.rotation.x = -Math.PI / 2;
            this.scene.add(ring);
            this.objects[`sv_ring_${id}`] = { group: ring, type: 'sv_ring' };

            // Pulsing ring
            gsap.to(ring.scale, {
                x: 1.3, y: 1.3,
                duration: 0.8,
                yoyo: true,
                repeat: -1,
                ease: "sine.inOut"
            });
        });

        // Dim non-support vectors
        this.svmData.points.forEach(p => {
            if (!pointIds.includes(p.id)) {
                const obj = this.objects[p.id];
                if (obj && obj.mesh) {
                    gsap.to(obj.mesh.material, { opacity: 0.4, duration: 0.4 });
                }
            }
        });
    };

    /**
     * Show margin width indicator
     */
    GSAPEngine.prototype.showMarginIndicator = function (width) {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#aa44ff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Margin: ${width.toFixed(2)}`, 100, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(0, 8, 0);
        sprite.scale.set(4, 1, 1);
        this.scene.add(sprite);
        this.objects['margin_label'] = { group: sprite, type: 'label' };
    };

    /**
     * SVM convergence celebration
     */
    GSAPEngine.prototype.celebrateSVMConvergence = function () {
        // Pulse support vectors
        this.svmData.supportVectors.forEach(id => {
            const ring = this.objects[`sv_ring_${id}`];
            if (ring) {
                gsap.to(ring.group.scale, {
                    x: 2, y: 2,
                    duration: 0.3,
                    yoyo: true,
                    repeat: 2
                });
            }
        });

        // Hyperplane glow
        const hp = this.svmData.hyperplane;
        if (hp) {
            gsap.to(hp.plane.material, {
                opacity: 1,
                duration: 0.3,
                yoyo: true,
                repeat: 2
            });
        }
    };
}
