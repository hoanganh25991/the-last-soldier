import * as THREE from 'three';
import { RENDER_CONFIG, graphicsSliderToLevel, getEffectivePixelRatio } from '../config/renderConfig.js';
import { getPerformanceProfile } from '../config/performanceProfile.js';

const _cameraPos = new THREE.Vector3();
const _objectPos = new THREE.Vector3();

export class PerformanceManager {
    constructor(engine, settings = {}) {
        this.engine = engine;
        this.settings = settings;
        this.qualityLevel = graphicsSliderToLevel(settings.graphics ?? 50);
        this.profile = getPerformanceProfile(this.qualityLevel);
        this.worldObjects = [];
        this.enemyMeshes = [];
        this.frameCount = 0;
        this.directionalLight = null;
        this.webglContextLost = false;
        this._boundContextLost = this.onContextLost.bind(this);
        this._boundContextRestored = this.onContextRestored.bind(this);
    }

    init() {
        this.findDirectionalLight();
        this.applyRendererSettings();
        this.applyFog();
        this.optimizeScene();
        this.bindContextHandlers();
    }

    findDirectionalLight() {
        if (!this.engine?.scene) return;
        this.engine.scene.traverse((obj) => {
            if (obj.isDirectionalLight && !this.directionalLight) {
                this.directionalLight = obj;
            }
        });
    }

    bindContextHandlers() {
        const canvas = this.engine?.renderer?.domElement;
        if (!canvas) return;
        canvas.addEventListener('webglcontextlost', this._boundContextLost);
        canvas.addEventListener('webglcontextrestored', this._boundContextRestored);
    }

    onContextLost(event) {
        event.preventDefault();
        this.webglContextLost = true;
    }

    onContextRestored() {
        this.webglContextLost = false;
        this.applyRendererSettings();
    }

    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        const nextLevel = graphicsSliderToLevel(this.settings.graphics ?? 50);
        if (nextLevel !== this.qualityLevel) {
            this.qualityLevel = nextLevel;
            this.profile = getPerformanceProfile(this.qualityLevel);
            this.optimizeScene();
        }
        this.applyRendererSettings();
        this.applyFog();
    }

    applyRendererSettings() {
        const renderer = this.engine?.renderer;
        if (!renderer) return;

        const config = RENDER_CONFIG[this.qualityLevel] || RENDER_CONFIG.medium;
        const shadowsEnabled = this.settings.realTimeShadows !== false && config.settings.shadowMapEnabled;

        renderer.setPixelRatio(getEffectivePixelRatio(this.qualityLevel, this.settings.resolution ?? 100));
        renderer.shadowMap.enabled = shadowsEnabled;
        renderer.shadowMap.type = config.settings.shadowMapType;
        renderer.outputColorSpace = config.settings.outputColorSpace;

        if (this.directionalLight) {
            this.directionalLight.castShadow = shadowsEnabled;
            if (shadowsEnabled) {
                const size = config.settings.shadowMapSize;
                this.directionalLight.shadow.mapSize.set(size, size);
            }
        }
    }

    applyFog() {
        const scene = this.engine?.scene;
        if (!scene?.fog) return;
        const { fogNear, fogFar } = this.profile.worldVisibility;
        scene.fog.near = fogNear;
        scene.fog.far = fogFar;
    }

    registerWorldObjects(objects) {
        this.worldObjects = objects || [];
        this.optimizeScene();
    }

    registerEnemyMeshes(meshes) {
        this.enemyMeshes = meshes || [];
    }

    optimizeScene() {
        const scene = this.engine?.scene;
        if (!scene) return;

        const castShadows = this.profile.castShadows && this.settings.realTimeShadows !== false;
        const receiveShadows = this.profile.receiveShadows && this.settings.realTimeShadows !== false;

        scene.traverse((object) => {
            if (object.isMesh || object.isGroup) {
                object.frustumCulled = true;
            }

            if (object.isMesh) {
                object.castShadow = castShadows && object.castShadow;
                object.receiveShadow = receiveShadows && object.receiveShadow;

                const materials = Array.isArray(object.material) ? object.material : [object.material];
                for (const material of materials) {
                    if (!material) continue;
                    if (this.qualityLevel === 'minimal' || this.qualityLevel === 'low') {
                        material.precision = 'lowp';
                        if (material.fog === undefined) {
                            material.fog = true;
                        }
                    }
                    if (material.map) {
                        material.map.anisotropy = 1;
                    }
                }
            }
        });
    }

    update(camera, enemyMeshes = [], playerWorldPosition = null) {
        this.frameCount++;
        if (this.webglContextLost || !camera) return;

        if (enemyMeshes.length > 0) {
            this.enemyMeshes = enemyMeshes;
        }

        let refPos = playerWorldPosition;
        if (!refPos) {
            camera.getWorldPosition(_cameraPos);
            refPos = _cameraPos;
        }
        this.updateWorldVisibility(refPos);
        this.updateEnemyLod(refPos);
    }

    _getObjectWorldCoords(object, out) {
        if (object.userData?.isColliderProxy || object.parent?.name === 'world') {
            out.copy(object.position);
            return out;
        }
        object.getWorldPosition(out);
        return out;
    }

    updateWorldVisibility(referencePosition) {
        const { showDistance, hideDistance } = this.profile.worldVisibility;
        const showDistSq = showDistance * showDistance;
        const hideDistSq = hideDistance * hideDistance;

        for (const object of this.worldObjects) {
            if (!object) continue;
            this._getObjectWorldCoords(object, _objectPos);
            const dx = _objectPos.x - referencePosition.x;
            const dz = _objectPos.z - referencePosition.z;
            const distSq = dx * dx + dz * dz;

            if (distSq <= showDistSq) {
                object.visible = true;
            } else if (distSq >= hideDistSq) {
                object.visible = false;
            }
        }
    }

    updateEnemyLod(referencePosition) {
        const { highDetail, hide } = this.profile.enemyLod;
        const highSq = highDetail * highDetail;
        const hideSq = hide * hide;

        for (const mesh of this.enemyMeshes) {
            if (!mesh) continue;
            this._getObjectWorldCoords(mesh, _objectPos);
            const dx = _objectPos.x - referencePosition.x;
            const dz = _objectPos.z - referencePosition.z;
            const distSq = dx * dx + dz * dz;

            if (distSq >= hideSq) {
                mesh.visible = false;
                continue;
            }

            mesh.visible = true;
            const useLowDetail = distSq > highSq;
            mesh.traverse((child) => {
                if (!child.isMesh) return;
                child.visible = !useLowDetail || child.userData.isCoreBody === true;
            });
        }
    }

    shouldCheckLineOfSight(entityId = 0) {
        const interval = this.profile.collision.lineOfSightInterval;
        return (this.frameCount + entityId) % interval === 0;
    }

    dispose() {
        const canvas = this.engine?.renderer?.domElement;
        if (canvas) {
            canvas.removeEventListener('webglcontextlost', this._boundContextLost);
            canvas.removeEventListener('webglcontextrestored', this._boundContextRestored);
        }
        this.worldObjects = [];
        this.enemyMeshes = [];
    }
}
