/**
 * knn_api.js - K-Nearest Neighbors Visualization
 * Implements distance lines, neighbor highlighting, and classification
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { ML_COLORS, createTextSprite } from './ml_base.js';

/**
 * Register KNN visualization methods on GSAPEngine
 */
export function registerKNNAPI(GSAPEngine) {
    
    GSAPEngine.prototype.knnData = {
        points: [],
        queryPoint: null,
        neighbors: []
    };

    /**
     * Spawn KNN data point
     */
    /**
     * Spawn KNN data point
     */
    GSAPEngine.prototype.spawnKNNPoint = function (id, xRaw, yRaw, classLabel, options = {}) {
        if (this.objects[id]) return;

        // SCALE SPACING: Multiply by 1.5
        const x = xRaw * 1.5;
        const y = yRaw * 1.5;

        const { size = 0.3 } = options;
        const color = classLabel === 0 ? ML_COLORS.class0 : ML_COLORS.class1;

        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.3,
            transparent: true
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, 0);
        mesh.scale.set(0, 0, 0);
        this.scene.add(mesh);

        // POINTER LABEL: Floating text with arrow
        this.addPointerLabel(mesh, id, 10); // Label at Y=10

        this.objects[id] = { group: mesh, mesh, type: 'knn_point', classLabel, x, y };
        this.knnData.points.push({ id, x, y, classLabel, mesh });

        gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: "back.out(1.7)" });
    };

    /**
     * Spawn query point (to be classified)
     */
    GSAPEngine.prototype.spawnQueryPoint = function (id, x, y) {
        const geometry = new THREE.SphereGeometry(0.4, 16, 16);
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xfbbf24,
            emissive: 0xfbbf24,
            emissiveIntensity: 0.5,
            transparent: true
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, 0);
        mesh.scale.set(0, 0, 0);
        this.scene.add(mesh);

        // Add question mark label
        const label = createTextSprite('?', 18, '#fbbf24');
        label.position.set(0, 0.6, 0);
        mesh.add(label);

        this.objects[id] = { group: mesh, mesh, type: 'query_point', x, y };
        this.knnData.queryPoint = { id, x, y, mesh };

        gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: "elastic.out(1, 0.5)" });
    };

    /**
     * Draw distance line from query to point
     */
    GSAPEngine.prototype.drawDistanceLine = function (queryId, pointId, distance) {
        const query = this.objects[queryId];
        const point = this.objects[pointId];
        if (!query || !point) return;

        const lineId = `dist_${queryId}_${pointId}`;
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(query.x, query.y, 0),
            new THREE.Vector3(point.x, point.y, 0)
        ]);
        const material = new THREE.LineDashedMaterial({
            color: 0x94a3b8,
            dashSize: 0.2,
            gapSize: 0.1,
            transparent: true,
            opacity: 0
        });

        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();
        this.scene.add(line);

        // Distance label
        const midX = (query.x + point.x) / 2;
        const midY = (query.y + point.y) / 2;
        const label = createTextSprite(distance.toFixed(1), 10, '#94a3b8');
        label.position.set(midX, midY + 0.3, 0.1);
        this.scene.add(label);

        this.objects[lineId] = { group: line, type: 'distance_line', label };

        gsap.to(material, { opacity: 0.6, duration: 0.3 });
    };

    /**
     * Highlight K nearest neighbors
     */
    GSAPEngine.prototype.highlightNeighbors = function (pointIds, k) {
        pointIds.slice(0, k).forEach((id, i) => {
            const obj = this.objects[id];
            if (!obj) return;

            // Enlarge and glow
            gsap.to(obj.mesh.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.4, delay: i * 0.1 });
            gsap.to(obj.mesh.material, { emissiveIntensity: 0.8, duration: 0.4, delay: i * 0.1 });

            // Add ring
            const ringGeo = new THREE.RingGeometry(0.4, 0.5, 32);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.copy(obj.mesh.position);
            this.scene.add(ring);

            gsap.to(ring.scale, { x: 1.3, y: 1.3, duration: 0.8, yoyo: true, repeat: -1 });
        });
    };

    /**
     * Show KNN classification result
     */
    GSAPEngine.prototype.showKNNResult = function (queryId, predictedClass, votes) {
        const query = this.objects[queryId];
        if (!query) return;

        const color = predictedClass === 0 ? ML_COLORS.class0 : ML_COLORS.class1;

        gsap.to(query.mesh.material.color, {
            r: new THREE.Color(color).r,
            g: new THREE.Color(color).g,
            b: new THREE.Color(color).b,
            duration: 0.5
        });

        // Result label
        const label = createTextSprite(`Class ${predictedClass} (${votes[predictedClass]}/${votes[0] + votes[1]})`, 12, '#ffffff');
        label.position.set(query.x, query.y + 1, 0);
        this.scene.add(label);
    };

    // Wrapper functions for backend compatibility
    GSAPEngine.prototype.highlightTestPoint = function (id) {
        this.spawnQueryPoint(id, this.objects[id]?.x || 5, this.objects[id]?.y || 5);
    };

    GSAPEngine.prototype.markNearest = function (pointIds, k) {
        this.highlightNeighbors(pointIds, k);
    };

    GSAPEngine.prototype.showMajorityVote = function (predictedClass, votes) {
        const queryId = this.knnData.queryPoint?.id || 'query';
        this.showKNNResult(queryId, predictedClass, votes);
    };
}
