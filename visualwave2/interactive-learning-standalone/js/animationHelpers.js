/**
 * animationHelpers.js - GSAP Animation Primitives (Adapted from visualizer3 ml_base.js)
 * 
 * Core animation utilities: spawn, pulse, shake, glow, trail,
 * text sprites, and interpolation helpers.
 */

import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════
// SPAWN ANIMATIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Spawn mesh with scale pop animation
 */
export function spawnWithPop(mesh, duration = 0.5, delay = 0) {
    mesh.scale.set(0, 0, 0);
    gsap.to(mesh.scale, {
        x: 1, y: 1, z: 1,
        duration,
        delay,
        ease: "back.out(1.7)"
    });
}

/**
 * Spawn with staggered delay (for multiple elements)
 */
export function spawnStaggered(meshes, staggerDelay = 0.1) {
    meshes.forEach((mesh, i) => {
        spawnWithPop(mesh, 0.5, i * staggerDelay);
    });
}

/**
 * Fade in material opacity
 */
export function fadeIn(material, duration = 0.5, targetOpacity = 1) {
    material.transparent = true;
    material.opacity = 0;
    gsap.to(material, {
        opacity: targetOpacity,
        duration,
        ease: "power2.out"
    });
}

// ═══════════════════════════════════════════════════════════════════
// MICRO-MOTION EFFECTS
// ═══════════════════════════════════════════════════════════════════

/**
 * Add subtle vertical oscillation to make points feel "alive"
 */
export function addMicroMotion(mesh, amplitude = 0.05, speed = 2) {
    const originalY = mesh.position.y;
    gsap.to(mesh.position, {
        y: originalY + amplitude,
        duration: speed,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
    });
}

/**
 * Pulse animation (scale up and down)
 */
export function pulse(mesh, intensity = 1.2, duration = 0.5) {
    gsap.to(mesh.scale, {
        x: intensity, y: intensity, z: intensity,
        duration: duration / 2,
        ease: "power2.out",
        yoyo: true,
        repeat: 1
    });
}

/**
 * Shake animation (for errors/misclassification)
 */
export function shake(mesh, intensity = 0.1, duration = 0.3) {
    const originalX = mesh.position.x;
    gsap.to(mesh.position, {
        x: originalX + intensity,
        duration: duration / 4,
        ease: "power2.inOut",
        yoyo: true,
        repeat: 3,
        onComplete: () => mesh.position.x = originalX
    });
}

// ═══════════════════════════════════════════════════════════════════
// GLOW & TRAIL EFFECTS
// ═══════════════════════════════════════════════════════════════════

/**
 * Create glow ring around a mesh
 */
export function addGlowRing(scene, mesh, color = 0x00ffff, animated = true) {
    const geometry = new THREE.RingGeometry(0.4, 0.5, 32);
    const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.position.copy(mesh.position);
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);

    if (animated) {
        gsap.to(ring.scale, {
            x: 1.3, y: 1.3,
            duration: 1,
            ease: "power1.inOut",
            yoyo: true,
            repeat: -1
        });
        gsap.to(material, {
            opacity: 0.3,
            duration: 1,
            ease: "power1.inOut",
            yoyo: true,
            repeat: -1
        });
    }

    return ring;
}

/**
 * Create motion trail behind moving object
 */
export function createTrailPoint(scene, position, color = 0x00ffff, size = 0.15, decay = 0.5) {
    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6
    });
    const trail = new THREE.Mesh(geometry, material);
    trail.position.copy(position);
    scene.add(trail);

    gsap.to(material, {
        opacity: 0,
        duration: decay,
        onComplete: () => {
            scene.remove(trail);
            geometry.dispose();
            material.dispose();
        }
    });

    return trail;
}

// ═══════════════════════════════════════════════════════════════════
// INTERPOLATION UTILITIES
// ═══════════════════════════════════════════════════════════════════

/**
 * Interpolate color from one to another
 */
export function interpolateColor(material, fromColor, toColor, duration = 0.5) {
    const from = new THREE.Color(fromColor);
    const to = new THREE.Color(toColor);
    const progress = { t: 0 };

    gsap.to(progress, {
        t: 1,
        duration,
        ease: "power2.out",
        onUpdate: () => {
            material.color.lerpColors(from, to, progress.t);
            if (material.emissive) {
                material.emissive.lerpColors(from, to, progress.t);
            }
        }
    });
}

// ═══════════════════════════════════════════════════════════════════
// CAMERA UTILITIES
// ═══════════════════════════════════════════════════════════════════

/**
 * Smoothly reframe camera to focus on target area
 */
export function focusCameraOn(camera, targetPos, distance = 15, duration = 1.5) {
    const targetCameraPos = new THREE.Vector3(
        targetPos.x,
        targetPos.y + distance * 0.5,
        targetPos.z + distance
    );

    gsap.to(camera.position, {
        x: targetCameraPos.x,
        y: targetCameraPos.y,
        z: targetCameraPos.z,
        duration,
        ease: "power2.inOut"
    });
}

/**
 * Subtle camera drift for ambient motion
 */
export function startCameraDrift(camera, amplitude = 0.3) {
    const originalPos = camera.position.clone();

    return gsap.timeline({ repeat: -1 })
        .to(camera.position, {
            x: originalPos.x + amplitude,
            duration: 8,
            ease: "sine.inOut"
        })
        .to(camera.position, {
            x: originalPos.x - amplitude,
            duration: 8,
            ease: "sine.inOut"
        });
}

// ═══════════════════════════════════════════════════════════════════
// TEXT SPRITES
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a text sprite for labels with enhanced visibility
 */
export function createTextSprite(text, fontSize = 48, color = '#ffffff', options = {}) {
    const {
        backgroundColor = 'rgba(0, 0, 0, 0.7)',
        padding = 20,
        borderRadius = 10,
    } = options;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = 512;
    canvas.height = 128;

    ctx.font = `bold ${fontSize}px Arial`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    // Background
    const bgX = (canvas.width - textWidth) / 2 - padding;
    const bgY = (canvas.height - textHeight) / 2 - padding;
    const bgWidth = textWidth + padding * 2;
    const bgHeight = textHeight + padding * 2;

    ctx.fillStyle = backgroundColor;
    ctx.beginPath();
    ctx.roundRect(bgX, bgY, bgWidth, bgHeight, borderRadius);
    ctx.fill();

    // Text
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(5, 1.25, 1);

    return sprite;
}

/**
 * Create arrow helper between two points
 */
export function createArrow(from, to, color = 0xffffff) {
    const direction = new THREE.Vector3().subVectors(to, from).normalize();
    const length = from.distanceTo(to);

    return new THREE.ArrowHelper(
        direction, from, length, color,
        length * 0.1, length * 0.05
    );
}

// ═══════════════════════════════════════════════════════════════════
// UTILITY
// ═══════════════════════════════════════════════════════════════════

export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get color based on error magnitude (red = high, green = low)
 */
export function getErrorColor(error) {
    const e = Math.min(1, Math.max(0, Math.abs(error)));
    if (e < 0.5) {
        return new THREE.Color().setHSL(0.33 - e * 0.33, 1, 0.5);
    } else {
        return new THREE.Color().setHSL(0.17 - (e - 0.5) * 0.34, 1, 0.5);
    }
}
