import * as THREE from 'three';

export class PlayModeBackground {
    constructor(container, mode) {
        this.container = container;
        this.mode = mode; // 'map-editor', 'join-match', 'online-match', 'create-match'
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.soldiers = [];
        this.clock = null;
        this.animationId = null;
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a); // Dark background
        this.scene.fog = new THREE.Fog(0x0a0a0a, 5, 20);

        // Create camera
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
        this.setupCameraForMode();

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        this.setupLighting();

        // Create ground/water
        this.createGround();

        // Create scene based on mode
        this.createSceneForMode();

        // Clock for animation
        this.clock = new THREE.Clock();

        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupCameraForMode() {
        switch(this.mode) {
            case 'map-editor':
                this.camera.position.set(0, 1.2, 3);
                this.camera.lookAt(0, 0.8, 0);
                break;
            case 'join-match':
                this.camera.position.set(0, 1.5, 4);
                this.camera.lookAt(0, 1, 0);
                break;
            case 'online-match':
                this.camera.position.set(0, 1.8, 4.5);
                this.camera.lookAt(0, 1, 0);
                break;
            case 'create-match':
                this.camera.position.set(0, 1.3, 3.5);
                this.camera.lookAt(0, 1, 0);
                break;
        }
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);

        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(3, 8, 3);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 512;
        directionalLight.shadow.mapSize.height = 512;
        this.scene.add(directionalLight);

        // Point light for glowing effects (used in map-editor)
        if (this.mode === 'map-editor') {
            const pointLight = new THREE.PointLight(0xff6600, 1.5, 5);
            pointLight.position.set(0, 1.0, 0);
            this.scene.add(pointLight);
        }
    }

    createGround() {
        // Create water-like ground
        const groundGeometry = new THREE.PlaneGeometry(15, 15);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x1a1a2a,
            transparent: true,
            opacity: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    createSoldier(x = 0, y = 0, z = 0, rotationY = 0, hasRifle = true, hasShovel = false) {
        const soldierGroup = new THREE.Group();

        // Body (torso)
        const bodyGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.3);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1.0;
        body.castShadow = true;
        soldierGroup.add(body);

        // Head
        const headGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.5;
        head.castShadow = true;
        soldierGroup.add(head);

        // Helmet
        const helmetGeometry = new THREE.BoxGeometry(0.35, 0.2, 0.35);
        const helmetMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
        helmet.position.y = 1.6;
        helmet.castShadow = true;
        soldierGroup.add(helmet);

        // Left arm
        const leftArmGeometry = new THREE.BoxGeometry(0.15, 0.5, 0.15);
        const armMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const leftArm = new THREE.Mesh(leftArmGeometry, armMaterial);
        leftArm.position.set(-0.3, 1.0, 0);
        leftArm.castShadow = true;
        soldierGroup.add(leftArm);

        // Right arm
        const rightArm = new THREE.Mesh(leftArmGeometry, armMaterial);
        rightArm.position.set(0.3, 1.0, 0);
        rightArm.castShadow = true;
        soldierGroup.add(rightArm);

        // Left leg
        const leftLegGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const leftLeg = new THREE.Mesh(leftLegGeometry, legMaterial);
        leftLeg.position.set(-0.15, 0.3, 0);
        leftLeg.castShadow = true;
        soldierGroup.add(leftLeg);

        // Right leg
        const rightLeg = new THREE.Mesh(leftLegGeometry, legMaterial);
        rightLeg.position.set(0.15, 0.3, 0);
        rightLeg.castShadow = true;
        soldierGroup.add(rightLeg);

        // Weapon
        if (hasRifle) {
            const rifleGroup = new THREE.Group();
            const rifleBodyGeometry = new THREE.BoxGeometry(0.8, 0.08, 0.08);
            const rifleMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
            const rifleBody = new THREE.Mesh(rifleBodyGeometry, rifleMaterial);
            rifleBody.position.set(0.4, 0, 0);
            rifleGroup.add(rifleBody);

            const rifleStockGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.1);
            const rifleStock = new THREE.Mesh(rifleStockGeometry, rifleMaterial);
            rifleStock.position.set(-0.2, 0, 0);
            rifleGroup.add(rifleStock);

            rifleGroup.position.set(0.25, 0.9, -0.15);
            rifleGroup.rotation.z = -0.1;
            rifleGroup.castShadow = true;
            soldierGroup.add(rifleGroup);
        }

        if (hasShovel) {
            const shovelGroup = new THREE.Group();
            // Shovel handle
            const handleGeometry = new THREE.BoxGeometry(0.05, 0.8, 0.05);
            const handleMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
            const handle = new THREE.Mesh(handleGeometry, handleMaterial);
            handle.position.set(0, 0.4, 0);
            shovelGroup.add(handle);

            // Shovel blade
            const bladeGeometry = new THREE.BoxGeometry(0.15, 0.2, 0.02);
            const bladeMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
            const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
            blade.position.set(0, 0.9, 0);
            blade.rotation.x = Math.PI / 6;
            shovelGroup.add(blade);

            shovelGroup.position.set(0.2, 0.5, 0);
            shovelGroup.rotation.z = -0.3;
            shovelGroup.castShadow = true;
            soldierGroup.add(shovelGroup);
        }

        // Position and rotation
        soldierGroup.position.set(x, y, z);
        soldierGroup.rotation.y = rotationY;

        this.scene.add(soldierGroup);

        // Store references for animation
        const soldierData = {
            group: soldierGroup,
            leftArm,
            rightArm,
            leftLeg,
            rightLeg,
            body
        };

        this.soldiers.push(soldierData);
        return soldierData;
    }

    createSceneForMode() {
        switch(this.mode) {
            case 'map-editor':
                this.createMapEditorScene();
                break;
            case 'join-match':
                this.createJoinMatchScene();
                break;
            case 'online-match':
                this.createOnlineMatchScene();
                break;
            case 'create-match':
                this.createCreateMatchScene();
                break;
        }
    }

    createMapEditorScene() {
        // Single soldier with shovel, glowing light from chest
        const soldier = this.createSoldier(0, 0, 0, Math.PI / 6, false, true);
        
        // Add glowing light effect to chest
        const glowGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff6600,
            transparent: true,
            opacity: 0.8
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(0, 1.0, 0.1);
        this.scene.add(glow);
        this.glowMesh = glow;

        // Position soldier slightly forward
        soldier.group.position.z = -0.5;
    }

    createJoinMatchScene() {
        // Two soldiers facing each other
        this.createSoldier(-0.8, 0, 0, Math.PI / 2, true, false);
        this.createSoldier(0.8, 0, 0, -Math.PI / 2, true, false);
    }

    createOnlineMatchScene() {
        // Three soldiers grouped together
        this.createSoldier(-0.6, 0, -0.3, Math.PI / 4, true, false);
        this.createSoldier(0, 0, 0, 0, true, false);
        this.createSoldier(0.6, 0, -0.3, -Math.PI / 4, true, false);
    }

    createCreateMatchScene() {
        // Single soldier running/moving dynamically
        const soldier = this.createSoldier(0, 0, 0, -Math.PI / 4, true, false);
        // Animation will handle the running pose
        this.runningSoldier = soldier;
    }

    animate() {
        if (!this.clock) return;

        const elapsedTime = this.clock.getElapsedTime();

        // Mode-specific animations
        switch(this.mode) {
            case 'map-editor':
                // Pulsing glow effect
                if (this.glowMesh) {
                    const pulse = Math.sin(elapsedTime * 2) * 0.05 + 0.15;
                    this.glowMesh.scale.set(pulse / 0.15, pulse / 0.15, pulse / 0.15);
                    this.glowMesh.material.opacity = 0.6 + Math.sin(elapsedTime * 2) * 0.2;
                }
                // Slight digging motion
                if (this.soldiers[0]) {
                    const soldier = this.soldiers[0];
                    soldier.rightArm.rotation.x = Math.sin(elapsedTime * 1.5) * 0.3 - 0.5;
                }
                break;

            case 'join-match':
                // Subtle idle animations
                this.soldiers.forEach((soldier, index) => {
                    const offset = index * Math.PI;
                    soldier.group.position.y = Math.sin(elapsedTime * 2 + offset) * 0.05;
                });
                break;

            case 'online-match':
                // Group movement animation
                this.soldiers.forEach((soldier, index) => {
                    const offset = index * (Math.PI * 2 / 3);
                    soldier.group.position.y = Math.sin(elapsedTime * 1.5 + offset) * 0.03;
                    soldier.group.rotation.y += 0.001;
                });
                break;

            case 'create-match':
                // Running animation
                if (this.runningSoldier) {
                    const runSpeed = 8;
                    const soldier = this.runningSoldier;
                    
                    // Legs running motion
                    soldier.leftLeg.rotation.x = Math.sin(elapsedTime * runSpeed) * 0.5;
                    soldier.rightLeg.rotation.x = -Math.sin(elapsedTime * runSpeed) * 0.5;

                    // Arms running motion
                    soldier.leftArm.rotation.x = -Math.sin(elapsedTime * runSpeed) * 0.3;
                    soldier.rightArm.rotation.x = Math.sin(elapsedTime * runSpeed) * 0.3;

                    // Body bob
                    soldier.group.position.y = Math.abs(Math.sin(elapsedTime * runSpeed)) * 0.1;
                    
                    // Forward movement
                    soldier.group.position.z = Math.sin(elapsedTime * runSpeed * 0.5) * 0.2;
                }
                break;
        }

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
        if (!this.container || !this.camera || !this.renderer) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    dispose() {
        this.stop();
        
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
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

        this.soldiers = [];
        this.glowMesh = null;
        this.runningSoldier = null;
    }
}
