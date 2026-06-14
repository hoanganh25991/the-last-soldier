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
        this.fpsEl = null;
        this._lastDelta = 0;
        this._fpsSmooth = 60;
    }

    async init() {
        this.container = document.getElementById('game-container');
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
        this.scene.fog = new THREE.Fog(0x87ceeb, 50, 240);

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

        // Stats (measurement only — hidden UI; FPS shown in #fps-counter)
        this.stats = new Stats();
        this.stats.showPanel(0);
        this.stats.dom.style.display = 'none';
        document.body.appendChild(this.stats.dom);

        this._initFpsCounter();
        this._initRenderInfo();
        this.setFPSVisibility(this.settings.showFPS !== false);

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    _initFpsCounter() {
        this.fpsEl = document.getElementById('btn-fps');
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
        if (this.stats) {
            this.stats.begin();
        }
        this._lastDelta = this.clock.getDelta();
        return this._lastDelta;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
        this._updateFpsCounter();
        this._updateRenderInfo();
        if (this.stats) {
            this.stats.end();
        }
    }

    _updateFpsCounter() {
        if (!this.fpsEl) return;

        const show = this.settings.showFPS !== false;
        this.fpsEl.classList.toggle('hidden', !show);
        if (!show || this._lastDelta <= 0) return;

        const instant = 1 / this._lastDelta;
        this._fpsSmooth += (instant - this._fpsSmooth) * 0.12;
        const fps = Math.round(this._fpsSmooth);

        this.fpsEl.textContent = `${fps}`;
        this.fpsEl.title = `${fps} FPS`;
        this.fpsEl.setAttribute('aria-label', `${fps} frames per second`);
        this.fpsEl.classList.remove('fps-good', 'fps-ok', 'fps-low');
        if (fps >= 55) {
            this.fpsEl.classList.add('fps-good');
        } else if (fps >= 40) {
            this.fpsEl.classList.add('fps-ok');
        } else {
            this.fpsEl.classList.add('fps-low');
        }
    }

    _updateRenderInfo() {
        if (!this.renderInfoEl) return;
        this.renderInfoEl.classList.remove('visible');
    }

    getFPS() {
        return String(Math.round(this._fpsSmooth));
    }

    setFPSVisibility(visible) {
        const show = visible !== false;
        if (this.fpsEl) {
            this.fpsEl.classList.toggle('hidden', !show);
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

        this.setFPSVisibility(this.settings.showFPS !== false);
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
        
        if (this.fpsEl) {
            this.fpsEl.textContent = '--';
            this.fpsEl.classList.remove('fps-good', 'fps-ok', 'fps-low');
        }

        // Clear references
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = null;
        this.container = null;
        this.stats = null;
        this.fpsEl = null;
        this.renderInfoEl = null;
    }
}

