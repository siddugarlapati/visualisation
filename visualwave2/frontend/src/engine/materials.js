/**
 * materials.js - Material System Module
 * 
 * Elemental materials, physical materials, and color constants
 * for the GSAP visualization engine.
 */

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════
// PREMIUM PHYSICAL MATERIALS SYSTEM
// ═══════════════════════════════════════════════════════════════════

/**
 * Create premium physical material with advanced PBR properties
 * MeshPhysicalMaterial is Three.js's most advanced material type
 * 
 * @param {Object} options - Material configuration options
 * @returns {THREE.MeshPhysicalMaterial} Premium physical material instance
 */
export function createPhysicalMaterial(options = {}) {
    const defaults = {
        color: 0xffffff,
        transmission: 1,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        roughness: 0.15,
        metalness: 0.08,
        thickness: 1,
        ior: 1.3,
        emissive: 0x000000,
        emissiveIntensity: 0.1,
        opacity: 1,
        transparent: false,
        toneMapped: true,
        envMap: null,
    };

    const config = Object.assign({}, defaults, options);
    return new THREE.MeshPhysicalMaterial(config);
}

// ═══════════════════════════════════════════════════════════════════
// ELEMENTAL MATERIALS - High-fidelity PBR materials
// ═══════════════════════════════════════════════════════════════════

// FIRE - Red-orange gradients with high emissive glow
export const createFireMaterial = () => {
    return createPhysicalMaterial({
        color: 0xff4500,
        emissive: 0xff6600,
        emissiveIntensity: 0.8,
        metalness: 0.3,
        roughness: 0.2,
        clearcoatRoughness: 0.3,
        transmission: 0.0,
        toneMapped: false
    });
};

// WATER - Blue-cyan gradients with high transmission
export const createWaterMaterial = () => {
    return createPhysicalMaterial({
        color: 0x00bfff,
        emissive: 0x004080,
        emissiveIntensity: 0.3,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.6,
        thickness: 1.5,
        ior: 1.33,
        clearcoatRoughness: 0.1,
    });
};

// AIR - White-cyan gradients with low opacity
export const createAirMaterial = () => {
    return createPhysicalMaterial({
        color: 0xe0ffff,
        emissive: 0xadd8e6,
        emissiveIntensity: 0.5,
        metalness: 0.0,
        roughness: 0.15,
        transmission: 0.4,
        thickness: 0.5,
        ior: 1.0003,
        clearcoatRoughness: 0.5,
        opacity: 0.85,
        transparent: true
    });
};

// EARTH - Brown-green gradients with high roughness
export const createEarthMaterial = () => {
    return createPhysicalMaterial({
        color: 0x8b7355,
        emissive: 0x2d5016,
        emissiveIntensity: 0.2,
        metalness: 0.2,
        roughness: 0.8,
        clearcoatRoughness: 0.9,
        transmission: 0.0,
    });
};

// VOID - Purple-black gradients with mysterious aura
export const createVoidMaterial = () => {
    return createPhysicalMaterial({
        color: 0x4b0082,
        emissive: 0x8a2be2,
        emissiveIntensity: 1.2,
        metalness: 0.6,
        roughness: 0.3,
        transmission: 0.2,
        thickness: 1.0,
        ior: 2.4,
        clearcoatRoughness: 0.2,
        toneMapped: false
    });
};

/**
 * Material factory - Get material by element type
 * @param {string} elementType - 'fire', 'water', 'air', 'earth', 'void'
 * @returns {THREE.MeshPhysicalMaterial}
 */
export const getElementalMaterial = (elementType = 'fire') => {
    switch (elementType.toLowerCase()) {
        case 'fire': return createFireMaterial();
        case 'water': return createWaterMaterial();
        case 'air': return createAirMaterial();
        case 'earth': return createEarthMaterial();
        case 'void': return createVoidMaterial();
        default:
            console.warn(`Unknown element type: ${elementType}, defaulting to fire`);
            return createFireMaterial();
    }
};

/**
 * Element color map for particles and effects
 */
export const ELEMENT_COLORS = {
    fire: 0xff4500,
    water: 0x00bfff,
    air: 0xe0ffff,
    earth: 0x8b7355,
    void: 0x8a2be2
};

/**
 * Morph material properties from one element to another
 */
export const getMorphConfig = (material, toType, duration = 2.0) => {
    const targetMat = getElementalMaterial(toType);
    return {
        duration,
        ease: 'power2.inOut',
        onUpdate: () => { material.needsUpdate = true; },
        targets: {
            color: { r: targetMat.color.r, g: targetMat.color.g, b: targetMat.color.b },
            emissive: { r: targetMat.emissive.r, g: targetMat.emissive.g, b: targetMat.emissive.b },
            emissiveIntensity: targetMat.emissiveIntensity,
            metalness: targetMat.metalness,
            roughness: targetMat.roughness,
            transmission: targetMat.transmission,
            clearcoat: targetMat.clearcoat,
            clearcoatRoughness: targetMat.clearcoatRoughness,
            opacity: targetMat.opacity
        }
    };
};

/**
 * Elemental particle presets for micro-effects
 */
export const ELEMENT_PARTICLE_CONFIGS = {
    fire: { count: 20, color: 0xff6600, speed: { x: 0.3, y: 0.4, z: 0.3 }, life: 1.2 },
    water: { count: 15, color: 0x00bfff, speed: { x: 0.2, y: 0.2, z: 0.2 }, life: 1.5 },
    air: { count: 25, color: 0xe0ffff, speed: { x: 0.4, y: 0.5, z: 0.4 }, life: 1.0 },
    earth: { count: 12, color: 0x8b7355, speed: { x: 0.15, y: 0.3, z: 0.15 }, life: 1.8 },
    void: { count: 18, color: 0x8a2be2, speed: { x: 0.25, y: 0.35, z: 0.25 }, life: 1.4 }
};

// ═══════════════════════════════════════════════════════════════════
// STANDARD MATERIALS
// ═══════════════════════════════════════════════════════════════════

// Frosted Glass (Nodes) - Premium glass-like material
export const MAT_GLASS_ORB = createPhysicalMaterial({
    color: 0x60a5fa,
    transmission: 0.6,
    ior: 1.5,
    thickness: 2,
    roughness: 0.1,
    metalness: 0.05,
});

// Metallic Polished (Array Blocks)
export const MAT_CERAMIC = createPhysicalMaterial({
    color: 0xe0e7ef,
    metalness: 0.85,
    roughness: 0.15,
    transmission: 0.2,
    thickness: 0.8,
    emissive: 0x5a7088,
    emissiveIntensity: 0.2,
});

// Neon Core - High-intensity glowing material
export const MAT_GLOW = createPhysicalMaterial({
    color: 0xffffff,
    emissive: 0x3b82f6,
    emissiveIntensity: 2,
    transmission: 0.4,
    thickness: 0.5,
    roughness: 0.1,
    toneMapped: false,
});

export const MAT_LASER = new THREE.MeshBasicMaterial({
    color: 0x3b82f6,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending
});

export const MAT_PARTICLE = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 1
});

export const COLORS = {
    orange: 0xf59e0b,
    green: 0x10b981,
    red: 0xef4444,
    blue: 0x3b82f6,
    default: 0x334155,
    // Elemental colors
    fire: 0xff4500,
    water: 0x00bfff,
    air: 0xe0ffff,
    earth: 0x8b7355,
    void: 0x8a2be2,
    // Additional useful colors
    white: 0xffffff,
    cyan: 0x00ffff,
    purple: 0x9333ea,
    yellow: 0xfbbf24,
    pink: 0xec4899
};

/**
 * Get material by type string (for LLM inline material selection)
 * @param {string} materialType - Material type
 * @returns {THREE.MeshPhysicalMaterial} Material instance
 */
export function getMaterialByType(materialType = 'default') {
    switch (materialType.toLowerCase()) {
        case 'glass': return MAT_GLASS_ORB.clone();
        case 'metal':
            return createPhysicalMaterial({
                color: 0xe0e7ef,
                metalness: 0.95,
                roughness: 0.05,
                clearcoat: 1.0,
                clearcoatRoughness: 0.05,
                transmission: 0.0
            });
        case 'fire': return createFireMaterial();
        case 'water': return createWaterMaterial();
        case 'air': return createAirMaterial();
        case 'earth': return createEarthMaterial();
        case 'void': return createVoidMaterial();
        case 'default':
        default: return MAT_CERAMIC.clone();
    }
}
