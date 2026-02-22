/**
 * materials.js - Premium PBR Materials (Adapted from visualizer3 engine)
 * 
 * Physical materials with glass, ceramic, glow, and laser effects.
 */

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════
// COLOR PALETTE
// ═══════════════════════════════════════════════════════════════════

export const COLORS = {
    // Data points
    neutral: 0x888888,
    cyan: 0x00ffff,

    // Classes
    class0: 0xff4444,
    class1: 0x4488ff,

    // Model
    modelLine: 0xffa500,
    residual: 0xff6666,
    residualLow: 0x66ff66,

    // Clusters
    cluster1: 0xff6b6b,
    cluster2: 0x4ecdc4,
    cluster3: 0xffe66d,

    // UI
    axis: 0xffffff,
    grid: 0x333333,
    highlight: 0xffff00,
    glow: 0x00ffff,
    success: 0x51cf66,
    warning: 0xffd700,

    // Elements
    fire: 0xff4500,
    water: 0x00bfff,
    void: 0x8a2be2,
    white: 0xffffff,
    purple: 0x9333ea,
    pink: 0xec4899
};

// ═══════════════════════════════════════════════════════════════════
// MATERIAL FACTORY
// ═══════════════════════════════════════════════════════════════════

export function createPremiumMaterial(options = {}) {
    const defaults = {
        color: 0x60a5fa,
        metalness: 0.3,
        roughness: 0.4,
        emissive: 0x000000,
        emissiveIntensity: 0.0,
        transparent: false,
        opacity: 1.0,
        clearcoat: 0.3,
        clearcoatRoughness: 0.25,
    };

    const config = { ...defaults, ...options };

    return new THREE.MeshPhysicalMaterial({
        color: config.color,
        metalness: config.metalness,
        roughness: config.roughness,
        emissive: config.emissive,
        emissiveIntensity: config.emissiveIntensity,
        transparent: config.transparent,
        opacity: config.opacity,
        clearcoat: config.clearcoat,
        clearcoatRoughness: config.clearcoatRoughness,
    });
}

// ═══════════════════════════════════════════════════════════════════
// PRE-BUILT MATERIALS
// ═══════════════════════════════════════════════════════════════════

// Glass orb (nodes, data points)
export const MAT_GLASS_ORB = createPremiumMaterial({
    color: 0x60a5fa,
    transmission: 0.6,
    roughness: 0.1,
    metalness: 0.05,
});

// Metallic ceramic (array blocks)
export const MAT_CERAMIC = createPremiumMaterial({
    color: 0xe0e7ef,
    metalness: 0.85,
    roughness: 0.15,
    emissive: 0x5a7088,
    emissiveIntensity: 0.2,
});

// Glow material (highlights, active elements)
export const MAT_GLOW = createPremiumMaterial({
    color: 0xffd700,
    emissive: 0xffd700,
    emissiveIntensity: 0.6,
    metalness: 0.1,
    roughness: 0.3,
});

// Laser material (connections, edges)
export const MAT_LASER = createPremiumMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 0.8,
    metalness: 0.0,
    roughness: 0.0,
    transparent: true,
    opacity: 0.7,
});

// Get material by type
export function getMaterialByType(type = 'default') {
    switch (type) {
        case 'glass': return MAT_GLASS_ORB.clone();
        case 'ceramic': return MAT_CERAMIC.clone();
        case 'glow': return MAT_GLOW.clone();
        case 'laser': return MAT_LASER.clone();
        default: return createPremiumMaterial();
    }
}

// Create a colored data point material (shiny metallic)
export function createPointMaterial(color = COLORS.neutral) {
    return new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.85,
        roughness: 0.12,
        emissive: color,
        emissiveIntensity: 0.15,
    });
}
