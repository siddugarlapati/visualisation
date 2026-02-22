/**
 * boosting_api.js - Gradient Boosting (XGBoost/LightGBM) Visualization
 * Implements tree-by-tree improvement animation and residual plots
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { createTextSprite } from './ml_base.js';

/**
 * Register Gradient Boosting visualization methods on GSAPEngine
 */
export function registerBoostingAPI(GSAPEngine) {
    
    GSAPEngine.prototype.boostingData = {
        trees: [],
        residuals: [],
        predictions: []
    };

    /**
     * Spawn weak learner (small tree representation)
     */
    /**
     * Spawn boosting tree (was spawnWeakLearner)
     */
    GSAPEngine.prototype.spawnBoostingTree = function (id, depth) {
        // Backend passes 'depth' but we visualize simplified trees
        // Use depth to determine scale or visual complexity if needed, for now just spawn cone
        const index = this.boostingData.trees.length; // Auto-increment index
        const x = -8 + index * 3;
        const y = 0;
        
        const geo = new THREE.ConeGeometry(0.8 + depth * 0.1, 1.5 + depth * 0.2, 6);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x6366f1,
            transparent: true,
            opacity: 0.8
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, 0);
        mesh.scale.set(0, 0, 0);
        this.scene.add(mesh);

        // Label
        const label = createTextSprite(`Tree ${index+1}`, 16, '#ffffff');
        label.position.set(0, 1.5, 0);
        mesh.add(label);

        this.objects[id] = { group: mesh, mesh, type: 'boosting_tree', index };
        this.boostingData.trees.push({ id, index, mesh });

        gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.8, ease: "back.out(1.5)" });
    };

    /**
     * Add weak learner prediction (visualize contribution)
     */
    GSAPEngine.prototype.addWeakLearner = function (treeId, prediction) {
        // Find tree and show its prediction contribution
       const treeObj = this.objects[treeId];
       if (treeObj) {
           const label = createTextSprite(`+${prediction.toFixed(2)}`, 14, '#22c55e');
           label.position.set(0, -1.2, 0);
           treeObj.mesh.add(label);
       }
    };

    /**
     * Show residuals (accepts array of residuals)
     */
    GSAPEngine.prototype.showResiduals = function (residuals) {
        // Visualize the residual error bars
        // For simplicity, we'll visualize a subset or average if too many, or just spawned bars
        residuals.forEach((res, i) => {
             const x = -6 + i * 1.5;
             const height = res * 4; 
             const barId = `resid_${i}_${Date.now()}`;
             
             // Cleanup old specific bar if needed (though usually we want to show evolution)
             
             const geo = new THREE.BoxGeometry(0.4, Math.abs(height), 0.2);
             const mat = new THREE.MeshStandardMaterial({
                 color: res > 0 ? 0xef4444 : 0x22c55e,
                 transparent: true,
                 opacity: 0.8
             });
             const bar = new THREE.Mesh(geo, mat);
             bar.position.set(x, -4 + height/2, 2);
             this.scene.add(bar);
             
             // Fade out old residuals? For now just add new ones on top or shift z
        });
    };

    /**
     * Update ensemble prediction (combine models)
     */
    GSAPEngine.prototype.updateEnsemblePrediction = function (combinedModel) {
        this.combineEnsemble(); // Call existing animation
    };
    /**
     * Animate ensemble combination
     */
    GSAPEngine.prototype.combineEnsemble = function () {
        // Draw lines connecting all trees to final prediction
        this.boostingData.trees.forEach((t, i) => {
            const lineGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(t.mesh.position.x, t.mesh.position.y, 0),
                new THREE.Vector3(6, 0, 0) // Final prediction point
            ]);
            const lineMat = new THREE.LineBasicMaterial({
                color: 0x6366f1,
                transparent: true,
                opacity: 0
            });
            const line = new THREE.Line(lineGeo, lineMat);
            this.scene.add(line);

            gsap.to(lineMat, { opacity: 0.4, duration: 0.3, delay: i * 0.1 });
        });

        // Final prediction marker
        const finalGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const finalMat = new THREE.MeshPhysicalMaterial({
            color: 0x22c55e,
            emissive: 0x22c55e,
            emissiveIntensity: 0.5
        });
        const final = new THREE.Mesh(finalGeo, finalMat);
        final.position.set(6, 0, 0);
        final.scale.set(0, 0, 0);
        this.scene.add(final);

        gsap.to(final.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: "elastic.out(1, 0.5)" });
    };
}
