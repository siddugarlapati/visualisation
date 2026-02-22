/**
 * particles.js - GPU Particle Engine Module
 * 
 * GPU-optimized particle system using InstancedMesh for high-performance
 * particle effects and mesh-to-particle dissolve transitions.
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { simplexNoise3D } from './morphing.js';

// ═══════════════════════════════════════════════════════════════════
// GPU PARTICLE SYSTEM
// ═══════════════════════════════════════════════════════════════════

/**
 * GPU-Optimized Particle System using InstancedMesh
 * 1 InstancedMesh = 1 draw call for 10,000+ particles
 */
export class GPUParticleSystem {
    constructor(scene, camera, maxParticles = 10000) {
        this.scene = scene;
        this.camera = camera;
        this.maxParticles = maxParticles;

        // Particle data arrays
        this.positions = new Array(maxParticles);
        this.velocities = new Array(maxParticles);
        this.lifetimes = new Float32Array(maxParticles);
        this.noiseOffsets = new Array(maxParticles);
        this.active = new Array(maxParticles).fill(false);

        for (let i = 0; i < maxParticles; i++) {
            this.positions[i] = new THREE.Vector3();
            this.velocities[i] = new THREE.Vector3();
            this.noiseOffsets[i] = new THREE.Vector3(
                Math.random() * 100, Math.random() * 100, Math.random() * 100
            );
        }

        // Create InstancedMesh
        const geometry = new THREE.TetrahedronGeometry(0.15, 0);
        const colors = new Float32Array(maxParticles * 3);
        for (let i = 0; i < maxParticles; i++) {
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 0.65;
            colors[i * 3 + 2] = 0.0;
        }
        geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colors, 3));

        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xff6600,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });

        this.instancedMesh = new THREE.InstancedMesh(geometry, material, maxParticles);
        this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.instancedMesh.frustumCulled = false;

        // Hide all instances initially
        const matrix = new THREE.Matrix4();
        matrix.setPosition(0, -1000, 0);
        for (let i = 0; i < maxParticles; i++) {
            this.instancedMesh.setMatrixAt(i, matrix);
        }
        this.instancedMesh.instanceMatrix.needsUpdate = true;

        this.scene.add(this.instancedMesh);
        this.time = 0;
    }

    createParticleField(count, options = {}) {
        const {
            center = new THREE.Vector3(0, 0, 0),
            spread = 5,
            velocity = new THREE.Vector3(0, 0.1, 0),
            lifetime = 3.0
        } = options;

        let created = 0;
        for (let i = 0; i < this.maxParticles && created < count; i++) {
            if (!this.active[i]) {
                this.active[i] = true;
                this.lifetimes[i] = lifetime;
                this.positions[i].set(
                    center.x + (Math.random() - 0.5) * spread,
                    center.y + (Math.random() - 0.5) * spread,
                    center.z + (Math.random() - 0.5) * spread
                );
                this.velocities[i].set(
                    velocity.x + (Math.random() - 0.5) * 0.3,
                    velocity.y + (Math.random() - 0.5) * 0.3,
                    velocity.z + (Math.random() - 0.5) * 0.3
                );
                created++;
            }
        }
    }

    emit(pos, count = 10, color = 0xf59e0b) {
        let spawned = 0;
        for (let i = 0; i < this.maxParticles && spawned < count; i++) {
            if (!this.active[i]) {
                this.active[i] = true;
                this.lifetimes[i] = 1.0;
                this.positions[i].copy(pos);
                this.velocities[i].set(
                    (Math.random() - 0.5) * 0.6,
                    (Math.random() * 0.4) + 0.2,
                    (Math.random() - 0.5) * 0.6
                );
                spawned++;
            }
        }
    }

    updateParticleField(deltaTime) {
        this.time += deltaTime;
        const noiseStrength = 0.02;
        const lifeDecay = deltaTime * 0.5;

        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const rotation = new THREE.Euler();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();

        for (let i = 0; i < this.maxParticles; i++) {
            if (!this.active[i]) continue;

            this.lifetimes[i] -= lifeDecay;

            if (this.lifetimes[i] <= 0) {
                this.active[i] = false;
                matrix.setPosition(0, -1000, 0);
                this.instancedMesh.setMatrixAt(i, matrix);
                continue;
            }

            this.positions[i].add(this.velocities[i].clone().multiplyScalar(deltaTime));

            const pos = this.positions[i];
            const offset = this.noiseOffsets[i];

            // Multi-layer noise turbulence
            const noise1X = simplexNoise3D(pos.x * 0.2 + offset.x, pos.y * 0.2 + offset.y, this.time * 0.3);
            const noise1Y = simplexNoise3D(pos.y * 0.2 + offset.y, pos.z * 0.2 + offset.z, this.time * 0.3 + 100);
            const noise1Z = simplexNoise3D(pos.z * 0.2 + offset.z, pos.x * 0.2 + offset.x, this.time * 0.3 + 200);

            const noise2X = simplexNoise3D(pos.x * 0.8 + offset.x, pos.y * 0.8 + offset.y, this.time * 0.8) * 0.5;
            const noise2Y = simplexNoise3D(pos.y * 0.8 + offset.y, pos.z * 0.8 + offset.z, this.time * 0.8 + 100) * 0.5;
            const noise2Z = simplexNoise3D(pos.z * 0.8 + offset.z, pos.x * 0.8 + offset.x, this.time * 0.8 + 200) * 0.5;

            const noise3X = simplexNoise3D(pos.x * 2.0 + offset.x, pos.y * 2.0 + offset.y, this.time * 1.5) * 0.25;
            const noise3Y = simplexNoise3D(pos.y * 2.0 + offset.y, pos.z * 2.0 + offset.z, this.time * 1.5 + 100) * 0.25;
            const noise3Z = simplexNoise3D(pos.z * 2.0 + offset.z, pos.x * 2.0 + offset.x, this.time * 1.5 + 200) * 0.25;

            pos.x += (noise1X + noise2X + noise3X) * noiseStrength;
            pos.y += (noise1Y + noise2Y + noise3Y) * noiseStrength;
            pos.z += (noise1Z + noise2Z + noise3Z) * noiseStrength;

            this.velocities[i].y -= 0.05 * deltaTime;

            // Depth-based color fading
            const cameraPos = this.camera.position;
            const distance = pos.distanceTo(cameraPos);
            const depthFactor = Math.max(0.3, 1 - (distance / 40));

            const colorAttr = this.instancedMesh.geometry.attributes.color;
            colorAttr.setXYZ(i, 1.0 * depthFactor, 0.65 * depthFactor, 0.1 * depthFactor);
            colorAttr.needsUpdate = true;

            const lifeFactor = this.lifetimes[i];
            scale.setScalar(lifeFactor * 0.15);

            rotation.set(this.time + i * 0.1, this.time * 0.5 + i * 0.05, 0);
            quaternion.setFromEuler(rotation);

            position.copy(this.positions[i]);
            matrix.compose(position, quaternion, scale);
            this.instancedMesh.setMatrixAt(i, matrix);
        }

        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }

    tick() {
        this.updateParticleField(1 / 60);
    }
}

// Alias for backward compatibility
export const ParticleSystem = GPUParticleSystem;

// ═══════════════════════════════════════════════════════════════════
// PARTICLE DISSOLVE & REFORM TRANSITIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Dissolve mesh into particles (mesh → particles transition)
 */
export function dissolveObjectToParticles(mesh, particleSystem, options = {}) {
    if (!mesh || !mesh.geometry || !particleSystem) {
        console.warn('dissolveObjectToParticles: Invalid mesh or particle system');
        return null;
    }

    const { duration = 2.0, blastForce = 2.0, swirlStrength = 1.5, onComplete = null } = options;

    const positions = mesh.geometry.attributes.position;
    const vertexCount = positions.count;
    const particleCount = Math.min(vertexCount, particleSystem.maxParticles);

    if (!mesh.userData.particleDissolveData) {
        mesh.userData.particleDissolveData = {};
    }

    const particleIndices = [];
    const originalVertexPositions = [];
    const worldMatrix = mesh.matrixWorld;

    let assigned = 0;
    for (let i = 0; i < particleSystem.maxParticles && assigned < particleCount; i++) {
        if (!particleSystem.active[i]) {
            particleSystem.active[i] = true;
            particleSystem.lifetimes[i] = duration + 2.0;

            const v = new THREE.Vector3(
                positions.array[assigned * 3],
                positions.array[assigned * 3 + 1],
                positions.array[assigned * 3 + 2]
            );
            v.applyMatrix4(worldMatrix);

            originalVertexPositions.push(v.clone());
            particleSystem.positions[i].copy(v);

            const angle = (assigned / particleCount) * Math.PI * 2 * 3;
            const noiseOffset = simplexNoise3D(v.x, v.y, v.z) * 0.5;

            particleSystem.velocities[i].set(
                Math.cos(angle) * blastForce * (1 + noiseOffset),
                (Math.random() - 0.3) * blastForce * 0.5,
                Math.sin(angle) * blastForce * (1 + noiseOffset)
            );
            particleSystem.velocities[i].y += blastForce * 0.3;

            particleIndices.push(i);
            assigned++;
        }
    }

    mesh.userData.particleDissolveData = {
        particleIndices,
        vertexPositions: originalVertexPositions,
        isDissolved: false
    };

    if (!mesh.material.transparent) mesh.material.transparent = true;
    const originalOpacity = mesh.material.opacity;

    const tl = gsap.timeline({
        onComplete: () => {
            mesh.userData.particleDissolveData.isDissolved = true;
            mesh.visible = false;
            if (onComplete) onComplete();
        }
    });

    tl.to(mesh.material, { opacity: 0, duration: duration * 0.8, ease: 'power2.in' }, 0);

    const swirlProgress = { t: 0 };
    tl.to(swirlProgress, {
        t: 1,
        duration: duration,
        ease: 'power1.out',
        onUpdate: () => {
            const swirlAngle = swirlProgress.t * Math.PI * swirlStrength;
            particleIndices.forEach(i => {
                if (particleSystem.active[i]) {
                    const vel = particleSystem.velocities[i];
                    const rotatedX = vel.x * Math.cos(swirlAngle) - vel.z * Math.sin(swirlAngle);
                    const rotatedZ = vel.x * Math.sin(swirlAngle) + vel.z * Math.cos(swirlAngle);
                    vel.x = rotatedX;
                    vel.z = rotatedZ;
                }
            });
        }
    }, 0);

    return tl;
}

/**
 * Reform particles back into mesh (particles → mesh transition)
 */
export function reformParticlesToObject(mesh, particleSystem, options = {}) {
    if (!mesh || !particleSystem) {
        console.warn('reformParticlesToObject: Invalid mesh or particle system');
        return null;
    }

    if (!mesh.userData.particleDissolveData || !mesh.userData.particleDissolveData.isDissolved) {
        console.warn('reformParticlesToObject: Mesh not dissolved or no dissolve data');
        return null;
    }

    const { duration = 1.5, ease = 'back.out(1.7)', onComplete = null } = options;

    const dissolveData = mesh.userData.particleDissolveData;
    const { particleIndices, vertexPositions } = dissolveData;

    mesh.visible = true;

    const tl = gsap.timeline({
        onComplete: () => {
            particleIndices.forEach(i => { particleSystem.active[i] = false; });
            dissolveData.isDissolved = false;
            if (onComplete) onComplete();
        }
    });

    particleIndices.forEach((particleIdx, vertexIdx) => {
        if (particleSystem.active[particleIdx]) {
            const targetPos = vertexPositions[vertexIdx];
            const particle = particleSystem.positions[particleIdx];

            tl.to(particle, {
                x: targetPos.x, y: targetPos.y, z: targetPos.z,
                duration: duration, ease: ease
            }, 0);

            tl.to(particleSystem.lifetimes, {
                [particleIdx]: 0,
                duration: duration * 0.5,
                ease: 'power2.in'
            }, duration * 0.5);
        }
    });

    tl.to(mesh.material, {
        opacity: mesh.userData.particleDissolveData.originalOpacity || 1.0,
        duration: duration * 0.6,
        ease: ease
    }, duration * 0.4);

    return tl;
}
