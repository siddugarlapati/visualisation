import React, { useEffect, useRef, useState } from 'react';
import { Layers, ChevronLeft, Plus, Link as LinkIcon, Server, Database, Cloud, Code, Shield, Trash2, Settings } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PMREMGenerator } from 'three';
import { GSAPEngine } from '../engine/gsap_engine';
import { initBackground, updateBackground } from '../engine/background.js';
import { useNavigate } from 'react-router-dom';

const NODE_TYPES = [
    { id: 'database', label: 'Database', emoji: '🗄️', icon: <Database size={14} />, theme: '0x3b82f6', desc: 'Stacked discs' },
    { id: 'server', label: 'API Server', emoji: '🖥️', icon: <Server size={14} />, theme: '0x10b981', desc: 'Server rack' },
    { id: 'frontend', label: 'Frontend / Web', emoji: '💻', icon: <Code size={14} />, theme: '0xf59e0b', desc: 'Monitor screen' },
    { id: 'cloud', label: 'Cloud Service', emoji: '☁️', icon: <Cloud size={14} />, theme: '0x8b5cf6', desc: 'Cloud cluster' },
    { id: 'security', label: 'Firewall / WAF', emoji: '🛡️', icon: <Shield size={14} />, theme: '0xef4444', desc: 'Shield shape' },
    { id: 'cache', label: 'Cache / Redis', emoji: '⚡', icon: <Layers size={14} />, theme: '0xff6b6b', desc: 'Flat discs + bolt' },
    { id: 'queue', label: 'Message Queue', emoji: '📨', icon: <Layers size={14} />, theme: '0x6366f1', desc: 'Pipe tubes' },
    { id: 'ml_model', label: 'ML Model / AI', emoji: '🧠', icon: <Layers size={14} />, theme: '0xec4899', desc: 'Neural network' },
    { id: 'docker', label: 'Docker / Container', emoji: '🐳', icon: <Layers size={14} />, theme: '0x2496ed', desc: 'Whale shape' },
    { id: 'kubernetes', label: 'Kubernetes', emoji: '⚙️', icon: <Layers size={14} />, theme: '0x326ce5', desc: 'Gear / helm' },
];

const setupScene = (canvas) => {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.shadowMap.enabled = true;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    initBackground(scene);

    const pmremGenerator = new PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    scene.environmentIntensity = 0.5;

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 20);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const lights = [
        new THREE.DirectionalLight(0xffffff, 1.2),
        new THREE.AmbientLight(0x1E3A5F, 0.6)
    ];
    lights[0].position.set(10, 20, 10);
    scene.add(...lights);

    const uniforms = { uTime: { value: 0 } };
    return { scene, camera, renderer, controls, uniforms };
};

const ArchitectureBuilder = () => {
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const requestRef = useRef(null);

    // State for the builder
    const [nodes, setNodes] = useState([]);
    const [edges, setEdges] = useState([]);

    // UI State
    const [newNodeName, setNewNodeName] = useState('');
    const [newNodeType, setNewNodeType] = useState('database');
    const [sourceNode, setSourceNode] = useState('');
    const [targetNode, setTargetNode] = useState('');
    const [activeTab, setActiveTab] = useState('nodes'); // nodes | edges

    useEffect(() => {
        if (!canvasRef.current) return;

        const { scene, camera, renderer, controls, uniforms } = setupScene(canvasRef.current);
        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.6, 0.4, 0.85));

        engineRef.current = new GSAPEngine(scene, camera, controls);

        const clock = new THREE.Clock();
        const animate = () => {
            requestRef.current = requestAnimationFrame(animate);
            uniforms.uTime.value += clock.getDelta();
            updateBackground(uniforms.uTime.value);
            controls.update();
            if (engineRef.current) engineRef.current.tick();
            composer.render();
        };
        animate();

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(requestRef.current);
            if (engineRef.current) engineRef.current.dispose();
            renderer.dispose();
        };
    }, []);

    const handleAddNode = (e) => {
        e.preventDefault();
        if (!newNodeName.trim() || !engineRef.current) return;

        const id = `node_${Date.now()}`;
        const typeConfig = NODE_TYPES.find(t => t.id === newNodeType);

        // Find a safe position
        const radius = 8;
        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle) * (Math.random() * radius);
        const z = Math.sin(angle) * (Math.random() * radius);
        const y = Math.random() * 4 - 2;

        const newNode = { id, name: newNodeName, type: newNodeType, config: typeConfig, pos: { x, y, z } };

        setNodes([...nodes, newNode]);

        // Create in 3D
        engineRef.current.graphCreateNode(id, newNodeName, x, y + 10, newNodeType); // Start high and drop in
        engineRef.current.move(id, { x, y, z }, 1.5);
        engineRef.current.highlight(id, typeConfig.theme);
        engineRef.current.pulse(id);

        setNewNodeName('');
    };

    const handleConnectNodes = (e) => {
        e.preventDefault();
        if (!sourceNode || !targetNode || sourceNode === targetNode || !engineRef.current) return;

        // Prevent duplicate edges
        if (edges.some(e => (e.source === sourceNode && e.target === targetNode) || (e.source === targetNode && e.target === sourceNode))) {
            return;
        }

        const newEdge = { id: `edge_${Date.now()}`, source: sourceNode, target: targetNode };
        setEdges([...edges, newEdge]);

        // Connect in 3D
        engineRef.current.graphConnect(sourceNode, targetNode, true);

        // Reset form
        setSourceNode('');
        setTargetNode('');
    };

    const handleClear = () => {
        setNodes([]);
        setEdges([]);
        if (engineRef.current) {
            engineRef.current.reset();
        }
    };

    return (
        <div className="w-screen h-screen overflow-hidden bg-[#0A0F1C] relative font-sans">
            <canvas ref={canvasRef} className="absolute inset-0 z-0 outline-none" />

            {/* Header – starts below fixed navbar (top-16 = 64 px) */}
            <div className="absolute top-16 left-0 right-0 px-6 py-3 z-10 flex justify-between items-center bg-gradient-to-b from-[#0A0F1C]/90 to-transparent pointer-events-none">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg backdrop-blur-md border border-white/10 transition-all font-medium pointer-events-auto"
                >
                    <ChevronLeft size={20} /> Home
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#C41E3A] to-[#ff4d6d]">
                        Architecture Sandbox
                    </h1>
                    <p className="text-white/50 text-sm tracking-widest uppercase mt-1 box">Dynamic 3D Topology Builder</p>
                </div>
                <div className="w-[100px]" />
            </div>

            {/* Side Panel – starts below navbar */}
            <div className="absolute left-0 top-16 bottom-0 w-64 bg-black/60 backdrop-blur-xl border-r border-white/10 z-10 flex flex-col shadow-2xl overflow-hidden transition-transform duration-300">

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    <button
                        className={`flex-1 py-4 text-sm font-bold tracking-wider uppercase transition-colors ${activeTab === 'nodes' ? 'text-white border-b-2 border-[#C41E3A]' : 'text-white/40 hover:text-white/70'}`}
                        onClick={() => setActiveTab('nodes')}
                    >
                        Components
                    </button>
                    <button
                        className={`flex-1 py-4 text-sm font-bold tracking-wider uppercase transition-colors ${activeTab === 'edges' ? 'text-white border-b-2 border-[#C41E3A]' : 'text-white/40 hover:text-white/70'}`}
                        onClick={() => setActiveTab('edges')}
                    >
                        Connections
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    {/* Add Component Form */}
                    {activeTab === 'nodes' && (
                        <div className="space-y-6 animate-fadeIn">
                            <form onSubmit={handleAddNode} className="space-y-4">
                                <div>
                                    <label className="text-xs text-white/50 uppercase tracking-widest font-bold mb-2 block">Component Type</label>
                                    <div className="flex flex-col gap-1.5">
                                        {NODE_TYPES.map(type => (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => setNewNodeType(type.id)}
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${newNodeType === type.id ? 'bg-[#C41E3A]/20 border-[#C41E3A] text-white shadow-[0_0_12px_rgba(196,30,58,0.2)]' : 'bg-black/20 border-white/5 text-white/50 hover:bg-white/5 hover:text-white/80'}`}
                                            >
                                                <span className="text-xl leading-none">{type.emoji}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-bold leading-tight truncate">{type.label}</div>
                                                    <div className="text-[9px] text-white/30 mt-0.5">{type.desc}</div>
                                                </div>
                                                {newNodeType === type.id && <div className="w-1.5 h-1.5 rounded-full bg-[#C41E3A] flex-shrink-0" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-white/50 uppercase tracking-widest font-bold mb-2 block">Component Name</label>
                                    <input
                                        type="text"
                                        value={newNodeName}
                                        onChange={(e) => setNewNodeName(e.target.value)}
                                        placeholder="e.g. User Auth DB"
                                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#C41E3A] transition-colors"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={!newNodeName.trim()}
                                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#C41E3A] to-[#A01830] hover:from-[#d12847] hover:to-[#b31b36] text-white font-bold py-3 rounded-lg shadow-lg shadow-[#C41E3A]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <Plus size={18} /> Spawn Component
                                </button>
                            </form>

                            {/* Node List */}
                            <div className="pt-4 border-t border-white/10">
                                <h3 className="text-xs text-white/50 uppercase tracking-widest font-bold mb-3">Active Infrastructure ({nodes.length})</h3>
                                <div className="space-y-2">
                                    {nodes.map(node => (
                                        <div key={node.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                                            <span className="text-xl leading-none">{node.config.emoji}</span>
                                            <div className="flex-1 truncate">
                                                <div className="text-sm font-bold text-white truncate">{node.name}</div>
                                                <div className="text-[10px] text-white/40 uppercase tracking-wider">{node.config.label} · {node.config.desc}</div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    engineRef.current?.highlight(node.id, '0xffffff');
                                                    engineRef.current?.pulse(node.id);
                                                }}
                                                className="p-1.5 text-white/30 hover:text-white bg-black/20 hover:bg-white/10 rounded transition-colors"
                                            >
                                                <Settings size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {nodes.length === 0 && (
                                        <p className="text-xs text-white/30 text-center py-4 italic">No components spawned yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Add Connection Form */}
                    {activeTab === 'edges' && (
                        <div className="space-y-6 animate-fadeIn">
                            <form onSubmit={handleConnectNodes} className="space-y-4">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-white/50 uppercase tracking-widest font-bold mb-1 block">From Node</label>
                                        <select
                                            value={sourceNode}
                                            onChange={(e) => setSourceNode(e.target.value)}
                                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#C41E3A] transition-colors appearance-none"
                                        >
                                            <option value="" disabled>Select source...</option>
                                            {nodes.map(n => <option key={n.id} value={n.id}>{n.name} ({n.config.label})</option>)}
                                        </select>
                                    </div>
                                    <div className="flex justify-center -my-2 relative z-10 text-white/30">
                                        <LinkIcon size={16} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-white/50 uppercase tracking-widest font-bold mb-1 block">To Node</label>
                                        <select
                                            value={targetNode}
                                            onChange={(e) => setTargetNode(e.target.value)}
                                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#C41E3A] transition-colors appearance-none"
                                        >
                                            <option value="" disabled>Select target...</option>
                                            {nodes.map(n => <option key={n.id} value={n.id} disabled={n.id === sourceNode}>{n.name} ({n.config.label})</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={!sourceNode || !targetNode || sourceNode === targetNode}
                                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#1E3A5F] to-[#2a4d7a] hover:from-[#254775] hover:to-[#325b91] text-white font-bold py-3 rounded-lg shadow-lg shadow-[#1E3A5F]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <LinkIcon size={18} /> Establish Connection
                                </button>
                            </form>

                            {/* Edge List */}
                            <div className="pt-4 border-t border-white/10">
                                <h3 className="text-xs text-white/50 uppercase tracking-widest font-bold mb-3">Active Data Flows ({edges.length})</h3>
                                <div className="space-y-2">
                                    {edges.map(edge => {
                                        const s = nodes.find(n => n.id === edge.source);
                                        const t = nodes.find(n => n.id === edge.target);
                                        if (!s || !t) return null;
                                        return (
                                            <div key={edge.id} className="flex flex-col gap-1 p-3 bg-white/5 rounded-lg border border-white/5 text-sm">
                                                <div className="flex items-center gap-2 text-white/70">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.config.theme.replace('0x', '#') }} />
                                                    <span className="truncate">{s.name}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-white/30 pl-1 py-0.5">
                                                    <div className="w-[2px] h-3 bg-gradient-to-b from-[#C41E3A] to-transparent ml-[3px]" />
                                                    <span className="text-[10px] uppercase font-bold text-[#C41E3A]">Flows To</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-white">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.config.theme.replace('0x', '#') }} />
                                                    <span className="truncate font-bold">{t.name}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {edges.length === 0 && (
                                        <p className="text-xs text-white/30 text-center py-4 italic">No connections established yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-black/20 border-t border-white/5">
                    <button
                        onClick={handleClear}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm text-red-400 hover:text-white hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all font-medium"
                    >
                        <Trash2 size={16} /> Nuke Architecture
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ArchitectureBuilder;
