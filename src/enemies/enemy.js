import * as THREE from 'three';

export class Enemy {
    constructor(position, team) {
        this.position = position.clone();
        this.team = team;
        this.health = 100;
        this.maxHealth = 100;
        this.mesh = null;
        this.speed = 2.0;
        this.targetPosition = null;
        this.lastMoveTime = 0;
    }

    init() {
        // Create enemy mesh
        const group = new THREE.Group();

        // Body (cylinder)
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: this.team === 'red' ? 0xff0000 : 0x0000ff 
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.75;
        body.castShadow = true;
        group.add(body);

        // Head (sphere)
        const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
        const headMaterial = new THREE.MeshLambertMaterial({ 
            color: this.team === 'red' ? 0xff6666 : 0x6666ff 
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.6;
        head.castShadow = true;
        group.add(head);

        // Health bar
        const healthBarGeometry = new THREE.PlaneGeometry(0.6, 0.1);
        const healthBarMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            transparent: true
        });
        this.healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
        this.healthBar.position.y = 2;
        group.add(this.healthBar);

        group.position.copy(this.position);
        group.userData.isEnemy = this.team !== 'red';
        group.userData.team = this.team;
        
        this.mesh = group;
        this.updateHealthBar();

        // Set random target position
        this.setRandomTarget();
    }

    setRandomTarget() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 5 + Math.random() * 15;
        this.targetPosition = new THREE.Vector3(
            this.position.x + Math.cos(angle) * distance,
            this.position.y,
            this.position.z + Math.sin(angle) * distance
        );
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        this.updateHealthBar();
    }

    updateHealthBar() {
        if (this.healthBar) {
            const healthPercent = this.health / this.maxHealth;
            this.healthBar.scale.x = healthPercent;
            this.healthBar.material.color.setHex(
                healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000
            );
        }
    }

    update(deltaTime) {
        if (!this.mesh || this.health <= 0) return;

        // Simple AI: move towards target
        if (this.targetPosition) {
            const direction = new THREE.Vector3()
                .subVectors(this.targetPosition, this.position)
                .normalize();

            const moveDistance = this.speed * deltaTime;
            const distanceToTarget = this.position.distanceTo(this.targetPosition);

            if (distanceToTarget > 1) {
                this.position.add(direction.multiplyScalar(moveDistance));
                this.mesh.position.copy(this.position);
                
                // Rotate to face movement direction
                if (direction.length() > 0) {
                    this.mesh.lookAt(this.position.clone().add(direction));
                }
            } else {
                // Reached target, set new one
                this.setRandomTarget();
            }
        }

        // Update health bar to face camera (simplified)
        if (this.healthBar) {
            this.healthBar.lookAt(this.healthBar.position.clone().add(new THREE.Vector3(0, 0, -1)));
        }
    }

    dispose() {
        if (this.mesh) {
            this.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
    }
}

