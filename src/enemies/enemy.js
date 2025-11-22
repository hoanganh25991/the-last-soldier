import * as THREE from 'three';
import { createSoldierModel, updateWalkAnimation } from './soldierModel.js';

export class Enemy {
    constructor(position, team, collisionSystem = null, bulletManager = null, scene = null) {
        this.position = position.clone();
        this.team = team;
        this.health = 100;
        this.maxHealth = 100;
        this.mesh = null;
        this.speed = 5.0; // Match player speed
        this.targetPosition = null;
        this.lastMoveTime = 0;
        this.playerPosition = null; // Player position for hunting
        this.huntMode = true; // Hunt player instead of random movement
        this.collisionSystem = collisionSystem;
        this.bulletManager = bulletManager;
        this.scene = scene;
        
        // Ally-specific properties
        this.isAlly = false;
        this.maxDistanceFromPlayer = 300; // Maximum distance from player for allies
        this.nearbyEnemies = []; // List of nearby enemy meshes for allies to engage
        this.lastTargetChangeTime = 0; // For slow movement around player
        this.targetChangeInterval = 3.0; // Change target every 3 seconds (slow movement)
        
        // Group-specific properties
        this.isInGroup = false;
        this.group = null; // Reference to group object
        this.groupIndex = 0; // Position in group formation
        this.formationOffset = new THREE.Vector3(); // Offset from group center
        
        // Look around behavior
        this.lookAroundTimer = 0;
        this.lookAroundInterval = 2.0 + Math.random() * 2.0; // 2-4 seconds between look arounds
        this.currentDirection = new THREE.Vector3(1, 0, 0); // Current movement direction
        this.desiredDirection = new THREE.Vector3(1, 0, 0); // Desired direction toward player
        this.directionChangeSpeed = 2.0; // How fast direction changes (smooth rotation)
        
        // Animation
        this.soldierData = null; // Store soldier model data for animation
        this.animationTime = 0; // Track animation time
        this.isMoving = false; // Track if enemy is moving
        
        // Shooting properties
        this.shootRange = 150; // Maximum shooting range
        this.shootDamage = 20; // 20 damage per hit (5 hits = 100 health = death)
        this.fireRate = 30; // rounds per minute (slower shooting - 2 seconds per shot)
        this.lastShotTime = 0;
        this.fireInterval = 60 / this.fireRate; // Time between shots in seconds (2 seconds per shot)
        this.bulletSpeed = 100; // Same as primary weapon
        this.currentTarget = null; // Current target to shoot at
        this.targets = []; // List of potential targets (enemies for allies, player/allies for enemies)
    }

    init() {
        // Ensure position Y is 0 (on ground)
        this.position.y = 0;
        
        // Create 3D soldier model with team color
        const teamColor = this.team === 'blue' ? 0x0000ff : 0xff0000; // blue = ally, red = enemy
        this.soldierData = createSoldierModel(teamColor);
        
        // Create group to hold model and health bar
        const group = new THREE.Group();
        group.add(this.soldierData.group);
        
        // Health bar
        const healthBarGeometry = new THREE.PlaneGeometry(0.6, 0.1);
        const healthBarMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            transparent: true
        });
        this.healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
        this.healthBar.position.y = 2.2; // Above soldier model
        group.add(this.healthBar);
        
        // Ensure position Y is 0 (on ground)
        this.position.y = 0;
        group.position.copy(this.position);
        group.position.y = 0; // Force Y to 0 to ensure soldiers are on ground
        
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
        
        // Move towards target (normal speed)
        if (this.targetPosition) {
            const direction = new THREE.Vector3()
                .subVectors(this.targetPosition, this.position)
                .normalize();

            const moveDistance = this.speed * deltaTime; // Normal speed
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
                
                // Rotate to face movement direction (unless shooting at target)
                if (!this.currentTarget && horizontalMove.length() > 0) {
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

        // Update shooting (this will handle facing target and aiming rifle)
        this.updateShooting(deltaTime);

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

    setTargets(targetMeshes) {
        // Set potential targets for shooting
        // For enemies: targets are player and allies
        // For allies: targets are enemies
        this.targets = targetMeshes || [];
    }

    findShootingTarget() {
        // Find the nearest target within shooting range
        if (!this.targets || this.targets.length === 0) return null;
        
        let nearestTarget = null;
        let nearestDistance = this.shootRange;
        
        for (const targetMesh of this.targets) {
            if (!targetMesh) continue;
            
            // Get the world position of the target
            const targetWorldPos = new THREE.Vector3();
            if (targetMesh.getWorldPosition) {
                targetMesh.getWorldPosition(targetWorldPos);
            } else if (targetMesh.position) {
                targetWorldPos.copy(targetMesh.position);
            } else {
                continue;
            }
            
            const distance = this.position.distanceTo(targetWorldPos);
            if (distance < nearestDistance && distance > 0) {
                nearestDistance = distance;
                nearestTarget = {
                    mesh: targetMesh,
                    position: targetWorldPos.clone()
                };
            }
        }
        
        return nearestTarget;
    }

    shoot(targetPosition) {
        if (!this.bulletManager || !this.mesh || this.health <= 0) return;
        
        // ALWAYS aim at body center height (Y=0.9) regardless of target position
        // This ensures bullets hit the player collider which is at body center
        const adjustedTarget = new THREE.Vector3(
            targetPosition.x,
            0.9, // Always aim at body center height where player collider is
            targetPosition.z
        );
        
        // Bullet start position (from soldier's rifle position)
        const bulletStart = this.position.clone();
        bulletStart.y += 1.0; // Height of rifle
        
        // Calculate direction FROM rifle position TO adjusted target
        // This is critical - direction must be calculated from where bullet starts, not from ground level
        const direction = new THREE.Vector3()
            .subVectors(adjustedTarget, bulletStart)
            .normalize();
        
        // Add some spread for realism (soldiers aren't perfect shots)
        // Reduce vertical spread significantly to ensure bullets hit
        const spread = 0.05; // 5% horizontal spread
        direction.x += (Math.random() - 0.5) * spread;
        direction.y += (Math.random() - 0.5) * spread * 0.2; // Very little vertical spread (20% of horizontal)
        direction.z += (Math.random() - 0.5) * spread;
        direction.normalize();
        
        // Create bullet (without trail for enemies/teammates)
        this.bulletManager.createBullet(
            bulletStart,
            direction,
            this.bulletSpeed,
            this.shootRange,
            this.shootDamage,
            false // showTrail = false for enemies/teammates
        );
    }

    updateShooting(deltaTime) {
        if (!this.bulletManager || this.health <= 0) return;
        
        // Update shot timer
        this.lastShotTime += deltaTime;
        
        // Find target to shoot at
        const target = this.findShootingTarget();
        
        if (target) {
            // ALWAYS aim at body center height (Y=0.9) regardless of target position
            // This ensures bullets hit the player collider which is at body center
            const adjustedTargetPos = new THREE.Vector3(
                target.position.x,
                0.9, // Always aim at body center height where player collider is
                target.position.z
            );
            
            // Calculate direction to adjusted target
            const directionToTarget = new THREE.Vector3()
                .subVectors(adjustedTargetPos, this.position)
                .normalize();
            
            // Rotate soldier body to face target (only Y rotation for horizontal facing)
            if (this.mesh) {
                const angle = Math.atan2(directionToTarget.x, directionToTarget.z);
                this.mesh.rotation.y = angle;
            }
            
            // Aim rifle at adjusted target
            if (this.soldierData && this.soldierData.rifle && this.soldierData.group) {
                // Get rifle position in world space
                const rifleWorldPos = new THREE.Vector3();
                this.soldierData.rifle.getWorldPosition(rifleWorldPos);
                
                // Calculate direction from rifle to adjusted target
                const rifleToTarget = new THREE.Vector3()
                    .subVectors(adjustedTargetPos, rifleWorldPos)
                    .normalize();
                
                // Convert world direction to local space (relative to soldier body)
                // Since soldier body rotates on Y axis, we need to account for that
                const bodyRotation = this.mesh.rotation.y;
                const localDirection = new THREE.Vector3();
                localDirection.x = Math.cos(-bodyRotation) * rifleToTarget.x - Math.sin(-bodyRotation) * rifleToTarget.z;
                localDirection.y = rifleToTarget.y;
                localDirection.z = Math.sin(-bodyRotation) * rifleToTarget.x + Math.cos(-bodyRotation) * rifleToTarget.z;
                
                // Calculate vertical angle (X rotation) - tilt up/down to aim
                const verticalAngle = Math.asin(Math.max(-0.7, Math.min(0.7, localDirection.y))); // Clamp to ±45 degrees
                
                // Calculate horizontal angle relative to body (Y rotation)
                const horizontalAngle = Math.atan2(localDirection.x, localDirection.z);
                
                // Rotate rifle to aim at target
                // X rotation for vertical aiming, Y rotation for horizontal adjustment, Z for grip angle
                this.soldierData.rifle.rotation.set(-verticalAngle, horizontalAngle, -0.1);
            }
            
            // Shoot if ready (use adjusted target position)
            if (this.lastShotTime >= this.fireInterval) {
                this.shoot(adjustedTargetPos);
                this.lastShotTime = 0;
                this.currentTarget = target;
            } else {
                this.currentTarget = target;
            }
        } else {
            // No target, reset rifle to default position
            if (this.soldierData && this.soldierData.rifle) {
                this.soldierData.rifle.rotation.set(0, 0, -0.1);
            }
            this.currentTarget = null;
        }
    }

    updateGroupBehavior(deltaTime) {
        if (!this.group || !this.playerPosition) return;
        
        const groupCenter = this.group.center;
        const distanceToPlayer = groupCenter.distanceTo(this.playerPosition);
        const engagementRange = 50; // When group gets within 50 units, enemies can break formation
        
        // Calculate formation offset (position relative to group center)
        if (!this.formationOffset || this.formationOffset.length() === 0) {
            // Initialize formation offset based on group index
            const angle = (Math.PI * 2 / this.group.enemies.length) * this.groupIndex;
            const radius = 5 + Math.random() * 5; // 5-10 units from center
            this.formationOffset = new THREE.Vector3(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
        }
        
        // Track if group is moving
        this.isMoving = distanceToPlayer > engagementRange;
        
        // Move group center toward player (only update once per group)
        if (distanceToPlayer > engagementRange && this.groupIndex === 0) {
            // Only the first enemy in group updates the center to avoid multiple updates
            // Gradually move toward player with look-around behavior
            this.lookAroundTimer += deltaTime;
            
            // Initialize direction vectors if needed
            if (this.currentDirection.length() === 0) {
                const initialDir = new THREE.Vector3()
                    .subVectors(this.playerPosition, groupCenter)
                    .normalize();
                this.currentDirection.copy(initialDir);
                this.desiredDirection.copy(initialDir);
            }
            
            if (this.lookAroundTimer >= this.lookAroundInterval) {
                // Time to "look around" - calculate new desired direction
                const directionToPlayer = new THREE.Vector3()
                    .subVectors(this.playerPosition, groupCenter)
                    .normalize();
                
                // Add some randomness to make it look more natural
                const randomAngle = (Math.random() - 0.5) * 0.3; // ±15 degrees
                const cos = Math.cos(randomAngle);
                const sin = Math.sin(randomAngle);
                const rotatedX = directionToPlayer.x * cos - directionToPlayer.z * sin;
                const rotatedZ = directionToPlayer.x * sin + directionToPlayer.z * cos;
                
                this.desiredDirection.set(rotatedX, 0, rotatedZ).normalize();
                this.lookAroundTimer = 0;
                this.lookAroundInterval = 2.0 + Math.random() * 2.0; // Next look around in 2-4 seconds
            }
            
            // Smoothly rotate current direction toward desired direction
            this.currentDirection.lerp(this.desiredDirection, this.directionChangeSpeed * deltaTime).normalize();
            
            // Update group center position using current direction
            const moveDistance = this.speed * deltaTime;
            groupCenter.x += this.currentDirection.x * moveDistance;
            groupCenter.z += this.currentDirection.z * moveDistance;
            groupCenter.y = 0;
        }
        
        // Calculate desired position (group center + formation offset)
        const desiredPosition = new THREE.Vector3(
            groupCenter.x + this.formationOffset.x,
            0,
            groupCenter.z + this.formationOffset.z
        );
        
        // When close to player, allow individual enemies to engage
        if (distanceToPlayer < engagementRange) {
            // Close to player - move toward player individually but stay near group
            const directionToPlayer = new THREE.Vector3()
                .subVectors(this.playerPosition, this.position)
                .normalize();
            
            // Blend between formation position and player position
            const blendFactor = 0.3; // 30% toward player, 70% maintain formation
            desiredPosition.lerp(this.playerPosition, blendFactor);
        }
        
        // Move toward desired position
        const direction = new THREE.Vector3()
            .subVectors(desiredPosition, this.position)
            .normalize();
        
        const moveDistance = this.speed * deltaTime; // Normal speed movement
        const distanceToTarget = this.position.distanceTo(desiredPosition);
        
        if (distanceToTarget > 0.5) {
            // Mark as moving for animation
            this.isMoving = true;
            
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
            // Reached target, stop moving
            this.isMoving = false;
        }
        
        // Ensure position Y is always 0 (on ground)
        this.position.y = 0;
        this.mesh.position.y = 0;
        
        // Update walk animation if moving
        if (this.soldierData && this.isMoving) {
            this.animationTime += deltaTime;
            updateWalkAnimation(this.soldierData, this.animationTime, 8);
        } else if (this.soldierData && !this.isMoving) {
            // Reset to idle pose when not moving
            if (this.soldierData.leftLeg) this.soldierData.leftLeg.rotation.x = 0;
            if (this.soldierData.rightLeg) this.soldierData.rightLeg.rotation.x = 0;
            if (this.soldierData.leftArm) this.soldierData.leftArm.rotation.x = 0;
            if (this.soldierData.rightArm) this.soldierData.rightArm.rotation.x = 0;
            if (this.soldierData.group) this.soldierData.group.position.y = 0;
        }
        
        // Update shooting
        this.updateShooting(deltaTime);
        
        // Update health bar to face camera
        if (this.healthBar) {
            this.healthBar.lookAt(this.healthBar.position.clone().add(new THREE.Vector3(0, 0, -1)));
        }
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

        // Group behavior - enemies in groups move together slowly toward player
        if (this.isInGroup && this.group && this.playerPosition) {
            this.updateGroupBehavior(deltaTime);
            return;
        }

        // Enemy AI: Hunt player if position is known, otherwise random movement
        let targetPos = this.targetPosition;
        
        if (this.huntMode && this.playerPosition) {
            // Move towards player position with look-around behavior
            const distanceToPlayer = this.position.distanceTo(this.playerPosition);
            
            if (distanceToPlayer > 2) {
                // Initialize direction vectors if needed
                if (this.currentDirection.length() === 0 || this.desiredDirection.length() === 0) {
                    const initialDir = new THREE.Vector3()
                        .subVectors(this.playerPosition, this.position)
                        .normalize();
                    this.currentDirection.copy(initialDir);
                    this.desiredDirection.copy(initialDir);
                }
                
                // Look around periodically before moving forward
                this.lookAroundTimer += deltaTime;
                
                if (this.lookAroundTimer >= this.lookAroundInterval) {
                    // Time to "look around" - calculate new desired direction toward player
                    const directionToPlayer = new THREE.Vector3()
                        .subVectors(this.playerPosition, this.position)
                        .normalize();
                    
                    // Add some randomness to make it look more natural (not straight line)
                    const randomAngle = (Math.random() - 0.5) * 0.4; // ±20 degrees
                    const cos = Math.cos(randomAngle);
                    const sin = Math.sin(randomAngle);
                    const rotatedX = directionToPlayer.x * cos - directionToPlayer.z * sin;
                    const rotatedZ = directionToPlayer.x * sin + directionToPlayer.z * cos;
                    
                    this.desiredDirection.set(rotatedX, 0, rotatedZ).normalize();
                    this.lookAroundTimer = 0;
                    this.lookAroundInterval = 2.0 + Math.random() * 2.0; // Next look around in 2-4 seconds
                }
                
                // Smoothly rotate current direction toward desired direction
                this.currentDirection.lerp(this.desiredDirection, this.directionChangeSpeed * deltaTime).normalize();
                
                // Use current direction for movement (gradual approach, not straight line)
                targetPos = this.position.clone().add(this.currentDirection.clone().multiplyScalar(10));
                targetPos.y = 0;
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

            const moveDistance = this.speed * deltaTime; // Normal speed
            const distanceToTarget = this.position.distanceTo(targetPos);

            if (distanceToTarget > 1) {
                // Mark as moving for animation
                this.isMoving = true;
                
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
                
            // Always ensure Y is 0
            this.position.y = 0;
            this.mesh.position.copy(this.position);
            this.mesh.position.y = 0; // Force Y to 0
            
            // Rotate to face movement direction (unless shooting at target)
            if (!this.currentTarget && horizontalMove.length() > 0) {
                this.mesh.lookAt(this.position.clone().add(horizontalMove));
            }
        } else {
            // Reached target, stop moving
            this.isMoving = false;
            // Set new one
            if (!this.huntMode || !this.playerPosition) {
                this.setRandomTarget();
            }
        }
        }

        // Ensure position Y is always 0 (on ground)
        this.position.y = 0;
        this.mesh.position.y = 0;

        // Update shooting
        this.updateShooting(deltaTime);

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

