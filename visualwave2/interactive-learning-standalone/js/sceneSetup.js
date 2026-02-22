/**
 * sceneSetup.js - Cinematic Scene Setup (Adapted from visualizer3 engine)
 * 
 * Creates a premium Three.js scene with dramatic lighting,
 * reflective floor, fog, and grid - matching the main visualizer's look.
 */

import * as THREE from 'three';

export function setupScene(container) {
    // 1. Renderer with high-performance settings
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance"
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ACES Tone Mapping (cinematic look)
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.appendChild(renderer.domElement);

    // 2. The Cinematic Void
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.025);

    // 3. Camera
    const camera = new THREE.PerspectiveCamera(
        45,
        container.clientWidth / container.clientHeight,
        0.1,
        100
    );
    camera.position.set(0, 4, 14);
    camera.lookAt(0, 0, 0);

    // 4. Lighting (Dramatic)
    const ambient = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambient);

    const spotLight = new THREE.SpotLight(0xffffff, 20);
    spotLight.position.set(5, 10, 5);
    spotLight.angle = 0.6;
    spotLight.penumbra = 0.5;
    spotLight.castShadow = true;
    spotLight.shadow.bias = -0.0001;
    scene.add(spotLight);

    const rimLight = new THREE.DirectionalLight(0x4f46e5, 2);
    rimLight.position.set(-5, 2, -5);
    scene.add(rimLight);

    // 5. Reflective Floor
    const planeGeo = new THREE.PlaneGeometry(100, 100);
    const planeMat = new THREE.MeshStandardMaterial({
        color: 0x050505,
        roughness: 0.1,
        metalness: 0.8
    });
    const floor = new THREE.Mesh(planeGeo, planeMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Soft Contact Shadow Plane
    const shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.ShadowMaterial({ opacity: 0.25 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.99;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // Grid Helper
    const grid = new THREE.GridHelper(100, 100, 0x333333, 0x111111);
    grid.position.y = -1.99;
    scene.add(grid);

    // Handle resize
    const onResize = () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return { scene, camera, renderer, onResize };
}
