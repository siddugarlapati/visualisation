import * as THREE from 'three';
import gsap from 'gsap';

// Reusable Materials (Performance Optimization)
const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.9, // Glass-like
    opacity: 1,
    metalness: 0,
    roughness: 0.2, // Frosted
    ior: 1.5,
    thickness: 1.5,
    clearcoat: 1,
});

const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 2,
    roughness: 0.4
});

export class VisualizerContract {
    constructor(scene) {
        this.scene = scene;
        this.objects = {}; // Map<ID, Group>
        this.tl = gsap.timeline();
    }

    reset() {
        this.tl.clear();
        Object.values(this.objects).forEach(obj => {
            this.scene.remove(obj);
            // Deep dispose would go here in prod
        });
        this.objects = {};
    }

    // --- 1. THE "AWWWARDS" NODE CREATOR ---
    // Creates a glass shell with a glowing core
    create_node(id, value, x, y, z, color = 0xffffff) {
        const group = new THREE.Group();
        group.position.set(x, y, z);

        // Outer Glass Shell
        const shell = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 32), glassMaterial.clone());
        shell.castShadow = true;

        // Inner Glowing Core
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), coreMaterial.clone());
        core.material.color.setHex(color);
        core.material.emissive.setHex(color);

        group.add(shell);
        group.add(core);

        // Metadata for reference
        group.userData = { type: 'node', core: core, shell: shell };

        this.scene.add(group);
        this.objects[id] = group;

        // Entry Animation (Elastic Pop)
        gsap.from(group.scale, { x: 0, y: 0, z: 0, duration: 1, ease: "elastic.out(1, 0.5)" });
    }

    create_array(baseId, values, x, y, z) {
        values.forEach((val, i) => {
            const id = `${baseId}_${i}`;
            const posX = x + (i * 1.5);

            // Use a Cube for arrays, but make it look like a monolith
            const geo = new THREE.BoxGeometry(1, 1, 1);
            const mat = new THREE.MeshPhysicalMaterial({
                color: 0x1e293b, // Dark Slate
                metalness: 0.5,
                roughness: 0.1,
                clearcoat: 1
            });

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(posX, y, z);
            mesh.castShadow = true;

            this.scene.add(mesh);
            this.objects[id] = mesh;

            gsap.from(mesh.position, { y: -5, duration: 0.8, delay: i * 0.05, ease: "back.out(1.2)" });
        });
    }

    // --- 2. ACTIONS ---

    move(id, x, y, z, duration = 1) {
        const obj = this.objects[id];
        if (!obj) return;

        const target = {};
        if (x !== undefined) target.x = x;
        if (y !== undefined) target.y = y;
        if (z !== undefined) target.z = z;

        this.tl.to(obj.position, { ...target, duration, ease: "power3.inOut" });
    }

    swap(id1, id2, duration = 1.2) {
        const obj1 = this.objects[id1];
        const obj2 = this.objects[id2];
        if (!obj1 || !obj2) return;

        const label = `swap_${Date.now()}`;
        this.tl.addLabel(label);

        // Arching path (pseudo-arc by modifying Y midpoint? For now, simple linear swap with ease)
        // To look high-end, we use a "Back" ease to anticipate movement
        this.tl.to(obj1.position, { x: obj2.position.x, y: obj2.position.y, z: obj2.position.z, duration, ease: "back.inOut(1.7)" }, label);
        this.tl.to(obj2.position, { x: obj1.position.x, y: obj1.position.y, z: obj1.position.z, duration, ease: "back.inOut(1.7)" }, label);
    }

    highlight(id, color, duration = 0.5) {
        const obj = this.objects[id];
        if (!obj) return;

        // If it's a node group, highlight the core. If it's a mesh, highlight material.
        const targetMat = obj.userData.type === 'node' ? obj.userData.core.material : obj.material;

        this.tl.to(targetMat.color, {
            r: new THREE.Color(color).r,
            g: new THREE.Color(color).g,
            b: new THREE.Color(color).b,
            duration: duration
        }, "<");

        if (targetMat.emissive) {
            this.tl.to(targetMat.emissive, {
                r: new THREE.Color(color).r,
                g: new THREE.Color(color).g,
                b: new THREE.Color(color).b,
                duration: duration
            }, "<");
        }
    }
}