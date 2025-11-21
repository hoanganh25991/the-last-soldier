import * as THREE from 'three';

export class Bullet {
    constructor(startPosition, direction, speed, range, damage, scene) {
        this.startPosition = startPosition.clone();
        this.direction = direction.clone().normalize();
        this.speed = speed;
        this.range = range;
        this.damage = damage;
        this.scene = scene;
        
        this.traveledDistance = 0;
        this.position = startPosition.clone();
        this.mesh = null;
        this.isActive = true;
        
        this.createMesh();
    }

    createMesh() {
        // Create bullet mesh (small sphere)
        const geometry = new THREE.SphereGeometry(0.05, 8, 8);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.9
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.startPosition);
        this.scene.add(this.mesh);
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.mesh.add(glow);
    }

    update(deltaTime) {
        if (!this.isActive) return;

        // Move bullet
        const moveDistance = this.speed * deltaTime;
        const moveVector = this.direction.clone().multiplyScalar(moveDistance);
        this.position.add(moveVector);
        this.traveledDistance += moveDistance;

        // Update mesh position
        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }

        // Check if bullet has traveled max range
        if (this.traveledDistance >= this.range) {
            this.destroy();
        }
    }

    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
            this.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        this.isActive = false;
    }

    getPosition() {
        return this.position;
    }
}

