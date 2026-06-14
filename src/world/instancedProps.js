import * as THREE from 'three';

const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _cameraPos = new THREE.Vector3();
const _instancePos = new THREE.Vector3();
const _zeroScale = new THREE.Vector3(0, 0, 0);
const _normalScale = new THREE.Vector3(1, 1, 1);

function createColliderProxy(x, y, z, bounds) {
    const proxy = new THREE.Object3D();
    proxy.position.set(x, y, z);
    proxy.userData.isColliderProxy = true;
    proxy.userData.collisionBounds = {
        minX: x + bounds.minX,
        minY: y + bounds.minY,
        minZ: z + bounds.minZ,
        maxX: x + bounds.maxX,
        maxY: y + bounds.maxY,
        maxZ: z + bounds.maxZ,
        centerX: x + bounds.centerX,
        centerY: y + bounds.centerY,
        centerZ: z + bounds.centerZ,
        sizeX: bounds.sizeX,
        sizeY: bounds.sizeY,
        sizeZ: bounds.sizeZ
    };
    return proxy;
}

export class InstancedPropGroup {
    constructor(scene, geometry, material, maxCount, castShadow = false) {
        this.scene = scene;
        this.mesh = new THREE.InstancedMesh(geometry, material, maxCount);
        this.mesh.castShadow = castShadow;
        this.mesh.receiveShadow = castShadow;
        this.mesh.frustumCulled = true;
        this.count = 0;
        this.instances = [];
        this.colliderProxies = [];
        this.visibilityState = [];
    }

    addInstance(x, y, z, rotY = 0, localBounds = null, scale = 1) {
        if (this.count >= this.mesh.count) return;

        _euler.set(0, rotY, 0);
        _quaternion.setFromEuler(_euler);
        _position.set(x, y, z);
        _scale.set(scale, scale, scale);
        _matrix.compose(_position, _quaternion, _scale);
        this.mesh.setMatrixAt(this.count, _matrix);

        const index = this.count;
        this.instances.push({ x, y, z, rotY, scale });
        this.visibilityState.push(true);

        if (localBounds) {
            this.colliderProxies.push(createColliderProxy(x, y, z, localBounds));
        }

        this.count++;
    }

    finalize() {
        this.mesh.count = this.count;
        this.mesh.instanceMatrix.needsUpdate = true;
        this.scene.add(this.mesh);
    }

    updateVisibility(referencePosition, showDistance, hideDistance) {
        if (!referencePosition || this.count === 0) return;

        const showDistSq = showDistance * showDistance;
        const hideDistSq = hideDistance * hideDistance;
        let changed = false;

        for (let i = 0; i < this.count; i++) {
            const inst = this.instances[i];
            const dx = inst.x - referencePosition.x;
            const dz = inst.z - referencePosition.z;
            const distSq = dx * dx + dz * dz;

            let visible = this.visibilityState[i];
            if (distSq <= showDistSq) {
                visible = true;
            } else if (distSq >= hideDistSq) {
                visible = false;
            }

            if (visible !== this.visibilityState[i]) {
                this.visibilityState[i] = visible;
                _euler.set(0, inst.rotY, 0);
                _quaternion.setFromEuler(_euler);
                _position.set(inst.x, inst.y, inst.z);
                _matrix.compose(_position, _quaternion, visible ? _normalScale : _zeroScale);
                this.mesh.setMatrixAt(i, _matrix);
                changed = true;

                const proxy = this.colliderProxies[i];
                if (proxy) {
                    proxy.visible = visible;
                }
            }
        }

        if (changed) {
            this.mesh.instanceMatrix.needsUpdate = true;
        }
    }

    dispose() {
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        if (this.mesh.geometry) this.mesh.geometry.dispose();
        if (this.mesh.material) this.mesh.material.dispose();
        this.instances = [];
        this.colliderProxies = [];
        this.visibilityState = [];
    }
}

export const PROP_BOUNDS = {
    treeTrunk: { minX: -0.5, minY: 0, minZ: -0.5, maxX: 0.5, maxY: 3, maxZ: 0.5, centerX: 0, centerY: 1.5, centerZ: 0, sizeX: 1, sizeY: 3, sizeZ: 1 },
    treeFoliage: { minX: -2, minY: 1, minZ: -2, maxX: 2, maxY: 9, maxZ: 2, centerX: 0, centerY: 5, centerZ: 0, sizeX: 4, sizeY: 8, sizeZ: 4 },
    box: { minX: -1, minY: 0, minZ: -1, maxX: 1, maxY: 2, maxZ: 1, centerX: 0, centerY: 1, centerZ: 0, sizeX: 2, sizeY: 2, sizeZ: 2 },
    stone: { minX: -1, minY: -0.5, minZ: -1, maxX: 1, maxY: 1.5, maxZ: 1, centerX: 0, centerY: 0.5, centerZ: 0, sizeX: 2, sizeY: 2, sizeZ: 2 },
    barrel: { minX: -0.5, minY: 0, minZ: -0.5, maxX: 0.5, maxY: 1.2, maxZ: 0.5, centerX: 0, centerY: 0.6, centerZ: 0, sizeX: 1, sizeY: 1.2, sizeZ: 1 },
    crate: { minX: -0.7, minY: 0, minZ: -0.7, maxX: 0.7, maxY: 1.4, maxZ: 0.7, centerX: 0, centerY: 0.7, centerZ: 0, sizeX: 1.4, sizeY: 1.4, sizeZ: 1.4 },
    container: { minX: -1.5, minY: 0, minZ: -2.5, maxX: 1.5, maxY: 3, maxZ: 2.5, centerX: 0, centerY: 1.5, centerZ: 0, sizeX: 3, sizeY: 3, sizeZ: 5 },
    wall: { minX: -2, minY: 0, minZ: -0.1, maxX: 2, maxY: 3, maxZ: 0.1, centerX: 0, centerY: 1.5, centerZ: 0, sizeX: 4, sizeY: 3, sizeZ: 0.2 },
    fence: { minX: -4, minY: 0, minZ: -0.1, maxX: 4, maxY: 1.5, maxZ: 0.1, centerX: 0, centerY: 0.75, centerZ: 0, sizeX: 8, sizeY: 1.5, sizeZ: 0.2 }
};
