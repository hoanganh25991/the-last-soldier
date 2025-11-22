import * as THREE from 'three';

export class Enemy {
    constructor(position, team, collisionSystem = null) {
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
        this.collisionSystem = collisionSystem;
        
        // Ally-specific properties
        this.isAlly = false;
        this.maxDistanceFromPlayer = 300; // Maximum distance from player for allies
        this.nearbyEnemies = []; // List of nearby enemy meshes for allies to engage
        this.lastTargetChangeTime = 0; // For slow movement around player
        this.targetChangeInterval = 3.0; // Change target every 3 seconds (slow movement)
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

    setAllyTargetAroundPlayer() {
        // Set a target position around the player (within max distance)
        if (!this.playerPosition) return;
        
        const distanceToPlayer = this.position.distanceTo(this.playerPosition);
        const angle = Math.random() * Math.PI * 2;
        
        // Target should be between 50 and maxDistanceFromPlayer units from player
        const targetDistance = 50 + Math.random() * (this.maxDistanceFromPlayer - 50);
        
        this.targetPosition = new THREE.Vector3(
            this.playerPosition.x + Math.cos(angle) * targetDistance,
            0,
            this.playerPosition.z + Math.sin(angle) * targetDistance
        );
    }

    findNearestEnemy() {
        // Find the nearest enemy within engagement range
        if (!this.nearbyEnemies || this.nearbyEnemies.length === 0) return null;
        
        const engagementRange = 200; // Maximum range to engage enemies
        let nearestEnemy = null;
        let nearestDistance = engagementRange;
        
        for (const enemyMesh of this.nearbyEnemies) {
            if (!enemyMesh || !enemyMesh.position) continue;
            
            const distance = this.position.distanceTo(enemyMesh.position);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestEnemy = enemyMesh;
            }
        }
        
        return nearestEnemy;
    }

    updateAllyBehavior(deltaTime) {
        if (!this.playerPosition) return;
        
        const distanceToPlayer = this.position.distanceTo(this.playerPosition);
        
        // Check if ally is too far from player - bring them back
        if (distanceToPlayer > this.maxDistanceFromPlayer) {
            // Move back towards player
            const directionToPlayer = new THREE.Vector3()
                .subVectors(this.playerPosition, this.position)
                .normalize();
            
            const targetPos = this.position.clone().add(
                directionToPlayer.multiplyScalar(this.maxDistanceFromPlayer * 0.8)
            );
            targetPos.y = 0;
            this.targetPosition = targetPos;
        } else {
            // Check for nearby enemies to engage
            const nearestEnemy = this.findNearestEnemy();
            
            if (nearestEnemy && nearestEnemy.position) {
                // Engage enemy - move towards it but keep within max distance from player
                const enemyPos = nearestEnemy.position.clone();
                const directionToEnemy = new THREE.Vector3()
                    .subVectors(enemyPos, this.position)
                    .normalize();
                
                // Move towards enemy but ensure we don't go too far from player
                const moveDistance = 30; // Move closer to enemy
                const potentialPos = this.position.clone().add(
                    directionToEnemy.multiplyScalar(moveDistance)
                );
                
                // Check if this position is still within max distance from player
                const distanceFromPlayerAtNewPos = potentialPos.distanceTo(this.playerPosition);
                if (distanceFromPlayerAtNewPos <= this.maxDistanceFromPlayer) {
                    this.targetPosition = potentialPos;
                    this.targetPosition.y = 0;
                } else {
                    // Too far, set target around player instead
                    this.setAllyTargetAroundPlayer();
                }
            } else {
                // No nearby enemies, slowly move around player
                this.lastTargetChangeTime += deltaTime;
                
                if (!this.targetPosition || this.lastTargetChangeTime >= this.targetChangeInterval) {
                    this.setAllyTargetAroundPlayer();
                    this.lastTargetChangeTime = 0;
                }
            }
        }
        
        // Move towards target (use slower speed for allies)
        const allySpeed = this.speed * 0.6; // 60% of normal speed for slower movement
        if (this.targetPosition) {
            const direction = new THREE.Vector3()
                .subVectors(this.targetPosition, this.position)
                .normalize();

            const moveDistance = allySpeed * deltaTime;
            const distanceToTarget = this.position.distanceTo(this.targetPosition);

            if (distanceToTarget > 1) {
                // Only move horizontally (X and Z), keep Y at 0
                const horizontalMove = direction.clone();
                horizontalMove.y = 0;
                horizontalMove.normalize();
                
                const newPosition = this.position.clone();
                newPosition.x += horizontalMove.x * moveDistance;
                newPosition.z += horizontalMove.z * moveDistance;
                newPosition.y = 0; // Always keep on ground
                
                // Check collision before moving
                if (this.collisionSystem) {
                    const collisionResult = this.collisionSystem.checkCollision(
                        this.position,
                        newPosition,
                        0.5, // radius
                        1.6  // height
                    );
                    this.position.copy(collisionResult.position);
                } else {
                    this.position.copy(newPosition);
                }
                
                this.mesh.position.copy(this.position);
                
                // Rotate to face movement direction
                if (horizontalMove.length() > 0) {
                    this.mesh.lookAt(this.position.clone().add(horizontalMove));
                }
            } else {
                // Reached target, set new one
                this.setAllyTargetAroundPlayer();
                this.lastTargetChangeTime = 0;
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

    setPlayerPosition(playerPosition) {
        this.playerPosition = playerPosition ? playerPosition.clone() : null;
    }

    setNearbyEnemies(enemyMeshes) {
        this.nearbyEnemies = enemyMeshes || [];
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

        // Ally-specific behavior
        if (this.isAlly && this.playerPosition) {
            this.updateAllyBehavior(deltaTime);
            return;
        }

        // Enemy AI: Hunt player if position is known, otherwise random movement
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
                
                const newPosition = this.position.clone();
                newPosition.x += horizontalMove.x * moveDistance;
                newPosition.z += horizontalMove.z * moveDistance;
                newPosition.y = 0; // Always keep on ground
                
                // Check collision before moving
                if (this.collisionSystem) {
                    const collisionResult = this.collisionSystem.checkCollision(
                        this.position,
                        newPosition,
                        0.5, // radius
                        1.6  // height
                    );
                    this.position.copy(collisionResult.position);
                } else {
                    this.position.copy(newPosition);
                }
                
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

