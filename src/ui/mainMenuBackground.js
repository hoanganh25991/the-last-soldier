import * as THREE from 'three';

export class MainMenuBackground {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.soldier = null;
        this.clock = null;
        this.animationId = null;
        this.particles = null;
    }

    init() {
        if (!this.container) return;

        // Ensure container has size
        if (this.container.clientWidth === 0 || this.container.clientHeight === 0) {
            this.container.style.width = '100%';
            this.container.style.height = '100%';
        }

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = null; // Transparent to show image background
        this.scene.fog = new THREE.Fog(0x1a1a1a, 15, 40);

        // Create camera
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        // Position camera to view soldier from side-left (like in the image)
        this.camera.position.set(-2, 1.5, 3);
        this.camera.lookAt(-1, 1, 0);

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

        // Lighting - darker, moodier lighting for main menu
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);

        // Main directional light from front-right
        const directionalLight = new THREE.DirectionalLight(0xffaa66, 0.5);
        directionalLight.position.set(3, 5, 4);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        this.scene.add(directionalLight);

        // Rim light for dramatic effect
        const rimLight = new THREE.DirectionalLight(0x6688ff, 0.2);
        rimLight.position.set(-5, 3, -3);
        this.scene.add(rimLight);

        // Create ground - darker, more desolate with texture variation
        const groundGeometry = new THREE.PlaneGeometry(20, 20, 10, 10);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x1a1a1a,
            transparent: true,
            opacity: 0.6
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        
        // Add some height variation to ground
        const vertices = groundGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            vertices[i + 1] = Math.random() * 0.1 - 0.05; // Small random height
        }
        groundGeometry.attributes.position.needsUpdate = true;
        groundGeometry.computeVertexNormals();
        
        this.scene.add(ground);

        // Add fog/smoke particles for atmosphere
        this.createAtmosphere();

        // Create soldier
        this.createSoldier();

        // Clock for animation
        this.clock = new THREE.Clock();

        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createSoldier() {
        const soldierGroup = new THREE.Group();

        // Body (torso)
        const bodyGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.3);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 }); // Brown uniform
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1.0;
        body.castShadow = true;
        soldierGroup.add(body);

        // Head
        const headGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac }); // Skin color
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.5;
        head.castShadow = true;
        soldierGroup.add(head);

        // Helmet
        const helmetGeometry = new THREE.BoxGeometry(0.35, 0.2, 0.35);
        const helmetMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 }); // Brown helmet
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

        // Rifle (weapon)
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

        // Store references for animation
        this.soldier = soldierGroup;
        this.leftArm = leftArm;
        this.rightArm = rightArm;
        this.leftLeg = leftLeg;
        this.rightLeg = rightLeg;
        this.rifleGroup = rifleGroup;

        // Initial position - left side of screen, facing right
        soldierGroup.position.set(-3, 0, 0);
        soldierGroup.rotation.y = Math.PI / 6; // Facing slightly right

        this.scene.add(soldierGroup);
    }

    createAtmosphere() {
        // Create fog/smoke particles for atmospheric effect
        const particleCount = 50;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random positions around the scene
            positions[i3] = (Math.random() - 0.5) * 20;
            positions[i3 + 1] = Math.random() * 5 + 0.5;
            positions[i3 + 2] = (Math.random() - 0.5) * 20;
            
            // Grayish colors for smoke/fog
            const gray = 0.3 + Math.random() * 0.2;
            colors[i3] = gray;
            colors[i3 + 1] = gray;
            colors[i3 + 2] = gray;
            
            sizes[i] = Math.random() * 2 + 1;
        }

        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const particleMaterial = new THREE.PointsMaterial({
            size: 0.5,
            transparent: true,
            opacity: 0.3,
            vertexColors: true,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(particles, particleMaterial);
        this.scene.add(this.particles);
    }

    animate() {
        if (!this.clock) return;

        const elapsedTime = this.clock.getElapsedTime();
        const runSpeed = 8; // Animation speed

        // Running animation - legs and arms swing
        if (this.leftLeg && this.rightLeg && this.leftArm && this.rightArm) {
            // Legs running motion
            this.leftLeg.rotation.x = Math.sin(elapsedTime * runSpeed) * 0.5;
            this.rightLeg.rotation.x = -Math.sin(elapsedTime * runSpeed) * 0.5;

            // Arms running motion (opposite to legs)
            this.leftArm.rotation.x = -Math.sin(elapsedTime * runSpeed) * 0.3;
            this.rightArm.rotation.x = Math.sin(elapsedTime * runSpeed) * 0.3;

            // Slight body bob
            if (this.soldier) {
                this.soldier.position.y = Math.abs(Math.sin(elapsedTime * runSpeed)) * 0.1;
            }

            // Rifle slight movement
            if (this.rifleGroup) {
                this.rifleGroup.rotation.z = -0.1 + Math.sin(elapsedTime * runSpeed) * 0.05;
            }
        }

        // Animate particles (slow drift)
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            for (let i = 1; i < positions.length; i += 3) {
                positions[i] += Math.sin(elapsedTime * 0.5 + i) * 0.001; // Slow upward drift
                positions[i] = positions[i] % 6; // Wrap around
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
            this.particles.rotation.y += 0.0005; // Slow rotation
        }

        // Render
        this.renderer.render(this.scene, this.camera);
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    start() {
        if (!this.animationId) {
            // Ensure renderer is properly sized when starting (in case container was hidden)
            if (this.container && this.renderer && this.camera) {
                const width = this.container.clientWidth || window.innerWidth;
                const height = this.container.clientHeight || window.innerHeight;
                
                // Only resize if dimensions are valid
                if (width > 0 && height > 0) {
                    this.camera.aspect = width / height;
                    this.camera.updateProjectionMatrix();
                    this.renderer.setSize(width, height);
                }
            }
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
    }
}

