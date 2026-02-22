/**
 * dbscan_api.js - DBSCAN Clustering Visualization
 * Implements density-based clustering with core/border/noise point classification
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { ML_COLORS } from './ml_base.js';

const DBSCAN_COLORS = {
    unvisited: 0x94a3b8,
    core: 0x22c55e,
    border: 0xfbbf24,
    noise: 0xef4444
};

/**
 * Register DBSCAN visualization methods on GSAPEngine
 */
export function registerDBSCANAPI(GSAPEngine) {
    
    GSAPEngine.prototype.dbscanData = {
        points: [],
        clusters: []
    };

    /**
     * Spawn DBSCAN point (initially unvisited)
     */
    /**
     * Spawn DBSCAN point (initially unvisited)
     */
    GSAPEngine.prototype.spawnDBSCANPoint = function (id, xRaw, yRaw, options = {}) {
        if (this.objects[id]) return;

        // SCALE SPACING: Multiply coordinates by 1.5 to increase graph spread
        const x = xRaw * 1.5;
        const y = yRaw * 1.5;

        const { size = 0.25 } = options;

        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: DBSCAN_COLORS.unvisited,
            emissive: DBSCAN_COLORS.unvisited,
            emissiveIntensity: 0.2,
            transparent: true
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, 0);
        mesh.scale.set(0, 0, 0);
        this.scene.add(mesh);

        // POINTER LABEL: Floating text with arrow
        this.addPointerLabel(mesh, id, 10); // Label at Y=10

        this.objects[id] = { group: mesh, mesh, type: 'dbscan_point', x, y, status: 'unvisited', clusterId: -1 };
        this.dbscanData.points.push({ id, x, y, mesh });

        gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: "back.out(1.7)" });
    };

    /**
     * Show epsilon radius around point
     */
    GSAPEngine.prototype.showEpsilonRadius = function (pointId, epsilon) {
        const point = this.objects[pointId];
        if (!point) return;

        const geometry = new THREE.RingGeometry(epsilon - 0.05, epsilon + 0.05, 64);
        const material = new THREE.MeshBasicMaterial({
            color: 0x6366f1,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });

        const ring = new THREE.Mesh(geometry, material);
        ring.position.set(point.x, point.y, -0.1);
        this.scene.add(ring);

        const radiusId = `eps_${pointId}`;
        this.objects[radiusId] = { group: ring, type: 'epsilon_ring' };

        gsap.to(material, { opacity: 0.3, duration: 0.4 });
        gsap.to(material, { opacity: 0, duration: 0.3, delay: 1.5, onComplete: () => {
            this.scene.remove(ring);
            delete this.objects[radiusId];
        }});
    };

    /**
     * Mark point as core point
     */
    GSAPEngine.prototype.markCorePoint = function (pointId) {
        const point = this.objects[pointId];
        if (!point) return;

        point.status = 'core';
        const color = new THREE.Color(DBSCAN_COLORS.core);

        gsap.to(point.mesh.material.color, { r: color.r, g: color.g, b: color.b, duration: 0.4 });
        gsap.to(point.mesh.material.emissive, { r: color.r, g: color.g, b: color.b, duration: 0.4 });
        gsap.to(point.mesh.scale, { x: 1.3, y: 1.3, z: 1.3, duration: 0.3 });
    };

    /**
     * Mark point as border point
     */
    GSAPEngine.prototype.markBorderPoint = function (pointId) {
        const point = this.objects[pointId];
        if (!point) return;

        point.status = 'border';
        const color = new THREE.Color(DBSCAN_COLORS.border);

        gsap.to(point.mesh.material.color, { r: color.r, g: color.g, b: color.b, duration: 0.4 });
        gsap.to(point.mesh.material.emissive, { r: color.r, g: color.g, b: color.b, duration: 0.4 });
    };

    /**
     * Mark point as noise
     */
    GSAPEngine.prototype.markNoisePoint = function (pointId) {
        const point = this.objects[pointId];
        if (!point) return;

        point.status = 'noise';
        const color = new THREE.Color(DBSCAN_COLORS.noise);

        gsap.to(point.mesh.material.color, { r: color.r, g: color.g, b: color.b, duration: 0.4 });
        gsap.to(point.mesh.material.emissive, { r: color.r, g: color.g, b: color.b, duration: 0.4 });
        gsap.to(point.mesh.scale, { x: 0.7, y: 0.7, z: 0.7, duration: 0.3 }); // Shrink noise
    };

    /**
     * Expand cluster from core point
     */
    GSAPEngine.prototype.expandCluster = function (coreId, neighborIds, clusterColor) {
        const core = this.objects[coreId];
        if (!core) return;

        // Draw connections to neighbors
        neighborIds.forEach((nId, i) => {
            const neighbor = this.objects[nId];
            if (!neighbor) return;

            const lineGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(core.x, core.y, 0),
                new THREE.Vector3(neighbor.x, neighbor.y, 0)
            ]);
            const lineMat = new THREE.LineBasicMaterial({
                color: clusterColor,
                transparent: true,
                opacity: 0
            });
            const line = new THREE.Line(lineGeo, lineMat);
            this.scene.add(line);

            gsap.to(lineMat, { opacity: 0.4, duration: 0.3, delay: i * 0.05 });
            gsap.to(lineMat, { opacity: 0, duration: 0.5, delay: 1 + i * 0.05, onComplete: () => {
                this.scene.remove(line);
            }});

            // Color neighbor
            const color = new THREE.Color(clusterColor);
            gsap.to(neighbor.mesh.material.color, { r: color.r, g: color.g, b: color.b, duration: 0.4, delay: i * 0.05 });
        });
    };

    /**
     * Show DBSCAN summary
     */
    GSAPEngine.prototype.showDBSCANSummary = function (numClusters, numNoise) {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${numClusters} Clusters Found`, 150, 30);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#ef4444';
        ctx.fillText(`${numNoise} noise points`, 150, 55);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(0, 8, 0);
        sprite.scale.set(5, 1.3, 1);
        this.scene.add(sprite);
    };

    // Wrapper functions for backend compatibility
    GSAPEngine.prototype.drawEpsilonCircle = function (pointId, epsilon) {
        this.showEpsilonRadius(pointId, epsilon);
    };

    GSAPEngine.prototype.markNoise = function (id) {
        this.markNoisePoint(id);
    };

    GSAPEngine.prototype.assignCluster = function (pointId, clusterId) {
        const point = this.objects[pointId];
        if (point) {
            point.clusterId = clusterId;
            const clusterColors = [0x3b82f6, 0x10b981, 0xf59e0b, 0xef4444, 0x8b5cf6];
            const color = clusterColors[clusterId % clusterColors.length];
            this.expandCluster(pointId, [], color);
        }
    };

    GSAPEngine.prototype.showClusterSummary = function (nClusters, nNoise) {
        this.showDBSCANSummary(nClusters, nNoise);
    };
}
