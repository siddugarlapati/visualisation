import React, { useEffect, useRef, useState } from 'react';
import { Layers, ChevronLeft, Play, Database, Server, Shield, Cloud, Code, Cpu, GitBranch, Globe, Zap } from 'lucide-react';
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

// ──────────────────────────────────────────────────────────────
// TECH STACKS – each node has an explicit iconType for 3D mesh
// ──────────────────────────────────────────────────────────────
const STACKS = {
    'mern-stack': {
        title: 'MERN Stack',
        subtitle: 'Full-Stack JavaScript',
        theme: '0x00d084',
        color: '#00d084',
        icon: <Layers size={22} />,
        nodes: [
            { id: 'react2', label: 'React', desc: 'UI library – components, hooks, virtual DOM', iconType: 'react', pos: { x: 4, y: 2, z: 2 } },
            { id: 'node', label: 'Node.js', desc: 'V8 JS runtime – event loop, streams', iconType: 'nodejs', pos: { x: -3, y: -2, z: 1 } },
            { id: 'express', label: 'Express', desc: 'Minimal web framework – routing, middleware', iconType: 'backend', pos: { x: 0, y: 0, z: 0 } },
            { id: 'mongo', label: 'MongoDB', desc: 'NoSQL document store – BSON, aggregation', iconType: 'mongodb', pos: { x: -7, y: 2, z: -2 } },
        ],
        edges: [['react2', 'express'], ['node', 'express'], ['express', 'mongo']],
    },
    'python-ds': {
        title: 'Python Data Science',
        subtitle: 'Analytics & ML Pipeline',
        theme: '0xffd43b',
        color: '#ffd43b',
        icon: <Database size={22} />,
        nodes: [
            { id: 'py', label: 'Python', desc: 'Batteries-included language, CPython runtime', iconType: 'python', pos: { x: -8, y: 0, z: 0 } },
            { id: 'pandas', label: 'Pandas', desc: 'DataFrames, GroupBy, merges, time series', iconType: 'python', pos: { x: -3, y: 3, z: -2 } },
            { id: 'scikit', label: 'Scikit-Learn', desc: 'Regression, classification, clustering', iconType: 'ml_model', pos: { x: 2, y: 0, z: 1 } },
            { id: 'tf', label: 'TensorFlow', desc: 'Deep learning, automatic diff, Keras', iconType: 'ml_model', pos: { x: 7, y: 2, z: -1 } },
            { id: 'viz', label: 'Matplotlib', desc: 'Plotting ‑ figures, axes, colormaps', iconType: 'frontend', pos: { x: -3, y: -3, z: 2 } },
        ],
        edges: [['py', 'pandas'], ['py', 'viz'], ['pandas', 'scikit'], ['pandas', 'tf'], ['scikit', 'tf']],
    },
    'devops-k8s': {
        title: 'DevOps & Kubernetes',
        subtitle: 'Container Orchestration',
        theme: '0x326ce5',
        color: '#326ce5',
        icon: <Cloud size={22} />,
        nodes: [
            { id: 'git', label: 'Git', desc: 'Distributed VCS – branches, merge, rebase', iconType: 'git', pos: { x: -8, y: 0, z: 0 } },
            { id: 'docker', label: 'Docker', desc: 'OCI containers – images, layers, registries', iconType: 'docker', pos: { x: -3, y: 2, z: 1 } },
            { id: 'k8s', label: 'Kubernetes', desc: 'Pods, deployments, services, ingress, RBAC', iconType: 'kubernetes', pos: { x: 2, y: 0, z: -1 } },
            { id: 'helm', label: 'Helm', desc: 'Chart packaging, templating, releases', iconType: 'kubernetes', pos: { x: 6, y: 2, z: 1 } },
            { id: 'nginx', label: 'Nginx', desc: 'Reverse proxy, load balancer, SSL termination', iconType: 'nginx', pos: { x: 0, y: -3, z: 2 } },
        ],
        edges: [['git', 'docker'], ['docker', 'k8s'], ['k8s', 'helm'], ['nginx', 'k8s']],
    },
    'java-fullstack': {
        title: 'Java Full-Stack',
        subtitle: 'Enterprise Architecture',
        theme: '0xf89820',
        color: '#f89820',
        icon: <Server size={22} />,
        nodes: [
            { id: 'java', label: 'Core Java', desc: 'OOP, JVM, GC, Collections, Concurrency', iconType: 'java', pos: { x: -8, y: 0, z: 0 } },
            { id: 'spring', label: 'Spring Boot', desc: 'IoC, DI, REST, AOP, Security', iconType: 'backend', pos: { x: -3, y: 2, z: -2 } },
            { id: 'hibernate', label: 'Hibernate', desc: 'JPA, LazyLoading, L2 Cache, HQL', iconType: 'database', pos: { x: 2, y: -2, z: 1 } },
            { id: 'db', label: 'PostgreSQL', desc: 'RDBMS, ACID, row-level locking, extensions', iconType: 'postgresql', pos: { x: 7, y: 0, z: -1 } },
            { id: 'reactfe', label: 'React', desc: 'SPA, React Query, Zustand, Vite', iconType: 'react', pos: { x: -3, y: -3, z: 3 } },
        ],
        edges: [['java', 'spring'], ['java', 'hibernate'], ['spring', 'db'], ['hibernate', 'db'], ['reactfe', 'spring']],
    },
    'cyber-security': {
        title: 'Cyber Security',
        subtitle: 'Blue & Red Team',
        theme: '0xff0055',
        color: '#ff0055',
        icon: <Shield size={22} />,
        nodes: [
            { id: 'net', label: 'Networking', desc: 'TCP/IP, OSI, subnets, VLANs, BGP', iconType: 'security', pos: { x: -8, y: -2, z: 0 } },
            { id: 'crypto', label: 'Cryptography', desc: 'AES-256, RSA, ECC, hashes, TLS 1.3', iconType: 'security', pos: { x: -4, y: 2, z: -2 } },
            { id: 'vuln', label: 'Vulnerability', desc: 'CVE scanning, OWASP Top 10, zero-days', iconType: 'security', pos: { x: 1, y: 0, z: 1 } },
            { id: 'pen', label: 'Pen Testing', desc: 'Metasploit, Nmap, Burp Suite, Kali', iconType: 'security', pos: { x: 6, y: 2, z: 0 } },
            { id: 'siem', label: 'SIEM / Blue', desc: 'Splunk, ELK, IDS/IPS, incident response', iconType: 'security', pos: { x: 4, y: -3, z: 2 } },
        ],
        edges: [['net', 'crypto'], ['net', 'vuln'], ['vuln', 'pen'], ['vuln', 'siem'], ['crypto', 'siem']],
    },
    'cloud-aws': {
        title: 'Cloud / AWS',
        subtitle: 'Cloud-Native Architecture',
        theme: '0xff9900',
        color: '#ff9900',
        icon: <Cloud size={22} />,
        nodes: [
            { id: 'ec2', label: 'EC2', desc: 'VMs, AMIs, auto-scaling groups, EBS', iconType: 'cloud', pos: { x: -6, y: 2, z: 0 } },
            { id: 's3', label: 'S3', desc: 'Object storage, versioning, lifecycle, CDN', iconType: 'cloud', pos: { x: -2, y: -2, z: -1 } },
            { id: 'lambda', label: 'Lambda', desc: 'Serverless functions, event triggers, layers', iconType: 'queue', pos: { x: 2, y: 2, z: 1 } },
            { id: 'rds', label: 'RDS', desc: 'Managed RDBMS, Multi-AZ, read replicas', iconType: 'database', pos: { x: 6, y: -1, z: -1 } },
            { id: 'iam', label: 'IAM', desc: 'Roles, policies, STS, federation, MFA', iconType: 'security', pos: { x: 0, y: 4, z: -2 } },
        ],
        edges: [['iam', 'ec2'], ['iam', 's3'], ['ec2', 'lambda'], ['lambda', 'rds'], ['s3', 'rds']],
    },
    'frontend-web': {
        title: 'Modern Frontend',
        subtitle: 'HTML → TypeScript → React',
        theme: '0xe34c26',
        color: '#e34c26',
        icon: <Globe size={22} />,
        nodes: [
            { id: 'html', label: 'HTML5', desc: 'Semantic markup, accessibility, SEO', iconType: 'html', pos: { x: -7, y: 0, z: 0 } },
            { id: 'css', label: 'CSS3', desc: 'Flexbox, Grid, animations, custom properties', iconType: 'css', pos: { x: -3, y: 2, z: -1 } },
            { id: 'reactw', label: 'React', desc: 'JSX, hooks, context, concurrent mode', iconType: 'react', pos: { x: 1, y: 0, z: 0 } },
            { id: 'redux', label: 'Redux / Zustand', desc: 'Global state, actions, selectors, slices', iconType: 'frontend', pos: { x: 5, y: -2, z: 1 } },
            { id: 'vite', label: 'Vite / Webpack', desc: 'Module bundler, HMR, tree-shaking, chunks', iconType: 'nodejs', pos: { x: -3, y: -3, z: 2 } },
        ],
        edges: [['html', 'css'], ['css', 'reactw'], ['reactw', 'redux'], ['vite', 'reactw']],
    },
    'go-microservices': {
        title: 'Go Microservices',
        subtitle: 'gRPC · Kafka · Service Mesh',
        theme: '0x00acd7',
        color: '#00acd7',
        icon: <Zap size={22} />,
        nodes: [
            { id: 'go', label: 'Go', desc: 'Goroutines, channels, interfaces, gc', iconType: 'backend', pos: { x: -6, y: 0, z: 0 } },
            { id: 'grpc', label: 'gRPC', desc: 'protobuf IDL, streaming, interceptors', iconType: 'queue', pos: { x: -1, y: 2, z: 1 } },
            { id: 'kafka', label: 'Kafka', desc: 'Topics, partitions, consumer groups, offsets', iconType: 'queue', pos: { x: 3, y: -1, z: -1 } },
            { id: 'pggo', label: 'PostgreSQL', desc: 'pgx driver, connection pooling, migrations', iconType: 'postgresql', pos: { x: 7, y: 1, z: 0 } },
            { id: 'istio', label: 'Istio', desc: 'Service mesh, mTLS, traffic policies, Envoy', iconType: 'kubernetes', pos: { x: 1, y: -3, z: 2 } },
        ],
        edges: [['go', 'grpc'], ['go', 'kafka'], ['grpc', 'pggo'], ['kafka', 'pggo'], ['istio', 'grpc']],
    },
    'cicd-pipeline': {
        title: 'CI/CD Pipeline',
        subtitle: 'GitHub Actions · Argo CD',
        theme: '0x2496ed',
        color: '#2496ed',
        icon: <GitBranch size={22} />,
        nodes: [
            { id: 'src', label: 'Source Code', desc: 'Git branches, PRs, code review, squash merges', iconType: 'git', pos: { x: -7, y: 0, z: 0 } },
            { id: 'ci', label: 'GitHub Actions', desc: 'Workflows, runners, artifacts, secrets', iconType: 'git', pos: { x: -2, y: 2, z: 0 } },
            { id: 'dockerc', label: 'Docker Build', desc: 'Multi-stage builds, layer caching, SBOM', iconType: 'docker', pos: { x: 2, y: 0, z: -1 } },
            { id: 'argo', label: 'Argo CD', desc: 'GitOps, sync policies, health checks, rollback', iconType: 'kubernetes', pos: { x: 6, y: 2, z: 1 } },
            { id: 'monitor', label: 'Prometheus', desc: 'Metrics, scrapers, alertmanager, Grafana', iconType: 'ml_model', pos: { x: 0, y: -3, z: 2 } },
        ],
        edges: [['src', 'ci'], ['ci', 'dockerc'], ['dockerc', 'argo'], ['argo', 'monitor']],
    },
    'systems-cpp': {
        title: 'Systems / C++',
        subtitle: 'Low-Level Programming',
        theme: '0x9b59b6',
        color: '#9b59b6',
        icon: <Cpu size={22} />,
        nodes: [
            { id: 'c', label: 'C', desc: 'Pointers, memory, syscalls, POSIX', iconType: 'backend', pos: { x: -7, y: 0, z: 0 } },
            { id: 'cpp', label: 'C++', desc: 'RAII, templates, STL, move semantics, CRTP', iconType: 'backend', pos: { x: -2, y: 2, z: 0 } },
            { id: 'os', label: 'OS Concepts', desc: 'Processes, threads, scheduling, virtual memory', iconType: 'security', pos: { x: 2, y: -1, z: 1 } },
            { id: 'net2', label: 'Networking', desc: 'Sockets, TCP/UDP, epoll, io_uring', iconType: 'queue', pos: { x: 6, y: 1, z: -1 } },
            { id: 'gpu', label: 'CUDA / OpenGL', desc: 'GPU kernels, shaders, parallelism, SIMD', iconType: 'ml_model', pos: { x: 0, y: -4, z: -2 } },
        ],
        edges: [['c', 'cpp'], ['cpp', 'os'], ['os', 'net2'], ['cpp', 'gpu']],
    },
};

// ──────────────────────────────────────────────────────────────
// Scene Setup
// ──────────────────────────────────────────────────────────────
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
    scene.environmentIntensity = 0.6;

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 25);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.minDistance = 6;
    controls.maxDistance = 50;

    const lights = [
        new THREE.DirectionalLight(0xffffff, 1.5),
        new THREE.DirectionalLight(0x9966ff, 0.8),
        new THREE.AmbientLight(0x1E3A5F, 0.9)
    ];
    lights[0].position.set(10, 20, 10);
    lights[1].position.set(-10, -10, -10);
    scene.add(...lights);

    const uniforms = { uTime: { value: 0 } };
    return { scene, camera, renderer, controls, uniforms };
};

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────
const TechStacksVisualiser = () => {
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const engineRef = useRef(null);
    const requestRef = useRef(null);
    const composerRef = useRef(null);
    const [selectedStack, setSelectedStack] = useState(null);
    const [activeNodeDesc, setActiveNodeDesc] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (!canvasRef.current || !selectedStack) return;

        const { scene, camera, renderer, controls, uniforms } = setupScene(canvasRef.current);
        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.9, 0.5, 0.8));
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

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            composer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        buildStack(STACKS[selectedStack]);

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(requestRef.current);
            if (engineRef.current) engineRef.current.dispose();
            renderer.dispose();
        };
    }, [selectedStack]);

    const buildStack = (stackData) => {
        if (!engineRef.current) return;
        const engine = engineRef.current;
        engine.reset();
        setIsPlaying(true);
        setActiveNodeDesc(null);

        stackData.nodes.forEach((node, i) => {
            setTimeout(() => {
                // Drop from height with type-specific 3D icon
                engine.graphCreateNode(node.id, node.label, node.pos.x, node.pos.y + 10, node.iconType);
                engine.move(node.id, { ...node.pos }, 1.4);
                engine.pulse(node.id);
                setActiveNodeDesc({ title: node.label, desc: node.desc });

                // Connect to prior nodes if edge exists for this node
                stackData.edges.forEach(([u, v]) => {
                    if (v === node.id && engine.objects[u]) {
                        setTimeout(() => engine.graphConnect(u, v, true), 600);
                    }
                });

                if (i === stackData.nodes.length - 1) {
                    setTimeout(() => setIsPlaying(false), 2000);
                }
            }, i * 1600);
        });
    };

    // ── Picker screen ──
    if (!selectedStack) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center pt-24 pb-12 px-6 font-sans">
                <div className="max-w-6xl w-full text-center mb-12">
                    <h1 className="text-5xl md:text-6xl font-black mb-4 text-[#1E3A5F] tracking-tight">
                        Tech Stack <span className="text-[#C41E3A]">Visualizer</span>
                    </h1>
                    <p className="text-lg text-gray-500 max-w-2xl mx-auto font-light leading-relaxed">
                        Choose a technology domain to see its architecture rendered in real-time 3D — complete with realistic icons and animated data flow.
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 w-full max-w-7xl px-2">
                    {Object.entries(STACKS).map(([id, stack]) => (
                        <button
                            key={id}
                            onClick={() => setSelectedStack(id)}
                            className="group flex flex-col items-start p-6 bg-white border border-gray-200 hover:border-[#C41E3A] hover:shadow-2xl rounded-2xl transition-all duration-400 text-left transform hover:-translate-y-1 hover:scale-105"
                        >
                            <div
                                className="w-12 h-12 mb-4 rounded-xl flex items-center justify-center text-white transition-all duration-300 shadow-lg"
                                style={{ backgroundColor: stack.color }}
                            >
                                {stack.icon}
                            </div>
                            <h3 className="text-base font-bold text-[#1E3A5F] mb-1 tracking-tight leading-tight">{stack.title}</h3>
                            <p className="text-xs text-gray-400">{stack.subtitle}</p>
                            <div className="mt-3 flex gap-1 flex-wrap">
                                {stack.nodes.slice(0, 3).map(n => (
                                    <span key={n.id} className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{n.label}</span>
                                ))}
                                {stack.nodes.length > 3 && (
                                    <span className="text-[10px] text-gray-400 py-0.5">+{stack.nodes.length - 3} more</span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const currentStack = STACKS[selectedStack];

    // ── 3D View ──
    return (
        <div className="w-screen h-screen overflow-hidden bg-[#0A0F1C] relative font-sans">
            <canvas ref={canvasRef} className="absolute inset-0 z-0 outline-none" />

            {/* Header — fixed position so navbar doesn't overlap */}
            <div className="absolute top-16 left-0 right-0 px-6 py-4 z-10 flex justify-between items-center bg-gradient-to-b from-[#0A0F1C]/90 to-transparent">
                <button
                    onClick={() => setSelectedStack(null)}
                    className="flex items-center gap-2 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg backdrop-blur-md border border-white/10 transition-all font-medium"
                >
                    <ChevronLeft size={18} /> Back
                </button>
                <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 shadow-2xl">
                    <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: currentStack.color }} />
                    <h2 className="text-white font-bold tracking-wide">{currentStack.title}</h2>
                    <span className="text-white/40 text-xs hidden sm:block">· {currentStack.subtitle}</span>
                </div>
                <button
                    onClick={() => buildStack(currentStack)}
                    disabled={isPlaying}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-bold text-sm transition-all ${isPlaying
                        ? 'bg-white/5 text-white/30 border-white/5 cursor-not-allowed'
                        : 'bg-[#C41E3A]/20 hover:bg-[#C41E3A]/40 text-white border-[#C41E3A]/50'}`}
                >
                    <Play size={16} className={isPlaying ? 'animate-spin opacity-50' : ''} />
                    {isPlaying ? 'Building...' : 'Replay'}
                </button>
            </div>

            {/* Cinematic Info Panel */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 w-full max-w-xl px-6 pointer-events-none">
                <div className={`transition-all duration-600 transform ${activeNodeDesc ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                    <div className="bg-white/8 backdrop-blur-xl border border-white/15 p-6 rounded-2xl shadow-2xl">
                        <div className="absolute top-0 left-0 w-full h-0.5 rounded-t-2xl" style={{ background: `linear-gradient(90deg, transparent, ${currentStack.color}, transparent)` }} />
                        <span className="text-xs font-bold uppercase tracking-widest mb-1 block" style={{ color: currentStack.color }}>
                            Now Rendering
                        </span>
                        <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">{activeNodeDesc?.title}</h3>
                        <p className="text-sm text-white/60 font-light leading-relaxed">{activeNodeDesc?.desc}</p>
                    </div>
                </div>
            </div>

            {/* Node legend */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10 flex flex-col gap-2 bg-black/30 backdrop-blur-md rounded-xl p-3 border border-white/10">
                {currentStack.nodes.map(n => (
                    <div key={n.id} className="flex items-center gap-2 text-xs text-white/60">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentStack.color }} />
                        {n.label}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TechStacksVisualiser;
