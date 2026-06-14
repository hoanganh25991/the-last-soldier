export class PostProcessingManager {
    constructor(engine, player = null) {
        this.engine = engine;
        this.player = player;
        this.settings = {};
        this._lastYaw = 0;
        this._lastPitch = 0;
        this._motionBlur = 0;

        const container = document.getElementById('game-container');
        this.canvas = engine?.renderer?.domElement || null;

        this.grainOverlay = document.createElement('div');
        this.grainOverlay.id = 'post-film-grain';
        this.grainOverlay.className = 'post-film-grain hidden';
        this.grainOverlay.setAttribute('aria-hidden', 'true');
        if (container) {
            container.appendChild(this.grainOverlay);
        }
    }

    setPlayer(player) {
        this.player = player;
    }

    applySettings(settings = {}) {
        this.settings = { ...this.settings, ...settings };
        this._applyFilmGrain();
        this._applyCanvasFilters();
        this._applyBakeShadows();
    }

    _applyFilmGrain() {
        if (!this.grainOverlay) return;
        const enabled = this.settings.filmGrain !== false;
        this.grainOverlay.classList.toggle('hidden', !enabled);
    }

    _applyCanvasFilters() {
        if (!this.canvas) return;

        const parts = [];
        if (this.settings.bloom) {
            parts.push('brightness(1.08)', 'saturate(1.12)', 'contrast(1.04)');
        }

        if (this.settings.motionBlur && this._motionBlur > 0.01) {
            const blurPx = Math.min(2.5, this._motionBlur * 2.5).toFixed(2);
            parts.push(`blur(${blurPx}px)`);
        }

        this.canvas.style.filter = parts.length > 0 ? parts.join(' ') : 'none';
    }

    _applyBakeShadows() {
        const engine = this.engine;
        if (!engine?.renderer) return;

        const renderConfig = engine.getRenderConfig?.() || {};
        const shadowsEnabled = this.settings.realTimeShadows !== false
            && renderConfig.shadowMapEnabled !== false
            && !this.settings.bakeShadows;

        engine.renderer.shadowMap.enabled = shadowsEnabled;
        const light = engine.getDirectionalLight?.();
        if (light) {
            light.castShadow = shadowsEnabled;
        }

        if (this.settings.bakeShadows && engine.scene) {
            if (engine.scene.fog) {
                engine._bakedFogFar = engine._bakedFogFar ?? engine.scene.fog.far;
                engine.scene.fog.far = engine._bakedFogFar * 0.92;
            }
        } else if (engine.scene?.fog && engine._bakedFogFar) {
            engine.scene.fog.far = engine._bakedFogFar;
        }
    }

    update() {
        if (!this.player?.getYawObject) {
            this._motionBlur *= 0.85;
            this._applyCanvasFilters();
            return;
        }

        const rotation = this.player.getYawObject().rotation;
        const yawDelta = Math.abs(rotation.y - this._lastYaw);
        const pitchDelta = Math.abs(rotation.x - this._lastPitch);
        this._lastYaw = rotation.y;
        this._lastPitch = rotation.x;

        const spin = yawDelta + pitchDelta;
        if (spin > 0.001) {
            this._motionBlur = Math.min(1, spin * 12);
        } else {
            this._motionBlur *= 0.82;
        }

        if (this.settings.motionBlur || this.settings.bloom) {
            this._applyCanvasFilters();
        }
    }

    dispose() {
        if (this.grainOverlay?.parentNode) {
            this.grainOverlay.parentNode.removeChild(this.grainOverlay);
        }
        if (this.canvas) {
            this.canvas.style.filter = 'none';
        }
        this.grainOverlay = null;
        this.canvas = null;
    }
}
