/**
 * ml_pipeline.js - Data Pipeline Animations
 * Animations for data cleaning, scaling, and train/test split
 * These run before algorithm-specific visualizations
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { ML_COLORS, spawnWithPop, fadeIn, createTextSprite, delay } from './ml_base.js';

// ═══════════════════════════════════════════════════════════════════
// DATA CLEANING ANIMATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Register data pipeline methods on GSAPEngine
 */
export function registerPipelineAPI(GSAPEngine) {
    
    /**
     * Animate missing value handling
     * Points with missing values blink, enter cleaning box, exit corrected
     */
    GSAPEngine.prototype.animateMissingValueCleaning = function (missingPointIds, duration = 3) {
        return new Promise((resolve) => {
            if (!missingPointIds || missingPointIds.length === 0) {
                resolve();
                return;
            }

            const tl = gsap.timeline({ onComplete: resolve });
            
            // Get missing points
            const missingPoints = missingPointIds.map(id => this.objects[id]).filter(Boolean);
            
            // Create cleaning box
            const boxGeo = new THREE.BoxGeometry(3, 3, 3);
            const boxMat = new THREE.MeshPhysicalMaterial({
                color: 0x4488ff,
                transparent: true,
                opacity: 0.2,
                metalness: 0.1,
                roughness: 0.9
            });
            const cleaningBox = new THREE.Mesh(boxGeo, boxMat);
            cleaningBox.position.set(12, 0, 0);  // Off to the side
            cleaningBox.scale.set(0, 0, 0);
            this.scene.add(cleaningBox);
            
            // Box label
            const boxLabel = createTextSprite('Data Cleaning', 18, '#4488ff');
            boxLabel.position.set(12, 2.5, 0);
            boxLabel.material.opacity = 0;
            this.scene.add(boxLabel);
            
            // Step 1: Blink missing points red
            missingPoints.forEach(p => {
                if (p.mesh) {
                    tl.to(p.mesh.material, {
                        opacity: 0.3,
                        duration: 0.2,
                        yoyo: true,
                        repeat: 5
                    }, 0);
                    tl.to(p.mesh.material.color, {
                        r: 1, g: 0.3, b: 0.3,
                        duration: 0.2,
                        yoyo: true,
                        repeat: 5
                    }, 0);
                }
            });
            
            // Step 2: Show cleaning box
            tl.to(cleaningBox.scale, {
                x: 1, y: 1, z: 1,
                duration: 0.5,
                ease: "back.out(1.5)"
            }, 1.2);
            tl.to(boxLabel.material, {
                opacity: 1,
                duration: 0.3
            }, 1.5);
            
            // Step 3: Points fly into box
            missingPoints.forEach((p, i) => {
                if (p.mesh || p.group) {
                    const mesh = p.mesh || p.group;
                    tl.to(mesh.position, {
                        x: 12,
                        y: 0,
                        z: 0,
                        duration: 0.6,
                        ease: "power2.in"
                    }, 1.8 + i * 0.1);
                }
            });
            
            // Step 4: Box pulses (cleaning)
            tl.to(boxMat, {
                opacity: 0.6,
                duration: 0.3,
                yoyo: true,
                repeat: 2
            }, 2.5);
            
            // Step 5: Points return as corrected (green tint)
            const originalPositions = missingPointIds.map(id => {
                const obj = this.objects[id];
                return obj ? (obj.mesh || obj.group).position.clone() : null;
            }).filter(Boolean);
            
            missingPoints.forEach((p, i) => {
                if (p.mesh || p.group) {
                    const mesh = p.mesh || p.group;
                    const origPos = originalPositions[i];
                    if (origPos) {
                        // Change color to green (corrected)
                        tl.to(p.mesh ? p.mesh.material.color : {}, {
                            r: 0.3, g: 1, b: 0.5,
                            duration: 0.3
                        }, 3.2);
                        
                        // Return to original position
                        tl.to(mesh.position, {
                            x: origPos.x,
                            y: origPos.y,
                            z: origPos.z,
                            duration: 0.6,
                            ease: "power2.out"
                        }, 3.5 + i * 0.1);
                    }
                }
            });
            
            // Step 6: Remove cleaning box
            tl.to(cleaningBox.scale, {
                x: 0, y: 0, z: 0,
                duration: 0.4,
                ease: "power2.in",
                onComplete: () => {
                    this.scene.remove(cleaningBox);
                    this.scene.remove(boxLabel);
                    boxGeo.dispose();
                    boxMat.dispose();
                }
            }, 4.5);
        });
    };

    // ═══════════════════════════════════════════════════════════════════
    // FEATURE SCALING ANIMATION
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Animate feature scaling (normalization)
     * Axes compress/expand, points slide to normalized positions
     */
    GSAPEngine.prototype.animateFeatureScaling = function (pointIds, scaleFactors, duration = 2) {
        return new Promise((resolve) => {
            const tl = gsap.timeline({ onComplete: resolve });
            
            // Get scale info
            const { xScale = 1, yScale = 1, xOffset = 0, yOffset = 0 } = scaleFactors;
            
            // Scale label
            const scaleLabel = createTextSprite('Normalizing Features...', 18, '#ffcc00');
            scaleLabel.position.set(0, 8, 0);
            scaleLabel.material.opacity = 0;
            this.scene.add(scaleLabel);
            
            // Show label
            tl.to(scaleLabel.material, {
                opacity: 1,
                duration: 0.3
            }, 0);
            
            // Animate each point to normalized position
            pointIds.forEach((id, i) => {
                const obj = this.objects[id];
                if (!obj) return;
                
                const mesh = obj.mesh || obj.group;
                if (!mesh) return;
                
                // Calculate normalized position
                const newX = (mesh.position.x - xOffset) * xScale;
                const newY = (mesh.position.y - yOffset) * yScale;
                
                // Animate with slight stagger
                tl.to(mesh.position, {
                    x: newX,
                    y: newY,
                    duration: 1,
                    ease: "power2.inOut"
                }, 0.3 + i * 0.02);
                
                // Color shift: white → blue during normalization
                if (obj.mesh && obj.mesh.material) {
                    tl.to(obj.mesh.material.color, {
                        r: 0.3, g: 0.7, b: 1,
                        duration: 0.5
                    }, 0.3 + i * 0.02);
                }
            });
            
            // Fade out label
            tl.to(scaleLabel.material, {
                opacity: 0,
                duration: 0.3,
                onComplete: () => {
                    this.scene.remove(scaleLabel);
                }
            }, duration - 0.3);
        });
    };

    // ═══════════════════════════════════════════════════════════════════
    // TRAIN/TEST SPLIT ANIMATION
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Animate train/test split
     * Divider line appears, points color and separate
     */
    GSAPEngine.prototype.animateTrainTestSplit = function (trainIds, testIds, splitRatio = 0.8, duration = 2) {
        return new Promise((resolve) => {
            const tl = gsap.timeline({ onComplete: resolve });
            
            // Create divider line
            const dividerGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, -10, 0),
                new THREE.Vector3(0, 10, 0)
            ]);
            const dividerMat = new THREE.LineBasicMaterial({
                color: 0xaa44ff,
                transparent: true,
                opacity: 0
            });
            const divider = new THREE.Line(dividerGeo, dividerMat);
            divider.position.x = 5;  // Divider position
            this.scene.add(divider);
            
            // Labels
            const trainLabel = createTextSprite(`Training (${Math.round(splitRatio * 100)}%)`, 16, '#4488ff');
            trainLabel.position.set(-3, 7, 0);
            trainLabel.material.opacity = 0;
            this.scene.add(trainLabel);
            
            const testLabel = createTextSprite(`Test (${Math.round((1 - splitRatio) * 100)}%)`, 16, '#44ff88');
            testLabel.position.set(7, 7, 0);
            testLabel.material.opacity = 0;
            this.scene.add(testLabel);
            
            // Step 1: Show divider
            tl.to(dividerMat, {
                opacity: 0.8,
                duration: 0.4
            }, 0);
            
            // Divider pulse
            tl.to(divider.scale, {
                x: 1.2,
                duration: 0.2,
                yoyo: true,
                repeat: 1
            }, 0.4);
            
            // Step 2: Color training points blue
            trainIds.forEach((id, i) => {
                const obj = this.objects[id];
                if (!obj || !obj.mesh) return;
                
                tl.to(obj.mesh.material.color, {
                    r: 0.27, g: 0.53, b: 1,  // #4488ff
                    duration: 0.4
                }, 0.6 + i * 0.03);
                
                if (obj.mesh.material.emissive) {
                    tl.to(obj.mesh.material.emissive, {
                        r: 0.27, g: 0.53, b: 1,
                        duration: 0.4
                    }, 0.6 + i * 0.03);
                }
            });
            
            // Step 3: Color test points green
            testIds.forEach((id, i) => {
                const obj = this.objects[id];
                if (!obj || !obj.mesh) return;
                
                tl.to(obj.mesh.material.color, {
                    r: 0.27, g: 1, b: 0.53,  // #44ff88
                    duration: 0.4
                }, 0.8 + i * 0.03);
                
                if (obj.mesh.material.emissive) {
                    tl.to(obj.mesh.material.emissive, {
                        r: 0.27, g: 1, b: 0.53,
                        duration: 0.4
                    }, 0.8 + i * 0.03);
                }
            });
            
            // Step 4: Show labels
            tl.to(trainLabel.material, {
                opacity: 1,
                duration: 0.3
            }, 1.2);
            tl.to(testLabel.material, {
                opacity: 1,
                duration: 0.3
            }, 1.2);
            
            // Step 5: Fade divider slightly
            tl.to(dividerMat, {
                opacity: 0.3,
                duration: 0.5
            }, 1.8);
            
            // Store references for cleanup
            this.objects['train_test_divider'] = { group: divider, type: 'divider' };
            this.objects['train_label'] = { group: trainLabel, type: 'label' };
            this.objects['test_label'] = { group: testLabel, type: 'label' };
        });
    };

    // ═══════════════════════════════════════════════════════════════════
    // FULL PIPELINE SEQUENCE
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Run complete data pipeline: clean → scale → split
     */
    GSAPEngine.prototype.runDataPipeline = async function (
        allPointIds,
        missingPointIds = [],
        scaleFactors = null,
        splitRatio = 0.8
    ) {
        // Phase 1: Missing value cleaning (if any)
        if (missingPointIds.length > 0) {
            await this.animateMissingValueCleaning(missingPointIds);
            await delay(500);
        }
        
        // Phase 2: Feature scaling (if provided)
        if (scaleFactors) {
            await this.animateFeatureScaling(allPointIds, scaleFactors);
            await delay(500);
        }
        
        // Phase 3: Train/test split
        const splitIndex = Math.floor(allPointIds.length * splitRatio);
        const trainIds = allPointIds.slice(0, splitIndex);
        const testIds = allPointIds.slice(splitIndex);
        
        await this.animateTrainTestSplit(trainIds, testIds, splitRatio);
        
        return { trainIds, testIds };
    };
}
