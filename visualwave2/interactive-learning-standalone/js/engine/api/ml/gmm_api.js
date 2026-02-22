/**
 * gmm_api.js - Gaussian Mixture Models Visualization
 * Implements animated Gaussian ellipses and soft assignment shading
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { ML_COLORS } from './ml_base.js';

const GMM_COLORS = [
    0x6366f1,  // Indigo
    0x22c55e,  // Green
    0xf59e0b,  // Amber
    0xec4899   // Pink
];

/**
 * Register GMM visualization methods on GSAPEngine
 */
export function registerGMMAPI(GSAPEngine) {
    
    GSAPEngine.prototype.gmmData = {
        points: [],
        gaussians: []
    };

    /**
     * Spawn GMM data point
     */
    GSAPEngine.prototype.spawnGMMPoint = function (id, x, y, options = {}) {
        if (this.objects[id]) return;

        const { size = 0.2 } = options;

        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0x94a3b8,
            emissive: 0x94a3b8,
            emissiveIntensity: 0.2,
            transparent: true,
            opacity: 0.8
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, 0);
        mesh.scale.set(0, 0, 0);
        this.scene.add(mesh);

        this.objects[id] = { group: mesh, mesh, type: 'gmm_point', x, y, responsibilities: [] };
        this.gmmData.points.push({ id, x, y, mesh });

        gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: "back.out(1.7)" });
    };

    /**
     * Spawn Gaussian ellipse
     */
    GSAPEngine.prototype.spawnGaussianEllipse = function (id, meanX, meanY, sigmaX, sigmaY, rotation = 0, componentIndex = 0) {
        const color = GMM_COLORS[componentIndex % GMM_COLORS.length];

        // Ellipse shape
        const curve = new THREE.EllipseCurve(
            0, 0,
            sigmaX * 2, sigmaY * 2,
            0, 2 * Math.PI,
            false,
            rotation
        );
        const points = curve.getPoints(64);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: 0
        });

        const ellipse = new THREE.Line(geometry, material);
        ellipse.position.set(meanX, meanY, -0.1);
        this.scene.add(ellipse);

        // Fill ellipse
        const fillGeo = new THREE.CircleGeometry(1, 64);
        const fillMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });
        const fill = new THREE.Mesh(fillGeo, fillMat);
        fill.scale.set(sigmaX * 2, sigmaY * 2, 1);
        fill.rotation.z = rotation;
        fill.position.set(meanX, meanY, -0.2);
        this.scene.add(fill);

        // Center marker
        const centerGeo = new THREE.SphereGeometry(0.15, 16, 16);
        const centerMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 });
        const center = new THREE.Mesh(centerGeo, centerMat);
        center.position.set(meanX, meanY, 0);
        center.scale.set(0, 0, 0);
        this.scene.add(center);

        this.objects[id] = { 
            group: ellipse, 
            fill, 
            center,
            type: 'gaussian_ellipse', 
            meanX, meanY, sigmaX, sigmaY, rotation, 
            componentIndex 
        };
        this.gmmData.gaussians.push({ id, meanX, meanY, sigmaX, sigmaY });

        gsap.to(material, { opacity: 0.8, duration: 0.6 });
        gsap.to(fillMat, { opacity: 0.1, duration: 0.6 });
        gsap.to(center.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: "back.out(1.5)" });
    };

    /**
     * Simplified Gaussian spawn (alias for backend LLM compatibility)
     * @param {string} id - Gaussian ID
     * @param {number} meanX - Mean X position
     * @param {number} meanY - Mean Y position
     * @param {Array} covariance - 2x2 covariance matrix [[var_x, cov], [cov, var_y]]
     * @param {number} componentIndex - Component index for coloring
     */
    GSAPEngine.prototype.spawnGaussian = function (id, meanX, meanY, covariance, componentIndex = 0) {
        // Extract sigma from covariance matrix
        const sigmaX = Math.sqrt(Math.abs(covariance[0][0]));
        const sigmaY = Math.sqrt(Math.abs(covariance[1][1]));
        const rotation = 0; // Simplified: ignore rotation for now

        this.spawnGaussianEllipse(id, meanX, meanY, sigmaX, sigmaY, rotation, componentIndex);
    };

    /**
     * Update Gaussian parameters (during EM)
     */
    GSAPEngine.prototype.updateGaussian = function (id, newMeanX, newMeanY, newSigmaX, newSigmaY, newRotation, duration = 0.8) {
        const obj = this.objects[id];
        if (!obj || obj.type !== 'gaussian_ellipse') return;

        // Animate center movement
        gsap.to(obj.group.position, { x: newMeanX, y: newMeanY, duration, ease: "power2.out" });
        gsap.to(obj.fill.position, { x: newMeanX, y: newMeanY, duration, ease: "power2.out" });
        gsap.to(obj.center.position, { x: newMeanX, y: newMeanY, duration, ease: "power2.out" });

        // Update scale
        gsap.to(obj.fill.scale, { x: newSigmaX * 2, y: newSigmaY * 2, duration, ease: "power2.out" });
        gsap.to(obj.fill.rotation, { z: newRotation, duration, ease: "power2.out" });

        obj.meanX = newMeanX;
        obj.meanY = newMeanY;
        obj.sigmaX = newSigmaX;
        obj.sigmaY = newSigmaY;
    };

    /**
     * Show soft assignment (color point by weighted responsibility)
     */
    GSAPEngine.prototype.updatePointResponsibility = function (pointId, responsibilities) {
        const point = this.objects[pointId];
        if (!point) return;

        point.responsibilities = responsibilities;

        // Blend colors based on responsibilities
        const blendedColor = new THREE.Color(0, 0, 0);
        responsibilities.forEach((r, i) => {
            const c = new THREE.Color(GMM_COLORS[i % GMM_COLORS.length]);
            blendedColor.r += c.r * r;
            blendedColor.g += c.g * r;
            blendedColor.b += c.b * r;
        });

        gsap.to(point.mesh.material.color, {
            r: blendedColor.r,
            g: blendedColor.g,
            b: blendedColor.b,
            duration: 0.4
        });
    };

    /**
     * Show mixture weights
     */
    GSAPEngine.prototype.showMixtureWeights = function (weights) {
        const startX = 8;
        const maxHeight = 3;

        weights.forEach((w, i) => {
            const color = GMM_COLORS[i % GMM_COLORS.length];
            const height = w * maxHeight;

            const geo = new THREE.BoxGeometry(0.6, height, 0.3);
            const mat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.8 });
            const bar = new THREE.Mesh(geo, mat);
            bar.position.set(startX, -4 + height / 2, 0);
            bar.scale.y = 0;
            this.scene.add(bar);

            gsap.to(bar.scale, { y: 1, duration: 0.6, delay: i * 0.1 });

            this.objects[`weight_bar_${i}`] = { group: bar, type: 'weight_bar' };
        });
    };
}
