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
        // Create a large ground plane with bright green grass color (100x bigger: 50000x50000)
        const groundGeometry = new THREE.PlaneGeometry(50000, 50000, 1, 1);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x228b22, // Forest green - much brighter and more visible
            wireframe: false
        });
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        ground.userData.isGround = true; // Mark as ground for collision system
        
        // Make sure ground is added first so it's behind everything
        this.scene.add(ground);
        
        // Don't add to collision objects - ground collision is handled separately
    }

    createTrees() {
        const treeGeometry = new THREE.ConeGeometry(2, 8, 8);
        const treeMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });

        // Spawn trees in clusters around the deployment area (player starts at center)
        // Create multiple clusters within visible range (0-500 units from center)
        const clusters = [
            { centerX: 0, centerZ: 0, radius: 200, count: 100 },      // Center cluster
            { centerX: 100, centerZ: 100, radius: 150, count: 80 },  // NE cluster
            { centerX: -100, centerZ: 100, radius: 150, count: 80 }, // NW cluster
            { centerX: 100, centerZ: -100, radius: 150, count: 80 }, // SE cluster
            { centerX: -100, centerZ: -100, radius: 150, count: 80 }, // SW cluster
            { centerX: 200, centerZ: 0, radius: 150, count: 70 },    // East cluster
            { centerX: -200, centerZ: 0, radius: 150, count: 70 },   // West cluster
            { centerX: 0, centerZ: 200, radius: 150, count: 70 },    // North cluster
            { centerX: 0, centerZ: -200, radius: 150, count: 70 },   // South cluster
        ];

        let totalTrees = 0;
        for (const cluster of clusters) {
            for (let i = 0; i < cluster.count; i++) {
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

                // Random position within cluster
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * cluster.radius;
                tree.position.set(
                    cluster.centerX + Math.cos(angle) * distance,
                    0,
                    cluster.centerZ + Math.sin(angle) * distance
                );

                tree.castShadow = true;
                tree.receiveShadow = true;
                this.scene.add(tree);
                this.objects.push(tree);
                totalTrees++;
            }
        }
    }

    createObstacles() {
        // Create some cover objects (boxes, stones, walls) around deployment area
        const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
        const boxMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
        
        // Create stone/rock geometry variations
        const stoneGeometry = new THREE.DodecahedronGeometry(1, 0);
        const stoneMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });

        // Spawn obstacles in clusters around deployment area (visible range)
        const clusters = [
            { centerX: 0, centerZ: 0, radius: 250, count: 50 },      // Center cluster
            { centerX: 150, centerZ: 150, radius: 100, count: 30 }, // NE cluster
            { centerX: -150, centerZ: 150, radius: 100, count: 30 }, // NW cluster
            { centerX: 150, centerZ: -150, radius: 100, count: 30 }, // SE cluster
            { centerX: -150, centerZ: -150, radius: 100, count: 30 }, // SW cluster
        ];

        let totalObstacles = 0;
        for (const cluster of clusters) {
            for (let i = 0; i < cluster.count; i++) {
                // Mix boxes and stones
                const isStone = Math.random() > 0.5;
                const geometry = isStone ? stoneGeometry : boxGeometry;
                const material = isStone ? stoneMaterial : boxMaterial;
                
                const obstacle = new THREE.Mesh(geometry, material);
                
                // Random position within cluster
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * cluster.radius;
                obstacle.position.set(
                    cluster.centerX + Math.cos(angle) * distance,
                    isStone ? 0.5 : 1,
                    cluster.centerZ + Math.sin(angle) * distance
                );
                obstacle.rotation.y = Math.random() * Math.PI * 2;
                obstacle.rotation.x = isStone ? Math.random() * Math.PI * 0.3 : 0;
                obstacle.castShadow = true;
                obstacle.receiveShadow = true;
                this.scene.add(obstacle);
                this.objects.push(obstacle);
                totalObstacles++;
            }
        }
    }

    update(camera) {
        if (this.terrain) {
            this.terrain.update(camera);
        }
    }
}

