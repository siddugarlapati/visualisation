import React, { useEffect, useRef, useState } from 'react';
import { Database, Cpu, Play, ChevronRight, ChevronLeft, Pause, RotateCcw, Plus, Minus, Search, ArrowRightLeft } from 'lucide-react';
import * as THREE from 'three';
import gsap from 'gsap';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PMREMGenerator } from 'three';
import { GSAPEngine } from '../engine/gsap_engine';
import { getDijkstraPresets, parseDijkstraInput } from '../utils/DijkstraInputValidator';
import { validateAdjacencyList, validateStartNode, getGraphMetrics, getPresetGraphs } from '../utils/GraphInputValidator';
import { initBackground, updateBackground } from '../engine/background.js';

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

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 10, 26);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 3, 0);
    controls.update();

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

const DSAVisualiser = () => {
    const [selectedItem, setSelectedItem] = useState(null);
    const [showPlayground, setShowPlayground] = useState(false);
    const [customInput, setCustomInput] = useState('');
    const [operationValue, setOperationValue] = useState('');
    const [operationIndex, setOperationIndex] = useState('');
    const [logs, setLogs] = useState([]);
    
    // Tower of Hanoi specific state
    const [hanoiSpeed, setHanoiSpeed] = useState(1); // 1x - 5x speed multiplier
    const [hanoiIsPaused, setHanoiIsPaused] = useState(false);
    const [hanoiMoveCount, setHanoiMoveCount] = useState(0);
    const [hanoiTotalMoves, setHanoiTotalMoves] = useState(0);
    const [hanoiRecursionDepth, setHanoiRecursionDepth] = useState(0);
    const [hanoiRecursionStack, setHanoiRecursionStack] = useState([]);
    const [hanoiIsRunning, setHanoiIsRunning] = useState(false);
    
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const requestRef = useRef(null);
    const composerRef = useRef(null);
    
    // Run ID for cancelling async operations (Hanoi)
    const hanoiRunIdRef = useRef(0);
    const hanoiPausedRef = useRef(false); // Mutable ref for pause state
    const hanoiSpeedRef = useRef(1); // Mutable ref for speed (for async access)
    
    // Shared algorithm state (for Bubble Sort, Binary Search, etc.)
    const [algoSpeed, setAlgoSpeed] = useState(1); // 0.5x - 5x
    const [algoIsRunning, setAlgoIsRunning] = useState(false);
    const [algoIsPaused, setAlgoIsPaused] = useState(false);
    const algoRunIdRef = useRef(0);
    const algoPausedRef = useRef(false);
    const algoSpeedRef = useRef(1);
    
    // Bubble Sort specific state
    const [bubbleStats, setBubbleStats] = useState({ comparisons: 0, swaps: 0, passes: 0 });
    
    // Merge Sort specific state
    const [msSpeed, setMsSpeed] = useState(1);
    const msSpeedRef = useRef(1);
    const [msIsRunning, setMsIsRunning] = useState(false);
    const [msIsPaused, setMsIsPaused] = useState(false);
    const msPausedRef = useRef(false);
    const msRunIdRef = useRef(0);
    const [msRecursionDepth, setMsRecursionDepth] = useState(0);
    const [msMaxDepth, setMsMaxDepth] = useState(0);
    const [msStats, setMsStats] = useState({ comparisons: 0, merges: 0, arrayAccesses: 0 });
    
    // Binary Search specific state
    const [bsStats, setBsStats] = useState({ iterations: 0, found: null, targetIndex: -1 });
    
    // DFS specific state
    const [dfsAdjList, setDfsAdjList] = useState('');
    const [dfsStartNode, setDfsStartNode] = useState('A');
    const [dfsInputMode, setDfsInputMode] = useState('preset'); // preset | manual
    const [dfsSelectedPreset, setDfsSelectedPreset] = useState('simple-tree');
    const [dfsValidationError, setDfsValidationError] = useState(null);
    const [dfsValidationWarnings, setDfsValidationWarnings] = useState([]);
    const [dfsGraphMetrics, setDfsGraphMetrics] = useState(null);
    const [dfsIsRunning, setDfsIsRunning] = useState(false);
    const [dfsIsPaused, setDfsIsPaused] = useState(false);
    const dfsPausedRef = useRef(false);
    const dfsRunIdRef = useRef(0);
    const dfsSpeedRef = useRef(1);
    const [dfsSpeed, setDfsSpeed] = useState(1);
    const [dfsStats, setDfsStats] = useState({ visited: 0, pathLength: 0, stackSize: 0 });
    
    // BFS specific state
    const [bfsAdjList, setBfsAdjList] = useState('');
    const [bfsStartNode, setBfsStartNode] = useState('A');
    const [bfsInputMode, setBfsInputMode] = useState('preset'); // preset | manual
    const [bfsSelectedPreset, setBfsSelectedPreset] = useState('simple-tree');
    const [bfsValidationError, setBfsValidationError] = useState(null);
    const [bfsValidationWarnings, setBfsValidationWarnings] = useState([]);
    const [bfsGraphMetrics, setBfsGraphMetrics] = useState(null);
    const [bfsIsRunning, setBfsIsRunning] = useState(false);
    const [bfsIsPaused, setBfsIsPaused] = useState(false);
    const bfsPausedRef = useRef(false);
    const bfsRunIdRef = useRef(0);
    const bfsSpeedRef = useRef(1);
    const [bfsSpeed, setBfsSpeed] = useState(1);
    const [bfsStats, setBfsStats] = useState({ visited: 0, queueSize: 0, levels: 0 });
    
    // Dijkstra specific state
    const [dijkstraSpeed, setDijkstraSpeed] = useState(1); // 0.5x - 5x
    const [dijkstraIsRunning, setDijkstraIsRunning] = useState(false);
    const [dijkstraIsPaused, setDijkstraIsPaused] = useState(false);
    const dijkstraPausedRef = useRef(false);
    const dijkstraRunIdRef = useRef(0);
    const dijkstraSpeedRef = useRef(1);
    const [dijkstraStats, setDijkstraStats] = useState({ visited: 0, relaxed: 0, queueSize: 0 });
    const [dijkstraInputMode, setDijkstraInputMode] = useState('preset'); // preset | manual
    const [dijkstraSelectedPreset, setDijkstraSelectedPreset] = useState('simple-path');
    const [dijkstraNodesInput, setDijkstraNodesInput] = useState('A, B, C, D, E');
    const [dijkstraEdgesInput, setDijkstraEdgesInput] = useState('[["A","B",4], ["A","C",2], ["B","D",3], ["C","B",1], ["C","D",5], ["D","E",3]]');
    const [dijkstraStartNode, setDijkstraStartNode] = useState('A');
    const [dijkstraValidationError, setDijkstraValidationError] = useState(null);
    const [dijkstraValidationWarnings, setDijkstraValidationWarnings] = useState([]);
    const [dijkstraFinalPaths, setDijkstraFinalPaths] = useState(null); // Stores final shortest paths result
    
    // BST structure for proper insertion
    const bstRef = useRef({ root: null });

    // Data Structures
    const dataStructures = [
        { id: 'array', name: 'Array', icon: '📊', description: 'Linear collection with index access' },
        { id: 'stack', name: 'Stack', icon: '📚', description: 'LIFO - Last In First Out' },
        { id: 'queue', name: 'Queue', icon: '🚶', description: 'FIFO - First In First Out' },
        { id: 'linkedlist', name: 'Linked List', icon: '🔗', description: 'Chain of connected nodes' },
        { id: 'tree', name: 'Binary Tree', icon: '🌳', description: 'Hierarchical node structure' },
        { id: 'bst', name: 'BST', icon: '🔍', description: 'Binary Search Tree' },
        { id: 'heap', name: 'Heap', icon: '🏔️', description: 'Priority-based tree' },
        { id: 'hashmap', name: 'HashMap', icon: '🗂️', description: 'Key-value pairs' },
        { id: 'graph', name: 'Graph', icon: '🕸️', description: 'Nodes connected by edges' },
    ];

    // Algorithms
    const algorithms = [
        { id: 'dijkstra', name: "Dijkstra's Algorithm", icon: '🛤️', description: 'Shortest path finder' },
        { id: 'dfs', name: 'Depth-First Search', icon: '🔽', description: 'Explore deep before wide' },
        { id: 'bfs', name: 'Breadth-First Search', icon: '➡️', description: 'Explore level by level' },
        { id: 'tower_of_hanoi', name: 'Tower of Hanoi', icon: '🗼', description: 'Classic recursion puzzle' },
        { id: 'bubble_sort', name: 'Bubble Sort', icon: '🫧', description: 'Simple comparison sort' },
        { id: 'quick_sort', name: 'Quick Sort', icon: '⚡', description: 'Divide and conquer sort' },
        { id: 'merge_sort', name: 'Merge Sort', icon: '🔀', description: 'Stable divide and conquer' },
        { id: 'binary_search', name: 'Binary Search', icon: '🎯', description: 'Efficient sorted search' },
    ];

    // Operations for each data structure and algorithm
    const getOperations = (itemId) => {
        const ops = {
            // Data Structures
            array: ['Create', 'Insert', 'Delete', 'Update', 'Swap', 'Highlight'],
            stack: ['Create', 'Push', 'Pop', 'Peek'],
            queue: ['Create', 'Enqueue', 'Dequeue', 'Peek'],
            linkedlist: ['Create', 'Insert', 'Delete', 'Traverse'],
            tree: ['Create', 'Insert', 'Search', 'Delete'],
            bst: ['Create', 'Insert', 'Search', 'Delete'],
            heap: ['Create', 'Insert', 'Extract', 'Heapify'],
            hashmap: ['Create', 'Set', 'Get', 'Delete'],
            graph: ['Create', 'Add Node', 'Connect', 'Highlight'],
            // Algorithms
            dijkstra: dijkstraIsRunning
                ? (dijkstraIsPaused ? ['Resume', 'Reset'] : ['Pause', 'Reset'])
                : ['Run', 'Reset'],
            dfs: ['Run', 'Reset'],
            bfs: ['Run', 'Pause', 'Resume', 'Reset'],
            tower_of_hanoi: ['Run', 'Pause', 'Resume', 'Reset'],
            bubble_sort: ['Run', 'Pause', 'Resume', 'Reset'],
            quick_sort: ['Run', 'Reset'],
            merge_sort: msIsRunning 
                ? (msIsPaused ? ['Resume', 'Reset'] : ['Pause', 'Reset'])
                : ['Run', 'Reset'],
            binary_search: ['Run', 'Pause', 'Resume', 'Reset'],
        };
        return ops[itemId] || ['Run'];
    };

    // Default inputs for each item
    const getDefaultInput = (itemId) => {
        const defaults = {
            // Data Structures
            array: '1, 2, 3, 4, 5',
            stack: '1, 2, 3, 4, 5',
            queue: '1, 2, 3, 4, 5',
            linkedlist: '1, 2, 3, 4, 5',
            tree: '50, 25, 75, 10, 30',
            bst: '50, 25, 75, 10, 30, 60, 90',
            heap: '10, 20, 5, 30, 15',
            hashmap: 'a, b, c',
            graph: 'A, B, C, D, E',
            // Algorithms (arrays to sort/search)
            dijkstra: 'A, B, C, D, E',
            dfs: '', // Uses preset by default
            bfs: '', // Uses preset by default
            tower_of_hanoi: '3',
            bubble_sort: '64, 34, 25, 12, 22, 11, 90',
            quick_sort: '64, 34, 25, 12, 22, 11, 90',
            merge_sort: '38, 27, 43, 3, 9, 82, 10',
            binary_search: '1, 3, 5, 7, 9, 11, 13, 15',
        };
        return defaults[itemId] || '1, 2, 3, 4, 5';
    };

    // Scene setup
    useEffect(() => {
        if (!canvasRef.current || !showPlayground) return;

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
    }, [showPlayground]);

    // BST Configuration
    const BST_CONFIG = {
        baseOffsetX: 6,      // Horizontal spread at root level
        verticalGap: 2.5,    // Vertical distance between levels
        depthDecay: 0.6,     // How much spread decreases per level
        rootY: 8,            // Root Y position (high so tree grows down)
    };

    // BST Helper Functions - uses engine's bstCreateRoot/bstCreateChild
    const insertIntoBST = (value, engine, animate = true) => {
        const bst = bstRef.current;
        if (!bst.root) return;
        
        let nodeCounter = Object.keys(engine._bstNodes || {}).length + 1;
        
        const insert = (node, depth = 0) => {
            // Animate comparison if animation enabled
            if (animate && engine.objects[node.id]) {
                engine.highlight(node.id, 0xffff00); // Yellow for comparison
                engine.pulse(node.id);
            }
            
            if (value < node.value) {
                if (animate) addLog(`🔍 ${value} < ${node.value}, going LEFT`);
                // Go left
                if (node.left === null) {
                    const newId = `bst_${nodeCounter++}`;
                    node.left = { value, id: newId, left: null, right: null };
                    
                    // Calculate position manually for better layout
                    const parentPos = engine.objects[node.id]?.group?.position;
                    if (parentPos) {
                        const offset = BST_CONFIG.baseOffsetX * Math.pow(BST_CONFIG.depthDecay, depth + 1);
                        const newX = parentPos.x - offset; // LEFT child goes LEFT (negative X)
                        const newY = parentPos.y - BST_CONFIG.verticalGap; // Children go DOWN (lower Y)
                        
                        engine.createSphereNode(newId, value, { x: newX, y: newY + 3, z: 0 });
                        engine._bstNodes[newId] = { depth: depth + 1, x: newX, y: newY };
                        engine.move(newId, { x: newX, y: newY, z: 0 }, 0.5);
                        engine.connect(node.id, newId);
                        engine.highlight(newId, 0x00ff00);
                        engine.pulse(newId);
                    }
                    if (animate) addLog(`✅ Inserted ${value} as LEFT child of ${node.value}`);
                } else {
                    insert(node.left, depth + 1);
                }
            } else if (value > node.value) {
                if (animate) addLog(`🔍 ${value} > ${node.value}, going RIGHT`);
                // Go right
                if (node.right === null) {
                    const newId = `bst_${nodeCounter++}`;
                    node.right = { value, id: newId, left: null, right: null };
                    
                    // Calculate position manually for better layout
                    const parentPos = engine.objects[node.id]?.group?.position;
                    if (parentPos) {
                        const offset = BST_CONFIG.baseOffsetX * Math.pow(BST_CONFIG.depthDecay, depth + 1);
                        const newX = parentPos.x + offset; // RIGHT child goes RIGHT (positive X)
                        const newY = parentPos.y - BST_CONFIG.verticalGap; // Children go DOWN (lower Y)
                        
                        engine.createSphereNode(newId, value, { x: newX, y: newY + 3, z: 0 });
                        engine._bstNodes[newId] = { depth: depth + 1, x: newX, y: newY };
                        engine.move(newId, { x: newX, y: newY, z: 0 }, 0.5);
                        engine.connect(node.id, newId);
                        engine.highlight(newId, 0x00ff00);
                        engine.pulse(newId);
                    }
                    if (animate) addLog(`✅ Inserted ${value} as RIGHT child of ${node.value}`);
                } else {
                    insert(node.right, depth + 1);
                }
            } else {
                addLog(`⚠️ Value ${value} already exists in BST`);
            }
        };
        
        insert(bst.root, 0);
    };
    
    const searchBST = (value, engine, animate = true) => {
        const bst = bstRef.current;
        if (!bst.root) return null;
        
        const search = (node) => {
            if (!node) return null;
            
            // Animate traversal
            if (animate && engine.objects[node.id]) {
                engine.highlight(node.id, 0xffff00);
                engine.pulse(node.id);
            }
            
            if (value === node.value) {
                if (animate) addLog(`🎯 Found ${value}!`);
                return node;
            }
            if (value < node.value) {
                if (animate) addLog(`🔍 ${value} < ${node.value}, searching LEFT`);
                return search(node.left);
            }
            if (animate) addLog(`🔍 ${value} > ${node.value}, searching RIGHT`);
            return search(node.right);
        };
        
        return search(bst.root);
    };

    const addLog = (message) => {
        setLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    // Helper for animation delays
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const executeOperation = (operation) => {
        const engine = engineRef.current;
        if (!engine) {
            addLog('❌ Engine not initialized');
            return;
        }

        try {
            const itemId = selectedItem.id;
            const skipJsonParse = ['dijkstra', 'dfs', 'bfs', 'graph'].includes(itemId);
            const inputArr = (!skipJsonParse && customInput) ? JSON.parse(`[${customInput}]`) : [1, 2, 3, 4, 5];
            const val = operationValue ? parseInt(operationValue) : 0;
            const idx = operationIndex ? parseInt(operationIndex) : 0;

            switch (itemId) {
                case 'array':
                    if (operation === 'Create') {
                        engine.reset();
                        engine.createArrayAPI('arr', inputArr, -4, 0);
                        addLog(`✅ Created array: [${inputArr.join(', ')}]`);
                    } else if (operation === 'Insert') {
                        // Auto-create if not exists
                        if (!engine.arrays?.arr) {
                            engine.createArrayAPI('arr', [], -4, 0);
                            addLog(`📦 Auto-created empty array`);
                        }
                        engine.arrayInsert('arr', idx, val);
                        addLog(`✅ Inserted ${val} at index ${idx}`);
                    } else if (operation === 'Delete') {
                        engine.arrayDelete('arr', idx);
                        addLog(`✅ Deleted element at index ${idx}`);
                    } else if (operation === 'Update') {
                        engine.arrayUpdate('arr', idx, val);
                        addLog(`✅ Updated index ${idx} to ${val}`);
                    } else if (operation === 'Swap') {
                        engine.arraySwap('arr', idx, val);
                        addLog(`✅ Swapped indices ${idx} and ${val}`);
                    } else if (operation === 'Highlight') {
                        engine.arrayHighlight('arr', idx, 0x00ff00);
                        addLog(`✅ Highlighted index ${idx}`);
                    }
                    break;

                case 'stack':
                    if (operation === 'Create') {
                        engine.reset();
                        engine.createStack('stack', 0, 0);
                        // Push initial values
                        inputArr.forEach((v, i) => {
                            engine.stackPush('stack', `s_${i}`, v);
                        });
                        addLog(`✅ Created stack with ${inputArr.length} items`);
                    } else if (operation === 'Push') {
                        // Auto-create stack if not exists
                        if (!engine.objects?.stack) {
                            engine.createStack('stack', 0, 0);
                            addLog(`📦 Auto-created empty stack`);
                        }
                        const itemId = `s_${Date.now()}`;
                        engine.stackPush('stack', itemId, val);
                        addLog(`✅ Pushed ${val} onto stack`);
                    } else if (operation === 'Pop') {
                        if (!engine.objects?.stack || !engine.objects.stack.items?.length) {
                            engine.stackUnderflow?.('stack');
                            addLog(`⚠️ Stack underflow! Stack is empty.`);
                        } else {
                            engine.stackPop('stack');
                            addLog(`✅ Popped from stack`);
                        }
                    } else if (operation === 'Peek') {
                        if (!engine.objects?.stack || !engine.objects.stack.items?.length) {
                            addLog(`⚠️ Stack is empty!`);
                        } else {
                            engine.stackPeek('stack');
                            addLog(`✅ Peeked at top of stack`);
                        }
                    }
                    break;

                case 'queue':
                    if (operation === 'Create') {
                        engine.reset();
                        engine.createQueue('queue', 0, 0);
                        // Enqueue initial values
                        inputArr.forEach((v, i) => {
                            // false = don't focus camera on every item
                            engine.queueEnqueue('queue', `q_${i}`, v, false);
                        });
                        addLog(`✅ Created queue with ${inputArr.length} items`);
                        // Focus on the whole queue at the end
                        engine.focusCamera('queue');
                    } else if (operation === 'Enqueue') {
                        // Auto-create queue if not exists
                        if (!engine.objects?.queue) {
                            engine.createQueue('queue', 0, 0);
                            addLog(`📦 Auto-created empty queue`);
                        }
                        const itemId = `q_${Date.now()}`;
                        engine.queueEnqueue('queue', itemId, val);
                        addLog(`✅ Enqueued ${val}`);
                    } else if (operation === 'Dequeue') {
                        if (!engine.objects?.queue || !engine.objects.queue.items?.length) {
                            engine.queueUnderflow?.('queue');
                            addLog(`⚠️ Queue underflow! Queue is empty.`);
                        } else {
                            engine.queueDequeue('queue');
                            addLog(`✅ Dequeued from queue`);
                        }
                    } else if (operation === 'Peek') {
                        if (!engine.objects?.queue || !engine.objects.queue.items?.length) {
                            addLog(`⚠️ Queue is empty!`);
                        } else {
                            engine.queuePeek('queue');
                            addLog(`✅ Peeked at front of queue`);
                        }
                    }
                    break;

                case 'linkedlist':
                    if (operation === 'Create') {
                        engine.reset();
                        inputArr.forEach((v, i) => {
                            engine.createListNode(`node${i}`, v, -6 + i * 2.5, 0);
                            if (i > 0) engine.listNext(`node${i-1}`, `node${i}`);
                        });
                        // Create head pointer
                        engine.createListPointer('head', 'HEAD', -6, 1.8);
                        addLog(`✅ Created linked list with ${inputArr.length} nodes`);
                    } else if (operation === 'Insert') {
                        // First traverse with temp pointer to find position
                        if (!engine.objects['temp']) {
                            engine.createListPointer('temp', 'temp', -6, -1.5);
                        }
                        addLog(`🔍 Traversing to index ${idx}...`);
                        // Traverse step by step
                        for (let i = 0; i <= idx && i < 10; i++) {
                            if (engine.objects[`node${i}`]) {
                                engine.listMovePointer('temp', `node${i}`);
                                engine.listHighlight(`node${i}`, 0xffff00);
                                if (i === idx) {
                                    addLog(`📍 Found position at index ${i}`);
                                }
                            }
                        }
                        
                        // Shift all existing nodes from idx onwards to the right
                        const spacing = 2.5;
                        for (let i = 9; i >= idx; i--) {
                            if (engine.objects[`node${i}`]) {
                                const newX = -6 + (i + 1) * spacing;
                                engine.move(`node${i}`, { x: newX, y: 0, z: 0 }, 0.5);
                            }
                        }
                        addLog(`↔️ Shifted nodes to make room`);
                        
                        // Create the new node at the insertion position
                        const newId = `node_inserted_${idx}`;
                        const insertX = -6 + idx * spacing;
                        engine.createListNode(newId, val, insertX, 2);
                        
                        // Animate it sliding down into position
                        engine.move(newId, { x: insertX, y: 0, z: 0 }, 0.6);
                        engine.listHighlight(newId, 0x00ff00);
                        
                        // Connect to previous node if exists
                        if (idx > 0) {
                            const prevNode = engine.objects[`node${idx-1}`] ? `node${idx-1}` : null;
                            if (prevNode) {
                                engine.listNext(prevNode, newId);
                            }
                        }
                        
                        // Connect to next node
                        if (engine.objects[`node${idx}`]) {
                            engine.listNext(newId, `node${idx}`);
                        }
                        
                        addLog(`✅ Inserted node with value ${val} at index ${idx}`);
                    } else if (operation === 'Delete') {
                        // First traverse with temp pointer to find position
                        if (!engine.objects['temp']) {
                            engine.createListPointer('temp', 'temp', -6, -1.5);
                        }
                        addLog(`🔍 Traversing to index ${idx}...`);
                        // Traverse step by step
                        for (let i = 0; i <= idx && i < 10; i++) {
                            if (engine.objects[`node${i}`]) {
                                engine.listMovePointer('temp', `node${i}`);
                                engine.listHighlight(`node${i}`, i === idx ? 0xff0000 : 0xffff00);
                                if (i === idx) {
                                    addLog(`📍 Found node to delete at index ${i}`);
                                }
                            }
                        }
                        // Now delete the node
                        if (engine.objects[`node${idx}`]) {
                            engine.listDelete(`node${idx}`);
                            addLog(`✅ Deleted node at index ${idx}`);
                        } else {
                            addLog(`⚠️ Node at index ${idx} not found`);
                        }
                    } else if (operation === 'Traverse') {
                        // Create temp pointer if not exists
                        if (!engine.objects['temp']) {
                            engine.createListPointer('temp', 'temp', -6, -1.5);
                        }
                        addLog(`🔍 Starting traversal from head...`);
                        // Traverse all nodes
                        for (let i = 0; i < 10; i++) {
                            if (engine.objects[`node${i}`]) {
                                engine.listMovePointer('temp', `node${i}`);
                                engine.listHighlight(`node${i}`, 0x00ff00);
                                addLog(`  → Visited node${i}`);
                            }
                        }
                        addLog(`✅ Traversal complete`);
                    }
                    break;

                case 'tree':
                case 'bst':
                    if (operation === 'Create') {
                        engine.reset();
                        engine._bstNodes = {}; // Reset BST nodes tracking
                        bstRef.current = { root: null };
                        
                        if (inputArr[0] !== undefined) {
                            const rootVal = inputArr[0];
                            bstRef.current.root = { value: rootVal, id: 'root', left: null, right: null };
                            
                            // Create root at configured position
                            engine.createSphereNode('root', rootVal, { x: 0, y: BST_CONFIG.rootY, z: 0 });
                            engine._bstNodes['root'] = { depth: 0, x: 0, y: BST_CONFIG.rootY };
                            engine.highlight('root', 0x00ff00);
                            engine.pulse('root');
                            addLog(`✅ Created BST with root ${rootVal}`);
                            
                            // Insert remaining values with animation
                            for (let i = 1; i < inputArr.length; i++) {
                                insertIntoBST(inputArr[i], engine, true);
                            }
                        }
                    } else if (operation === 'Insert') {
                        if (!bstRef.current.root) {
                            // No root - create it
                            engine._bstNodes = {};
                            bstRef.current.root = { value: val, id: 'root', left: null, right: null };
                            engine.createSphereNode('root', val, { x: 0, y: BST_CONFIG.rootY, z: 0 });
                            engine._bstNodes['root'] = { depth: 0, x: 0, y: BST_CONFIG.rootY };
                            engine.highlight('root', 0x00ff00);
                            engine.pulse('root');
                            addLog(`✅ Created BST with root ${val}`);
                        } else {
                            insertIntoBST(val, engine, true);
                        }
                    } else if (operation === 'Search') {
                        if (!bstRef.current.root) {
                            addLog(`⚠️ BST is empty! Create first.`);
                        } else {
                            addLog(`🔍 Searching for ${val}...`);
                            const found = searchBST(val, engine, true);
                            if (found) {
                                engine.highlight(found.id, 0x00ff00);
                                engine.confetti?.(engine.objects[found.id]?.group?.position, "green");
                                addLog(`✅ Found ${val}!`);
                            } else {
                                addLog(`❌ Value ${val} not found in BST`);
                            }
                        }
                    } else if (operation === 'Delete') {
                        addLog(`⚠️ BST delete not yet implemented`);
                    }
                    break;

                case 'heap':
                    if (operation === 'Create') {
                        engine.reset();
                        engine.heapInit('heap', inputArr, 0, 2);
                        addLog(`✅ Created heap: [${inputArr.join(', ')}]`);
                    } else if (operation === 'Insert') {
                        if (!engine._heaps?.heap) {
                            engine.heapInit('heap', [], 0, 2);
                            addLog(`📦 Auto-created empty heap`);
                        }
                        engine.heapInsert('heap', val);
                        addLog(`✅ Inserted ${val} into heap (bubbled up)`);
                    } else if (operation === 'Extract') {
                        addLog(`⚠️ Heap extract not yet implemented`);
                    } else if (operation === 'Heapify') {
                        engine.heapHeapified?.('heap', 0);
                        addLog(`✅ Heapify called on root`);
                    }
                    break;

                case 'hashmap':
                    if (operation === 'Create') {
                        engine.reset();
                        engine.createArrayAPI('keys', ['a', 'b', 'c'], -6, 1);
                        engine.createArrayAPI('vals', [1, 2, 3], -6, -1);
                        addLog(`✅ Created hashmap visualization`);
                    } else if (operation === 'Set') {
                        engine.arrayInsert('keys', 0, operationValue || 'key');
                        engine.arrayInsert('vals', 0, val);
                        addLog(`✅ Set key=${operationValue}, value=${val}`);
                    } else if (operation === 'Get') {
                        engine.arrayHighlight('keys', idx, 0x00ff00);
                        engine.arrayHighlight('vals', idx, 0x00ff00);
                        addLog(`✅ Get at index ${idx}`);
                    } else if (operation === 'Delete') {
                        engine.arrayDelete('keys', idx);
                        engine.arrayDelete('vals', idx);
                        addLog(`✅ Deleted entry at index ${idx}`);
                    }
                    break;

                case 'graph':
                    if (operation === 'Create') {
                        engine.reset();
                        engine.graphResetLayout?.();
                        // Create nodes from custom input
                        const rawLabels = customInput 
                            ? customInput.split(',').map(s => s.trim()).filter(s => s)
                            : ['A', 'B', 'C', 'D', 'E'];
                        
                        // Deduplicate labels
                        const labels = [...new Set(rawLabels)];
                            
                        labels.forEach((label) => {
                            // Use Label as ID for easier connection
                            engine.graphCreateNode(label, label);
                        });
                        
                        // Default connections if using default input
                        if ((!customInput || customInput === 'A, B, C, D, E') && labels.includes('A')) {
                            const edges = [['A','B'], ['B','C'], ['C','D'], ['D','E'], ['E','A'], ['A','C']];
                            edges.forEach(([u, v]) => {
                                if (labels.includes(u) && labels.includes(v)) {
                                    engine.graphConnect(u, v, true);
                                }
                            });
                        }
                        addLog(`✅ Created graph with ${labels.length} nodes`);
                    } else if (operation === 'Add Node') {
                        // Use Node 1 input as label, or Node 2, or auto-generate
                        let label = operationIndex || operationValue;
                        if (!label) {
                             label = `Node_${Date.now().toString().slice(-4)}`;
                        }
                        // Check if exists? GSAPEngine determines if it overwrites or errors, usually fine.
                        engine.graphCreateNode(label, label);
                        addLog(`✅ Added node ${label}`);
                    } else if (operation === 'Connect') {
                        // operationIndex = Node 1, operationValue = Node 2
                        const u = operationIndex;
                        const v = operationValue;
                        if (!u || !v) {
                             addLog(`⚠️ Please specify both Node 1 and Node 2`);
                        } else {
                            engine.graphConnect(u, v, true);
                            addLog(`✅ Connected ${u} to ${v}`);
                        }
                    } else if (operation === 'Highlight') {
                        const target = operationIndex || operationValue || 'A';
                        engine.graphHighlight(target, 0x00ff00);
                        addLog(`✅ Highlighted ${target}`);
                    }
                    break;

                // ==================== ALGORITHMS ====================

                case 'bubble_sort':
                    if (operation === 'Run') {
                        // Block if already running
                        if (algoIsRunning) {
                            addLog(`⚠️ Algorithm already running. Wait or Reset first.`);
                            break;
                        }
                        
                        engine.reset();
                        const arr = [...inputArr];
                        
                        // === INPUT VALIDATION ===
                        if (arr.length < 2) {
                            addLog(`❌ Error: Array must have at least 2 elements`);
                            break;
                        }
                        if (arr.length > 12) {
                            addLog(`⚠️ Warning: Array truncated to 12 elements (was ${arr.length})`);
                            arr.length = 12;
                        }
                        
                        // Check if already sorted
                        const isSorted = arr.every((v, i, a) => i === 0 || a[i-1] <= v);
                        if (isSorted) {
                            addLog(`💡 Note: Array appears to be already sorted!`);
                        }
                        
                        // === INITIALIZE STATE ===
                        algoRunIdRef.current += 1;
                        const currentRunId = algoRunIdRef.current;
                        setAlgoIsRunning(true);
                        setAlgoIsPaused(false);
                        algoPausedRef.current = false;
                        algoSpeedRef.current = algoSpeed;
                        setBubbleStats({ comparisons: 0, swaps: 0, passes: 0 });
                        
                        // Center the array based on length
                        const centerX = -(arr.length * 1.5) / 2;
                        engine.createArrayAPI('sort_arr', arr, centerX, 2);
                        
                        const n = arr.length;
                        addLog(`🚀 Starting Bubble Sort on ${n} elements`);
                        addLog(`📊 Worst case: O(n²) = ${n * n} comparisons`);
                        addLog(`💡 Concept: Largest element "bubbles" to the end each pass`);
                        
                        // Pause helper
                        const pauseCheck = async () => {
                            while (algoPausedRef.current) {
                                await delay(100);
                                if (currentRunId !== algoRunIdRef.current) throw new Error('Cancelled');
                            }
                        };
                        
                        // Run bubble sort
                        (async () => {
                            await delay(500); // Setup delay
                            if (currentRunId !== algoRunIdRef.current) return;
                            
                            let sortedArr = [...arr];
                            let comparisons = 0;
                            let swaps = 0;
                            let passes = 0;
                            
                            // Clear all existing highlights before starting
                            for (let k = 0; k < n; k++) {
                                const cellId = engine.arrays['sort_arr']?.cells[k];
                                if (cellId) engine.highlight(cellId, 0x666666, 0.1);
                            }
                            
                            try {
                                for (let i = 0; i < n - 1; i++) {
                                    if (currentRunId !== algoRunIdRef.current) throw new Error('Cancelled');
                                    await pauseCheck();
                                    
                                    passes++;
                                    setBubbleStats({ comparisons, swaps, passes });
                                    addLog(`📍 Pass ${passes}/${n-1}: Checking indices 0 to ${n - i - 2}`);
                                    
                                    let swappedThisPass = false;
                                    
                                    for (let j = 0; j < n - i - 1; j++) {
                                        if (currentRunId !== algoRunIdRef.current) throw new Error('Cancelled');
                                        await pauseCheck();
                                        
                                        comparisons++;
                                        setBubbleStats({ comparisons, swaps, passes });
                                        
                                        // === CLEANUP: Remove any existing comparison label FIRST ===
                                        const prevLabel = `bs_comp_label`;
                                        if (engine.objects?.[prevLabel]) {
                                            const prevObj = engine.objects[prevLabel];
                                            if (prevObj.group) {
                                                engine.scene?.remove(prevObj.group);
                                                delete engine.objects[prevLabel];
                                            }
                                        }
                                        
                                        // === STEP 1: Capture cell IDs BEFORE any operations ===
                                        const arr = engine.arrays['sort_arr'];
                                        const cellId1 = arr?.cells[j];
                                        const cellId2 = arr?.cells[j + 1];
                                        
                                        // === STEP 2: Highlight comparing elements - YELLOW ===
                                        // Duration: 0.5s scaled by speed (Plan Phase 1)
                                        if (cellId1) engine.highlight(cellId1, 0xffff00, 0.5 / algoSpeedRef.current);
                                        if (cellId2) engine.highlight(cellId2, 0xffff00, 0.5 / algoSpeedRef.current);
                                        
                                        await delay(1000 / algoSpeedRef.current); // Pause (Plan Phase 1) - See Comparison
                                        await pauseCheck();
                                        if (currentRunId !== algoRunIdRef.current) return;
                                        
                                        // === STEP 3: DECISION PHASE (Highlight Red/Green BEFORE swapping) ===
                                        const willSwap = sortedArr[j] > sortedArr[j+1];
                                        
                                        if (willSwap) {
                                            // Highlight mismatch cells - RED
                                            if (cellId1) engine.highlight(cellId1, 0xff4444, 0.8 / algoSpeedRef.current);
                                            if (cellId2) engine.highlight(cellId2, 0xff4444, 0.8 / algoSpeedRef.current);
                                        } else {
                                            // Highlight correct order cells - GREEN
                                            if (cellId1) engine.highlight(cellId1, 0x22c55e, 0.8 / algoSpeedRef.current);
                                            if (cellId2) engine.highlight(cellId2, 0x22c55e, 0.8 / algoSpeedRef.current);
                                        }
                                        
                                        await delay(800 / algoSpeedRef.current); // Pause (Plan Phase 2) - Process Decision
                                        await pauseCheck();
                                        if (currentRunId !== algoRunIdRef.current) return;
                                        
                                        if (willSwap) {
                                            // === STEP 4: SWAP + TEXT (Action Phase) ===
                                            const compLabel = `bs_comp_label`;
                                            const compX = -7 + j * 1.5 + 0.75;
                                            const compText = `${sortedArr[j]} > ${sortedArr[j+1]}`;
                                            
                                            // Create comparison text EXACTLY when swap starts
                                            engine.createRoundedCube(compLabel, compText, { x: compX, y: 6, z: 1 }, true);
                                            engine.highlight(compLabel, 0xef4444, 0.3 / algoSpeedRef.current);
                                            
                                            addLog(`🔄 [${comparisons}] Swap: ${sortedArr[j]} ↔ ${sortedArr[j+1]}`);
                                            
                                            // Swap in array data
                                            [sortedArr[j], sortedArr[j + 1]] = [sortedArr[j + 1], sortedArr[j]];
                                            
                                            // Await the swap animation (takes 1.5s scaled)
                                            await engine.arraySwapAsync('sort_arr', j, j + 1, 1.5 / algoSpeedRef.current);
                                            await pauseCheck();
                                            if (currentRunId !== algoRunIdRef.current) return;
                                            
                                            swaps++;
                                            swappedThisPass = true;
                                            setBubbleStats({ comparisons, swaps, passes });
                                            
                                            // === STEP 5: REMOVE TEXT (Action Phase cleanup) ===
                                            if (engine.objects?.[compLabel]) {
                                                const obj = engine.objects[compLabel];
                                                if (obj.group) {
                                                    engine.scene?.remove(obj.group);
                                                    delete engine.objects[compLabel];
                                                }
                                            }
                                            
                                            // Dim the cells back to normal (0.5s)
                                            const updatedArr = engine.arrays['sort_arr'];
                                            if (updatedArr?.cells[j]) engine.highlight(updatedArr.cells[j], 0x666666, 0.5 / algoSpeedRef.current);
                                            if (updatedArr?.cells[j+1]) engine.highlight(updatedArr.cells[j+1], 0x666666, 0.5 / algoSpeedRef.current);
                                        } else {
                                            // No swap - confirmation pause (0.5s)
                                            await delay(500 / algoSpeedRef.current);
                                            await pauseCheck();
                                            if (currentRunId !== algoRunIdRef.current) return;
                                            
                                            // Dim the cells back to normal (0.5s)
                                            if (cellId1) engine.highlight(cellId1, 0x666666, 0.5 / algoSpeedRef.current);
                                            if (cellId2) engine.highlight(cellId2, 0x666666, 0.5 / algoSpeedRef.current);
                                        }
                                    }
                                    
                                    // Mark the element that bubbled to its final position (use cell ID directly)
                                    const finalArr = engine.arrays['sort_arr'];
                                    const finalCellId = finalArr?.cells[n - i - 1];
                                    // Make green highlight also obey speed (0.8s base for final confirmation)
                                    if (finalCellId) engine.highlight(finalCellId, 0x00ff00, 0.8 / algoSpeedRef.current);
                                    addLog(`✅ Element ${sortedArr[n-i-1]} is now in final position`);
                                    
                                    // === EARLY TERMINATION ===
                                    if (!swappedThisPass) {
                                        addLog(`🎉 No swaps in pass ${passes} — Array is sorted! Exiting early.`);
                                        break;
                                    }
                                }
                                
                                // Mark all as sorted
                                for (let k = 0; k < n; k++) {
                                    engine.arrayHighlight('sort_arr', k, 0x00ff00);
                                }
                                
                                addLog(`✅ Bubble Sort Complete!`);
                                addLog(`📊 Final Stats: ${comparisons} comparisons, ${swaps} swaps, ${passes} passes`);
                                addLog(`⏱️ Time Complexity: O(n²) | Space Complexity: O(1)`);
                                
                            } catch (err) {
                                if (err.message !== 'Cancelled') {
                                    addLog(`❌ Error: ${err.message}`);
                                }
                            } finally {
                                setAlgoIsRunning(false);
                            }
                        })();
                        
                    } else if (operation === 'Pause') {
                        algoPausedRef.current = true;
                        setAlgoIsPaused(true);
                        addLog(`⏸️ Paused`);
                    } else if (operation === 'Resume') {
                        algoPausedRef.current = false;
                        setAlgoIsPaused(false);
                        addLog(`▶️ Resumed`);
                    } else if (operation === 'Reset') {
                        algoRunIdRef.current += 1;
                        setAlgoIsRunning(false);
                        setAlgoIsPaused(false);
                        algoPausedRef.current = false;
                        setBubbleStats({ comparisons: 0, swaps: 0, passes: 0 });
                        engine.reset();
                        addLog(`🔄 Reset`);
                    }
                    break;

                case 'binary_search':
                    if (operation === 'Run') {
                        // Block if already running
                        if (algoIsRunning) {
                            addLog(`⚠️ Algorithm already running. Wait or Reset first.`);
                            break;
                        }
                        
                        engine.reset();
                        
                        // === INPUT VALIDATION ===
                        if (inputArr.length < 1) {
                            addLog(`❌ Error: Array cannot be empty`);
                            break;
                        }
                        
                        const sortedArr = [...inputArr].sort((a, b) => a - b);
                        let target = val;
                        let autoSelected = false;
                        
                        // Auto-select target if not provided
                        if (!val && val !== 0) {
                            target = sortedArr[Math.floor(sortedArr.length / 2)];
                            autoSelected = true;
                        }
                        
                        // Check if target exists in array
                        const targetExists = sortedArr.includes(target);
                        
                        // === INITIALIZE STATE ===
                        algoRunIdRef.current += 1;
                        const currentRunId = algoRunIdRef.current;
                        setAlgoIsRunning(true);
                        setAlgoIsPaused(false);
                        algoPausedRef.current = false;
                        algoSpeedRef.current = algoSpeed;
                        setBsStats({ iterations: 0, found: null, targetIndex: -1 });
                        
                        const bsCenterX = -(sortedArr.length * 1.5) / 2;
                        const arrayY = 0; // Center the array at y=0 for better visibility
                        engine.createArrayAPI('search_arr', sortedArr, bsCenterX, arrayY);
                        
                        // Create pointer labels using proper pointer system
                        // Initialize pointers at their starting positions
                        const initialMid = Math.floor((sortedArr.length - 1) / 2);
                        engine.arrayMovePointer('search_arr', 0, 'L');
                        engine.arrayMovePointer('search_arr', sortedArr.length - 1, 'R');
                        engine.arrayMovePointer('search_arr', initialMid, 'Mid');
                        
                        addLog(`🔍 Binary Search for target: ${target}`);
                        if (autoSelected) addLog(`💡 Target auto-selected (use Value field to specify)`);
                        if (!targetExists) addLog(`⚠️ Note: Target ${target} may not exist in array`);
                        addLog(`📊 Array: [${sortedArr.join(', ')}] (${sortedArr.length} elements)`);
                        addLog(`💡 Concept: Divide & conquer - eliminate half each iteration`);
                        addLog(`⏱️ Time Complexity: O(log n) = max ${Math.ceil(Math.log2(sortedArr.length + 1))} iterations`);
                        
                        // Pause helper
                        const pauseCheck = async () => {
                            while (algoPausedRef.current) {
                                await delay(100);
                                if (currentRunId !== algoRunIdRef.current) throw new Error('Cancelled');
                            }
                        };
                        
                        // Track eliminated indices for permanent fade
                        const eliminated = new Set();
                        
                        // Run binary search
                        (async () => {
                            await delay(500); // Setup delay
                            if (currentRunId !== algoRunIdRef.current) return;
                            
                            let left = 0, right = sortedArr.length - 1;
                            let found = false;
                            let iterations = 0;
                            let foundIndex = -1;
                            
                            try {
                                while (left <= right) {
                                    if (currentRunId !== algoRunIdRef.current) throw new Error('Cancelled');
                                    await pauseCheck();
                                    
                                    iterations++;
                                    const mid = Math.floor((left + right) / 2);
                                    setBsStats({ iterations, found: null, targetIndex: -1 });
                                    addLog(`📍 Iteration ${iterations}: mid = ⌊(${left} + ${right}) / 2⌋ = ${mid}`);
                                    
                                    // Calculate pointer positions
                                    const midX = bsCenterX + mid * 1.5;
                                    
                                    // Animation duration scales with speed
                                    const animSpeed = algoSpeedRef.current;
                                    
                                    // === STEP 1: HIGHLIGHT MID ELEMENT (M pointer moves here) ===
                                    engine.arrayHighlight('search_arr', mid, 0xfbbf24); // Yellow
                                    // Move Mid pointer to the new mid position and wait for animation to complete
                                    await engine.arrayMovePointerAsync('search_arr', mid, 'Mid', 0.4 / animSpeed);
                                    
                                    // Remove old mid calculation label if it exists
                                    if (engine.objects?.['mid_calc_label']) {
                                        const obj = engine.objects['mid_calc_label'];
                                        if (obj.group) {
                                            engine.scene?.remove(obj.group);
                                            delete engine.objects['mid_calc_label'];
                                        }
                                    }
                                    
                                    // Show mid calculation formula above mid pointer
                                    const midCalcText = `mid = (${left}+${right})/2 = ${mid}`;
                                    engine.createRoundedCube('mid_calc_label', midCalcText, { x: midX, y: -5, z: 1 }, true);
                                    engine.highlight('mid_calc_label', 0xfbbf24, 0.3 / animSpeed); // Yellow to match mid pointer
                                    
                                    await delay(200 / animSpeed); // Small pause after pointer arrives
                                    
                                    // Show floating comparison label above mid element
                                    const compLabel = `compare_${mid}_${iterations}`;
                                    const compText = `${sortedArr[mid]} ${sortedArr[mid] === target ? '=' : sortedArr[mid] < target ? '<' : '>'} ${target}`;
                                    engine.createRoundedCube(compLabel, compText, { x: midX, y: 6, z: 1 }, true);
                                    
                                    // Color based on comparison result
                                    if (sortedArr[mid] === target) {
                                        engine.highlight(compLabel, 0x22c55e); // Green for found
                                    } else if (sortedArr[mid] < target) {
                                        engine.highlight(compLabel, 0xf97316); // Orange for search right
                                    } else {
                                        engine.highlight(compLabel, 0x8b5cf6); // Purple for search left
                                    }
                                    await delay(800 / animSpeed);
                                    
                                    // Log comparison
                                    addLog(`   Comparing: arr[${mid}] = ${sortedArr[mid]} vs target = ${target}`);
                                    await delay(400 / animSpeed);
                                    
                                    // Remove comparison label
                                    if (engine.objects?.[compLabel]) {
                                        const obj = engine.objects[compLabel];
                                        if (obj.group) {
                                            gsap.to(obj.group.scale, { x: 0, y: 0, z: 0, duration: 0.3 / animSpeed, onComplete: () => {
                                                engine.scene?.remove(obj.group);
                                                delete engine.objects[compLabel];
                                            }});
                                        }
                                    }
                                    
                                    // Check if found
                                    if (sortedArr[mid] === target) {
                                        // FOUND!
                                        engine.arrayHighlight('search_arr', mid, 0x22c55e); // Green
                                        found = true;
                                        foundIndex = mid;
                                        addLog(`✅ FOUND! Target ${target} at index ${mid}`);
                                        setBsStats({ iterations, found: true, targetIndex: mid });
                                        await delay(700 / animSpeed);
                                        break;
                                    }
                                    
                                    // === STEP 2: LOG DECISION ===
                                    let newLeft = left, newRight = right;
                                    if (sortedArr[mid] < target) {
                                        addLog(`   ${target} > ${sortedArr[mid]} → Search RIGHT half`);
                                        newLeft = mid + 1;
                                    } else {
                                        addLog(`   ${target} < ${sortedArr[mid]} ← Search LEFT half`);
                                        newRight = mid - 1;
                                    }
                                    await delay(400 / animSpeed);
                                    
                                    // === STEP 3: BLACK OUT UNUSED ARRAY FIRST (staggered) ===
                                    const elementsToBlack = sortedArr[mid] < target 
                                        ? Array.from({ length: mid - left + 1 }, (_, i) => left + i)  // left to mid
                                        : Array.from({ length: right - mid + 1 }, (_, i) => mid + i); // mid to right
                                    
                                    for (const i of elementsToBlack) {
                                        eliminated.add(i);
                                        engine.arrayHighlight('search_arr', i, 0x333333);
                                        await delay(100 / animSpeed); // Staggered black out
                                    }
                                    await delay(400 / animSpeed);
                                    
                                    // === STEP 4: MOVE LEFT/RIGHT POINTERS (after black out) ===
                                    // Move pointers in parallel and wait for both to complete
                                    await Promise.all([
                                        engine.arrayMovePointerAsync('search_arr', newLeft, 'L', 0.4 / animSpeed),
                                        engine.arrayMovePointerAsync('search_arr', newRight, 'R', 0.4 / animSpeed)
                                    ]);
                                    await delay(200 / animSpeed); // Small pause after pointers arrive
                                    
                                    // Update left and right for next iteration
                                    left = newLeft;
                                    right = newRight;
                                }
                                
                                if (!found) {
                                    // === FAILURE CASE ===
                                    addLog(`❌ Target ${target} NOT FOUND`);
                                    addLog(`🔍 Search space exhausted (left=${left} > right=${right})`);
                                    setBsStats({ iterations, found: false, targetIndex: -1 });
                                    
                                    // Grey out entire array
                                    for (let i = 0; i < sortedArr.length; i++) {
                                        engine.arrayHighlight('search_arr', i, 0x444444);
                                    }
                                    
                                    // Animate pointers crossing
                                    if (engine.objects?.['ptr_L']?.group && engine.objects?.['ptr_R']?.group) {
                                        gsap.to(engine.objects['ptr_L'].group.position, { x: bsCenterX + (sortedArr.length / 2) * 1.5, duration: 0.5 });
                                        gsap.to(engine.objects['ptr_R'].group.position, { x: bsCenterX + (sortedArr.length / 2) * 1.5, duration: 0.5 });
                                    }
                                }
                                
                                // Final summary
                                addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                                addLog(`📊 Summary:`);
                                addLog(`   • Result: ${found ? `FOUND at index ${foundIndex}` : 'NOT FOUND'}`);
                                addLog(`   • Iterations: ${iterations} (max possible: ${Math.ceil(Math.log2(sortedArr.length + 1))})`);
                                addLog(`   • Time: O(log n) | Space: O(1)`);
                                
                            } catch (err) {
                                if (err.message !== 'Cancelled') {
                                    addLog(`❌ Error: ${err.message}`);
                                }
                            } finally {
                                setAlgoIsRunning(false);
                            }
                        })();
                        
                    } else if (operation === 'Pause') {
                        algoPausedRef.current = true;
                        setAlgoIsPaused(true);
                        addLog(`⏸️ Paused`);
                    } else if (operation === 'Resume') {
                        algoPausedRef.current = false;
                        setAlgoIsPaused(false);
                        addLog(`▶️ Resumed`);
                    } else if (operation === 'Reset') {
                        algoRunIdRef.current += 1;
                        setAlgoIsRunning(false);
                        setAlgoIsPaused(false);
                        algoPausedRef.current = false;
                        setBsStats({ iterations: 0, found: null, targetIndex: -1 });
                        engine.reset();
                        addLog(`🔄 Reset`);
                    }
                    break;

                case 'bfs':
                    if (operation === 'Run') {
                        // Cancel any previous run
                        bfsRunIdRef.current += 1;
                        const currentRunId = bfsRunIdRef.current;
                        
                        engine.reset();
                        engine.graphResetLayout?.();
                        
                        // === INPUT NOT VALIDATION ===
                        let adj = {};
                        let start = bfsStartNode;
                        
                        if (bfsInputMode === 'preset') {
                            const preset = getPresetGraphs()[bfsSelectedPreset];
                            adj = preset.adjacencyList;
                            start = preset.startNode;
                        } else {
                            try {
                                const validation = validateAdjacencyList(bfsAdjList);
                                if (!validation.valid) {
                                    addLog(`❌ Error: ${validation.error}`);
                                    return;
                                }
                                adj = validation.adjacencyList;
                                
                                const startValidation = validateStartNode(start, adj);
                                if (!startValidation.valid) {
                                    addLog(`❌ Error: ${startValidation.error}`);
                                    return;
                                }
                            } catch (e) {
                                addLog(`❌ Error: ${e.message}`);
                                return;
                            }
                        }
                        
                        // === INITIALIZE STATE ===
                        setBfsIsRunning(true);
                        setBfsIsPaused(false);
                        bfsPausedRef.current = false;
                        bfsSpeedRef.current = bfsSpeed;
                        setBfsStats({ visited: 0, queueSize: 0, levels: 0 });
                        
                        // === BUILD GRAPH VISUALS ===
                        const nodes = Object.keys(adj);
                        
                        // Create nodes
                        nodes.forEach((label) => {
                            engine.graphCreateNode(`bfs_${label}`, label);
                        });
                        
                        // Create edges (prevent duplicates)
                        const addedEdges = new Set();
                        nodes.forEach(u => {
                            (adj[u] || []).forEach(v => {
                                const edgeKey = [u, v].sort().join('-');
                                if (!addedEdges.has(edgeKey)) {
                                    if (nodes.includes(v)) { // Only connect if target exists
                                        engine.graphConnect(`bfs_${u}`, `bfs_${v}`, true); // Undirected visual for simplicity, or directed?
                                        addedEdges.add(edgeKey);
                                    }
                                }
                            });
                        });
                        
                        addLog(`🚀 Starting BFS from node ${start}`);
                        
                        // === CREATE QUEUE VISUALIZATION ===
                        // Position queue at bottom or side
                        engine.createQueue('bfs_queue', -8, -6);
                        
                        // === HELPER: ANIMATION DELAY & PAUSE CHECK ===
                        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                        
                        const pauseCheck = async () => {
                            while (bfsPausedRef.current) {
                                await delay(100);
                                if (currentRunId !== bfsRunIdRef.current) throw new Error('Cancelled');
                            }
                        };
                        
                        // === HELPER: UPDATE STATE PANEL ===
                        const updateStatePanel = (current, action) => {
                             if (engine.objects?.['bfs_state_panel']) {
                                engine.scene.remove(engine.objects['bfs_state_panel'].group);
                                delete engine.objects['bfs_state_panel'];
                            }
                            
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = 600;
                            canvas.height = 220;
                            
                            ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
                            ctx.fillRect(0, 0, 600, 220);
                            ctx.strokeStyle = '#3b82f6';
                            ctx.lineWidth = 5;
                            ctx.strokeRect(3, 3, 594, 214);
                            
                            ctx.font = 'bold 36px Arial';
                            ctx.fillStyle = '#60a5fa';
                            ctx.fillText('BFS State', 25, 50);
                            
                            ctx.font = 'bold 32px Arial';
                            ctx.fillStyle = '#fbbf24';
                            ctx.fillText(`Current: ${current || '-'}`, 25, 105);
                            
                            ctx.font = '26px Arial';
                            ctx.fillStyle = '#e2e8f0';
                            ctx.fillText(action, 25, 160);
                            
                            const tex = new THREE.CanvasTexture(canvas);
                            const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
                            const sprite = new THREE.Sprite(mat);
                            sprite.position.set(10, 7, 0);
                            sprite.scale.set(8, 3, 1);
                            
                            engine.scene.add(sprite);
                            engine.objects['bfs_state_panel'] = { group: sprite, type: 'label' };
                        };

                        // === HELPER: UPDATE TRAVERSAL PATH TEXT ===
                        const updateTraversalText = (pathArray) => {
                            if (engine.objects?.['bfs_traversal_text']) {
                                engine.scene.remove(engine.objects['bfs_traversal_text'].group);
                                delete engine.objects['bfs_traversal_text'];
                            }
                            
                            if (pathArray.length === 0) return;
                            
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = 1400;
                            canvas.height = 180;
                            
                            // Dark background with bright blue border
                            ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
                            ctx.fillRect(0, 0, 1400, 180);
                            ctx.strokeStyle = '#60a5fa';
                            ctx.lineWidth = 6;
                            ctx.strokeRect(3, 3, 1394, 174);
                            
                            // Large, bold text
                            ctx.font = 'bold 56px Arial';
                            ctx.fillStyle = '#60a5fa';
                            ctx.fillText(`Traversal: ${pathArray.join(' → ')}`, 40, 110);
                            
                            const tex = new THREE.CanvasTexture(canvas);
                            const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
                            const sprite = new THREE.Sprite(mat);
                            sprite.position.set(0, -7, 0); // Bottom center
                            sprite.scale.set(18, 2.5, 1); // Large banner
                            
                            engine.scene.add(sprite);
                            engine.objects['bfs_traversal_text'] = { group: sprite, type: 'label' };
                        };

                        // === HELPER: CAMERA FOCUS ===
                        // === HELPER: CAMERA FOCUS ===
                        // === HELPER: CAMERA FOCUS ===
                        // Camera drift removed by user request
                        // const focusNode = ... 
                        
                        
                        // === BFS ALGORITHM ===
                        (async () => {
                            try {
                                const queue = [start]; // Real logic queue
                                const visited = new Set([start]);
                                const visitedList = [];
                                const levels = { [start]: 0 };
                                
                                // Initial Visuals
                                engine.queueEnqueue('bfs_queue', `q_item_${start}`, start);
                                engine.graphHighlight(`bfs_${start}`, 0x60a5fa); // Enqueued color (Blue)
                                updateStatePanel('-', `Joined ${start} to Queue`);
                                setBfsStats({ visited: 0, queueSize: 1, levels: 1 });
                                
                                await delay(1000 / bfsSpeedRef.current);
                                
                                while (queue.length > 0) {
                                    if (currentRunId !== bfsRunIdRef.current) throw new Error('Cancelled');
                                    await pauseCheck();
                                    
                                    // Dequeue
                                    // Dequeue
                                    const curr = queue.shift();
                                    engine.queueDequeue('bfs_queue');
                                    // focusNode(curr); // Removed
                                    
                                    // Visual: Processing (Yellow)
                                    engine.graphHighlight(`bfs_${curr}`, 0xfbbf24);
                                    updateStatePanel(curr, 'Processing Node...');
                                    addLog(`🔄 Processing ${curr} (Level ${levels[curr]})`);
                                    
                                    await delay(1000 / bfsSpeedRef.current);
                                    await pauseCheck();
                                    if (currentRunId !== bfsRunIdRef.current) return;
                                    
                                    // Mark Visited (Green)
                                    visitedList.push(curr);
                                    engine.graphHighlight(`bfs_${curr}`, 0x22c55e);
                                    updateStatePanel(curr, 'Marked Visited');
                                    updateTraversalText(visitedList); // Update live path display
                                    setBfsStats({ 
                                        visited: visitedList.length, 
                                        queueSize: queue.length, 
                                        levels: levels[curr] 
                                    });
                                    
                                    await delay(600 / bfsSpeedRef.current);
                                    await pauseCheck();
                                    
                                    // Get Neighbors
                                    const neighbors = adj[curr] || [];
                                    neighbors.sort(); // Consistent order
                                    
                                    for (const neighbor of neighbors) {
                                        if (currentRunId !== bfsRunIdRef.current) return;
                                        
                                        // Visual: Check Edge
                                        // Highlight edge briefly (Yellow pulse)
                                        engine.highlightEdge(`bfs_${curr}`, `bfs_${neighbor}`, 0xffff00, 0.3);
                                        
                                        if (!visited.has(neighbor)) {
                                            visited.add(neighbor);
                                            levels[neighbor] = levels[curr] + 1;
                                            queue.push(neighbor);
                                            
                                            addLog(`   ➡️ Discovered ${neighbor} (Level ${levels[neighbor]})`);
                                            updateStatePanel(curr, `Enqueuing ${neighbor}`);
                                            
                                            // Enqueue Visual
                                            engine.queueEnqueue('bfs_queue', `q_item_${neighbor}`, neighbor);
                                            engine.graphHighlight(`bfs_${neighbor}`, 0x60a5fa); // In-Queue (Blue)
                                            
                                            setBfsStats({ 
                                                visited: visitedList.length, 
                                                queueSize: queue.length, 
                                                levels: Math.max(...Object.values(levels))
                                            });
                                            
                                            await delay(800 / bfsSpeedRef.current);
                                            await pauseCheck();
                                        }
                                    }
                                }
                                
                                updateStatePanel('-', 'BFS Complete!');
                                updateStatePanel('-', 'BFS Complete!');
                                addLog(`✅ BFS Complete! Traversal: ${visitedList.join(' → ')}`);

                                // === HIGHLIGHT BFS TREE ===
                                // Highlight the discovery edges (BFS Tree)
                                // We need to re-scan to find the tree edges we traversed
                                const finalVisited = new Set([start]);
                                const tempQueue = [start];
                                while(tempQueue.length > 0) {
                                    const u = tempQueue.shift();
                                    const nbrs = (adj[u] || []).sort(); // Replicates exact same order
                                    for(const v of nbrs) {
                                        if(!finalVisited.has(v)) {
                                            finalVisited.add(v);
                                            tempQueue.push(v);
                                            // Highlight Tree Edge
                                            engine.highlightEdge(`bfs_${u}`, `bfs_${v}`, 0x22c55e, 1.0); // Bright Green
                                        }
                                    }
                                }
                                
                            } catch (e) {
                                if (e.message !== 'Cancelled') {
                                    addLog(`❌ Error: ${e.message}`);
                                    console.error(e);
                                }
                            } finally {
                                setBfsIsRunning(false);
                            }
                        })();
                        
                    } else if (operation === 'Pause') {
                        bfsPausedRef.current = true;
                        setBfsIsPaused(true);
                        addLog(`⏸️ BFS Paused`);
                    } else if (operation === 'Resume') {
                        bfsPausedRef.current = false;
                        setBfsIsPaused(false);
                        addLog(`▶️ BFS Resumed`);
                    } else if (operation === 'Reset') {
                        bfsRunIdRef.current += 1;
                        setBfsIsRunning(false);
                        setBfsIsPaused(false);
                        bfsPausedRef.current = false;
                        engine.reset();
                        addLog(`🔄 Scene reset`);
                    }
                    break;

                case 'dfs':
                    if (operation === 'Run') {
                        // Cancel any previous run
                        dfsRunIdRef.current += 1;
                        const currentRunId = dfsRunIdRef.current;
                        
                        engine.reset();
                        engine.graphResetLayout?.();
                        
                        // Create graph
                        const nodes = ['A', 'B', 'C', 'D', 'E', 'F'];
                        nodes.forEach((label, i) => {
                            engine.graphCreateNode(`dfs_${i}`, label);
                        });
                        // Create edges
                        engine.graphConnect('dfs_0', 'dfs_1', true);
                        engine.graphConnect('dfs_0', 'dfs_2', true);
                        engine.graphConnect('dfs_1', 'dfs_3', true);
                        engine.graphConnect('dfs_1', 'dfs_4', true);
                        engine.graphConnect('dfs_2', 'dfs_5', true);
                        
                        addLog(`🚀 Starting DFS from node A`);
                        
                        // === CREATE STACK USING ENGINE API (same as Stack data structure) ===
                        engine.createStack('dfs_stack', -9, -3);
                        
                        // DFS traversal (iterative with stack)
                        const visited = new Set();
                        const stack = [0];
                        const order = [];
                        const adjacency = {
                            0: [1, 2],
                            1: [3, 4],
                            2: [5],
                            3: [], 4: [], 5: []
                        };
                        
                        // === TRAVERSAL TEXT (camera-facing) - LARGER ===
                        const updateTraversalText = (pathArray) => {
                            if (engine.objects?.['traversal_text']) {
                                engine.scene.remove(engine.objects['traversal_text'].group);
                                delete engine.objects['traversal_text'];
                            }
                            
                            if (pathArray.length === 0) return;
                            
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = 1400;
                            canvas.height = 180;
                            
                            // Dark background with bright green border
                            ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
                            ctx.fillRect(0, 0, 1400, 180);
                            ctx.strokeStyle = '#22c55e';
                            ctx.lineWidth = 6;
                            ctx.strokeRect(3, 3, 1394, 174);
                            
                            // Large, bold text
                            ctx.font = 'bold 56px Arial';
                            ctx.fillStyle = '#22c55e';
                            ctx.fillText(`Path: ${pathArray.join(' → ')}`, 40, 110);
                            
                            const tex = new THREE.CanvasTexture(canvas);
                            const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
                            const sprite = new THREE.Sprite(mat);
                            sprite.position.set(0, -7, 0); // Bottom center
                            sprite.scale.set(18, 2.5, 1); // Much larger
                            
                            engine.scene.add(sprite);
                            engine.objects['traversal_text'] = { group: sprite, type: 'label' };
                        };
                        
                        // === STATE PANEL - LARGER & CLEARER ===
                        const updateStatePanel = (current, action) => {
                            if (engine.objects?.['dfs_state_panel']) {
                                engine.scene.remove(engine.objects['dfs_state_panel'].group);
                                delete engine.objects['dfs_state_panel'];
                            }
                            
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = 600;
                            canvas.height = 220;
                            
                            // Dark background with blue border
                            ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
                            ctx.fillRect(0, 0, 600, 220);
                            ctx.strokeStyle = '#3b82f6';
                            ctx.lineWidth = 5;
                            ctx.strokeRect(3, 3, 594, 214);
                            
                            // Title
                            ctx.font = 'bold 36px Arial';
                            ctx.fillStyle = '#60a5fa';
                            ctx.fillText('DFS State', 25, 50);
                            
                            // Current node - highlighted
                            ctx.font = 'bold 32px Arial';
                            ctx.fillStyle = '#fbbf24';
                            ctx.fillText(`Current: ${current}`, 25, 105);
                            
                            // Action
                            ctx.font = '26px Arial';
                            ctx.fillStyle = '#e2e8f0';
                            ctx.fillText(action, 25, 160);
                            
                            const tex = new THREE.CanvasTexture(canvas);
                            const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
                            const sprite = new THREE.Sprite(mat);
                            sprite.position.set(10, 7, 0);
                            sprite.scale.set(8, 3, 1); // Larger
                            
                            engine.scene.add(sprite);
                            engine.objects['dfs_state_panel'] = { group: sprite, type: 'label' };
                        };
                        
                        // === NODE HIGHLIGHTING (simplified: 2 colors) ===
                        const NODE_COLORS = {
                            normal: 0x60a5fa,     // Blue - unvisited/default
                            highlight: 0x22c55e   // Bright Green - visited path
                        };
                        
                        const setNodeColor = (nodeIdx, isHighlighted) => {
                            const nodeId = `dfs_${nodeIdx}`;
                            const color = isHighlighted ? NODE_COLORS.highlight : NODE_COLORS.normal;
                            // Use engine.highlight API which properly handles all node types
                            engine.highlight(nodeId, color);
                        };
                        
                        // === CAMERA SETUP - SUBTLE DRIFT ===
                        const baseCameraPos = { x: 0, y: 2, z: 32 };
                        if (engine.camera) {
                            engine.camera.position.set(baseCameraPos.x, baseCameraPos.y, baseCameraPos.z);
                            if (engine.controls) {
                                engine.controls.target.set(0, 0, 0);
                                engine.controls.enabled = true;
                            }
                        }
                        
                        // Subtle camera drift toward active node (no snap/zoom)
                        // Subtle camera drift toward active node (no snap/zoom)
                        const driftCamera = (nodeIdx) => {
                           // Drift removed by user request
                        };
                        
                        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                        
                        // Push initial node to stack (node A = index 0)
                        engine.stackPush('dfs_stack', `dfs_stack_item_0`, nodes[0]);
                        
                        (async () => {
                            try {
                            while (stack.length > 0) {
                                // Check if cancelled
                                if (currentRunId !== dfsRunIdRef.current) {
                                    return; // Exit if reset was called
                                }
                                
                                const curr = stack[stack.length - 1];
                                const currNode = nodes[curr];
                                
                                // === PEEK ===
                                updateStatePanel(currNode, `⏯️  Peeking at stack top`);
                                driftCamera(curr);
                                await delay(1000);
                                
                                if (currentRunId !== dfsRunIdRef.current) return;
                                
                                const popped = stack.pop();
                                engine.stackPop('dfs_stack');
                                
                                // === SKIP IF VISITED ===
                                if (visited.has(curr)) {
                                    updateStatePanel(currNode, `⬅️  Already visited, skipping`);
                                    await delay(600);
                                    continue;
                                }
                                
                                // === VISIT ===
                                visited.add(curr);
                                order.push(currNode);
                                
                                // Highlight visited node GREEN
                                setNodeColor(curr, true);
                                updateStatePanel(currNode, `✅ Visited ${currNode}`);
                                updateTraversalText(order);
                                addLog(`📍 Visited ${currNode}`);
                                await delay(800);
                                
                                // === PUSH NEIGHBORS ===
                                const neighbors = [...adjacency[curr]].reverse();
                                const unvisitedNeighbors = neighbors.filter(n => !visited.has(n));
                                
                                if (unvisitedNeighbors.length > 0) {
                                    updateStatePanel(currNode, `➡️  Pushing ${unvisitedNeighbors.length} neighbor(s)`);
                                    
                                    for (const n of unvisitedNeighbors) {
                                        stack.push(n);
                                        engine.stackPush('dfs_stack', `dfs_stack_item_${stack.length}`, nodes[n]);
                                    }
                                    addLog(`📌 Pushed: ${unvisitedNeighbors.map(n => nodes[n]).join(', ')}`);
                                }
                                
                                await delay(700);
                            }
                            
                            // === COMPLETION ===
                            updateStatePanel('-', `✅ DFS Complete!`);
                            addLog(`✅ DFS Order: ${order.join(' → ')}`);
                            
                            gsap.to(engine.camera.position, {
                                x: baseCameraPos.x,
                                y: baseCameraPos.y,
                                duration: 1.5,
                                ease: "power2.out"
                            });
                            } catch (e) {
                                // Cancelled by reset
                            }
                        })();
                    } else if (operation === 'Reset') {
                        // Cancel running DFS loop FIRST
                        dfsRunIdRef.current += 1;
                        
                        // Async cleanup to allow cancellation to propagate
                        (async () => {
                            // Wait a moment for async operations to cancel
                            await new Promise(resolve => setTimeout(resolve, 100));
                            
                            // Clear stack items first
                            if (engine.objects['dfs_stack']?.items) {
                                engine.objects['dfs_stack'].items.forEach(itemId => {
                                    if (engine.objects[itemId]?.group) {
                                        engine.scene.remove(engine.objects[itemId].group);
                                    }
                                    delete engine.objects[itemId];
                                });
                                engine.objects['dfs_stack'].items = [];
                            }
                            
                            // Clear ALL objects from engine
                            const keysToRemove = Object.keys(engine.objects || {});
                            keysToRemove.forEach(key => {
                                const obj = engine.objects[key];
                                if (obj?.group) {
                                    engine.scene.remove(obj.group);
                                }
                                if (obj?.mesh) {
                                    engine.scene.remove(obj.mesh);
                                }
                                delete engine.objects[key];
                            });
                            
                            // Smart cleanup: Remove orphaned sprites/meshes but keep background/grid
                            const childrenToRemove = [];
                            engine.scene.children.forEach(child => {
                                // Keep: lights, camera, grid
                                if (child.isLight || child.isCamera || child.isGridHelper) {
                                    return;
                                }
                                // Keep background plane (if any large mesh at back)
                                if (child.isMesh && child.geometry && child.position.z < -5 && child.scale.x > 20) {
                                    return;
                                }
                                
                                // Remove specific generated types
                                // Sprites (panels, text), small meshes (nodes), groups (complex objects)
                                if (child.isSprite || child.isGroup || (child.isMesh && child.position.z > -10)) {
                                    childrenToRemove.push(child);
                                }
                            });
                            childrenToRemove.forEach(child => engine.scene.remove(child));
                            
                            // MANUAL ENGINE RESET (without wiping background)
                            engine.objects = {};
                            engine.connections = [];
                            if (engine.tl) engine.tl.clear();
                            engine.graphResetLayout?.();
                            
                            // Reset camera
                            if (engine.camera) {
                                engine.camera.position.set(0, 2, 32);
                            }
                            if (engine.controls) {
                                engine.controls.target.set(0, 0, 0);
                                engine.controls.enabled = true;
                                engine.controls.update();
                            }
                            addLog(`🔄 Scene cleared`);
                        })();
                    }
                    break;

                case 'tower_of_hanoi':
                    if (operation === 'Run') {
                        engine.reset();
                        
                        // === INPUT SAFETY: Clamp numDisks between 1 and 7 ===
                        let numDisks = parseInt(customInput) || 3;
                        const originalInput = numDisks;
                        numDisks = Math.max(1, Math.min(7, numDisks));
                        if (originalInput !== numDisks) {
                            addLog(`⚠️ Input clamped: ${originalInput} → ${numDisks} (valid range: 1-7)`);
                        }
                        
                        // === RESET SAFETY: Cancel any previous run ===
                        hanoiRunIdRef.current += 1;
                        const currentRunId = hanoiRunIdRef.current;
                        
                        // === Initialize state ===
                        const totalMoves = Math.pow(2, numDisks) - 1;
                        setHanoiTotalMoves(totalMoves);
                        setHanoiMoveCount(0);
                        setHanoiRecursionDepth(0);
                        setHanoiRecursionStack([]);
                        setHanoiIsRunning(true);
                        setHanoiIsPaused(false);
                        hanoiPausedRef.current = false;
                        hanoiSpeedRef.current = hanoiSpeed; // Sync speed ref from current state
                        
                        // Create 3 towers (pegs) as stacks - wider spacing
                        engine.createStack('peg_A', -6, 0);
                        engine.createStack('peg_B', 0, 0);
                        engine.createStack('peg_C', 6, 0);
                        
                        // Track which disks are on which peg
                        const pegStates = {
                            peg_A: [],
                            peg_B: [],
                            peg_C: []
                        };
                        
                        // Push disks onto first peg (largest first, so they stack correctly)
                        for (let i = numDisks; i >= 1; i--) {
                            const diskId = `disk_${i}`;
                            engine.stackPush('peg_A', diskId, i);
                            pegStates.peg_A.push(diskId);
                        }
                        
                        // Adjust camera for optimal Tower of Hanoi view
                        if (engine.camera && engine.controls) {
                            gsap.to(engine.camera.position, { x: 0, y: 8, z: 18, duration: 1.5, ease: "power2.out" });
                            gsap.to(engine.controls.target, { x: 0, y: 2, z: 0, duration: 1.5, ease: "power2.out" });
                        }
                        
                        addLog(`🗼 Tower of Hanoi with ${numDisks} disk${numDisks > 1 ? 's' : ''}`);
                        addLog(`📋 Goal: Move all disks from Peg A → Peg C`);
                        addLog(`📏 Minimum moves required: ${totalMoves}`);
                        addLog(`💡 Rule: Only one disk at a time, never place larger on smaller`);
                        
                        // === PAUSE HELPER: Wait while paused ===
                        const pauseCheck = async () => {
                            while (hanoiPausedRef.current) {
                                await delay(100);
                                // Check if run was cancelled during pause
                                if (currentRunId !== hanoiRunIdRef.current) {
                                    throw new Error('Run cancelled');
                                }
                            }
                        };
                        
                        // Move counter (mutable for closure)
                        let moveCounter = 0;
                        
                        // Tower of Hanoi recursive solution with async for proper animation sequencing
                        // NOTE: All logs and highlights happen AFTER delays, during actual moves only
                        const moveHanoi = async (n, source, target, auxiliary, depth = 0) => {
                            // === RESET SAFETY: Check if this run was cancelled ===
                            if (currentRunId !== hanoiRunIdRef.current) {
                                throw new Error('Run cancelled');
                            }
                            
                            // === PAUSE CHECK ===
                            await pauseCheck();
                            
                            if (n === 1) {
                                // Base case: move single disk
                                moveCounter++;
                                setHanoiMoveCount(moveCounter);
                                setHanoiRecursionDepth(depth);
                                
                                // === VISUAL HIGHLIGHTING ===
                                engine.highlight?.(source, 0xffff00); // Yellow for source
                                addLog(`📥 [Move ${moveCounter}/${totalMoves}] Pick up Disk 1 from ${source.replace('peg_', '')}`);
                                await delay(300 / hanoiSpeedRef.current);
                                
                                const diskToMove = pegStates[source].pop();
                                pegStates[target].push(diskToMove);
                                
                                // Use stackMove to transfer the disk without destroying it
                                engine.stackMove(source, target, diskToMove);
                                
                                // Highlight target peg (post-move)
                                engine.highlight?.(target, 0x00ff00); // Green for target
                                // Dim other pegs
                                [source, auxiliary].forEach(peg => {
                                    if (peg !== target) engine.highlight?.(peg, 0x444444);
                                });
                                
                                addLog(`📤 [Move ${moveCounter}/${totalMoves}] Place Disk 1 on ${target.replace('peg_', '')}`);
                                await delay(700 / hanoiSpeedRef.current); // Speed-adjusted delay
                                
                                // Reset highlights
                                ['peg_A', 'peg_B', 'peg_C'].forEach(peg => engine.highlight?.(peg, 0x666666));
                                
                            } else {
                                // Recursive case: first move n-1 disks to auxiliary
                                await moveHanoi(n - 1, source, auxiliary, target, depth + 1);
                                
                                // Check cancellation again
                                if (currentRunId !== hanoiRunIdRef.current) {
                                    throw new Error('Run cancelled');
                                }
                                await pauseCheck();
                                
                                // Now move the nth disk from source to target
                                moveCounter++;
                                setHanoiMoveCount(moveCounter);
                                setHanoiRecursionDepth(depth);
                                
                                // === VISUAL HIGHLIGHTING ===
                                engine.highlight?.(source, 0xffff00);
                                addLog(`📥 [Move ${moveCounter}/${totalMoves}] Pick up Disk ${n} from ${source.replace('peg_', '')}`);
                                await delay(300 / hanoiSpeedRef.current);
                                
                                const diskToMove = pegStates[source].pop();
                                pegStates[target].push(diskToMove);
                                
                                // Use stackMove to transfer the disk without destroying it
                                engine.stackMove(source, target, diskToMove);
                                
                                engine.highlight?.(target, 0x00ff00);
                                [source, auxiliary].forEach(peg => {
                                    if (peg !== target) engine.highlight?.(peg, 0x444444);
                                });
                                
                                addLog(`📤 [Move ${moveCounter}/${totalMoves}] Place Disk ${n} on ${target.replace('peg_', '')}`);
                                await delay(700 / hanoiSpeedRef.current);
                                
                                // Reset highlights
                                ['peg_A', 'peg_B', 'peg_C'].forEach(peg => engine.highlight?.(peg, 0x666666));
                                
                                // Finally move n-1 disks from auxiliary to target
                                await moveHanoi(n - 1, auxiliary, target, source, depth + 1);
                            }
                        };
                        
                        // === WAIT FOR SETUP TO COMPLETE, THEN START ===
                        // Use async IIFE to properly await the setup delay
                        (async () => {
                            // Give camera and stacks time to initialize before starting algorithm
                            await delay(1500);
                            
                            // Check if still valid before starting
                            if (currentRunId !== hanoiRunIdRef.current) return;
                            
                            try {
                                await moveHanoi(numDisks, 'peg_A', 'peg_C', 'peg_B', 0);
                                if (currentRunId === hanoiRunIdRef.current) {
                                    addLog(`✅ Tower of Hanoi complete!`);
                                    addLog(`📊 Total moves: ${totalMoves} | Solved optimally!`);
                                    setHanoiIsRunning(false);
                                    setHanoiRecursionStack([]);
                                }
                            } catch (err) {
                                if (err.message !== 'Run cancelled') {
                                    addLog(`❌ Error: ${err.message}`);
                                }
                                setHanoiIsRunning(false);
                            }
                        })();
                            
                    } else if (operation === 'Reset') {
                        // === SAFE RESET: Cancel any running animation ===
                        hanoiRunIdRef.current += 1;
                        setHanoiIsRunning(false);
                        setHanoiIsPaused(false);
                        hanoiPausedRef.current = false;
                        setHanoiMoveCount(0);
                        setHanoiTotalMoves(0);
                        setHanoiRecursionDepth(0);
                        setHanoiRecursionStack([]);
                        engine.reset();
                        addLog(`🔄 Scene reset (animation cancelled)`);
                    } else if (operation === 'Pause') {
                        hanoiPausedRef.current = true;
                        setHanoiIsPaused(true);
                        addLog(`⏸️ Animation paused`);
                    } else if (operation === 'Resume') {
                        hanoiPausedRef.current = false;
                        setHanoiIsPaused(false);
                        addLog(`▶️ Animation resumed`);
                    }
                    break;

                case 'quick_sort':
                    if (operation === 'Run') {
                        engine.reset();
                        const arr = [...inputArr];
                        // Center the array
                        const qsCenterX = -(arr.length * 1.5) / 2;
                        engine.createArrayAPI('qs_arr', arr, qsCenterX, 2);
                        addLog(`🚀 Starting Quick Sort on [${arr.join(', ')}]`);
                        
                        // Track recursion depth
                        let currentDepth = 0;
                        let depthLabelId = null;
                        
                        // Helper to update recursion depth display
                        const updateDepthLabel = async (depth) => {
                            currentDepth = depth;
                            if (depthLabelId) {
                                engine.arrayClearLabel(depthLabelId);
                            }
                            // Create depth indicator in top-right
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = 256;
                            canvas.height = 64;
                            ctx.fillStyle = 'rgba(0,0,0,0)';
                            ctx.fillRect(0, 0, 256, 64);
                            ctx.font = 'bold 32px Arial';
                            ctx.fillStyle = '#00ff88';
                            ctx.textAlign = 'center';
                            ctx.shadowColor = 'rgba(0,0,0,0.8)';
                            ctx.shadowBlur = 4;
                            ctx.fillText(`Depth: ${depth}`, 128, 45);
                            
                            const tex = new THREE.CanvasTexture(canvas);
                            const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
                            const sprite = new THREE.Sprite(mat);
                            sprite.position.set(8, 6, 0);
                            sprite.scale.set(3, 1, 1);
                            
                            engine.scene.add(sprite);
                            depthLabelId = `depth_label_${Date.now()}`;
                            engine.objects[depthLabelId] = { group: sprite, type: 'label' };
                        };
                        
                        // Quick Sort implementation with async for proper animation sequencing
                        const quickSort = async (sortArr, low, high, depth = 0) => {
                            if (low < high) {
                                // Update recursion depth
                                await updateDepthLabel(depth);
                                await delay(200);
                                
                                // Clear all previous labels and highlights
                                engine.arrayClearAllLabels();
                                await delay(100);
                                
                                // Show active range being sorted
                                const rangeId = engine.arrayHighlightRange('qs_arr', low, high, 0x3b82f6, 0.15);
                                addLog(`📊 Sorting range [${low}..${high}]: [${sortArr.slice(low, high + 1).join(', ')}]`);
                                await delay(400);
                                
                                // Partition step
                                const pivotIdx = high;
                                const pivot = sortArr[pivotIdx];
                                let pivotElementId = `qs_arr_${pivotIdx}`;
                                
                                // Highlight pivot
                                engine.arrayHighlight('qs_arr', pivotIdx, 0xff6b6b);
                                const pivotLabelId = engine.arrayAddLabel('qs_arr', pivotIdx, `Pivot: ${pivot}`, '#ff6b6b');
                                addLog(`🎯 Pivot: ${pivot} at index ${pivotIdx}`);
                                await delay(600);
                                
                                let i = low - 1;
                                
                                // Create pointers
                                if (low < high) {
                                    engine.arrayMovePointer('qs_arr', low, 'i');
                                    await delay(1100); // Wait for pointer animation (1.0s) + settle time
                                }
                                
                                // Partition loop
                                for (let j = low; j < high; j++) {
                                    // Clear previous comparison highlights
                                    if (j > low) {
                                        engine.arrayClearHighlights('qs_arr', j - 1);
                                    }
                                    
                                    // Move j pointer
                                    engine.arrayMovePointer('qs_arr', j, 'j');
                                    await delay(1100); // Wait for pointer animation to complete
                                    
                                    // Highlight current element being compared
                                    engine.arrayHighlight('qs_arr', j, 0xffff00);
                                    
                                    // Show comparison label
                                    const compLabelId = engine.arrayAddLabel('qs_arr', j, `${sortArr[j]} < ${pivot}?`, '#ffff00');
                                    await delay(600);
                                    
                                    if (sortArr[j] < pivot) {
                                        i++;
                                        
                                        // Move i pointer
                                        engine.arrayMovePointer('qs_arr', i, 'i');
                                        await delay(1100); // Wait for pointer animation to complete
                                        
                                        if (i !== j) {
                                            // Capture pre-swap values
                                            const val_i = sortArr[i];
                                            const val_j = sortArr[j];
                                            
                                            // Clear comparison label before swap
                                            engine.arrayClearLabel(compLabelId);
                                            
                                            // Highlight both elements for swap
                                            engine.arrayHighlight('qs_arr', i, 0x00ff88);
                                            engine.arrayHighlight('qs_arr', j, 0x00ff88);
                                            
                                            // Show swap label
                                            const swapLabelId = engine.arrayAddLabel('qs_arr', j, `Swap ${val_i} ↔ ${val_j}`, '#00ff88');
                                            await delay(400);
                                            
                                            // Swap elements
                                            [sortArr[i], sortArr[j]] = [sortArr[j], sortArr[i]];
                                            engine.arraySwap('qs_arr', i, j);
                                            addLog(`🔄 Swapped ${val_i} and ${val_j}`);
                                            await delay(700);
                                            
                                            // Clear swap label
                                            engine.arrayClearLabel(swapLabelId);
                                            
                                            // Update pivot element tracking if pivot was swapped
                                            if (i === pivotIdx) pivotElementId = `qs_arr_${j}`;
                                            else if (j === pivotIdx) pivotElementId = `qs_arr_${i}`;
                                        } else {
                                            // Same position, just clear comparison label
                                            engine.arrayClearLabel(compLabelId);
                                            await delay(300);
                                        }
                                    } else {
                                        // Not swapping, clear comparison label
                                        engine.arrayClearLabel(compLabelId);
                                        await delay(300);
                                    }
                                    
                                    // Clear highlight from j
                                    engine.arrayClearHighlights('qs_arr', j);
                                }
                                
                                // Clear pivot label
                                engine.arrayClearLabel(pivotLabelId);
                                
                                // Place pivot in correct position
                                i++;
                                if (i !== pivotIdx) {
                                    // Capture pre-swap values
                                    const val_i = sortArr[i];
                                    const val_pivot = sortArr[pivotIdx];
                                    
                                    // Move i pointer to final position
                                    engine.arrayMovePointer('qs_arr', i, 'i');
                                    await delay(1100); // Wait for pointer animation to complete
                                    
                                    // Highlight both for final pivot swap
                                    engine.arrayHighlight('qs_arr', i, 0xff6b6b);
                                    engine.arrayHighlight('qs_arr', pivotIdx, 0xff6b6b);
                                    
                                    const finalSwapLabelId = engine.arrayAddLabel('qs_arr', i, `Final: ${val_pivot} → ${i}`, '#ff6b6b');
                                    await delay(500);
                                    
                                    // Swap
                                    [sortArr[i], sortArr[pivotIdx]] = [sortArr[pivotIdx], sortArr[i]];
                                    engine.arraySwap('qs_arr', i, pivotIdx);
                                    addLog(`🔄 Placed pivot ${val_pivot} at index ${i}`);
                                    await delay(700);
                                    
                                    engine.arrayClearLabel(finalSwapLabelId);
                                }
                                
                                const partitionIdx = i;
                                
                                // Mark pivot as sorted (green)
                                engine.arrayHighlight('qs_arr', partitionIdx, 0x00ff00);
                                addLog(`✅ Pivot ${pivot} is now in correct position`);
                                await delay(400);
                                
                                // Clear range highlight
                                if (rangeId) {
                                    engine.arrayClearRangeHighlight(rangeId);
                                }
                                
                                // Recursively sort left and right partitions
                                await quickSort(sortArr, low, partitionIdx - 1, depth + 1);
                                await quickSort(sortArr, partitionIdx + 1, high, depth + 1);
                            } else if (low === high) {
                                // Single element is already sorted
                                engine.arrayHighlight('qs_arr', low, 0x00ff00);
                                addLog(`✅ Single element at ${low} is sorted`);
                                await delay(200);
                            }
                        };
                        
                        quickSort(arr, 0, arr.length - 1, 0).then(() => {
                            // Clean up depth label
                            if (depthLabelId) {
                                engine.arrayClearLabel(depthLabelId);
                            }
                            addLog(`✅ Quick Sort complete: [${arr.join(', ')}]`);
                        });
                    } else if (operation === 'Reset') {
                        engine.reset();
                        addLog(`🔄 Scene reset`);
                    }
                    break;

                case 'merge_sort':
                    if (operation === 'Run') {
                        engine.reset();
                        const arr = [...inputArr];
                        
                        // === PHASE 1: VALIDATION ===
                        if (arr.length < 2) {
                            addLog(`⚠️ Array too small for merge sort (need at least 2 elements)`);
                            return;
                        }
                        if (arr.length > 12) {
                            addLog(`⚠️ Array too large (max 12 elements to prevent lag)`);
                            return;
                        }
                        
                        // Check if already sorted
                        const isSorted = arr.every((v, i, a) => i === 0 || a[i-1] <= v);
                        if (isSorted) {
                            addLog(`💡 Note: Array appears to be already sorted!`);
                        }
                        
                        // === INITIALIZE STATE ===
                        msRunIdRef.current += 1;
                        const currentRunId = msRunIdRef.current;
                        setMsIsRunning(true);
                        setMsIsPaused(false);
                        msPausedRef.current = false;
                        msSpeedRef.current = msSpeed;
                        setMsStats({ comparisons: 0, merges: 0, arrayAccesses: 0 });
                        setMsRecursionDepth(0);
                        
                        // Calculate max depth for display
                        const maxDepth = Math.ceil(Math.log2(arr.length));
                        setMsMaxDepth(maxDepth);
                        
                        // Stats tracking
                        let comparisons = 0;
                        let arrayAccesses = 0;
                        let merges = 0;
                        
                        // Color palette for depth levels
                        const depthColors = [0x3b82f6, 0x8b5cf6, 0xec4899, 0xf59e0b, 0x10b981];
                        
                        // Base position for the original array
                        const baseCenterX = -(arr.length * 1.5) / 2;
                        const baseY = 2;
                        
                        // Create the main array at base level
                        engine.createArrayAPI('ms_main', arr, baseCenterX, baseY);
                        
                        addLog(`🚀 Starting Merge Sort on ${arr.length} elements`);
                        addLog(`📊 Time Complexity: O(n log n) - always ~${Math.ceil(arr.length * Math.log2(arr.length))} operations`);
                        addLog(`🧠 Space Complexity: O(n) - uses temporary arrays`);
                        addLog(`💡 Concept: Divide until single elements, then merge sorted subarrays`);
                        addLog(`✅ Stable sort: equal elements maintain relative order`);
                        
                        // Recursion depth label tracking
                        let depthLabelId = null;
                        
                        // Helper to update recursion depth display
                        const updateDepthLabel = async (depth) => {
                            setMsRecursionDepth(depth);
                            if (depthLabelId) {
                                engine.arrayClearLabel(depthLabelId);
                            }
                            // Create depth indicator in top-right (LARGER and CLEARER)
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = 640;
                            canvas.height = 160;
                            ctx.fillStyle = 'rgba(0,0,0,0)';
                            ctx.fillRect(0, 0, 640, 160);
                            ctx.font = 'bold 48px Arial'; // Increased from 32px
                            ctx.fillStyle = '#60a5fa';
                            ctx.textAlign = 'center';
                            ctx.shadowColor = 'rgba(0,0,0,1.0)'; // Stronger shadow
                            ctx.shadowBlur = 8; // More blur for better contrast
                            ctx.fillText(`Recursion Depth: ${depth} / ${maxDepth}`, 320, 60);
                            ctx.font = 'bold 32px Arial'; // Increased from 24px
                            ctx.fillStyle = '#94a3b8';
                            ctx.fillText(`Merges: ${merges}`, 320, 110);
                            
                            const tex = new THREE.CanvasTexture(canvas);
                            const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
                            const sprite = new THREE.Sprite(mat);
                            sprite.position.set(10, 8, 0);
                            sprite.scale.set(7, 2, 1); // Larger scale for better visibility
                            
                            engine.scene.add(sprite);
                            depthLabelId = `depth_label_${Date.now()}`;
                            engine.objects[depthLabelId] = { group: sprite, type: 'label' };
                        };
                        
                        // Pause helper
                        const pauseCheck = async () => {
                            while (msPausedRef.current) {
                                await delay(100);
                                if (currentRunId !== msRunIdRef.current) throw new Error('Cancelled');
                            }
                        };
                        
                        // === MERGE SORT WITH RECURSION DEPTH VISUALIZATION ===
                        const mergeSort = async (sortArr, l, r, depth = 0) => {
                            if (currentRunId !== msRunIdRef.current) throw new Error('Cancelled');
                            await pauseCheck();
                            
                            if (l >= r) return; // Base case: single element or invalid range
                            
                            // Update recursion depth display
                            await updateDepthLabel(depth);
                            await delay(500 / msSpeedRef.current); // Slowed down from 300
                            
                            const m = Math.floor((l + r) / 2);
                            const subarrayLength = r - l + 1;
                            
                            // Calculate vertical offset based on depth (tree layout)
                            const yOffset = baseY - depth * 3;
                            const depthColor = depthColors[depth % depthColors.length];
                            
                            // Log function call
                            addLog(`📞 mergeSort(l=${l}, r=${r}, depth=${depth}) - Range: [${sortArr.slice(l, r+1).join(', ')}]`);
                            
                            // === PHASE 3: DIVIDE VISUALIZATION ===
                            // Remove old division label if exists
                            if (engine.objects?.['division_label']) {
                                const obj = engine.objects['division_label'];
                                if (obj.group) {
                                    engine.scene?.remove(obj.group);
                                    delete engine.objects['division_label'];
                                }
                            }
                            
                            // Show division calculation text with WIDER canvas to prevent cutoff
                            const midCalcX = baseCenterX + (l + r) * 1.5 / 2;
                            const divisionText = `Divide: mid = (${l}+${r})/2 = ${m}`;
                            
                            // Create custom wider canvas for division text
                            const divCanvas = document.createElement('canvas');
                            const divCtx = divCanvas.getContext('2d');
                            divCanvas.width = 768; // Wider canvas to prevent text cutoff
                            divCanvas.height = 128;
                            divCtx.fillStyle = 'rgba(0,0,0,0)';
                            divCtx.fillRect(0, 0, 768, 128);
                            divCtx.font = 'bold 56px Arial'; // Slightly smaller font for better fit
                            divCtx.fillStyle = 'white';
                            divCtx.textAlign = 'center';
                            divCtx.shadowColor = 'rgba(0,0,0,0.8)';
                            divCtx.shadowBlur = 6;
                            divCtx.fillText(divisionText, 384, 80); // Center at 384 (half of 768)
                            
                            const divTex = new THREE.CanvasTexture(divCanvas);
                            const divMat = new THREE.SpriteMaterial({ map: divTex, transparent: true });
                            const divSprite = new THREE.Sprite(divMat);
                            divSprite.position.set(midCalcX, baseY + 3, 1);
                            divSprite.scale.set(8, 2, 1); // Wider scale to match wider canvas
                            
                            engine.scene.add(divSprite);
                            engine.objects['division_label'] = { group: divSprite, type: 'label' };
                            engine.highlight('division_label', 0x8b5cf6, 0.3); // Purple
                            await delay(800 / msSpeedRef.current); // Longer pause to read division
                            await pauseCheck();
                            
                            // Highlight left subarray
                            const leftRangeId = engine.arrayHighlightRange?.('ms_main', l, m, 0x3b82f6, 0.2);
                            addLog(`   ⬅️ Left: [${sortArr.slice(l, m + 1).join(', ')}]`);
                            await delay(800 / msSpeedRef.current); // Slowed down from 600
                            await pauseCheck();
                            
                            // Highlight right subarray
                            const rightRangeId = engine.arrayHighlightRange?.('ms_main', m + 1, r, 0xf59e0b, 0.2);
                            addLog(`   ➡️ Right: [${sortArr.slice(m + 1, r + 1).join(', ')}]`);
                            await delay(800 / msSpeedRef.current); // Slowed down from 600
                            await pauseCheck();
                            
                            // Remove division label before recursing
                            if (engine.objects?.['division_label']) {
                                const obj = engine.objects['division_label'];
                                if (obj.group) {
                                    engine.scene?.remove(obj.group);
                                    delete engine.objects['division_label'];
                                }
                            }
                            
                            // Clear range highlights
                            if (leftRangeId) engine.arrayClearRangeHighlight?.(leftRangeId);
                            if (rightRangeId) engine.arrayClearRangeHighlight?.(rightRangeId);
                            
                            // Recursively sort left and right
                            await mergeSort(sortArr, l, m, depth + 1);
                            await mergeSort(sortArr, m + 1, r, depth + 1);
                            
                            // Update depth label back after returning from recursion
                            await updateDepthLabel(depth);
                            
                            // === PHASE 4 & 5: MERGE WITH TEMPORARY ARRAYS ===
                            merges++;
                            setMsStats({ comparisons, merges, arrayAccesses });
                            
                            const leftArr = sortArr.slice(l, m + 1);
                            const rightArr = sortArr.slice(m + 1, r + 1);
                            
                            addLog(`🔀 Merge #${merges}: Merging [${leftArr.join(', ')}] + [${rightArr.join(', ')}]`);
                            
                            // Create visual temporary arrays above the main array
                            const tempY = baseY + 5;
                            const leftTempX = baseCenterX + l * 1.5;
                            const rightTempX = baseCenterX + (m + 1) * 1.5;
                            
                            // === PHASE 4: CREATE AND SHOW TEMPORARY ARRAYS ===
                            addLog(`   📦 Creating temporary arrays...`);
                            engine.createArrayAPI('temp_left', leftArr, leftTempX, tempY);
                            for (let idx = 0; idx < leftArr.length; idx++) {
                                engine.arrayHighlight('temp_left', idx, 0x60a5fa); // Light blue
                            }
                            await delay(600 / msSpeedRef.current); // Slowed down from 400
                            await pauseCheck();
                            
                            engine.createArrayAPI('temp_right', rightArr, rightTempX, tempY);
                            for (let idx = 0; idx < rightArr.length; idx++) {
                                engine.arrayHighlight('temp_right', idx, 0xfbbf24); // Light orange
                            }
                            await delay(600 / msSpeedRef.current); // Slowed down from 400
                            await pauseCheck();
                            
                            // === PHASE 6: CREATE POINTERS ===
                            let i = 0, j = 0, k = l;
                            
                            // Create pointer labels
                            engine.createRoundedCube('ptr_i', `i=${i}`, { x: leftTempX, y: tempY + 2, z: 0 });
                            engine.highlight('ptr_i', 0x3b82f6);
                            
                            engine.createRoundedCube('ptr_j', `j=${j}`, { x: rightTempX, y: tempY + 2, z: 0 });
                            engine.highlight('ptr_j', 0xf59e0b);
                            
                            const kX = baseCenterX + k * 1.5;
                            engine.createRoundedCube('ptr_k', `k=${k}`, { x: kX, y: baseY - 2, z: 0 });
                            engine.highlight('ptr_k', 0x8b5cf6); // Purple
                            
                            await delay(700 / msSpeedRef.current); // Slowed down from 500
                            await pauseCheck();
                            
                            // === PHASE 5: MERGE PROCESS ===
                            while (i < leftArr.length && j < rightArr.length) {
                                if (currentRunId !== msRunIdRef.current) throw new Error('Cancelled');
                                await pauseCheck();
                                
                                comparisons++;
                                arrayAccesses += 2;
                                setMsStats({ comparisons, merges, arrayAccesses });
                                
                                // Highlight comparison elements
                                engine.arrayHighlight('temp_left', i, 0x3b82f6); // Blue
                                engine.arrayHighlight('temp_right', j, 0xf59e0b); // Orange
                                
                                addLog(`   🔍 Compare: leftArr[${i}]=${leftArr[i]} vs rightArr[${j}]=${rightArr[j]}`);
                                await delay(800 / msSpeedRef.current);
                                
                                if (leftArr[i] <= rightArr[j]) {
                                    sortArr[k] = leftArr[i];
                                    addLog(`      ✅ ${leftArr[i]} ≤ ${rightArr[j]} → Place ${leftArr[i]} at main[${k}]`);
                                    
                                    // Update main array
                                    engine.arrayUpdate('ms_main', k, leftArr[i]);
                                    engine.arrayHighlight('ms_main', k, 0x22c55e); // Green
                                    
                                    // Update i pointer
                                    i++;
                                    arrayAccesses++;
                                    if (i < leftArr.length) {
                                        const newIX = leftTempX + i * 1.5;
                                        if (engine.objects?.['ptr_i']) {
                                            engine.scene?.remove(engine.objects['ptr_i'].group);
                                            delete engine.objects['ptr_i'];
                                        }
                                        engine.createRoundedCube('ptr_i', `i=${i}`, { x: newIX, y: tempY + 2, z: 0 });
                                        engine.highlight('ptr_i', 0x3b82f6);
                                    }
                                } else {
                                    sortArr[k] = rightArr[j];
                                    addLog(`      ✅ ${leftArr[i]} > ${rightArr[j]} → Place ${rightArr[j]} at main[${k}]`);
                                    
                                    // Update main array
                                    engine.arrayUpdate('ms_main', k, rightArr[j]);
                                    engine.arrayHighlight('ms_main', k, 0x22c55e); // Green
                                    
                                    // Update j pointer
                                    j++;
                                    arrayAccesses++;
                                    if (j < rightArr.length) {
                                        const newJX = rightTempX + j * 1.5;
                                        if (engine.objects?.['ptr_j']) {
                                            engine.scene?.remove(engine.objects['ptr_j'].group);
                                            delete engine.objects['ptr_j'];
                                        }
                                        engine.createRoundedCube('ptr_j', `j=${j}`, { x: newJX, y: tempY + 2, z: 0 });
                                        engine.highlight('ptr_j', 0xf59e0b);
                                    }
                                }
                                
                                arrayAccesses++;
                                setMsStats({ comparisons, merges, arrayAccesses });
                                
                                // Update k pointer
                                k++;
                                const newKX = baseCenterX + k * 1.5;
                                if (engine.objects?.['ptr_k']) {
                                    engine.scene?.remove(engine.objects['ptr_k'].group);
                                    delete engine.objects['ptr_k'];
                                }
                                if (k <= r) {
                                    engine.createRoundedCube('ptr_k', `k=${k}`, { x: newKX, y: baseY - 2, z: 0 });
                                    engine.highlight('ptr_k', 0x8b5cf6);
                                }
                                
                                await delay(600 / msSpeedRef.current);
                                await pauseCheck();
                            }
                            
                            // Copy remaining elements from left
                            while (i < leftArr.length) {
                                if (currentRunId !== msRunIdRef.current) throw new Error('Cancelled');
                                await pauseCheck();
                                
                                sortArr[k] = leftArr[i];
                                addLog(`   📥 Copy remaining: leftArr[${i}]=${leftArr[i]} → main[${k}]`);
                                engine.arrayUpdate('ms_main', k, leftArr[i]);
                                engine.arrayHighlight('ms_main', k, 0x22c55e);
                                arrayAccesses += 2;
                                setMsStats({ comparisons, merges, arrayAccesses });
                                i++;
                                k++;
                                await delay(400 / msSpeedRef.current);
                            }
                            
                            // Copy remaining elements from right
                            while (j < rightArr.length) {
                                if (currentRunId !== msRunIdRef.current) throw new Error('Cancelled');
                                await pauseCheck();
                                
                                sortArr[k] = rightArr[j];
                                addLog(`   📥 Copy remaining: rightArr[${j}]=${rightArr[j]} → main[${k}]`);
                                engine.arrayUpdate('ms_main', k, rightArr[j]);
                                engine.arrayHighlight('ms_main', k, 0x22c55e);
                                arrayAccesses += 2;
                                setMsStats({ comparisons, merges, arrayAccesses });
                                j++;
                                k++;
                                await delay(400 / msSpeedRef.current);
                            }
                            
                            addLog(`✅ Merged range [${l}..${r}]: [${sortArr.slice(l, r + 1).join(', ')}]`);
                            
                            // === CLEANUP: Remove temporary arrays and pointers ===
                            await delay(600 / msSpeedRef.current);
                            
                            // Remove temp arrays
                            if (engine.arrays?.['temp_left']) {
                                for (const cellId of engine.arrays['temp_left'].cells) {
                                    if (engine.objects?.[cellId]?.group) {
                                        engine.scene?.remove(engine.objects[cellId].group);
                                        delete engine.objects[cellId];
                                    }
                                }
                                delete engine.arrays['temp_left'];
                            }
                            if (engine.arrays?.['temp_right']) {
                                for (const cellId of engine.arrays['temp_right'].cells) {
                                    if (engine.objects?.[cellId]?.group) {
                                        engine.scene?.remove(engine.objects[cellId].group);
                                        delete engine.objects[cellId];
                                    }
                                }
                                delete engine.arrays['temp_right'];
                            }
                            
                            // Remove pointers
                            ['ptr_i', 'ptr_j', 'ptr_k'].forEach(ptrId => {
                                if (engine.objects?.[ptrId]) {
                                    engine.scene?.remove(engine.objects[ptrId].group);
                                    delete engine.objects[ptrId];
                                }
                            });
                            
                            // Dim merged section back to normal
                            for (let idx = l; idx <= r; idx++) {
                                engine.arrayHighlight('ms_main', idx, 0x666666);
                            }
                            
                            await delay(400 / msSpeedRef.current);
                        };
                        
                        // Run merge sort
                        (async () => {
                            try {
                                await delay(500 / msSpeedRef.current);
                                await mergeSort(arr, 0, arr.length - 1, 0);
                                
                                // === FINAL STATE ===
                                addLog(`🎉 Merge Sort Complete!`);
                                addLog(`📊 Final Stats:`);
                                addLog(`   - Comparisons: ${comparisons}`);
                                addLog(`   - Array Accesses: ${arrayAccesses}`);
                                addLog(`   - Merges: ${merges}`);
                                addLog(`✅ Sorted Array: [${arr.join(', ')}]`);
                                
                                // Highlight entire array in green
                                for (let i = 0; i < arr.length; i++) {
                                    engine.arrayHighlight('ms_main', i, 0x00ff00);
                                }
                                
                                // Clean up depth label
                                if (depthLabelId) {
                                    engine.arrayClearLabel(depthLabelId);
                                }
                                
                                setMsIsRunning(false);
                                setMsRecursionDepth(0);
                            } catch (error) {
                                if (error.message === 'Cancelled') {
                                    addLog(`⏸️ Merge Sort cancelled`);
                                } else {
                                    addLog(`❌ Error: ${error.message}`);
                                }
                                setMsIsRunning(false);
                                setMsRecursionDepth(0);
                            }
                        })();
                        
                    } else if (operation === 'Pause') {
                        msPausedRef.current = true;
                        setMsIsPaused(true);
                        addLog(`⏸️ Animation paused`);
                    } else if (operation === 'Resume') {
                        msPausedRef.current = false;
                        setMsIsPaused(false);
                        addLog(`▶️ Animation resumed`);
                    } else if (operation === 'Reset') {
                        msRunIdRef.current += 1; // Cancel any running operations
                        engine.reset();
                        setMsIsRunning(false);
                        setMsIsPaused(false);
                        msPausedRef.current = false;
                        setMsStats({ comparisons: 0, merges: 0, arrayAccesses: 0 });
                        setMsRecursionDepth(0);
                        setMsMaxDepth(0);
                        addLog(`🔄 Scene reset`);
                    }
                    break;

                case 'dijkstra':
                    if (operation === 'Run') {
                        // Block if already running
                        if (dijkstraIsRunning) {
                            addLog(`⚠️ Dijkstra already running. Wait or Reset first.`);
                            break;
                        }
                        
                        engine.reset();
                        engine.graphResetLayout?.();
                        
                        // === GRAPH INPUT RESOLUTION ===
                        let nodes, edges, startNodeIndex;
                        
                        if (dijkstraInputMode === 'preset') {
                            // Use preset graph
                            const presets = getDijkstraPresets();
                            const preset = presets[dijkstraSelectedPreset];
                            if (!preset) {
                                addLog(`❌ Invalid preset: ${dijkstraSelectedPreset}`);
                                break;
                            }
                            nodes = preset.nodes;
                            edges = preset.edges;
                            addLog(`📦 Using preset: ${preset.name}`);
                            addLog(`   ${preset.description}`);
                        } else {
                            // Use manual input
                            const parseResult = parseDijkstraInput(dijkstraNodesInput, dijkstraEdgesInput);
                            
                            if (!parseResult.valid) {
                                setDijkstraValidationError(parseResult.errors[0]);
                                addLog(`❌ Input validation failed:`);
                                parseResult.errors.forEach(err => addLog(`   - ${err}`));
                                break;
                            }
                            
                            nodes = parseResult.nodes;
                            edges = parseResult.edges;
                            setDijkstraValidationError(null);
                            
                            // Show warnings if any
                            if (parseResult.warnings.length > 0) {
                                setDijkstraValidationWarnings(parseResult.warnings);
                                parseResult.warnings.forEach(warn => addLog(`⚠️ ${warn}`));
                            } else {
                                setDijkstraValidationWarnings([]);
                            }
                            
                            addLog(`📝 Using custom graph input`);
                        }
                        
                        // Validate start node
                        startNodeIndex = nodes.indexOf(dijkstraStartNode);
                        if (startNodeIndex === -1) {
                            addLog(`❌ Start node "${dijkstraStartNode}" not found in nodes list`);
                            addLog(`   Available nodes: ${nodes.join(', ')}`);
                            break;
                        }
                        
                        // === GRAPH CONSTRUCTION ===
                        // Convert edges from label-based to index-based
                        const indexedEdges = edges.map(([from, to, weight]) => [
                            nodes.indexOf(from),
                            nodes.indexOf(to),
                            weight
                        ]);
                        
                        // Build adjacency list for efficient neighbor lookup
                        const adjacencyList = {};
                        nodes.forEach((_, i) => adjacencyList[i] = []);
                        indexedEdges.forEach(([u, v, w]) => {
                            adjacencyList[u].push({ to: v, weight: w });
                        });
                        
                        // Create nodes visually
                        nodes.forEach((label, i) => {
                            engine.graphCreateNode(`dij_${i}`, label);
                            // Initialize all nodes as unvisited (gray)
                            engine.highlight(`dij_${i}`, 0x666666);
                        });
                        
                        // Create weighted edges visually
                        indexedEdges.forEach(([u, v, w]) => {
                            engine.graphConnectWeighted(`dij_${u}`, `dij_${v}`, w);
                        });
                        
                        // === STATE INITIALIZATION ===
                        dijkstraRunIdRef.current += 1;
                        const currentRunId = dijkstraRunIdRef.current;
                        setDijkstraIsRunning(true);
                        setDijkstraIsPaused(false);
                        dijkstraPausedRef.current = false;
                        dijkstraSpeedRef.current = dijkstraSpeed;
                        setDijkstraStats({ visited: 0, relaxed: 0, queueSize: 0 });
                        
                        addLog(`🚀 Dijkstra's Algorithm from Node ${dijkstraStartNode}`);
                        addLog(`📊 Graph: ${nodes.length} nodes, ${indexedEdges.length} edges`);
                        
                        // === MIN-HEAP PRIORITY QUEUE IMPLEMENTATION ===
                        class MinHeap {
                            constructor() {
                                this.heap = [];
                            }
                            
                            insert(node, dist) {
                                this.heap.push({ node, dist });
                                this._bubbleUp(this.heap.length - 1);
                            }
                            
                            extractMin() {
                                if (this.heap.length === 0) return null;
                                if (this.heap.length === 1) return this.heap.pop();
                                
                                const min = this.heap[0];
                                this.heap[0] = this.heap.pop();
                                this._bubbleDown(0);
                                return min;
                            }
                            
                            isEmpty() {
                                return this.heap.length === 0;
                            }
                            
                            size() {
                                return this.heap.length;
                            }
                            
                            _bubbleUp(index) {
                                while (index > 0) {
                                    const parentIndex = Math.floor((index - 1) / 2);
                                    if (this.heap[index].dist >= this.heap[parentIndex].dist) break;
                                    [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
                                    index = parentIndex;
                                }
                            }
                            
                            _bubbleDown(index) {
                                while (true) {
                                    const leftChild = 2 * index + 1;
                                    const rightChild = 2 * index + 2;
                                    let smallest = index;
                                    
                                    if (leftChild < this.heap.length && this.heap[leftChild].dist < this.heap[smallest].dist) {
                                        smallest = leftChild;
                                    }
                                    if (rightChild < this.heap.length && this.heap[rightChild].dist < this.heap[smallest].dist) {
                                        smallest = rightChild;
                                    }
                                    if (smallest === index) break;
                                    
                                    [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
                                    index = smallest;
                                }
                            }
                            
                            getContents() {
                                return this.heap.map(item => `(${nodes[item.node]}, ${item.dist})`).join(', ');
                            }
                        }
                        
                        // === DIJKSTRA ALGORITHM (runDijkstra) ===
                        const runDijkstra = async (startNode) => {
                            // Adjust Camera for best view of Graph + Top Label
                            if (engine && engine.camera) {
                                gsap.to(engine.camera.position, { 
                                    x: 0, y: 12, z: 40, // Adjusted for lower label position
                                    duration: 1.5, 
                                    ease: "power2.inOut" 
                                });
                                gsap.to(engine.controls.target, { 
                                    x: 0, y: 3, z: 0, // Look at center of view
                                    duration: 1.5 
                                });
                            }

                            const distances = {};
                            const parent = {}; // For path reconstruction
                            const finalized = new Set(); // Track finalized nodes
                            const pq = new MinHeap();
                            
                            // Initialize distances
                            nodes.forEach((_, i) => {
                                distances[i] = Infinity;
                                parent[i] = null;
                            });
                            distances[startNode] = 0;
                            pq.insert(startNode, 0);
                            
                            // Create GLOBAL Path Label (World Space - Lower for better visibility)
                            const globalLabelId = 'global_path_label';
                            engine.createSmartLabel(globalLabelId, `Starting from ${nodes[startNode]}`, null, {
                                offset: { x: 18, y: 10, z: 0 }, // Moved to the right
                                color: 0x1e3a8a, 
                                scale: 1.5 // Larger for distance visibility
                            });

                            // Create distance labels for all nodes (Format: [Node, Dist])
                            const distanceLabelIds = [];
                            for (let i = 0; i < nodes.length; i++) {
                                const labelId = `dist_label_${i}`;
                                const distText = i === startNode ? '0' : '∞';
                                const labelText = `[${nodes[i]}, ${distText}]`;
                                // Attach to the graph node "dij_i"
                                engine.createSmartLabel(labelId, labelText, `dij_${i}`, {
                                    offset: { x: 0, y: 1.6, z: 0 },
                                    color: 0x333333,
                                    scale: 1.3, // Increased for better visibility
                                    transparentBackground: true // Text only visual
                                });
                                distanceLabelIds.push(labelId);
                            }

                            
                            await delay(800 / dijkstraSpeedRef.current);
                            
                            let visited = 0;
                            let relaxed = 0;
                            
                            // Pause check helper
                            const pauseCheck = async () => {
                                while (dijkstraPausedRef.current) {
                                    await delay(100);
                                    if (currentRunId !== dijkstraRunIdRef.current) throw new Error('Cancelled');
                                }
                            };
                            
                            // Main Dijkstra loop
                            while (!pq.isEmpty()) {
                                if (currentRunId !== dijkstraRunIdRef.current) throw new Error('Cancelled');
                                await pauseCheck();
                                
                                // Visualize current PQ state
                                const pqContents = pq.getContents();
                                addLog(`📋 Priority Queue: [${pqContents}]`);
                                setDijkstraStats({ visited, relaxed, queueSize: pq.size() });
                                
                                // Extract min
                                const { node: u, dist: d } = pq.extractMin();
                                
                                // Skip if already finalized or stale entry
                                if (finalized.has(u) || d > distances[u]) {
                                    addLog(`⏭️ Skipping ${nodes[u]} (already finalized or stale)`);
                                    continue;
                                }
                                
                                // Mark node as current (yellow)
                                engine.highlight(`dij_${u}`, 0xfacc15);
                                engine.pulse(`dij_${u}`);
                                addLog(`📍 Processing Node ${nodes[u]} (distance: ${d})`);
                                await delay(800 / dijkstraSpeedRef.current);
                                await pauseCheck();
                                
                                visited++;
                                
                                // Process all neighbors using adjacency list
                                const neighbors = adjacencyList[u] || [];
                                for (const { to: v, weight } of neighbors) {
                                    if (currentRunId !== dijkstraRunIdRef.current) throw new Error('Cancelled');
                                    await pauseCheck();
                                    
                                    // Skip if already finalized
                                    if (finalized.has(v)) {
                                        addLog(`  ⏭️ ${nodes[v]} already finalized, skipping`);
                                        continue;
                                    }
                                    
                                    // Highlight edge being evaluated
                                    engine.highlightEdge(`dij_${u}`, `dij_${v}`, 0xffff00);
                                    engine.highlight(`dij_${v}`, 0x3b82f6); // In-PQ color (blue)
                                    addLog(`  🔍 Checking edge ${nodes[u]} → ${nodes[v]} (weight: ${weight})`);
                                    await delay(600 / dijkstraSpeedRef.current);
                                    
                                    // Calculate new distance
                                    const newDist = distances[u] + weight;
                                    const oldDist = distances[v];
                                    addLog(`  📐 New dist = ${distances[u]} + ${weight} = ${newDist}, Current = ${oldDist === Infinity ? '∞' : oldDist}`);
                                    
                                    // Relaxation check
                                    if (newDist < distances[v]) {
                                        // SUCCESS: Relaxation
                                        distances[v] = newDist;
                                        parent[v] = u;
                                        pq.insert(v, newDist);
                                        relaxed++;
                                        
                                        // Animate successful relaxation
                                        engine.highlightEdge(`dij_${u}`, `dij_${v}`, 0x00ff00); // Green
                                        engine.pulse(`dij_${v}`);
                                        
                                        // Trace path backwards to build string for GLOBAL label
                                        const tempPath = [];
                                        let curr = v;
                                        let safety = 0;
                                        while (curr !== null && safety < 50) {
                                            tempPath.unshift(nodes[curr]);
                                            curr = parent[curr];
                                            safety++;
                                        }
                                        const pathStr = tempPath.join(' → ');
                                        
                                        // Update GLOBAL label
                                        engine.updateSmartLabel(globalLabelId, `${pathStr} → ${nodes[v]} (Dist: ${newDist})`);

                                        // Update NODE label: [Name, Dist]
                                        const labelId = `dist_label_${v}`;
                                        engine.updateSmartLabel(labelId, `[${nodes[v]}, ${newDist}]`);
                                        // Highlight the update

                                        // engine.highlight(labelId, 0x00ff00); // Optional visual pop

                                        
                                        addLog(`  ✅ Relaxed! New distance to ${nodes[v]}: ${newDist}`);
                                        setDijkstraStats({ visited, relaxed, queueSize: pq.size() });
                                        await delay(700 / dijkstraSpeedRef.current);
                                    } else {
                                        // FAILURE: No relaxation
                                        engine.highlightEdge(`dij_${u}`, `dij_${v}`, 0xff0000); // Red flash
                                        addLog(`  ❌ No relaxation: existing ${oldDist === Infinity ? '∞' : oldDist} ≤ new ${newDist}`);
                                        await delay(500 / dijkstraSpeedRef.current);
                                        
                                        // Restore edge color
                                        engine.highlightEdge(`dij_${u}`, `dij_${v}`, 0x666666);
                                    }
                                }
                                
                                // Finalize current node (green)
                                finalized.add(u);
                                engine.highlight(`dij_${u}`, 0x10b981);
                                addLog(`✅ Finalized ${nodes[u]} with shortest distance ${distances[u]}`);
                                
                                // Dim outgoing edges from finalized node
                                const outEdges = adjacencyList[u] || [];
                                for (const { to: v } of outEdges) {
                                    if (finalized.has(v)) {
                                        engine.highlightEdge(`dij_${u}`, `dij_${v}`, 0x444444);
                                    }
                                }
                                
                                await delay(600 / dijkstraSpeedRef.current);
                            }
                            
                            // === PATH RECONSTRUCTION ===
                            addLog(`🎉 Algorithm Complete!`);
                            addLog(`📊 Final Stats: ${visited} nodes visited, ${relaxed} edges relaxed`);
                            await delay(500 / dijkstraSpeedRef.current);
                            
                            // Build final paths object
                            const finalPaths = {
                                source: nodes[startNode],
                                destinations: [],
                                stats: { visited, relaxed }
                            };
                            
                            addLog(`🛤️ Reconstructing shortest paths...`);
                            for (let v = 0; v < nodes.length; v++) {
                                if (v === startNode) continue;
                                if (distances[v] === Infinity) {
                                    addLog(`  ❌ ${nodes[v]}: Unreachable`);
                                    finalPaths.destinations.push({
                                        node: nodes[v],
                                        distance: Infinity,
                                        path: null,
                                        reachable: false
                                    });
                                    continue;
                                }
                                
                                // Trace path backwards
                                const path = [];
                                let current = v;
                                while (current !== null) {
                                    path.unshift(current);
                                    current = parent[current];
                                }
                                
                                // Store path info
                                const pathLabels = path.map(i => nodes[i]);
                                const pathStr = pathLabels.join(' → ');
                                finalPaths.destinations.push({
                                    node: nodes[v],
                                    distance: distances[v],
                                    path: pathLabels,
                                    pathStr: pathStr,
                                    reachable: true
                                });
                                
                                addLog(`  ✅ ${nodes[v]}: ${pathStr} (distance: ${distances[v]})`);
                                
                                // Highlight path edges with thick green
                                for (let i = 0; i < path.length - 1; i++) {
                                    engine.highlightEdge(`dij_${path[i]}`, `dij_${path[i + 1]}`, 0x22c55e);
                                }
                                await delay(400 / dijkstraSpeedRef.current);
                            }
                            
                            // Save final paths to state
                            setDijkstraFinalPaths(finalPaths);
                            
                            addLog(`✅ Dijkstra's Algorithm Complete!`);
                            // Construct final answer string with PATHS (line by line)
                            const results = finalPaths.destinations
                                .filter(d => d.reachable)
                                .map(d => `${d.node}:${d.distance} (${d.pathStr})`)
                                .join('\n');
                            
                            engine.updateSmartLabel(globalLabelId, `Final Answers:\n${results}`);
                            setDijkstraIsRunning(false);
                            
                            // Clean up global label after 5s? Or keep it? User said "on top of full graph".
                            // Let's keep it until reset.
                        };
                        
                        // Execute algorithm
                        (async () => {
                            try {
                                await runDijkstra(startNodeIndex); // Start from selected node
                            } catch (error) {
                                if (error.message === 'Cancelled') {
                                    addLog(`⏸️ Dijkstra cancelled`);
                                } else {
                                    addLog(`❌ Error: ${error.message}`);
                                }
                                setDijkstraIsRunning(false);
                            }
                        })();
                        
                    } else if (operation === 'Pause') {
                        dijkstraPausedRef.current = true;
                        setDijkstraIsPaused(true);
                        addLog(`⏸️ Dijkstra paused`);
                    } else if (operation === 'Resume') {
                        dijkstraPausedRef.current = false;
                        setDijkstraIsPaused(false);
                        addLog(`▶️ Dijkstra resumed`);
                    } else if (operation === 'Reset') {
                        dijkstraRunIdRef.current += 1; // Cancel any running operations
                        engine.reset();
                        // Also clear global label if it exists (engine.reset() DOES clear all objects, so we are good)
                        setDijkstraIsRunning(false);
                        setDijkstraIsPaused(false);
                        dijkstraPausedRef.current = false;
                        setDijkstraStats({ visited: 0, relaxed: 0, queueSize: 0 });
                        setDijkstraFinalPaths(null); // Clear final paths
                        addLog(`🔄 Scene reset`);
                    }
                    break;

                default:
                    addLog(`⚠️ Operation ${operation} not implemented for ${itemId}`);
            }
        } catch (e) {
            addLog(`❌ Error: ${e.message}`);
            console.error(e);
        }
    };

    const handleItemClick = (item, type) => {
        setSelectedItem({ ...item, type });
        setShowPlayground(true);
        setLogs([]);
        setCustomInput(getDefaultInput(item.id));
    };

    const handleBack = () => {
        setShowPlayground(false);
        setSelectedItem(null);
        if (engineRef.current) engineRef.current.reset();
    };

    // Playground view
    if (showPlayground && selectedItem) {
        return (
            <div className="w-full h-screen bg-[#000510] text-slate-200 font-sans overflow-hidden relative">
                <canvas ref={canvasRef} className="fixed top-0 left-0 block" style={{ width: '100vw', height: '100vh', zIndex: 1 }} />

                {/* Control Panel - Left Side */}
                <div className="absolute top-20 left-6 z-20 w-80 bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header with Back button */}
                    <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-indigo-600/20 to-violet-600/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{selectedItem.icon}</span>
                                <div>
                                    <h2 className="font-bold text-white">{selectedItem.name}</h2>
                                    <p className="text-xs text-slate-400">{selectedItem.description}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleBack}
                                className="p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm font-medium transition-all flex items-center gap-1"
                                title="Back to DSA"
                            >
                                <ChevronLeft size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Custom Input - Special handling for DFS, BFS, and Dijkstra */}
                    {selectedItem.id === 'dfs' || selectedItem.id === 'bfs' || selectedItem.id === 'dijkstra' ? (
                        <div className="p-4 border-b border-slate-700">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Graph Source</label>
                                <div className="flex bg-slate-800 rounded p-0.5">
                                    <button
                                        onClick={() => {
                                            if (selectedItem.id === 'dfs') setDfsInputMode('preset');
                                            else if (selectedItem.id === 'bfs') setBfsInputMode('preset');
                                            else setDijkstraInputMode('preset');
                                        }}
                                        className={`px-2 py-0.5 text-[10px] font-medium rounded ${
                                            (selectedItem.id === 'dfs' ? dfsInputMode : (selectedItem.id === 'bfs' ? bfsInputMode : dijkstraInputMode)) === 'preset' 
                                                ? 'bg-slate-600 text-white' 
                                                : 'text-slate-400 hover:text-slate-300'
                                        }`}
                                    >
                                        Preset
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (selectedItem.id === 'dfs') setDfsInputMode('manual');
                                            else if (selectedItem.id === 'bfs') setBfsInputMode('manual');
                                            else setDijkstraInputMode('manual');
                                        }}
                                        className={`px-2 py-0.5 text-[10px] font-medium rounded ${
                                            (selectedItem.id === 'dfs' ? dfsInputMode : (selectedItem.id === 'bfs' ? bfsInputMode : dijkstraInputMode)) === 'manual' 
                                                ? 'bg-slate-600 text-white' 
                                                : 'text-slate-400 hover:text-slate-300'
                                        }`}
                                    >
                                        Manual
                                    </button>
                                </div>
                            </div>
                            
                            {(selectedItem.id === 'dfs' ? dfsInputMode : (selectedItem.id === 'bfs' ? bfsInputMode : dijkstraInputMode)) === 'preset' ? (
                                <>
                                    <select
                                        value={selectedItem.id === 'dfs' ? dfsSelectedPreset : (selectedItem.id === 'bfs' ? bfsSelectedPreset : dijkstraSelectedPreset)}
                                        onChange={(e) => {
                                            if (selectedItem.id === 'dfs') setDfsSelectedPreset(e.target.value);
                                            else if (selectedItem.id === 'bfs') setBfsSelectedPreset(e.target.value);
                                            else setDijkstraSelectedPreset(e.target.value);
                                        }}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-sm focus:border-indigo-500 outline-none"
                                    >
                                        {selectedItem.id === 'dijkstra' ? (
                                            <>
                                                <option value="simple-path">🛤️ Simple Path (5 nodes)</option>
                                                <option value="diamond">💎 Diamond Graph (5 nodes)</option>
                                                <option value="complex">🕸️ Complex Network (7 nodes)</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="simple-tree">📊 Simple Tree (6 nodes)</option>
                                                <option value="cyclic">🔄 Cyclic Graph (5 nodes)</option>
                                                <option value="disconnected">💔 Disconnected Graph (8 nodes)</option>
                                                <option value="dense">🕸️ Dense Graph (7 nodes)</option>
                                            </>
                                        )}
                                    </select>
                                    <p className="text-xs text-slate-500 mt-2">
                                        {selectedItem.id === 'dijkstra' ? (
                                            <>
                                                {dijkstraSelectedPreset === 'simple-path' && 'Linear path with decreasing weights'}
                                                {dijkstraSelectedPreset === 'diamond' && 'Multiple paths demonstrating shortest path selection'}
                                                {dijkstraSelectedPreset === 'complex' && 'Dense graph with multiple shortest paths'}
                                            </>
                                        ) : (
                                            <>
                                                {(selectedItem.id === 'dfs' ? dfsSelectedPreset : bfsSelectedPreset) === 'simple-tree' && 'Basic tree structure - good for learning traversal'}
                                                {(selectedItem.id === 'dfs' ? dfsSelectedPreset : bfsSelectedPreset) === 'cyclic' && 'Graph with cycles - see visited checking in action'}
                                                {(selectedItem.id === 'dfs' ? dfsSelectedPreset : bfsSelectedPreset) === 'disconnected' && 'Multiple components - partial traversal'}
                                                {(selectedItem.id === 'dfs' ? dfsSelectedPreset : bfsSelectedPreset) === 'dense' && 'Many edges - complex neighbor handling'}
                                            </>
                                        )}
                                    </p>
                                </>
                            ) : (
                                <div className="space-y-3">
                                    {selectedItem.id === 'dijkstra' ? (
                                        <>
                                            {/* Dijkstra: Nodes Input */}
                                            <div>
                                                <label className="text-[10px] font-medium text-slate-500 block mb-1">Nodes (comma-separated)</label>
                                                <input
                                                    type="text"
                                                    value={dijkstraNodesInput}
                                                    onChange={(e) => setDijkstraNodesInput(e.target.value)}
                                                    placeholder="A, B, C, D, E"
                                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-xs font-mono outline-none focus:border-indigo-500"
                                                />
                                            </div>
                                            {/* Dijkstra: Weighted Edges Input */}
                                            <div>
                                                <label className="text-[10px] font-medium text-slate-500 block mb-1">Weighted Edges (JSON)</label>
                                                <textarea
                                                    value={dijkstraEdgesInput}
                                                    onChange={(e) => setDijkstraEdgesInput(e.target.value)}
                                                    placeholder='[["A","B",4], ["A","C",2]]'
                                                    className={`w-full h-24 px-3 py-2 bg-slate-800 border rounded-lg text-slate-200 text-xs font-mono outline-none resize-none ${
                                                        dijkstraValidationError
                                                            ? 'border-red-500/50 focus:border-red-500'
                                                            : 'border-slate-600 focus:border-indigo-500'
                                                    }`}
                                                />
                                                {dijkstraValidationError && (
                                                    <p className="text-[10px] text-red-400 mt-1">{dijkstraValidationError}</p>
                                                )}
                                                <p className="text-[10px] text-slate-500 mt-1">Format: [[from, to, weight], ...]</p>
                                            </div>
                                            {/* Dijkstra: Start Node */}
                                            <div>
                                                <label className="text-[10px] font-medium text-slate-500 block mb-1">Start Node</label>
                                                <input
                                                    type="text"
                                                    value={dijkstraStartNode}
                                                    onChange={(e) => setDijkstraStartNode(e.target.value)}
                                                    placeholder="A"
                                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-sm focus:border-indigo-500 outline-none"
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* DFS/BFS: Adjacency List */}
                                            <div>
                                                <label className="text-[10px] font-medium text-slate-500 block mb-1">Adjacency List (JSON)</label>
                                                <textarea
                                                    value={selectedItem.id === 'dfs' ? dfsAdjList : bfsAdjList}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (selectedItem.id === 'dfs') {
                                                            setDfsAdjList(val);
                                                            const validation = validateAdjacencyList(val);
                                                            setDfsValidationError(validation.valid ? null : validation.error);
                                                        } else {
                                                            setBfsAdjList(val);
                                                            const validation = validateAdjacencyList(val);
                                                            setBfsValidationError(validation.valid ? null : validation.error);
                                                        }
                                                    }}
                                                    placeholder='{"A": ["B", "C"], "B": ["D"]}'
                                                    className={`w-full h-24 px-3 py-2 bg-slate-800 border rounded-lg text-slate-200 text-xs font-mono outline-none resize-none ${
                                                        (selectedItem.id === 'dfs' ? dfsValidationError : bfsValidationError)
                                                            ? 'border-red-500/50 focus:border-red-500'
                                                            : 'border-slate-600 focus:border-indigo-500'
                                                    }`}
                                                />
                                                {(selectedItem.id === 'dfs' ? dfsValidationError : bfsValidationError) && (
                                                    <p className="text-[10px] text-red-400 mt-1">{(selectedItem.id === 'dfs' ? dfsValidationError : bfsValidationError)}</p>
                                                )}
                                            </div>
                                            {/* DFS/BFS: Start Node */}
                                            <div>
                                                <label className="text-[10px] font-medium text-slate-500 block mb-1">Start Node</label>
                                                <input
                                                    type="text"
                                                    value={selectedItem.id === 'dfs' ? dfsStartNode : bfsStartNode}
                                                    onChange={(e) => {
                                                        if (selectedItem.id === 'dfs') setDfsStartNode(e.target.value);
                                                        else setBfsStartNode(e.target.value);
                                                    }}
                                                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-sm focus:border-indigo-500 outline-none"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-4 border-b border-slate-700">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">Initial Values</label>
                            <input
                                type="text"
                                value={customInput}
                                onChange={(e) => setCustomInput(e.target.value)}
                                placeholder="1, 2, 3, 4, 5"
                                className="w-full mt-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-sm focus:border-indigo-500 outline-none"
                            />
                        </div>
                    )}

                    {/* Operation Params - Conditional for different algorithms */}
                    <div className="p-4 border-b border-slate-700 grid grid-cols-2 gap-3">
                        {/* Index / Node 1 - Hide for Binary Search */}
                        {selectedItem.id !== 'binary_search' && (
                            <div>
                                <label className="text-xs font-medium text-slate-400">
                                    {selectedItem.id === 'graph' ? 'Node 1' : 'Index'}
                                </label>
                                <input
                                    type={selectedItem.id === 'graph' ? "text" : "number"}
                                    value={operationIndex}
                                    onChange={(e) => setOperationIndex(e.target.value)}
                                    placeholder={selectedItem.id === 'graph' ? "A" : "0"}
                                    className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-sm focus:border-indigo-500 outline-none"
                                />
                            </div>
                        )}
                        {/* Value / Target / Node 2 - Full width for Binary Search */}
                        <div className={selectedItem.id === 'binary_search' ? 'col-span-2' : ''}>
                            <label className="text-xs font-medium text-slate-400">
                                {selectedItem.id === 'graph' ? 'Node 2' : (selectedItem.id === 'binary_search' ? 'Target Value' : 'Value')}
                            </label>
                            <input
                                type="text"
                                value={operationValue}
                                onChange={(e) => setOperationValue(e.target.value)}
                                placeholder={selectedItem.id === 'graph' ? "B" : (selectedItem.id === 'binary_search' ? 'Enter target to search' : '10')}
                                className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-sm focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Operations */}
                    <div className="p-4">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3 block">Operations</label>
                        <div className="grid grid-cols-2 gap-2">
                            {getOperations(selectedItem.id).map((op) => (
                                <button
                                    key={op}
                                    onClick={() => executeOperation(op)}
                                    className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/50 rounded-lg text-sm font-medium text-indigo-300 transition-all"
                                >
                                    {op}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tower of Hanoi Controls - Only show when Hanoi is selected */}
                    {selectedItem.id === 'tower_of_hanoi' && (
                        <div className="p-4 border-b border-slate-700 space-y-4">
                            {/* Speed Control */}
                            <div>
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide flex justify-between">
                                    <span>Animation Speed</span>
                                    <span className="text-indigo-400">{hanoiSpeed}x</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="5"
                                    step="0.5"
                                    value={hanoiSpeed}
                                    onChange={(e) => { const v = parseFloat(e.target.value); setHanoiSpeed(v); hanoiSpeedRef.current = v; }}
                                    className="w-full mt-2 accent-indigo-500"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>0.5x</span>
                                    <span>5x</span>
                                </div>
                            </div>
                            
                            {/* Step Counter */}
                            {hanoiTotalMoves > 0 && (
                                <div className="bg-slate-800/50 rounded-lg p-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-medium text-slate-400">Progress</span>
                                        <span className="text-sm font-bold text-indigo-400">
                                            {hanoiMoveCount} / {hanoiTotalMoves}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-2">
                                        <div 
                                            className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${(hanoiMoveCount / hanoiTotalMoves) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                            
                            {/* Status Indicator */}
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${hanoiIsRunning ? (hanoiIsPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse') : 'bg-slate-500'}`} />
                                <span className="text-xs text-slate-400">
                                    {hanoiIsRunning ? (hanoiIsPaused ? 'Paused' : 'Running...') : 'Ready'}
                                </span>
                            </div>
                            
                            {/* Recursion Depth */}
                            {hanoiRecursionDepth > 0 && (
                                <div className="bg-slate-800/50 rounded-lg p-3">
                                    <span className="text-xs font-medium text-slate-400 block mb-1">Recursion Depth</span>
                                    <div className="flex items-center gap-1">
                                        {[...Array(hanoiRecursionDepth)].map((_, i) => (
                                            <div 
                                                key={i}
                                                className="w-4 h-4 rounded-sm"
                                                style={{ 
                                                    backgroundColor: `hsl(${270 - i * 30}, 70%, 50%)`,
                                                    opacity: 0.7 + (i * 0.1)
                                                }}
                                            />
                                        ))}
                                        <span className="text-sm font-bold text-violet-400 ml-2">{hanoiRecursionDepth}</span>
                                    </div>
                                </div>
                            )}
                            
                            {/* Recursion Stack (Last 3 entries) */}
                            {hanoiRecursionStack.length > 0 && (
                                <div className="bg-slate-800/50 rounded-lg p-3">
                                    <span className="text-xs font-medium text-slate-400 block mb-2">Recursion Stack</span>
                                    <div className="space-y-1 font-mono text-xs">
                                        {hanoiRecursionStack.slice(-3).reverse().map((entry, i) => (
                                            <div 
                                                key={i} 
                                                className={`px-2 py-1 rounded ${i === 0 ? 'bg-indigo-600/30 text-indigo-300' : 'bg-slate-700/50 text-slate-400'}`}
                                            >
                                                moveHanoi({entry.n}, {entry.from}, {entry.to}, {entry.aux})
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bubble Sort / Binary Search Controls */}
                    {(selectedItem.id === 'bubble_sort' || selectedItem.id === 'binary_search') && (
                        <div className="p-4 border-b border-slate-700 space-y-4">
                            {/* Speed Control */}
                            <div>
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide flex justify-between">
                                    <span>Animation Speed</span>
                                    <span className="text-indigo-400">{algoSpeed}x</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="5"
                                    step="0.5"
                                    value={algoSpeed}
                                    onChange={(e) => { const v = parseFloat(e.target.value); setAlgoSpeed(v); algoSpeedRef.current = v; }}
                                    className="w-full mt-2 accent-indigo-500"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>0.5x</span>
                                    <span>5x</span>
                                </div>
                            </div>
                            
                            {/* Status Indicator */}
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${algoIsRunning ? (algoIsPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse') : 'bg-slate-500'}`} />
                                <span className="text-xs text-slate-400">
                                    {algoIsRunning ? (algoIsPaused ? 'Paused' : 'Running...') : 'Ready'}
                                </span>
                            </div>
                            
                            {/* Bubble Sort Stats */}
                            {selectedItem.id === 'bubble_sort' && bubbleStats.passes > 0 && (
                                <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                                    <span className="text-xs font-medium text-slate-400 block">Statistics</span>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-slate-700/50 rounded p-2">
                                            <div className="text-lg font-bold text-yellow-400">{bubbleStats.comparisons}</div>
                                            <div className="text-xs text-slate-500">Comparisons</div>
                                        </div>
                                        <div className="bg-slate-700/50 rounded p-2">
                                            <div className="text-lg font-bold text-red-400">{bubbleStats.swaps}</div>
                                            <div className="text-xs text-slate-500">Swaps</div>
                                        </div>
                                        <div className="bg-slate-700/50 rounded p-2">
                                            <div className="text-lg font-bold text-green-400">{bubbleStats.passes}</div>
                                            <div className="text-xs text-slate-500">Passes</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Binary Search Stats */}
                            {selectedItem.id === 'binary_search' && bsStats.iterations > 0 && (
                                <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                                    <span className="text-xs font-medium text-slate-400 block">Search Progress</span>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Iterations:</span>
                                        <span className="text-lg font-bold text-indigo-400">{bsStats.iterations}</span>
                                    </div>
                                    {bsStats.found !== null && (
                                        <div className={`text-center py-2 rounded ${bsStats.found ? 'bg-green-600/30 text-green-300' : 'bg-red-600/30 text-red-300'}`}>
                                            {bsStats.found ? `✅ Found at index ${bsStats.targetIndex}` : '❌ Not Found'}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Merge Sort Controls */}
                    {selectedItem.id === 'merge_sort' && (
                        <div className="p-4 border-b border-slate-700 space-y-4">
                            {/* Speed Control */}
                            <div>
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide flex justify-between">
                                    <span>Animation Speed</span>
                                    <span className="text-indigo-400">{msSpeed}x</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="5"
                                    step="0.5"
                                    value={msSpeed}
                                    onChange={(e) => { const v = parseFloat(e.target.value); setMsSpeed(v); msSpeedRef.current = v; }}
                                    className="w-full mt-2 accent-indigo-500"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>0.5x</span>
                                    <span>5x</span>
                                </div>
                            </div>
                            
                            {/* Status Indicator */}
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${msIsRunning ? (msIsPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse') : 'bg-slate-500'}`} />
                                <span className="text-xs text-slate-400">
                                    {msIsRunning ? (msIsPaused ? 'Paused' : 'Running...') : 'Ready'}
                                </span>
                            </div>
                            
                            {/* Statistics */}
                            {msStats.merges > 0 && (
                                <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                                    <span className="text-xs font-medium text-slate-400 block">Statistics</span>
                                    <div className="grid grid-cols-2 gap-2 text-center">
                                        <div className="bg-slate-700/50 rounded p-2">
                                            <div className="text-lg font-bold text-blue-400">{msStats.comparisons}</div>
                                            <div className="text-xs text-slate-500">Comparisons</div>
                                        </div>
                                        <div className="bg-slate-700/50 rounded p-2">
                                            <div className="text-lg font-bold text-pink-400">{msStats.merges}</div>
                                            <div className="text-xs text-slate-500">Merges</div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-700/50 rounded p-2 mt-2 text-center">
                                        <div className="text-lg font-bold text-purple-400">{msStats.arrayAccesses}</div>
                                        <div className="text-xs text-slate-500">Array Accesses</div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Recursion Depth */}
                            {msMaxDepth > 0 && (
                                <div className="bg-slate-800/50 rounded-lg p-3">
                                    <span className="text-xs font-medium text-slate-400 block mb-1">Recursion Depth</span>
                                    <div className="flex items-center gap-1">
                                        {[...Array(msRecursionDepth)].map((_, i) => (
                                            <div 
                                                key={i}
                                                className="w-4 h-4 rounded-sm"
                                                style={{ 
                                                    backgroundColor: `hsl(${210 - i * 15}, 70%, 55%)`,
                                                    opacity: 0.7 + (i * 0.1)
                                                }}
                                            />
                                        ))}
                                        <span className="text-sm font-bold text-blue-400 ml-2">{msRecursionDepth} / {msMaxDepth}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* BFS Controls */}
                    {selectedItem.id === 'bfs' && (
                        <div className="p-4 border-b border-slate-700 space-y-4">
                            {/* Speed Control */}
                            <div>
                                <label className="text-xs font-medium text-slate-400 uppercase tracking-wide flex justify-between">
                                    <span>Animation Speed</span>
                                    <span className="text-indigo-400">{bfsSpeed}x</span>
                                </label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="5"
                                    step="0.5"
                                    value={bfsSpeed}
                                    onChange={(e) => { const v = parseFloat(e.target.value); setBfsSpeed(v); bfsSpeedRef.current = v; }}
                                    className="w-full mt-2 accent-indigo-500"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>0.5x</span>
                                    <span>5x</span>
                                </div>
                            </div>
                            
                            {/* Status Indicator */}
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${bfsIsRunning ? (bfsIsPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse') : 'bg-slate-500'}`} />
                                <span className="text-xs text-slate-400">
                                    {bfsIsRunning ? (bfsIsPaused ? 'Paused' : 'Running...') : 'Ready'}
                                </span>
                            </div>
                            
                            {/* Statistics */}
                            {bfsStats.visited > 0 && (
                                <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
                                    <span className="text-xs font-medium text-slate-400 block">Statistics</span>
                                    <div className="grid grid-cols-2 gap-2 text-center">
                                        <div className="bg-slate-700/50 rounded p-2">
                                            <div className="text-lg font-bold text-green-400">{bfsStats.visited}</div>
                                            <div className="text-xs text-slate-500">Visited</div>
                                        </div>
                                        <div className="bg-slate-700/50 rounded p-2">
                                            <div className="text-lg font-bold text-blue-400">{bfsStats.queueSize}</div>
                                            <div className="text-xs text-slate-500">Queue Size</div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-700/50 rounded p-2 mt-2 text-center">
                                        <div className="text-lg font-bold text-purple-400">{bfsStats.levels}</div>
                                        <div className="text-xs text-slate-500">Max Depth</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reset */}
                    <div className="p-4 border-t border-slate-700">
                        <button
                            onClick={() => {
                                if (engineRef.current) engineRef.current.reset();
                                addLog('🔄 Scene reset');
                            }}
                            className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                        >
                            <RotateCcw size={16} />
                            Reset Scene
                        </button>
                    </div>
                </div>

                {/* Dijkstra Shortest Paths Panel - Shows after algorithm completes */}
                {selectedItem?.id === 'dijkstra' && dijkstraFinalPaths && (
                    <div className="absolute bottom-56 right-6 z-20 w-96 bg-slate-900/90 backdrop-blur-xl border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-3 border-b border-emerald-500/30 bg-emerald-500/10">
                            <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">🛤️ Shortest Paths from {dijkstraFinalPaths.source}</span>
                        </div>
                        <div className="p-3 max-h-36 overflow-y-auto font-mono text-xs space-y-2">
                            {dijkstraFinalPaths.destinations.map((dest, i) => (
                                <div key={i} className={`p-2 rounded-lg ${dest.reachable ? 'bg-emerald-900/30' : 'bg-red-900/20'}`}>
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-slate-200">To {dest.node}</span>
                                        <span className={`font-bold ${dest.reachable ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {dest.reachable ? `${dest.distance}` : '∞'}
                                        </span>
                                    </div>
                                    {dest.reachable && dest.pathStr && (
                                        <div className="text-slate-400 text-[10px] mt-1">{dest.pathStr}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Logs Panel - Bottom Right (moved to avoid overlapping control panel) */}
                <div className="absolute bottom-8 right-6 z-20 w-96 bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-3 border-b border-slate-700">
                        <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">Operation Log</span>
                    </div>
                    <div className="p-3 h-40 overflow-y-auto font-mono text-xs space-y-1">
                        {logs.length === 0 ? (
                            <p className="text-slate-500">No operations yet...</p>
                        ) : (
                            logs.map((log, i) => (
                                <p key={i} className="text-slate-300">{log}</p>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Landing page
    return (
        <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-white via-gray-50 to-blue-50 flex flex-col items-center py-12 px-6 relative overflow-hidden">
            {/* Animated background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-[#1E3A5F]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Header */}
            <div className="relative z-10 text-center mb-12">
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full mb-6">
                    <Database className="text-cyan-600" size={18} />
                    <span className="text-sm font-medium text-cyan-700">Interactive DSA Library</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4">DSA Visualiser</h1>
                <p className="text-gray-600 max-w-lg mx-auto">
                    Explore data structures and algorithms through interactive 3D visualizations.
                    Click any item to enter the playground.
                </p>
            </div>

            {/* Data Structures Section */}
            <div className="relative z-10 w-full max-w-5xl mb-12">
                <h2 className="text-xl font-bold text-[#1E3A5F] mb-6 flex items-center gap-3">
                    <Database className="text-cyan-600" size={24} />
                    Data Structures
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {dataStructures.map((ds) => (
                        <button
                            key={ds.id}
                            onClick={() => handleItemClick(ds, 'ds')}
                            className="group p-5 bg-white hover:bg-cyan-50 border-2 border-gray-200 hover:border-cyan-400 rounded-2xl transition-all duration-300 text-left shadow-sm hover:shadow-md"
                        >
                            <span className="text-3xl mb-3 block">{ds.icon}</span>
                            <h3 className="font-semibold text-[#1E3A5F] group-hover:text-cyan-700 transition-colors">{ds.name}</h3>
                            <p className="text-xs text-gray-600 mt-1">{ds.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Algorithms Section */}
            <div className="relative z-10 w-full max-w-5xl">
                <h2 className="text-xl font-bold text-[#1E3A5F] mb-6 flex items-center gap-3">
                    <Cpu className="text-emerald-600" size={24} />
                    Algorithms
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {algorithms.map((algo) => (
                        <button
                            key={algo.id}
                            onClick={() => handleItemClick(algo, 'algo')}
                            className="group p-5 bg-white hover:bg-emerald-50 border-2 border-gray-200 hover:border-emerald-400 rounded-2xl transition-all duration-300 text-left shadow-sm hover:shadow-md"
                        >
                            <span className="text-3xl mb-3 block">{algo.icon}</span>
                            <h3 className="font-semibold text-[#1E3A5F] group-hover:text-emerald-700 transition-colors">{algo.name}</h3>
                            <p className="text-xs text-gray-600 mt-1">{algo.description}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DSAVisualiser;
