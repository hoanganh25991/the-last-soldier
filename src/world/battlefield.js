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
        
        // Add houses and other structures
        this.createHouses();
        this.createVehicles();
        this.createBarrelsAndCrates();
        this.createWallsAndFences();
    }
    
    dispose() {
        // Remove terrain from scene
        if (this.terrain && this.terrain.mesh && this.scene) {
            this.scene.remove(this.terrain.mesh);
            if (this.terrain.dispose) {
                this.terrain.dispose();
            }
        }
        
        // Remove all objects from scene and dispose them
        if (this.objects && this.scene) {
            this.objects.forEach(obj => {
                if (obj && this.scene) {
                    this.scene.remove(obj);
                    // Dispose geometry and materials
                    obj.traverse((child) => {
                        if (child.geometry) {
                            child.geometry.dispose();
                        }
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(material => material.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    });
                }
            });
        }
        
        // Clear arrays
        this.objects = [];
        this.terrain = null;
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

    createHouses() {
        // Create various sized houses/buildings across the map
        const mapSize = 25000; // Half of 50000 (map extends from -25000 to +25000)
        const houseCount = 150; // Total number of houses
        
        // House materials
        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xd3d3d3 }); // Light gray
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 }); // Brown
        const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a2e }); // Dark blue/black
        
        for (let i = 0; i < houseCount; i++) {
            const house = new THREE.Group();
            
            // Random house size (small, medium, large)
            const sizeType = Math.random();
            let width, depth, height;
            
            if (sizeType < 0.4) {
                // Small house (40%)
                width = 4 + Math.random() * 3;
                depth = 4 + Math.random() * 3;
                height = 3 + Math.random() * 2;
            } else if (sizeType < 0.8) {
                // Medium house (40%)
                width = 6 + Math.random() * 4;
                depth = 6 + Math.random() * 4;
                height = 4 + Math.random() * 3;
            } else {
                // Large building (20%)
                width = 10 + Math.random() * 8;
                depth = 10 + Math.random() * 8;
                height = 6 + Math.random() * 6;
            }
            
            // Create walls
            const wallGeometry = new THREE.BoxGeometry(width, height, 0.3);
            const frontWall = new THREE.Mesh(wallGeometry, wallMaterial);
            frontWall.position.set(0, height / 2, depth / 2);
            frontWall.castShadow = true;
            frontWall.receiveShadow = true;
            house.add(frontWall);
            
            const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
            backWall.position.set(0, height / 2, -depth / 2);
            backWall.castShadow = true;
            backWall.receiveShadow = true;
            house.add(backWall);
            
            const sideWallGeometry = new THREE.BoxGeometry(0.3, height, depth);
            const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
            leftWall.position.set(-width / 2, height / 2, 0);
            leftWall.castShadow = true;
            leftWall.receiveShadow = true;
            house.add(leftWall);
            
            const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
            rightWall.position.set(width / 2, height / 2, 0);
            rightWall.castShadow = true;
            rightWall.receiveShadow = true;
            house.add(rightWall);
            
            // Create roof (pitched roof)
            const roofHeight = height * 0.3;
            const roofGeometry = new THREE.BoxGeometry(width * 1.1, roofHeight, depth * 1.1);
            const roof = new THREE.Mesh(roofGeometry, roofMaterial);
            roof.position.set(0, height + roofHeight / 2, 0);
            roof.rotation.z = Math.random() * 0.1 - 0.05; // Slight tilt
            roof.castShadow = true;
            roof.receiveShadow = true;
            house.add(roof);
            
            // Add windows (simple dark rectangles)
            if (Math.random() > 0.3) { // 70% chance to have windows
                const windowSize = Math.min(width, depth) * 0.15;
                const windowGeometry = new THREE.BoxGeometry(windowSize, windowSize, 0.1);
                const windowCount = Math.floor(Math.random() * 3) + 1;
                
                for (let w = 0; w < windowCount; w++) {
                    const window = new THREE.Mesh(windowGeometry, windowMaterial);
                    const windowHeight = height * (0.3 + Math.random() * 0.4);
                    const windowX = (Math.random() - 0.5) * width * 0.6;
                    window.position.set(windowX, windowHeight, depth / 2 + 0.1);
                    house.add(window);
                }
            }
            
            // Random position across the map (more dense near center)
            let distance, angle;
            if (Math.random() < 0.5) {
                // 50% spawn closer to center (within 2000 units)
                distance = Math.random() * 2000;
            } else {
                // 50% spawn further out (2000-10000 units)
                distance = 2000 + Math.random() * 8000;
            }
            angle = Math.random() * Math.PI * 2;
            
            house.position.set(
                Math.cos(angle) * distance,
                0,
                Math.sin(angle) * distance
            );
            house.rotation.y = Math.random() * Math.PI * 2;
            
            house.castShadow = true;
            house.receiveShadow = true;
            this.scene.add(house);
            this.objects.push(house);
        }
    }

    createVehicles() {
        // Create vehicles (trucks, cars) across the map
        const vehicleCount = 80;
        
        const vehicleBodyMaterial = new THREE.MeshLambertMaterial({ color: 0x2c3e50 }); // Dark blue-gray
        const vehicleWindowMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a2e }); // Dark
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a }); // Black
        
        for (let i = 0; i < vehicleCount; i++) {
            const vehicle = new THREE.Group();
            const isTruck = Math.random() > 0.6; // 40% trucks, 60% cars
            
            let bodyWidth, bodyDepth, bodyHeight;
            if (isTruck) {
                bodyWidth = 2.5;
                bodyDepth = 5;
                bodyHeight = 2.5;
            } else {
                bodyWidth = 1.8;
                bodyDepth = 3.5;
                bodyHeight = 1.5;
            }
            
            // Vehicle body
            const bodyGeometry = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
            const body = new THREE.Mesh(bodyGeometry, vehicleBodyMaterial);
            body.position.y = bodyHeight / 2;
            body.castShadow = true;
            body.receiveShadow = true;
            vehicle.add(body);
            
            // Windows
            const windowGeometry = new THREE.BoxGeometry(bodyWidth * 0.8, bodyHeight * 0.4, bodyDepth * 0.3);
            const windshield = new THREE.Mesh(windowGeometry, vehicleWindowMaterial);
            windshield.position.set(0, bodyHeight * 0.7, bodyDepth * 0.35);
            vehicle.add(windshield);
            
            // Wheels
            const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
            const wheelPositions = [
                { x: bodyWidth * 0.6, z: bodyDepth * 0.3 },
                { x: -bodyWidth * 0.6, z: bodyDepth * 0.3 },
                { x: bodyWidth * 0.6, z: -bodyDepth * 0.3 },
                { x: -bodyWidth * 0.6, z: -bodyDepth * 0.3 }
            ];
            
            wheelPositions.forEach(pos => {
                const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
                wheel.rotation.z = Math.PI / 2;
                wheel.position.set(pos.x, 0.4, pos.z);
                wheel.castShadow = true;
                vehicle.add(wheel);
            });
            
            // Random position
            let distance, angle;
            if (Math.random() < 0.6) {
                distance = Math.random() * 3000;
            } else {
                distance = 3000 + Math.random() * 7000;
            }
            angle = Math.random() * Math.PI * 2;
            
            vehicle.position.set(
                Math.cos(angle) * distance,
                0,
                Math.sin(angle) * distance
            );
            vehicle.rotation.y = Math.random() * Math.PI * 2;
            
            vehicle.castShadow = true;
            vehicle.receiveShadow = true;
            this.scene.add(vehicle);
            this.objects.push(vehicle);
        }
    }

    createBarrelsAndCrates() {
        // Create barrels, crates, and containers
        const objectCount = 200;
        
        const barrelMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 }); // Brown
        const crateMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 }); // Dark brown
        const containerMaterial = new THREE.MeshLambertMaterial({ color: 0x4682b4 }); // Steel blue
        
        for (let i = 0; i < objectCount; i++) {
            const objectType = Math.random();
            let object;
            
            if (objectType < 0.4) {
                // Barrel (40%)
                const barrelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.2, 16);
                object = new THREE.Mesh(barrelGeometry, barrelMaterial);
                object.position.y = 0.6;
            } else if (objectType < 0.8) {
                // Crate (40%)
                const crateSize = 0.8 + Math.random() * 0.6;
                const crateGeometry = new THREE.BoxGeometry(crateSize, crateSize, crateSize);
                object = new THREE.Mesh(crateGeometry, crateMaterial);
                object.position.y = crateSize / 2;
                object.rotation.y = Math.random() * Math.PI * 2;
            } else {
                // Container (20%)
                const containerWidth = 2 + Math.random() * 1;
                const containerHeight = 2 + Math.random() * 1;
                const containerDepth = 3 + Math.random() * 2;
                const containerGeometry = new THREE.BoxGeometry(containerWidth, containerHeight, containerDepth);
                object = new THREE.Mesh(containerGeometry, containerMaterial);
                object.position.y = containerHeight / 2;
                object.rotation.y = Math.random() * Math.PI * 2;
            }
            
            // Random position
            let distance, angle;
            if (Math.random() < 0.7) {
                distance = Math.random() * 4000;
            } else {
                distance = 4000 + Math.random() * 6000;
            }
            angle = Math.random() * Math.PI * 2;
            
            object.position.x = Math.cos(angle) * distance;
            object.position.z = Math.sin(angle) * distance;
            
            object.castShadow = true;
            object.receiveShadow = true;
            this.scene.add(object);
            this.objects.push(object);
        }
    }

    createWallsAndFences() {
        // Create walls and fences for cover
        const wallCount = 100;
        
        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 }); // Gray
        const fenceMaterial = new THREE.MeshLambertMaterial({ color: 0x8b7355 }); // Brown
        
        for (let i = 0; i < wallCount; i++) {
            const isFence = Math.random() > 0.5;
            const material = isFence ? fenceMaterial : wallMaterial;
            
            let length, height;
            if (isFence) {
                length = 3 + Math.random() * 5;
                height = 1 + Math.random() * 0.5;
            } else {
                length = 2 + Math.random() * 4;
                height = 1.5 + Math.random() * 1.5;
            }
            
            const wallGeometry = new THREE.BoxGeometry(length, height, 0.2);
            const wall = new THREE.Mesh(wallGeometry, material);
            wall.position.y = height / 2;
            
            // Random position
            let distance, angle;
            if (Math.random() < 0.6) {
                distance = Math.random() * 3000;
            } else {
                distance = 3000 + Math.random() * 7000;
            }
            angle = Math.random() * Math.PI * 2;
            
            wall.position.x = Math.cos(angle) * distance;
            wall.position.z = Math.sin(angle) * distance;
            wall.rotation.y = Math.random() * Math.PI * 2;
            
            wall.castShadow = true;
            wall.receiveShadow = true;
            this.scene.add(wall);
            this.objects.push(wall);
        }
    }

    update(camera) {
        if (this.terrain) {
            this.terrain.update(camera);
        }
    }
}

