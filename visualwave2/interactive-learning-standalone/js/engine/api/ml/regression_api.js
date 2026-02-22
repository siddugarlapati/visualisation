/**
 * regression_api.js - Advanced Linear Regression Visualization API
 * Supports simple and multiple linear regression with rich animations
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { 
    ML_COLORS, 
    spawnWithPop, 
    spawnStaggered, 
    fadeIn, 
    addMicroMotion,
    pulse,
    shake,
    addGlowRing,
    createTrailPoint,
    interpolateColor,
    getErrorColor,
    createTextSprite,
    createArrow,
    autoFrameObjects,
    delay
} from './ml_base.js';

export function registerRegressionAPI(GSAPEngine) {
    GSAPEngine.prototype.regression = {};
    GSAPEngine.prototype.regressionPoints = [];
    GSAPEngine.prototype.regressionModel = { m: 0, b: 0 };

    // ═══════════════════════════════════════════════════════════════════
    // AXIS SYSTEM
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Spawn X and Y axes with coordinate labels
     */
    GSAPEngine.prototype.spawnAxes = function (xMin = -10, xMax = 10, yMin = -8, yMax = 8) {
        const axisGroup = new THREE.Group();
        axisGroup.name = 'axes';

        // X-Axis line
        const xPoints = [new THREE.Vector3(xMin, 0, 0), new THREE.Vector3(xMax, 0, 0)];
        const xGeometry = new THREE.BufferGeometry().setFromPoints(xPoints);
        const xMaterial = new THREE.LineBasicMaterial({ color: ML_COLORS.axis, opacity: 0.7, transparent: true });
        const xAxis = new THREE.Line(xGeometry, xMaterial);
        axisGroup.add(xAxis);

        // X-Axis arrow
        const xArrowGeo = new THREE.ConeGeometry(0.15, 0.4, 8);
        const xArrowMat = new THREE.MeshBasicMaterial({ color: ML_COLORS.axis });
        const xArrow = new THREE.Mesh(xArrowGeo, xArrowMat);
        xArrow.rotation.z = -Math.PI / 2;
        xArrow.position.set(xMax, 0, 0);
        axisGroup.add(xArrow);

        // Y-Axis line
        const yPoints = [new THREE.Vector3(0, yMin, 0), new THREE.Vector3(0, yMax, 0)];
        const yGeometry = new THREE.BufferGeometry().setFromPoints(yPoints);
        const yMaterial = new THREE.LineBasicMaterial({ color: ML_COLORS.axis, opacity: 0.7, transparent: true });
        const yAxis = new THREE.Line(yGeometry, yMaterial);
        axisGroup.add(yAxis);

        // Y-Axis arrow
        const yArrow = new THREE.Mesh(xArrowGeo.clone(), xArrowMat.clone());
        yArrow.position.set(0, yMax, 0);
        axisGroup.add(yArrow);

        // Tick marks and labels
        const createTick = (x, y, isVertical) => {
            const tickSize = 0.15;
            const points = isVertical 
                ? [new THREE.Vector3(x, y - tickSize, 0), new THREE.Vector3(x, y + tickSize, 0)]
                : [new THREE.Vector3(x - tickSize, y, 0), new THREE.Vector3(x + tickSize, y, 0)];
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const mat = new THREE.LineBasicMaterial({ color: 0x666666 });
            return new THREE.Line(geo, mat);
        };

        const createLabel = (text, x, y) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 128;  // 2x larger
            canvas.height = 64;  // 2x larger
            ctx.fillStyle = '#ffffff';  // Brighter color
            ctx.font = 'bold 36px Arial';  // 2x larger font
            ctx.textAlign = 'center';
            ctx.fillText(text, 64, 42);
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({ 
                map: texture, 
                transparent: true,
                depthTest: false  // Always visible
            });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.position.set(x, y, 0);
            sprite.scale.set(2, 1, 1);  // 2.5x larger scale
            return sprite;
        };

        // X-axis ticks and labels
        for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x += 2) {
            if (x === 0) continue;
            axisGroup.add(createTick(x, 0, true));
            axisGroup.add(createLabel(x.toString(), x, -0.5));
        }

        // Y-axis ticks and labels
        for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y += 2) {
            if (y === 0) continue;
            axisGroup.add(createTick(0, y, false));
            axisGroup.add(createLabel(y.toString(), -0.5, y));
        }

        // Axis labels
        const xLabel = createLabel('X', xMax + 0.5, -0.5);
        xLabel.material.color.setHex(ML_COLORS.cyan);
        axisGroup.add(xLabel);

        const yLabel = createLabel('Y', -0.5, yMax + 0.5);
        yLabel.material.color.setHex(ML_COLORS.cyan);
        axisGroup.add(yLabel);

        this.scene.add(axisGroup);
        this.objects['axes'] = { group: axisGroup, type: 'axes' };

        // Fade in animation
        axisGroup.children.forEach(child => {
            if (child.material) {
                const targetOpacity = child.material.opacity || 1;
                child.material.transparent = true;
                child.material.opacity = 0;
                gsap.to(child.material, { opacity: targetOpacity, duration: 0.8 });
            }
        });

        // Auto-frame camera to show full coordinate system (conservative framing)
        setTimeout(() => {
            autoFrameObjects(this.camera, this.scene, null, 1.6, 0.8);
        }, 500);
    };

    // ═══════════════════════════════════════════════════════════════════
    // DATA POINT VISUALIZATION
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Spawn a data point with pop animation and micro-motion
     */
    GSAPEngine.prototype.spawnPoint = function (id, x, y, z = 0, options = {}) {
        if (this.objects[id]) return;

        const {
            color = ML_COLORS.cyan,
            size = 0.3,
            withMicroMotion = true,
            delay = 0
        } = options;

        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.4,
            roughness: 0.3,
            metalness: 0.7,
            transparent: true,
            opacity: 1
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.scale.set(0, 0, 0);

        this.scene.add(mesh);
        this.objects[id] = { group: mesh, type: 'data_point', mesh, position: { x, y, z } };
        this.regressionPoints.push({ id, x, y, z });

        // Pop animation
        gsap.to(mesh.scale, {
            x: 1, y: 1, z: 1,
            duration: 0.5,
            delay,
            ease: "back.out(1.7)"
        });

        // Micro-motion oscillation
        if (withMicroMotion) {
            gsap.to(mesh.position, {
                y: y + 0.03,
                duration: 1.5 + Math.random() * 0.5,
                ease: "sine.inOut",
                yoyo: true,
                repeat: -1,
                delay: delay + 0.5
            });
        }
    };

    /**
     * Spawn multiple points with staggered animation
     */
    GSAPEngine.prototype.spawnPointsStaggered = function (points, staggerDelay = 0.1) {
        points.forEach((p, i) => {
            this.spawnPoint(`p_${i}`, p.x, p.y, p.z || 0, { delay: i * staggerDelay });
        });
    };

    /**
     * Highlight a point with VERY visible effects (glow ring + scale + color)
     */
    GSAPEngine.prototype.highlightPoint = function (id, color = ML_COLORS.highlight) {
        const obj = this.objects[id];
        if (!obj || !obj.mesh) return;

        const mesh = obj.mesh;
        // Convert string hex colors (e.g., "0xff0000") to numbers
        const colorValue = (typeof color === 'string' && color.startsWith('0x')) ? parseInt(color, 16) : color;
        const threeColor = new THREE.Color(colorValue);

        // 1. Scale up permanently for this highlight
        gsap.to(mesh.scale, {
            x: 1.8, y: 1.8, z: 1.8,
            duration: 0.4,
            ease: "back.out(1.7)"
        });

        // 2. Change color permanently
        gsap.to(mesh.material.color, {
            r: threeColor.r, g: threeColor.g, b: threeColor.b,
            duration: 0.3
        });
        gsap.to(mesh.material.emissive, {
            r: threeColor.r, g: threeColor.g, b: threeColor.b,
            duration: 0.3
        });
        mesh.material.emissiveIntensity = 0.8;

        // 3. Add pulsing glow ring
        const ringGeo = new THREE.RingGeometry(0.5, 0.7, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: colorValue,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(mesh.position);
        ring.rotation.x = -Math.PI / 2;
        this.scene.add(ring);

        // Pulse the ring
        gsap.to(ring.scale, {
            x: 2, y: 2,
            duration: 0.8,
            ease: "power1.out",
            repeat: 3,
            yoyo: true
        });
        gsap.to(ringMat, {
            opacity: 0.2,
            duration: 0.8,
            repeat: 3,
            yoyo: true,
            onComplete: () => {
                if (this.scene) {
                    this.scene.remove(ring);
                }
                ringGeo.dispose();
                ringMat.dispose();
            }
        });

        // 4. Add floating label
        const labelCanvas = document.createElement('canvas');
        const ctx = labelCanvas.getContext('2d');
        labelCanvas.width = 128;
        labelCanvas.height = 64;
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('★', 64, 40);
        const labelTexture = new THREE.CanvasTexture(labelCanvas);
        const labelMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true });
        const label = new THREE.Sprite(labelMat);
        label.position.set(mesh.position.x, mesh.position.y + 1, mesh.position.z);
        label.scale.set(1, 0.5, 1);
        this.scene.add(label);

        // Float up and fade
        gsap.to(label.position, {
            y: mesh.position.y + 1.5,
            duration: 1.5
        });
        gsap.to(labelMat, {
            opacity: 0,
            duration: 1.5,
            delay: 1,
            onComplete: () => {
                if (this.scene) {
                    this.scene.remove(label);
                }
                labelTexture.dispose();
                labelMat.dispose();
            }
        });
    };

    /**
     * Change point color with smooth transition
     */
    GSAPEngine.prototype.colorPoint = function (id, newColor, duration = 0.5) {
        const obj = this.objects[id];
        if (!obj || !obj.mesh) return;

        const color = new THREE.Color(newColor);
        gsap.to(obj.mesh.material.color, {
            r: color.r, g: color.g, b: color.b,
            duration,
            ease: "power2.out"
        });
        gsap.to(obj.mesh.material.emissive, {
            r: color.r * 0.5, g: color.g * 0.5, b: color.b * 0.5,
            duration,
            ease: "power2.out"
        });
    };

    // ═══════════════════════════════════════════════════════════════════
    // REGRESSION LINE/PLANE
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Spawn or update regression line with slope interpolation
     */
    GSAPEngine.prototype.spawnLine = function (id, p1, p2, options = {}) {
        const { color = ML_COLORS.modelLine, lineWidth = 2 } = options;
        let lineObj = this.objects[id];

        if (!lineObj) {
            const points = [
                new THREE.Vector3(p1.x, p1.y, p1.z || 0),
                new THREE.Vector3(p2.x, p2.y, p2.z || 0)
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ 
                color,
                linewidth: lineWidth,
                transparent: true,
                opacity: 0
            });

            const line = new THREE.Line(geometry, material);
            this.scene.add(line);
            this.objects[id] = { 
                group: line, 
                type: 'regression_line', 
                geometry,
                p1: { ...p1 },
                p2: { ...p2 }
            };

            // Fade in
            gsap.to(material, { opacity: 0.9, duration: 0.8, ease: "power2.out" });
        } else {
            this.moveLine(id, p1, p2);
        }
    };

    /**
     * Move line with smooth slope interpolation
     */
    GSAPEngine.prototype.moveLine = function (id, p1, p2, duration = 0.8) {
        const lineObj = this.objects[id];
        if (!lineObj) return;

        const positions = lineObj.geometry.attributes.position.array;
        const current = {
            x1: positions[0], y1: positions[1], z1: positions[2],
            x2: positions[3], y2: positions[4], z2: positions[5]
        };

        gsap.to(current, {
            x1: p1.x, y1: p1.y, z1: p1.z || 0,
            x2: p2.x, y2: p2.y, z2: p2.z || 0,
            duration,
            ease: "power2.out",
            onUpdate: () => {
                positions[0] = current.x1; positions[1] = current.y1; positions[2] = current.z1;
                positions[3] = current.x2; positions[4] = current.y2; positions[5] = current.z2;
                lineObj.geometry.attributes.position.needsUpdate = true;
            }
        });

        // Update stored positions
        lineObj.p1 = { ...p1 };
        lineObj.p2 = { ...p2 };
    };

    /**
     * Add glow effect to regression line
     */
    GSAPEngine.prototype.glowLine = function (id, intensity = 2) {
        const lineObj = this.objects[id];
        if (!lineObj) return;

        // Create glow line (thicker, more transparent)
        const positions = lineObj.geometry.attributes.position.array;
        const points = [
            new THREE.Vector3(positions[0], positions[1], positions[2]),
            new THREE.Vector3(positions[3], positions[4], positions[5])
        ];
        
        const glowGeo = new THREE.BufferGeometry().setFromPoints(points);
        const glowMat = new THREE.LineBasicMaterial({
            color: ML_COLORS.highlight,
            transparent: true,
            opacity: 0.4,
            linewidth: 4
        });
        
        const glowLine = new THREE.Line(glowGeo, glowMat);
        glowLine.scale.set(1.1, 1.1, 1.1);
        this.scene.add(glowLine);

        // Pulse animation
        gsap.to(glowMat, {
            opacity: 0.1,
            duration: 0.5,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                this.scene.remove(glowLine);
                glowGeo.dispose();
                glowMat.dispose();
            }
        });
    };

    // ═══════════════════════════════════════════════════════════════════
    // RESIDUAL VISUALIZATION
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Draw error/residual line with color based on magnitude
     */
    GSAPEngine.prototype.drawErrorLine = function (id, p_data, p_line, options = {}) {
        const { animated = true } = options;
        let lineObj = this.objects[id];

        // Calculate error magnitude for color
        const error = Math.abs(p_data.y - p_line.y);
        const maxError = 5; // Normalize against expected max
        const normalizedError = Math.min(error / maxError, 1);
        const errorColor = getErrorColor(normalizedError);

        if (!lineObj) {
            const points = [
                new THREE.Vector3(p_data.x, p_data.y, p_data.z || 0),
                new THREE.Vector3(p_line.x, p_line.y, p_line.z || 0)
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineDashedMaterial({
                color: errorColor,
                linewidth: 1,
                scale: 1,
                dashSize: 0.15,
                gapSize: 0.08,
                transparent: true,
                opacity: animated ? 0 : 0.7
            });

            const line = new THREE.Line(geometry, material);
            line.computeLineDistances();
            this.scene.add(line);
            this.objects[id] = { group: line, type: 'error_line', geometry, material };

            if (animated) {
                gsap.to(material, { opacity: 0.7, duration: 0.3 });
            }
        } else {
            // Update existing line
            const positions = lineObj.geometry.attributes.position.array;
            
            if (animated) {
                const current = { y: positions[4] };
                gsap.to(current, {
                    y: p_line.y,
                    duration: 0.5,
                    ease: "power2.out",
                    onUpdate: () => {
                        positions[4] = current.y;
                        lineObj.geometry.attributes.position.needsUpdate = true;
                        lineObj.group.computeLineDistances();
                    }
                });
            } else {
                positions[4] = p_line.y;
                lineObj.geometry.attributes.position.needsUpdate = true;
                lineObj.group.computeLineDistances();
            }

            // Update color
            gsap.to(lineObj.material.color, {
                r: errorColor.r, g: errorColor.g, b: errorColor.b,
                duration: 0.3
            });
        }
    };

    /**
     * Flash all residuals briefly
     */
    GSAPEngine.prototype.flashResiduals = function () {
        Object.keys(this.objects).forEach(id => {
            if (id.startsWith('err_')) {
                const obj = this.objects[id];
                if (obj && obj.material) {
                    gsap.to(obj.material, {
                        opacity: 1,
                        duration: 0.1,
                        yoyo: true,
                        repeat: 1
                    });
                }
            }
        });
    };

    // ═══════════════════════════════════════════════════════════════════
    // TRAINING VISUALIZATION
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Update model with new parameters and animate all residuals
     */
    GSAPEngine.prototype.updateRegressionModel = function (m, b, xRange = [-10, 10]) {
        const [xMin, xMax] = xRange;
        const y1 = m * xMin + b;
        const y2 = m * xMax + b;

        // Move regression line
        this.moveLine('reg_line', { x: xMin, y: y1, z: 0 }, { x: xMax, y: y2, z: 0 });

        // Update all residuals
        this.regressionPoints.forEach((p, i) => {
            const predictedY = m * p.x + b;
            this.drawErrorLine(`err_p_${i}`, 
                { x: p.x, y: p.y, z: 0 },
                { x: p.x, y: predictedY, z: 0 }
            );
        });

        // Store current model
        this.regressionModel = { m, b };
    };

    /**
     * Show model equation label
     */
    GSAPEngine.prototype.showModelEquation = function (m, b) {
        const mStr = m.toFixed(2);
        const bStr = b >= 0 ? `+ ${b.toFixed(2)}` : `- ${Math.abs(b).toFixed(2)}`;
        const equation = `y = ${mStr}x ${bStr}`;

        const sprite = createTextSprite(equation, 20, '#ffffff');
        sprite.position.set(6, 6, 0);
        sprite.scale.set(4, 1, 1);
        this.scene.add(sprite);
        this.objects['equation_label'] = { group: sprite, type: 'label' };

        // Fade in
        sprite.material.opacity = 0;
        gsap.to(sprite.material, { opacity: 1, duration: 0.5 });
    };

    // ═══════════════════════════════════════════════════════════════════
    // MULTI-FEATURE VISUALIZATION
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Spawn 3D regression plane for multiple features
     */
    GSAPEngine.prototype.spawnPlane = function (id, width, depth, center, rotation) {
        if (this.objects[id]) return;

        const geometry = new THREE.PlaneGeometry(width, depth, 20, 20);
        const material = new THREE.MeshPhysicalMaterial({
            color: ML_COLORS.modelLine,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0,
            metalness: 0.3,
            roughness: 0.4,
            clearcoat: 0.5
        });

        const plane = new THREE.Mesh(geometry, material);
        plane.position.set(center.x, center.y, center.z);
        if (rotation) {
            plane.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
        }

        this.scene.add(plane);
        this.objects[id] = { group: plane, type: 'regression_plane' };

        // Animate appearance
        gsap.to(material, { opacity: 0.4, duration: 1 });
        gsap.from(plane.scale, { x: 0, y: 0, duration: 1, ease: 'back.out(1.2)' });
    };

    /**
     * Rotate plane to new orientation
     */
    GSAPEngine.prototype.rotatePlane = function (id, newRotation, duration = 1) {
        const obj = this.objects[id];
        if (!obj) return;

        gsap.to(obj.group.rotation, {
            x: newRotation.x || 0,
            y: newRotation.y || 0,
            z: newRotation.z || 0,
            duration,
            ease: "power2.out"
        });
    };

    /**
     * Animate feature projection (points sliding to new view)
     */
    GSAPEngine.prototype.animateFeatureProjection = function (newPositions, duration = 1.5) {
        newPositions.forEach((pos, i) => {
            const obj = this.objects[`p_${i}`];
            if (!obj) return;

            // Create curved path using bezier
            const startPos = obj.group.position.clone();
            const endPos = new THREE.Vector3(pos.x, pos.y, pos.z || 0);
            const midPos = new THREE.Vector3(
                (startPos.x + endPos.x) / 2,
                Math.max(startPos.y, endPos.y) + 2,  // Arc above
                (startPos.z + endPos.z) / 2
            );

            // Animate along curve
            const progress = { t: 0 };
            gsap.to(progress, {
                t: 1,
                duration,
                ease: "power2.inOut",
                onUpdate: () => {
                    // Quadratic bezier
                    const t = progress.t;
                    const x = (1-t)*(1-t)*startPos.x + 2*(1-t)*t*midPos.x + t*t*endPos.x;
                    const y = (1-t)*(1-t)*startPos.y + 2*(1-t)*t*midPos.y + t*t*endPos.y;
                    const z = (1-t)*(1-t)*startPos.z + 2*(1-t)*t*midPos.z + t*t*endPos.z;
                    obj.group.position.set(x, y, z);
                }
            });
        });
    };

    // ═══════════════════════════════════════════════════════════════════
    // MULTIPLE REGRESSION (3D VISUALIZATION)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Spawn a 3D data point for multiple regression (x1, x2, y)
     */
    GSAPEngine.prototype.spawn3DPoint = function (id, x1, x2, y, options = {}) {
        if (this.objects[id]) return;

        const {
            color = ML_COLORS.cyan,
            size = 0.3,
            delay = 0
        } = options;

        // Map: x1 -> x axis, x2 -> z axis, y -> y axis
        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.4,
            roughness: 0.3,
            metalness: 0.7,
            transparent: true
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x1, y, x2);  // x1 on X, y on Y, x2 on Z
        mesh.scale.set(0, 0, 0);

        this.scene.add(mesh);
        this.objects[id] = { group: mesh, type: '3d_point', mesh, x1, x2, y };
        this.regressionPoints.push({ id, x1, x2, y });

        // Pop animation
        gsap.to(mesh.scale, {
            x: 1, y: 1, z: 1,
            duration: 0.5,
            delay,
            ease: "back.out(1.7)"
        });

        // Add micro-motion
        gsap.to(mesh.position, {
            y: y + 0.03,
            duration: 1.5 + Math.random() * 0.5,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: delay + 0.5
        });
    };

    /**
     * Spawn 3D regression plane based on equation: y = m1*x1 + m2*x2 + c
     */
    GSAPEngine.prototype.spawnRegressionPlane3D = function (id, m1, m2, c, range = 6) {
        if (this.objects[id]) {
            // Update existing plane
            this.updateRegressionPlane3D(id, m1, m2, c, range);
            return;
        }

        const planeSize = range * 2;
        const segments = 20;
        const geometry = new THREE.PlaneGeometry(planeSize, planeSize, segments, segments);
        
        // Modify vertices to match equation: y = m1*x1 + m2*x2 + c
        const positions = geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            const x1 = positions[i];      // x position
            const x2 = positions[i + 1];  // originally y, will become z
            const y = m1 * x1 + m2 * x2 + c;
            
            // Remap: plane x -> world x (x1), plane y -> world z (x2), calculated y -> world y
            positions[i] = x1;
            positions[i + 1] = y;
            positions[i + 2] = x2;
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();

        const material = new THREE.MeshPhysicalMaterial({
            color: ML_COLORS.modelLine,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0,
            metalness: 0.2,
            roughness: 0.3,
            clearcoat: 0.3,
            wireframe: false
        });

        // Add wireframe overlay
        const wireframeMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            transparent: true,
            opacity: 0.15
        });
        const wireframeMesh = new THREE.Mesh(geometry.clone(), wireframeMat);

        const plane = new THREE.Mesh(geometry, material);
        const group = new THREE.Group();
        group.add(plane);
        group.add(wireframeMesh);

        this.scene.add(group);
        this.objects[id] = { group, plane, wireframe: wireframeMesh, type: 'regression_plane_3d', m1, m2, c, geometry };

        // Animate appearance
        gsap.to(material, { opacity: 0.5, duration: 1 });
        gsap.to(wireframeMat, { opacity: 0.2, duration: 1 });
        gsap.from(group.scale, { x: 0, y: 0, z: 0, duration: 1, ease: 'back.out(1.2)' });
    };

    /**
     * Update 3D regression plane with new coefficients
     */
    GSAPEngine.prototype.updateRegressionPlane3D = function (id, m1, m2, c, range = 6) {
        const obj = this.objects[id];
        if (!obj || obj.type !== 'regression_plane_3d') return;

        const geometry = obj.geometry;
        const positions = geometry.attributes.position.array;
        
        // Create target positions
        const targetPositions = [];
        for (let i = 0; i < positions.length; i += 3) {
            const x1 = positions[i];
            const x2 = positions[i + 2];  // z is x2
            const newY = m1 * x1 + m2 * x2 + c;
            targetPositions.push(newY);
        }

        // Animate to new positions
        const anim = { progress: 0 };
        const originalY = [];
        for (let i = 0; i < positions.length; i += 3) {
            originalY.push(positions[i + 1]);
        }

        gsap.to(anim, {
            progress: 1,
            duration: 0.8,
            ease: "power2.out",
            onUpdate: () => {
                for (let i = 0, j = 0; i < positions.length; i += 3, j++) {
                    positions[i + 1] = originalY[j] + (targetPositions[j] - originalY[j]) * anim.progress;
                }
                geometry.attributes.position.needsUpdate = true;
                geometry.computeVertexNormals();
                
                // Update wireframe geometry too
                if (obj.wireframe) {
                    const wPos = obj.wireframe.geometry.attributes.position.array;
                    for (let i = 0, j = 0; i < wPos.length; i += 3, j++) {
                        wPos[i + 1] = positions[i + 1];
                    }
                    obj.wireframe.geometry.attributes.position.needsUpdate = true;
                }
            }
        });

        obj.m1 = m1;
        obj.m2 = m2;
        obj.c = c;
    };

    /**
     * Show equation for multiple regression: y = m1*x1 + m2*x2 + c
     */
    GSAPEngine.prototype.showMultipleEquation = function (m1, m2, c) {
        const m1Str = m1.toFixed(2);
        const m2Str = m2 >= 0 ? `+ ${m2.toFixed(2)}` : `- ${Math.abs(m2).toFixed(2)}`;
        const cStr = c >= 0 ? `+ ${c.toFixed(2)}` : `- ${Math.abs(c).toFixed(2)}`;
        const equation = `y = ${m1Str}x₁ ${m2Str}x₂ ${cStr}`;

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(equation, 256, 70);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.position.set(0, 10, 0);
        sprite.scale.set(8, 2, 1);
        this.scene.add(sprite);
        this.objects['multi_equation_label'] = { group: sprite, type: 'label' };

        sprite.material.opacity = 0;
        gsap.to(sprite.material, { opacity: 1, duration: 0.5 });
    };

    /**
     * Show coefficient bar chart
     */
    GSAPEngine.prototype.showCoefficientBars = function (coefficients, labels) {
        const barWidth = 0.8;
        const barSpacing = 1.2;
        const maxHeight = 5;
        const maxCoeff = Math.max(...coefficients.map(Math.abs));
        const startX = -((coefficients.length - 1) * barSpacing) / 2;
        const baseY = -6;
        const baseZ = 8;

        coefficients.forEach((coeff, i) => {
            const normalizedHeight = (Math.abs(coeff) / maxCoeff) * maxHeight;
            const color = coeff >= 0 ? 0x44ff88 : 0xff4444;  // Green positive, red negative

            // Bar geometry
            const geometry = new THREE.BoxGeometry(barWidth, normalizedHeight, barWidth);
            const material = new THREE.MeshStandardMaterial({
                color,
                emissive: color,
                emissiveIntensity: 0.3,
                transparent: true,
                opacity: 0.8
            });

            const bar = new THREE.Mesh(geometry, material);
            bar.position.set(
                startX + i * barSpacing,
                baseY + normalizedHeight / 2,
                baseZ
            );
            bar.scale.y = 0;
            this.scene.add(bar);
            this.objects[`coeff_bar_${i}`] = { group: bar, type: 'coefficient_bar' };

            // Animate bar growing
            gsap.to(bar.scale, {
                y: 1,
                duration: 0.6,
                delay: i * 0.15,
                ease: "back.out(1.5)"
            });

            // Label
            const labelText = labels[i] || `x${i + 1}`;
            const labelCanvas = document.createElement('canvas');
            labelCanvas.width = 128;
            labelCanvas.height = 64;
            const ctx = labelCanvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(labelText, 64, 40);
            
            const labelTexture = new THREE.CanvasTexture(labelCanvas);
            const labelMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true });
            const labelSprite = new THREE.Sprite(labelMat);
            labelSprite.position.set(startX + i * barSpacing, baseY - 0.8, baseZ);
            labelSprite.scale.set(1.5, 0.75, 1);
            this.scene.add(labelSprite);

            // Value label on top
            const valueCanvas = document.createElement('canvas');
            valueCanvas.width = 128;
            valueCanvas.height = 64;
            const vCtx = valueCanvas.getContext('2d');
            vCtx.fillStyle = color === 0x44ff88 ? '#44ff88' : '#ff4444';
            vCtx.font = 'bold 20px Arial';
            vCtx.textAlign = 'center';
            vCtx.fillText(coeff.toFixed(2), 64, 40);
            
            const valueTexture = new THREE.CanvasTexture(valueCanvas);
            const valueMat = new THREE.SpriteMaterial({ map: valueTexture, transparent: true });
            const valueSprite = new THREE.Sprite(valueMat);
            valueSprite.position.set(startX + i * barSpacing, baseY + normalizedHeight + 0.5, baseZ);
            valueSprite.scale.set(1.2, 0.6, 1);
            valueSprite.material.opacity = 0;
            this.scene.add(valueSprite);

            gsap.to(valueSprite.material, {
                opacity: 1,
                duration: 0.3,
                delay: 0.6 + i * 0.15
            });
        });
    };

    /**
     * Spawn 3D axes for multiple regression (x1, x2, y)
     */
    GSAPEngine.prototype.spawn3DAxes = function (range = 6) {
        const axisGroup = new THREE.Group();
        axisGroup.name = '3d_axes';

        const createAxis = (start, end, color) => {
            const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const mat = new THREE.LineBasicMaterial({ color, opacity: 0.8, transparent: true });
            return new THREE.Line(geo, mat);
        };

        // X1 axis (red)
        axisGroup.add(createAxis([-range, 0, 0], [range, 0, 0], 0xff4444));
        // Y axis (green) 
        axisGroup.add(createAxis([0, -range, 0], [0, range, 0], 0x44ff44));
        // X2 axis (blue)
        axisGroup.add(createAxis([0, 0, -range], [0, 0, range], 0x4444ff));

        // Axis labels
        const createLabel = (text, pos, color) => {
            const canvas = document.createElement('canvas');
            canvas.width = 64; canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = color;
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(text, 32, 42);
            const texture = new THREE.CanvasTexture(canvas);
            const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
            const sprite = new THREE.Sprite(mat);
            sprite.position.set(...pos);
            sprite.scale.set(1, 1, 1);
            return sprite;
        };

        axisGroup.add(createLabel('X₁', [range + 0.5, 0, 0], '#ff4444'));
        axisGroup.add(createLabel('Y', [0, range + 0.5, 0], '#44ff44'));
        axisGroup.add(createLabel('X₂', [0, 0, range + 0.5], '#4444ff'));

        this.scene.add(axisGroup);
        this.objects['3d_axes'] = { group: axisGroup, type: 'axes_3d' };

        // Fade in
        axisGroup.children.forEach(child => {
            if (child.material) {
                const targetOpacity = child.material.opacity || 1;
                child.material.transparent = true;
                child.material.opacity = 0;
                gsap.to(child.material, { opacity: targetOpacity, duration: 0.8 });
            }
        });
    };

    // ═══════════════════════════════════════════════════════════════════
    // CELEBRATION / COMPLETION
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Celebration effect when training completes
     */
    GSAPEngine.prototype.celebrateCompletion = function () {
        // Glow all points
        this.regressionPoints.forEach((p, i) => {
            const obj = this.objects[`p_${i}`];
            if (obj && obj.mesh) {
                gsap.to(obj.mesh.material, {
                    emissiveIntensity: 1,
                    duration: 0.3,
                    yoyo: true,
                    repeat: 2
                });
            }
        });

        // Glow regression line
        this.glowLine('reg_line');

        // Create particle burst at center
        this.createParticleBurst({ x: 0, y: 0, z: 0 }, ML_COLORS.highlight, 30);
    };

    /**
     * Simple particle burst effect
     */
    GSAPEngine.prototype.createParticleBurst = function (position, color, count = 20) {
        for (let i = 0; i < count; i++) {
            const geo = new THREE.SphereGeometry(0.08, 8, 8);
            const mat = new THREE.MeshBasicMaterial({
                color,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(geo, mat);
            particle.position.set(position.x, position.y, position.z);
            this.scene.add(particle);

            // Random direction
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            const targetX = position.x + Math.cos(angle) * speed;
            const targetY = position.y + Math.sin(angle) * speed;

            gsap.to(particle.position, {
                x: targetX,
                y: targetY,
                duration: 1,
                ease: "power2.out"
            });
            gsap.to(mat, {
                opacity: 0,
                duration: 1,
                onComplete: () => {
                    this.scene.remove(particle);
                    geo.dispose();
                    mat.dispose();
                }
            });
        }
    };
}

// ═══════════════════════════════════════════════════════════════════
// HIGH-LEVEL API (for programmatic use)
// ═══════════════════════════════════════════════════════════════════

export function LinearRegressionAPI(viz) {
    let dataPoints = [];
    let currentModel = { m: 0, b: 0 };

    return {
        loadData(data) {
            dataPoints = data;
            viz.spawnPointsStaggered(data, 0.1);
        },

        drawInitialModel(params) {
            currentModel = params;
            const xMin = -10, xMax = 10;
            const y1 = params.m * xMin + params.b;
            const y2 = params.m * xMax + params.b;
            viz.spawnLine('reg_line', { x: xMin, y: y1, z: 0 }, { x: xMax, y: y2, z: 0 });
        },

        showResiduals() {
            dataPoints.forEach((p, i) => {
                const predictedY = currentModel.m * p.x + currentModel.b;
                viz.drawErrorLine(`err_p_${i}`, 
                    { x: p.x, y: p.y, z: 0 },
                    { x: p.x, y: predictedY, z: 0 }
                );
            });
        },

        updateModel(newParams) {
            currentModel = newParams;
            viz.updateRegressionModel(newParams.m, newParams.b);
        },

        predict(x) {
            return currentModel.m * x + currentModel.b;
        },

        complete() {
            viz.celebrateCompletion();
            viz.showModelEquation(currentModel.m, currentModel.b);
        }
    };
}
