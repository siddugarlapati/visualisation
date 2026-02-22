/**
 * clustering_api.js - K-Means Clustering Visualization
 * Implements centroid movement, assignment rays, and cluster coloring
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { ML_COLORS, createTrailPoint, microAutoFocus } from './ml_base.js';

// Cluster colors
const CLUSTER_COLORS = [
    0xff6b6b,  // Red
    0x4ecdc4,  // Teal
    0xffe66d,  // Yellow
    0x95e1d3,  // Mint
    0xf38181,  // Coral
    0xaa96da,  // Purple
    0xfcbad3,  // Pink
    0xa8d8ea   // Light blue
];

/**
 * Register K-Means clustering visualization methods on GSAPEngine
 */
export function registerClusteringAPI(GSAPEngine) {
    
    // Store cluster data
    GSAPEngine.prototype.clusterData = {
        centroids: [],
        points: [],
        assignments: []
    };

    /**
     * Spawn a clustering data point (neutral gray initially)
     */
    GSAPEngine.prototype.spawnClusterPoint = function (id, x, y, z = 0, options = {}) {
        if (this.objects[id]) return;

        const { color = ML_COLORS.neutral, size = 0.25, delay = 0 } = options;

        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.2,
            roughness: 0.4,
            metalness: 0.6,
            transparent: true
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.scale.set(0, 0, 0);

        this.scene.add(mesh);
        this.objects[id] = { group: mesh, mesh, type: 'cluster_point', x, y, z, clusterId: -1 };
        this.clusterData.points.push({ id, x, y, z, mesh });

        gsap.to(mesh.scale, {
            x: 1, y: 1, z: 1,
            duration: 0.4,
            delay,
            ease: "back.out(1.7)"
        });
    };

    /**
     * Spawn centroid with bounce effect
     */
    GSAPEngine.prototype.spawnCentroid = function (id, x, y, z = 0, clusterIndex = 0) {
        if (this.objects[id]) return;

        const color = CLUSTER_COLORS[clusterIndex % CLUSTER_COLORS.length];

        const geometry = new THREE.SphereGeometry(0.5, 24, 24);
        const material = new THREE.MeshPhysicalMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.6,
            roughness: 0.2,
            metalness: 0.8,
            clearcoat: 0.5,
            transparent: true
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y + 5, z);
        mesh.scale.set(0, 0, 0);

        // Glow ring
        const ringGeo = new THREE.RingGeometry(0.6, 0.8, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        mesh.add(ring);

        this.scene.add(mesh);
        this.objects[id] = { group: mesh, mesh, ring, type: 'centroid', clusterIndex, color, x, y, z };
        this.clusterData.centroids.push({ id, x, y, z, mesh, clusterIndex, color });

        // Drop animation with bounce
        gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: "power2.out" });
        gsap.to(mesh.position, { y: y, duration: 0.6, ease: "bounce.out" });

        // Pulsing ring
        gsap.to(ring.scale, { x: 1.3, y: 1.3, duration: 1.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
        gsap.to(ringMat, { opacity: 0.2, duration: 1.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
    };

    /**
     * Move centroid with motion trail
     */
    GSAPEngine.prototype.moveCentroid = function (id, newX, newY, newZ = 0, duration = 1) {
        const obj = this.objects[id];
        if (!obj || obj.type !== 'centroid') return;

        const mesh = obj.mesh;
        const centroidColor = obj.color;
        let lastTrailTime = 0;

        if (this.camera) {
            microAutoFocus(this.camera, new THREE.Vector3(newX, newY, newZ), 0.1, duration);
        }

        gsap.to(mesh.position, {
            x: newX, y: newY, z: newZ,
            duration,
            ease: "power3.out",
            onUpdate: () => {
                const now = Date.now();
                if (now - lastTrailTime > 50) {
                    createTrailPoint(this.scene, mesh.position.clone(), centroidColor, 0.12, 0.4);
                    lastTrailTime = now;
                }
            }
        });

        obj.x = newX;
        obj.y = newY;
        obj.z = newZ;
    };

    /**
     * Assign point to cluster with ray and color change
     */
    GSAPEngine.prototype.assignPointToCluster = function (pointId, clusterIndex) {
        const point = this.objects[pointId];
        const centroidId = `centroid_${clusterIndex}`;
        const centroid = this.objects[centroidId];
        if (!point || !centroid) return;

        const color = new THREE.Color(CLUSTER_COLORS[clusterIndex % CLUSTER_COLORS.length]);

        // Draw ray line
        const points = [point.mesh.position.clone(), centroid.mesh.position.clone()];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: centroid.color, transparent: true, opacity: 0 });
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);

        // Flash ray
        gsap.to(material, { opacity: 0.8, duration: 0.15 });
        gsap.to(material, {
            opacity: 0, duration: 0.3, delay: 0.2,
            onComplete: () => {
                this.scene.remove(line);
                geometry.dispose();
                material.dispose();
            }
        });

        // Color transition
        gsap.to(point.mesh.material.color, { r: color.r, g: color.g, b: color.b, duration: 0.4 });
        gsap.to(point.mesh.material.emissive, { r: color.r, g: color.g, b: color.b, duration: 0.4 });
        point.clusterId = clusterIndex;
    };

    /**
     * Convergence celebration
     */
    GSAPEngine.prototype.celebrateClusterConvergence = function () {
        this.clusterData.centroids.forEach(c => {
            const obj = this.objects[c.id];
            if (!obj) return;

            gsap.to(obj.mesh.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.3, yoyo: true, repeat: 2 });
            gsap.to(obj.mesh.material, { emissiveIntensity: 1.2, duration: 0.3, yoyo: true, repeat: 2 });

            // Ripple
            const rippleGeo = new THREE.RingGeometry(0.1, 0.3, 32);
            const rippleMat = new THREE.MeshBasicMaterial({ color: c.color, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
            const ripple = new THREE.Mesh(rippleGeo, rippleMat);
            ripple.position.copy(obj.mesh.position);
            ripple.rotation.x = -Math.PI / 2;
            this.scene.add(ripple);

            gsap.to(ripple.scale, { x: 8, y: 8, duration: 1.5, ease: "power2.out" });
            gsap.to(rippleMat, {
                opacity: 0, duration: 1.5,
                onComplete: () => {
                    this.scene.remove(ripple);
                    rippleGeo.dispose();
                    rippleMat.dispose();
                }
            });
        });

        // Converged label
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#44ff88';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Converged!', 256, 70);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(0, 8, 0);
        sprite.scale.set(6, 1.5, 1);
        sprite.material.opacity = 0;
        this.scene.add(sprite);

        gsap.to(sprite.material, { opacity: 1, duration: 0.5 });
        gsap.to(sprite.material, {
            opacity: 0, duration: 0.5, delay: 2,
            onComplete: () => {
                this.scene.remove(sprite);
                texture.dispose();
                mat.dispose();
            }
        });
    };

    /**
     * Show cluster statistics
     */
    GSAPEngine.prototype.showClusterStats = function (clusterSizes) {
        // Position as a vertical legend on the far right
        const startY = 5; 
        const xPos = 14; 

        clusterSizes.forEach((size, i) => {
            const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];

            const canvas = document.createElement('canvas');
            canvas.width = 128; // Increased from 128
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`C${i + 1}: ${size}`, 64, 40);

            const texture = new THREE.CanvasTexture(canvas);
            const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
            const sprite = new THREE.Sprite(mat);
            // Vertical stack: 5, 3.5, 2, ...
            sprite.position.set(xPos, startY - (i * 1.5), 0);
            sprite.scale.set(3, 1.5, 1);
            sprite.material.opacity = 0;
            this.scene.add(sprite);

            gsap.to(sprite.material, { opacity: 1, duration: 0.4, delay: i * 0.1 });
            this.objects[`cluster_stat_${i}`] = { group: sprite, type: 'label' };
        });
    };
}
