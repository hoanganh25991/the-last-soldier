import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { RENDER_CONFIG, graphicsSliderToLevel, getEffectivePixelRatio } from '../config/renderConfig.js';

export class Engine {
    constructor(settings = null) {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = null;
        this.container = null;
        this.stats = null;
        this.settings = settings || {};
        this.qualityLevel = graphicsSliderToLevel(this.settings.graphics ?? 50);
        this.directionalLight = null;
        this.renderInfoEl = null;
    }

    async init() {
        this.container = document.getElementById('game-container');
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
        this.scene.fog = new THREE.Fog(0x87ceeb, 50, 200);

        // Create camera (keep original zoom/view distance)
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 1.6, 0);

        const renderConfig = RENDER_CONFIG[this.qualityLevel] || RENDER_CONFIG.medium;
        this.renderer = new THREE.WebGLRenderer(renderConfig.init);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(getEffectivePixelRatio(this.qualityLevel, this.settings.resolution ?? 100));
        this.renderer.shadowMap.enabled = this.settings.realTimeShadows !== false && renderConfig.settings.shadowMapEnabled;
        this.renderer.shadowMap.type = renderConfig.settings.shadowMapType;
        this.renderer.outputColorSpace = renderConfig.settings.outputColorSpace;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        const shadowSize = renderConfig.settings.shadowMapSize;
        directionalLight.shadow.mapSize.width = shadowSize;
        directionalLight.shadow.mapSize.height = shadowSize;
        directionalLight.castShadow = this.renderer.shadowMap.enabled;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500; // Keep original shadow distance
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.directionalLight = directionalLight;
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
        this._initRenderInfo();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    _initRenderInfo() {
        this.renderInfoEl = document.getElementById('render-info');
        if (!this.renderInfoEl) {
            this.renderInfoEl = document.createElement('div');
            this.renderInfoEl.id = 'render-info';
            document.body.appendChild(this.renderInfoEl);
        }
    }

    getDirectionalLight() {
        return this.directionalLight;
    }

    getRenderConfig() {
        return RENDER_CONFIG[this.qualityLevel] || RENDER_CONFIG.medium;
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
        this._updateRenderInfo();
        if (this.stats) {
            this.stats.end();
        }
    }

    _updateRenderInfo() {
        if (!this.renderInfoEl) return;

        const show = this.settings.showFPS === true;
        this.renderInfoEl.classList.toggle('visible', show);
        if (!show || !this.renderer?.info) return;

        const render = this.renderer.info.render;
        const memory = this.renderer.info.memory;
        this.renderInfoEl.textContent =
            `DC:${render.calls}  Tri:${render.triangles}\nGeo:${memory.geometries}  Tex:${memory.textures}`;
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
        if (this.renderInfoEl) {
            this.renderInfoEl.classList.toggle('visible', visible && this.settings.showFPS === true);
        }
    }

    applySettings(settings) {
        this.settings = { ...this.settings, ...settings };
        this.qualityLevel = graphicsSliderToLevel(this.settings.graphics ?? 50);
        const renderConfig = this.getRenderConfig();
        const useBaked = this.settings.bakeShadows === true;
        const shadowsEnabled = !useBaked
            && this.settings.realTimeShadows !== false
            && renderConfig.settings.shadowMapEnabled;

        this.renderer.setPixelRatio(getEffectivePixelRatio(this.qualityLevel, this.settings.resolution ?? 100));
        this.renderer.shadowMap.enabled = shadowsEnabled;
        this.renderer.shadowMap.type = renderConfig.settings.shadowMapType;

        if (this.directionalLight) {
            this.directionalLight.castShadow = shadowsEnabled;
        }

        this.setFPSVisibility(this.settings.showFPS === true);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(getEffectivePixelRatio(this.qualityLevel, this.settings.resolution ?? 100));
    }
    
    dispose() {
        // Remove resize listener
        window.removeEventListener('resize', () => this.onWindowResize());
        
        // Remove stats from DOM
        if (this.stats && this.stats.dom && this.stats.dom.parentNode) {
            this.stats.dom.parentNode.removeChild(this.stats.dom);
        }
        
        // Dispose scene and all objects
        if (this.scene) {
            this.scene.traverse((object) => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            this.scene.clear();
        }
        
        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }
        
        // Clear references
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = null;
        this.container = null;
        this.stats = null;
    }
}

