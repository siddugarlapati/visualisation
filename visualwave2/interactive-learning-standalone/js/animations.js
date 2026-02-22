/**
 * animations.js - 3D Animations for DSA & ML Topics
 * Uses Three.js scene setup + GSAP animation primitives from visualizer3 engine
 */

import * as THREE from 'three';
import { setupScene } from './sceneSetup.js';
import { COLORS, createPremiumMaterial, createPointMaterial } from './materials.js';
import {
    spawnWithPop,
    spawnStaggered,
    addMicroMotion,
    pulse,
    addGlowRing,
    createTrailPoint,
    interpolateColor,
    createTextSprite,
    startCameraDrift,
    delay
} from './animationHelpers.js';

// ═══════════════════════════════════════════════════════════════════
// ANIMATION MANAGER
// ═══════════════════════════════════════════════════════════════════

export class AnimationManager {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.animationId = null;
        this.driftTween = null;
    }

    /**
     * Initialize a fresh scene (cleanup previous if any)
     */
    initScene() {
        this.cleanup();

        const { scene, camera, renderer } = setupScene(this.container);
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;

        // Start subtle camera drift
        this.driftTween = startCameraDrift(camera, 0.2);
    }

    /**
     * Cleanup previous animation completely
     */
    cleanup() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.driftTween) {
            this.driftTween.kill();
            this.driftTween = null;
        }
        // Kill all GSAP tweens
        gsap.globalTimeline.clear();

        if (this.renderer) {
            this.renderer.dispose();
            // Remove canvas from container
            const canvas = this.container.querySelector('canvas');
            if (canvas) this.container.removeChild(canvas);
        }
        this.scene = null;
        this.camera = null;
        this.renderer = null;
    }

    /**
     * Start render loop
     */
    startLoop(tickCallback = null) {
        const loop = () => {
            this.animationId = requestAnimationFrame(loop);
            if (tickCallback) tickCallback();
            this.renderer.render(this.scene, this.camera);
        };
        loop();
    }

    // ═══════════════════════════════════════════════════════════════
    // BINARY SEARCH ANIMATION
    // ═══════════════════════════════════════════════════════════════

    animateBinarySearch() {
        this.initScene();
        this.camera.position.set(0, 6, 16);
        this.camera.lookAt(0, 0, 0);

        const arr = [2, 5, 8, 12, 16, 23, 38, 45, 56, 67, 78];
        const target = 23;
        const boxW = 1.1;
        const gap = 0.15;
        const startX = -(arr.length * (boxW + gap)) / 2;

        // Title label
        const title = createTextSprite('Binary Search — find 23', 40, '#00ffff');
        title.position.set(0, 4, 0);
        this.scene.add(title);
        spawnWithPop(title, 0.6);

        // Create array boxes
        const boxes = [];
        arr.forEach((val, i) => {
            const geo = new THREE.RoundedBoxGeometry
                ? new THREE.BoxGeometry(boxW, 0.8, 0.5, 2, 2, 2)
                : new THREE.BoxGeometry(boxW, 0.8, 0.5);
            const mat = createPremiumMaterial({
                color: 0x667eea,
                metalness: 0.7,
                roughness: 0.2,
                emissive: 0x667eea,
                emissiveIntensity: 0.1,
            });
            const box = new THREE.Mesh(geo, mat);
            box.position.set(startX + i * (boxW + gap), 0, 0);
            box.castShadow = true;
            this.scene.add(box);
            boxes.push(box);

            // Add value label
            const label = createTextSprite(val.toString(), 36, '#ffffff');
            label.position.set(box.position.x, -1.2, 0);
            label.scale.set(2.5, 0.7, 1);
            this.scene.add(label);

            // Staggered pop-in
            spawnWithPop(box, 0.4, i * 0.06);
            spawnWithPop(label, 0.4, i * 0.06 + 0.1);
        });

        // Binary search animation steps
        let left = 0;
        let right = arr.length - 1;

        const runStep = async () => {
            if (left > right) return;

            const mid = Math.floor((left + right) / 2);

            // Dim eliminated elements
            boxes.forEach((box, i) => {
                if (i < left || i > right) {
                    interpolateColor(box.material, box.material.color.getHex(), 0x333333, 0.5);
                    gsap.to(box.position, { y: -0.5, duration: 0.5, ease: "power2.out" });
                }
            });

            // Highlight mid element
            interpolateColor(boxes[mid].material, boxes[mid].material.color.getHex(), COLORS.warning, 0.3);
            gsap.to(boxes[mid].position, { y: 1.5, duration: 0.6, ease: "back.out(1.7)" });
            pulse(boxes[mid], 1.3, 0.6);
            addGlowRing(this.scene, boxes[mid], COLORS.warning);

            await delay(1500);

            if (arr[mid] === target) {
                // Found!
                interpolateColor(boxes[mid].material, COLORS.warning, COLORS.success, 0.5);
                addGlowRing(this.scene, boxes[mid], COLORS.success);
                const found = createTextSprite('✓ Found!', 44, '#51cf66');
                found.position.set(boxes[mid].position.x, 3, 0);
                this.scene.add(found);
                spawnWithPop(found, 0.5);
                return;
            } else if (arr[mid] < target) {
                // Search right — reset mid, narrow
                gsap.to(boxes[mid].position, { y: 0, duration: 0.3 });
                interpolateColor(boxes[mid].material, COLORS.warning, 0x333333, 0.5);
                left = mid + 1;
            } else {
                gsap.to(boxes[mid].position, { y: 0, duration: 0.3 });
                interpolateColor(boxes[mid].material, COLORS.warning, 0x333333, 0.5);
                right = mid - 1;
            }

            await delay(800);
            runStep();
        };

        // Start after initial pop-in completes
        setTimeout(() => runStep(), arr.length * 60 + 600);

        this.startLoop();
    }

    // ═══════════════════════════════════════════════════════════════
    // LINKED LIST ANIMATION
    // ═══════════════════════════════════════════════════════════════

    animateLinkedList() {
        this.initScene();
        this.camera.position.set(0, 3, 14);
        this.camera.lookAt(0, 0, 0);

        const values = [10, 20, 30, 40, 50];
        const spacing = 3.5;
        const startX = -(values.length - 1) * spacing / 2;
        const nodes = [];
        const arrows = [];

        // Title
        const title = createTextSprite('Linked List Traversal', 40, '#00ffff');
        title.position.set(0, 4, 0);
        this.scene.add(title);
        spawnWithPop(title, 0.6);

        // Create nodes
        values.forEach((val, i) => {
            const geo = new THREE.SphereGeometry(0.6, 64, 64);
            const mat = createPremiumMaterial({
                color: 0x667eea,
                metalness: 0.3,
                roughness: 0.15,
                emissive: 0x667eea,
                emissiveIntensity: 0.1,
                clearcoat: 0.8,
            });
            const sphere = new THREE.Mesh(geo, mat);
            sphere.position.set(startX + i * spacing, 0, 0);
            sphere.castShadow = true;
            this.scene.add(sphere);
            nodes.push(sphere);

            // Value label
            const label = createTextSprite(val.toString(), 40, '#ffffff');
            label.position.set(sphere.position.x, -1.3, 0);
            label.scale.set(2.5, 0.7, 1);
            this.scene.add(label);

            spawnWithPop(sphere, 0.5, i * 0.15);
            spawnWithPop(label, 0.4, i * 0.15 + 0.1);
            addMicroMotion(sphere, 0.04, 2 + i * 0.3);

            // Create arrow to next node
            if (i < values.length - 1) {
                const from = new THREE.Vector3(startX + i * spacing + 0.7, 0, 0);
                const to = new THREE.Vector3(startX + (i + 1) * spacing - 0.7, 0, 0);
                const dir = new THREE.Vector3().subVectors(to, from).normalize();
                const len = from.distanceTo(to);

                const arrowGeo = new THREE.CylinderGeometry(0.04, 0.04, len, 8);
                const arrowMat = createPremiumMaterial({
                    color: 0x00ffff,
                    emissive: 0x00ffff,
                    emissiveIntensity: 0.5,
                    metalness: 0,
                    roughness: 0,
                });
                const arrow = new THREE.Mesh(arrowGeo, arrowMat);
                arrow.position.set((from.x + to.x) / 2, 0, 0);
                arrow.rotation.z = Math.PI / 2;
                this.scene.add(arrow);
                arrows.push(arrow);

                spawnWithPop(arrow, 0.3, i * 0.15 + 0.3);

                // Arrowhead
                const headGeo = new THREE.ConeGeometry(0.12, 0.3, 8);
                const headMat = arrowMat.clone();
                const head = new THREE.Mesh(headGeo, headMat);
                head.position.set(to.x, 0, 0);
                head.rotation.z = -Math.PI / 2;
                this.scene.add(head);
                spawnWithPop(head, 0.3, i * 0.15 + 0.35);
            }
        });

        // HEAD label
        const headLabel = createTextSprite('HEAD', 32, '#ff6b6b');
        headLabel.position.set(nodes[0].position.x, 2, 0);
        headLabel.scale.set(2.5, 0.7, 1);
        this.scene.add(headLabel);
        spawnWithPop(headLabel, 0.4, 0.2);

        // NULL label
        const nullLabel = createTextSprite('NULL', 32, '#888888');
        nullLabel.position.set(nodes[nodes.length - 1].position.x + 2.5, 0, 0);
        nullLabel.scale.set(2.5, 0.7, 1);
        this.scene.add(nullLabel);
        spawnWithPop(nullLabel, 0.4, values.length * 0.15 + 0.4);

        // Traverse animation
        let currentIdx = 0;
        const traverse = async () => {
            await delay(values.length * 150 + 800);

            for (let i = 0; i < nodes.length; i++) {
                currentIdx = i;

                // Highlight current node
                interpolateColor(nodes[i].material, 0x667eea, COLORS.warning, 0.4);
                pulse(nodes[i], 1.4, 0.5);
                addGlowRing(this.scene, nodes[i], COLORS.warning);

                await delay(1200);

                // Restore color
                if (i < nodes.length - 1) {
                    interpolateColor(nodes[i].material, COLORS.warning, COLORS.cyan, 0.5);
                }
            }

            // Mark last node found
            interpolateColor(nodes[nodes.length - 1].material, COLORS.warning, COLORS.success, 0.5);
            const done = createTextSprite('✓ Traversal Complete', 36, '#51cf66');
            done.position.set(0, 3.5, 0);
            done.scale.set(5, 1.25, 1);
            this.scene.add(done);
            spawnWithPop(done, 0.5);
        };

        traverse();
        this.startLoop();
    }

    // ═══════════════════════════════════════════════════════════════
    // SORTING ANIMATION (Bubble Sort)
    // ═══════════════════════════════════════════════════════════════

    animateSorting() {
        this.initScene();
        this.camera.position.set(0, 5, 14);
        this.camera.lookAt(0, 0, 0);

        const arr = [64, 34, 25, 12, 22, 11, 90];
        const maxVal = Math.max(...arr);
        const barW = 0.7;
        const gap = 0.2;
        const startX = -(arr.length * (barW + gap)) / 2;

        // Title
        const title = createTextSprite('Bubble Sort', 40, '#00ffff');
        title.position.set(0, 5, 0);
        this.scene.add(title);
        spawnWithPop(title, 0.6);

        // Create bars
        const bars = [];
        const labels = [];
        arr.forEach((val, i) => {
            const height = (val / maxVal) * 5;
            const geo = new THREE.BoxGeometry(barW, height, 0.5, 2, 2, 2);
            const mat = createPremiumMaterial({
                color: 0x667eea,
                metalness: 0.7,
                roughness: 0.2,
                emissive: 0x667eea,
                emissiveIntensity: 0.1,
            });
            const bar = new THREE.Mesh(geo, mat);
            bar.position.set(startX + i * (barW + gap), height / 2 - 2, 0);
            bar.castShadow = true;
            this.scene.add(bar);
            bars.push(bar);

            const label = createTextSprite(val.toString(), 32, '#ffffff');
            label.position.set(bar.position.x, bar.position.y + height / 2 + 0.6, 0);
            label.scale.set(2, 0.5, 1);
            this.scene.add(label);
            labels.push(label);

            spawnWithPop(bar, 0.4, i * 0.08);
            spawnWithPop(label, 0.3, i * 0.08 + 0.1);
        });

        // Bubble sort with GSAP animations
        const sortSteps = [];
        const tempArr = [...arr];

        // Pre-calculate all swaps
        for (let i = 0; i < tempArr.length; i++) {
            for (let j = 0; j < tempArr.length - i - 1; j++) {
                sortSteps.push({ i: j, j: j + 1, swap: tempArr[j] > tempArr[j + 1] });
                if (tempArr[j] > tempArr[j + 1]) {
                    [tempArr[j], tempArr[j + 1]] = [tempArr[j + 1], tempArr[j]];
                }
            }
        }

        // Animate steps
        const runSort = async () => {
            await delay(arr.length * 80 + 600);

            for (const step of sortSteps) {
                // Highlight comparing bars
                interpolateColor(bars[step.i].material, bars[step.i].material.color.getHex(), COLORS.warning, 0.2);
                interpolateColor(bars[step.j].material, bars[step.j].material.color.getHex(), COLORS.warning, 0.2);

                await delay(350);

                if (step.swap) {
                    // Swap positions with GSAP arc
                    const posA = bars[step.i].position.x;
                    const posB = bars[step.j].position.x;

                    gsap.to(bars[step.i].position, { x: posB, y: bars[step.i].position.y + 1, duration: 0.5, ease: "power2.inOut" });
                    gsap.to(bars[step.j].position, { x: posA, y: bars[step.j].position.y - 0.3, duration: 0.5, ease: "power2.inOut" });
                    gsap.to(labels[step.i].position, { x: posB, duration: 0.5, ease: "power2.inOut" });
                    gsap.to(labels[step.j].position, { x: posA, duration: 0.5, ease: "power2.inOut" });

                    await delay(500);

                    // Settle back to proper y
                    gsap.to(bars[step.i].position, { y: bars[step.i].position.y - 1, duration: 0.2 });
                    gsap.to(bars[step.j].position, { y: bars[step.j].position.y + 0.3, duration: 0.2 });

                    // Swap references
                    [bars[step.i], bars[step.j]] = [bars[step.j], bars[step.i]];
                    [labels[step.i], labels[step.j]] = [labels[step.j], labels[step.i]];
                }

                // Restore color
                interpolateColor(bars[step.i].material, COLORS.warning, 0x667eea, 0.3);
                interpolateColor(bars[step.j].material, COLORS.warning, 0x667eea, 0.3);

                await delay(200);
            }

            // All sorted — turn green
            for (let i = 0; i < bars.length; i++) {
                interpolateColor(bars[i].material, 0x667eea, COLORS.success, 0.3);
                pulse(bars[i], 1.15, 0.3);
                await delay(100);
            }

            const done = createTextSprite('✓ Sorted!', 44, '#51cf66');
            done.position.set(0, 5, 0);
            this.scene.add(done);
            spawnWithPop(done, 0.5);
        };

        runSort();
        this.startLoop();
    }

    // ═══════════════════════════════════════════════════════════════
    // LINEAR REGRESSION ANIMATION
    // ═══════════════════════════════════════════════════════════════

    animateLinearRegression() {
        this.initScene();
        this.camera.position.set(0, 5, 16);
        this.camera.lookAt(0, 0, 0);

        const dataPoints = [
            { x: -4, y: -1.5 }, { x: -3, y: 0 }, { x: -2, y: 0.5 },
            { x: -1, y: 0.2 }, { x: 0, y: 1 }, { x: 1, y: 1.8 },
            { x: 2, y: 2.5 }, { x: 3, y: 3.3 }, { x: 4, y: 3.8 },
            { x: 5, y: 5 }
        ];

        // Title
        const title = createTextSprite('Linear Regression', 40, '#00ffff');
        title.position.set(0, 5.5, 0);
        this.scene.add(title);
        spawnWithPop(title, 0.6);

        // Draw axes
        const axisMatX = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        const axisGeoX = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-6, -2, 0), new THREE.Vector3(7, -2, 0)
        ]);
        this.scene.add(new THREE.Line(axisGeoX, axisMatX));

        const axisGeoY = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-6, -2, 0), new THREE.Vector3(-6, 6, 0)
        ]);
        this.scene.add(new THREE.Line(axisGeoY, axisMatX));

        // Spawn data points
        const pointMeshes = [];
        dataPoints.forEach((p, i) => {
            const geo = new THREE.SphereGeometry(0.18, 32, 32);
            const mat = createPointMaterial(COLORS.warning);
            const sphere = new THREE.Mesh(geo, mat);
            sphere.position.set(p.x, p.y, 0);
            sphere.castShadow = true;
            this.scene.add(sphere);
            pointMeshes.push(sphere);

            spawnWithPop(sphere, 0.4, i * 0.1);
            addMicroMotion(sphere, 0.03, 2);
        });

        // Regression line (starts horizontal, animates to fit)
        const lineGeo = new THREE.BufferGeometry();
        const lineMat = new THREE.LineBasicMaterial({ color: COLORS.modelLine, linewidth: 3 });

        let m = 0;
        let b = 1;
        const targetM = 0.6;
        const targetB = 0.5;

        const updateLine = () => {
            const pts = [
                new THREE.Vector3(-6, m * -6 + b, 0),
                new THREE.Vector3(7, m * 7 + b, 0)
            ];
            lineGeo.setFromPoints(pts);
        };
        updateLine();
        const line = new THREE.Line(lineGeo, lineMat);
        this.scene.add(line);

        // Also create a thicker tube for the line
        const tubeGeo = new THREE.CylinderGeometry(0.04, 0.04, 13, 8);
        const tubeMat = createPremiumMaterial({
            color: COLORS.modelLine,
            emissive: COLORS.modelLine,
            emissiveIntensity: 0.5,
            metalness: 0,
            roughness: 0,
        });
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.position.set(0.5, b, 0);
        tube.rotation.z = Math.PI / 2;
        this.scene.add(tube);
        spawnWithPop(tube, 0.5, dataPoints.length * 0.1 + 0.3);

        // Animate line fitting
        const animateFit = async () => {
            await delay(dataPoints.length * 100 + 800);

            const steps = 60;
            for (let step = 0; step <= steps; step++) {
                const t = step / steps;
                m = t * targetM;
                b = (1 - t) * 1 + t * targetB;
                updateLine();

                // Update tube rotation + position
                const angle = Math.atan(m);
                tube.rotation.z = Math.PI / 2 + angle;
                tube.position.y = b;

                await delay(50);
            }

            // Show equation
            const eq = createTextSprite(`y = ${targetM.toFixed(1)}x + ${targetB.toFixed(1)}`, 36, '#ffa500');
            eq.position.set(3, 4.5, 0);
            this.scene.add(eq);
            spawnWithPop(eq, 0.5);

            // Draw residual lines
            await delay(500);
            dataPoints.forEach((p, i) => {
                const predicted = targetM * p.x + targetB;
                const residualGeo = new THREE.BufferGeometry().setFromPoints([
                    new THREE.Vector3(p.x, p.y, 0),
                    new THREE.Vector3(p.x, predicted, 0)
                ]);
                const error = Math.abs(p.y - predicted) / 3;
                const residualColor = error < 0.3 ? COLORS.residualLow : COLORS.residual;
                const residualMat = new THREE.LineBasicMaterial({
                    color: residualColor,
                    transparent: true,
                    opacity: 0.7
                });
                const residualLine = new THREE.Line(residualGeo, residualMat);
                this.scene.add(residualLine);
            });
        };

        animateFit();
        this.startLoop();
    }

    // ═══════════════════════════════════════════════════════════════
    // GRADIENT DESCENT ANIMATION
    // ═══════════════════════════════════════════════════════════════

    animateGradientDescent() {
        this.initScene();
        this.camera.position.set(8, 8, 10);
        this.camera.lookAt(0, 0, 0);

        // Title
        const title = createTextSprite('Gradient Descent', 40, '#00ffff');
        title.position.set(0, 6, 0);
        this.scene.add(title);
        spawnWithPop(title, 0.6);

        // Create 3D parabola surface (cost function) using PlaneGeometry with vertex displacement
        const surfaceGeo = new THREE.PlaneGeometry(10, 10, 60, 60);
        surfaceGeo.rotateX(-Math.PI / 2);
        const posAttr = surfaceGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const z = posAttr.getZ(i);
            const y = (x * x + z * z) / 12;
            posAttr.setY(i, y);
        }
        surfaceGeo.computeVertexNormals();

        const surfaceMat = new THREE.MeshPhysicalMaterial({
            color: 0x667eea,
            wireframe: true,
            transparent: true,
            opacity: 0.35,
            metalness: 0.3,
            roughness: 0.6,
        });
        const surface = new THREE.Mesh(surfaceGeo, surfaceMat);
        this.scene.add(surface);
        spawnWithPop(surface, 1.0, 0.2);

        // Solid inner surface for depth
        const solidMat = new THREE.MeshPhysicalMaterial({
            color: 0x4f46e5,
            transparent: true,
            opacity: 0.15,
            metalness: 0.5,
            roughness: 0.4,
            side: THREE.DoubleSide,
        });
        const solidSurface = new THREE.Mesh(surfaceGeo.clone(), solidMat);
        this.scene.add(solidSurface);

        // Create the ball (optimizer)
        const ballGeo = new THREE.SphereGeometry(0.25, 32, 32);
        const ballMat = createPremiumMaterial({
            color: COLORS.warning,
            emissive: COLORS.warning,
            emissiveIntensity: 0.6,
            metalness: 0.1,
            roughness: 0.2,
        });
        const ball = new THREE.Mesh(ballGeo, ballMat);

        // Starting position on the surface
        let bx = -3.5;
        let bz = 2.5;
        let by = (bx * bx + bz * bz) / 12;
        ball.position.set(bx, by + 0.25, bz);
        ball.castShadow = true;
        this.scene.add(ball);
        spawnWithPop(ball, 0.5, 0.5);
        addGlowRing(this.scene, ball, COLORS.warning);

        // Gradient descent steps
        const runDescent = async () => {
            await delay(1200);

            const lr = 0.15;
            const steps = 30;

            for (let step = 0; step < steps; step++) {
                // Gradient = (2x/12, 2z/12)
                const gradX = (2 * bx) / 12;
                const gradZ = (2 * bz) / 12;

                // Trail point at current position
                createTrailPoint(this.scene, ball.position.clone(), COLORS.warning, 0.12, 1.5);

                // Update position
                bx -= lr * gradX;
                bz -= lr * gradZ;
                by = (bx * bx + bz * bz) / 12;

                gsap.to(ball.position, {
                    x: bx,
                    y: by + 0.25,
                    z: bz,
                    duration: 0.3,
                    ease: "power2.out"
                });

                await delay(350);

                // Slow down learning rate
                if (Math.abs(gradX) < 0.01 && Math.abs(gradZ) < 0.01) break;
            }

            // Reached minimum!
            interpolateColor(ballMat, COLORS.warning, COLORS.success, 0.5);
            pulse(ball, 1.5, 0.6);
            addGlowRing(this.scene, ball, COLORS.success);

            const done = createTextSprite('✓ Minimum Found!', 38, '#51cf66');
            done.position.set(0, 5, 0);
            this.scene.add(done);
            spawnWithPop(done, 0.5);
        };

        runDescent();

        // Slow surface rotation for drama
        this.startLoop(() => {
            surface.rotation.y += 0.002;
            solidSurface.rotation.y += 0.002;
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // NEURAL NETWORK ANIMATION
    // ═══════════════════════════════════════════════════════════════

    animateNeuralNetwork() {
        this.initScene();
        this.camera.position.set(0, 4, 16);
        this.camera.lookAt(0, 0, 0);

        // Title
        const title = createTextSprite('Neural Network — Forward Pass', 38, '#00ffff');
        title.position.set(0, 5.5, 0);
        this.scene.add(title);
        spawnWithPop(title, 0.6);

        const layerConfig = [
            { count: 3, x: -6, label: 'Input' },
            { count: 5, x: -2, label: 'Hidden 1' },
            { count: 4, x: 2, label: 'Hidden 2' },
            { count: 2, x: 6, label: 'Output' }
        ];

        const allNeurons = [];
        const allConnections = [];

        // Create neurons layer by layer
        layerConfig.forEach((layer, li) => {
            const neurons = [];
            const spacing = 1.8;
            const startY = -(layer.count - 1) * spacing / 2;

            // Layer label
            const label = createTextSprite(layer.label, 28, '#aaaaaa');
            label.position.set(layer.x, -(layer.count * spacing / 2) - 1.5, 0);
            label.scale.set(3, 0.8, 1);
            this.scene.add(label);
            spawnWithPop(label, 0.4, li * 0.2);

            for (let ni = 0; ni < layer.count; ni++) {
                const geo = new THREE.SphereGeometry(0.35, 32, 32);
                const mat = createPremiumMaterial({
                    color: 0x667eea,
                    metalness: 0.3,
                    roughness: 0.15,
                    emissive: 0x667eea,
                    emissiveIntensity: 0.1,
                    clearcoat: 0.8,
                });
                const neuron = new THREE.Mesh(geo, mat);
                neuron.position.set(layer.x, startY + ni * spacing, 0);
                neuron.castShadow = true;
                this.scene.add(neuron);
                neurons.push(neuron);

                spawnWithPop(neuron, 0.4, li * 0.2 + ni * 0.05);
                addMicroMotion(neuron, 0.03, 2 + ni * 0.2);
            }

            allNeurons.push(neurons);

            // Create connections to previous layer
            if (li > 0) {
                const prevNeurons = allNeurons[li - 1];
                neurons.forEach(neuron => {
                    prevNeurons.forEach(prev => {
                        const geo = new THREE.BufferGeometry().setFromPoints([
                            prev.position, neuron.position
                        ]);
                        const mat = new THREE.LineBasicMaterial({
                            color: 0xffffff,
                            transparent: true,
                            opacity: 0.12,
                        });
                        const line = new THREE.Line(geo, mat);
                        this.scene.add(line);
                        allConnections.push(line);
                    });
                });
            }
        });

        // Forward propagation animation
        const animateForward = async () => {
            await delay(layerConfig.length * 200 + 800);

            // Loop the forward propagation
            for (let round = 0; round < 3; round++) {
                for (let li = 0; li < allNeurons.length; li++) {
                    const neurons = allNeurons[li];

                    // Activate neurons in this layer
                    for (let ni = 0; ni < neurons.length; ni++) {
                        const neuron = neurons[ni];

                        gsap.to(neuron.material.color, {
                            r: 1, g: 0.84, b: 0,
                            duration: 0.3,
                        });
                        gsap.to(neuron.material, {
                            emissiveIntensity: 0.6,
                            duration: 0.3,
                        });
                        pulse(neuron, 1.4, 0.4);
                    }

                    // Brighten connections from this layer
                    if (li < allNeurons.length - 1) {
                        const connectionStart = li === 0 ? 0 :
                            allNeurons.slice(0, li).reduce((sum, layer, idx) =>
                                sum + layer.length * allNeurons[idx + 1].length, 0);
                        const connectionCount = neurons.length * allNeurons[li + 1].length;

                        for (let ci = connectionStart; ci < connectionStart + connectionCount && ci < allConnections.length; ci++) {
                            gsap.to(allConnections[ci].material, {
                                opacity: 0.6,
                                duration: 0.3,
                            });
                        }
                    }

                    await delay(800);

                    // Deactivate (fade back)
                    for (const neuron of neurons) {
                        gsap.to(neuron.material.color, {
                            r: 0.4, g: 0.47, b: 0.92,
                            duration: 0.5,
                        });
                        gsap.to(neuron.material, {
                            emissiveIntensity: 0.1,
                            duration: 0.5,
                        });
                    }

                    // Fade connections back
                    if (li < allNeurons.length - 1) {
                        const connectionStart = li === 0 ? 0 :
                            allNeurons.slice(0, li).reduce((sum, layer, idx) =>
                                sum + layer.length * allNeurons[idx + 1].length, 0);
                        const connectionCount = neurons.length * allNeurons[li + 1].length;

                        for (let ci = connectionStart; ci < connectionStart + connectionCount && ci < allConnections.length; ci++) {
                            gsap.to(allConnections[ci].material, {
                                opacity: 0.12,
                                duration: 0.5,
                            });
                        }
                    }
                }

                // Flash output layer green at end of round
                const outputNeurons = allNeurons[allNeurons.length - 1];
                for (const n of outputNeurons) {
                    gsap.to(n.material.color, { r: 0.32, g: 0.81, b: 0.4, duration: 0.3 });
                    pulse(n, 1.5, 0.5);
                }

                await delay(1200);

                // Reset output
                for (const n of outputNeurons) {
                    gsap.to(n.material.color, { r: 0.4, g: 0.47, b: 0.92, duration: 0.5 });
                }

                await delay(500);
            }
        };

        animateForward();
        this.startLoop();
    }
}
