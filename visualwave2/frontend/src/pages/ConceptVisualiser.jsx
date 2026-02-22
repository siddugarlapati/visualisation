import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PMREMGenerator } from 'three';
import { GSAPEngine } from '../engine/gsap_engine';
import { initBackground, updateBackground } from '../engine/background.js';
import { LANGUAGES, TOPICS_BY_LANGUAGE } from '../data/conceptTopics.js';
import { generateVisualization } from '../services/geminiService.js';
import { ChevronLeft, Play, RotateCcw, Code2, Sparkles, Search, X, Loader2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────
// Scene Setup
// ─────────────────────────────────────────────────────────────────
const setupScene = (canvas) => {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.shadowMap.enabled = true;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    initBackground(scene);

    const pmremGenerator = new PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.6;

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 28);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = false;
    controls.minDistance = 5;
    controls.maxDistance = 60;

    const lights = [
        new THREE.DirectionalLight(0xffffff, 1.4),
        new THREE.DirectionalLight(0x4466ff, 0.6),
        new THREE.AmbientLight(0x1E3A5F, 0.7),
    ];
    lights[0].position.set(10, 20, 10);
    lights[1].position.set(-10, -10, -10);
    scene.add(...lights);

    return { scene, camera, renderer, controls, uniforms: { uTime: { value: 0 } } };
};

// ─────────────────────────────────────────────────────────────────
// AI Search Bar (shown on language & topic grid screens)
// ─────────────────────────────────────────────────────────────────
const AISearchBar = ({ onGenerate }) => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const suggestions = [
        'Binary Search Tree', 'TCP/IP Handshake', 'React Fiber Reconciler',
        'Merge Sort', 'JWT Authentication', 'Hash Map Collision', 'Docker Networking',
        'Async/Await Event Loop', 'B+ Tree Index', 'OAuth2 Flow',
    ];

    const handleGenerate = async (q) => {
        const topic = (q || query).trim();
        if (!topic) return;
        setLoading(true);
        setError('');
        try {
            const viz = await generateVisualization(topic);
            onGenerate(viz);
        } catch (e) {
            setError(e.message || 'Generation failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto mt-8 mb-2">
            {/* Input row */}
            <div className="flex items-center gap-3 bg-white border-2 border-[#1E3A5F]/15 hover:border-[#C41E3A]/40 focus-within:border-[#C41E3A] rounded-2xl px-5 py-3 shadow-lg transition-all duration-200">
                <Sparkles size={20} className="text-[#C41E3A] shrink-0" />
                <input
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                    placeholder="Ask AI to visualize anything… e.g. 'How does a B+ Tree work?'"
                    className="flex-1 outline-none text-[#1E3A5F] font-medium text-sm placeholder:text-gray-400 bg-transparent"
                    disabled={loading}
                />
                {query && !loading && (
                    <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500 transition-colors">
                        <X size={16} />
                    </button>
                )}
                <button
                    onClick={() => handleGenerate()}
                    disabled={loading || !query.trim()}
                    className="shrink-0 flex items-center gap-2 bg-[#C41E3A] hover:bg-[#a01730] disabled:bg-gray-200 disabled:text-gray-400 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200 shadow-md"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    {loading ? 'Generating…' : 'Visualize'}
                </button>
            </div>

            {/* Error message */}
            {error && (
                <p className="mt-2 text-xs text-red-500 font-medium px-2">{error}</p>
            )}

            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 mt-3 px-1">
                <span className="text-xs text-gray-400 font-medium self-center">Try:</span>
                {suggestions.map(s => (
                    <button
                        key={s}
                        onClick={() => handleGenerate(s)}
                        disabled={loading}
                        className="text-xs bg-gray-100 hover:bg-[#C41E3A]/10 hover:text-[#C41E3A] text-gray-500 px-3 py-1.5 rounded-full border border-gray-200 hover:border-[#C41E3A]/30 transition-all duration-150 font-medium"
                    >
                        {s}
                    </button>
                ))}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────
const ConceptVisualiser = () => {
    const [selectedLang, setSelectedLang] = useState(null);
    const [selectedTopic, setSelectedTopic] = useState(null);

    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const requestRef = useRef(null);
    const composerRef = useRef(null);

    const [step, setStep] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showCode, setShowCode] = useState(false);

    // ── Boot 3D engine when a topic is selected ──
    useEffect(() => {
        if (!canvasRef.current || !selectedTopic) return;

        const { scene, camera, renderer, controls, uniforms } = setupScene(canvasRef.current);
        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.5, 0.80));
        composerRef.current = composer;
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

        const onResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('resize', onResize);
            cancelAnimationFrame(requestRef.current);
            if (engineRef.current) engineRef.current.dispose();
            renderer.dispose();
        };
    }, [selectedTopic]);

    const playTopic = useCallback(async () => {
        if (!engineRef.current || !selectedTopic || isPlaying) return;
        setIsPlaying(true);
        setStep(null);
        try {
            await selectedTopic.play(engineRef.current, (s) => setStep(s));
        } catch (e) { console.warn('Animation interrupted', e); }
        setIsPlaying(false);
    }, [selectedTopic, isPlaying]);

    useEffect(() => {
        if (selectedTopic && engineRef.current) {
            setTimeout(() => playTopic(), 300);
        }
    }, [selectedTopic]);

    const topics = selectedLang ? TOPICS_BY_LANGUAGE[selectedLang.id] : [];
    const langData = selectedTopic?.isAIGenerated
        ? { id: 'ai', label: 'AI Generated', color: '#C41E3A', emoji: '✨' }
        : LANGUAGES.find(l => l.id === selectedLang?.id);

    // ═══════════════════════════════════════════════════════════
    // LEVEL 1: Language Grid
    // ═══════════════════════════════════════════════════════════
    if (!selectedLang && !selectedTopic) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] font-sans flex flex-col items-center pb-16 px-6 pt-14">
                {/* Hero */}
                <div className="w-full max-w-5xl text-center mb-6">
                    <h1 className="text-5xl md:text-6xl font-black mb-3 text-[#1E3A5F] tracking-tight leading-tight">
                        Concept <span className="text-[#C41E3A]">Learner</span>
                    </h1>
                    <p className="text-base text-gray-500 font-light max-w-2xl mx-auto leading-relaxed">
                        Pick a language or domain — each topic has a <strong className="text-[#1E3A5F]">step-by-step 3D animation</strong> that explains the concept visually. Or ask AI to generate any visualization instantly.
                    </p>
                </div>

                {/* AI Search */}
                <AISearchBar onGenerate={(viz) => setSelectedTopic(viz)} />

                {/* Divider */}
                <div className="flex items-center gap-4 w-full max-w-5xl my-8">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Or browse by language</span>
                    <div className="h-px flex-1 bg-gray-200" />
                </div>

                {/* Language Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 w-full max-w-6xl">
                    {LANGUAGES.map(lang => (
                        <button
                            key={lang.id}
                            onClick={() => setSelectedLang(lang)}
                            className="group relative flex flex-col items-start p-6 bg-white border border-gray-200 hover:border-[#C41E3A] hover:shadow-2xl rounded-2xl transition-all duration-300 text-left transform hover:-translate-y-1 overflow-hidden"
                        >
                            <div className="text-3xl mb-3">{lang.emoji}</div>
                            <h3 className="text-base font-bold text-[#1E3A5F] mb-1 tracking-tight leading-snug">{lang.label}</h3>
                            <p className="text-xs text-gray-400 mb-3 leading-relaxed">{lang.desc}</p>
                            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: lang.color }}>
                                {TOPICS_BY_LANGUAGE[lang.id]?.length || 0} topics
                                <span className="text-gray-300">·</span>
                                <span className="text-gray-400 font-normal">3D Visualized</span>
                            </div>
                            <div
                                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{ backgroundColor: lang.color }}
                            />
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════
    // LEVEL 2: Topic Grid
    // ═══════════════════════════════════════════════════════════
    if (selectedLang && !selectedTopic) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] font-sans flex flex-col items-center pb-16 px-6 pt-14">
                {/* Back */}
                <div className="w-full max-w-5xl mb-6">
                    <button
                        onClick={() => setSelectedLang(null)}
                        className="flex items-center gap-2 text-gray-500 hover:text-[#1E3A5F] text-sm font-medium transition-colors"
                    >
                        <ChevronLeft size={16} /> All Languages
                    </button>
                </div>

                {/* Header */}
                <div className="w-full max-w-5xl mb-6 flex items-center gap-4">
                    <span className="text-4xl">{langData?.emoji}</span>
                    <div>
                        <h1 className="text-3xl font-black text-[#1E3A5F] tracking-tight">{langData?.label}</h1>
                        <p className="text-gray-400 text-sm mt-0.5">{langData?.desc}</p>
                    </div>
                </div>

                {/* AI Search for this language */}
                <AISearchBar onGenerate={(viz) => setSelectedTopic(viz)} />

                <div className="flex items-center gap-4 w-full max-w-5xl my-6">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Or pick a topic</span>
                    <div className="h-px flex-1 bg-gray-200" />
                </div>

                {/* Topic Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl">
                    {topics?.length > 0 ? topics.map(topic => (
                        <button
                            key={topic.id}
                            onClick={() => setSelectedTopic(topic)}
                            className="group flex flex-col items-start p-5 bg-white border border-gray-200 hover:border-[#C41E3A] hover:shadow-xl rounded-2xl transition-all duration-300 text-left transform hover:-translate-y-1"
                        >
                            <span className="text-2xl mb-2">{topic.icon}</span>
                            <h3 className="text-base font-bold text-[#1E3A5F] mb-1.5 leading-snug">{topic.title}</h3>
                            <p className="text-xs text-gray-400 leading-relaxed flex-1">{topic.desc}</p>
                            <div
                                className="mt-3 px-3 py-1 rounded-full text-xs font-bold"
                                style={{ backgroundColor: `${langData?.color}18`, color: langData?.color }}
                            >
                                ▶ Visualize
                            </div>
                        </button>
                    )) : (
                        <div className="col-span-3 text-center py-16 text-gray-400">
                            <p className="text-4xl mb-4">🚧</p>
                            <p className="font-medium">No pre-built topics yet for {langData?.label}.</p>
                            <p className="text-sm mt-1">Use the AI generator above to create any visualization instantly!</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════
    // LEVEL 3: Full-screen 3D Visualization
    // ═══════════════════════════════════════════════════════════
    return (
        <div className="w-screen h-screen overflow-hidden bg-[#0A0F1C] relative font-sans" style={{ marginTop: '-64px' }}>
            <canvas ref={canvasRef} className="absolute inset-0 z-0 outline-none" />

            {/* Top bar — sits INSIDE the full screen div, below nav height */}
            <div className="absolute left-0 right-0 z-20 flex items-center justify-between gap-3 px-4 py-3"
                style={{ top: '64px', background: 'linear-gradient(to bottom, rgba(10,15,28,0.95) 60%, transparent)' }}>
                {/* Back */}
                <button
                    className="flex items-center gap-2 text-white/70 hover:text-white bg-white/8 hover:bg-white/15 px-3 py-2 rounded-xl backdrop-blur-md border border-white/10 transition-all text-sm font-medium shrink-0"
                    onClick={() => {
                        setSelectedTopic(null);
                        setStep(null);
                        // If AI generated, go back to language grid
                        if (selectedTopic?.isAIGenerated && !selectedLang) setSelectedLang(null);
                    }}
                >
                    <ChevronLeft size={15} />
                    <span className="hidden sm:inline">Back</span>
                </button>

                {/* Topic title pill */}
                <div className="flex items-center gap-2 bg-white/8 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 min-w-0 overflow-hidden">
                    <span className="text-base shrink-0">{selectedTopic.icon}</span>
                    <span className="text-white font-semibold text-sm truncate">{selectedTopic.title}</span>
                    {selectedTopic.isAIGenerated && (
                        <span className="shrink-0 text-xs bg-[#C41E3A]/30 text-[#f87171] px-2 py-0.5 rounded-full font-bold border border-[#C41E3A]/30">AI</span>
                    )}
                    <span className="text-white/30 text-xs hidden sm:block shrink-0">· {langData?.label}</span>
                </div>

                {/* Controls */}
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={() => setShowCode(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${showCode
                            ? 'bg-white/15 border-white/20 text-white'
                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}
                    >
                        <Code2 size={14} />
                        <span className="hidden sm:inline">Code</span>
                    </button>
                    <button
                        onClick={playTopic}
                        disabled={isPlaying}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${isPlaying
                            ? 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed'
                            : 'bg-[#C41E3A]/20 hover:bg-[#C41E3A]/40 text-white border-[#C41E3A]/50'}`}
                    >
                        <RotateCcw size={14} className={isPlaying ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">{isPlaying ? 'Playing…' : 'Replay'}</span>
                    </button>
                </div>
            </div>

            {/* Code panel */}
            {showCode && (
                <div className="absolute left-4 z-20 w-72 xl:w-80 bg-black/85 backdrop-blur-xl border border-white/15 rounded-2xl overflow-hidden shadow-2xl" style={{ top: '120px' }}>
                    <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2">
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                            <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                        </div>
                        <span className="text-white/40 text-xs ml-1 font-mono truncate">{selectedTopic.title}</span>
                    </div>
                    <pre className="px-4 py-4 text-xs text-green-300 font-mono leading-relaxed overflow-x-auto max-h-64">
                        {selectedTopic.code}
                    </pre>
                </div>
            )}

            {/* Right sidebar: description + controls hint */}
            <div className="absolute right-4 z-20 w-52 bg-black/35 backdrop-blur-md rounded-2xl p-4 border border-white/10 hidden lg:block" style={{ top: '120px' }}>
                <p className="text-xs text-white/40 uppercase tracking-widest mb-2 font-semibold">About</p>
                <p className="text-white/70 text-xs leading-relaxed">{selectedTopic.desc}</p>
                <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-white/30 leading-relaxed">Drag to orbit · Scroll to zoom · Double-click to reset</p>
                </div>
            </div>

            {/* Narration panel (bottom center) */}
            <div className="absolute bottom-8 left-0 right-0 z-20 flex flex-col items-center px-4 pointer-events-none">
                {/* Explanation card */}
                <div className={`w-full max-w-2xl transition-all duration-500 transform ${step ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
                    <div className="bg-[#0A0F1C]/80 backdrop-blur-xl border border-white/15 px-6 py-5 rounded-2xl shadow-2xl relative overflow-hidden">
                        {/* color bar top */}
                        <div
                            className="absolute top-0 left-0 right-0 h-0.5"
                            style={{ background: `linear-gradient(90deg, transparent, ${langData?.color || '#C41E3A'}, transparent)` }}
                        />
                        {/* bouncing dots when playing */}
                        {isPlaying && (
                            <div className="absolute top-3 right-4 flex gap-1">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                ))}
                            </div>
                        )}
                        <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: langData?.color || '#C41E3A' }}>
                            Step
                        </p>
                        <h3 className="text-lg font-bold text-white mb-1.5 tracking-tight font-mono leading-snug">{step?.title}</h3>
                        <p className="text-sm text-white/65 font-light leading-relaxed">{step?.explanation}</p>
                    </div>
                </div>

                {/* Start prompt when idle */}
                {!step && !isPlaying && (
                    <button
                        onClick={playTopic}
                        className="pointer-events-auto inline-flex items-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-8 py-4 rounded-full border border-white/20 font-bold text-sm transition-all hover:scale-105 shadow-xl"
                    >
                        <Play size={18} /> Start Visualization
                    </button>
                )}
            </div>
        </div>
    );
};

export default ConceptVisualiser;
