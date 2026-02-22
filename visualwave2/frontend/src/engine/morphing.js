/**
 * morphing.js - Morphing + Dissolving Transitions Module
 * 
 * Handles geometry morphing, mesh dissolving, and the MorphController state machine.
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { createHighResGeometry } from './geometry.js';

// ═══════════════════════════════════════════════════════════════════
// NOISE UTILITIES
// ═══════════════════════════════════════════════════════════════════

// Simple hash function for pseudo-random noise generation
export function hash(n) {
    return Math.sin(n) * 43758.5453123;
}

/**
 * 3D Simplex-style noise function (simplified but effective)
 * @returns {number} Noise value between -1 and 1
 */
export function simplexNoise3D(x, y, z) {
    const n = hash(x + hash(y + hash(z)));
    return (n % 1.0) * 2.0 - 1.0;
}

/**
 * Get noise-based displacement vector for vertex scattering
 * @returns {THREE.Vector3} Displacement vector
 */
export function getNoiseDisplacement(x, y, z, scale = 1.0) {
    const noiseX = simplexNoise3D(x * scale, y * scale, z * scale);
    const noiseY = simplexNoise3D(x * scale + 100, y * scale + 100, z * scale + 100);
    const noiseZ = simplexNoise3D(x * scale + 200, y * scale + 200, z * scale + 200);
    return new THREE.Vector3(noiseX, noiseY, noiseZ);
}

// ═══════════════════════════════════════════════════════════════════
// GEOMETRY MORPHING
// ═══════════════════════════════════════════════════════════════════

/**
 * GEOMETRY MORPHING - Smooth vertex interpolation between geometries
 * @param {THREE.Mesh} mesh - Mesh to morph
 * @param {string} toGeometryType - Target geometry type
 * @param {number} duration - Animation duration
 * @param {object} options - Additional configuration
 * @returns {object|null} GSAP timeline or null if invalid
 */
export function morphGeometry(mesh, toGeometryType, duration = 2.0, options = {}) {
    if (!mesh || !mesh.geometry) {
        console.warn('morphGeometry: Invalid mesh or geometry');
        return null;
    }

    mesh.geometry.computeBoundingSphere();
    const size = mesh.geometry.boundingSphere.radius;
    const targetGeometry = createHighResGeometry(toGeometryType, size);

    const currentPositions = mesh.geometry.attributes.position;
    const targetPositions = targetGeometry.attributes.position;

    if (currentPositions.count !== targetPositions.count) {
        console.error(`morphGeometry: Vertex count mismatch! Current: ${currentPositions.count}, Target: ${targetPositions.count}`);
        return null;
    }

    if (!mesh.userData.morphData) mesh.userData.morphData = {};
    mesh.userData.morphData.originalPositions = new Float32Array(currentPositions.array);

    const morphProgress = { t: 0 };
    const tl = gsap.timeline({ onComplete: options.onComplete || null });

    tl.to(morphProgress, {
        t: 1,
        duration: duration,
        ease: options.ease || 'power2.inOut',
        delay: options.delay || 0,
        onUpdate: () => {
            for (let i = 0; i < currentPositions.count; i++) {
                const i3 = i * 3;
                const startX = mesh.userData.morphData.originalPositions[i3];
                const startY = mesh.userData.morphData.originalPositions[i3 + 1];
                const startZ = mesh.userData.morphData.originalPositions[i3 + 2];
                const endX = targetPositions.array[i3];
                const endY = targetPositions.array[i3 + 1];
                const endZ = targetPositions.array[i3 + 2];

                currentPositions.array[i3] = startX + (endX - startX) * morphProgress.t;
                currentPositions.array[i3 + 1] = startY + (endY - startY) * morphProgress.t;
                currentPositions.array[i3 + 2] = startZ + (endZ - startZ) * morphProgress.t;
            }
            currentPositions.needsUpdate = true;
            mesh.geometry.computeVertexNormals();
            if (options.onUpdate) options.onUpdate(morphProgress.t);
        }
    });

    return tl;
}

// ═══════════════════════════════════════════════════════════════════
// DISSOLVE MESH
// ═══════════════════════════════════════════════════════════════════

/**
 * DISSOLVE MESH - Scatter vertices outward using noise-based displacement
 */
export function dissolveMesh(mesh, options = {}) {
    if (!mesh || !mesh.geometry || !mesh.material) {
        console.warn('dissolveMesh: Invalid mesh, geometry, or material');
        return null;
    }

    const duration = options.duration || 2.0;
    const distance = options.distance || 3.0;
    const noiseScale = options.noiseScale || 0.5;
    const pulseEmissive = options.pulseEmissive !== undefined ? options.pulseEmissive : true;

    const positions = mesh.geometry.attributes.position;
    const normals = mesh.geometry.attributes.normal;

    if (!mesh.userData.dissolveData) mesh.userData.dissolveData = {};
    mesh.userData.dissolveData.originalPositions = new Float32Array(positions.array);
    mesh.userData.dissolveData.isDissolved = false;
    mesh.userData.dissolveData.originalOpacity = mesh.material.opacity;
    mesh.userData.dissolveData.originalEmissiveIntensity = mesh.material.emissiveIntensity || 0;
    mesh.material.transparent = true;

    const targetPositions = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
        const i3 = i * 3;
        const x = positions.array[i3];
        const y = positions.array[i3 + 1];
        const z = positions.array[i3 + 2];

        const noise = getNoiseDisplacement(x, y, z, noiseScale);
        const nx = normals.array[i3];
        const ny = normals.array[i3 + 1];
        const nz = normals.array[i3 + 2];

        targetPositions[i3] = x + (nx + noise.x) * distance;
        targetPositions[i3 + 1] = y + (ny + noise.y) * distance;
        targetPositions[i3 + 2] = z + (nz + noise.z) * distance;
    }

    const dissolveProgress = { t: 0 };
    const tl = gsap.timeline({
        onComplete: () => {
            mesh.userData.dissolveData.isDissolved = true;
            if (options.onComplete) options.onComplete();
        }
    });

    tl.to(dissolveProgress, {
        t: 1,
        duration: duration,
        ease: 'power2.out',
        onUpdate: () => {
            for (let i = 0; i < positions.count; i++) {
                const i3 = i * 3;
                const origX = mesh.userData.dissolveData.originalPositions[i3];
                const origY = mesh.userData.dissolveData.originalPositions[i3 + 1];
                const origZ = mesh.userData.dissolveData.originalPositions[i3 + 2];

                positions.array[i3] = origX + (targetPositions[i3] - origX) * dissolveProgress.t;
                positions.array[i3 + 1] = origY + (targetPositions[i3 + 1] - origY) * dissolveProgress.t;
                positions.array[i3 + 2] = origZ + (targetPositions[i3 + 2] - origZ) * dissolveProgress.t;
            }
            positions.needsUpdate = true;
        }
    }, 0);

    tl.to(mesh.material, { opacity: 0, duration: duration, ease: 'power2.in' }, 0);

    if (pulseEmissive && mesh.material.emissive) {
        tl.to(mesh.material, {
            emissiveIntensity: mesh.userData.dissolveData.originalEmissiveIntensity * 3,
            duration: duration * 0.3,
            ease: 'power2.out'
        }, 0);
        tl.to(mesh.material, {
            emissiveIntensity: 0,
            duration: duration * 0.7,
            ease: 'power2.in'
        }, duration * 0.3);
    }

    return tl;
}

// ═══════════════════════════════════════════════════════════════════
// REFORM MESH
// ═══════════════════════════════════════════════════════════════════

/**
 * REFORM MESH - Restore dissolved mesh to original state
 */
export function reformMesh(mesh, duration = 1.5, options = {}) {
    if (!mesh || !mesh.geometry || !mesh.material) {
        console.warn('reformMesh: Invalid mesh, geometry, or material');
        return null;
    }

    if (!mesh.userData.dissolveData || !mesh.userData.dissolveData.originalPositions) {
        console.warn('reformMesh: No dissolve data found');
        return null;
    }

    const positions = mesh.geometry.attributes.position;
    const originalPositions = mesh.userData.dissolveData.originalPositions;
    const originalOpacity = mesh.userData.dissolveData.originalOpacity;
    const originalEmissiveIntensity = mesh.userData.dissolveData.originalEmissiveIntensity;

    const ease = options.ease || 'back.out(1.7)';
    const reformProgress = { t: 0 };
    const tl = gsap.timeline({
        onComplete: () => {
            mesh.userData.dissolveData.isDissolved = false;
            if (options.onComplete) options.onComplete();
        }
    });

    tl.to(reformProgress, {
        t: 1,
        duration: duration,
        ease: ease,
        onUpdate: () => {
            for (let i = 0; i < positions.count; i++) {
                const i3 = i * 3;
                const currentX = positions.array[i3];
                const currentY = positions.array[i3 + 1];
                const currentZ = positions.array[i3 + 2];
                const origX = originalPositions[i3];
                const origY = originalPositions[i3 + 1];
                const origZ = originalPositions[i3 + 2];

                positions.array[i3] = currentX + (origX - currentX) * reformProgress.t;
                positions.array[i3 + 1] = currentY + (origY - currentY) * reformProgress.t;
                positions.array[i3 + 2] = currentZ + (origZ - currentZ) * reformProgress.t;
            }
            positions.needsUpdate = true;
            mesh.geometry.computeVertexNormals();
        }
    }, 0);

    tl.to(mesh.material, { opacity: originalOpacity, duration: duration, ease: ease }, 0);

    if (mesh.material.emissive) {
        tl.to(mesh.material, { emissiveIntensity: originalEmissiveIntensity, duration: duration, ease: ease }, 0);
    }

    return tl;
}

// ═══════════════════════════════════════════════════════════════════
// MORPH CONTROLLER - State machine for transitions
// ═══════════════════════════════════════════════════════════════════

/**
 * State machine for managing geometry transitions
 */
export class MorphController {
    constructor(mesh, initialGeometryType = 'sphere-highres') {
        this.mesh = mesh;
        this.currentGeometryType = initialGeometryType;
        this.isDissolved = false;
        this.isTransitioning = false;
    }

    transitionTo(geometryType, options = {}) {
        if (this.isTransitioning) {
            console.warn('MorphController: Transition already in progress');
            return null;
        }
        if (this.isDissolved) {
            console.warn('MorphController: Cannot morph while dissolved');
            return null;
        }

        this.isTransitioning = true;
        const duration = options.duration || 2.0;
        const originalOnComplete = options.onComplete;
        options.onComplete = () => {
            this.currentGeometryType = geometryType;
            this.isTransitioning = false;
            if (originalOnComplete) originalOnComplete();
        };

        const tl = morphGeometry(this.mesh, geometryType, duration, options);
        if (!tl) this.isTransitioning = false;
        return tl;
    }

    dissolve(options = {}) {
        if (this.isDissolved || this.isTransitioning) return null;

        this.isTransitioning = true;
        const originalOnComplete = options.onComplete;
        options.onComplete = () => {
            this.isDissolved = true;
            this.isTransitioning = false;
            if (originalOnComplete) originalOnComplete();
        };

        return dissolveMesh(this.mesh, options);
    }

    reform(options = {}) {
        if (!this.isDissolved || this.isTransitioning) return null;

        this.isTransitioning = true;
        const duration = options.duration || 1.5;
        const originalOnComplete = options.onComplete;
        options.onComplete = () => {
            this.isDissolved = false;
            this.isTransitioning = false;
            if (originalOnComplete) originalOnComplete();
        };

        return reformMesh(this.mesh, duration, options);
    }

    cleanup() {
        if (this.mesh.userData.morphData) delete this.mesh.userData.morphData;
        if (this.mesh.userData.dissolveData) delete this.mesh.userData.dissolveData;
    }
}
