/**
 * tree_ml_api.js - Decision Tree / Random Forest Visualization
 * Implements node splitting, branch animation, and tree-based ML algorithms
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { ML_COLORS, createTextSprite } from './ml_base.js';

const TREE_COLORS = {
    node: 0x6366f1,     // Indigo
    leaf0: 0xef4444,    // Red (class 0)
    leaf1: 0x22c55e,    // Green (class 1)
    split: 0xfbbf24,    // Yellow
    branch: 0x94a3b8    // Slate
};

/**
 * Register Decision Tree / Random Forest visualization methods on GSAPEngine
 */
export function registerTreeMLAPI(GSAPEngine) {
    
    // Tree ML data storage
    GSAPEngine.prototype.treeMLData = {
        nodes: [],
        branches: [],
        depth: 0
    };

    /**
     * Spawn tree node
     */
    GSAPEngine.prototype.spawnTreeNode = function (id, x, y, z = 0, options = {}) {
        if (this.objects[id]) return;

        const { isLeaf = false, leafClass = 0, label = '', size = 0.5 } = options;
        const color = isLeaf ? (leafClass === 0 ? TREE_COLORS.leaf0 : TREE_COLORS.leaf1) : TREE_COLORS.node;

        const geometry = new THREE.BoxGeometry(size * 1.5, size, size * 0.8);
        const material = new THREE.MeshPhysicalMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.3,
            roughness: 0.3,
            metalness: 0.5,
            transparent: true
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.scale.set(0, 0, 0);
        this.scene.add(mesh);

        // Add label if provided
        if (label) {
            const labelSprite = createTextSprite(label, 12, '#ffffff');
            labelSprite.position.set(0, size * 0.8, 0);
            mesh.add(labelSprite);
        }

        this.objects[id] = { group: mesh, mesh, type: 'tree_node', isLeaf, leafClass, x, y, z };
        this.treeMLData.nodes.push({ id, x, y, z, mesh, isLeaf });

        gsap.to(mesh.scale, {
            x: 1, y: 1, z: 1,
            duration: 0.5,
            ease: "back.out(1.7)"
        });
    };

    /**
     * Spawn branch connecting two nodes
     */
    GSAPEngine.prototype.spawnBranch = function (parentId, childId, label = '') {
        const parent = this.objects[parentId];
        const child = this.objects[childId];
        if (!parent || !child) return;

        const branchId = `branch_${parentId}_${childId}`;
        const points = [
            new THREE.Vector3(parent.x, parent.y - 0.3, parent.z),
            new THREE.Vector3(child.x, child.y + 0.3, child.z)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: TREE_COLORS.branch,
            transparent: true,
            opacity: 0
        });

        const line = new THREE.Line(geometry, material);
        this.scene.add(line);

        // Add label on branch
        if (label) {
            const midX = (parent.x + child.x) / 2;
            const midY = (parent.y + child.y) / 2;
            const labelSprite = createTextSprite(label, 24, '#fbbf24');
            labelSprite.position.set(midX, midY, 0.5);
            labelSprite.scale.set(4, 2, 1); // Explicitly scale up
            this.scene.add(labelSprite);
        }

        this.objects[branchId] = { group: line, type: 'branch' };
        this.treeMLData.branches.push({ parentId, childId, line });

        gsap.to(material, { opacity: 0.8, duration: 0.4 });
    };

    /**
     * Animate node splitting
     */
    GSAPEngine.prototype.animateNodeSplit = function (nodeId, leftChildId, rightChildId, splitCondition = '') {
        const node = this.objects[nodeId];
        if (!node) return;

        // Pulse the splitting node
        gsap.to(node.mesh.material.color, {
            r: 0.98, g: 0.75, b: 0.15, // Yellow
            duration: 0.3,
            yoyo: true,
            repeat: 2
        });
        gsap.to(node.mesh.scale, {
            x: 1.2, y: 1.2, z: 1.2,
            duration: 0.2,
            yoyo: true,
            repeat: 1
        });

        // Create split label
        const splitLabel = createTextSprite(splitCondition, 10, '#fbbf24');
        splitLabel.position.set(node.x, node.y - 0.5, 0.3);
        this.scene.add(splitLabel);

        setTimeout(() => {
            // Spawn children
            this.spawnBranch(nodeId, leftChildId, '≤');
            this.spawnBranch(nodeId, rightChildId, '>');
        }, 500);
    };

    /**
     * Highlight decision path through tree
     */
    GSAPEngine.prototype.highlightDecisionPath = function (nodeIds, duration = 0.3) {
        nodeIds.forEach((id, i) => {
            const node = this.objects[id];
            if (!node) return;

            gsap.to(node.mesh.material, {
                emissiveIntensity: 0.8,
                duration,
                delay: i * 0.2
            });
            gsap.to(node.mesh.scale, {
                x: 1.15, y: 1.15, z: 1.15,
                duration,
                delay: i * 0.2
            });
        });
    };

    /**
     * Show feature importance bars
     */
    GSAPEngine.prototype.showFeatureImportance = function (features, importance) {
        const maxHeight = 4;
        const barWidth = 0.6;
        const startX = 8;
        const maxImp = Math.max(...importance);

        features.forEach((feat, i) => {
            const height = (importance[i] / maxImp) * maxHeight;
            const hue = 0.6 - (importance[i] / maxImp) * 0.4; // Blue to green
            const color = new THREE.Color().setHSL(hue, 0.8, 0.5);

            const geo = new THREE.BoxGeometry(barWidth, height, 0.3);
            const mat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.8 });
            const bar = new THREE.Mesh(geo, mat);
            bar.position.set(startX, -4 + height / 2, 0);
            bar.scale.y = 0;
            this.scene.add(bar);

            gsap.to(bar.scale, { y: 1, duration: 0.6, delay: i * 0.1, ease: "power2.out" });

            // Label
            const label = createTextSprite(`${feat}: ${(importance[i] * 100).toFixed(0)}%`, 10, '#ffffff');
            label.position.set(startX, -4 + height + 0.4, 0);
            this.scene.add(label);

            this.objects[`feat_bar_${i}`] = { group: bar, type: 'feature_bar' };
        });
    };

    // ═══════════════════════════════════════════════════════════════════
    // RANDOM FOREST
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Spawn multiple trees for Random Forest
     */
    GSAPEngine.prototype.spawnForestTrees = function (numTrees, spacing = 6) {
        const startX = -((numTrees - 1) * spacing) / 2;

        for (let i = 0; i < numTrees; i++) {
            const x = startX + i * spacing;
            const treeId = `tree_${i}`;
            
            // Simple tree representation
            const geo = new THREE.ConeGeometry(1, 2, 8);
            const mat = new THREE.MeshStandardMaterial({
                color: TREE_COLORS.node,
                transparent: true,
                opacity: 0.8
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, 0, 0);
            mesh.scale.set(0, 0, 0);
            this.scene.add(mesh);

            this.objects[treeId] = { group: mesh, mesh, type: 'forest_tree', vote: null };

            gsap.to(mesh.scale, {
                x: 1, y: 1, z: 1,
                duration: 0.5,
                delay: i * 0.1,
                ease: "back.out(1.5)"
            });
        }
    };

    /**
     * Show tree vote
     */
    GSAPEngine.prototype.showTreeVote = function (treeIndex, voteClass) {
        const treeId = `tree_${treeIndex}`;
        const tree = this.objects[treeId];
        if (!tree) return;

        const color = voteClass === 0 ? TREE_COLORS.leaf0 : TREE_COLORS.leaf1;
        tree.vote = voteClass;

        gsap.to(tree.mesh.material.color, {
            r: new THREE.Color(color).r,
            g: new THREE.Color(color).g,
            b: new THREE.Color(color).b,
            duration: 0.4
        });

        // Vote label
        const label = createTextSprite(`Class ${voteClass}`, 24, voteClass === 0 ? '#ef4444' : '#22c55e');
        label.position.set(tree.mesh.position.x, tree.mesh.position.y + 2.5, 0); // Higher up
        label.scale.set(5, 2, 1); // Make it big
        this.scene.add(label);
    };

    /**
     * Show voting result
     */
    GSAPEngine.prototype.showVotingResult = function (finalClass, votes) {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 80;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = finalClass === 0 ? '#ef4444' : '#22c55e';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Final: Class ${finalClass}`, 150, 35);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`Votes: ${votes[0]} vs ${votes[1]}`, 150, 60);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(0, 6, 0); // Higher
        sprite.scale.set(8, 2.5, 1); // Larger scale
        this.scene.add(sprite);

        this.objects['voting_result'] = { group: sprite, type: 'label' };
    };
}
