import * as THREE from 'three';
import { LODTerrain } from './lodTerrain.js';
import { graphicsSliderToLevel } from '../config/renderConfig.js';
import { getPerformanceProfile } from '../config/performanceProfile.js';
import { InstancedPropGroup, PROP_BOUNDS } from './instancedProps.js';
import { mergePartsByMaterial, disposeGeometries } from './geometryMerge.js';

const TREE_CLUSTERS = [
    { centerX: 0, centerZ: 0, radius: 200, count: 100 },
    { centerX: 100, centerZ: 100, radius: 150, count: 80 },
    { centerX: -100, centerZ: 100, radius: 150, count: 80 },
    { centerX: 100, centerZ: -100, radius: 150, count: 80 },
    { centerX: -100, centerZ: -100, radius: 150, count: 80 },
    { centerX: 200, centerZ: 0, radius: 150, count: 70 },
    { centerX: -200, centerZ: 0, radius: 150, count: 70 },
    { centerX: 0, centerZ: 200, radius: 150, count: 70 },
    { centerX: 0, centerZ: -200, radius: 150, count: 70 }
];

const OBSTACLE_CLUSTERS = [
    { centerX: 0, centerZ: 0, radius: 250, count: 50 },
    { centerX: 150, centerZ: 150, radius: 100, count: 30 },
    { centerX: -150, centerZ: 150, radius: 100, count: 30 },
    { centerX: 150, centerZ: -150, radius: 100, count: 30 },
    { centerX: -150, centerZ: -150, radius: 100, count: 30 }
];

export class Battlefield {
    constructor(worldGroup, settings = null) {
        this.worldGroup = worldGroup;
        this.scene = worldGroup;
        this.settings = settings || {};
        this.qualityLevel = graphicsSliderToLevel(this.settings.graphics ?? 50);
        this.profile = getPerformanceProfile(this.qualityLevel);
        this.spawnCounts = this.profile.spawnCounts;
        this.terrain = null;
        this.objects = [];
        this.instancedGroups = [];
    }

    async init() {
        // Create ground plane
        this.createGround();

        // Create terrain with LOD
        this.terrain = new LODTerrain(this.qualityLevel);
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
        if (this.terrain && this.terrain.mesh && this.scene) {
            this.scene.remove(this.terrain.mesh);
            if (this.terrain.dispose) {
                this.terrain.dispose();
            }
        }

        for (const group of this.instancedGroups) {
            group.dispose();
        }
        this.instancedGroups = [];
        
        if (this.objects && this.scene) {
            this.objects.forEach(obj => {
                if (obj && this.scene) {
                    this.scene.remove(obj);
                    obj.traverse((child) => {
                        if (child.geometry) child.geometry.dispose();
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
        const castShadow = this.profile.castShadows;
        const treeMultiplier = this.spawnCounts.treeMultiplier;
        const maxTrees = Math.ceil(700 * treeMultiplier);

        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3, 6);
        trunkGeometry.translate(0, 1.5, 0);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        const foliageGeometry = new THREE.ConeGeometry(2, 8, 6);
        foliageGeometry.translate(0, 5, 0);
        const foliageMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });

        const trunks = new InstancedPropGroup(this.scene, trunkGeometry, trunkMaterial, maxTrees, castShadow);
        const foliage = new InstancedPropGroup(this.scene, foliageGeometry, foliageMaterial, maxTrees, castShadow);

        let placed = 0;
        for (const cluster of TREE_CLUSTERS) {
            const clusterCount = Math.ceil(cluster.count * treeMultiplier);
            for (let i = 0; i < clusterCount && placed < maxTrees; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * cluster.radius;
                const x = cluster.centerX + Math.cos(angle) * distance;
                const z = cluster.centerZ + Math.sin(angle) * distance;

                trunks.addInstance(x, 0, z, 0, PROP_BOUNDS.treeTrunk);
                foliage.addInstance(x, 0, z, 0, PROP_BOUNDS.treeFoliage);
                placed++;
            }
        }

        trunks.finalize();
        foliage.finalize();
        this.instancedGroups.push(trunks, foliage);
        this.objects.push(...trunks.colliderProxies, ...foliage.colliderProxies);
    }

    createObstacles() {
        const castShadow = this.profile.castShadows;
        const total = this.spawnCounts.obstacles;
        const boxCount = Math.ceil(total * 0.5);
        const stoneCount = total - boxCount;

        const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
        boxGeometry.translate(0, 1, 0);
        const boxMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
        const stoneGeometry = new THREE.DodecahedronGeometry(1, 0);
        stoneGeometry.translate(0, 0.5, 0);
        const stoneMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });

        const boxes = new InstancedPropGroup(this.scene, boxGeometry, boxMaterial, boxCount, castShadow);
        const stones = new InstancedPropGroup(this.scene, stoneGeometry, stoneMaterial, stoneCount, castShadow);

        let boxPlaced = 0;
        let stonePlaced = 0;
        const scale = total / 170;

        for (const cluster of OBSTACLE_CLUSTERS) {
            const clusterCount = Math.ceil(cluster.count * scale);
            for (let i = 0; i < clusterCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * cluster.radius;
                const x = cluster.centerX + Math.cos(angle) * distance;
                const z = cluster.centerZ + Math.sin(angle) * distance;
                const isStone = Math.random() > 0.5;

                if (isStone && stonePlaced < stoneCount) {
                    stones.addInstance(x, 0, z, Math.random() * Math.PI * 2, PROP_BOUNDS.stone);
                    stonePlaced++;
                } else if (boxPlaced < boxCount) {
                    boxes.addInstance(x, 0, z, Math.random() * Math.PI * 2, PROP_BOUNDS.box);
                    boxPlaced++;
                }
            }
        }

        boxes.finalize();
        stones.finalize();
        this.instancedGroups.push(boxes, stones);
        this.objects.push(...boxes.colliderProxies, ...stones.colliderProxies);
    }

    createHouses() {
        const houseCount = this.spawnCounts.houses;
        const allowFar = this.spawnCounts.farStructures;
        const castShadow = this.profile.castShadows;
        const receiveShadow = this.profile.receiveShadows;
        // House materials
        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xd3d3d3 }); // Light gray
        const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 }); // Brown
        const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a2e }); // Dark blue/black
        
        for (let i = 0; i < houseCount; i++) {
            const house = new THREE.Group();
            const disposableGeometries = [];
            
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
            
            // Build mergeable parts (walls + roof + windows → 1–3 draw calls per house)
            const wallGeometry = new THREE.BoxGeometry(width, height, 0.3);
            const sideWallGeometry = new THREE.BoxGeometry(0.3, height, depth);
            const roofHeight = height * 0.3;
            const roofGeometry = new THREE.BoxGeometry(width * 1.1, roofHeight, depth * 1.1);
            disposableGeometries.push(wallGeometry, sideWallGeometry, roofGeometry);

            const parts = [
                {
                    geometry: wallGeometry,
                    material: wallMaterial,
                    position: new THREE.Vector3(0, height / 2, depth / 2),
                    casterType: 'large',
                    castShadow,
                    receiveShadow
                },
                {
                    geometry: wallGeometry,
                    material: wallMaterial,
                    position: new THREE.Vector3(0, height / 2, -depth / 2),
                    casterType: 'large',
                    castShadow,
                    receiveShadow
                },
                {
                    geometry: sideWallGeometry,
                    material: wallMaterial,
                    position: new THREE.Vector3(-width / 2, height / 2, 0),
                    casterType: 'large',
                    castShadow,
                    receiveShadow
                },
                {
                    geometry: sideWallGeometry,
                    material: wallMaterial,
                    position: new THREE.Vector3(width / 2, height / 2, 0),
                    casterType: 'large',
                    castShadow,
                    receiveShadow
                },
                {
                    geometry: roofGeometry,
                    material: roofMaterial,
                    position: new THREE.Vector3(0, height + roofHeight / 2, 0),
                    rotation: new THREE.Euler(0, 0, Math.random() * 0.1 - 0.05),
                    casterType: 'large',
                    castShadow,
                    receiveShadow
                }
            ];

            if (Math.random() > 0.3) {
                const windowSize = Math.min(width, depth) * 0.15;
                const windowGeometry = new THREE.BoxGeometry(windowSize, windowSize, 0.1);
                disposableGeometries.push(windowGeometry);
                const windowCount = Math.floor(Math.random() * 3) + 1;

                for (let w = 0; w < windowCount; w++) {
                    const windowHeight = height * (0.3 + Math.random() * 0.4);
                    const windowX = (Math.random() - 0.5) * width * 0.6;
                    parts.push({
                        geometry: windowGeometry,
                        material: windowMaterial,
                        position: new THREE.Vector3(windowX, windowHeight, depth / 2 + 0.1),
                        casterType: 'small',
                        castShadow: false,
                        receiveShadow
                    });
                }
            }

            const mergedMeshes = mergePartsByMaterial(parts);
            for (const mesh of mergedMeshes) {
                house.add(mesh);
            }
            disposeGeometries(disposableGeometries);
            
            // Random position across the map (more dense near center)
            let distance, angle;
            if (!allowFar || Math.random() < 0.5) {
                distance = Math.random() * 2000;
            } else {
                distance = 2000 + Math.random() * 8000;
            }
            angle = Math.random() * Math.PI * 2;
            
            house.position.set(
                Math.cos(angle) * distance,
                0,
                Math.sin(angle) * distance
            );
            house.rotation.y = Math.random() * Math.PI * 2;
            house.userData.shadowCasterRoot = true;
            house.userData.shadowCasterType = 'large';
            
            this.scene.add(house);
            this.objects.push(house);
        }
    }

    createVehicles() {
        const vehicleCount = this.spawnCounts.vehicles;
        const allowFar = this.spawnCounts.farStructures;
        const castShadow = this.profile.castShadows;
        const receiveShadow = this.profile.receiveShadows;
        const vehicleBodyMaterial = new THREE.MeshLambertMaterial({ color: 0x2c3e50 }); // Dark blue-gray
        const vehicleWindowMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a2e }); // Dark
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a }); // Black
        
        for (let i = 0; i < vehicleCount; i++) {
            const vehicle = new THREE.Group();
            const disposableGeometries = [];
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
            
            const bodyGeometry = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth);
            const windowGeometry = new THREE.BoxGeometry(bodyWidth * 0.8, bodyHeight * 0.4, bodyDepth * 0.3);
            const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8);
            disposableGeometries.push(bodyGeometry, windowGeometry, wheelGeometry);

            const parts = [
                {
                    geometry: bodyGeometry,
                    material: vehicleBodyMaterial,
                    position: new THREE.Vector3(0, bodyHeight / 2, 0),
                    casterType: 'medium',
                    castShadow,
                    receiveShadow
                },
                {
                    geometry: windowGeometry,
                    material: vehicleWindowMaterial,
                    position: new THREE.Vector3(0, bodyHeight * 0.7, bodyDepth * 0.35),
                    casterType: 'small',
                    castShadow: false,
                    receiveShadow
                }
            ];

            const wheelPositions = [
                { x: bodyWidth * 0.6, z: bodyDepth * 0.3 },
                { x: -bodyWidth * 0.6, z: bodyDepth * 0.3 },
                { x: bodyWidth * 0.6, z: -bodyDepth * 0.3 },
                { x: -bodyWidth * 0.6, z: -bodyDepth * 0.3 }
            ];

            for (const pos of wheelPositions) {
                parts.push({
                    geometry: wheelGeometry,
                    material: wheelMaterial,
                    position: new THREE.Vector3(pos.x, 0.4, pos.z),
                    rotation: new THREE.Euler(0, 0, Math.PI / 2),
                    casterType: 'small',
                    castShadow: false,
                    receiveShadow
                });
            }

            const mergedMeshes = mergePartsByMaterial(parts);
            for (const mesh of mergedMeshes) {
                vehicle.add(mesh);
            }
            disposeGeometries(disposableGeometries);
            
            // Random position
            let distance, angle;
            if (!allowFar || Math.random() < 0.6) {
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
            vehicle.userData.shadowCasterRoot = true;
            vehicle.userData.shadowCasterType = 'medium';
            
            this.scene.add(vehicle);
            this.objects.push(vehicle);
        }
    }

    createBarrelsAndCrates() {
        const objectCount = this.spawnCounts.barrels;
        const allowFar = this.spawnCounts.farStructures;
        const castShadow = this.profile.castShadows;

        const barrelCount = Math.ceil(objectCount * 0.4);
        const crateCount = Math.ceil(objectCount * 0.4);
        const containerCount = objectCount - barrelCount - crateCount;

        const barrelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.2, 8);
        barrelGeometry.translate(0, 0.6, 0);
        const barrelMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        const crateGeometry = new THREE.BoxGeometry(1.1, 1.1, 1.1);
        crateGeometry.translate(0, 0.55, 0);
        const crateMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const containerGeometry = new THREE.BoxGeometry(2.5, 2.5, 4);
        containerGeometry.translate(0, 1.25, 0);
        const containerMaterial = new THREE.MeshLambertMaterial({ color: 0x4682b4 });

        const barrels = new InstancedPropGroup(this.scene, barrelGeometry, barrelMaterial, barrelCount, castShadow);
        const crates = new InstancedPropGroup(this.scene, crateGeometry, crateMaterial, crateCount, castShadow);
        const containers = new InstancedPropGroup(this.scene, containerGeometry, containerMaterial, containerCount, castShadow);

        let barrelPlaced = 0;
        let cratePlaced = 0;
        let containerPlaced = 0;

        for (let i = 0; i < objectCount; i++) {
            let distance, angle;
            if (!allowFar || Math.random() < 0.7) {
                distance = Math.random() * 4000;
            } else {
                distance = 4000 + Math.random() * 6000;
            }
            angle = Math.random() * Math.PI * 2;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            const roll = Math.random();

            if (roll < 0.4 && barrelPlaced < barrelCount) {
                barrels.addInstance(x, 0, z, Math.random() * Math.PI * 2, PROP_BOUNDS.barrel);
                barrelPlaced++;
            } else if (roll < 0.8 && cratePlaced < crateCount) {
                crates.addInstance(x, 0, z, Math.random() * Math.PI * 2, PROP_BOUNDS.crate);
                cratePlaced++;
            } else if (containerPlaced < containerCount) {
                containers.addInstance(x, 0, z, Math.random() * Math.PI * 2, PROP_BOUNDS.container);
                containerPlaced++;
            }
        }

        barrels.finalize();
        crates.finalize();
        containers.finalize();
        this.instancedGroups.push(barrels, crates, containers);
        this.objects.push(...barrels.colliderProxies, ...crates.colliderProxies, ...containers.colliderProxies);
    }

    createWallsAndFences() {
        const wallCount = this.spawnCounts.walls;
        const allowFar = this.spawnCounts.farStructures;
        const castShadow = this.profile.castShadows;
        const fenceCount = Math.ceil(wallCount * 0.5);
        const solidCount = wallCount - fenceCount;

        const wallGeometry = new THREE.BoxGeometry(3, 2.25, 0.2);
        wallGeometry.translate(0, 1.125, 0);
        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
        const fenceGeometry = new THREE.BoxGeometry(5, 1.25, 0.2);
        fenceGeometry.translate(0, 0.625, 0);
        const fenceMaterial = new THREE.MeshLambertMaterial({ color: 0x8b7355 });

        const walls = new InstancedPropGroup(this.scene, wallGeometry, wallMaterial, solidCount, castShadow);
        const fences = new InstancedPropGroup(this.scene, fenceGeometry, fenceMaterial, fenceCount, castShadow);

        let wallPlaced = 0;
        let fencePlaced = 0;

        for (let i = 0; i < wallCount; i++) {
            const isFence = Math.random() > 0.5;
            let distance, angle;
            if (!allowFar || Math.random() < 0.6) {
                distance = Math.random() * 3000;
            } else {
                distance = 3000 + Math.random() * 7000;
            }
            angle = Math.random() * Math.PI * 2;
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            const rotY = Math.random() * Math.PI * 2;

            if (isFence && fencePlaced < fenceCount) {
                fences.addInstance(x, 0, z, rotY, PROP_BOUNDS.fence);
                fencePlaced++;
            } else if (wallPlaced < solidCount) {
                walls.addInstance(x, 0, z, rotY, PROP_BOUNDS.wall);
                wallPlaced++;
            }
        }

        walls.finalize();
        fences.finalize();
        this.instancedGroups.push(walls, fences);
        this.objects.push(...walls.colliderProxies, ...fences.colliderProxies);
    }

    update(camera, playerPosition) {
        if (this.terrain) {
            this.terrain.update(camera);
        }

        if (playerPosition) {
            const { showDistance, hideDistance } = this.profile.worldVisibility;
            for (const group of this.instancedGroups) {
                group.updateVisibility(playerPosition, showDistance, hideDistance);
            }
        }
    }
}

