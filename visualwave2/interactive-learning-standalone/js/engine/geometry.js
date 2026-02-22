/**
 * geometry.js - High-Resolution Geometry System
 * 
 * Creates high-resolution geometries for nodes and objects.
 * All geometries are designed to be morphing-compatible.
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// ═══════════════════════════════════════════════════════════════════
// GEOMETRY CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Geometry configuration for high-resolution shapes
 * Change these values to swap geometry types throughout the engine
 */
export const GEOMETRY_CONFIG = {
    nodeGeometry: 'sphere-highres',  // Options: 'sphere-highres', 'icosahedron', 'torus-knot', 'subdivided-box', 'superformula'
    cubeGeometry: 'subdivided-box'   // High-detail subdivided cubes for arrays
};

/**
 * Create high-resolution geometry for nodes and objects
 * 
 * @param {string} type - Geometry type
 * @param {number} size - Base size/radius (default: 0.5)
 * @returns {THREE.BufferGeometry} High-resolution geometry
 */
export function createHighResGeometry(type = 'sphere-highres', size = 0.5) {
    switch (type) {
        case 'sphere-highres':
            // High-resolution sphere with 128x128 segments
            return new THREE.SphereGeometry(size, 128, 128);

        case 'icosahedron':
            // Icosahedron with detail level 4 for geodesic appearance
            return new THREE.IcosahedronGeometry(size, 4);

        case 'torus-knot':
            // Torus knot with smooth parameters
            return new THREE.TorusKnotGeometry(
                size * 0.6, size * 0.2, 128, 32, 2, 3
            );

        case 'subdivided-box':
            // Proper rounded cube with equal dimensions
            return new RoundedBoxGeometry(
                size * 0.9, size * 0.9, size * 0.7, 4, 0.15
            );

        case 'superformula':
            // Parametric custom shape using superformula
            return createSuperformulaGeometry(size);

        default:
            console.warn(`Unknown geometry type: ${type}, defaulting to sphere-highres`);
            return new THREE.SphereGeometry(size, 128, 128);
    }
}

/**
 * Create a parametric geometry using the superformula
 * The superformula creates a wide variety of organic shapes
 * 
 * @param {number} size - Base size of the shape
 * @returns {THREE.BufferGeometry} Parametric geometry
 */
export function createSuperformulaGeometry(size = 0.5) {
    const m = 7, n1 = 0.5, n2 = 1.7, n3 = 1.7, a = 1, b = 1;

    const superformula = (theta) => {
        const t1 = Math.abs(Math.cos(m * theta / 4) / a);
        const t2 = Math.abs(Math.sin(m * theta / 4) / b);
        return Math.pow(Math.pow(t1, n2) + Math.pow(t2, n3), -1 / n1);
    };

    const geometry = new THREE.ParametricGeometry(
        (u, v, target) => {
            const theta = u * Math.PI * 2;
            const phi = v * Math.PI;
            const r1 = superformula(theta);
            const r2 = superformula(phi);
            const r = (r1 + r2) / 2;

            target.set(
                r * Math.sin(phi) * Math.cos(theta) * size,
                r * Math.sin(phi) * Math.sin(theta) * size,
                r * Math.cos(phi) * size
            );
        },
        64, 64
    );

    geometry.computeVertexNormals();
    return geometry;
}
