import * as THREE from 'three';
import { LODTerrain } from '../world/lodTerrain.js';

export class BattlefieldDeployBackground {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.terrain = null;
        this.strategicPoints = [];
        this.clock = null;
        this.animationId = null;
    }

    async init() {
        if (!this.canvas) return;

        // Ensure canvas has explicit dimensions
        const container = this.canvas.parentElement;
        if (container) {
            const rect = container.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                this.canvas.width = rect.width;
                this.canvas.height = rect.height;
            }
        }

        // Get canvas dimensions
        const width = this.canvas.width || this.canvas.clientWidth || 800;
        const height = this.canvas.height || this.canvas.clientHeight || 600;

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue background
        this.scene.fog = new THREE.Fog(0x87ceeb, 100, 300); // Keep original fog distance

        // Create perspective camera for isometric-like view (keep original zoom)
        this.camera = new THREE.PerspectiveCamera(
            45,  // FOV
            width / height,
            1,
            500
        );
        
        // Position camera for isometric/top-down view (keep original position)
        // Looking down at an angle from above (matching the design)
        this.camera.position.set(100, 150, 100);
        this.camera.lookAt(0, 0, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        // Directional light for shadows (simulating sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500; // Keep original shadow distance
        directionalLight.shadow.camera.left = -150;
        directionalLight.shadow.camera.right = 150;
        directionalLight.shadow.camera.top = 150;
        directionalLight.shadow.camera.bottom = -150;
        this.scene.add(directionalLight);

        // Create terrain
        await this.createTerrain();

        // Create ground plane
        this.createGround();

        // Create trees and obstacles
        this.createTrees();
        this.createObstacles();

        // Create strategic points A-E
        this.createStrategicPoints();

        // Create paths/roads
        this.createPaths();

        // Clock for animation
        this.clock = new THREE.Clock();

        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createGround() {
        // Create a large ground plane with bright green grass color (100x bigger: 50000x50000)
        const groundGeometry = new THREE.PlaneGeometry(50000, 50000, 1, 1);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x228b22, // Forest green
            wireframe: false
        });
        
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        
        this.scene.add(ground);
    }

    async createTerrain() {
        // Create terrain with LOD
        this.terrain = new LODTerrain();
        await this.terrain.init();
        this.scene.add(this.terrain.mesh);
    }

    createTrees() {
        const treeGeometry = new THREE.ConeGeometry(2, 8, 8);
        const treeMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
        const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });

        // Create clusters of trees, especially dense in top-left (around point B) - scaled for 100x larger map
        const treePositions = [
            // Dense cluster around point B (top-left)
            ...this.generateTreeCluster(-6000, -6000, 1500, 2000),
            // Scattered trees across the map
            ...this.generateTreeCluster(0, 0, 3000, 1000),
            ...this.generateTreeCluster(4000, -4000, 2000, 800),
            ...this.generateTreeCluster(-4000, 4000, 1500, 800),
        ];

        treePositions.forEach(pos => {
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

            tree.position.set(pos.x, 0, pos.z);
            tree.castShadow = true;
            tree.receiveShadow = true;
            this.scene.add(tree);
        });
    }

    generateTreeCluster(centerX, centerZ, radius, count) {
        const trees = [];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            trees.push({
                x: centerX + Math.cos(angle) * distance,
                z: centerZ + Math.sin(angle) * distance
            });
        }
        return trees;
    }

    createObstacles() {
        // Create buildings and structures at strategic points
        const boxGeometry = new THREE.BoxGeometry(3, 3, 3);
        const boxMaterial = new THREE.MeshLambertMaterial({ color: 0xd3d3d3 }); // Light gray

        // Point A - Single building (bottom-left) - scaled for 100x larger map
        const buildingA = new THREE.Mesh(boxGeometry, boxMaterial);
        buildingA.position.set(-6000, 1.5, 6000);
        buildingA.castShadow = true;
        buildingA.receiveShadow = true;
        this.scene.add(buildingA);

        // Point C - Two buildings (bottom-right) - scaled for 100x larger map
        const buildingC1 = new THREE.Mesh(boxGeometry, boxMaterial);
        buildingC1.position.set(5000, 1.5, 5000);
        buildingC1.castShadow = true;
        buildingC1.receiveShadow = true;
        this.scene.add(buildingC1);

        const buildingC2 = new THREE.Mesh(boxGeometry, boxMaterial);
        buildingC2.position.set(5500, 1.5, 4500);
        buildingC2.castShadow = true;
        buildingC2.receiveShadow = true;
        this.scene.add(buildingC2);

        // Point D - Cluster of buildings (top-right) - scaled for 100x larger map
        const buildingD1 = new THREE.Mesh(boxGeometry, boxMaterial);
        buildingD1.position.set(6000, 1.5, -5000);
        buildingD1.castShadow = true;
        buildingD1.receiveShadow = true;
        this.scene.add(buildingD1);

        const buildingD2 = new THREE.Mesh(boxGeometry, boxMaterial);
        buildingD2.position.set(6500, 1.5, -5500);
        buildingD2.castShadow = true;
        buildingD2.receiveShadow = true;
        this.scene.add(buildingD2);

        const buildingD3 = new THREE.Mesh(boxGeometry, boxMaterial);
        buildingD3.position.set(7000, 1.5, -5000);
        buildingD3.castShadow = true;
        buildingD3.receiveShadow = true;
        this.scene.add(buildingD3);

        // Point E - Low walls/trenches (center) - scaled for 100x larger map
        const wallGeometry = new THREE.BoxGeometry(800, 1, 1);
        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x8b7355 }); // Brown
        for (let i = 0; i < 4; i++) {
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            const angle = (i / 4) * Math.PI * 2;
            wall.position.set(
                Math.cos(angle) * 500,
                0.5,
                Math.sin(angle) * 500
            );
            wall.rotation.y = angle + Math.PI / 2;
            wall.castShadow = true;
            wall.receiveShadow = true;
            this.scene.add(wall);
        }
    }

    createPaths() {
        // Create dirt paths/roads - scaled for 100x larger map
        const pathGeometry = new THREE.PlaneGeometry(800, 20000, 1, 1);
        const pathMaterial = new THREE.MeshLambertMaterial({ color: 0x8b7355 }); // Brown dirt

        // Vertical path through center
        const verticalPath = new THREE.Mesh(pathGeometry, pathMaterial);
        verticalPath.rotation.x = -Math.PI / 2;
        verticalPath.position.y = 0.1;
        verticalPath.receiveShadow = true;
        this.scene.add(verticalPath);

        // Horizontal path in upper portion
        const horizontalPath = new THREE.Mesh(pathGeometry, pathMaterial);
        horizontalPath.rotation.x = -Math.PI / 2;
        horizontalPath.rotation.z = Math.PI / 2;
        horizontalPath.position.set(0, 0.1, -4000);
        horizontalPath.receiveShadow = true;
        this.scene.add(horizontalPath);

        // Curved path near point C
        const curvedPath = new THREE.PlaneGeometry(600, 5000, 1, 1);
        const curvedPathMesh = new THREE.Mesh(curvedPath, pathMaterial);
        curvedPathMesh.rotation.x = -Math.PI / 2;
        curvedPathMesh.rotation.y = Math.PI / 4;
        curvedPathMesh.position.set(4000, 0.1, 4000);
        curvedPathMesh.receiveShadow = true;
        this.scene.add(curvedPathMesh);
    }

    createStrategicPoints() {
        // Strategic point positions (matching the image layout, scaled for 100x larger map)
        const points = [
            { label: 'A', position: new THREE.Vector3(-6000, 0, 6000) },   // Bottom-left
            { label: 'B', position: new THREE.Vector3(-6000, 0, -6000) },  // Top-left
            { label: 'C', position: new THREE.Vector3(5000, 0, 5000) },    // Bottom-right
            { label: 'D', position: new THREE.Vector3(6000, 0, -5000) },   // Top-right
            { label: 'E', position: new THREE.Vector3(0, 0, 0) }        // Center
        ];

        points.forEach((point, index) => {
            // Create a circular marker on the ground
            const markerGeometry = new THREE.RingGeometry(1.5, 2.5, 32);
            const markerMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffffff,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.rotation.x = -Math.PI / 2;
            marker.position.copy(point.position);
            marker.position.y = 0.1;
            this.scene.add(marker);

            // Create a simple text representation using a plane with a colored background
            // For now, we'll use a simple colored circle to represent the letter
            const labelBgGeometry = new THREE.CircleGeometry(3, 16);
            const labelBgMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x000000,
                transparent: true,
                opacity: 0.5
            });
            const labelBg = new THREE.Mesh(labelBgGeometry, labelBgMaterial);
            labelBg.rotation.x = -Math.PI / 2;
            labelBg.position.copy(point.position);
            labelBg.position.y = 0.15;
            this.scene.add(labelBg);

            // Store point reference
            this.strategicPoints.push({
                label: point.label,
                position: point.position,
                marker: marker,
                labelBg: labelBg
            });
        });

        // Add medical/spawn point marker above point B (red cross in white circle) - scaled for 100x larger map
        const medicalCircleGeometry = new THREE.CircleGeometry(200, 16);
        const medicalCircleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        const medicalCircle = new THREE.Mesh(medicalCircleGeometry, medicalCircleMaterial);
        medicalCircle.rotation.x = -Math.PI / 2;
        medicalCircle.position.set(-6000, 0.2, -7000);
        this.scene.add(medicalCircle);

        // Red cross lines
        const crossLine1Geometry = new THREE.PlaneGeometry(30, 300);
        const crossLine2Geometry = new THREE.PlaneGeometry(300, 30);
        const crossMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.9
        });
        const crossLine1 = new THREE.Mesh(crossLine1Geometry, crossMaterial);
        const crossLine2 = new THREE.Mesh(crossLine2Geometry, crossMaterial);
        crossLine1.rotation.x = -Math.PI / 2;
        crossLine2.rotation.x = -Math.PI / 2;
        crossLine1.position.set(-6000, 0.25, -7000);
        crossLine2.position.set(-6000, 0.25, -7000);
        this.scene.add(crossLine1);
        this.scene.add(crossLine2);
    }

    animate() {
        if (!this.clock) return;

        const deltaTime = this.clock.getDelta();

        // Update terrain LOD
        if (this.terrain) {
            this.terrain.update(this.camera);
        }

        // Animate strategic point markers (subtle pulse effect)
        this.strategicPoints.forEach((point, index) => {
            if (point.marker) {
                const pulse = Math.sin(this.clock.getElapsedTime() * 2 + index) * 0.1 + 1;
                point.marker.scale.set(pulse, pulse, 1);
            }
        });

        // Render
        this.renderer.render(this.scene, this.camera);
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    start() {
        if (!this.animationId) {
            this.animate();
        }
    }

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    onWindowResize() {
        if (!this.canvas || !this.camera || !this.renderer) return;

        const rect = this.canvas.getBoundingClientRect();
        const width = rect.width || this.canvas.clientWidth || 800;
        const height = rect.height || this.canvas.clientHeight || 600;

        // Update camera aspect ratio for perspective camera
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    dispose() {
        this.stop();
        
        if (this.renderer) {
            this.renderer.dispose();
        }

        // Clean up scene
        if (this.scene) {
            this.scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
    }
}

