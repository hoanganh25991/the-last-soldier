import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';

export class Engine {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = null;
        this.container = null;
        this.stats = null;
    }

    async init() {
        this.container = document.getElementById('game-container');
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
        this.scene.fog = new THREE.Fog(0x87ceeb, 50, 200); // Keep original fog distance

        // Create camera (keep original zoom/view distance)
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 1.6, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50); // Keep original position
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500; // Keep original shadow distance
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);

        // Clock for delta time
        this.clock = new THREE.Clock();

        // Initialize Stats for FPS monitoring
        this.stats = new Stats();
        this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb
        // Add stats to DOM
        this.stats.dom.style.position = 'fixed';
        this.stats.dom.style.top = '0';
        this.stats.dom.style.left = '0';
        this.stats.dom.style.zIndex = '10000';
        document.body.appendChild(this.stats.dom);
        
        // Set initial visibility based on settings (default: hidden)
        this.setFPSVisibility(false);

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Hide loading screen
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
            }
        }, 500);
    }

    update() {
        // Update stats
        if (this.stats) {
            this.stats.begin();
        }
        return this.clock.getDelta();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
        // End stats update
        if (this.stats) {
            this.stats.end();
        }
    }

    getFPS() {
        if (this.stats) {
            return this.stats.dom.querySelector('.fps')?.textContent || '60';
        }
        return '60';
    }

    setFPSVisibility(visible) {
        if (this.stats && this.stats.dom) {
            this.stats.dom.style.display = visible ? 'block' : 'none';
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

