/**
 * pca_api.js - PCA (Principal Component Analysis) Visualization
 * Implements eigenvector arrows, coordinate rotation, projection, and variance bars
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { ML_COLORS, createArrow, microAutoFocus } from './ml_base.js';

const PCA_COLORS = {
    pc1: 0x44ff88,  // Green - primary component
    pc2: 0x88ff44,  // Light green - secondary
    projection: 0xaaaaaa,
    variance: 0x00ffff
};

/**
 * Register PCA visualization methods on GSAPEngine
 */
export function registerPCAAPI(GSAPEngine) {
    
    // PCA data storage
    GSAPEngine.prototype.pcaData = {
        points: [],
        eigenvectors: [],
        projectionLines: []
    };

    /**
     * Spawn PCA data point
     */
    GSAPEngine.prototype.spawnPCAPoint = function (id, x, y, z = 0, options = {}) {
        if (this.objects[id]) return;

        const { size = 0.25, delay = 0, color = ML_COLORS.cyan } = options;

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
        mesh.position.set(x, y, z);
        mesh.scale.set(0, 0, 0);

        this.scene.add(mesh);
        this.objects[id] = { group: mesh, mesh, type: 'pca_point', originalPos: { x, y, z } };
        this.pcaData.points.push({ id, x, y, z, mesh });

        gsap.to(mesh.scale, {
            x: 1, y: 1, z: 1,
            duration: 0.4,
            delay,
            ease: "back.out(1.7)"
        });
    };

    /**
     * Show data mean center
     */
    GSAPEngine.prototype.showDataMean = function (meanX, meanY) {
        const geometry = new THREE.RingGeometry(0.3, 0.4, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(geometry, material);
        ring.position.set(meanX, meanY, 0);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);
        this.objects['data_mean'] = { group: ring, type: 'mean' };

        // Pulsing
        gsap.to(ring.scale, {
            x: 1.2, y: 1.2,
            duration: 1,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut"
        });
    };

    /**
     * Center data at mean (translate all points)
     */
    GSAPEngine.prototype.centerData = function (meanX, meanY, duration = 1) {
        return new Promise((resolve) => {
            this.pcaData.points.forEach((p, i) => {
                gsap.to(p.mesh.position, {
                    x: p.x - meanX,
                    y: p.y - meanY,
                    duration,
                    delay: i * 0.02,
                    ease: "power2.out"
                });
            });

            // Move mean indicator to origin
            const mean = this.objects['data_mean'];
            if (mean) {
                gsap.to(mean.group.position, { x: 0, y: 0, duration, ease: "power2.out" });
            }

            setTimeout(resolve, duration * 1000 + 200);
        });
    };

    /**
     * Spawn eigenvector arrow
     */
    GSAPEngine.prototype.spawnEigenvector = function (id, dirX, dirY, variance, isPrimary = true) {
        const length = Math.sqrt(variance) * 3;
        const color = isPrimary ? PCA_COLORS.pc1 : PCA_COLORS.pc2;
        
        const dir = new THREE.Vector3(dirX, dirY, 0).normalize();
        const arrow = new THREE.ArrowHelper(
            dir,
            new THREE.Vector3(0, 0, 0),
            length,
            color,
            length * 0.15,
            length * 0.08
        );
        arrow.scale.set(0, 0, 0);
        this.scene.add(arrow);
        this.objects[id] = { group: arrow, type: 'eigenvector', dir, length, isPrimary };
        this.pcaData.eigenvectors.push({ id, dirX, dirY, variance, arrow });

        // Pop in
        gsap.to(arrow.scale, {
            x: 1, y: 1, z: 1,
            duration: 0.6,
            ease: "back.out(1.5)"
        });

        // Add glow line along arrow
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(dirX * length, dirY * length, 0)
        ]);
        const lineMat = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: 0.4
        });
        const glowLine = new THREE.Line(lineGeo, lineMat);
        this.scene.add(glowLine);
        
        // Pulsing glow
        gsap.to(lineMat, {
            opacity: 0.8,
            duration: 1,
            yoyo: true,
            repeat: -1
        });
    };

    /**
     * Rotate coordinate system to align with eigenvectors
     */
    GSAPEngine.prototype.rotateToEigenbasis = function (angle, duration = 2) {
        return new Promise((resolve) => {
            // Rotate all points
            this.pcaData.points.forEach(p => {
                const { x, y } = p.mesh.position;
                const newX = x * Math.cos(angle) - y * Math.sin(angle);
                const newY = x * Math.sin(angle) + y * Math.cos(angle);
                
                gsap.to(p.mesh.position, {
                    x: newX,
                    y: newY,
                    duration,
                    ease: "sine.inOut"
                });
            });

            // Camera auto-focus
            if (this.camera) {
                microAutoFocus(this.camera, new THREE.Vector3(0, 0, 0), 0.1, duration);
            }

            setTimeout(resolve, duration * 1000);
        });
    };

    /**
     * Project points onto principal component
     */
    GSAPEngine.prototype.projectOntoPC = function (pcIndex = 0, duration = 1.5) {
        return new Promise((resolve) => {
            this.pcaData.points.forEach((p, i) => {
                const mesh = p.mesh;
                
                // Draw projection line
                const startPos = mesh.position.clone();
                const endPos = pcIndex === 0 
                    ? new THREE.Vector3(mesh.position.x, 0, 0)  // Project to x-axis (PC1)
                    : new THREE.Vector3(0, mesh.position.y, 0); // Project to y-axis (PC2)

                const lineGeo = new THREE.BufferGeometry().setFromPoints([startPos, endPos]);
                const lineMat = new THREE.LineDashedMaterial({
                    color: PCA_COLORS.projection,
                    dashSize: 0.2,
                    gapSize: 0.1,
                    transparent: true,
                    opacity: 0.6
                });
                const projLine = new THREE.Line(lineGeo, lineMat);
                projLine.computeLineDistances();
                this.scene.add(projLine);

                // Animate point to projected position
                gsap.to(mesh.position, {
                    x: endPos.x,
                    y: endPos.y,
                    duration,
                    delay: i * 0.05,
                    ease: "power2.inOut"
                });

                // Fade projection line
                gsap.to(lineMat, {
                    opacity: 0,
                    duration: 0.5,
                    delay: duration + i * 0.05,
                    onComplete: () => {
                        this.scene.remove(projLine);
                        lineGeo.dispose();
                        lineMat.dispose();
                    }
                });
            });

            setTimeout(resolve, duration * 1000 + 500);
        });
    };

    /**
     * Show variance explained bars
     */
    GSAPEngine.prototype.showVarianceBars = function (pc1Variance, pc2Variance) {
        const total = pc1Variance + pc2Variance;
        const pc1Ratio = pc1Variance / total;
        const pc2Ratio = pc2Variance / total;
        const maxHeight = 4;
        const barWidth = 0.8;
        const startX = 6; // Move closer to center (was 8)

        // PC1 bar
        const pc1Geo = new THREE.BoxGeometry(barWidth, pc1Ratio * maxHeight, 0.3);
        const pc1Mat = new THREE.MeshStandardMaterial({
            color: PCA_COLORS.pc1,
            transparent: true,
            opacity: 0.8
        });
        const pc1Bar = new THREE.Mesh(pc1Geo, pc1Mat);
        pc1Bar.position.set(startX, -3 + (pc1Ratio * maxHeight) / 2, 0);
        pc1Bar.scale.y = 0;
        this.scene.add(pc1Bar);
        this.objects['variance_bar_pc1'] = { group: pc1Bar, type: 'variance_bar' };

        // PC2 bar
        const pc2Geo = new THREE.BoxGeometry(barWidth, pc2Ratio * maxHeight, 0.3);
        const pc2Mat = new THREE.MeshStandardMaterial({
            color: PCA_COLORS.pc2,
            transparent: true,
            opacity: 0.8
        });
        const pc2Bar = new THREE.Mesh(pc2Geo, pc2Mat);
        pc2Bar.position.set(startX + 1.2, -3 + (pc2Ratio * maxHeight) / 2, 0);
        pc2Bar.scale.y = 0;
        this.scene.add(pc2Bar);
        this.objects['variance_bar_pc2'] = { group: pc2Bar, type: 'variance_bar' };

        // Animate bars
        gsap.to(pc1Bar.scale, { y: 1, duration: 0.8, ease: "power2.out" });
        gsap.to(pc2Bar.scale, { y: 1, duration: 0.8, delay: 0.2, ease: "power2.out" });

        // Labels
        const createLabel = (text, x, y, color) => {
            const canvas = document.createElement('canvas');
            canvas.width = 256; // Higher res
            canvas.height = 128; // Higher res
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = color;
            ctx.font = 'bold 36px Arial'; // Larger font
            ctx.textAlign = 'center';
            ctx.fillText(text, 128, 70);
            const texture = new THREE.CanvasTexture(canvas);
            const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
            const sprite = new THREE.Sprite(mat);
            sprite.position.set(x, y, 0);
            sprite.scale.set(4, 2, 1); // Larger scale
            this.scene.add(sprite);
            return sprite;
        };

        const pc1Label = createLabel(`PC1: ${(pc1Ratio * 100).toFixed(0)}%`, startX, -3 + pc1Ratio * maxHeight + 1.0, '#44ff88');
        const pc2Label = createLabel(`PC2: ${(pc2Ratio * 100).toFixed(0)}%`, startX + 1.2, -3 + pc2Ratio * maxHeight + 1.0, '#88ff44');
        
        this.objects['variance_label_pc1'] = { group: pc1Label, type: 'label' };
        this.objects['variance_label_pc2'] = { group: pc2Label, type: 'label' };
    };
}
