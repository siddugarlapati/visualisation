/**
 * background.js - Background Effects
 * 
 * Creates floating geometric background objects for visual appeal.
 */

import * as THREE from 'three';

/**
 * Initialize background objects
 */
export function initBackground(scene) {
    const bgObjects = [];

    // Create floating geometric shapes
    const geometries = [
        new THREE.IcosahedronGeometry(0.5, 0),
        new THREE.OctahedronGeometry(0.5, 0),
        new THREE.TetrahedronGeometry(0.5, 0),
        new THREE.TorusGeometry(0.3, 0.15, 8, 16),
        new THREE.BoxGeometry(0.5, 0.5, 0.5)
    ];

    const colors = [0x3b82f6, 0xa855f7, 0x22c55e, 0xf59e0b, 0x06b6d4];

    for (let i = 0; i < 20; i++) {
        const geometry = geometries[Math.floor(Math.random() * geometries.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.5,
            roughness: 0.3,
            transparent: true,
            opacity: 0.3,
            wireframe: Math.random() > 0.5
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Random position in the background
        mesh.position.set(
            (Math.random() - 0.5) * 40,
            (Math.random() - 0.5) * 30,
            -10 - Math.random() * 15
        );

        mesh.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );

        const scale = 0.5 + Math.random() * 1.5;
        mesh.scale.set(scale, scale, scale);

        // Store animation data
        mesh.userData = {
            rotSpeed: {
                x: (Math.random() - 0.5) * 0.01,
                y: (Math.random() - 0.5) * 0.01,
                z: (Math.random() - 0.5) * 0.01
            },
            floatSpeed: Math.random() * 0.002 + 0.001,
            floatOffset: Math.random() * Math.PI * 2,
            originalY: mesh.position.y
        };

        scene.add(mesh);
        bgObjects.push(mesh);
    }

    // Add ambient stars/particles
    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = [];
    const starColors = [];

    for (let i = 0; i < 200; i++) {
        starPositions.push(
            (Math.random() - 0.5) * 80,
            (Math.random() - 0.5) * 60,
            -20 - Math.random() * 30
        );

        const brightness = Math.random() * 0.5 + 0.5;
        starColors.push(brightness, brightness, brightness * 1.2);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));

    const starsMaterial = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.6
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    return bgObjects;
}

/**
 * Update background animation
 */
export function updateBackground(bgObjects, delta = 0.016) {
    const time = Date.now() * 0.001;

    bgObjects.forEach(obj => {
        if (!obj.userData) return;

        // Rotate
        obj.rotation.x += obj.userData.rotSpeed.x;
        obj.rotation.y += obj.userData.rotSpeed.y;
        obj.rotation.z += obj.userData.rotSpeed.z;

        // Float up and down
        obj.position.y = obj.userData.originalY +
            Math.sin(time * obj.userData.floatSpeed * 100 + obj.userData.floatOffset) * 1.5;
    });
}

export default { initBackground, updateBackground };
