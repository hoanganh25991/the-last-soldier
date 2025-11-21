import * as THREE from 'three';
import { LODTerrain } from './lodTerrain.js';

export class Battlefield {
    constructor(scene) {
        this.scene = scene;
        this.terrain = null;
        this.objects = [];
    }

    async init() {
        // Create ground plane
        this.createGround();

        // Create terrain with LOD
        this.terrain = new LODTerrain();
        await this.terrain.init();
        this.scene.add(this.terrain.mesh);

        // Add some trees and obstacles
        this.createTrees();
        this.createObstacles();
    }

    createGround() {
        // Create a large ground plane
        const groundGeometry = new THREE.PlaneGeometry(200, 200, 32, 32);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4a7c59,
            wireframe: false
        });
        
        // Add some texture variation
        const vertices = groundGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            vertices[i + 1] = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.5;
        }
        groundGeometry.attributes.position.needsUpdate = true;
        groundGeometry.computeVertexNormals();
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.objects.push(ground);
    }

    createTrees() {
        const treeGeometry = new THREE.ConeGeometry(2, 8, 8);
        const treeMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });

        for (let i = 0; i < 50; i++) {
            const tree = new THREE.Group();
            
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = 1.5;
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            tree.add(trunk);

            const foliage = new THREE.Mesh(treeGeometry, treeMaterial);
            foliage.position.y = 5;
            foliage.castShadow = true;
            foliage.receiveShadow = true;
            tree.add(foliage);

            // Random position
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 80;
            tree.position.set(
                Math.cos(angle) * distance,
                0,
                Math.sin(angle) * distance
            );

            tree.castShadow = true;
            tree.receiveShadow = true;
            this.scene.add(tree);
            this.objects.push(tree);
        }
    }

    createObstacles() {
        // Create some cover objects (boxes, walls)
        const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
        const boxMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });

        for (let i = 0; i < 20; i++) {
            const box = new THREE.Mesh(boxGeometry, boxMaterial);
            const angle = Math.random() * Math.PI * 2;
            const distance = 15 + Math.random() * 70;
            box.position.set(
                Math.cos(angle) * distance,
                1,
                Math.sin(angle) * distance
            );
            box.rotation.y = Math.random() * Math.PI * 2;
            box.castShadow = true;
            box.receiveShadow = true;
            this.scene.add(box);
            this.objects.push(box);
        }
    }

    update(camera) {
        if (this.terrain) {
            this.terrain.update(camera);
        }
    }
}

