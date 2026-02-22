/**
 * naive_bayes_api.js - Naive Bayes Visualization
 * Implements probability bars and Gaussian curves
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { ML_COLORS, createTextSprite } from './ml_base.js';

/**
 * Register Naive Bayes visualization methods on GSAPEngine
 */
export function registerNaiveBayesAPI(GSAPEngine) {
    
    /**
     * Spawn Gaussian curve for a class
     */
    GSAPEngine.prototype.spawnGaussianCurve = function (id, mean, stdDev, classLabel, color) {
        const points = [];
        const numPoints = 100;
        const range = 4 * stdDev;

        for (let i = 0; i <= numPoints; i++) {
            const x = mean - range + (i / numPoints) * 2 * range;
            const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * 
                      Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
            points.push(new THREE.Vector3(x, y * 10, 0)); // Scale up for visibility
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: 0
        });

        const curve = new THREE.Line(geometry, material);
        this.scene.add(curve);

        this.objects[id] = { group: curve, type: 'gaussian', mean, stdDev, classLabel };

        gsap.to(material, { opacity: 0.8, duration: 0.8 });

        // Mean label
        const label = createTextSprite(`μ=${mean.toFixed(1)}`, 10, `#${color.toString(16).padStart(6, '0')}`);
        label.position.set(mean, (1 / (stdDev * Math.sqrt(2 * Math.PI))) * 10 + 0.5, 0);
        this.scene.add(label);
    };

    /**
     * Show prior probability bars
     */
    GSAPEngine.prototype.showPriorBars = function (priors, labels) {
        const barWidth = 0.8;
        const maxHeight = 3;
        const startX = -((priors.length - 1) * 1.5) / 2;

        priors.forEach((prior, i) => {
            // CLEANUP: Remove old bar and label if they exist
            const oldBarObj = this.objects[`prior_bar_${i}`];
            if (oldBarObj) {
                this.scene.remove(oldBarObj.group);
                delete this.objects[`prior_bar_${i}`];
            }
            const oldLabelObj = this.objects[`prior_label_${i}`];
            if (oldLabelObj) {
                this.scene.remove(oldLabelObj.group);
                delete this.objects[`prior_label_${i}`];
            }

            const height = prior * maxHeight;
            const color = i === 0 ? ML_COLORS.class0 : ML_COLORS.class1;

            const geo = new THREE.BoxGeometry(barWidth, height, 0.3);
            const mat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.8 });
            const bar = new THREE.Mesh(geo, mat);
            // Move up from -5 to -2 for better visibility
            bar.position.set(startX + i * 1.5, -2 + height / 2, 0);
            bar.scale.y = 0;
            this.scene.add(bar);

            gsap.to(bar.scale, { y: 1, duration: 0.6, delay: i * 0.1 });

            // Label
            const label = createTextSprite(`P(${labels[i]})=${(prior * 100).toFixed(0)}%`, 24, '#ffffff');
            label.position.set(startX + i * 1.5, -2 + height + 0.6, 0);
            label.scale.set(6, 2, 1);
            this.scene.add(label);

            this.objects[`prior_bar_${i}`] = { group: bar, type: 'prior_bar' };
            this.objects[`prior_label_${i}`] = { group: label, type: 'label' };
        });
    };

    /**
     * Animate likelihood calculation
     * Supports both full parameter version and simplified single-likelihood version
     */
    GSAPEngine.prototype.showLikelihood = function (x, classLabel, likelihood, color) {
        // Handle backward compatibility: if only one parameter, treat it as likelihood value
        if (arguments.length === 1) {
            const likelihoodValue = x;
            // Create simple likelihood display at origin
            const label = createTextSprite(`Likelihood: ${likelihoodValue.toFixed(3)}`, 24, '#fbbf24');
            label.position.set(0, 8, 0);
            label.scale.set(8, 3, 1);
            this.scene.add(label);
            
            this.objects[`likelihood_display`] = { group: label, type: 'label' };
            return;
        }

        const idSuffix = `_${x.toFixed(2)}_${classLabel}`;
        
        // CLEANUP: Remove old likelihood line and label if they exist
        const oldLineObj = this.objects[`likelihood_line${idSuffix}`];
        if (oldLineObj) {
            this.scene.remove(oldLineObj.group);
            delete this.objects[`likelihood_line${idSuffix}`];
        }
        const oldLabelObj = this.objects[`likelihood_label${idSuffix}`];
        if (oldLabelObj) {
            this.scene.remove(oldLabelObj.group);
            delete this.objects[`likelihood_label${idSuffix}`];
        }

        // Default color if not provided
        const finalColor = color || ML_COLORS.class0;

        // Vertical line at x
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, 0, 0),
            new THREE.Vector3(x, 10, 0)
        ]);
        const lineMat = new THREE.LineDashedMaterial({
            color: finalColor,
            dashSize: 0.1,
            gapSize: 0.05,
            transparent: true,
            opacity: 0.8
        });
        const line = new THREE.Line(lineGeo, lineMat);
        line.computeLineDistances();
        this.scene.add(line);

        // Likelihood label
        const label = createTextSprite(`L=${likelihood.toFixed(3)}`, 24, `#${finalColor.toString(16).padStart(6, '0')}`);
        label.position.set(x, likelihood * 10 + 1.0, 0.1);
        label.scale.set(5, 2, 1);
        this.scene.add(label);

        this.objects[`likelihood_line${idSuffix}`] = { group: line, type: 'likelihood_line' };
        this.objects[`likelihood_label${idSuffix}`] = { group: label, type: 'label' };
    };

    /**
     * Assign probabilistic responsibilities to a point (for GMM soft assignments)
     * Colors the point based on weighted mixture of component colors
     */
    GSAPEngine.prototype.assignProbabilistic = function (pointId, responsibilities) {
        const point = this.objects[pointId];
        if (!point || !point.mesh) {
            console.warn(`assignProbabilistic: point '${pointId}' not found`);
            return;
        }

        // Use GMM colors if available, otherwise use default palette
        const GMM_COLORS = [0x6366f1, 0x22c55e, 0xf59e0b, 0xec4899];

        // Blend colors based on responsibilities
        const blendedColor = new THREE.Color(0, 0, 0);
        responsibilities.forEach((r, i) => {
            const c = new THREE.Color(GMM_COLORS[i % GMM_COLORS.length]);
            blendedColor.r += c.r * r;
            blendedColor.g += c.g * r;
            blendedColor.b += c.b * r;
        });

        // Animate color transition
        if (point.mesh.material) {
            gsap.to(point.mesh.material.color, {
                r: blendedColor.r,
                g: blendedColor.g,
                b: blendedColor.b,
                duration: 0.5
            });
        }
    };

    /**
     * Show posterior probability
     */
    GSAPEngine.prototype.showPosterior = function (posteriors, predictedClass) {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = predictedClass === 0 ? '#ef4444' : '#22c55e';
        ctx.font = 'bold 32px Arial'; // Larger font
        ctx.textAlign = 'center';
        ctx.fillText(`Predicted: Class ${predictedClass}`, 150, 30);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`P(C0|x)=${(posteriors[0] * 100).toFixed(1)}%  P(C1|x)=${(posteriors[1] * 100).toFixed(1)}%`, 150, 55);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(0, 9, 0); // Slightly higher
        sprite.scale.set(8, 2.5, 1); // Much larger scale
        this.scene.add(sprite);
    };

    // ═══════════════════════════════════════════════════════════════════
    // WRAPPER FUNCTIONS FOR BACKEND COMPATIBILITY
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Spawn a Bayes point (uses existing spawnPoint from regression)
     */
    GSAPEngine.prototype.spawnBayesPoint = function (id, x, y, classLabel) {
        const color = classLabel === 0 ? ML_COLORS.class0 : ML_COLORS.class1;
        if (this.spawnPoint) {
            this.spawnPoint(id, x, y, 0, { color, size: 0.3 });
        }
    };

    /**
     * Highlight test point
     */
    GSAPEngine.prototype.highlightTestPoint = function (id) {
        if (this.highlightPoint) {
            this.highlightPoint(id, 0xffff00);
        }
    };

    /**
     * Show class distribution visualization
     */
    GSAPEngine.prototype.showClassDistribution = function (class0Data, class1Data) {
        // Show Gaussian curves for both classes
        if (class0Data && class0Data.mean !== undefined) {
            this.spawnGaussianCurve('gauss_0', class0Data.mean, class0Data.std || 1, 0, ML_COLORS.class0);
        }
        if (class1Data && class1Data.mean !== undefined) {
            this.spawnGaussianCurve('gauss_1', class1Data.mean, class1Data.std || 1, 1, ML_COLORS.class1);
        }
    };

    /**
     * Show probability calculation
     */
    GSAPEngine.prototype.showProbabilityCalculation = function (class0Prob, class1Prob) {
        this.showPriorBars([class0Prob, class1Prob], ['C0', 'C1']);
    };

    /**
     * Highlight prediction result
     */
    GSAPEngine.prototype.highlightPrediction = function (predictedClass) {
        this.showPosterior([predictedClass === 0 ? 0.8 : 0.2, predictedClass === 1 ? 0.8 : 0.2], predictedClass);
    };
}
