/**
 * ml_base.js - Shared Animation Primitives for ML Visualizations
 * Core animation utilities used across all ML algorithm visualizations
 */

import * as THREE from 'three';
import gsap from 'gsap';

// ═══════════════════════════════════════════════════════════════════
// COLOR PALETTE
// ═══════════════════════════════════════════════════════════════════

export const ML_COLORS = {
    // Data points
    neutral: 0x888888,
    cyan: 0x00ffff,
    
    // Classes
    class0: 0xff4444,  // Red
    class1: 0x4488ff,  // Blue
    
    // Model elements
    modelLine: 0xffa500,  // Orange
    residual: 0xff6666,   // Light red
    residualLow: 0x66ff66, // Green (low error)
    
    // Clusters (K-Means)
    cluster1: 0xff6b6b,
    cluster2: 0x4ecdc4,
    cluster3: 0xffe66d,
    cluster4: 0x95e1d3,
    cluster5: 0xf38181,
    
    // UI
    axis: 0xffffff,
    grid: 0x333333,
    highlight: 0xffff00,
    glow: 0x00ffff
};

// ═══════════════════════════════════════════════════════════════════
// SPAWN ANIMATIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Spawn mesh with scale pop animation
 * @param {THREE.Mesh} mesh - The mesh to animate
 * @param {number} duration - Animation duration
 * @param {number} delay - Delay before animation starts
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
 * @param {Array<THREE.Mesh>} meshes - Array of meshes
 * @param {number} staggerDelay - Delay between each element
 */
export function spawnStaggered(meshes, staggerDelay = 0.1) {
    meshes.forEach((mesh, i) => {
        spawnWithPop(mesh, 0.5, i * staggerDelay);
    });
}

/**
 * Fade in material opacity
 * @param {THREE.Material} material - Material to fade
 * @param {number} duration - Fade duration
 * @param {number} targetOpacity - Final opacity
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
 * @param {THREE.Mesh} mesh - Mesh to animate
 * @param {number} amplitude - Oscillation amplitude
 * @param {number} speed - Oscillation speed
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
 * @param {THREE.Mesh} mesh - Mesh to pulse
 * @param {number} intensity - Pulse intensity (1.0 = no change)
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
 * @param {THREE.Mesh} mesh - Mesh to shake
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
 * @param {THREE.Scene} scene - Scene to add glow to
 * @param {THREE.Mesh} mesh - Center mesh
 * @param {number} color - Glow color
 * @param {boolean} animated - Whether to pulse
 */
export function addGlowRing(scene, mesh, color = ML_COLORS.glow, animated = true) {
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
 * @param {THREE.Scene} scene - Scene
 * @param {THREE.Vector3} position - Current position
 * @param {number} color - Trail color
 * @param {number} decay - How fast trail fades
 */
export function createTrailPoint(scene, position, color = ML_COLORS.cyan, size = 0.15, decay = 0.5) {
    const geometry = new THREE.SphereGeometry(size, 8, 8);
    const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.6
    });
    const trail = new THREE.Mesh(geometry, material);
    trail.position.copy(position);
    scene.add(trail);

    // Fade out and remove
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
 * Smoothly interpolate a value with callback
 * @param {Object} target - Object containing the value
 * @param {string} property - Property name to animate
 * @param {number} endValue - Target value
 * @param {number} duration - Animation duration
 * @param {Function} onUpdate - Callback on each update
 */
export function interpolateValue(target, property, endValue, duration = 1, onUpdate = null) {
    const tween = { value: target[property] };
    gsap.to(tween, {
        value: endValue,
        duration,
        ease: "power2.out",
        onUpdate: () => {
            target[property] = tween.value;
            if (onUpdate) onUpdate(tween.value);
        }
    });
}

/**
 * Interpolate color from one to another
 * @param {THREE.Material} material - Material to update
 * @param {number} fromColor - Starting color
 * @param {number} toColor - Ending color
 * @param {number} duration - Animation duration
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
 * @param {THREE.Camera} camera - Camera to move
 * @param {THREE.Vector3} targetPos - Target look-at position
 * @param {number} distance - Distance from target
 * @param {number} duration - Animation duration
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
 * @param {THREE.Camera} camera - Camera
 * @param {number} amplitude - Drift amount
 */
export function startCameraDrift(camera, amplitude = 0.5) {
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

/**
 * Soft axis highlighting when parameters update
 * @param {THREE.Object3D} axisLine - The axis line/group to highlight
 * @param {number} color - Highlight color
 * @param {number} duration - Highlight duration
 */
export function highlightAxis(axisLine, color = ML_COLORS.highlight, duration = 0.6) {
    if (!axisLine || !axisLine.material) return;
    
    const originalColor = axisLine.material.color.clone();
    const highlightColor = new THREE.Color(color);
    
    // Quick glow pulse
    gsap.to(axisLine.material.color, {
        r: highlightColor.r,
        g: highlightColor.g,
        b: highlightColor.b,
        duration: duration / 2,
        ease: "power2.out",
        yoyo: true,
        repeat: 1,
        onComplete: () => {
            axisLine.material.color.copy(originalColor);
        }
    });
    
    // Slight scale pulse
    if (axisLine.scale) {
        gsap.to(axisLine.scale, {
            x: 1.05, y: 1.05, z: 1.05,
            duration: duration / 2,
            ease: "power2.out",
            yoyo: true,
            repeat: 1
        });
    }
}

/**
 * Create axis glow ring for parameter updates
 * @param {THREE.Scene} scene - Scene
 * @param {THREE.Vector3} position - Position along axis
 * @param {string} axis - 'x', 'y', or 'z'
 * @param {number} color - Glow color
 */
export function createAxisGlow(scene, position, axis = 'y', color = ML_COLORS.highlight) {
    const geometry = new THREE.TorusGeometry(0.3, 0.08, 8, 16);
    const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.position.copy(position);
    
    // Orient based on axis
    if (axis === 'x') ring.rotation.y = Math.PI / 2;
    else if (axis === 'z') ring.rotation.x = Math.PI / 2;
    
    scene.add(ring);
    
    // Expand and fade
    gsap.to(ring.scale, {
        x: 2, y: 2, z: 2,
        duration: 0.5,
        ease: "power2.out"
    });
    gsap.to(material, {
        opacity: 0,
        duration: 0.5,
        onComplete: () => {
            scene.remove(ring);
            geometry.dispose();
            material.dispose();
        }
    });
    
    return ring;
}

/**
 * Micro camera auto-focus - subtle pan to center important action
 * @param {THREE.Camera} camera - Camera
 * @param {THREE.Vector3} targetPos - Position to center on
 * @param {number} strength - How much to pan (0-1, 0.1 = subtle)
 * @param {number} duration - Pan duration
 */
export function microAutoFocus(camera, targetPos, strength = 0.15, duration = 0.8) {
    // Calculate offset toward target
    const currentLookAt = new THREE.Vector3(0, 0, 0);  // Assuming origin
    const direction = new THREE.Vector3().subVectors(targetPos, currentLookAt);
    
    // Subtle offset
    const offset = direction.multiplyScalar(strength);
    
    gsap.to(camera.position, {
        x: camera.position.x + offset.x * 0.3,
        y: camera.position.y + offset.y * 0.2,
        z: camera.position.z + offset.z * 0.1,
        duration,
        ease: "power2.out"
    });
}

/**
 * Auto-focus on the center of a group of objects
 * @param {THREE.Camera} camera - Camera
 * @param {Array<THREE.Vector3>} positions - Positions to center on
 * @param {number} duration - Pan duration
 */
export function autoFocusGroup(camera, positions, duration = 1) {
    if (!positions || positions.length === 0) return;
    
    // Calculate center
    const center = new THREE.Vector3(0, 0, 0);
    positions.forEach(p => center.add(p));
    center.divideScalar(positions.length);
    
    microAutoFocus(camera, center, 0.1, duration);
}

/**
 * Smart auto-frame camera to fit all objects in view
 * Calculates bounding box and adjusts camera distance automatically
 * @param {THREE.Camera} camera - Camera to adjust
 * @param {THREE.Scene} scene - Scene containing objects
 * @param {Array<THREE.Object3D>} objects - Array of objects to frame (optional, uses scene if not provided)
 * @param {number} paddingFactor - Extra space around objects (1.0 = tight fit, 2.0 = double space)
 * @param {number} duration - Animation duration
 */
export function autoFrameObjects(camera, scene, objects = null, paddingFactor = 1.4, duration = 2.5) {
    // Get all visible meshes if objects not provided
    const targetObjects = objects || [];
    if (targetObjects.length === 0) {
        scene.traverse((obj) => {
            // Only include meshes, ignore axes/grid helper
            if (obj.isMesh && obj.visible && obj.parent !== scene.getObjectByName('axes')) {
                
                // Get TRUE world-space bounding box
                const worldBox = new THREE.Box3().setFromObject(obj);
                
                // If box is invalid or empty, skip
                if (worldBox.isEmpty()) return;

                const center = worldBox.getCenter(new THREE.Vector3());
                const size = worldBox.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);

                // IGNORE objects below the floor (y < -2)
                // This accounts for world space, regardless of nesting/rotation
                if (center.y < -2) return; 

                // IGNORE huge environment objects (likely skyboxes or planes)
                if (maxDim > 50) return;

                targetObjects.push(obj);
            }
        });
    }
    
    if (targetObjects.length === 0) {
        // Default camera if nothing found
        gsap.to(camera.position, {
            x: 0, y: 12, z: 30,
            duration: duration * 1.5, // Slower default move
            ease: "power2.inOut"
        });
        return;
    }
    
    // Calculate bounding box
    const boundingBox = new THREE.Box3();
    targetObjects.forEach(obj => {
        const box = new THREE.Box3().setFromObject(obj);
        boundingBox.union(box);
    });
    
    // Get box size and center
    const size = boundingBox.getSize(new THREE.Vector3());
    const center = boundingBox.getCenter(new THREE.Vector3());
    
    // Calculate maximum dimension
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Calculate required camera distance
    const fov = camera.fov || 50;
    const fovRad = (fov * Math.PI) / 180;
    let cameraDistance = (maxDim / 2) / Math.tan(fovRad / 2);
    
    // Apply padding
    cameraDistance *= paddingFactor;
    
    // Ensure reasonable distance bounds
    cameraDistance = Math.max(cameraDistance, 10);
    cameraDistance = Math.min(cameraDistance, 50); // Add max limit
    
    // Position camera at calculated distance with nice diagonal view
    // Constraint: Ensure camera is always significantly above the objects
    const minHeight = Math.max(10, size.y * 1.5);
    
    const targetCameraPos = new THREE.Vector3(
        center.x + cameraDistance * 0.4,
        Math.max(center.y + cameraDistance * 0.6, minHeight), // Ensure good height
        center.z + cameraDistance * 0.8
    );
    
    // Smooth animation
    gsap.to(camera.position, {
        x: targetCameraPos.x,
        y: targetCameraPos.y,
        z: targetCameraPos.z,
        duration,
        ease: "power2.inOut"
    });
    
    console.log(`📷 Auto-framed ${targetObjects.length} objects. Distance: ${cameraDistance.toFixed(2)}, Center: (${center.x.toFixed(1)}, ${center.y.toFixed(1)}, ${center.z.toFixed(1)})`);
}

// ═══════════════════════════════════════════════════════════════════
// STATE TRANSITION HELPER
// ═══════════════════════════════════════════════════════════════════

/**
 * Execute animation with before/after pause pattern
 * @param {Function} animationFn - The animation to run
 * @param {number} pauseBefore - Pause before animation (ms)
 * @param {number} pauseAfter - Pause after animation (ms)
 */
export async function withStateTransition(animationFn, pauseBefore = 500, pauseAfter = 300) {
    await delay(pauseBefore);
    await animationFn();
    await delay(pauseAfter);
}

/**
 * Simple delay promise
 * @param {number} ms - Milliseconds to wait
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════
// GEOMETRY HELPERS
// ═══════════════════════════════════════════════════════════════════

/**
 * Create a text sprite for labels with enhanced visibility
 * @param {string} text - Label text
 * @param {number} fontSize - Font size (default increased to 48)
 * @param {string} color - Text color
 * @param {Object} options - Additional options
 */
export function createTextSprite(text, fontSize = 48, color = '#ffffff', options = {}) {
    const {
        backgroundColor = 'rgba(0, 0, 0, 0.7)',
        padding = 20,
        borderRadius = 10,
        outlineColor = 'rgba(255, 255, 255, 0.3)',
        outlineWidth = 2
    } = options;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Larger canvas for better resolution
    canvas.width = 512;
    canvas.height = 128;
    
    // Measure text to calculate background size
    ctx.font = `bold ${fontSize}px Arial`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;
    
    // Draw rounded rectangle background
    const bgX = (canvas.width - textWidth) / 2 - padding;
    const bgY = (canvas.height - textHeight) / 2 - padding;
    const bgWidth = textWidth + padding * 2;
    const bgHeight = textHeight + padding * 2;
    
    // Background with rounded corners
    ctx.fillStyle = backgroundColor;
    ctx.beginPath();
    ctx.roundRect(bgX, bgY, bgWidth, bgHeight, borderRadius);
    ctx.fill();
    
    // Optional outline
    if (outlineWidth > 0) {
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = outlineWidth;
        ctx.stroke();
    }
    
    // Draw text
    ctx.fillStyle = color;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
        map: texture, 
        transparent: true,
        depthTest: false,  // Always visible on top
        depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    
    // Much larger scale for better visibility (increased from 6 to 10)
    sprite.scale.set(10, 2.5, 1);
    
    return sprite;
}

/**
 * Create arrow for vectors/directions
 * @param {THREE.Vector3} from - Start position
 * @param {THREE.Vector3} to - End position
 * @param {number} color - Arrow color
 */
export function createArrow(from, to, color = ML_COLORS.axis) {
    const direction = new THREE.Vector3().subVectors(to, from).normalize();
    const length = from.distanceTo(to);
    
    const arrow = new THREE.ArrowHelper(
        direction,
        from,
        length,
        color,
        length * 0.1,  // head length
        length * 0.05  // head width
    );
    
    return arrow;
}

// ═══════════════════════════════════════════════════════════════════
// ERROR VISUALIZATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Get color based on error magnitude (red = high, green = low)
 * @param {number} error - Error value (normalized 0-1)
 */
export function getErrorColor(error) {
    // Clamp error to 0-1
    const e = Math.min(1, Math.max(0, Math.abs(error)));
    
    // Interpolate: green (low) → yellow → red (high)
    if (e < 0.5) {
        // Green to yellow
        return new THREE.Color().setHSL(0.33 - e * 0.33, 1, 0.5);
    } else {
        // Yellow to red
        return new THREE.Color().setHSL(0.17 - (e - 0.5) * 0.34, 1, 0.5);
    }
}

/**
 * Animate residual line shrinking during training
 * @param {THREE.Line} line - Residual line
 * @param {number} oldError - Previous error value
 * @param {number} newError - New error value
 */
export function animateResidualShrink(line, positions, newEndY, duration = 0.5) {
    const startY = positions[1];  // Current data point Y
    const endY = positions[4];    // Current line Y
    
    gsap.to({ y: endY }, {
        y: newEndY,
        duration,
        ease: "power2.out",
        onUpdate: function() {
            positions[4] = this.targets()[0].y;
            line.geometry.attributes.position.needsUpdate = true;
        }
    });
}

// ═══════════════════════════════════════════════════════════════════
// POINT CLOUD (BULK SPAWN)
// ═══════════════════════════════════════════════════════════════════

/**
 * Spawn multiple data points efficiently as a point cloud
 * @param {THREE.Scene} scene - Scene to add points to
 * @param {Object} objects - Objects registry to store references
 * @param {Array<{id: string, x: number, y: number, z: number, color?: number}>} points - Array of point data
 * @param {Object} options - { size, opacity, stagger }
 * @returns {Array<THREE.Mesh>} Array of created meshes
 */
export function spawnPointCloud(scene, objects, points, options = {}) {
    const {
        size = 0.15,           // Smaller dots
        opacity = 1,
        stagger = 0.02,
        baseColor = ML_COLORS.neutral
    } = options;

    const meshes = [];
    const geometry = new THREE.SphereGeometry(size, 24, 24);  // Higher resolution for shinier look

    points.forEach((point, index) => {
        const color = point.color !== undefined ? point.color : baseColor;
        
        // Shinier material with high metalness and low roughness
        const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.85,       // Very shiny/metallic
            roughness: 0.12,       // Very smooth surface
            emissive: color,       // Self-illuminating glow
            emissiveIntensity: 0.15,
            transparent: opacity < 1,
            opacity: opacity,
            envMapIntensity: 1.2   // Boost environment reflections
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(point.x, point.y, point.z || 0);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Store reference by ID
        if (point.id && objects) {
            objects[point.id] = mesh;
        }
        
        scene.add(mesh);
        meshes.push(mesh);

        // Staggered pop animation
        mesh.scale.set(0, 0, 0);
        gsap.to(mesh.scale, {
            x: 1, y: 1, z: 1,
            duration: 0.4,
            delay: index * stagger,
            ease: "back.out(1.7)"
        });
    });

    console.log(`📍 Spawned point cloud with ${points.length} points`);
    return meshes;
}
