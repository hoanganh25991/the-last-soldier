import * as THREE from 'three';

const _moveVector = new THREE.Vector3();

export class Bullet {
    constructor(scene, coordinateSpace = 'scene') {
        this.scene = scene;
        this.coordinateSpace = coordinateSpace;
        this.startPosition = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.position = new THREE.Vector3();
        this.previousPosition = new THREE.Vector3();
        this.speed = 0;
        this.range = 0;
        this.damage = 0;
        this.showTrail = false;
        this.traveledDistance = 0;
        this.mesh = null;
        this.trail = null;
        this.trailPositions = [];
        this.maxTrailLength = 10;
        this.isActive = false;
        this.spawnTime = 0;
        this.maxLifetime = 1500;
        this._visualsReady = false;
    }

    ensureVisuals() {
        if (this._visualsReady) return;

        const bulletGroup = new THREE.Group();
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            depthTest: true,
            toneMapped: false
        });
        const sphere = new THREE.Mesh(geometry, material);
        bulletGroup.add(sphere);
        this.scene.add(bulletGroup);
        this.mesh = bulletGroup;
        this._visualsReady = true;
    }

    ensureTrail() {
        if (this.trail) return;

        const trailGeometry = new THREE.BufferGeometry();
        const trailMaterial = new THREE.LineBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.9
        });

        this.trailPositions = [0, 0, 0, 0, 0, 0];
        trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(this.trailPositions, 3));
        this.trail = new THREE.Line(trailGeometry, trailMaterial);
        this.scene.add(this.trail);
    }

    reset(startPosition, direction, speed, range, damage, showTrail = false) {
        this.ensureVisuals();
        this.startPosition.copy(startPosition);
        this.direction.copy(direction).normalize();
        this.speed = speed;
        this.range = range;
        this.damage = damage;
        this.showTrail = showTrail;
        this.traveledDistance = 0;
        this.position.copy(startPosition);
        this.previousPosition.copy(startPosition);
        this.spawnTime = Date.now();
        this.isActive = true;

        if (this.mesh) {
            this.mesh.visible = true;
            this.mesh.position.copy(startPosition);
        }

        if (showTrail) {
            this.ensureTrail();
            this.trail.visible = true;
            this.trailPositions = [
                startPosition.x, startPosition.y, startPosition.z,
                startPosition.x, startPosition.y, startPosition.z
            ];
            this.trail.geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.trailPositions, 3));
        } else if (this.trail) {
            this.trail.visible = false;
        }
    }

    update(deltaTime) {
        if (!this.isActive) return;

        this.previousPosition.copy(this.position);

        const moveDistance = this.speed * deltaTime;
        _moveVector.copy(this.direction).multiplyScalar(moveDistance);
        this.position.add(_moveVector);
        this.traveledDistance += moveDistance;

        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.x += deltaTime * 10;
            this.mesh.rotation.y += deltaTime * 10;
        }

        if (this.trail && this.showTrail) {
            this.trailPositions.push(this.position.x, this.position.y, this.position.z);

            if (this.trailPositions.length > this.maxTrailLength * 3) {
                this.trailPositions.shift();
                this.trailPositions.shift();
                this.trailPositions.shift();
            }

            if (this.trailPositions.length >= 6) {
                this.trail.geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.trailPositions, 3));
                this.trail.geometry.setDrawRange(0, this.trailPositions.length / 3);
            }

            const trailLength = this.trailPositions.length / 3;
            if (trailLength > 0) {
                this.trail.material.opacity = Math.min(0.8, trailLength / this.maxTrailLength * 0.8);
            }
        }

        if (this.traveledDistance >= this.range) {
            this.deactivate();
            return;
        }

        if (Date.now() - this.spawnTime >= this.maxLifetime) {
            this.deactivate();
        }
    }

    deactivate() {
        this.isActive = false;
        if (this.mesh) {
            this.mesh.visible = false;
        }
        if (this.trail) {
            this.trail.visible = false;
        }
    }

    destroy() {
        this.deactivate();
    }

    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.mesh = null;
        }
        if (this.trail) {
            this.scene.remove(this.trail);
            if (this.trail.geometry) this.trail.geometry.dispose();
            if (this.trail.material) this.trail.material.dispose();
            this.trail = null;
        }
        this._visualsReady = false;
        this.isActive = false;
    }

    getPosition() {
        return this.position;
    }

    getPreviousPosition() {
        return this.previousPosition;
    }
}
