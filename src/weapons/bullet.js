import * as THREE from 'three';

export class Bullet {
    constructor(startPosition, direction, speed, range, damage, scene, showTrail = true) {
        this.startPosition = startPosition.clone();
        this.direction = direction.clone().normalize();
        this.speed = speed;
        this.range = range;
        this.damage = damage;
        this.scene = scene;
        this.showTrail = showTrail;
        
        this.traveledDistance = 0;
        this.position = startPosition.clone();
        this.previousPosition = startPosition.clone(); // Track previous position for collision detection
        this.mesh = null;
        this.trail = null;
        this.trailPositions = [];
        this.maxTrailLength = 10;
        this.isActive = true;
        this.spawnTime = Date.now();
        this.maxLifetime = 1500; // Maximum lifetime in milliseconds (1.5 seconds)
        
        this.createMesh();
        if (this.showTrail) {
            this.createTrail();
        }
    }

    createMesh() {
        const bulletGroup = new THREE.Group();
        
        const geometry = new THREE.SphereGeometry(0.15, 6, 6);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xffff00
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        bulletGroup.add(this.mesh);
        
        bulletGroup.position.copy(this.startPosition);
        this.mesh = bulletGroup;
        this.scene.add(bulletGroup);
    }

    createTrail() {
        // Create trail using a line that follows the bullet
        const trailGeometry = new THREE.BufferGeometry();
        const trailMaterial = new THREE.LineBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.9,
            linewidth: 3
        });
        
        // Initialize with starting position
        this.trailPositions = [
            this.startPosition.x, this.startPosition.y, this.startPosition.z,
            this.startPosition.x, this.startPosition.y, this.startPosition.z
        ];
        
        trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(this.trailPositions, 3));
        this.trail = new THREE.Line(trailGeometry, trailMaterial);
        this.scene.add(this.trail);
    }

    update(deltaTime) {
        if (!this.isActive) return;

        // Store previous position for trail and collision detection
        this.previousPosition.copy(this.position);
        const previousPosition = this.position.clone();

        // Move bullet
        const moveDistance = this.speed * deltaTime;
        const moveVector = this.direction.clone().multiplyScalar(moveDistance);
        this.position.add(moveVector);
        this.traveledDistance += moveDistance;

        // Update mesh position
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            // Rotate bullet for visual effect
            this.mesh.rotation.x += deltaTime * 10;
            this.mesh.rotation.y += deltaTime * 10;
        }

        // Update trail (only if trail exists - trails are disabled for enemies/teammates)
        if (this.trail) {
            // Add current position to trail
            this.trailPositions.push(this.position.x, this.position.y, this.position.z);
            
            // Limit trail length
            if (this.trailPositions.length > this.maxTrailLength * 3) {
                this.trailPositions.shift();
                this.trailPositions.shift();
                this.trailPositions.shift();
            }
            
            // Update trail geometry
            if (this.trailPositions.length >= 6) { // Need at least 2 points for a line
                this.trail.geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.trailPositions, 3));
                this.trail.geometry.setDrawRange(0, this.trailPositions.length / 3);
            }
            
            // Fade trail opacity based on length
            const trailLength = this.trailPositions.length / 3;
            if (trailLength > 0) {
                this.trail.material.opacity = Math.min(0.8, trailLength / this.maxTrailLength * 0.8);
            }
        }

        // Check if bullet has traveled max range
        if (this.traveledDistance >= this.range) {
            this.destroy();
            return;
        }
        
        // Check if bullet has exceeded maximum lifetime (prevent bullets from flying forever)
        const currentTime = Date.now();
        if (currentTime - this.spawnTime >= this.maxLifetime) {
            this.destroy();
            return;
        }
    }

    destroy() {
        // Clean up bullet mesh
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        
        // Clean up trail
        if (this.trail) {
            this.scene.remove(this.trail);
            if (this.trail.geometry) this.trail.geometry.dispose();
            if (this.trail.material) this.trail.material.dispose();
        }
        
        this.isActive = false;
    }

    getPosition() {
        return this.position;
    }

    getPreviousPosition() {
        return this.previousPosition;
    }
}

