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
        }
        
        for (const bullet of this.bullets) {
            if (!bullet.isActive) continue;

            const bulletPos = bullet.getPosition();
            
            // First check world object collisions (walls, houses, trees, etc.)
            if (this.collisionSystem) {
                const worldCollision = this.collisionSystem.checkBulletCollision(
                    bulletPos,
                    bullet.direction,
                    0.2
                );
                if (worldCollision.hit) {
                    // Bullet hit a world object, destroy it
                    bullet.destroy();
                    continue;
                }
            }

            // Then check enemy/ally/player collisions
            // Use a longer distance to catch fast-moving bullets (check distance traveled since last frame)
            const checkDistance = Math.min(bullet.speed * 0.02, 2.0); // Check up to 2 units or bullet speed * frame time
            const raycaster = new THREE.Raycaster(
                bulletPos.clone().sub(bullet.direction.clone().multiplyScalar(checkDistance)),
                bullet.direction,
                0,
                checkDistance * 2
            );

            const intersects = raycaster.intersectObjects(allTargets, true);
            if (intersects.length > 0) {
                const hit = intersects[0];
                // Traverse up the parent chain to find the root group with userData
                let target = hit.object;
                while (target.parent && target.parent !== this.scene) {
                    // Check if current target has userData with team info
                    if (target.userData && (target.userData.isEnemy !== undefined || target.userData.team || target.userData.isPlayer)) {
                        break; // Found the root group with userData
                    }
                    target = target.parent;
                }
                
                // Check if it's the player first
                if (target.userData && target.userData.isPlayer && playerCallback) {
                    playerCallback(bullet.damage, hit.point);
                    bullet.destroy();
                    continue;
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

