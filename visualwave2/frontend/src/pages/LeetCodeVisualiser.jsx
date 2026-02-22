import React, { useEffect, useRef, useState } from 'react';
import { Zap, Database, Play, RotateCcw, Code, Search, ChevronRight, ChevronLeft, Pause } from 'lucide-react';
import * as THREE from 'three';
import gsap from 'gsap';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PMREMGenerator } from 'three';
import { GSAPEngine } from '../engine/gsap_engine.js';
import { initBackground, updateBackground } from '../engine/background.js';
import { validateInput, formatInputForDisplay } from '../utils/InputResolver.js';
import { IntentDispatcher } from '../engine/IntentDispatcher.js';
import CodePanel from '../components/CodePanel';
import InputModeSelector from '../components/InputModeSelector';


/*
  LEVEL 6: Fluid Gradient Background
  - Premium Windows 11-style fluid gradient
  - Smooth noise-based animation
  - Subtle grid for depth
*/

const setupScene = (canvas) => {
    // --- RENDERER ---
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
    renderer.toneMappingExposure = 1.0;  // Increased for better visibility

    // --- SCENE ---
    const scene = new THREE.Scene();

    // Initialize Fluid Gradient Background
    initBackground(scene);

    // --- ENV MAP (PBR reflections) ---
    const pmremGenerator = new PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.8;  // Increased for stronger metallic reflections

    // --- CAMERA ---
    const camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 12, 22); // Higher Y and further back for full visibility

    // --- ORBIT CONTROLS ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0); // Look at center for better view

    // --- LIGHTING FOR SHINY CUBES ---
    // Key light (main light from front-right)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(10, 15, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);

    // Fill light (softer light from left)
    const fillLight = new THREE.DirectionalLight(0x88bbff, 0.6);
    fillLight.position.set(-10, 8, 5);
    scene.add(fillLight);

    // Rim light (back light for edge highlights)
    const rimLight = new THREE.DirectionalLight(0xaaccff, 0.8);
    rimLight.position.set(0, 5, -15);
    scene.add(rimLight);

    // Ambient light (subtle overall illumination)
    const ambientLight = new THREE.AmbientLight(0x334466, 0.4);
    scene.add(ambientLight);

    // Point light for extra specular highlights
    const pointLight = new THREE.PointLight(0xffffff, 0.5, 50);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    // Shader Time Uniform (kept for future effects)
    const uniforms = { uTime: { value: 0 } };

    return {
        scene,
        camera,
        renderer,
        controls,
        envRT,
        pmremGenerator,
        roomEnv,
        uniforms
    };
};


/**
 * Infer input type from problem title/description
 * Returns: { type: 'array'|'tree'|'graph'|'linkedlist'|'number'|'string'|'matrix', placeholder: string, hint: string }
 */
/**
 * Parse starter code to determine input arguments
 * Returns array of input definitions: { id: string, label: string, type: 'array'|'tree'|... }
 */
const inferProblemInputs = (problem) => {
    const defaultInput = [{ id: 'input', label: 'Input', type: 'array', placeholder: '[1,2,3]' }];
    
    if (!problem || !problem.starter_code) return defaultInput;

    const code = problem.starter_code;
    const title = problem.title.toLowerCase();
    
    // 1. Try to parse arguments from function definition
    let args = [];
    
    // Python def solve(self, nums: List[int], target: int):
    const pyMatch = code.match(/def\s+\w+\s*\(\s*self\s*,\s*([^)]+)\)/);
    if (pyMatch) {
        args = pyMatch[1].split(',').map(arg => {
            const parts = arg.trim().split(':');
            return parts[0].trim();
        });
    } 
    // JavaScript var solve = function(nums, target) {
    else {
        const jsMatch = code.match(/function\s*\(([^)]+)\)/) || code.match(/var\s+\w+\s*=\s*function\s*\(([^)]+)\)/);
        if (jsMatch) {
            args = jsMatch[1].split(',').map(arg => arg.trim());
        }
    }

    if (args.length === 0) return defaultInput;

    // 2. Infer type for each argument based on name and context
    return args.map(argName => {
        const lowerName = argName.toLowerCase();
        let type = 'array';
        let placeholder = '[1,2,3]';
        
        // Matrices/Grids
        if (lowerName.includes('grid') || lowerName.includes('matrix') || lowerName.includes('board')) {
            type = 'matrix';
            placeholder = '[[1,0],[0,1]]';
        }
        // Trees
        else if (lowerName.includes('root') || lowerName.includes('tree') || title.includes('tree')) {
            type = 'tree';
            placeholder = '[3,9,20,null,null,15,7]';
        }
        // Linked Lists
        else if (lowerName.includes('head') || lowerName.includes('list') || title.includes('linked list')) {
            type = 'linkedlist';
            placeholder = '[1,2,3,4,5]';
        }
        // Graphs
        else if (lowerName.includes('adj') || lowerName.includes('graph') || lowerName.includes('edges')) {
            type = 'graph';
            placeholder = '[[0,1],[1,2]]';
        }
        // Strings
        else if (lowerName === 's' || lowerName === 't' || lowerName === 'p' || lowerName.includes('str')) {
            type = 'string';
            placeholder = '"hello"';
        }
        // Numbers
        else if (lowerName === 'n' || lowerName === 'k' || lowerName === 'target' || lowerName.includes('val')) {
            type = 'number';
            placeholder = '5';
        }
        
        return {
            id: argName,
            label: argName,
            type: type,
            placeholder: placeholder
        };
    });
};

const LeetCodeVisualiser = () => {
    const [showPlayground, setShowPlayground] = useState(false);
    const [problems, setProblems] = useState([]);
    const [filteredProblems, setFilteredProblems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [selectedProblem, setSelectedProblem] = useState(null);
    const [inputValues, setInputValues] = useState({});
    const [inferredInputs, setInferredInputs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [datasetLoading, setDatasetLoading] = useState(true);
    const [steps, setSteps] = useState([]);
    const [currentStep, setCurrentStep] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [code, setCode] = useState('');
    const [inputErrors, setInputErrors] = useState([]);
    const [inputMode, setInputMode] = useState('custom'); // 'custom' or 'auto'
    const [resolvedInputInfo, setResolvedInputInfo] = useState(null);
    const [solutions, setSolutions] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState('python');
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const requestRef = useRef(null);
    const cameraRef = useRef(null);
    const composerRef = useRef(null);
    const driftTweenRef = useRef(null);
    const idleTimeoutRef = useRef(null);
    const userInteractingRef = useRef(false);
    const uniformsRef = useRef({ uTime: { value: 0 } });
    const hasFetchedRef = useRef(false);
    const searchTimeoutRef = useRef(null);

    // Scene setup
    useEffect(() => {
        if (!showPlayground || !canvasRef.current) return;

        const { scene, camera, renderer, controls, envRT, pmremGenerator, roomEnv, uniforms } = setupScene(canvasRef.current);
        cameraRef.current = camera;
        uniformsRef.current = uniforms;

        // composer with transparent render target for LightPillar visibility
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

        // Engine without bgObjects (clean background)
        engineRef.current = new GSAPEngine(scene, camera, controls);

        // Start camera passive drift (very subtle orbital pattern)
        const startCameraDrift = () => {
            if (!cameraRef.current) return;
            if (driftTweenRef.current) driftTweenRef.current.kill();

            // Very subtle orbital motion
            const tl = gsap.timeline({ repeat: -1 });

            tl.to(cameraRef.current.position, {
                x: '+=0.15',
                y: '+=0.05',
                duration: 12,
                ease: 'sine.inOut'
            })
                .to(cameraRef.current.position, {
                    z: '-=0.1',
                    duration: 6,
                    ease: 'sine.inOut'
                }, '<')
                .to(cameraRef.current.position, {
                    x: '-=0.15',
                    y: '-=0.05',
                    duration: 12,
                    ease: 'sine.inOut'
                })
                .to(cameraRef.current.position, {
                    z: '+=0.1',
                    duration: 6,
                    ease: 'sine.inOut'
                }, '<');

            driftTweenRef.current = tl;
        };

        const stopCameraDrift = () => {
            if (driftTweenRef.current) { driftTweenRef.current.kill(); driftTweenRef.current = null; }
        };

        // Mouse parallax effect (extremely subtle)
        const handleMouseMove = (e) => {
            if (userInteractingRef.current || isPlaying) return;

            const x = (e.clientX / window.innerWidth) * 2 - 1;  // -1 to 1
            const y = -(e.clientY / window.innerHeight) * 2 + 1; // -1 to 1

            if (cameraRef.current) {
                // Almost imperceptible movement
                gsap.to(cameraRef.current.position, {
                    x: x * 0.08,
                    y: 8 + (y * 0.05),
                    duration: 3,
                    ease: 'power1.out',
                    overwrite: 'auto'
                });
            }
        };

        // Kick off initial drift (paused until idle)
        idleTimeoutRef.current = setTimeout(() => startCameraDrift(), 1500);

        const clock = new THREE.Clock();

        const animate = () => {
            requestRef.current = requestAnimationFrame(animate);
            const dt = clock.getDelta();

            // Update uniforms.uTime
            uniforms.uTime.value += dt;

            // Update fluid gradient background animation
            updateBackground(uniforms.uTime.value);

            controls.update();
            if (engineRef.current) engineRef.current.tick();
            composer.render();
        };
        animate();

        const handleResize = () => {
            const w = window.innerWidth, h = window.innerHeight;
            camera.aspect = w / h; camera.updateProjectionMatrix();
            renderer.setSize(w, h); composer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);

        // Interaction handlers to pause/restore drift
        const onStart = () => {
            userInteractingRef.current = true; stopCameraDrift();
            if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
        };
        const onEnd = () => {
            userInteractingRef.current = false;
            if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
            idleTimeoutRef.current = setTimeout(() => { if (!isPlaying) startCameraDrift(); }, 3000);
        };
        controls.addEventListener('start', onStart);
        controls.addEventListener('end', onEnd);

        // cleanup
        return () => {
            controls.removeEventListener('start', onStart);
            controls.removeEventListener('end', onEnd);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
            stopCameraDrift();
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            // dispose engine
            if (engineRef.current && engineRef.current.dispose) {
                engineRef.current.dispose();
            }
            // dispose renderer and composer
            composer.passes.forEach(pass => { if (pass.dispose) pass.dispose(); });
            composer.dispose();
            renderer.dispose();
            envRT.dispose(); pmremGenerator.dispose(); roomEnv.dispose();
            controls.dispose();
            scene.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose()); else obj.material.dispose();
                }
            });
        };
    }, [showPlayground]);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    // Data fetch with StrictMode guard
    useEffect(() => {
        if (hasFetchedRef.current) return; // Prevent duplicate fetch in StrictMode
        hasFetchedRef.current = true;

        setDatasetLoading(true);
        fetch(`${API_URL}/problems`)
            .then(r => r.json())
            .then(data => {
                setProblems(data);
                setFilteredProblems(data);
                setDatasetLoading(false);
            })
            .catch(e => {
                console.error('Backend offline:', e);
                setDatasetLoading(false);
            });
    }, []);

    // Search filtering with debounce
    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        searchTimeoutRef.current = setTimeout(() => {
            if (!searchQuery) setFilteredProblems(problems);
            else setFilteredProblems(problems.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase())));
        }, 300); // 300ms debounce

        return () => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        };
    }, [searchQuery, problems]);

    // When selecting a problem, infer inputs and set defaults
    const handleSelect = (p) => {
        setSelectedId(p.id);
        setSelectedProblem(p);
        
        const inputs = inferProblemInputs(p);
        setInferredInputs(inputs);
        
        const defaults = {};
        inputs.forEach(inp => {
            defaults[inp.id] = inp.placeholder;
        });
        setInputValues(defaults);
        setInputErrors([]);
    };

    // Input change handler for specific field
    const handleInputChange = (id, value) => {
        const newValues = { ...inputValues, [id]: value };
        setInputValues(newValues);
        
        // Simple validation (can be enhanced)
        if (value.trim() === '') {
            setInputErrors([`Field '${id}' cannot be empty`]);
        } else {
            setInputErrors([]);
        }
    };

    const handleVisualize = async (isRetry = false) => {
        if (!selectedId || !engineRef.current) return;
        setLoading(true);
        if (!isRetry) setLoadingMessage('Resolving input...');
        
        // Only reset engine on initial run, not necessarily on retry if we want smooth transition,
        // but for safety let's reset to ensure clean state
        engineRef.current.reset();
        setSteps([]); 
        setSolutions(null); // Reset solutions
        setCurrentStep(-1); 
        setIsPlaying(false); 
        setCode('');
        setInputErrors([]);
        
        // Effective input mode: if retrying, force auto
        const effectiveInputMode = isRetry ? 'auto' : inputMode;
        if (isRetry) setInputMode('auto');

        try {
            setLoadingMessage(isRetry ? 'Retrying with Auto-Input...' : 'Generating AI visualization...');
            
            // Use v3 intent-based endpoint for safer, more reliable generation
            const res = await fetch(`${API_URL}/generate-v3`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    problem_id: Number(selectedId),
                    custom_input: effectiveInputMode === 'custom' ? JSON.stringify(inputValues) : null
                })
            });
            
            setLoadingMessage('Processing solution steps...');
            const data = await res.json();
            
            // Check for validation errors from backend
            if (data.input_info) {
                setResolvedInputInfo(data.input_info);
                if (data.input_info.validation_errors?.length > 0) {
                    // IF CUSTOM INPUT FAILED: Retry with Auto
                    if (effectiveInputMode === 'custom' && !isRetry) {
                        console.warn("Custom input failed parsing. Switching to auto.");
                        // Toast or log
                        const errorMsg = data.input_info.validation_errors[0] || "Parsing failed";
                        setInputErrors([`${errorMsg}. Switching to Auto...`]);
                        
                        // Wait a brief moment then retry
                        setTimeout(() => handleVisualize(true), 1500);
                        return;
                    }
                    setInputErrors(data.input_info.validation_errors);
                }
            }
            
            // Handle success
            setLoadingMessage('Rendering visualization...');
            if (data.steps && Array.isArray(data.steps)) {
                setSteps(data.steps);
                if (data.solutions) setSolutions(data.solutions);
                setTimeout(() => handleStepChange(0, data.steps), 500);
            } else if (data.code) {
                setCode(data.code);
                runAnimation(data.code);
            }
        } catch (e) {
            console.error(e);
            setLoadingMessage('Error occurred');
            // Network or other critical error - try auto fallback if we haven't yet
            if (effectiveInputMode === 'custom' && !isRetry) {
                 setTimeout(() => handleVisualize(true), 1000);
                 return;
            }
        } finally {
            // Only stop loading if we are NOT about to retry
            if ((!inputErrors.length || inputMode === 'auto') && !isRetry) { 
               // logic is complex here because of the async retry. 
               // Easier: simply set loading false here, retry will set it true again.
               setLoading(false);
               setLoadingMessage('');
            }
             // If we are retrying, we want to keep loading true, but the recurisve call sets it true anyway.
             // So safe to set false here.
             setLoading(false);
        }
    };

    const handleStepChange = (index, stepsArr = steps) => {
        if (index < 0 || index >= stepsArr.length || !engineRef.current) return;

        const engine = engineRef.current;
        const dispatcher = new IntentDispatcher(engine);

        // REWIND MODE - reset and replay all steps up to index
        if (index < currentStep) {
            engine.reset();
            for (let i = 0; i <= index; i++) {
                const s = stepsArr[i];

                console.group(`🔄 REWIND — Step ${i}`);
                console.log("Explanation:", s.explanation);
                console.log("Intent:", s.intent);
                console.groupEnd();

                try {
                    // NEW: Intent-based execution (v3)
                    if (s.intent && s.intent.action) {
                        dispatcher.execute(s.intent);
                    }
                    // LEGACY: Action array execution (v2)
                    else if (s.actions) {
                        engine.execute(s.actions);
                    }
                    // LEGACY: Code string execution (v1)
                    else if (s.code) {
                        const fn = new Function(
                            "viz",
                            `"use strict"; try { ${s.code} } catch(err) { console.error("Runtime error:", err); throw err; }`
                        );
                        fn(engine);
                    }
                } catch (err) {
                    console.error("❌ FAILED during rewind execution:", err);
                }
            }
        }

        // NORMAL FORWARD MODE - execute single step
        else {
            const s = stepsArr[index];

            console.group(`▶ STEP ${index}`);
            console.log("Explanation:", s.explanation);
            console.log("Intent:", s.intent);
            console.groupEnd();

            try {
                // NEW: Intent-based execution (v3)
                if (s.intent && s.intent.action) {
                    dispatcher.execute(s.intent);
                }
                // LEGACY: Action array execution (v2)
                else if (s.actions) {
                    engine.execute(s.actions);
                }
                // LEGACY: Code string execution (v1)
                else if (s.code) {
                    const fn = new Function(
                        "viz",
                        `"use strict"; try { ${s.code} } catch(err) { console.error("Runtime error:", err); throw err; }`
                    );
                    fn(engine);
                }
            } catch (err) {
                console.error("❌ FAILED TO RUN STEP:", err);
            }
        }

        setCurrentStep(index);
    };


    const runAnimation = (script) => {
        if (!engineRef.current) return;

        const engine = engineRef.current;
        engine.reset();

        console.group("🎬 RUNNING FULL SCRIPT");
        console.log("Raw Code:", script);
        console.groupEnd();

        try {
            const fn = new Function(
                "viz",
                `"use strict";
                try {
                    ${script}
                } catch(err) {
                    console.error("🔥 Runtime error INSIDE full script:", err);
                    throw err;
                }`
            );
            fn(engine);
        } catch (e) {
            console.error("❌ Animation Error:", e);
        }
    };


    useEffect(() => {
        let interval;
        // Pause camera drift while playing
        if (isPlaying) {
            if (driftTweenRef.current) { driftTweenRef.current.kill(); driftTweenRef.current = null; }
        } else {
            if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
            idleTimeoutRef.current = setTimeout(() => { 
                if (!userInteractingRef.current && cameraRef.current) {
                    driftTweenRef.current = gsap.to(cameraRef.current.position, { x: '+=0.2', y: '+=0.1', z: '-=0.15', duration: 6, repeat: -1, yoyo: true, ease: 'sine.inOut' }); 
                }
            }, 1500);
        }

        if (isPlaying && currentStep < steps.length - 1) interval = setInterval(() => handleStepChange(currentStep + 1), 3000);
        else setIsPlaying(false);
        return () => clearInterval(interval);
    }, [isPlaying, currentStep, steps]);

    return (
        <div className="w-full h-screen bg-[#000510] text-slate-200 font-sans overflow-hidden relative">
            {/* Landing Page - shown first */}
            {!showPlayground && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-white via-gray-50 to-orange-50">
                    <div className="text-center max-w-3xl px-8">
                        {/* Hero Icon */}
                        <div className="mb-8 flex justify-center">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-2xl shadow-orange-500/30">
                                    <Code className="w-12 h-12 text-white" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                    <Zap className="w-4 h-4 text-white" />
                                </div>
                            </div>
                        </div>
                        
                        {/* Title */}
                        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-[#C41E3A] via-orange-500 to-[#1E3A5F] bg-clip-text text-transparent">
                            LeetCode Visualizer
                        </h1>
                        
                        {/* Description */}
                        <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                            Transform complex algorithms into stunning 3D visualizations. 
                            Watch data structures come alive as you step through solutions 
                            for arrays, trees, graphs, linked lists, and more.
                        </p>
                        
                        {/* Features */}
                        <div className="grid grid-cols-3 gap-6 mb-10">
                            <div className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm">
                                <Database className="w-8 h-8 text-cyan-600 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">About 2900 Problems</p>
                            </div>
                            <div className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm">
                                <Play className="w-8 h-8 text-green-600 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">Step-by-Step</p>
                            </div>
                            <div className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm">
                                <Zap className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">AI-Powered</p>
                            </div>
                        </div>
                        
                        {/* CTA Button */}
                        <button
                            onClick={() => setShowPlayground(true)}
                            className="group relative px-10 py-4 rounded-xl bg-gradient-to-r from-[#C41E3A] to-orange-600 text-white font-bold text-lg shadow-xl shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-300 hover:scale-105"
                        >
                            <span className="flex items-center gap-3">
                                <Play className="w-6 h-6" />
                                Visualize Problems!
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                        
                        <p className="mt-6 text-sm text-gray-500">
                            Experience algorithms like never before
                        </p>
                    </div>
                </div>
            )}
            
            {/* State HUD - Real-time variable tracker */}
            {showPlayground && currentStep >= 0 && steps[currentStep]?.state && Object.keys(steps[currentStep].state).length > 0 && (
                <div className="fixed bottom-32 left-[450px] z-[20] animate-fadeIn">
                    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl min-w-[200px]">
                        <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                            <Database size={14} className="text-indigo-400" />
                            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Live State</span>
                        </div>
                        <div className="space-y-3">
                            {Object.entries(steps[currentStep].state).map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center gap-6">
                                    <span className="text-xs font-mono text-slate-400">{key}</span>
                                    <span className="text-xs font-mono font-bold text-indigo-200 px-2 py-1 bg-white/5 rounded-md border border-white/5">
                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Playground - shown after clicking button */}
            {showPlayground && (
                <>
                    {/* 3D Canvas - Main Scene (includes LightPillar background mesh) */}
                    <canvas ref={canvasRef} className="fixed top-0 left-0 block" style={{ width: '100vw', height: '100vh', zIndex: 1, position: 'fixed' }} />

            {/* Vignette overlay (CSS) */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-[3]" style={{ background: 'radial-gradient(circle, rgba(0,0,0,0) 60%, rgba(0,5,16,0.6) 100%)' }} />

            {/* Dataset Loading Screen */}
            {datasetLoading && (
                <div className="fixed top-0 left-0 w-full h-full z-50 flex items-center justify-center bg-[#0f172a]/95 backdrop-blur-xl">
                    <div className="text-center space-y-6 animate-fadeIn">
                        <div className="relative">
                            <div className="w-16 h-16 mx-auto border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 w-16 h-16 mx-auto border-4 border-transparent border-t-violet-500 rounded-full animate-spin" style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
                                Loading Dataset
                            </h2>
                            <p className="text-sm text-slate-400 font-medium">
                                Please wait...
                            </p>
                        </div>
                        <div className="flex justify-center gap-1">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Visualization Loading Screen */}
            {loading && (
                <div className="fixed top-0 left-0 w-full h-full z-40 flex items-center justify-center bg-[#0f172a]/80 backdrop-blur-md">
                    <div className="text-center space-y-6 animate-fadeIn">
                        <div className="relative">
                            <div className="w-20 h-20 mx-auto border-4 border-slate-700 border-t-orange-500 rounded-full animate-spin" />
                            <div className="absolute inset-0 w-20 h-20 mx-auto border-4 border-transparent border-t-amber-400 rounded-full animate-spin" style={{ animationDuration: '1.2s', animationDirection: 'reverse' }} />
                            <div className="absolute inset-2 w-16 h-16 mx-auto border-4 border-transparent border-b-orange-300 rounded-full animate-spin" style={{ animationDuration: '2s' }} />
                        </div>
                        <div className="space-y-3">
                            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-400">
                                {loadingMessage || 'Processing...'}
                            </h2>
                            <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto">
                                AI is analyzing the algorithm and generating step-by-step visualization
                            </p>
                        </div>
                        <div className="flex justify-center gap-1.5">
                            <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                            <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                            <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <div className="absolute top-0 left-0 h-full w-96 z-10 bg-white/6 backdrop-blur-xl border-r border-slate-800 flex flex-col shadow-2xl">
                {/* Fixed Header */}
                <div className="p-6 border-b border-slate-700 flex-shrink-0">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/30"><Code className="text-white" size={20} /></div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">VISUALWAVE</h1>
                    </div>
                </div>

                {/* Split Layout Container */}
                <div className="flex flex-col flex-1 min-h-0">
                     {/* Top Section: Code Panel (Visible only when solutions exist) */}
                    {solutions && (
                        <div className="flex-shrink-0 h-[45%] border-b border-slate-700 overflow-hidden flex flex-col">
                            <CodePanel 
                                solutions={solutions}
                                selectedLanguage={selectedLanguage}
                                onLanguageChange={setSelectedLanguage}
                                highlightLines={steps[currentStep]?.line_numbers?.[selectedLanguage] || []}
                            />
                        </div>
                    )}

                    {/* Bottom/Main Section: Problem List - Scrollable */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
                        <div className="p-6 pb-2 sticky top-0 bg-[#0f172a]/95 backdrop-blur-sm z-10">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                                <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                            </div>
                        </div>

                        <div className="px-4 space-y-2 pb-4">
                            {filteredProblems.map(p => (
                                <button key={p.id} onClick={() => handleSelect(p)} className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 group ${selectedId === p.id ? 'bg-indigo-900/40 border-indigo-700' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                                    <div className="flex justify-between items-center">
                                        <span className={`text-sm font-semibold ${selectedId === p.id ? 'text-indigo-200' : 'text-slate-200'}`}>{p.title}</span>
                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{p.difficulty}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                        
                    {/* Input & Action Area - Fixed at bottom of sidebar */}
                    <div className="flex-shrink-0 p-6 border-t border-slate-800 bg-[#0f172a]/95 backdrop-blur-sm">
                            {/* Dynamic Input Section */}
                            {selectedProblem && (
                                <div className="space-y-4">
                                    {/* Input Mode Selector */}
                                    <InputModeSelector 
                                        mode={inputMode}
                                        onChange={setInputMode}
                                        showPresets={false}
                                    />
        
                                    {/* Dynamic Fields */}
                                    {inputMode === 'custom' && inferredInputs.map((input) => (
                                        <div key={input.id} className="space-y-1">
                                            <div className="flex justify-between">
                                                <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{input.label}</label>
                                                <span className="text-[9px] text-slate-500 bg-slate-800 px-1.5 rounded">{input.type}</span>
                                            </div>
                                            <textarea
                                                value={inputValues[input.id] || ''}
                                                onChange={(e) => handleInputChange(input.id, e.target.value)}
                                                className="w-full h-16 bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600 resize-none"
                                                placeholder={input.placeholder}
                                            />
                                        </div>
                                    ))}
        
                                    {inputMode === 'auto' && (
                                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                                            <p className="text-xs text-green-300">🎲 Auto-generation enabled. Valid random inputs will be created.</p>
                                        </div>
                                    )}
        
                                    {/* Validation Errors */}
                                    {inputErrors.length > 0 && (
                                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                                            <ul className="text-[9px] text-red-300 list-disc list-inside">
                                                {inputErrors.map((err, i) => <li key={i}>{err}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {!selectedProblem && (
                                <div className="w-full h-20 bg-transparent border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-500 flex items-center justify-center">
                                    Select a problem to configure inputs
                                </div>
                            )}
                            
                            <div className="mt-4 mb-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <p className="text-[10px] text-amber-200 flex items-center gap-2">
                                    <span>⚠️</span>
                                    <span>Visualization uses LLM tokens. Please use sparingly to avoid rate limits.</span>
                                </p>
                            </div>
                            
                            <button
                                onClick={handleVisualize}
                                disabled={loading || !selectedId}
                                className="w-full py-4 rounded-xl font-bold text-sm bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-500 hover:to-amber-500 transition-all shadow-lg shadow-orange-500/20 flex justify-center items-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? <RotateCcw className="animate-spin" size={16} /> : <Zap size={16} />}
                                {loading ? 'GENERATING...' : 'VISUALIZE'}
                            </button>
                    </div>
                </div>
            </div>

            {/* Step player */}
            {steps.length > 0 && (
                <div className="absolute bottom-8 right-8 z-20 w-96 bg-white/6 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slideIn">
                    <div className="p-5 border-b border-slate-800">
                        <div className="flex justify-between items-center mb-2">
                            {currentStep >= 0 ? <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Step {currentStep + 1} / {steps.length}</span> : <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300">Select a step</span>}
                            <span className="text-[10px] font-mono text-slate-400">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 rounded-full mb-4 overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-500 ease-out" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} /></div>
                        <p className="text-sm text-slate-200 leading-relaxed font-medium transition-all duration-300 min-h-[4rem]">{steps[currentStep]?.explanation || 'Processing...'}</p>
                    </div>

                    <div className="p-4 flex items-center justify-between bg-transparent">
                        <button onClick={() => handleStepChange(currentStep - 1)} disabled={currentStep <= 0} className="p-2 rounded-lg hover:bg-white/4 disabled:opacity-30 transition-all"><ChevronLeft size={20} className="text-slate-300" /></button>
                        <button onClick={() => setIsPlaying(!isPlaying)} className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold text-xs transition-all shadow-md ${isPlaying ? 'bg-slate-700 text-slate-200' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>{isPlaying ? <><Pause size={14} /> PAUSE</> : <><Play size={14} /> PLAY</>}</button>
                        <button onClick={() => handleStepChange(currentStep + 1)} disabled={currentStep >= steps.length - 1} className="p-2 rounded-lg hover:bg-white/4 disabled:opacity-30 transition-all"><ChevronRight size={20} className="text-slate-300" /></button>
                    </div>
                </div>
            )}

                </>
            )}
        </div>
    );
};

export default LeetCodeVisualiser;
