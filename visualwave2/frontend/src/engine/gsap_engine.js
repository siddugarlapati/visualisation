/**
 * gsap_engine.js - Modular GSAP Visualization Engine (Refactored)
 * 
 * This is the main entry point for the visualization engine.
 * All core functionality has been modularized into separate files.
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// ═══════════════════════════════════════════════════════════════════
// CORE MODULE IMPORTS
// ═══════════════════════════════════════════════════════════════════

import {
    createPhysicalMaterial,
    getMaterialByType,
    getElementalMaterial,
    getMorphConfig,
    COLORS,
    ELEMENT_COLORS,
    ELEMENT_PARTICLE_CONFIGS,
    MAT_GLASS_ORB,
    MAT_CERAMIC,
    MAT_GLOW,
    MAT_LASER,
    MAT_PARTICLE
} from './materials.js';

import {
    createHighResGeometry,
    createSuperformulaGeometry,
    createIconGeometry,
    GEOMETRY_CONFIG
} from './geometry.js';

import {
    hash,
    simplexNoise3D,
    getNoiseDisplacement,
    morphGeometry,
    dissolveMesh,
    reformMesh,
    MorphController
} from './morphing.js';

import {
    GPUParticleSystem,
    ParticleSystem,
    dissolveObjectToParticles,
    reformParticlesToObject
} from './particles.js';

// ═══════════════════════════════════════════════════════════════════
// DATA STRUCTURE API IMPORTS
// ═══════════════════════════════════════════════════════════════════

import { registerArrayAPI } from './api/array_api.js';
import { registerBSTAPI } from './api/bst_api.js';
import { registerDoublyLinkedListAPI } from './api/dll_api.js';
import { registerDPTableAPI } from './api/dp_api.js';
import { registerGraphAPI } from './api/graph_api.js';
import { registerHashMapAPI } from './api/hashmap_api.js';
import { registerHeapAPI } from './api/heap_api.js';
import { registerLinkedListAPI } from './api/list_api.js';
import { registerQueueAPI } from './api/queue_api.js';
import { registerSetAPI } from './api/set_api.js';
import { registerStackAPI } from './api/stack_api.js';
import { registerTreeAPI } from './api/tree_api.js';
import { registerTrieAPI } from './api/trie_api.js';
import { registerRegressionAPI } from './api/ml/regression_api.js';
import { registerPipelineAPI } from './api/ml/ml_pipeline.js';
import { registerClusteringAPI } from './api/ml/clustering_api.js';
import { registerClassificationAPI } from './api/ml/classification_api.js';
import { registerPCAAPI } from './api/ml/pca_api.js';
import { registerSVMAPI } from './api/ml/svm_api.js';
import { registerTreeMLAPI } from './api/ml/tree_ml_api.js';
import { registerKNNAPI } from './api/ml/knn_api.js';
import { registerNaiveBayesAPI } from './api/ml/naive_bayes_api.js';
import { registerDBSCANAPI } from './api/ml/dbscan_api.js';
import { registerGMMAPI } from './api/ml/gmm_api.js';
import { registerBoostingAPI } from './api/ml/boosting_api.js';
import { registerNeuralNetworkAPI } from './api/ml/neural_network_api.js';
import { createTextSprite, spawnPointCloud as spawnPointCloudBase } from './api/ml/ml_base.js';

// ═══════════════════════════════════════════════════════════════════
// GSAP ENGINE CLASS
// ═══════════════════════════════════════════════════════════════════

export class GSAPEngine {
    constructor(scene, camera, controls, bgObjects) {
        this.scene = scene;
        this.camera = camera;
        this.controls = controls;
        this.bgObjects = bgObjects;
        this.objects = {};
        this.connections = [];
        this.billboards = []; // Objects that should always face the camera
        this.tl = gsap ? gsap.timeline() : null;
        this.particles = new ParticleSystem(scene, camera);
    }

    initTimeline() { if (!this.tl && gsap) this.tl = gsap.timeline(); }

    // ═══════════════════════════════════════════════════════════════════
    // SPATIAL AWARENESS SYSTEM
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Get all currently occupied positions with their bounding radii
     * @returns {Array<{x: number, y: number, z: number, radius: number}>}
     */
    getOccupiedPositions() {
        const positions = [];
        Object.values(this.objects).forEach(obj => {
            if (obj.group) {
                const pos = obj.group.position;
                // Estimate radius based on object type
                let radius = 1.5; // Default radius
                if (obj.type === 'cube' || obj.type === 'array_cell') radius = 1.0;
                else if (obj.type === 'node' || obj.type === 'elemental_node') radius = 1.2;
                else if (obj.type === 'tree_node') radius = 1.8;
                positions.push({ x: pos.x, y: pos.y, z: pos.z, radius, id: obj.id });
            }
        });
        return positions;
    }

    /**
     * Check if a position would collide with existing objects
     * @param {Object} pos - {x, y, z} position to check
     * @param {number} radius - Radius of the new object
     * @param {string} excludeId - Optional ID to exclude from collision check
     * @returns {boolean} True if collision detected
     */
    checkCollision(pos, radius = 1.5, excludeId = null) {
        const minDistance = radius * 2; // Minimum distance between object centers
        const occupied = this.getOccupiedPositions();

        for (const occ of occupied) {
            if (excludeId && occ.id === excludeId) continue;
            const dx = pos.x - occ.x;
            const dy = pos.y - occ.y;
            const dz = pos.z - occ.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const minRequired = (radius + occ.radius) * 1.1; // 10% buffer
            if (distance < minRequired) {
                return true; // Collision detected
            }
        }
        return false;
    }

    /**
     * Find a safe position that doesn't collide with existing objects
     * Uses spiral search pattern in X-Z plane, then shifts Y if needed
     * @param {Object} suggestedPos - {x, y, z} initial suggested position
     * @param {number} radius - Radius of the new object
     * @param {Object} options - { maxAttempts, stepSize, preferAxis }
     * @returns {Object} Safe position {x, y, z}
     */
    findSafePosition(suggestedPos, radius = 1.5, options = {}) {
        const maxAttempts = options.maxAttempts || 50;
        const stepSize = options.stepSize || 2.0;
        const preferAxis = options.preferAxis || 'xz'; // 'xz', 'xy', or 'xyz'

        let pos = { x: suggestedPos.x, y: suggestedPos.y, z: suggestedPos.z };

        // First try: exact position
        if (!this.checkCollision(pos, radius)) {
            return pos;
        }

        // Spiral search pattern
        let angle = 0;
        let ringRadius = stepSize;
        let attempt = 0;

        while (attempt < maxAttempts) {
            // Try positions in current ring
            const pointsInRing = Math.max(6, Math.floor(ringRadius * 2));
            const angleStep = (Math.PI * 2) / pointsInRing;

            for (let i = 0; i < pointsInRing && attempt < maxAttempts; i++) {
                let testPos;
                if (preferAxis === 'xz') {
                    testPos = {
                        x: suggestedPos.x + Math.cos(angle) * ringRadius,
                        y: suggestedPos.y,
                        z: suggestedPos.z + Math.sin(angle) * ringRadius
                    };
                } else if (preferAxis === 'xy') {
                    testPos = {
                        x: suggestedPos.x + Math.cos(angle) * ringRadius,
                        y: suggestedPos.y + Math.sin(angle) * ringRadius,
                        z: suggestedPos.z
                    };
                } else {
                    // 3D spiral
                    testPos = {
                        x: suggestedPos.x + Math.cos(angle) * ringRadius,
                        y: suggestedPos.y + (attempt % 3 - 1) * stepSize * 0.5,
                        z: suggestedPos.z + Math.sin(angle) * ringRadius
                    };
                }

                // Clamp to safe bounds
                testPos.x = Math.max(-12, Math.min(12, testPos.x));
                testPos.y = Math.max(-6, Math.min(6, testPos.y));
                testPos.z = Math.max(-2, Math.min(8, testPos.z));

                if (!this.checkCollision(testPos, radius)) {
                    console.log(`🎯 Found safe position at attempt ${attempt + 1}: (${testPos.x.toFixed(2)}, ${testPos.y.toFixed(2)}, ${testPos.z.toFixed(2)})`);
                    return testPos;
                }

                angle += angleStep;
                attempt++;
            }

            ringRadius += stepSize;
        }

        // Fallback: push to a new Z layer
        console.warn(`⚠️ Could not find collision-free position after ${maxAttempts} attempts. Pushing to new layer.`);
        return {
            x: suggestedPos.x,
            y: suggestedPos.y,
            z: suggestedPos.z + 4 // Push forward in Z
        };
    }

    /**
     * Wrapper to get safe position for object creation
     * Automatically adjusts position if collision detected
     * @param {Object} pos - Suggested position {x, y, z}
     * @param {string} objectType - Type of object being created
     * @returns {Object} Safe position {x, y, z}
     */
    getSafePositionForType(pos, objectType = 'node') {
        const radiusMap = {
            'cube': 1.0,
            'array_cell': 1.0,
            'node': 1.2,
            'elemental_node': 1.2,
            'tree_node': 1.8,
            'graph_node': 1.5,
            'list_node': 1.3,
            'dll_node': 1.3
        };
        const radius = radiusMap[objectType] || 1.5;
        return this.findSafePosition(pos, radius);
    }


    /**
     * Apply lighting preset to change scene mood
     */
    applyLightingPreset(presetName) {
        const PRESETS = {
            'neutral-studio': { ambient: 0x3b82f6, ambientInt: 0.15, dir1: 0x93c5fd, dir1Int: 0.45, dir2: 0x38bdf8, dir2Int: 0.15 },
            'cool-tech': { ambient: 0x00aaff, ambientInt: 0.12, dir1: 0x66ccff, dir1Int: 0.55, dir2: 0x0088ff, dir2Int: 0.25 },
            'warm-product': { ambient: 0xffaa66, ambientInt: 0.20, dir1: 0xffddaa, dir1Int: 0.40, dir2: 0xffa500, dir2Int: 0.20 },
            'dark-scifi': { ambient: 0x6600ff, ambientInt: 0.10, dir1: 0x6666ff, dir1Int: 0.35, dir2: 0xff00ff, dir2Int: 0.30 }
        };
        const p = PRESETS[presetName];
        if (!p) { console.warn(`Unknown lighting preset: ${presetName}`); return; }

        let dirIndex = 0;
        this.scene.traverse((obj) => {
            if (obj.isAmbientLight) { obj.color.setHex(p.ambient); obj.intensity = p.ambientInt; }
            if (obj.isDirectionalLight) {
                if (dirIndex === 0) { obj.color.setHex(p.dir1); obj.intensity = p.dir1Int; }
                else if (dirIndex === 1) { obj.color.setHex(p.dir2); obj.intensity = p.dir2Int; }
                dirIndex++;
            }
        });
        console.log(`✨ Lighting preset applied: ${presetName}`);
    }

    tick() {
        this.particles.tick();

        this.connections.forEach(conn => {
            if (!conn.obj1 || !conn.obj2 || !conn.mesh) return;
            if (!conn.obj1.group || !conn.obj2.group) return;

            const p1 = conn.obj1.group.position;
            const p2 = conn.obj2.group.position;

            if (!conn.lastP1) conn.lastP1 = p1.clone();
            if (!conn.lastP2) conn.lastP2 = p2.clone();

            const p1Changed = conn.lastP1.distanceTo(p1) > 0.01;
            const p2Changed = conn.lastP2.distanceTo(p2) > 0.01;

            if (p1Changed || p2Changed) {
                const dist = p1.distanceTo(p2);
                const arcHeight = Math.min(dist * 0.4, 4); // Increased for more curved edges
                const c1 = p1.clone().add(new THREE.Vector3(0, arcHeight, 0));
                const c2 = p2.clone().add(new THREE.Vector3(0, arcHeight, 0));
                const curve = new THREE.CubicBezierCurve3(p1.clone(), c1, c2, p2.clone());

                conn.mesh.geometry.dispose();
                conn.mesh.geometry = new THREE.TubeGeometry(curve, 24, 0.08, 8, false);
                conn.lastP1.copy(p1);
                conn.lastP2.copy(p2);

                // Update label position if exists
                if (conn.labelId && this.objects[conn.labelId]) {
                    const mid = curve.getPoint(0.5);
                    // Add slight vertical offset for visibility above the tube
                    // And the standard "consistent" offset for edge weights
                    this.objects[conn.labelId].group.position.set(mid.x, mid.y + 0.4, mid.z);
                }
            }
        });

        // Update billboards to face camera
        this.billboards.forEach(obj => {
            if (obj && obj.group) {
                obj.group.quaternion.copy(this.camera.quaternion);
            }
        });
    }

    reset() {
        if (this.tl) this.tl.clear();

        const fadeTargets = [];
        const oldObjects = { ...this.objects };
        const oldConnections = [...this.connections];

        Object.values(oldObjects).forEach(obj => {
            if (obj.group) { this._enableTransparency(obj.group); fadeTargets.push(obj.group); }
        });
        oldConnections.forEach(c => {
            if (c.mesh) { this._enableTransparency(c.mesh); fadeTargets.push(c.mesh); }
        });

        // IMPORTANT: Clear tracking maps IMMEDIATELY so new objects can be created without ID conflicts
        this.objects = {};
        this.connections = [];
        this.billboards = [];
        this._graphNodeCount = 0;
        this._graphNodePositions = {};
        this.treeNodes = {};
        this._bstNodes = {};
        this.arrays = {};

        if (gsap && fadeTargets.length > 0) {
            fadeTargets.forEach(target => {
                gsap.to(target.scale, { x: 0, y: 0, z: 0, duration: 0.5, ease: "power2.in" });
            });
            fadeTargets.forEach(target => {
                target.traverse((child) => {
                    if (child.isMesh && child.material) {
                        const materials = Array.isArray(child.material) ? child.material : [child.material];
                        materials.forEach(mat => gsap.to(mat, { opacity: 0, duration: 0.5, ease: "power2.in" }));
                    }
                });
            });
            // Cleanup THREE.js resources after animation
            gsap.delayedCall(0.5, () => {
                fadeTargets.forEach(target => {
                    if (target.parent) target.parent.remove(target);
                    target.traverse(c => {
                        if (c.geometry) c.geometry.dispose();
                        if (c.material) {
                            if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
                            else c.material.dispose();
                        }
                    });
                });
            });
        }
    }

    dispose() {
        if (this.tl) { this.tl.kill(); this.tl = null; }
        this._disposeAll();
        if (this.particles && this.particles.dispose) this.particles.dispose();
        this.objects = {};
        this.connections = [];
        this.scene = null;
        this.camera = null;
        this.controls = null;
        this.bgObjects = null;
    }

    _disposeAll() {
        Object.values(this.objects).forEach(obj => {
            if (obj.group) {
                this.scene.remove(obj.group);
                obj.group.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                        else child.material.dispose();
                    }
                });
            }
        });
        this.connections.forEach(conn => {
            if (conn.mesh) {
                this.scene.remove(conn.mesh);
                if (conn.mesh.geometry) conn.mesh.geometry.dispose();
                if (conn.mesh.material) conn.mesh.material.dispose();
            }
        });
        this.objects = {};
        this.connections = [];
        this.billboards = [];
        if (this.bgObjects) this.bgObjects.forEach(bg => bg.rotSpeed = 0.003);
    }

    execute(actions) {
        this.initTimeline();
        if (!Array.isArray(actions)) return;
        this.tl.clear();
        console.log("🚀 EXECUTE:", actions);
        actions.forEach(act => {
            try {
                switch (act.type) {
                    // ARRAY API
                    case 'create_array_api': this.createArrayAPI(act.id, act.values, act.x, act.y); break;
                    case 'array_highlight': this.arrayHighlight(act.id, act.index, act.color); break;
                    case 'array_compare': this.arrayCompare(act.id, act.i, act.j); break;
                    case 'array_update': this.arrayUpdate(act.id, act.index, act.value); break;
                    case 'array_insert': this.arrayInsert(act.id, act.index, act.value); break;
                    case 'array_delete': this.arrayDelete(act.id, act.index); break;
                    case 'array_swap': this.arraySwap(act.id, act.i, act.j); break;
                    case 'array_move_ptr': this.arrayMovePointer(act.id, act.index, act.ptrId); break;

                    // LINKED LIST
                    case 'll_create_node': this.createListNode(act.id, act.value, act.x, act.y); break;
                    case 'll_next': this.listNext(act.id1, act.id2); break;
                    case 'll_highlight': this.listHighlight(act.id, act.color); break;
                    case 'll_compare': this.listCompare(act.id1, act.id2); break;
                    case 'll_insert_after': this.listInsertAfter(act.prev, act.newId); break;
                    case 'll_delete': this.listDelete(act.id); break;
                    case 'll_create_ptr': this.createListPointer(act.id, act.label, act.x, act.y); break;
                    case 'll_move_ptr': this.listMovePointer(act.ptrId, act.target); break;

                    // DOUBLY LINKED LIST
                    case 'dll_create_node': this.createDLLNode(act.id, act.value, act.x, act.y); break;
                    case 'dll_next': this.dllNext(act.id1, act.id2); break;
                    case 'dll_prev': this.dllPrev(act.id1, act.id2); break;
                    case 'dll_highlight': this.dllHighlight(act.id, act.color); break;
                    case 'dll_compare': this.dllCompare(act.id1, act.id2); break;
                    case 'dll_insert_after': this.dllInsertAfter(act.prev, act.newId); break;
                    case 'dll_delete': this.dllDelete(act.id); break;
                    case 'dll_create_ptr': this.createDLLPointer(act.id, act.label, act.x, act.y); break;
                    case 'dll_move_ptr': this.dllMovePointer(act.ptrId, act.target); break;

                    // BINARY TREE
                    case 'tree_create_node': this.createTreeNodeAPI(act.id, act.value, act.parentId, act.isLeft); break;
                    case 'tree_highlight': this.treeHighlight(act.id, act.color); break;
                    case 'tree_bump': this.treeBump(act.id1, act.id2); break;
                    case 'tree_shake': this.treeShake(act.id); break;
                    case 'tree_confetti': this.treeConfetti(act.id); break;

                    // BINARY SEARCH TREE
                    case 'bst_root': this.bstCreateRoot(act.id, act.value, act.x, act.y); break;
                    case 'bst_child': this.bstCreateChild(act.id, act.value, act.parentId, act.side, act.offset); break;
                    case 'bst_compare': this.bstCompare(act.node, act.probe); break;
                    case 'bst_direction': this.bstHighlightDirection(act.id, act.color); break;
                    case 'bst_move_probe': this.bstMoveProbe(act.probeId, act.targetId); break;
                    case 'bst_inserted': this.bstInserted(act.id); break;
                    case 'bst_found': this.bstFound(act.id); break;
                    case 'bst_not_found': this.bstNotFound(act.probe); break;

                    // TRIE
                    case 'trie_init': this.trieInit(act.x, act.y); break;
                    case 'trie_insert': this.trieInsert(act.word, act.x, act.y); break;
                    case 'trie_search': this.trieSearch(act.word); break;
                    case 'trie_prefix': this.trieHighlightPrefix(act.prefix); break;
                    case 'trie_suggest': this.trieSuggestFrom(act.id); break;

                    // GRAPH
                    case 'graph_create_node': this.graphCreateNode(act.id, act.value, act.x, act.y, act.iconType); break;
                    case 'graph_connect': this.graphConnect(act.id1, act.id2, act.directed); break;
                    case 'graph_connect_weighted': this.graphConnectWeighted(act.id1, act.id2, act.weight); break;
                    case 'graph_highlight': this.graphHighlight(act.id, act.color); break;
                    case 'graph_highlight_edge': this.graphHighlightEdge(act.id1, act.id2, act.color); break;
                    case 'graph_move_ptr': this.graphMovePointer(act.ptrId, act.targetId); break;
                    case 'graph_queue_push': this.graphQueuePush(act.id); break;
                    case 'graph_queue_pop': this.graphQueuePop(act.id); break;
                    case 'graph_visit_dfs': this.graphVisitDFS(act.id); break;
                    case 'graph_relax': this.graphRelaxEdge(act.id1, act.id2); break;
                    case 'graph_path': this.graphPath(act.path, act.color); break;
                    case 'graph_not_found': this.graphNotFound(act.id); break;

                    // HASHMAP
                    case 'hash_create': this.createHashMap(act.mapId, act.bucketCount, act.x, act.y); break;
                    case 'hash_set': this.hashSet(act.mapId, act.bucket, act.key, act.value); break;
                    case 'hash_remove': this.hashRemove(act.mapId, act.bucket); break;
                    case 'hash_highlight': this.hashHighlight(act.mapId, act.bucket, act.color); break;
                    case 'hash_bump': this.hashBump(act.mapId, act.bucket); break;
                    case 'hash_shake': this.hashShake(act.mapId, act.bucket); break;

                    // HEAP
                    case 'heap_init': this.heapInit(act.heapId, act.values, act.x, act.y); break;
                    case 'heap_swap': this.heapSwap(act.heapId, act.i, act.j); break;
                    case 'heap_get': this.heapGet(act.heapId, act.index); break;
                    case 'heap_insert': this.heapInsert(act.heapId, act.value); break;
                    case 'heap_compare': this.heapCompare(act.heapId, act.i, act.j); break;
                    case 'heap_update': this.heapUpdate(act.heapId, act.index, act.value); break;
                    case 'heap_inserted': this.heapInserted(act.heapId, act.index); break;
                    case 'heap_heapified': this.heapHeapified(act.heapId, act.index); break;
                    case 'heap_not_found': this.heapNotFound(act.heapId); break;

                    // DP TABLE
                    case 'dp_init': this.dpInit(act.rows, act.cols, act.x, act.y); break;
                    case 'dp_set': this.dpSet(act.r, act.c, act.value); break;
                    case 'dp_highlight': this.dpHighlight(act.r, act.c, act.color); break;
                    case 'dp_transition': this.dpTransition(act.from, act.toR, act.toC); break;
                    case 'dp_pointer': this.dpPointer(act.ptrId, act.r, act.c); break;
                    case 'dp_answer': this.dpAnswer(act.r, act.c); break;
                    case 'dp_clear': this.dpClear(); break;

                    // QUEUE
                    case 'queue_create': this.createQueue(act.queueId, act.x, act.y); break;
                    case 'queue_enqueue': this.queueEnqueue(act.queueId, act.itemId, act.value); break;
                    case 'queue_dequeue': this.queueDequeue(act.queueId); break;
                    case 'queue_peek': this.queuePeek(act.queueId); break;
                    case 'queue_underflow': this.queueUnderflow(act.queueId); break;

                    // STACK
                    case 'stack_create': this.createStack(act.stackId, act.x, act.y); break;
                    case 'stack_push': this.stackPush(act.stackId, act.itemId, act.value); break;
                    case 'stack_pop': this.stackPop(act.stackId); break;
                    case 'stack_peek': this.stackPeek(act.stackId); break;
                    case 'stack_underflow': this.stackUnderflow(act.stackId); break;

                    // SET
                    case 'set_init': this.setInit(act.setId, act.values, act.x, act.y); break;
                    case 'set_check': this.setCheck(act.setId, act.index, act.probeId); break;
                    case 'set_found': this.setFound(act.setId, act.index, act.color); break;
                    case 'set_insert': this.setInsert(act.setId, act.value, act.index, act.x, act.y); break;
                    case 'set_remove': this.setRemove(act.setId, act.index); break;
                    case 'set_not_found': this.setNotFound(act.probeId); break;

                    // GENERIC BASE ACTIONS
                    case 'highlight': act.targets.forEach(tid => this.highlight(tid, COLORS[act.color] || COLORS.blue)); break;
                    case 'bump': this.bump(act.id1, act.id2); break;
                    case 'swap': this.swap(act.id1, act.id2); break;
                    case 'move': this.move(act.id, { x: act.x, y: act.y, z: 0 }, act.duration || 1); break;
                    case 'pulse': this.pulse(act.id); break;
                    case 'shake': this.shake(act.id); break;
                    case 'focus': this.focusCamera(act.id); break;
                    case 'confetti': this.confetti(this.objects[act.id].group.position, act.color); break;
                    // LINEAR REGRESSION
                    case 'reg_spawn_point': this.spawnPoint(act.id, act.x, act.y, act.z); break;
                    case 'reg_spawn_line': this.spawnLine(act.id, act.p1, act.p2); break;
                    case 'reg_spawn_plane': this.spawnPlane(act.id, act.width, act.depth, act.center, act.rotation); break;
                    case 'reg_update_model': this.moveLine(act.id, act.p1, act.p2); break;
                    case 'reg_error_line': this.drawErrorLine(act.id, act.p_data, act.p_line); break;

                    case 'warp_bg': this.warpBackground(act.speed || 0.02); break;

                    default: console.warn("Unknown action type:", act.type);
                }
            } catch (e) { console.error("Fail:", act, e); }
        });
    }

    confetti(pos, colorHex) {
        const c = colorHex ? (COLORS[colorHex] || colorHex) : 0xf59e0b;
        this.particles.emit(pos, 15, c);
    }

    /**
     * Emit particles from a specified position
     * @param {Object} pos - {x, y, z} position
     * @param {number} count - number of particles to emit
     * @param {Object} options - {color, speed, etc}
     */
    emitParticles(pos, count = 10, options = {}) {
        // Resolve color
        let color = options.color || 0x00ffff;
        if (typeof color === 'string' && COLORS[color]) {
            color = COLORS[color];
        }

        // Use the existing particle system
        if (this.particles && this.particles.emit) {
            this.particles.emit(pos, count, color);
        }
    }

    /**
     * Create a particle field effect (stub for AI compatibility)
     * @param {number} count - Number of particles
     * @param {Object} options - {size, color, spread}
     */
    createParticleField(count = 10, options = {}) {
        // Emit particles at origin with specified color
        const color = options.color ? (COLORS[options.color] || options.color) : 0x00ffff;
        this.particles.emit({ x: 0, y: 0, z: 0 }, count, color);
    }

    /**
     * Dissolve an object into particles (dramatic effect)
     * @param {string} id - Object ID to dissolve
     * @param {Object} options - {duration, swirl}
     */
    dissolveToParticles(id, options = {}) {
        const obj = this.objects[id];
        if (!obj || !obj.group) {
            console.warn(`dissolveToParticles: '${id}' not found`);
            return;
        }

        const pos = obj.group.position;
        const color = options.color ? (COLORS[options.color] || options.color) : 0x00ffff;

        // Emit particles at object position
        this.particles.emit({ x: pos.x, y: pos.y, z: pos.z }, 30, color);

        // Fade out the object
        if (gsap && obj.mesh && obj.mesh.material) {
            gsap.to(obj.mesh.material, {
                opacity: 0,
                duration: options.duration || 1.5,
                ease: 'power2.out'
            });
            obj.mesh.material.transparent = true;
        }
    }

    /**
     * Reform an object from particles (reverse dissolve)
     * @param {string} id - Object ID to reform
     * @param {Object} options - {duration}
     */
    reformFromParticles(id, options = {}) {
        const obj = this.objects[id];
        if (!obj || !obj.group) {
            console.warn(`reformFromParticles: '${id}' not found`);
            return;
        }

        const pos = obj.group.position;
        const color = options.color ? (COLORS[options.color] || options.color) : 0x00ffff;

        // Emit particles at object position
        this.particles.emit({ x: pos.x, y: pos.y, z: pos.z }, 20, color);

        // Fade in the object
        if (gsap && obj.mesh && obj.mesh.material) {
            obj.mesh.material.transparent = true;
            obj.mesh.material.opacity = 0;
            gsap.to(obj.mesh.material, {
                opacity: 1,
                duration: options.duration || 1.5,
                ease: 'power2.in'
            });
        }
    }

    warpBackground(speed) {
        if (this.bgObjects) {
            this.bgObjects.forEach(bg => {
                if (gsap) gsap.to(bg.rotation, { z: `+=${speed * 10}`, duration: 1, ease: "linear", repeat: -1 });
            });
        }
    }

    connect(id1, id2) {
        const obj1 = this.objects[id1];
        const obj2 = this.objects[id2];
        if (!obj1 || !obj2) return;

        const p1 = obj1.group.position.clone();
        const p2 = obj2.group.position.clone();
        const dist = p1.distanceTo(p2);
        const arcHeight = Math.min(dist * 0.4, 4); // Increased for more curved edges

        const c1 = p1.clone().add(new THREE.Vector3(0, arcHeight, 0));
        const c2 = p2.clone().add(new THREE.Vector3(0, arcHeight, 0));
        const curve = new THREE.CubicBezierCurve3(p1, c1, c2, p2);
        const geometry = new THREE.TubeGeometry(curve, 24, 0.08, 8, false);

        const material = MAT_LASER.clone();
        material.opacity = 0;

        const mesh = new THREE.Mesh(geometry, material);
        this.scene.add(mesh);
        this.connections.push({ id1, id2, obj1, obj2, mesh });

        if (gsap) {
            gsap.to(material, { opacity: 0.8, duration: 0.8, ease: "power2.out" });
            mesh.scale.set(0.5, 0.5, 0.5);
            gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: "back.out(1.5)" });
        }
    }

    /**
     * Get connection object between two nodes
     * @param {string} id1 
     * @param {string} id2 
     * @returns {Object|null} Connection object or null
     */
    getEdge(id1, id2) {
        return this.connections.find(c =>
            (c.id1 === id1 && c.id2 === id2) ||
            (c.id1 === id2 && c.id2 === id1)
        );
    }

    /**
     * Highlight a specific edge
     */
    highlightEdge(id1, id2, colorHex, duration = 0.5) {
        const conn = this.getEdge(id1, id2);
        if (!conn || !conn.mesh) return;

        // Resolve color
        let color = colorHex;
        if (typeof color === 'string' && COLORS[color]) color = COLORS[color];
        else if (typeof color === 'string' && color.startsWith('0x')) color = parseInt(color, 16);

        const mat = conn.mesh.material;
        const c = new THREE.Color(color);

        if (gsap) {
            gsap.to(mat.color, { r: c.r, g: c.g, b: c.b, duration: duration });
            gsap.to(mat, { opacity: 1, duration: duration });

            // Pulse effect
            gsap.to(conn.mesh.scale, { x: 1.5, y: 1.2, z: 1.5, duration: 0.2, yoyo: true, repeat: 1 });
        }
    }

    move(id, pos, duration = 1) {
        const obj = this.objects[id]; if (!obj || !this.tl) return;
        const currentX = obj.group.position.x; const destX = pos.x ?? currentX; const direction = destX > currentX ? -1 : 1;
        this.tl.to(obj.group.position, { x: pos.x ?? obj.group.position.x, y: pos.y ?? obj.group.position.y, z: pos.z ?? obj.group.position.z, duration, ease: "power3.inOut" });
        if (Math.abs(destX - currentX) > 0.5) {
            this.tl.to(obj.group.rotation, { z: 0.2 * direction, duration: duration * 0.2, ease: "sine.out" }, "<");
            this.tl.to(obj.group.rotation, { z: 0, duration: duration * 0.8, ease: "elastic.out(1, 0.5)" }, ">-0.8");
        }
    }

    swap(id1, id2, duration = 1.2, targetX1 = null, targetX2 = null) {
        const obj1 = this.objects[id1]; const obj2 = this.objects[id2]; if (!obj1 || !obj2 || !this.tl) return;

        // Use provided target positions or fall back to current
        // Passing targetX is better for batching animations where current position is stale
        const pos1X = obj1.group.position.x;
        const pos2X = obj2.group.position.x;
        const dest1X = targetX1 !== null ? targetX1 : pos2X;
        const dest2X = targetX2 !== null ? targetX2 : pos1X;

        const pos1Y = obj1.group.position.y;
        const pos1Z = obj1.group.position.z;
        const pos2Y = obj2.group.position.y;
        const pos2Z = obj2.group.position.z;

        const label = `swap_${Date.now()}_${Math.random()}`;
        this.tl.addLabel(label);

        // Sync camera shake with the timeline
        this.tl.to(this.camera.position, {
            x: "+=0.1", duration: 0.05, yoyo: true, repeat: 5, ease: "sine.inOut"
        }, label);

        // Animate obj1 to destination - Arch up and move slightly FORWARD in Z
        this.tl.to(obj1.group.position, { x: dest1X, duration, ease: "power2.inOut" }, label);
        this.tl.to(obj1.group.position, { y: pos1Y + 1.5, duration: duration / 2, yoyo: true, repeat: 1, ease: "sine.inOut" }, label);
        this.tl.to(obj1.group.position, { z: pos1Z + 1.2, duration: duration / 2, yoyo: true, repeat: 1, ease: "sine.inOut" }, label);

        // Animate obj2 to destination - Arch down and move slightly BACKWARD in Z
        this.tl.to(obj2.group.position, { x: dest2X, duration, ease: "power2.inOut" }, label);
        this.tl.to(obj2.group.position, { y: pos2Y - 1.5, duration: duration / 2, yoyo: true, repeat: 1, ease: "sine.inOut" }, label);
        this.tl.to(obj2.group.position, { z: pos2Z - 1.2, duration: duration / 2, yoyo: true, repeat: 1, ease: "sine.inOut" }, label);
    }

    highlight(id, colorHex, duration = 0.5) {
        const obj = this.objects[id];
        if (!obj || !this.tl) return;

        // Resolve string color names to hex values (e.g., 'fire' -> 0xff4500)
        if (typeof colorHex === 'string') {
            // First try to find in COLORS mapping (for named colors like 'fire', 'earth', etc.)
            const namedColor = COLORS[colorHex.toLowerCase()] || COLORS[colorHex];
            if (namedColor !== undefined) {
                colorHex = namedColor;
            }
            // If still a string and looks like a hex value (e.g., "0x4488ff"), convert to number
            else if (colorHex.startsWith('0x')) {
                colorHex = parseInt(colorHex, 16);
            }
        }

        let target = null;

        // Try various material locations
        if (obj.type === 'node' && obj.core && obj.core.material) target = obj.core.material;
        else if (obj.mesh && obj.mesh.material) target = obj.mesh.material;
        else if (obj.shell && obj.shell.material) target = obj.shell.material;
        else if (obj.core && obj.core.material) target = obj.core.material;

        // Fallback: search through group children for any mesh with material
        if (!target && obj.group) {
            obj.group.traverse((child) => {
                if (!target && child.isMesh && child.material && child.material.color) {
                    target = child.material;
                }
            });
        }

        if (!target) { console.warn(`Cannot highlight '${id}': no material found`); return; }

        this.createBeam(obj.group.position, colorHex);
        const c = new THREE.Color(colorHex);
        gsap.to(target.color, { r: c.r, g: c.g, b: c.b, duration: duration });
        if (target.emissive) {
            gsap.to(target.emissive, { r: c.r, g: c.g, b: c.b, duration: duration });
        }
    }

    createBeam(pos, colorHex) {
        const geo = new THREE.CylinderGeometry(0.6, 0.8, 0.1, 32, 1, true);
        geo.translate(0, 0.05, 0);
        const mat = new THREE.MeshBasicMaterial({
            color: colorHex, transparent: true, opacity: 0,
            side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
        });
        const beam = new THREE.Mesh(geo, mat);
        beam.position.copy(pos);
        beam.position.y -= 0.5;
        this.scene.add(beam);

        if (gsap) {
            const tl = gsap.timeline({
                onComplete: () => { this.scene.remove(beam); geo.dispose(); mat.dispose(); }
            });
            tl.to(beam.scale, { y: 50, duration: 0.5, ease: "power2.out" })
                .to(mat, { opacity: 0.4, duration: 0.2 }, "<")
                .to(mat, { opacity: 0, duration: 0.5 }, ">-0.2");
        }
    }

    pulse(id, scale = 1.2) {
        const obj = this.objects[id]; if (!obj || !this.tl) return;
        this.tl.to(obj.group.scale, { x: scale, y: scale, z: scale, duration: 0.15, yoyo: true, repeat: 3, ease: "sine.inOut" });
    }

    bump(id1, id2) {
        const obj1 = this.objects[id1]; const obj2 = this.objects[id2]; if (!obj1 || !obj2 || !this.tl) return;
        this.shakeCamera(0.05);
        const p1 = obj1.group.position; const p2 = obj2.group.position;
        const dx = p2.x - p1.x; const dy = p2.y - p1.y;
        this.tl.to(obj1.group.position, { x: p1.x + dx * 0.2, y: p1.y + dy * 0.2, duration: 0.15, ease: "power1.out" });
        this.tl.to(obj1.group.position, { x: p1.x, y: p1.y, duration: 0.3, ease: "elastic.out(1, 0.3)" });
        this.tl.to(obj2.group.position, { x: p2.x - dx * 0.2, y: p2.y - dy * 0.2, duration: 0.15, ease: "power1.out" }, "<");
        this.tl.to(obj2.group.position, { x: p2.x, y: p2.y, duration: 0.3, ease: "elastic.out(1, 0.3)" }, "<");
    }

    shake(id) {
        const obj = this.objects[id]; if (!obj || !this.tl) return;
        this.tl.to(obj.group.position, { x: "+=0.2", duration: 0.05, yoyo: true, repeat: 5 });
        this.highlight(id, COLORS.red);
    }

    shakeCamera(intensity = 0.1) {
        if (gsap && this.camera) {
            gsap.fromTo(this.camera.position, { x: this.camera.position.x }, { x: this.camera.position.x + intensity, duration: 0.05, yoyo: true, repeat: 3 });
        }
    }

    driftCamera(id, intensity = 0.15, duration = 1.5) {
        const obj = this.objects[id];
        if (!obj || !obj.group) return;
        if (!gsap || !this.camera || !this.controls) return;

        const targetPos = obj.group.position;
        const currentTarget = this.controls.target;

        // Calculate a subtle drift direction (only 15% of the way toward target)
        const driftX = currentTarget.x + (targetPos.x - currentTarget.x) * intensity;
        const driftY = currentTarget.y + (targetPos.y - currentTarget.y) * intensity;

        // Gentle, smooth animation - doesn't disable controls
        gsap.to(this.controls.target, {
            x: driftX,
            y: driftY,
            duration: duration,
            ease: "power1.out"
        });
    }

    resetCamera(duration = 2) {
        if (!gsap || !this.camera || !this.controls) return;

        // Reset to default home position
        const targetPos = new THREE.Vector3(0, 12, 30);
        const targetLookAt = new THREE.Vector3(0, 0, 0);

        const controlsEnabled = this.controls.enabled;
        this.controls.enabled = false;

        const tl = gsap.timeline({
            onComplete: () => {
                this.controls.enabled = controlsEnabled;
                if (this.controls.saveState) this.controls.saveState();
            }
        });

        tl.to(this.controls.target, {
            x: targetLookAt.x, y: targetLookAt.y, z: targetLookAt.z,
            duration,
            ease: "power2.inOut"
        }, 0);

        tl.to(this.camera.position, {
            x: targetPos.x, y: targetPos.y, z: targetPos.z,
            duration,
            ease: "power2.inOut"
        }, 0);
    }

    focusCamera(id, padding = 4) {
        const obj = this.objects[id];
        if (!obj || !obj.group) { console.warn(`focusCamera: object '${id}' not found`); return; }
        if (!gsap || !this.camera || !this.controls) return;

        const box = new THREE.Box3().setFromObject(obj.group);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) + padding;

        // Clamp camera distance to prevent extreme zoom
        cameraDistance = Math.max(cameraDistance, 12);  // Minimum 12 units away
        cameraDistance = Math.min(cameraDistance, 35);  // Maximum 35 units away

        const direction = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
        const newCameraPos = new THREE.Vector3().copy(center).add(direction.multiplyScalar(cameraDistance));

        // Keep camera height reasonable
        newCameraPos.y = Math.max(newCameraPos.y, 10);

        const controlsEnabled = this.controls.enabled;
        this.controls.enabled = false;

        // Very smooth, slow animation
        const tl = gsap.timeline({ onComplete: () => { this.controls.enabled = controlsEnabled; } });
        tl.to(this.controls.target, { x: center.x, y: center.y, z: center.z, duration: 2.5, ease: "power2.inOut" }, 0);
        tl.to(this.camera.position, { x: newCameraPos.x, y: newCameraPos.y, z: newCameraPos.z, duration: 2.5, ease: "power2.inOut" }, 0);
    }

    focusGroup(ids, padding = 5) {
        if (!Array.isArray(ids) || ids.length === 0) { console.warn('focusGroup: ids must be a non-empty array'); return; }
        if (!gsap || !this.camera || !this.controls) return;

        const combinedBox = new THREE.Box3();
        let foundAny = false;
        ids.forEach(id => {
            const obj = this.objects[id];
            if (obj && obj.group) { combinedBox.union(new THREE.Box3().setFromObject(obj.group)); foundAny = true; }
        });
        if (!foundAny) { console.warn('focusGroup: no valid objects found'); return; }

        const center = combinedBox.getCenter(new THREE.Vector3());
        const size = combinedBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) + padding;

        // Clamp camera distance to prevent extreme zoom
        cameraDistance = Math.max(cameraDistance, 12);
        cameraDistance = Math.min(cameraDistance, 40);

        const direction = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
        const newCameraPos = new THREE.Vector3().copy(center).add(direction.multiplyScalar(cameraDistance));

        // Keep camera height reasonable
        newCameraPos.y = Math.max(newCameraPos.y, 10);

        const controlsEnabled = this.controls.enabled;
        this.controls.enabled = false;

        const tl = gsap.timeline({ onComplete: () => { this.controls.enabled = controlsEnabled; } });
        tl.to(this.controls.target, { x: center.x, y: center.y, z: center.z, duration: 2.0, ease: "power2.inOut" }, 0);
        tl.to(this.camera.position, { x: newCameraPos.x, y: newCameraPos.y, z: newCameraPos.z, duration: 2.0, ease: "power2.inOut" }, 0);
    }



    createRoundedCube(id, value, pos, skipCollision = false) {
        if (this.objects[id]) { console.warn(`Object '${id}' already exists`); return; }
        // Apply spatial awareness only if not skipped (for aligned structures like arrays)
        const safePos = skipCollision ? pos : this.getSafePositionForType(pos, 'cube');
        const group = new THREE.Group();
        group.position.set(safePos.x, safePos.y, safePos.z || 0);
        const mesh = new THREE.Mesh(createHighResGeometry(GEOMETRY_CONFIG.cubeGeometry, 1.0), MAT_CERAMIC.clone());
        mesh.castShadow = true; mesh.receiveShadow = true;
        group.add(mesh);
        this._addSpriteLabel(group, value.toString(), 0.7);
        this.scene.add(group);
        this.objects[id] = { group, mesh, type: 'cube', id };
        this.objects[id] = { group, mesh, type: 'cube', id };

        // Use timeline for entry animation if available to prevent conflicts
        if (gsap) {
            if (this.tl) {
                this.tl.from(group.scale, { x: 0, y: 0, z: 0, duration: 0.5, ease: "back.out(1.7)" }, "<");
            } else {
                gsap.from(group.scale, { x: 0, y: 0, z: 0, duration: 0.5, ease: "back.out(1.7)" });
            }
        }
    }

    createSphereNode(id, value, pos) {
        if (this.objects[id]) { console.warn(`Object '${id}' already exists`); return; }
        // Apply spatial awareness
        const safePos = this.getSafePositionForType(pos, 'node');
        const group = new THREE.Group();
        group.position.set(safePos.x, safePos.y, safePos.z);
        const core = new THREE.Mesh(createHighResGeometry(GEOMETRY_CONFIG.nodeGeometry, 0.5), MAT_GLASS_ORB.clone());
        core.castShadow = true; core.receiveShadow = true;
        group.add(core);
        // Label BELOW the node
        this._addSpriteLabel(group, value.toString(), -1.5, 1.3);
        this.scene.add(group);
        this.objects[id] = { group, core, type: 'node', id };
        if (gsap) gsap.from(group.position, { y: safePos.y + 3, duration: 0.8, ease: "bounce.out" });
    }

    createIconNode(id, value, pos, iconType) {
        if (this.objects[id]) { console.warn(`Object '${id}' already exists`); return; }

        const safePos = this.getSafePositionForType(pos, 'node');
        const group = new THREE.Group();
        group.position.set(safePos.x, safePos.y, safePos.z);

        // Helper to make a material
        const mat = (hex, emissiveHex, roughness = 0.3, metalness = 0.7) => {
            const m = new THREE.MeshStandardMaterial({
                color: hex,
                emissive: emissiveHex,
                emissiveIntensity: 0.4,
                roughness, metalness,
                transparent: true,
                opacity: 0.95,
            });
            return m;
        };

        let core = null;

        switch (iconType) {
            case 'database': {
                // Classic stacked-disc database icon — 3 thin cylinders stacked
                const dbColor = 0x3b82f6;    // Blue
                const emColor = 0x1d4ed8;
                const bodyMat = mat(dbColor, emColor, 0.4, 0.6);
                const capMat = mat(0x60a5fa, 0x3b82f6, 0.2, 0.8);
                // Discs
                const disc = (radius, height, y) => {
                    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 48), bodyMat.clone());
                    cyl.position.y = y;
                    return cyl;
                };
                const cap = (radius, y) => {
                    const ellipsoid = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 8), capMat.clone());
                    ellipsoid.scale.set(1, 0.3, 1);
                    ellipsoid.position.y = y;
                    return ellipsoid;
                };
                group.add(disc(0.7, 0.35, -0.5));
                group.add(disc(0.7, 0.35, -0.05));
                group.add(disc(0.7, 0.35, 0.4));
                group.add(cap(0.72, 0.595));   // top ellipse
                group.add(cap(0.72, -0.68));   // bottom ellipse
                core = group.children[2];
                break;
            }
            case 'server':
            case 'backend': {
                // Server rack — rectangular body with horizontal slot lines
                const srvColor = 0x10b981;  // Green
                const srvEmit = 0x065f46;
                const bodyMat = mat(srvColor, srvEmit, 0.5, 0.5);
                const slotMat = mat(0x6ee7b7, 0x34d399, 0.2, 0.9);
                const ledMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 2.0 });
                // Body
                const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.55), bodyMat);
                group.add(body);
                // Horizontal slots (server blades)
                [-0.45, -0.15, 0.15, 0.45].forEach(y => {
                    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.1), slotMat.clone());
                    slot.position.set(0.02, y, 0.28);
                    group.add(slot);
                    // LED dot
                    const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), ledMat.clone());
                    led.position.set(-0.38, y, 0.33);
                    group.add(led);
                });
                core = body;
                break;
            }
            case 'frontend': {
                // Monitor / browser window shape
                const monColor = 0xf59e0b;  // Amber
                const monEmit = 0x92400e;
                const bodyMat = mat(monColor, monEmit, 0.6, 0.3);
                const screenMat = new THREE.MeshStandardMaterial({
                    color: 0x0ea5e9, emissive: 0x0369a1, emissiveIntensity: 0.8,
                    roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85
                });
                const standMat = mat(0xd97706, 0x78350f, 0.8, 0.2);
                // Monitor body
                const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 0.1), bodyMat);
                group.add(frame);
                // Screen inset (slightly in front)
                const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.9), screenMat);
                screen.position.z = 0.06;
                group.add(screen);
                // Browser bar hint
                const bar = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.02), mat(0xfbbf24, 0xf59e0b, 0.6, 0.2));
                bar.position.set(0, 0.47, 0.12);
                group.add(bar);
                // Dots (browser traffic lights)
                [0xff5f57, 0xfebc2e, 0x28c840].forEach((c, i) => {
                    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8),
                        new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.5 }));
                    dot.position.set(-0.55 + i * 0.1, 0.47, 0.13);
                    group.add(dot);
                });
                // Stand
                const neck = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.08), standMat);
                neck.position.y = -0.69;
                group.add(neck);
                const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.3), standMat);
                base.position.y = -0.83;
                group.add(base);
                core = frame;
                break;
            }
            case 'cloud': {
                // Cloud shape — multiple spheres merged into a cloud form
                const cloudColor = 0x8b5cf6;  // Purple
                const cloudEmit = 0x4c1d95;
                const cloudMat = mat(cloudColor, cloudEmit, 0.1, 0.0);
                cloudMat.transparent = true;
                cloudMat.opacity = 0.88;
                const sphereData = [
                    // [radius, x, y, z]
                    [0.55, 0.0, 0.0, 0],   // center
                    [0.42, 0.5, -0.1, 0],   // right
                    [0.42, -0.5, -0.1, 0],   // left
                    [0.35, 0.25, 0.22, 0],   // upper right
                    [0.35, -0.25, 0.22, 0],   // upper left
                    [0.28, 0.72, 0.1, 0],   // far right
                    [0.28, -0.72, 0.1, 0],   // far left
                ];
                sphereData.forEach(([r, x, y, z]) => {
                    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 24), cloudMat.clone());
                    s.position.set(x, y, z);
                    group.add(s);
                });
                // Flat base
                const cloudBase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 0.6), cloudMat.clone());
                cloudBase.position.y = -0.3;
                group.add(cloudBase);
                core = group.children[0];
                break;
            }
            case 'security': {
                // Shield shape — two halves forming a shield/kite
                const shieldColor = 0xef4444;   // Red
                const shieldEmit = 0x7f1d1d;
                const bodyMat = mat(shieldColor, shieldEmit, 0.3, 0.6);
                const innerMat = mat(0xfca5a5, 0xef4444, 0.1, 0.8);
                // Shield body using ExtrudeGeometry from a shield shape
                const shape = new THREE.Shape();
                shape.moveTo(0, 0.9);
                shape.bezierCurveTo(0.6, 0.9, 0.8, 0.5, 0.8, 0.2);
                shape.bezierCurveTo(0.8, -0.3, 0.4, -0.7, 0, -0.9);
                shape.bezierCurveTo(-0.4, -0.7, -0.8, -0.3, -0.8, 0.2);
                shape.bezierCurveTo(-0.8, 0.5, -0.6, 0.9, 0, 0.9);
                const extrudeSettings = { depth: 0.22, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 4 };
                const shieldGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                shieldGeo.center();
                const shield = new THREE.Mesh(shieldGeo, bodyMat);
                group.add(shield);
                // Inner emblem (checkmark or lock icon hint via small inner shape)
                const emblem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.18, 0), innerMat);
                emblem.position.set(0, 0.05, 0.16);
                group.add(emblem);
                core = shield;
                break;
            }
            case 'cache': {
                // Redis-like: flat disc stack with lightning bolt hint
                const cacheColor = 0xff6b6b;   // Red-coral
                const cacheEmit = 0xcc2200;
                const discMat = mat(cacheColor, cacheEmit, 0.3, 0.5);
                const glowMat = mat(0xffaa00, 0xff6600, 0.1, 0.9);
                glowMat.emissiveIntensity = 1.2;
                // Two discs
                const topDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.18, 48), discMat.clone());
                topDisc.position.y = 0.12;
                group.add(topDisc);
                const botDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.18, 48), discMat.clone());
                botDisc.position.y = -0.12;
                group.add(botDisc);
                // Top cap ellipse
                const cap = new THREE.Mesh(new THREE.SphereGeometry(0.71, 32, 8), mat(0xff9999, 0xff4444, 0.2, 0.7));
                cap.scale.set(1, 0.28, 1);
                cap.position.y = 0.21;
                group.add(cap);
                // Bolt
                const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 0.5, 6), glowMat);
                bolt.position.set(0.1, 0, 0.72);
                bolt.rotation.z = -0.3;
                group.add(bolt);
                core = topDisc;
                break;
            }
            case 'queue': {
                // Message queue (Kafka/RabbitMQ) — horizontal pipes
                const qColor = 0x6366f1;   // Indigo
                const qEmit = 0x312e81;
                const pipeMat = mat(qColor, qEmit, 0.4, 0.6);
                const dotMat = mat(0xc7d2fe, 0xa5b4fc, 0.2, 0.8);
                dotMat.emissiveIntensity = 1.0;
                // Three horizontal tubes
                [-0.45, 0, 0.45].forEach(y => {
                    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.8, 24), pipeMat.clone());
                    tube.rotation.z = Math.PI / 2;
                    tube.position.y = y;
                    group.add(tube);
                    // Message dots flowing in tubes
                    [-0.5, 0, 0.5].forEach(x => {
                        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), dotMat.clone());
                        dot.position.set(x, y, 0);
                        group.add(dot);
                    });
                });
                // vertical back plate
                const plate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.5, 0.5), mat(0x4338ca, 0x3730a3, 0.6, 0.4));
                plate.position.x = -0.95;
                group.add(plate);
                core = group.children[0];
                break;
            }
            case 'ml_model': {
                // Neural network / brain — central core with radial "neuron" protrusions
                const mlColor = 0xec4899;   // Pink
                const mlEmit = 0x831843;
                const coreMat = mat(mlColor, mlEmit, 0.2, 0.5);
                const axonMat = mat(0xfda4af, 0xfb7185, 0.3, 0.4);
                axonMat.emissiveIntensity = 0.8;
                const nodeMat = mat(0xfef3c7, 0xfde68a, 0.1, 0.7);
                nodeMat.emissiveIntensity = 1.5;
                // Central brain sphere
                const brain = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 2), coreMat);
                group.add(brain);
                // Radial neurons (ring + upper + lower)
                const neurPos = [
                    [0.9, 0, 0], [-0.9, 0, 0], [0, 0.9, 0], [0, -0.9, 0],
                    [0, 0, 0.9], [0, 0, -0.9],
                    [0.6, 0.6, 0.4], [-0.6, 0.6, -0.4], [0.6, -0.6, -0.4], [-0.6, -0.6, 0.4],
                ];
                neurPos.forEach(([nx, ny, nz]) => {
                    // Axon (slim cylinder from origin to neuron)
                    const dir = new THREE.Vector3(nx, ny, nz);
                    const len = dir.length();
                    const mid = dir.clone().multiplyScalar(0.5);
                    const ax = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 8), axonMat.clone());
                    ax.position.copy(mid);
                    ax.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
                    group.add(ax);
                    // Neuron body
                    const neuron = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), nodeMat.clone());
                    neuron.position.set(nx, ny, nz);
                    group.add(neuron);
                });
                core = brain;
                break;
            }
            default: {
                // ──────────────────────────────────────────────
                // TECH-SPECIFIC ICONS
                // ──────────────────────────────────────────────

                // ── React / Component atom ──
                if (iconType === 'react' || iconType === 'reactnative') {
                    const cColor = 0x61dafb;
                    const cMat = mat(cColor, 0x0a9fc0, 0.15, 0.1);
                    cMat.emissiveIntensity = 0.7;
                    // Nucleus
                    const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16),
                        new THREE.MeshStandardMaterial({ color: 0x61dafb, emissive: 0x61dafb, emissiveIntensity: 1.5 }));
                    group.add(nucleus);
                    // 3 orbital rings at different angles
                    const ringGeo = new THREE.TorusGeometry(0.65, 0.05, 16, 80);
                    const angles = [[0, 0], [Math.PI / 3, Math.PI / 4], [-Math.PI / 3, Math.PI / 4]];
                    angles.forEach(([rx, ry]) => {
                        const ring = new THREE.Mesh(ringGeo, cMat.clone());
                        ring.rotation.set(rx, ry, 0);
                        group.add(ring);
                    });
                    // Electron dots
                    angles.forEach(([rx, ry], i) => {
                        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8),
                            new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.0 }));
                        dot.position.set(0.65 * Math.cos(i * 2.09), 0.65 * Math.sin(rx), 0.65 * Math.sin(ry));
                        group.add(dot);
                    });
                    core = nucleus;
                }
                // ── Python ──
                else if (iconType === 'python') {
                    const snakeMat = mat(0x3776ab, 0x1a4f72, 0.3, 0.3);
                    const yMat = mat(0xffd43b, 0xcc9900, 0.3, 0.3);
                    // Two coiled snake head spheres
                    const head1 = new THREE.Mesh(new THREE.SphereGeometry(0.32, 32, 32), snakeMat);
                    head1.position.set(-0.2, 0.4, 0);
                    group.add(head1);
                    const head2 = new THREE.Mesh(new THREE.SphereGeometry(0.32, 32, 32), yMat);
                    head2.position.set(0.2, -0.4, 0);
                    group.add(head2);
                    // Coils (half-tori)
                    const coil = (color, x, y, z, ry) => {
                        const c = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.12, 10, 40, Math.PI), color === 0 ? snakeMat.clone() : yMat.clone());
                        c.position.set(x, y, z);
                        c.rotation.y = ry;
                        return c;
                    };
                    group.add(coil(0, 0, 0.08, 0, 0));
                    group.add(coil(1, 0, -0.08, 0, Math.PI));
                    // Logo diamond pupils
                    const p1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.5 }));
                    p1.position.set(-0.2, 0.52, 0.28);
                    group.add(p1);
                    const p2 = p1.clone();
                    p2.position.set(0.2, -0.52, 0.28);
                    group.add(p2);
                    core = head1;
                }
                // ── Docker ──
                else if (iconType === 'docker') {
                    const dBlue = 0x2496ed;
                    const dMat = mat(dBlue, 0x1060a0, 0.4, 0.5);
                    const cMat = mat(0xffffff, 0xccddff, 0.5, 0.1);
                    // Whale body — big rounded box
                    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.7), dMat);
                    group.add(body);
                    // Tail fin
                    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.3), dMat.clone());
                    tail.position.set(-0.85, -0.2, 0);
                    tail.rotation.z = -0.3;
                    group.add(tail);
                    // Water spray on top
                    [[-0.4, 0.5, 0], [0, 0.55, 0], [0.3, 0.48, 0]].forEach(([x, y, z]) => {
                        const drop = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), mat(0xaaddff, 0x99ccff, 0.1, 0.0));
                        drop.position.set(x, y, z);
                        group.add(drop);
                    });
                    // Stacked containers on back
                    [[-0.2], [0.1], [0.4]].forEach(([cx]) => {
                        const box = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.22, 0.6), cMat.clone());
                        box.position.set(cx, 0.46, 0);
                        group.add(box);
                    });
                    // Eye
                    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.5 }));
                    eye.position.set(0.65, 0.15, 0.36);
                    group.add(eye);
                    core = body;
                }
                // ── Kubernetes ──
                else if (iconType === 'kubernetes' || iconType === 'k8s') {
                    const kColor = 0x326ce5;
                    const kMat = mat(kColor, 0x1a3a99, 0.3, 0.7);
                    const spokeMat = mat(0xffffff, 0xaabbff, 0.5, 0.2);
                    // Helm — hexagon (gear-like using CylinderGeometry with 6 sides)
                    const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.2, 6), kMat);
                    helm.rotation.y = Math.PI / 6;
                    group.add(helm);
                    // Center circle
                    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.28, 24), mat(0x326ce5, 0x1a55cc, 0.2, 0.8));
                    group.add(hub);
                    // Spokes
                    for (let i = 0; i < 7; i++) {
                        const angle = (i / 7) * Math.PI * 2;
                        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), spokeMat.clone());
                        spoke.position.set(Math.cos(angle) * 0.42, 0, Math.sin(angle) * 0.42);
                        spoke.rotation.z = Math.PI / 2;
                        spoke.rotation.y = angle;
                        group.add(spoke);
                    }
                    // Gear teeth around rim
                    for (let i = 0; i < 7; i++) {
                        const angle = (i / 7) * Math.PI * 2 + Math.PI / 7;
                        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), kMat.clone());
                        tooth.position.set(Math.cos(angle) * 0.72, 0, Math.sin(angle) * 0.72);
                        group.add(tooth);
                    }
                    core = helm;
                }
                // ── Node.js ──
                else if (iconType === 'nodejs' || iconType === 'node') {
                    const nColor = 0x8cc84b;
                    const nMat = mat(nColor, 0x4a7a22, 0.3, 0.3);
                    // Hexagonal prism (Node.js logo shape)
                    const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.5, 6), nMat);
                    hex.rotation.y = Math.PI / 6;
                    group.add(hex);
                    // Inner zig-zag "N" hint — 3 rods
                    const rodMat = mat(0xffffff, 0xffffff, 0.2, 0.0);
                    rodMat.emissiveIntensity = 1.0;
                    const rod = (x1, y1, x2, y2) => {
                        const pts = [new THREE.Vector3(x1, y1, 0.26), new THREE.Vector3(x2, y2, 0.26)];
                        const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 4, 0.04, 8, false);
                        return new THREE.Mesh(geo, rodMat.clone());
                    };
                    group.add(rod(-0.22, 0.3, -0.22, -0.3));
                    group.add(rod(-0.22, 0.3, 0.22, -0.3));
                    group.add(rod(0.22, 0.3, 0.22, -0.3));
                    core = hex;
                }
                // ── MongoDB ──
                else if (iconType === 'mongodb' || iconType === 'mongo') {
                    const mColor = 0x4db33d;
                    const mMat = mat(mColor, 0x2a7020, 0.3, 0.3);
                    // Leaf shape via ExtrudeGeometry
                    const leafShape = new THREE.Shape();
                    leafShape.moveTo(0, 0.9);
                    leafShape.bezierCurveTo(0.5, 0.7, 0.5, 0.3, 0, -0.9);
                    leafShape.bezierCurveTo(-0.5, 0.3, -0.5, 0.7, 0, 0.9);
                    const leafGeo = new THREE.ExtrudeGeometry(leafShape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3 });
                    leafGeo.center();
                    const leaf = new THREE.Mesh(leafGeo, mMat);
                    group.add(leaf);
                    // Central vein
                    const vein = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.5, 0.06), mat(0xffffff, 0xaaffaa, 0.5, 0.0));
                    vein.position.z = 0.14;
                    group.add(vein);
                    core = leaf;
                }
                // ── Java / Coffee cup ──
                else if (iconType === 'java') {
                    const jColor = 0xf8981d;
                    const jMat = mat(jColor, 0xc05a00, 0.5, 0.3);
                    const darkMat = mat(0x1a0000, 0x331100, 0.8, 0.2);
                    // Cup body — truncated cone
                    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.4, 0.9, 32), jMat);
                    cup.position.y = -0.1;
                    group.add(cup);
                    // Coffee inside (dark top disc)
                    const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.04, 32), darkMat);
                    coffee.position.y = 0.35;
                    group.add(coffee);
                    // Handle — partial torus
                    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.07, 10, 24, Math.PI), jMat.clone());
                    handle.position.set(0.55, -0.05, 0);
                    handle.rotation.y = Math.PI / 2;
                    group.add(handle);
                    // Steam coils above cup
                    const steamMat = mat(0xffffff, 0xffffff, 0.1, 0.0);
                    steamMat.opacity = 0.4;
                    steamMat.emissiveIntensity = 0.5;
                    [[-0.14, 0.6], [0, 0.7], [0.14, 0.65]].forEach(([x, y]) => {
                        const steam = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 6, 16, Math.PI), steamMat.clone());
                        steam.position.set(x, y, 0);
                        group.add(steam);
                    });
                    // Saucer
                    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.07, 32), mat(0xd97706, 0xa05000, 0.6, 0.2));
                    saucer.position.y = -0.58;
                    group.add(saucer);
                    core = cup;
                }
                // ── HTML/CSS/Browser ──
                else if (iconType === 'html' || iconType === 'css' || iconType === 'web' || iconType === 'browser') {
                    const hColor = iconType === 'css' ? 0x2965f1 : 0xe34c26;
                    const hMat = mat(hColor, hColor >> 1, 0.4, 0.3);
                    // Shield/tag shape for HTML
                    const shape = new THREE.Shape();
                    shape.moveTo(-0.65, 0.8);
                    shape.lineTo(0.65, 0.8);
                    shape.lineTo(0.55, -0.7);
                    shape.lineTo(0, -0.95);
                    shape.lineTo(-0.55, -0.7);
                    shape.closePath();
                    const tagGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
                    tagGeo.center();
                    const tag = new THREE.Mesh(tagGeo, hMat);
                    group.add(tag);
                    const label = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.05), mat(0xffffff, 0xffffff, 0.3, 0.0));
                    label.position.set(0, 0.1, 0.12);
                    group.add(label);
                    core = tag;
                }
                // ── SQL/PostgreSQL ──
                else if (iconType === 'postgresql' || iconType === 'mysql' || iconType === 'sql' || iconType === 'db') {
                    const dbColor = iconType === 'mysql' ? 0x00618a : 0x336791;
                    const bodyMat = mat(dbColor, dbColor >> 1, 0.4, 0.6);
                    const capMat = mat(0x5588cc, dbColor, 0.2, 0.8);
                    const disc = (r, h, y) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48), bodyMat.clone()); c.position.y = y; return c; };
                    const cap = (r, y) => { const e = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 8), capMat.clone()); e.scale.set(1, 0.28, 1); e.position.y = y; return e; };
                    group.add(disc(0.7, 0.35, -0.5), disc(0.7, 0.35, -0.05), disc(0.7, 0.35, 0.4));
                    group.add(cap(0.72, 0.595), cap(0.72, -0.68));
                    core = group.children[2];
                }
                // ── Redis ──
                else if (iconType === 'redis') {
                    const rMat = mat(0xd82c20, 0x8a0000, 0.3, 0.5);
                    const td = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.18, 48), rMat.clone());
                    td.position.y = 0.12;
                    group.add(td);
                    const bd = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.18, 48), rMat.clone());
                    bd.position.y = -0.12;
                    group.add(bd);
                    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.71, 32, 8), mat(0xff6666, 0xff2222, 0.2, 0.7));
                    cap.scale.set(1, 0.28, 1); cap.position.y = 0.21;
                    group.add(cap);
                    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.12, 0.5, 6), mat(0xffaa00, 0xff6600, 0.1, 0.9));
                    bolt.position.set(0.1, 0, 0.72); bolt.rotation.z = -0.3;
                    group.add(bolt);
                    core = td;
                }
                // ── GitHub / Git branching ──
                else if (iconType === 'git' || iconType === 'github') {
                    const gMat = mat(0x24292e, 0x111111, 0.6, 0.4);
                    const catBody = new THREE.Mesh(new THREE.SphereGeometry(0.52, 32, 32), gMat);
                    group.add(catBody);
                    // Ears
                    const ear = (side) => {
                        const e = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.28, 6), gMat.clone());
                        e.position.set(side * 0.32, 0.52, 0);
                        e.rotation.z = side * -0.3;
                        return e;
                    };
                    group.add(ear(1), ear(-1));
                    // Eye whites
                    [0.2, -0.2].forEach(x => {
                        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1 }));
                        eye.position.set(x, 0.12, 0.46);
                        group.add(eye);
                        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshStandardMaterial({ color: 0x333333 }));
                        pupil.position.set(x, 0.12, 0.52);
                        group.add(pupil);
                    });
                    core = catBody;
                }
                // ── Nginx / Web Server ──
                else if (iconType === 'nginx') {
                    const nMat = mat(0x009900, 0x004400, 0.3, 0.5);
                    // Arrow/triangle pointing right (Nginx logo hint)
                    const shape = new THREE.Shape();
                    shape.moveTo(-0.5, 0.7); shape.lineTo(0.65, 0); shape.lineTo(-0.5, -0.7); shape.closePath();
                    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false });
                    geo.center();
                    const arrow = new THREE.Mesh(geo, nMat);
                    group.add(arrow);
                    core = arrow;
                }
                // ── Generic / Fallback ──
                else {
                    const genMat = mat(0x94a3b8, 0x64748b, 0.5, 0.5);
                    const c = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 32), genMat);
                    group.add(c);
                    core = c;
                }
            }
        }

        this._addSpriteLabel(group, value.toString(), -2.0, 1.3);
        this.scene.add(group);
        this.objects[id] = { group, core, type: 'node', id, iconType };

        if (gsap) {
            group.scale.set(0.01, 0.01, 0.01);
            gsap.to(group.scale, { x: 1, y: 1, z: 1, duration: 0.8, ease: 'back.out(1.7)' });
            gsap.from(group.position, { y: safePos.y + 4, duration: 1.0, ease: 'bounce.out' }, '<0.1');
            // Subtle idle float animation
            gsap.to(group.position, { y: safePos.y + 0.15, duration: 2.5 + Math.random(), repeat: -1, yoyo: true, ease: 'sine.inOut', delay: Math.random() });
        }
    }

    setGeometryType(category, geometryType) {
        const validTypes = ['sphere-highres', 'icosahedron', 'torus-knot', 'subdivided-box', 'superformula'];
        if (!validTypes.includes(geometryType)) { console.warn(`Invalid geometry type: ${geometryType}`); return; }
        if (category === 'node') { GEOMETRY_CONFIG.nodeGeometry = geometryType; }
        else if (category === 'cube') { GEOMETRY_CONFIG.cubeGeometry = geometryType; }
        else { console.warn(`Invalid category: ${category}. Use 'node' or 'cube'`); }
    }

    createElementalNode(id, value, x = 0, y = 0, z = 0, elementType = 'fire') {
        if (this.objects[id]) { console.warn(`Object with id '${id}' already exists`); return; }
        // Apply spatial awareness
        const safePos = this.getSafePositionForType({ x, y, z }, 'elemental_node');
        const group = new THREE.Group();
        group.position.set(safePos.x, safePos.y, safePos.z);
        const material = getElementalMaterial(elementType);
        const shell = new THREE.Mesh(createHighResGeometry(GEOMETRY_CONFIG.nodeGeometry, 0.5), material);
        shell.castShadow = true; shell.receiveShadow = true;
        group.add(shell);
        this._addSpriteLabel(group, value.toString(), 0.8);
        this.scene.add(group);
        this.objects[id] = { group, shell, material, elementType, type: 'elemental_node', id };
        if (gsap) {
            gsap.from(group.position, { y: safePos.y + 5, duration: 1, ease: "bounce.out" });
            gsap.from(group.scale, { x: 0, y: 0, z: 0, duration: 0.5, ease: "back.out(1.7)" });
        }
    }

    morphElement(id, toElementType, duration = 2.0) {
        const obj = this.objects[id];
        if (!obj) { console.warn(`morphElement: object '${id}' not found`); return; }
        if (!obj.material) { console.warn(`morphElement: object '${id}' has no material`); return; }
        if (!gsap) { console.warn('GSAP not available for morphing'); return; }

        const config = getMorphConfig(obj.material, toElementType, duration);
        gsap.to(obj.material.color, { r: config.targets.color.r, g: config.targets.color.g, b: config.targets.color.b, duration: config.duration, ease: config.ease, onUpdate: config.onUpdate });
        gsap.to(obj.material.emissive, { r: config.targets.emissive.r, g: config.targets.emissive.g, b: config.targets.emissive.b, duration: config.duration, ease: config.ease });
        gsap.to(obj.material, { emissiveIntensity: config.targets.emissiveIntensity, metalness: config.targets.metalness, roughness: config.targets.roughness, transmission: config.targets.transmission, clearcoat: config.targets.clearcoat, clearcoatRoughness: config.targets.clearcoatRoughness, opacity: config.targets.opacity, duration: config.duration, ease: config.ease });
        obj.elementType = toElementType;

        if (this.tl) {
            this.tl.to(obj.group.scale, { x: 1.2, y: 1.2, z: 1.2, duration: duration / 2, yoyo: true, repeat: 1, ease: "sine.inOut" });
        }
    }

    _addSpriteLabel(group, text, y, scale = 1) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 512; canvas.height = 128;
        ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0, 0, 512, 128);
        ctx.font = 'bold 60px Arial'; ctx.fillStyle = 'white'; ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4;
        ctx.fillText(text, 256, 80);
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.position.y = y + 0.5; sprite.scale.set(4 * scale, 1 * scale, 1);
        group.add(sprite);
    }

    _enableTransparency(obj) {
        obj.traverse((child) => {
            if (child.isMesh && child.material) {
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach(mat => { mat.transparent = true; });
            }
        });
    }
    /**
     * Add a pointer label (floating text with arrow to target)
     * Matches user request for labels "above the graph" with arrows.
     */
    addPointerLabel(targetMesh, text, yHeight = 8) {
        if (!targetMesh) return;

        // 1. Create Label
        const label = createTextSprite(text, 16, '#ffffff');
        // Position at same X as target, but fixed high Y
        label.position.set(targetMesh.position.x, yHeight, 0);
        this.scene.add(label);

        // 2. Create Arrow/Line
        const points = [
            new THREE.Vector3(targetMesh.position.x, yHeight - 0.5, 0), // Start just below label
            targetMesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)) // End just above target
        ];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5
        });
        const line = new THREE.Line(lineGeo, lineMat);
        this.scene.add(line);

        // 3. Animation
        label.scale.set(0, 0, 0);
        gsap.to(label.scale, { x: 1, y: 1, z: 1, duration: 0.5, delay: 0.2 });

        lineMat.opacity = 0;
        gsap.to(lineMat, { opacity: 0.5, duration: 0.5, delay: 0.2 });

        // Store for cleanup if needed (attached to target mesh logic usually, but here independent)
        // We'll attach it to the targetMesh.userData for easy access if we delete the mesh later
        targetMesh.userData.pointerLabel = { label, line };
    }

    showCalculation(formula, result, x, y, z = 0) {
        // 1. Show Formula
        const formulaSprite = createTextSprite(formula, 24, '#fbbf24'); // Amber/Yellow
        formulaSprite.position.set(x, y, z);
        formulaSprite.scale.set(0, 0, 0); // Start small
        this.scene.add(formulaSprite);

        // Pop in
        gsap.to(formulaSprite.scale, { x: 8, y: 3, z: 1, duration: 0.5, ease: "back.out(1.5)" });

        // 2. Transform to Result after delay
        gsap.to(formulaSprite.scale, {
            x: 0, y: 0, z: 0,
            duration: 0.3,
            delay: 2.0,
            onComplete: () => {
                this.scene.remove(formulaSprite);

                // Spawn Result
                const resultSprite = createTextSprite(result, 32, '#add8e6'); // Light Blue
                resultSprite.position.set(x, y, z);
                resultSprite.scale.set(0, 0, 0);
                this.scene.add(resultSprite);

                // Pop in result
                gsap.to(resultSprite.scale, { x: 10, y: 4, z: 1, duration: 0.5, ease: "elastic.out(1, 0.5)" });

                // Optional: Floating text drift up
                gsap.to(resultSprite.position, { y: y + 2, duration: 2.0, ease: "power1.out" });

                // Add to objects for potential cleanup (though it's transient)
                const id = `calc_${Date.now()}`;
                this.objects[id] = { group: resultSprite, type: 'calculation' };
            }
        });
    }

    /**
     * Spawn multiple data points as a point cloud (efficient bulk spawn)
     * @param {Array<{id: string, x: number, y: number, z?: number, color?: number}>} points - Array of point data
     * @param {Object} options - { size, opacity, stagger, baseColor }
     * @returns {Array<THREE.Mesh>} Array of created meshes
     */
    spawnPointCloud(points, options = {}) {
        console.log(`📍 spawnPointCloud called with ${points?.length || 0} points`);
        return spawnPointCloudBase(this.scene, this.objects, points, options);
    }

    // ═══════════════════════════════════════════════════════════════════
    // SMART LABEL SYSTEM
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Create a smart label that is:
     * 1. Parented to a target object (moves with it)
     * 2. Billboarded (always faces camera)
     * 3. Visually subordinate (smaller, distinct style)
     * 
     * @param {string} id - Unique ID for the label
     * @param {string} text - Text content
     * @param {string} parentId - ID of the object to attach to (e.g., a node ID)
     * @param {Object} options - { offset: {x,y,z}, color, scale }
     */
    createSmartLabel(id, text, parentId, options = {}) {
        let parentObj = null;
        let isHUD = false;

        if (parentId === 'camera') {
            isHUD = true;
            // Parent directly to camera
            // Camera check
            if (!this.camera) {
                console.warn(`createSmartLabel: Camera not available for HUD label '${id}'`);
                return;
            }
        } else if (parentId) {
            parentObj = this.objects[parentId];
            if (!parentObj || !parentObj.group) {
                console.warn(`createSmartLabel: Parent '${parentId}' not found`);
                return;
            }
        }

        // Default options for "Visually Subordinate"
        // Standard offset relative to parent
        const offset = options.offset || { x: 0, y: 1.8, z: 0 };
        const color = options.color || 0x222222;
        const textColor = options.textColor || 0xffffff;
        // User said "Large but not THAT large". Tuning back down.
        const scale = options.scale !== undefined ? options.scale : 0.8;

        // Create the group for the label
        const group = new THREE.Group();

        if (isHUD) {
            // HUD Mode: Parent to camera
            group.position.set(offset.x, offset.y, offset.z);
            // Ensure no rotation relative to camera (always faces it)
            group.rotation.set(0, 0, 0);
            this.camera.add(group);
        } else if (parentObj) {
            // Local position if parented
            group.position.set(offset.x, offset.y, offset.z);
            parentObj.group.add(group);
        } else {
            // World position if no parent (Global Label)
            // For global label option, user might pass exact world coords in 'offset'
            group.position.set(offset.x, offset.y, offset.z);
            this.scene.add(group);
        }

        // --- Dynamic Width Calculation ---
        // --- Dynamic Sizing (with multiline support) ---
        const hasNewlines = text && text.toString().includes('\n');
        const lines = hasNewlines ? text.toString().split('\n') : [text || ' '];
        const lineCount = lines.length;

        // Find longest line for width calculation
        const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b, '');
        const maxCharCount = longestLine.length;

        // Width logic - increased multiplier to prevent text cutoff
        let computedWidth;
        if (maxCharCount <= 2) {
            computedWidth = 1.6;
        } else {
            computedWidth = Math.max(1.6, maxCharCount * 0.45 + 0.6);
        }

        // Height logic - tighter spacing between lines
        const computedHeight = 1.4 + (lineCount - 1) * 0.8;



        // --- 1. Background (Rounded Box) ---
        // Sleek pill shape, wider if needed
        // --- 1. Background (Rounded Box) ---
        const bgGeo = new RoundedBoxGeometry(computedWidth, computedHeight, 0.1, 4, 0.6);
        const bgMat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.9,
            metalness: 0.0,
            transparent: true,
            opacity: options.transparentBackground ? 0.0 : 0.95 // support invisible bg
        });
        const bgMesh = new THREE.Mesh(bgGeo, bgMat);
        group.add(bgMesh);

        // --- 2. Text ---
        const texture = this._createLabelTexture(lines, textColor, computedWidth, computedHeight);
        const textGeo = new THREE.PlaneGeometry(computedWidth * 0.9, computedHeight - 0.2);
        const textMat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });
        const textMesh = new THREE.Mesh(textGeo, textMat);
        textMesh.position.z = 0.06;
        textMesh.userData.isText = true;
        textMesh.userData.currentWidth = computedWidth;
        group.add(textMesh);

        // --- 4. Register Object ---
        this.objects[id] = {
            id,
            type: 'smart_label',
            group,
            mesh: bgMesh,
            parentId,
            options
        };

        // --- 5. Enable Billboarding (Only if NOT HUD) ---
        if (!isHUD) {
            this.billboards.push(this.objects[id]);
        }

        // Animate in
        group.scale.set(0, 0, 0);
        if (gsap) gsap.to(group.scale, { x: scale, y: scale, z: scale, duration: 0.4, ease: "back.out(1.7)" });
    }

    /**
     * Update the text of a smart label
     */
    updateSmartLabel(id, newText) {
        const obj = this.objects[id];
        if (!obj || !obj.group) return;

        // Parse multiline text
        const hasNewlines = newText && newText.toString().includes('\n');
        const lines = hasNewlines ? newText.toString().split('\n') : [newText || ' '];
        const lineCount = lines.length;
        const longestLine = lines.reduce((a, b) => a.length > b.length ? a : b, '');

        // Recalculate dimensions - increased width for text visibility
        const maxCharCount = longestLine.length;
        let newWidth = maxCharCount <= 2 ? 1.6 : Math.max(1.6, maxCharCount * 0.45 + 0.6);
        const newHeight = 1.4 + (lineCount - 1) * 0.8;

        // Update geometry if size changed
        const textMesh = obj.group.children.find(c => c.userData.isText);
        const currentWidth = textMesh.userData.currentWidth || 0;
        const currentHeight = textMesh.userData.currentHeight || 1.4;

        const widthChanged = Math.abs(currentWidth - newWidth) > 0.1;
        const heightChanged = Math.abs(currentHeight - newHeight) > 0.1;

        if (textMesh && (widthChanged || heightChanged)) {
            // Update Background Mesh
            const bgMesh = obj.mesh;
            if (bgMesh) {
                bgMesh.geometry.dispose();
                bgMesh.geometry = new RoundedBoxGeometry(newWidth, newHeight, 0.1, 4, 0.6);
            }

            // Update Text Mesh
            textMesh.geometry.dispose();
            textMesh.geometry = new THREE.PlaneGeometry(newWidth * 0.9, newHeight - 0.2);
            textMesh.userData.currentWidth = newWidth;
            textMesh.userData.currentHeight = newHeight;
        }

        // Always update texture
        if (textMesh) {
            textMesh.material.map = this._createLabelTexture(lines, '#ffffff', newWidth, newHeight);
            textMesh.material.needsUpdate = true;
        }
    }

    /**
     * Helper to create text texture for labels (supports multiline)
     */
    _createLabelTexture(textOrLines, color = '#ffffff', width = 2.0, height = 1.4, fontSize = 320) {
        // Ensure we have an array of lines
        const lines = Array.isArray(textOrLines)
            ? textOrLines
            : (textOrLines ? textOrLines.toString().split('\n') : [' ']);

        const canvas = document.createElement('canvas');

        // Use original high-resolution approach
        // For single line: 512px height, for multiline: scale proportionally
        const baseHeight = 512;
        const canvasHeight = lines.length > 1 ? baseHeight * Math.sqrt(lines.length) : baseHeight;
        const canvasWidth = Math.ceil(canvasHeight * (width / height));

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Scale font proportionally - smaller font for multiline (35% of original)
        const scaledFontSize = lines.length > 1 ? fontSize * 0.35 : fontSize;
        ctx.font = `bold ${scaledFontSize}px Inter, Arial, sans-serif`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = lines.length > 1 ? 4 : 12;
        ctx.shadowOffsetX = lines.length > 1 ? 2 : 6;
        ctx.shadowOffsetY = lines.length > 1 ? 2 : 6;

        const lineHeight = scaledFontSize * 1.5;
        const totalTextHeight = lines.length * lineHeight;
        const startY = (canvasHeight - totalTextHeight) / 2 + lineHeight / 2;

        lines.forEach((line, i) => {
            ctx.fillText(line, canvasWidth / 2, startY + i * lineHeight);
        });

        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        return tex;
    }
}

// ═══════════════════════════════════════════════════════════════════
// REGISTER ALL DATA STRUCTURE APIs
// ═══════════════════════════════════════════════════════════════════

registerArrayAPI(GSAPEngine);
registerBSTAPI(GSAPEngine);
registerDoublyLinkedListAPI(GSAPEngine);
registerDPTableAPI(GSAPEngine);
registerGraphAPI(GSAPEngine);
registerHashMapAPI(GSAPEngine);
registerHeapAPI(GSAPEngine);
registerLinkedListAPI(GSAPEngine);
registerQueueAPI(GSAPEngine);
registerSetAPI(GSAPEngine);
registerStackAPI(GSAPEngine);
registerTreeAPI(GSAPEngine);
registerTrieAPI(GSAPEngine);
registerRegressionAPI(GSAPEngine);
registerPipelineAPI(GSAPEngine);
registerClusteringAPI(GSAPEngine);
registerClassificationAPI(GSAPEngine);
registerPCAAPI(GSAPEngine);
registerSVMAPI(GSAPEngine);
registerTreeMLAPI(GSAPEngine);
registerKNNAPI(GSAPEngine);
registerNaiveBayesAPI(GSAPEngine);
registerDBSCANAPI(GSAPEngine);
registerGMMAPI(GSAPEngine);
registerBoostingAPI(GSAPEngine);
registerNeuralNetworkAPI(GSAPEngine);
registerDBSCANAPI(GSAPEngine);
registerGMMAPI(GSAPEngine);
registerBoostingAPI(GSAPEngine);
registerNeuralNetworkAPI(GSAPEngine);
