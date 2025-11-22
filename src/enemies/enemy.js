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
        this.playerPosition = null; // Player position for hunting
        this.huntMode = true; // Hunt player instead of random movement
    }

    init() {
        // Ensure position Y is 0 (on ground)
        this.position.y = 0;
        
        // Create enemy mesh
        const group = new THREE.Group();

        // Body (cylinder)
        // Enemies are red, allies (our team) are blue
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: this.team === 'blue' ? 0x0000ff : 0xff0000  // blue = ally, red = enemy
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.75;
        body.castShadow = true;
        group.add(body);

        // Head (sphere)
        const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
        const headMaterial = new THREE.MeshLambertMaterial({ 
            color: this.team === 'blue' ? 0x6666ff : 0xff6666  // blue = ally, red = enemy
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
        // Enemies are red team, allies are blue team
        group.userData.isEnemy = this.team === 'red';
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
            0, // Always on ground
            this.position.z + Math.sin(angle) * distance
        );
    }

    setPlayerPosition(playerPosition) {
        this.playerPosition = playerPosition ? playerPosition.clone() : null;
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

        // AI: Hunt player if position is known, otherwise random movement
        let targetPos = this.targetPosition;
        
        if (this.huntMode && this.playerPosition) {
            // Move towards player position
            const distanceToPlayer = this.position.distanceTo(this.playerPosition);
            
            if (distanceToPlayer > 2) {
                // Set player as target
                targetPos = this.playerPosition.clone();
                targetPos.y = 0; // Keep on ground level
            } else {
                // Close to player, set random nearby target for flanking
                this.setRandomTarget();
                targetPos = this.targetPosition;
            }
        } else if (!targetPos) {
            // No target, set random one
            this.setRandomTarget();
            targetPos = this.targetPosition;
        }

        // Move towards target
        if (targetPos) {
            const direction = new THREE.Vector3()
                .subVectors(targetPos, this.position)
                .normalize();

            const moveDistance = this.speed * deltaTime;
            const distanceToTarget = this.position.distanceTo(targetPos);

            if (distanceToTarget > 1) {
                // Only move horizontally (X and Z), keep Y at 0
                const horizontalMove = direction.clone();
                horizontalMove.y = 0;
                horizontalMove.normalize();
                
                this.position.x += horizontalMove.x * moveDistance;
                this.position.z += horizontalMove.z * moveDistance;
                this.position.y = 0; // Always keep on ground
                
                this.mesh.position.copy(this.position);
                
                // Rotate to face movement direction
                if (horizontalMove.length() > 0) {
                    this.mesh.lookAt(this.position.clone().add(horizontalMove));
                }
            } else {
                // Reached target, set new one
                if (!this.huntMode || !this.playerPosition) {
                    this.setRandomTarget();
                }
            }
        }

        // Ensure position Y is always 0 (on ground)
        this.position.y = 0;
        this.mesh.position.y = 0;

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

