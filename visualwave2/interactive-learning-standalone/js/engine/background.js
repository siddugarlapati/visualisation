/**
 * background.js - Ethereal Light Pillar Background
 * 
 * Creates flowing purple/magenta light pillars with frosted glass grid.
 */

import * as THREE from 'three';

// Module references
let skyMaterial = null;
let gridHelper = null;
let groundMaterial = null;

/**
 * Initialize the animated background
 * @param {THREE.Scene} scene 
 */
export function initBackground(scene) {
    createLightPillarsSky(scene);
    createFrostedGrid(scene);

    // Handle resize
    window.addEventListener('resize', () => {
        if (skyMaterial) {
            skyMaterial.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
        }
    });

    console.log('✨ Ethereal Light Pillars background initialized');
}

/**
 * Creates the ethereal purple light pillars backdrop
 */
function createLightPillarsSky(scene) {
    const planeGeometry = new THREE.PlaneGeometry(500, 500);

    skyMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform vec2 uResolution;
            varying vec2 vUv;
            
            // Color palette - Sky Blue with Yellow-Orange contrast
            const vec3 darkBlue = vec3(0.01, 0.03, 0.08);       // Background base
            const vec3 deepSkyBlue = vec3(0.05, 0.15, 0.35);    // Glow tint
            const vec3 skyBlue = vec3(0.3, 0.6, 0.95);          // Pillar base
            const vec3 warmOrange = vec3(1.0, 0.6, 0.2);        // Pillar highlight (orange)
            const vec3 sunYellow = vec3(1.0, 0.85, 0.4);        // Pillar accent (yellow)
            
            // Noise functions
            float hash(float n) {
                return fract(sin(n) * 43758.5453);
            }
            
            float noise(float x) {
                float i = floor(x);
                float f = fract(x);
                return mix(hash(i), hash(i + 1.0), smoothstep(0.0, 1.0, f));
            }
            
            float noise2D(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            
            void main() {
                vec2 uv = vUv;
                float time = uTime * 0.05;
                
                vec3 color = darkBlue;
                
                // === FLOWING LIGHT PILLARS ===
                float pillars = 0.0;
                
                // Create multiple flowing light pillars
                for(float i = 0.0; i < 5.0; i++) {
                    // Each pillar has different position and movement
                    float pillarX = 0.15 + i * 0.18 + sin(time * 0.3 + i * 1.5) * 0.08;
                    float pillarWidth = 0.06 + noise(i * 5.0 + time) * 0.04;
                    
                    // Distance from pillar center
                    float dist = abs(uv.x - pillarX);
                    
                    // Soft pillar glow
                    float pillar = smoothstep(pillarWidth * 2.0, 0.0, dist);
                    pillar *= pillar; // Square for softer falloff
                    
                    // Vertical flow animation
                    float flow = sin(uv.y * 3.0 - time * (1.5 + i * 0.3) + i * 2.0) * 0.5 + 0.5;
                    flow *= smoothstep(0.0, 0.2, uv.y) * smoothstep(1.0, 0.6, uv.y);
                    
                    // Add subtle waviness
                    float wave = sin(uv.y * 8.0 + time * 2.0 + i) * 0.02;
                    pillar *= 1.0 + wave;
                    
                    pillars += pillar * flow * (0.8 - i * 0.1);
                }
                
                // === COLOR BLENDING ===
                // Base gradient
                color = mix(darkBlue, deepSkyBlue, uv.y * 0.8);
                
                // Add pillar colors - sky blue with orange/yellow accents
                vec3 pillarColor = mix(skyBlue, warmOrange, pillars * 0.6);
                pillarColor = mix(pillarColor, sunYellow, sin(uv.y * 2.0 + time) * 0.3 + 0.3);
                
                color = mix(color, pillarColor, pillars * 0.9);
                
                // === SOFT GLOW / BLUR EFFECT ===
                // Simulate blur with subtle noise
                float blurNoise = noise2D(uv * 50.0 + time * 0.1) * 0.03;
                color += pillarColor * blurNoise * pillars;
                
                // Central glow
                float centerGlow = 1.0 - length((uv - vec2(0.5, 0.5)) * vec2(1.2, 1.0));
                centerGlow = max(0.0, centerGlow);
                color += deepSkyBlue * centerGlow * 0.3;
                
                // === VIGNETTE ===
                float vignette = 1.0 - smoothstep(0.4, 1.0, length(uv - 0.5) * 1.3);
                color = mix(darkBlue * 0.3, color, vignette);
                
                // Subtle shimmer
                color *= 0.97 + sin(time * 2.0 + uv.y * 10.0) * 0.03;
                
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.FrontSide,
        depthWrite: false
    });

    const skyMesh = new THREE.Mesh(planeGeometry, skyMaterial);
    skyMesh.position.set(0, 0, -100);
    skyMesh.renderOrder = -1000;
    scene.add(skyMesh);

    // Match background color - dark blue
    scene.background = new THREE.Color(0x020510);
}

/**
 * Creates a frosted glass grid floor with blur simulation
 */
function createFrostedGrid(scene) {
    // Frosted glass ground plane with noise-based blur simulation
    const groundGeometry = new THREE.PlaneGeometry(300, 300);

    groundMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec2 vUv;
            
            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
            }
            
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
            }
            
            void main() {
                // Frosted glass base color (dark purple-ish)
                vec3 baseColor = vec3(0.03, 0.02, 0.06);
                
                // Add subtle noise for frosted effect
                float n = noise(vUv * 100.0 + uTime * 0.5) * 0.5;
                n += noise(vUv * 200.0 - uTime * 0.3) * 0.3;
                n += noise(vUv * 50.0) * 0.2;
                
                // Slight color variation
                vec3 color = baseColor + vec3(0.02, 0.01, 0.04) * n;
                
                // Edge fade
                float edgeFade = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
                edgeFade *= smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
                
                // Opacity with frosted blur simulation
                float opacity = 0.85 * edgeFade;
                
                gl_FragColor = vec4(color, opacity);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.y = -10.01;
    scene.add(groundPlane);

    // Grid lines on top - blue theme
    gridHelper = new THREE.GridHelper(300, 150, 0x3a6699, 0x1a3355);
    gridHelper.position.y = -10;
    gridHelper.material.opacity = 0.6;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
}

/**
 * Updates the background animation
 * @param {number} time - Current time in seconds
 */
export function updateBackground(time) {
    if (skyMaterial) {
        skyMaterial.uniforms.uTime.value = time;
    }
    if (groundMaterial) {
        groundMaterial.uniforms.uTime.value = time;
    }
}
