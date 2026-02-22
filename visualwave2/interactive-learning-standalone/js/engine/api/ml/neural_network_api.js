/**
 * neural_network_api.js - Neural Network Visualization
 * Implements layer construction, forward propagation, backpropagation, and weight updates
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { ML_COLORS, createTextSprite, spawnWithPop } from './ml_base.js';

/**
 * Register Neural Network visualization methods on GSAPEngine
 */
export function registerNeuralNetworkAPI(GSAPEngine) {
    
    GSAPEngine.prototype.nnData = {
        layers: [],
        neurons: [],
        connections: [],
        activations: []
    };

    /**
     * Spawn a neural network layer
     */
    GSAPEngine.prototype.spawnNNLayer = function (layerId, layerIndex, neuronCount, options = {}) {
        const { spacing = 2, xPosition = -8 + layerIndex * 4 } = options;
        const layer = { id: layerId, layerIndex, neurons: [], xPosition, neuronCount };

        // Calculate vertical spacing to center the layer
        const totalHeight = (neuronCount - 1) * spacing;
        const startY = -totalHeight / 2;

        for (let i = 0; i < neuronCount; i++) {
            const neuronId = `${layerId}_n${i}`;
            const y = startY + i * spacing;
            this.spawnNeuron(neuronId, xPosition, y, layerIndex, i);
            layer.neurons.push(neuronId);
        }

        this.nnData.layers.push(layer);

        // Layer label
        const label = createTextSprite(`Layer ${layerIndex}`, 12, '#ffffff');
        label.position.set(xPosition, startY - 1, 0);
        this.scene.add(label);
        this.objects[`${layerId}_label`] = { group: label, type: 'nn_label' };

        return layer;
    };

    /**
     * Spawn individual neuron
     */
    GSAPEngine.prototype.spawnNeuron = function (id, x, y, layerIndex, neuronIndex) {
        if (this.objects[id]) return;

        const geometry = new THREE.SphereGeometry(0.3, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0x6366f1,
            emissive: 0x6366f1,
            emissiveIntensity: 0.2,
            metalness: 0.5,
            roughness: 0.3,
            transparent: true
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, 0);
        mesh.scale.set(0, 0, 0);
        this.scene.add(mesh);

        this.objects[id] = { 
            group: mesh, 
            mesh, 
            type: 'neuron', 
            x, 
            y, 
            layerIndex, 
            neuronIndex,
            activation: 0,
            bias: 0
        };

        this.nnData.neurons.push({ id, x, y, layerIndex, neuronIndex, mesh });

        spawnWithPop(mesh, 0.4, neuronIndex * 0.05);
    };

    /**
     * Create connections (weights) between layers
     */
    GSAPEngine.prototype.connectLayers = function (fromLayerId, toLayerId, weights = null) {
        const fromLayer = this.nnData.layers.find(l => l.id === fromLayerId);
        const toLayer = this.nnData.layers.find(l => l.id === toLayerId);
        
        if (!fromLayer || !toLayer) return;

        fromLayer.neurons.forEach((fromNeuronId, i) => {
            const fromNeuron = this.objects[fromNeuronId];
            
            toLayer.neurons.forEach((toNeuronId, j) => {
                const toNeuron = this.objects[toNeuronId];
                
                // Get weight value (random if not provided)
                const weight = weights?.[i]?.[j] ?? (Math.random() * 2 - 1);
                
                this.spawnConnection(fromNeuronId, toNeuronId, weight);
            });
        });
    };

    /**
     * Spawn connection line between two neurons
     */
    GSAPEngine.prototype.spawnConnection = function (fromId, toId, weight) {
        const from = this.objects[fromId];
        const to = this.objects[toId];
        if (!from || !to) return;

        const connectionId = `conn_${fromId}_${toId}`;
        
        // Line opacity based on weight magnitude
        const opacity = Math.min(Math.abs(weight) * 0.5, 0.6);
        
        // Color based on weight sign (positive = blue, negative = red)
        const color = weight >= 0 ? 0x4488ff : 0xff4444;

        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(from.x, from.y, -0.5),
            new THREE.Vector3(to.x, to.y, -0.5)
        ]);

        const material = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: 0
        });

        const line = new THREE.Line(geometry, material);
        this.scene.add(line);

        this.objects[connectionId] = { 
            group: line, 
            type: 'connection', 
            weight, 
            fromId, 
            toId,
            material
        };

        this.nnData.connections.push({ id: connectionId, fromId, toId, weight, line });

        gsap.to(material, { opacity, duration: 0.5, delay: 0.2 });
    };

    /**
     * Update neuron activation value
     */
    GSAPEngine.prototype.updateNeuronActivation = function (neuronId, activation, duration = 0.5) {
        const neuron = this.objects[neuronId];
        if (!neuron || !neuron.mesh) return;

        neuron.activation = activation;

        // Normalize activation for visualization (0-1)
        const normalizedActivation = Math.max(0, Math.min(1, activation));

        // Color intensity based on activation
        const intensity = normalizedActivation * 1.0;
        
        gsap.to(neuron.mesh.material, {
            emissiveIntensity: intensity,
            duration,
            ease: "power2.out"
        });

        // Scale pulse for high activation
        if (normalizedActivation > 0.7) {
            gsap.to(neuron.mesh.scale, {
                x: 1.3, y: 1.3, z: 1.3,
                duration: duration / 2,
                yoyo: true,
                repeat: 1,
                ease: "power2.inOut"
            });
        }
    };

    /**
     * Animate forward propagation through network
     */
    GSAPEngine.prototype.animateForwardProp = function (fromLayerId, toLayerId, duration = 1.5) {
        const fromLayer = this.nnData.layers.find(l => l.id === fromLayerId);
        const toLayer = this.nnData.layers.find(l => l.id === toLayerId);
        
        if (!fromLayer || !toLayer) return;

        // Create signal particles traveling along connections
        fromLayer.neurons.forEach((fromNeuronId, i) => {
            const from = this.objects[fromNeuronId];
            
            toLayer.neurons.forEach((toNeuronId, j) => {
                const to = this.objects[toNeuronId];
                const connectionId = `conn_${fromNeuronId}_${toNeuronId}`;
                const conn = this.objects[connectionId];
                
                if (!conn) return;

                // Create signal particle
                const particleGeo = new THREE.SphereGeometry(0.1, 8, 8);
                const particleMat = new THREE.MeshBasicMaterial({
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.8
                });
                const particle = new THREE.Mesh(particleGeo, particleMat);
                particle.position.set(from.x, from.y, 0);
                this.scene.add(particle);

                // Animate particle along connection
                gsap.to(particle.position, {
                    x: to.x,
                    y: to.y,
                    duration,
                    delay: i * 0.05,
                    ease: "power1.inOut",
                    onComplete: () => {
                        this.scene.remove(particle);
                        particleGeo.dispose();
                        particleMat.dispose();
                    }
                });

                // Highlight connection during propagation
                gsap.to(conn.material, {
                    opacity: 0.9,
                    duration: duration / 2,
                    delay: i * 0.05,
                    yoyo: true,
                    repeat: 1
                });
            });
        });
    };

    /**
     * Animate backpropagation (reverse direction)
     */
    GSAPEngine.prototype.animateBackprop = function (fromLayerId, toLayerId, duration = 1.2) {
        const fromLayer = this.nnData.layers.find(l => l.id === fromLayerId);
        const toLayer = this.nnData.layers.find(l => l.id === toLayerId);
        
        if (!fromLayer || !toLayer) return;

        // Backprop goes in reverse (from output to input)
        fromLayer.neurons.forEach((fromNeuronId, i) => {
            const from = this.objects[fromNeuronId];
            
            toLayer.neurons.forEach((toNeuronId, j) => {
                const to = this.objects[toNeuronId];
                const connectionId = `conn_${toNeuronId}_${fromNeuronId}`;
                const conn = this.objects[connectionId];
                
                if (!conn) return;

                // Create gradient particle (red/orange)
                const particleGeo = new THREE.SphereGeometry(0.08, 8, 8);
                const particleMat = new THREE.MeshBasicMaterial({
                    color: 0xff6600,
                    transparent: true,
                    opacity: 0.7
                });
                const particle = new THREE.Mesh(particleGeo, particleMat);
                particle.position.set(from.x, from.y, 0);
                this.scene.add(particle);

                // Animate gradient particle backward
                gsap.to(particle.position, {
                    x: to.x,
                    y: to.y,
                    duration,
                    delay: i * 0.05,
                    ease: "power1.inOut",
                    onComplete: () => {
                        this.scene.remove(particle);
                        particleGeo.dispose();
                        particleMat.dispose();
                    }
                });
            });
        });
    };

    /**
     * Update connection weight with animation
     */
    GSAPEngine.prototype.updateWeight = function (connectionId, newWeight, duration = 0.5) {
        const conn = this.objects[connectionId];
        if (!conn || conn.type !== 'connection') return;

        conn.weight = newWeight;

        // Update color based on new weight
        const newColor = newWeight >= 0 ? 0x4488ff : 0xff4444;
        const targetOpacity = Math.min(Math.abs(newWeight) * 0.5, 0.6);

        const color = new THREE.Color(newColor);
        gsap.to(conn.material.color, {
            r: color.r,
            g: color.g,
            b: color.b,
            duration,
            ease: "power2.out"
        });

        gsap.to(conn.material, {
            opacity: targetOpacity,
            duration,
            ease: "power2.out"
        });

        // Flash effect on weight update
        gsap.to(conn.material, {
            opacity: 1,
            duration: duration / 3,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut"
        });
    };

    /**
     * Visualize activation function (sigmoid, relu, tanh)
     */
    GSAPEngine.prototype.visualizeActivation = function (neuronId, activationType = 'relu') {
        const neuron = this.objects[neuronId];
        if (!neuron) return;

        let color;
        switch (activationType) {
            case 'sigmoid':
                color = 0x10b981; // Green
                break;
            case 'relu':
                color = 0x3b82f6; // Blue
                break;
            case 'tanh':
                color = 0xa855f7; // Purple
                break;
            default:
                color = 0x6366f1;
        }

        // Flash neuron with activation color
        const originalColor = neuron.mesh.material.color.clone();
        const newColor = new THREE.Color(color);

        gsap.to(neuron.mesh.material.color, {
            r: newColor.r,
            g: newColor.g,
            b: newColor.b,
            duration: 0.3,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
                neuron.mesh.material.color.copy(originalColor);
            }
        });
    };

    /**
     * Show loss/cost value
     */
    GSAPEngine.prototype.showLoss = function (lossValue, epoch = null) {
        const label = createTextSprite(
            epoch !== null ? `Epoch ${epoch} - Loss: ${lossValue.toFixed(4)}` : `Loss: ${lossValue.toFixed(4)}`,
            14,
            '#ff6b6b'
        );
        label.position.set(0, 8, 0);
        this.scene.add(label);

        const labelId = 'loss_label';
        if (this.objects[labelId]) {
            this.scene.remove(this.objects[labelId].group);
        }
        this.objects[labelId] = { group: label, type: 'loss_label' };
    };

    /**
     * Highlight input layer with data
     */
    GSAPEngine.prototype.setInputValues = function (layerId, values) {
        const layer = this.nnData.layers.find(l => l.id === layerId);
        if (!layer) return;

        layer.neurons.forEach((neuronId, i) => {
            const value = values[i] || 0;
            this.updateNeuronActivation(neuronId, value, 0.3);
        });
    };

    /**
     * Highlight output prediction
     */
    GSAPEngine.prototype.showPrediction = function (layerId, predictions) {
        const layer = this.nnData.layers.find(l => l.id === layerId);
        if (!layer) return;

        // Find neuron with highest prediction
        const maxIndex = predictions.indexOf(Math.max(...predictions));

        layer.neurons.forEach((neuronId, i) => {
            const neuron = this.objects[neuronId];
            if (!neuron) return;

            this.updateNeuronActivation(neuronId, predictions[i], 0.5);

            // Highlight the winner
            if (i === maxIndex) {
                const ringGeo = new THREE.RingGeometry(0.4, 0.5, 32);
                const ringMat = new THREE.MeshBasicMaterial({
                    color: 0xffcc00,
                    transparent: true,
                    opacity: 0.8,
                    side: THREE.DoubleSide
                });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.position.copy(neuron.mesh.position);
                this.scene.add(ring);

                // Pulsing ring
                gsap.to(ring.scale, {
                    x: 1.5, y: 1.5,
                    duration: 0.8,
                    yoyo: true,
                    repeat: 2,
                    ease: "sine.inOut",
                    onComplete: () => {
                        this.scene.remove(ring);
                        ringGeo.dispose();
                        ringMat.dispose();
                    }
                });
            }
        });
    };

    /**
     * Animate entire training epoch
     */
    GSAPEngine.prototype.animateTrainingEpoch = function (inputLayer, hiddenLayers, outputLayer, duration = 2) {
        return new Promise((resolve) => {
            const timeline = gsap.timeline({
                onComplete: resolve
            });

            // Forward pass through all layers
            timeline.add(() => this.animateForwardProp(inputLayer, hiddenLayers[0], duration * 0.3), 0);
            
            hiddenLayers.forEach((layerId, i) => {
                if (i < hiddenLayers.length - 1) {
                    timeline.add(() => this.animateForwardProp(layerId, hiddenLayers[i + 1], duration * 0.3), `>-${duration * 0.1}`);
                }
            });
            
            timeline.add(() => this.animateForwardProp(hiddenLayers[hiddenLayers.length - 1], outputLayer, duration * 0.3), `>-${duration * 0.1}`);

            // Backward pass
            timeline.add(() => this.animateBackprop(outputLayer, hiddenLayers[hiddenLayers.length - 1], duration * 0.25), `>+${duration * 0.1}`);
            
            for (let i = hiddenLayers.length - 1; i > 0; i--) {
                timeline.add(() => this.animateBackprop(hiddenLayers[i], hiddenLayers[i - 1], duration * 0.25), `>-${duration * 0.08}`);
            }
            
            timeline.add(() => this.animateBackprop(hiddenLayers[0], inputLayer, duration * 0.25), `>-${duration * 0.08}`);
        });
    };

    /**
     * Clear all neural network visualizations
     */
    GSAPEngine.prototype.clearNeuralNetwork = function () {
        // Remove all NN objects
        Object.keys(this.objects).forEach(key => {
            const obj = this.objects[key];
            if (obj && (obj.type === 'neuron' || obj.type === 'connection' || obj.type === 'nn_label')) {
                this.scene.remove(obj.group);
                delete this.objects[key];
            }
        });

        // Reset NN data
        this.nnData = {
            layers: [],
            neurons: [],
            connections: [],
            activations: []
        };
    };
}
