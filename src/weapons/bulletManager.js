import * as THREE from 'three';
import { Bullet } from './bullet.js';
import { ObjectPool } from '../core/objectPool.js';

const _pathDirection = new THREE.Vector3();
const _worldPrev = new THREE.Vector3();

export class BulletManager {
    constructor(scene, worldScene, collisionSystem = null) {
        this.scene = scene;
        this.worldScene = worldScene || scene;
        this.collisionSystem = collisionSystem;
        this.bullets = [];
        this.bulletProfile = { showTrail: true, segments: 6 };
        this.pendingRelease = [];
        this.maxDisposalsPerFrame = 5;

        this.playerPool = new ObjectPool(
            () => new Bullet(scene, 'scene'),
            (bullet) => {
                bullet.deactivate();
                return bullet;
            },
            50
        );

        this.worldPool = new ObjectPool(
            () => new Bullet(this.worldScene, 'world'),
            (bullet) => {
                bullet.deactivate();
                return bullet;
            },
            50
        );
    }

    setBulletProfile(profile) {
        if (profile) {
            this.bulletProfile = profile;
        }
    }

    createBullet(startPosition, direction, speed, range, damage, showTrail = null, useWorldCoords = false) {
        const useTrail = showTrail !== null ? showTrail : this.bulletProfile.showTrail;
        const pool = useWorldCoords ? this.worldPool : this.playerPool;
        const bullet = pool.acquire();
        bullet.reset(startPosition, direction, speed, range, damage, useTrail);
        this.bullets.push(bullet);
        return bullet;
    }

    releaseBullet(bullet) {
        bullet.deactivate();
        this.pendingRelease.push(bullet);
    }

    processPendingReleases() {
        const count = Math.min(this.maxDisposalsPerFrame, this.pendingRelease.length);
        for (let i = 0; i < count; i++) {
            const bullet = this.pendingRelease.shift();
            const index = this.bullets.indexOf(bullet);
            if (index > -1) {
                this.bullets.splice(index, 1);
            }
            if (bullet.coordinateSpace === 'world') {
                this.worldPool.release(bullet);
            } else {
                this.playerPool.release(bullet);
            }
        }
    }

    update(deltaTime) {
        this.processPendingReleases();

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (bullet.isActive) {
                bullet.update(deltaTime);
                if (!bullet.isActive) {
                    this.releaseBullet(bullet);
                }
            }
        }
    }

    checkCollisions(enemies, allies, enemyCallback, allyCallback, playerMesh = null, playerCallback = null) {
        const allTargets = [...enemies, ...allies];
        if (playerMesh) {
            allTargets.push(playerMesh);
            playerMesh.visible = true;
        }

        for (const bullet of this.bullets) {
            if (!bullet.isActive) continue;

            const bulletPos = bullet.getPosition();
            const previousPos = bullet.getPreviousPosition();
            _pathDirection.subVectors(bulletPos, previousPos);
            const pathDistance = _pathDirection.length();
            if (pathDistance > 0) {
                _pathDirection.normalize();
            } else {
                _pathDirection.copy(bullet.direction);
            }

            const raycaster = new THREE.Raycaster(
                previousPos,
                _pathDirection,
                0,
                pathDistance + 2.0
            );

            if (playerMesh) {
                const playerIntersects = raycaster.intersectObject(playerMesh, true);
                if (playerIntersects.length > 0) {
                    const hit = playerIntersects[0];
                    if (playerCallback) {
                        playerCallback(bullet.damage, hit.point);
                        this.releaseBullet(bullet);
                        continue;
                    }
                }
            }

            if (this.collisionSystem) {
                const checkDistance = pathDistance + 2.0;
                if (bullet.coordinateSpace === 'world') {
                    _worldPrev.copy(previousPos);
                } else if (this.player?.scenePointToWorld) {
                    this.player.scenePointToWorld(previousPos, _worldPrev);
                } else {
                    _worldPrev.copy(previousPos);
                }
                const worldCollision = this.collisionSystem.checkBulletCollision(
                    _worldPrev,
                    _pathDirection,
                    checkDistance
                );
                if (worldCollision.hit && worldCollision.distance <= checkDistance) {
                    this.releaseBullet(bullet);
                    continue;
                }
            }

            const nonPlayerTargets = allTargets.filter(t => t !== playerMesh);
            const intersects = raycaster.intersectObjects(nonPlayerTargets, true);
            if (intersects.length > 0) {
                const hit = intersects[0];
                let target = hit.object;
                while (target.parent && target.parent !== this.scene && target.parent !== this.worldScene) {
                    if (target.userData && (target.userData.isEnemy !== undefined || target.userData.team)) {
                        break;
                    }
                    target = target.parent;
                }

                if (target.userData) {
                    if (target.userData.isEnemy || target.userData.team === 'red') {
                        enemyCallback(target, bullet.damage, hit.point);
                        this.releaseBullet(bullet);
                    } else if (target.userData.team === 'blue') {
                        allyCallback(target, bullet.damage, hit.point);
                        this.releaseBullet(bullet);
                    }
                }
            }
        }
    }

    clear() {
        while (this.pendingRelease.length > 0) {
            const bullet = this.pendingRelease.pop();
            if (bullet.coordinateSpace === 'world') {
                this.worldPool.release(bullet);
            } else {
                this.playerPool.release(bullet);
            }
        }
        for (const bullet of this.bullets) {
            bullet.deactivate();
            if (bullet.coordinateSpace === 'world') {
                this.worldPool.release(bullet);
            } else {
                this.playerPool.release(bullet);
            }
        }
        this.bullets = [];
    }
}
