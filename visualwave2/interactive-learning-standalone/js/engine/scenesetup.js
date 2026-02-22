import * as THREE from 'three';

export const setupScene = (canvas) => {
    // 1. Renderer with High Performance Settings
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ═══════════════════════════════════════════════════════════════════
    // MODULE 3.4: CINEMATIC RENDERING FEATURES
    // ═══════════════════════════════════════════════════════════════════

    // ACES Tone Mapping (Industry-standard cinematic look)
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2; // Adjustable exposure control

    // 2. The Cinematic Void
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.03);

    // Background intensity + blurriness placeholders (for HDRI)
    // scene.backgroundIntensity = 0.5;
    // scene.backgroundBlurriness = 0.3;

    // 3. Camera
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 4, 12);
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

    // ═══════════════════════════════════════════════════════════════════
    // MODULE 3.2: LIGHTING PRESET SYSTEM
    // ═══════════════════════════════════════════════════════════════════

    const LIGHTING_PRESETS = {
        'neutral-studio': {
            spotLight: { color: 0xffffff, intensity: 20 },
            ambient: { intensity: 0.2 },
            rimLight: { color: 0x4f46e5, intensity: 2 }
        },
        'cool-tech': {
            spotLight: { color: 0x88ccff, intensity: 25 },
            ambient: { intensity: 0.15 },
            rimLight: { color: 0x0088ff, intensity: 3 }
        },
        'warm-product': {
            spotLight: { color: 0xffddaa, intensity: 18 },
            ambient: { intensity: 0.3 },
            rimLight: { color: 0xffa500, intensity: 1.5 }
        },
        'dark-scifi': {
            spotLight: { color: 0x6666ff, intensity: 15 },
            ambient: { intensity: 0.1 },
            rimLight: { color: 0xff00ff, intensity: 4 }
        }
    };

    const applyLightingPreset = (presetName) => {
        const preset = LIGHTING_PRESETS[presetName];
        if (!preset) {
            console.warn(`Lighting preset '${presetName}' not found`);
            return;
        }

        if (preset.spotLight) {
            spotLight.color.setHex(preset.spotLight.color);
            spotLight.intensity = preset.spotLight.intensity;
        }

        if (preset.ambient) {
            ambient.intensity = preset.ambient.intensity;
        }

        if (preset.rimLight) {
            rimLight.color.setHex(preset.rimLight.color);
            rimLight.intensity = preset.rimLight.intensity;
        }
    };

    applyLightingPreset('neutral-studio');

    return { scene, camera, renderer, applyLightingPreset };
};