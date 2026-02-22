/**
 * particles.js - Particle System for Visual Effects
 * 
 * Provides particle effects for NLP visualizations.
 */

import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.particles = [];
        this.maxParticles = 500;

        // Create particle pool
        this.geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.maxParticles * 3);
        this.colors = new Float32Array(this.maxParticles * 3);
        this.sizes = new Float32Array(this.maxParticles);
        this.velocities = [];
        this.lifetimes = [];
        this.activeCount = 0;

        for (let i = 0; i < this.maxParticles; i++) {
            this.positions[i * 3] = 0;
            this.positions[i * 3 + 1] = 0;
            this.positions[i * 3 + 2] = 0;
            this.colors[i * 3] = 1;
            this.colors[i * 3 + 1] = 1;
            this.colors[i * 3 + 2] = 1;
            this.sizes[i] = 0;
            this.velocities.push(new THREE.Vector3());
            this.lifetimes.push(0);
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

        // Particle material with glow effect
        this.material = new THREE.PointsMaterial({
            size: 0.3,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.points = new THREE.Points(this.geometry, this.material);
        scene.add(this.points);
    }

    emit(position, count = 10, color = 0x00ffff) {
        const col = new THREE.Color(color);

        for (let i = 0; i < count && this.activeCount < this.maxParticles; i++) {
            const idx = this.activeCount;

            // Position
            this.positions[idx * 3] = position.x + (Math.random() - 0.5) * 0.5;
            this.positions[idx * 3 + 1] = position.y + (Math.random() - 0.5) * 0.5;
            this.positions[idx * 3 + 2] = position.z + (Math.random() - 0.5) * 0.5;

            // Color
            this.colors[idx * 3] = col.r;
            this.colors[idx * 3 + 1] = col.g;
            this.colors[idx * 3 + 2] = col.b;

            // Size
            this.sizes[idx] = Math.random() * 0.3 + 0.1;

            // Velocity
            this.velocities[idx].set(
                (Math.random() - 0.5) * 4,
                (Math.random() - 0.5) * 4 + 2,
                (Math.random() - 0.5) * 4
            );

            // Lifetime
            this.lifetimes[idx] = 1.0 + Math.random() * 0.5;

            this.activeCount++;
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.color.needsUpdate = true;
        this.geometry.attributes.size.needsUpdate = true;
    }

    tick(delta = 0.016) {
        for (let i = 0; i < this.activeCount; i++) {
            // Update lifetime
            this.lifetimes[i] -= delta;

            if (this.lifetimes[i] <= 0) {
                // Remove dead particle by swapping with last active
                this.activeCount--;
                if (i < this.activeCount) {
                    this.positions[i * 3] = this.positions[this.activeCount * 3];
                    this.positions[i * 3 + 1] = this.positions[this.activeCount * 3 + 1];
                    this.positions[i * 3 + 2] = this.positions[this.activeCount * 3 + 2];
                    this.colors[i * 3] = this.colors[this.activeCount * 3];
                    this.colors[i * 3 + 1] = this.colors[this.activeCount * 3 + 1];
                    this.colors[i * 3 + 2] = this.colors[this.activeCount * 3 + 2];
                    this.sizes[i] = this.sizes[this.activeCount];
                    this.velocities[i].copy(this.velocities[this.activeCount]);
                    this.lifetimes[i] = this.lifetimes[this.activeCount];
                    i--;
                }
                continue;
            }

            // Update position
            this.positions[i * 3] += this.velocities[i].x * delta;
            this.positions[i * 3 + 1] += this.velocities[i].y * delta;
            this.positions[i * 3 + 2] += this.velocities[i].z * delta;

            // Apply gravity
            this.velocities[i].y -= 5 * delta;

            // Fade out
            this.sizes[i] *= 0.98;
        }

        // Hide inactive particles
        for (let i = this.activeCount; i < this.maxParticles; i++) {
            this.sizes[i] = 0;
        }

        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.size.needsUpdate = true;
    }

    dispose() {
        this.scene.remove(this.points);
        this.geometry.dispose();
        this.material.dispose();
    }
}

export default ParticleSystem;
