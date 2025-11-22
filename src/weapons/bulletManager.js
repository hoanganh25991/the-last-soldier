import * as THREE from 'three';
import { Bullet } from './bullet.js';

export class BulletManager {
    constructor(scene) {
        this.scene = scene;
        this.bullets = [];
    }

    createBullet(startPosition, direction, speed, range, damage) {
        const bullet = new Bullet(startPosition, direction, speed, range, damage, this.scene);
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

    checkCollisions(enemies, allies, enemyCallback, allyCallback) {
        // Check bullet collisions with both enemies and allies (friendly fire)
        const allTargets = [...enemies, ...allies];
        
        for (const bullet of this.bullets) {
            if (!bullet.isActive) continue;

            const bulletPos = bullet.getPosition();
            const raycaster = new THREE.Raycaster(
                bulletPos.clone().sub(bullet.direction.clone().multiplyScalar(0.1)),
                bullet.direction,
                0,
                0.2
            );

            const intersects = raycaster.intersectObjects(allTargets, true);
            if (intersects.length > 0) {
                const hit = intersects[0];
                const target = hit.object.parent || hit.object;
                if (target && target.userData.isEnemy) {
                    // Hit an enemy
                    enemyCallback(target, bullet.damage, hit.point);
                    bullet.destroy();
                } else if (target && target.userData.team === 'blue') {
                    // Hit an ally (friendly fire)
                    allyCallback(target, bullet.damage, hit.point);
                    bullet.destroy();
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

