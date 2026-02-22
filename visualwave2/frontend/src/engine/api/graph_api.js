/**
 * graph_api.js - Graph Data Structure API with Auto-Layout
 */

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import gsap from 'gsap';


export function registerGraphAPI(GSAPEngine) {

    // Graph state tracking
    GSAPEngine.prototype._graphNodeCount = 0;
    GSAPEngine.prototype._graphNodePositions = {};
    GSAPEngine.prototype._graphLayoutRadius = 12; // Increased for larger graph

    /**
     * Create a graph node with automatic radial layout
     * If x,y are 0 or not provided, auto-positions in circular pattern
     */
    GSAPEngine.prototype.graphCreateNode = function (id, value, x = null, y = null, iconType = null) {
        // Check if custom position provided
        const hasCustomPos = (x !== null && x !== 0) || (y !== null && y !== 0);

        let finalX, finalY, finalZ;

        if (hasCustomPos) {
            // Use provided position but add slight Z offset for depth
            finalX = x;
            finalY = y;
            finalZ = (iconType === 'frontend') ? 0.5 : (Math.random() - 0.5) * 2; // Frontends closer to camera
        } else {
            // Auto-layout: radial/spiral pattern
            const count = this._graphNodeCount;
            const nodesPerRing = 6;
            const ring = Math.floor(count / nodesPerRing);
            const indexInRing = count % nodesPerRing;

            const radius = this._graphLayoutRadius + ring * 4.5; // Increased ring spacing
            const angleOffset = ring * 0.3; // Offset each ring for visual interest
            const angle = (indexInRing / nodesPerRing) * Math.PI * 2 + angleOffset;

            finalX = Math.cos(angle) * radius;
            finalY = Math.sin(angle) * radius * 0.6; // Slightly elliptical
            finalZ = (ring % 2) * 2 - 1 + (Math.random() - 0.5); // Alternate depth per ring
        }

        this._graphNodePositions[id] = { x: finalX, y: finalY, z: finalZ };
        this._graphNodeCount++;

        if (iconType) {
            this.createIconNode(id, value, { x: finalX, y: finalY, z: finalZ }, iconType);
        } else {
            this.createSphereNode(id, value, { x: finalX, y: finalY, z: finalZ });
        }
    };

    /**
     * Reset graph layout counter (call before new visualization)
     */
    GSAPEngine.prototype.graphResetLayout = function () {
        this._graphNodeCount = 0;
        this._graphNodePositions = {};
    };

    GSAPEngine.prototype.graphConnect = function (id1, id2, directed = false) {
        this.connect(id1, id2);
        if (directed) this.pulse(id2);
    };

    /**
     * Connect two nodes with a weighted edge, displaying the weight on the connection line
     * Weight label is billboarded and follows the curve midpoint.
     */
    GSAPEngine.prototype.graphConnectWeighted = function (id1, id2, weight) {
        this.connect(id1, id2);
        const conn = this.getEdge(id1, id2);
        if (!conn) return;

        // Visual Style for Edge Weights (Small, Circular/Pill)
        const labelId = `weight_${id1}_${id2}`;
        const color = 0x222222;

        const group = new THREE.Group();
        // Initial position (will be updated in tick)
        // Just put it at p1 for now or avg
        const p1 = conn.obj1.group.position;
        const p2 = conn.obj2.group.position;
        group.position.set((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, (p1.z + p2.z) / 2);

        // 1. Background (Box Style) around weight
        // Rectangular, low radius
        const bgGeo = new RoundedBoxGeometry(1.4, 0.9, 0.1, 4, 0.1);
        const bgMat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.5,
            transparent: true,
            opacity: 0.9
        });
        const bgMesh = new THREE.Mesh(bgGeo, bgMat);
        group.add(bgMesh);

        // 2. Text (Smaller)
        const texture = this._createLabelTexture(weight.toString(), '#ffffff', 1.4);
        const textGeo = new THREE.PlaneGeometry(1.2, 0.8);
        const textMat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });
        const textMesh = new THREE.Mesh(textGeo, textMat);
        textMesh.position.z = 0.06;
        textMesh.userData.isText = true;
        group.add(textMesh);

        this.scene.add(group);

        this.objects[labelId] = { id: labelId, group, type: 'edge_label' };
        if (this.billboards) this.billboards.push(this.objects[labelId]);

        conn.labelId = labelId;

        // Scale in - Moderate scale
        group.scale.set(0, 0, 0);
        if (gsap) gsap.to(group.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.5, ease: "back.out" });
    };

    GSAPEngine.prototype.graphHighlight = function (id, color = 0x3b82f6) {
        this.highlight(id, color);
        this.driftCamera(id, 0.05, 1.5); // Very subtle 5% drift over 1.5s
    };

    GSAPEngine.prototype.graphHighlightEdge = function (id1, id2, color = 0x3b82f6) {
        this.graphConnect(id1, id2);
        this.highlight(id2, color);
    };

    GSAPEngine.prototype.graphMovePointer = function (pointerId, targetNodeId) {
        if (!this.objects[pointerId] || !this.objects[targetNodeId]) return;

        // Get tiered offset for pointer
        const lowerPtrId = pointerId.toLowerCase();
        let yOffset = 2.0;
        if (lowerPtrId === 'current' || lowerPtrId === 'src' || lowerPtrId === 'u') {
            yOffset = 1.8;
        } else if (lowerPtrId === 'visited' || lowerPtrId === 'dst' || lowerPtrId === 'v') {
            yOffset = 2.6;
        } else if (lowerPtrId === 'neighbor' || lowerPtrId === 'next') {
            yOffset = -1.5;
        }

        const pos = this.objects[targetNodeId].group.position;
        this.move(pointerId, { x: pos.x, y: pos.y + yOffset, z: pos.z + 0.5 }, 0.6);
    };

    GSAPEngine.prototype.graphQueuePush = function (nodeId) {
        this.pulse(nodeId);
        this.highlight(nodeId, 0x10b981);
    };

    GSAPEngine.prototype.graphQueuePop = function (nodeId) {
        this.shake(nodeId);
    };

    GSAPEngine.prototype.graphVisitDFS = function (nodeId) {
        this.highlight(nodeId, 0x3b82f6);
        this.pulse(nodeId);
    };

    GSAPEngine.prototype.graphRelaxEdge = function (id1, id2) {
        this.bump(id1, id2);
        this.graphHighlightEdge(id1, id2, 0x10b981);
    };

    GSAPEngine.prototype.graphPath = function (pathIds = [], color = 0x10b981) {
        pathIds.forEach(id => this.highlight(id, color));
        for (let i = 0; i < pathIds.length - 1; i++) {
            this.graphHighlightEdge(pathIds[i], pathIds[i + 1], color);
        }
    };

    GSAPEngine.prototype.graphNotFound = function (nodeId) {
        this.shake(nodeId);
    };
}
