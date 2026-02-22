/**
 * main.js — Interactive DSA & ML Learning (VisualWave Standalone)
 * 
 * Uses the full GSAPEngine from VisualWave + backend API for dynamic generation.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { setupScene } from './engine/scenesetup.js';
import { initBackground, updateBackground } from './engine/background.js';
import { GSAPEngine } from './engine/gsap_engine.js';
import { TOPICS } from './topicData.js';

// ═══════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════

const BACKEND_URL = 'http://localhost:8000';

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════

let engine = null;
let controls = null;
let renderer = null;
let scene = null;
let camera = null;
let clock = new THREE.Clock();
let animationFrameId = null;

let currentSteps = [];
let currentStepIndex = -1;
let isAutoPlaying = false;
let autoPlayTimer = null;
let activeCategory = 'dsa';
let backendConnected = false;

// ═══════════════════════════════════════════════
// DOM REFS
// ═══════════════════════════════════════════════

const canvas = document.getElementById('vizCanvas');
const topicInput = document.getElementById('topicInput');
const generateBtn = document.getElementById('generateBtn');
const topicGrid = document.getElementById('topicGrid');
const stepsContainer = document.getElementById('stepsContainer');
const stepNav = document.getElementById('stepNav');
const prevStepBtn = document.getElementById('prevStep');
const nextStepBtn = document.getElementById('nextStep');
const autoPlayBtn = document.getElementById('autoPlay');
const stepCounter = document.getElementById('stepCounter');
const canvasOverlay = document.getElementById('canvasOverlay');
const overlayText = document.getElementById('overlayText');
const loader = document.getElementById('loader');
const backendStatus = document.getElementById('backendStatus');
const customInputRow = document.getElementById('customInputRow');
const customInput = document.getElementById('customInput');

// ═══════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════

function init() {
    // Setup Three.js scene
    const sceneKit = setupScene(canvas);
    scene = sceneKit.scene;
    camera = sceneKit.camera;
    renderer = sceneKit.renderer;

    // Orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.minDistance = 3;
    controls.maxDistance = 40;

    // Background
    initBackground(scene);

    // Engine — initialize with empty bgObjects
    engine = new GSAPEngine(scene, camera, controls, []);

    // Resize handling
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Start render loop
    animate();

    // Setup UI
    setupUI();

    // Check backend
    checkBackend();
}

function resizeCanvas() {
    const panel = canvas.parentElement;
    const w = panel.clientWidth;
    const h = panel.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}

function animate() {
    animationFrameId = requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    controls.update();
    updateBackground(elapsed);

    // Tick the engine (updates connections, billboards, particles)
    if (engine) engine.tick();

    renderer.render(scene, camera);
}

// ═══════════════════════════════════════════════
// UI SETUP
// ═══════════════════════════════════════════════

function setupUI() {
    // Category tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeCategory = tab.dataset.category;
            renderTopicChips();
        });
    });

    // Generate button
    generateBtn.addEventListener('click', handleGenerate);
    topicInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleGenerate();
    });

    // Step navigation
    prevStepBtn.addEventListener('click', () => goToStep(currentStepIndex - 1));
    nextStepBtn.addEventListener('click', () => goToStep(currentStepIndex + 1));
    autoPlayBtn.addEventListener('click', toggleAutoPlay);

    // Render initial topic chips
    renderTopicChips();
}

function renderTopicChips() {
    const topics = TOPICS[activeCategory] || [];
    topicGrid.innerHTML = '';
    topics.forEach(topic => {
        const chip = document.createElement('button');
        chip.className = 'topic-chip';
        chip.textContent = topic.label;
        chip.addEventListener('click', () => {
            topicInput.value = topic.label;
            if (topic.defaultInput) {
                customInputRow.style.display = 'block';
                customInput.value = topic.defaultInput;
            }
            handleGenerate();
        });
        topicGrid.appendChild(chip);
    });
}

// ═══════════════════════════════════════════════
// BACKEND CONNECTION
// ═══════════════════════════════════════════════

async function checkBackend() {
    try {
        const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            setBackendStatus('connected');
            backendConnected = true;
        } else {
            setBackendStatus('error');
        }
    } catch {
        setBackendStatus('error');
    }
}

function setBackendStatus(status) {
    const dot = backendStatus.querySelector('.status-dot');
    const text = backendStatus.querySelector('.status-text');
    dot.className = 'status-dot';
    switch (status) {
        case 'connected':
            dot.classList.add('connected');
            text.textContent = 'Backend Connected';
            break;
        case 'error':
            dot.classList.add('error');
            text.textContent = 'Backend Offline';
            break;
        default:
            text.textContent = 'Connecting...';
    }
}

// ═══════════════════════════════════════════════
// GENERATE VISUALIZATION
// ═══════════════════════════════════════════════

async function handleGenerate() {
    const topic = topicInput.value.trim();
    if (!topic) return;

    // Check backend
    if (!backendConnected) {
        showError('Backend server is not running. Start it with: python main.py');
        return;
    }

    // Show loading state
    setLoading(true);
    stopAutoPlay();
    currentSteps = [];
    currentStepIndex = -1;

    try {
        let steps;
        if (activeCategory === 'dsa') {
            steps = await generateDSA(topic);
        } else {
            steps = await generateML(topic);
        }

        if (!steps || steps.length === 0) {
            showError('No visualization steps were generated. Try a different topic.');
            return;
        }

        // Reset engine for new visualization
        engine.reset();

        // Store steps and render UI
        currentSteps = steps;
        renderSteps(steps);
        stepNav.style.display = 'flex';

        // Execute first step
        goToStep(0);
        setLoading(false);
        canvasOverlay.classList.add('hidden');

    } catch (err) {
        console.error('Generation error:', err);
        showError(`Failed to generate: ${err.message}`);
        setLoading(false);
    }
}

async function generateDSA(topic) {
    // Get custom input if provided
    const inputStr = customInput.value.trim();
    let parsedInput = null;

    if (inputStr) {
        // Try to parse as array
        try {
            parsedInput = JSON.parse(`[${inputStr}]`);
        } catch {
            parsedInput = inputStr;
        }
    }

    const body = {
        problem_title: topic,
        description: `Visualize the ${topic} algorithm step by step`,
        input_mode: parsedInput ? 'custom' : 'auto',
        custom_input: parsedInput ? String(parsedInput) : undefined
    };

    const res = await fetch(`${BACKEND_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const data = await res.json();

    return data.steps || [];
}

async function generateML(topic) {
    // Map topic names to algorithm types
    const algorithmMap = {
        'linear regression': 'linear_regression',
        'multiple regression': 'multiple_regression',
        'logistic regression': 'logistic_regression',
        'k-means': 'k_means',
        'k-means clustering': 'k_means',
        'pca': 'pca',
        'principal component analysis': 'pca',
        'svm': 'svm',
        'support vector machine': 'svm',
        'decision tree': 'decision_tree',
        'random forest': 'random_forest',
        'knn': 'knn',
        'k-nearest neighbors': 'knn',
        'naive bayes': 'naive_bayes',
        'dbscan': 'dbscan',
        'gmm': 'gmm',
        'gaussian mixture': 'gmm',
        'gradient boosting': 'gradient_boosting',
        'neural network': 'neural_network',
    };

    const algorithm = algorithmMap[topic.toLowerCase()] || topic.toLowerCase().replace(/\s+/g, '_');

    // Build params from topic metadata or defaults
    const topicMeta = (TOPICS.ml || []).find(t => t.label.toLowerCase() === topic.toLowerCase());
    const params = topicMeta?.params || getDefaultMLParams(algorithm);

    const body = { algorithm, params };

    const res = await fetch(`${BACKEND_URL}/ml-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`ML API returned ${res.status}`);
    const data = await res.json();

    return data.steps || [];
}

function getDefaultMLParams(algorithm) {
    const defaults = {
        linear_regression: {
            data: [[1, 2.1], [2, 3.8], [3, 6.2], [4, 7.9], [5, 10.1],
                   [6, 12.3], [7, 13.8], [8, 16.1], [9, 18.2], [10, 20.0]]
        },
        k_means: {
            data: [[-6, 4], [-5, 5], [-7, 3], [-4, 4], [4, -3],
                   [5, -4], [3, -5], [6, -3], [0, 7], [1, 8], [-1, 6], [0, 9]],
            k: 3
        },
        logistic_regression: {
            data: [[-6, 2, 0], [-5, -1, 0], [-4, 3, 0], [-3, -2, 0],
                   [3, 1, 1], [4, -1, 1], [5, 3, 1], [6, -2, 1],
                   [-2, 0, 0], [2, 0, 1]]
        },
        pca: {
            data: [[1, 1.5], [2, 2.8], [3, 3.2], [4, 5.1], [5, 4.9],
                   [6, 7.2], [7, 6.8], [8, 8.5], [1.5, 2], [3.5, 4]]
        },
        svm: {
            data: [[-5, 3, 0], [-4, -2, 0], [-6, 1, 0], [-3, 4, 0],
                   [4, -1, 1], [5, 2, 1], [6, -3, 1], [3, 1, 1]]
        },
        neural_network: {
            layers: [4, 6, 6, 3],
            input: [0.5, -0.2, 0.1, 0.9],
            target: [0, 1, 0]
        },
        decision_tree: {
            data: [[-3, 5, 0], [-2, -3, 0], [1, 4, 1], [3, -1, 1],
                   [-4, 2, 0], [5, 3, 1], [-1, -4, 0], [4, 1, 1]],
            max_depth: 3
        },
        knn: {
            data: [[-5, 3, 0], [-4, -2, 0], [-6, 1, 0], [4, -1, 1], [5, 2, 1], [3, 1, 1]],
            test_point: { x: 0, y: 0 },
            k: 3
        },
        dbscan: {
            data: [[-6, 4], [-5, 5], [-7, 3], [4, -3], [5, -4], [3, -5], [0, 0]],
            eps: 2.0,
            min_samples: 3
        },
        gmm: {
            data: [[-6, 4], [-5, 5], [-7, 3], [4, -3], [5, -4], [3, -5], [0, 7], [1, 8], [-1, 6]],
            n_components: 3
        },
        gradient_boosting: {
            data: [[1, 2], [2, 4], [3, 5], [4, 4], [5, 8], [6, 7], [7, 9], [8, 10]],
            n_estimators: 5
        },
        random_forest: {
            data: [[-3, 5, 0], [-2, -3, 0], [1, 4, 1], [3, -1, 1]],
            n_trees: 5
        },
        naive_bayes: {
            data: [[-5, 3, 0], [-4, -2, 0], [4, -1, 1], [5, 2, 1]],
            test_point: { x: 0, y: 1 }
        }
    };
    return defaults[algorithm] || { data: [[1, 2], [2, 4], [3, 6], [4, 8], [5, 10]] };
}

// ═══════════════════════════════════════════════
// STEP EXECUTION
// ═══════════════════════════════════════════════

function executeStepCode(code) {
    if (!code || !engine) return;

    // The backend returns viz.* calls — we map viz to the engine
    try {
        // Replace viz. with this. so the code runs on the engine
        const safeCode = code.replace(/\bviz\./g, 'this.');
        const fn = new Function(safeCode);
        fn.call(engine);
    } catch (err) {
        console.warn('Step execution error:', err, 'Code:', code);
    }
}

function goToStep(index) {
    if (index < 0 || index >= currentSteps.length) return;

    currentStepIndex = index;
    const step = currentSteps[index];

    // Execute viz code
    if (step.code) {
        executeStepCode(step.code);
    }

    // Update step cards UI
    document.querySelectorAll('.step-card').forEach((card, i) => {
        card.classList.toggle('active', i === index);
        if (i < index) card.classList.add('completed');
    });

    // Scroll active step into view
    const activeCard = document.querySelector('.step-card.active');
    if (activeCard) activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Update counter
    stepCounter.textContent = `Step ${index + 1} / ${currentSteps.length}`;
    prevStepBtn.disabled = index === 0;
    nextStepBtn.disabled = index === currentSteps.length - 1;
}

// ═══════════════════════════════════════════════
// STEP UI
// ═══════════════════════════════════════════════

function renderSteps(steps) {
    stepsContainer.innerHTML = '';
    steps.forEach((step, i) => {
        const card = document.createElement('div');
        card.className = 'step-card';
        card.innerHTML = `
            <div class="step-number">Step ${step.step || i + 1}</div>
            <div class="step-text">${step.explanation || ''}</div>
            ${step.code ? `<div class="step-code">${escapeHtml(step.code)}</div>` : ''}
            ${step.python_code ? `<div class="python-code">${escapeHtml(step.python_code)}</div>` : ''}
        `;
        card.addEventListener('click', () => {
            // Reset engine and replay from beginning up to this step
            engine.reset();
            for (let j = 0; j <= i; j++) {
                if (currentSteps[j].code) executeStepCode(currentSteps[j].code);
            }
            currentStepIndex = i;
            document.querySelectorAll('.step-card').forEach((c, idx) => {
                c.classList.toggle('active', idx === i);
                if (idx < i) c.classList.add('completed');
                else c.classList.remove('completed');
            });
            stepCounter.textContent = `Step ${i + 1} / ${currentSteps.length}`;
            prevStepBtn.disabled = i === 0;
            nextStepBtn.disabled = i === currentSteps.length - 1;
        });
        stepsContainer.appendChild(card);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ═══════════════════════════════════════════════
// AUTO PLAY
// ═══════════════════════════════════════════════

function toggleAutoPlay() {
    if (isAutoPlaying) {
        stopAutoPlay();
    } else {
        startAutoPlay();
    }
}

function startAutoPlay() {
    isAutoPlaying = true;
    autoPlayBtn.textContent = '⏸ Stop';
    autoPlayBtn.classList.add('playing');
    advanceAutoPlay();
}

function stopAutoPlay() {
    isAutoPlaying = false;
    autoPlayBtn.textContent = '▶ Auto';
    autoPlayBtn.classList.remove('playing');
    if (autoPlayTimer) {
        clearTimeout(autoPlayTimer);
        autoPlayTimer = null;
    }
}

function advanceAutoPlay() {
    if (!isAutoPlaying) return;
    if (currentStepIndex >= currentSteps.length - 1) {
        stopAutoPlay();
        return;
    }
    goToStep(currentStepIndex + 1);
    autoPlayTimer = setTimeout(advanceAutoPlay, 2500); // 2.5s per step
}

// ═══════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════

function setLoading(isLoading) {
    loader.style.display = isLoading ? 'block' : 'none';
    overlayText.textContent = isLoading ? 'Generating visualization...' : '';
    generateBtn.classList.toggle('loading', isLoading);
    generateBtn.textContent = isLoading ? '⏳' : '▶';
    if (isLoading) {
        canvasOverlay.classList.remove('hidden');
        stepsContainer.innerHTML = '<p class="placeholder-text">Generating steps...</p>';
        stepNav.style.display = 'none';
    }
}

function showError(msg) {
    setLoading(false);
    stepsContainer.innerHTML = `<div class="error-message">⚠️ ${escapeHtml(msg)}</div>`;
}

// ═══════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════

init();
