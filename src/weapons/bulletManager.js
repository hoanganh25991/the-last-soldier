import * as THREE from 'three';
import { Bullet } from './bullet.js';

export class BulletManager {
    constructor(scene, collisionSystem = null) {
        this.scene = scene;
        this.collisionSystem = collisionSystem;
        this.bullets = [];
    }

    createBullet(startPosition, direction, speed, range, damage, showTrail = true) {
        const bullet = new Bullet(startPosition, direction, speed, range, damage, this.scene, showTrail);
        this.bullets.push(bullet);
        return bullet;
    }

    update(deltaTime) {
        // Update all bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (bullet.isActive) {
                bullet.update(deltaTime);
            } else {
                // Remove inactive bullets
                this.bullets.splice(i, 1);
            }
        }
    }

    checkCollisions(enemies, allies, enemyCallback, allyCallback, playerMesh = null, playerCallback = null) {
        // Check bullet collisions with both enemies and allies (friendly fire)
        const allTargets = [...enemies, ...allies];
        if (playerMesh) {
            allTargets.push(playerMesh);
            // Ensure player mesh is detectable by raycast
            playerMesh.visible = true; // Make sure it's visible to raycast even if material is invisible
        }
        
        for (const bullet of this.bullets) {
            if (!bullet.isActive) continue;

            const bulletPos = bullet.getPosition();
            const previousPos = bullet.getPreviousPosition();
            const pathDirection = new THREE.Vector3()
                .subVectors(bulletPos, previousPos)
                .normalize();
            const pathDistance = bulletPos.distanceTo(previousPos);
            
            // Check collisions along the bullet's path
            // Use raycast from previous position to current position (plus a bit extra for safety)
            const raycaster = new THREE.Raycaster(
                previousPos,
                pathDirection.length() > 0 ? pathDirection : bullet.direction,
                0,
                pathDistance + 2.0 // Add 2 unit buffer for safety
            );

            // First check player collision (highest priority)
            if (playerMesh) {
                const playerIntersects = raycaster.intersectObject(playerMesh, true);
                if (playerIntersects.length > 0) {
                    const hit = playerIntersects[0];
                    if (playerCallback) {
                        playerCallback(bullet.damage, hit.point);
                        bullet.destroy();
                        continue;
                    }
                }
            }

            // Then check world object collisions (walls, houses, trees, etc.)
            // Only check if bullet hasn't hit player
            if (this.collisionSystem) {
                // Use the actual path distance plus a buffer for safety
                const checkDistance = pathDistance + 2.0;
                const worldCollision = this.collisionSystem.checkBulletCollision(
                    previousPos,
                    pathDirection.length() > 0 ? pathDirection : bullet.direction,
                    checkDistance
                );
                if (worldCollision.hit && worldCollision.distance <= checkDistance) {
                    // Bullet hit a world object, destroy it
                    bullet.destroy();
                    continue;
                }
            }

            // Finally check enemy/ally collisions
            // Check enemy/ally collisions (skip player as we already checked it)
            const nonPlayerTargets = allTargets.filter(t => t !== playerMesh);
            const intersects = raycaster.intersectObjects(nonPlayerTargets, true);
            if (intersects.length > 0) {
                const hit = intersects[0];
                // Traverse up the parent chain to find the root group with userData
                let target = hit.object;
                while (target.parent && target.parent !== this.scene) {
                    // Check if current target has userData with team info
                    if (target.userData && (target.userData.isEnemy !== undefined || target.userData.team)) {
                        break; // Found the root group with userData
                    }
                    target = target.parent;
                }
                
                // If we found userData on the target
                if (target.userData) {
                    if (target.userData.isEnemy || target.userData.team === 'red') {
                        // Hit an enemy
                        enemyCallback(target, bullet.damage, hit.point);
                        bullet.destroy();
                    } else if (target.userData.team === 'blue') {
                        // Hit an ally (friendly fire)
                        allyCallback(target, bullet.damage, hit.point);
                        bullet.destroy();
                    }
                }
            }
        }
    }

    clear() {
        for (const bullet of this.bullets) {
            bullet.destroy();
        }
        this.bullets = [];
    }
}

