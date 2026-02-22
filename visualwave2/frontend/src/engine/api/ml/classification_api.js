/**
 * classification_api.js - Logistic Regression Classification Visualization
 * Implements decision boundary rotation, region shading, and probability bars
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { ML_COLORS, microAutoFocus } from './ml_base.js';

/**
 * Register Logistic Regression visualization methods on GSAPEngine
 */
export function registerClassificationAPI(GSAPEngine) {
    
    // Classification data storage
    GSAPEngine.prototype.classificationData = {
        points: [],
        boundary: null,
        regions: []
    };

    /**
     * Spawn classification point (class 0 = red, class 1 = blue)
     */
    GSAPEngine.prototype.spawnClassPoint = function (id, x, y, classLabel, options = {}) {
        if (this.objects[id]) return;

        const { size = 0.3, delay = 0 } = options;
        const color = classLabel === 0 ? ML_COLORS.class0 : ML_COLORS.class1;

        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.4,
            roughness: 0.3,
            metalness: 0.6,
            transparent: true
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, 0);
        mesh.scale.set(0, 0, 0);

        this.scene.add(mesh);
        this.objects[id] = { group: mesh, mesh, type: 'class_point', classLabel, x, y };
        this.classificationData.points.push({ id, x, y, classLabel, mesh });

        gsap.to(mesh.scale, {
            x: 1, y: 1, z: 1,
            duration: 0.4,
            delay,
            ease: "back.out(1.7)"
        });
    };

    /**
     * Spawn decision boundary line
     */
    GSAPEngine.prototype.spawnDecisionBoundary = function (id, angle = 0, offset = 0) {
        if (this.objects[id]) return;

        const length = 25;
        const points = [
            new THREE.Vector3(-length / 2, 0, 0),
            new THREE.Vector3(length / 2, 0, 0)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0xaa44ff,
            transparent: true,
            opacity: 0,
            linewidth: 2
        });

        const line = new THREE.Line(geometry, material);
        line.rotation.z = angle;
        line.position.x = offset;
        
        this.scene.add(line);
        this.objects[id] = { group: line, type: 'decision_boundary', angle, offset };
        this.classificationData.boundary = { id, line, angle, offset };

        gsap.to(material, { opacity: 0.9, duration: 0.8 });
    };

    /**
     * Rotate and shift decision boundary
     */
    GSAPEngine.prototype.updateDecisionBoundary = function (id, newAngle, newOffset, duration = 1) {
        const obj = this.objects[id];
        if (!obj || obj.type !== 'decision_boundary') return;

        const line = obj.group;

        // Camera auto-focus
        if (this.camera) {
            microAutoFocus(this.camera, new THREE.Vector3(newOffset, 0, 0), 0.08, duration);
        }

        gsap.to(line.rotation, {
            z: newAngle,
            duration,
            ease: "sine.inOut"
        });
        gsap.to(line.position, {
            x: newOffset,
            duration,
            ease: "power2.out"
        });

        obj.angle = newAngle;
        obj.offset = newOffset;
    };

    /**
     * Create region shading (red/blue semi-transparent planes)
     */
    GSAPEngine.prototype.createRegionShading = function () {
        const size = 20;
        
        // Red region (class 0 side)
        const redGeo = new THREE.PlaneGeometry(size, size);
        const redMat = new THREE.MeshBasicMaterial({
            color: ML_COLORS.class0,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });
        const redPlane = new THREE.Mesh(redGeo, redMat);
        redPlane.position.set(-size / 2, 0, -0.1);
        this.scene.add(redPlane);
        this.objects['region_class0'] = { group: redPlane, type: 'region' };

        // Blue region (class 1 side)
        const blueGeo = new THREE.PlaneGeometry(size, size);
        const blueMat = new THREE.MeshBasicMaterial({
            color: ML_COLORS.class1,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });
        const bluePlane = new THREE.Mesh(blueGeo, blueMat);
        bluePlane.position.set(size / 2, 0, -0.1);
        this.scene.add(bluePlane);
        this.objects['region_class1'] = { group: bluePlane, type: 'region' };

        this.classificationData.regions = [
            { id: 'region_class0', plane: redPlane, mat: redMat },
            { id: 'region_class1', plane: bluePlane, mat: blueMat }
        ];

        // Fade in subtly
        gsap.to([redMat, blueMat], { opacity: 0.08, duration: 1 });
    };

    /**
     * Update region shading intensity
     */
    GSAPEngine.prototype.updateRegionShading = function (intensity = 0.15) {
        this.classificationData.regions.forEach(r => {
            gsap.to(r.mat, { opacity: intensity, duration: 0.5 });
        });
    };

    /**
     * Create probability bar behind a point
     */
    GSAPEngine.prototype.createProbabilityBar = function (pointId, probability = 0.5) {
        const point = this.objects[pointId];
        if (!point) return;

        const barId = `prob_bar_${pointId}`;
        const maxHeight = 3;
        const barHeight = probability * maxHeight;

        const geometry = new THREE.BoxGeometry(0.15, barHeight, 0.15);
        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color().lerpColors(
                new THREE.Color(ML_COLORS.class0),
                new THREE.Color(ML_COLORS.class1),
                probability
            ),
            transparent: true,
            opacity: 0.6
        });

        const bar = new THREE.Mesh(geometry, material);
        bar.position.set(point.x, point.y - barHeight / 2 - 0.5, -0.2);
        bar.scale.y = 0;
        this.scene.add(bar);
        this.objects[barId] = { group: bar, type: 'probability_bar', pointId };

        gsap.to(bar.scale, { y: 1, duration: 0.4, ease: "power2.out" });
    };

    /**
     * Update probability bar for a point
     */
    GSAPEngine.prototype.updateProbabilityBar = function (pointId, probability) {
        const barId = `prob_bar_${pointId}`;
        const barObj = this.objects[barId];
        const point = this.objects[pointId];
        if (!barObj || !point) return;

        const bar = barObj.group;
        const maxHeight = 3;
        const newHeight = probability * maxHeight;

        // Update color based on probability
        const newColor = new THREE.Color().lerpColors(
            new THREE.Color(ML_COLORS.class0),
            new THREE.Color(ML_COLORS.class1),
            probability
        );

        gsap.to(bar.material.color, {
            r: newColor.r, g: newColor.g, b: newColor.b,
            duration: 0.3
        });

        // Update height
        gsap.to(bar.scale, { y: newHeight / 3, duration: 0.3 });
        gsap.to(bar.position, { y: point.y - newHeight / 2 - 0.5, duration: 0.3 });
    };

    /**
     * Pulse misclassified points
     */
    GSAPEngine.prototype.pulseMisclassified = function (pointIds) {
        pointIds.forEach(id => {
            const obj = this.objects[id];
            if (!obj || !obj.mesh) return;

            // Red ring pulse
            const ringGeo = new THREE.RingGeometry(0.4, 0.5, 32);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0xff0000,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.copy(obj.mesh.position);
            ring.rotation.x = -Math.PI / 2;
            this.scene.add(ring);

            gsap.to(ring.scale, {
                x: 2, y: 2,
                duration: 0.4,
                yoyo: true,
                repeat: 2
            });
            gsap.to(ringMat, {
                opacity: 0,
                duration: 0.4,
                delay: 0.8,
                onComplete: () => {
                    this.scene.remove(ring);
                    ringGeo.dispose();
                    ringMat.dispose();
                }
            });
        });
    };

    /**
     * Show classification accuracy
     */
    GSAPEngine.prototype.showClassificationAccuracy = function (accuracy) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#44ff88';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Accuracy: ${(accuracy * 100).toFixed(1)}%`, 128, 42);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(0, 8, 0);
        sprite.scale.set(4, 1, 1);
        sprite.material.opacity = 0;
        this.scene.add(sprite);

        gsap.to(sprite.material, { opacity: 1, duration: 0.5 });
        this.objects['accuracy_label'] = { group: sprite, type: 'label' };
    };
}
