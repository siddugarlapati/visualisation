import React, { useEffect, useRef, useState } from 'react';
import { Brain, Sparkles, Play, RotateCcw, ChevronRight, ChevronLeft, Pause, Upload, FileSpreadsheet, X } from 'lucide-react';
import * as THREE from 'three';
import gsap from 'gsap';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PMREMGenerator } from 'three';
import { GSAPEngine } from '../engine/gsap_engine';
import { initBackground, updateBackground } from '../engine/background.js';
import CodePanel from '../components/CodePanel';

const setupScene = (canvas) => {
    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: 'high-performance'
    });

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    initBackground(scene);

    const pmremGenerator = new PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.8;

    const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 12, 30);  // Further back and higher up

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);  // Look at origin
    controls.update();

    // Lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(10, 15, 10);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88bbff, 0.6);
    fillLight.position.set(-10, 8, 5);
    scene.add(fillLight);

    const ambientLight = new THREE.AmbientLight(0x334466, 0.4);
    scene.add(ambientLight);

    const uniforms = { uTime: { value: 0 } };

    return { scene, camera, renderer, controls, envRT, pmremGenerator, roomEnv, uniforms };
};

const MLVisualiser = () => {
    const [selectedAlgorithm, setSelectedAlgorithm] = useState(null);
    const [loading, setLoading] = useState(false);
    const [steps, setSteps] = useState([]);
    const [currentStep, setCurrentStep] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showVisualization, setShowVisualization] = useState(false);
    
    // Dataset upload state
    const [uploadedFile, setUploadedFile] = useState(null);
    const [uploadedData, setUploadedData] = useState(null);
    const [uploadError, setUploadError] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [targetColumn, setTargetColumn] = useState('');
    const [uploading, setUploading] = useState(false);
    
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const requestRef = useRef(null);
    const composerRef = useRef(null);

    const algorithms = [
        { id: 'linear_regression', name: 'Linear Regression', icon: '📈', active: true },
        { id: 'multiple_regression', name: 'Multiple Regression', icon: '📐', active: true },
        { id: 'logistic_regression', name: 'Logistic Regression', icon: '📊', active: true },
        { id: 'k_means', name: 'K-Means Clustering', icon: '🎯', active: true },
        { id: 'svm', name: 'Support Vector Machines', icon: '⚡', active: true },
        { id: 'pca', name: 'Principal Component Analysis', icon: '📉', active: true },
        { id: 'decision_tree', name: 'Decision Trees', icon: '🌳', active: true },
        { id: 'random_forest', name: 'Random Forest', icon: '🌲', active: true },
        { id: 'knn', name: 'K-Nearest Neighbors', icon: '🎲', active: true },
        { id: 'naive_bayes', name: 'Naive Bayes', icon: '🔮', active: true },
        { id: 'dbscan', name: 'DBSCAN Clustering', icon: '⭐', active: true },
        { id: 'gmm', name: 'Gaussian Mixture Models', icon: '🌊', active: true },
        { id: 'gradient_boosting', name: 'Gradient Boosting', icon: '🚀', active: true },
        { id: 'neural_network', name: 'Neural Networks', icon: '🧠', active: false },
        { id: 'gradient_descent', name: 'Gradient Descent', icon: '🏔️', active: false }
    ];

    // Scene setup
    useEffect(() => {
        if (!canvasRef.current || !showVisualization) return;

        const { scene, camera, renderer, controls, envRT, pmremGenerator, roomEnv, uniforms } = setupScene(canvasRef.current);

        const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
            samples: 4,
            type: THREE.HalfFloatType,
            format: THREE.RGBAFormat,
        });
        const composer = new EffectComposer(renderer, renderTarget);
        composer.addPass(new RenderPass(scene, camera));
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.6, 0.85);
        composer.addPass(bloomPass);
        composerRef.current = composer;

        engineRef.current = new GSAPEngine(scene, camera, controls);

        const clock = new THREE.Clock();

        const animate = () => {
            requestRef.current = requestAnimationFrame(animate);
            const dt = clock.getDelta();
            uniforms.uTime.value += dt;
            updateBackground(uniforms.uTime.value);
            controls.update();
            if (engineRef.current) engineRef.current.tick();
            composer.render();
        };
        animate();

        const handleResize = () => {
            const w = window.innerWidth, h = window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            composer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (engineRef.current && engineRef.current.dispose) engineRef.current.dispose();
            composer.passes.forEach(pass => { if (pass.dispose) pass.dispose(); });
            composer.dispose();
            renderer.dispose();
            envRT.dispose();
            pmremGenerator.dispose();
            roomEnv.dispose();
            controls.dispose();
        };
    }, [showVisualization]);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    // Dataset upload handlers
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
                setUploadError('Please upload a CSV or JSON file');
                return;
            }
            setUploadedFile(file);
            setUploadError(null);
            setUploadedData(null);
        }
    };

    const handleUploadDataset = async () => {
        if (!uploadedFile) return;
        
        setUploading(true);
        setUploadError(null);
        
        try {
            const formData = new FormData();
            formData.append('file', uploadedFile);
            if (targetColumn) {
                formData.append('target_column', targetColumn);
            }
            
            const res = await fetch(`${API_URL}/upload-dataset`, {
                method: 'POST',
                body: formData
            });
            
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Upload failed');
            }
            
            const data = await res.json();
            setUploadedData(data);
        } catch (e) {
            console.error('Upload error:', e);
            setUploadError(e.message || 'Failed to upload dataset');
        } finally {
            setUploading(false);
        }
    };

    const handleVisualizeDataset = async () => {
        if (!uploadedData) return;
        
        setShowUploadModal(false);
        setSelectedAlgorithm({ 
            id: 'custom_dataset', 
            name: 'Custom Dataset', 
            icon: '📊' 
        });
        setShowVisualization(true);
        setLoading(true);
        setSteps([]);
        setCurrentStep(-1);

        try {
            const res = await fetch(`${API_URL}/ml-generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    algorithm: 'custom_dataset',
                    params: {
                        data: uploadedData.data,
                        algorithm_suggestion: uploadedData.analysis.algorithm_suggestion,
                        is_reduced: uploadedData.analysis.is_reduced,
                        feature_names: uploadedData.analysis.feature_names
                    }
                })
            });
            const data = await res.json();
            
            if (data.steps && Array.isArray(data.steps)) {
                setSteps(data.steps);
                setTimeout(() => handleStepChange(0, data.steps), 500);
            }
        } catch (e) {
            console.error('Visualization error:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleAlgorithmClick = async (algo) => {
        if (!algo.active) return;
        
        setSelectedAlgorithm(algo);
        setShowVisualization(true);
        setLoading(true);
        setSteps([]);
        setCurrentStep(-1);

        try {
            // Algorithm-specific data
            let params = {};
            
            if (algo.id === 'linear_regression') {
                params = {
                    data: [
                        { x: -8, y: -5.2 },
                        { x: -6, y: -3.8 },
                        { x: -4, y: -2.1 },
                        { x: -2, y: -0.5 },
                        { x: -1, y: 0.3 },
                        { x: 1, y: 1.8 },
                        { x: 2, y: 2.5 },
                        { x: 4, y: 4.1 },
                        { x: 6, y: 5.6 },
                        { x: 8, y: 7.2 }
                    ],
                    learning_rate: 0.01,
                    iterations: 10
                };
            } else if (algo.id === 'multiple_regression') {
                params = {
                    data: [
                        { x1: 1, x2: 2, y: 3.5 },
                        { x1: 2, x2: 1, y: 4.2 },
                        { x1: 3, x2: 3, y: 7.1 },
                        { x1: 4, x2: 2, y: 8.0 },
                        { x1: 2, x2: 4, y: 6.8 },
                        { x1: 5, x2: 1, y: 9.3 },
                        { x1: 3, x2: 5, y: 9.0 },
                        { x1: 4, x2: 4, y: 10.2 },
                        { x1: 1, x2: 5, y: 5.5 },
                        { x1: 5, x2: 5, y: 12.5 }
                    ],
                    features: ['x1', 'x2'],
                    target: 'y',
                    learning_rate: 0.01,
                    iterations: 10
                };
            } else if (algo.id === 'k_means') {
                // Clustered data with 3 natural groups
                params = {
                    data: [
                        // Cluster 1 (top-left)
                        { x: -6, y: 5 }, { x: -5, y: 6 }, { x: -7, y: 4 }, { x: -5, y: 5 },
                        // Cluster 2 (bottom-right)
                        { x: 5, y: -5 }, { x: 6, y: -6 }, { x: 4, y: -4 }, { x: 5, y: -4 },
                        // Cluster 3 (center-right)
                        { x: 6, y: 3 }, { x: 7, y: 2 }, { x: 5, y: 4 }, { x: 6, y: 2 }
                    ],
                    k: 3
                };
            } else if (algo.id === 'logistic_regression') {
                // Binary classification data
                params = {
                    data: [
                        // Class 0 (left side)
                        { x: -6, y: 2, label: 0 }, { x: -5, y: -1, label: 0 },
                        { x: -4, y: 1, label: 0 }, { x: -3, y: -2, label: 0 },
                        { x: -5, y: 0, label: 0 },
                        // Class 1 (right side)
                        { x: 4, y: 1, label: 1 }, { x: 5, y: -1, label: 1 },
                        { x: 6, y: 2, label: 1 }, { x: 5, y: 0, label: 1 },
                        { x: 4, y: -2, label: 1 }
                    ]
                };
            } else if (algo.id === 'pca') {
                // Data with variance along diagonal
                params = {
                    data: [
                        { x: 1, y: 1.5 }, { x: 2, y: 2.8 }, { x: 3, y: 3.2 },
                        { x: 4, y: 4.5 }, { x: 5, y: 5.1 }, { x: 2, y: 3.0 },
                        { x: 3, y: 4.0 }, { x: 4, y: 5.2 }, { x: 5, y: 6.0 },
                        { x: 1.5, y: 2.0 }, { x: 2.5, y: 3.5 }, { x: 3.5, y: 4.2 }
                    ]
                };
            } else if (algo.id === 'svm') {
                // Linearly separable with margin
                params = {
                    data: [
                        // Class 0 (left)
                        { x: -5, y: 2, label: 0 }, { x: -4, y: -1, label: 0 },
                        { x: -6, y: 0, label: 0 }, { x: -5, y: -2, label: 0 },
                        { x: -4, y: 1, label: 0 },
                        // Class 1 (right)
                        { x: 4, y: 1, label: 1 }, { x: 5, y: -1, label: 1 },
                        { x: 6, y: 0, label: 1 }, { x: 5, y: 2, label: 1 },
                        { x: 4, y: -2, label: 1 }
                    ]
                };
            } else if (algo.id === 'decision_tree') {
                params = {
                    data: [
                        { x: 2, y: 3, label: 0 }, { x: 3, y: 2, label: 0 },
                        { x: 1, y: 4, label: 0 }, { x: 2, y: 5, label: 0 },
                        { x: 7, y: 2, label: 1 }, { x: 8, y: 3, label: 1 },
                        { x: 6, y: 1, label: 1 }, { x: 7, y: 4, label: 1 },
                        { x: 3, y: 8, label: 2 }, { x: 4, y: 9, label: 2 },
                        { x: 2, y: 7, label: 2 }, { x: 5, y: 8, label: 2 }
                    ],
                    max_depth: 3
                };
            } else if (algo.id === 'random_forest') {
                params = {
                    data: [
                        { x: -5, y: 2, label: 0 }, { x: -4, y: 1, label: 0 },
                        { x: -3, y: 3, label: 0 }, { x: -6, y: 1, label: 0 },
                        { x: 4, y: -2, label: 1 }, { x: 5, y: -1, label: 1 },
                        { x: 3, y: -3, label: 1 }, { x: 6, y: -2, label: 1 },
                        { x: 0, y: 6, label: 2 }, { x: 1, y: 7, label: 2 },
                        { x: -1, y: 5, label: 2 }, { x: 2, y: 6, label: 2 }
                    ],
                    n_trees: 5,
                    max_depth: 3
                };
            } else if (algo.id === 'knn') {
                params = {
                    data: [
                        { x: 1, y: 2, label: 0 }, { x: 2, y: 3, label: 0 },
                        { x: 1.5, y: 2.5, label: 0 }, { x: 0.5, y: 1.5, label: 0 },
                        { x: 7, y: 7, label: 1 }, { x: 8, y: 8, label: 1 },
                        { x: 7.5, y: 7.5, label: 1 }, { x: 8.5, y: 8.5, label: 1 }
                    ],
                    test_point: { x: 5, y: 5 },
                    k: 3
                };
            } else if (algo.id === 'naive_bayes') {
                params = {
                    data: [
                        { x: 1, y: 3, label: 0 }, { x: 2, y: 4, label: 0 },
                        { x: 1.5, y: 3.5, label: 0 }, { x: 2.5, y: 4.5, label: 0 },
                        { x: 6, y: 2, label: 1 }, { x: 7, y: 1, label: 1 },
                        { x: 6.5, y: 1.5, label: 1 }, { x: 7.5, y: 2.5, label: 1 }
                    ],
                    test_point: { x: 4, y: 3 }
                };
            } else if (algo.id === 'dbscan') {
                params = {
                    data: [
                        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1.5, y: 1.5 },
                        { x: 8, y: 8 }, { x: 9, y: 8 }, { x: 8, y: 9 }, { x: 9, y: 9 }, { x: 8.5, y: 8.5 },
                        { x: 5, y: 5 }, { x: -3, y: 7 }
                    ],
                    eps: 2.0,
                    min_samples: 3
                };
            } else if (algo.id === 'gmm') {
                params = {
                    data: [
                        { x: -2, y: 3 }, { x: -1, y: 4 }, { x: -3, y: 2 }, { x: -2, y: 2.5 },
                        { x: 4, y: 5 }, { x: 5, y: 6 }, { x: 3, y: 4 }, { x: 4.5, y: 5.5 },
                        { x: 6, y: -2 }, { x: 7, y: -1 }, { x: 5, y: -3 }, { x: 6.5, y: -2.5 }
                    ],
                    n_components: 3
                };
            } else if (algo.id === 'gradient_boosting') {
                params = {
                    data: [
                        { x: -8, y: -3 }, { x: -6, y: -2 },
                        { x: -4, y: 0 }, { x: -2, y: 2 },
                        { x: 0, y: 3 }, { x: 2, y: 5 },
                        { x: 4, y: 6 }, { x: 6, y: 8 },
                        { x: 8, y: 10 }
                    ],
                    n_estimators: 5,
                    learning_rate: 0.1,
                    max_depth: 2
                };
            }

            const res = await fetch(`${API_URL}/ml-generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    algorithm: algo.id,
                    params
                })
            });
            const data = await res.json();
            
            if (data.steps && Array.isArray(data.steps)) {
                setSteps(data.steps);
                setTimeout(() => handleStepChange(0, data.steps), 500);
            }
        } catch (e) {
            console.error('ML Generate Error:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleStepChange = (index, stepsArr = steps) => {
        if (index < 0 || index >= stepsArr.length) return;
        
        const engine = engineRef.current;
        if (!engine || !engine.scene) {
            console.error('Engine not initialized yet');
            return;
        }

        if (index < currentStep) {
            engine.reset();
            for (let i = 0; i <= index; i++) {
                const s = stepsArr[i];
                try {
                    if (s.code) {
                        const fn = new Function("viz", `"use strict"; ${s.code}`);
                        fn(engine);
                    }
                } catch (err) {
                    console.error("Step execution error:", err);
                }
            }
        } else {
            const s = stepsArr[index];
            try {
                if (s.code) {
                    // Clean the code - remove any trailing incomplete statements
                    let cleanCode = s.code.trim();
                    // Remove trailing semicolons followed by nothing but whitespace
                    cleanCode = cleanCode.replace(/;\s*$/, ';');
                    
                    const fn = new Function("viz", `"use strict"; ${cleanCode}`);
                    fn(engine);
                }
            } catch (err) {
                console.error("Step execution error:", err.message);
                console.error("Problematic code:", s.code);
            }
        }

        setCurrentStep(index);
    };

    // Auto-play effect
    useEffect(() => {
        let interval;
        if (isPlaying && currentStep < steps.length - 1) {
            interval = setInterval(() => handleStepChange(currentStep + 1), 3000);
        } else {
            setIsPlaying(false);
        }
        return () => clearInterval(interval);
    }, [isPlaying, currentStep, steps]);

    const handleBack = () => {
        setShowVisualization(false);
        setSelectedAlgorithm(null);
        setSteps([]);
        setCurrentStep(-1);
        if (engineRef.current) engineRef.current.reset();
    };

    if (showVisualization) {
        return (
            <div className="w-full h-screen bg-[#000510] text-slate-200 font-sans overflow-hidden relative">
                <canvas ref={canvasRef} className="fixed top-0 left-0 block" style={{ width: '100vw', height: '100vh', zIndex: 1 }} />

                {/* Back button */}
                <button
                    onClick={handleBack}
                    className="absolute top-20 left-6 z-20 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                >
                    <ChevronLeft size={16} />
                    Back to Algorithms
                </button>

                {/* Loading overlay */}
                {loading && (
                    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0f172a]/80 backdrop-blur-md">
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 mx-auto border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
                                Generating {selectedAlgorithm?.name} Visualization...
                            </h2>
                        </div>
                    </div>
                )}

                {/* Code Panel - Left Side */}
                {steps.length > 0 && (
                    <CodePanel 
                        code={steps[currentStep]?.python_code || null}
                        stepNumber={currentStep + 1}
                        totalSteps={steps.length}
                        algorithmName={selectedAlgorithm?.name}
                    />
                )}

                {/* Step player */}
                {steps.length > 0 && (
                    <div className="absolute bottom-8 right-8 z-20 w-96 bg-white/6 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-5 border-b border-slate-800">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">
                                    Step {currentStep + 1} / {steps.length}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400">
                                    {Math.round(((currentStep + 1) / steps.length) * 100)}%
                                </span>
                            </div>
                            <div className="w-full h-1 bg-slate-800 rounded-full mb-4 overflow-hidden">
                                <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
                            </div>
                            <p className="text-sm text-slate-200 leading-relaxed font-medium min-h-[4rem]">
                                {steps[currentStep]?.explanation || 'Processing...'}
                            </p>
                        </div>

                        <div className="p-4 flex items-center justify-between">
                            <button onClick={() => handleStepChange(currentStep - 1)} disabled={currentStep <= 0} className="p-2 rounded-lg hover:bg-white/4 disabled:opacity-30 transition-all">
                                <ChevronLeft size={20} className="text-slate-300" />
                            </button>
                            <button onClick={() => setIsPlaying(!isPlaying)} className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold text-xs transition-all shadow-md ${isPlaying ? 'bg-slate-700 text-slate-200' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>
                                {isPlaying ? <><Pause size={14} /> PAUSE</> : <><Play size={14} /> PLAY</>}
                            </button>
                            <button onClick={() => handleStepChange(currentStep + 1)} disabled={currentStep >= steps.length - 1} className="p-2 rounded-lg hover:bg-white/4 disabled:opacity-30 transition-all">
                                <ChevronRight size={20} className="text-slate-300" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-white via-gray-50 to-red-50 flex items-center justify-center relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-[#C41E3A]/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-[#1E3A5F]/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Grid pattern */}
            <div 
                className="absolute inset-0 opacity-[0.02]" 
                style={{
                    backgroundImage: 'linear-gradient(rgba(30,58,95,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(30,58,95,0.1) 1px, transparent 1px)',
                    backgroundSize: '50px 50px'
                }}
            />

            {/* Content */}
            <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
                {/* Icon container */}
                <div className="relative inline-block mb-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl flex items-center justify-center border-2 border-purple-300">
                        <Brain className="text-purple-600" size={48} />
                    </div>
                </div>

                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C41E3A]/10 border border-[#C41E3A]/20 rounded-full mb-6">
                    <Sparkles className="text-[#C41E3A]" size={16} />
                    <span className="text-sm font-medium text-[#C41E3A]">Interactive ML Library</span>
                </div>

                {/* Main text */}
                <h1 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4">
                    ML Visualiser
                </h1>
                
                <p className="text-xl text-gray-700 mb-6">
                    Select an algorithm to visualize
                </p>

                <p className="text-gray-600 leading-relaxed mb-10 max-w-lg mx-auto">
                    Experience machine learning concepts through interactive 3D visualizations. 
                    Watch how models learn and adapt in real-time.
                </p>

                {/* Algorithm Selection Grid */}
                <div className="flex flex-wrap justify-center gap-3 w-full max-w-3xl mx-auto">
                    {algorithms.map((algo) => (
                        <button
                            key={algo.id}
                            className={`
                                group relative px-6 py-4 rounded-2xl border-2 transition-all duration-300
                                flex items-center gap-3
                                ${algo.active 
                                    ? 'bg-white border-[#C41E3A] hover:bg-red-50 shadow-lg shadow-red-500/20 cursor-pointer' 
                                    : 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed'
                                }
                            `}
                            onClick={() => handleAlgorithmClick(algo)}
                            disabled={!algo.active}
                        >
                            <span className="text-xl">{algo.icon}</span>
                            <span className={`font-medium ${algo.active ? 'text-[#1E3A5F]' : 'text-gray-400'}`}>
                                {algo.name}
                            </span>
                            {algo.active && (
                                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                                </span>
                            )}
                            {!algo.active && (
                                <span className="text-xs text-slate-500 ml-1">(Coming Soon)</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Upload Dataset Button */}
                <div className="mt-10 pt-8 border-t border-slate-700/50">
                    <p className="text-slate-400 text-sm mb-4">Or upload your own dataset</p>
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/50 hover:border-emerald-400 rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20"
                    >
                        <Upload className="text-emerald-400" size={24} />
                        <span className="font-semibold text-emerald-300">Upload Dataset</span>
                        <span className="text-xs text-emerald-400/70 ml-2">CSV / JSON</span>
                    </button>
                </div>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-700">
                            <div className="flex items-center gap-3">
                                <FileSpreadsheet className="text-emerald-400" size={24} />
                                <h2 className="text-lg font-bold text-white">Upload Dataset</h2>
                            </div>
                            <button 
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setUploadedFile(null);
                                    setUploadedData(null);
                                    setUploadError(null);
                                }}
                                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X className="text-slate-400" size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-5">
                            {/* File Input */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Select File
                                </label>
                                <input
                                    type="file"
                                    accept=".csv,.json"
                                    onChange={handleFileSelect}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:font-medium file:cursor-pointer hover:file:bg-emerald-500 transition-all"
                                />
                                {uploadedFile && (
                                    <p className="mt-2 text-sm text-emerald-400">
                                        ✓ {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                                    </p>
                                )}
                            </div>

                            {/* Target Column (Optional) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Target Column <span className="text-slate-500">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={targetColumn}
                                    onChange={(e) => setTargetColumn(e.target.value)}
                                    placeholder="e.g., 'label' or 'target'"
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    Specify for supervised learning algorithms
                                </p>
                            </div>

                            {/* Error */}
                            {uploadError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                                    {uploadError}
                                </div>
                            )}

                            {/* Analysis Preview */}
                            {uploadedData && (
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg space-y-2">
                                    <h3 className="font-medium text-emerald-300">Analysis Complete ✓</h3>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="text-slate-400">Original:</div>
                                        <div className="text-slate-200">{uploadedData.analysis.original_shape[0]} rows × {uploadedData.analysis.original_shape[1]} cols</div>
                                        <div className="text-slate-400">Processed:</div>
                                        <div className="text-slate-200">{uploadedData.analysis.processed_shape[0]} points × {uploadedData.analysis.processed_shape[1]}D</div>
                                        <div className="text-slate-400">Suggested:</div>
                                        <div className="text-emerald-300 capitalize">{uploadedData.analysis.algorithm_suggestion.replace('_', ' ')}</div>
                                        {uploadedData.analysis.is_downsampled && (
                                            <>
                                                <div className="text-slate-400">Downsampled:</div>
                                                <div className="text-yellow-400">Yes (for performance)</div>
                                            </>
                                        )}
                                        {uploadedData.analysis.is_reduced && (
                                            <>
                                                <div className="text-slate-400">PCA Applied:</div>
                                                <div className="text-yellow-400">Yes (reduced dimensions)</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex gap-3 p-5 border-t border-slate-700 bg-slate-800/50">
                            {!uploadedData ? (
                                <button
                                    onClick={handleUploadDataset}
                                    disabled={!uploadedFile || uploading}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                                >
                                    {uploading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={18} />
                                            Analyze Dataset
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={handleVisualizeDataset}
                                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <Sparkles size={18} />
                                    Visualize Dataset
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MLVisualiser;
