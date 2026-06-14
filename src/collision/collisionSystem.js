import * as THREE from 'three';

const _box = new THREE.Box3();
const _center = new THREE.Vector3();
const _size = new THREE.Vector3();
const _playerMin = new THREE.Vector3();
const _playerMax = new THREE.Vector3();
const _colliderMin = new THREE.Vector3();
const _colliderMax = new THREE.Vector3();
const _finalPos = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _eyePosition = new THREE.Vector3();
const _targetEyePosition = new THREE.Vector3();
const _eyeDirection = new THREE.Vector3();
const _endPoint = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _invDir = new THREE.Vector3();

function cacheColliderBounds(object) {
    if (object.userData && object.userData.collisionBounds) {
        return;
    }

    _box.setFromObject(object);
    if (_box.isEmpty()) {
        object.userData.collisionBounds = null;
        return;
    }

    const center = _box.getCenter(new THREE.Vector3());
    const size = _box.getSize(new THREE.Vector3());
    object.userData.collisionBounds = {
        minX: _box.min.x,
        minY: _box.min.y,
        minZ: _box.min.z,
        maxX: _box.max.x,
        maxY: _box.max.y,
        maxZ: _box.max.z,
        centerX: center.x,
        centerY: center.y,
        centerZ: center.z,
        sizeX: size.x,
        sizeY: size.y,
        sizeZ: size.z
    };
}

function intersectAABB(origin, direction, bounds, maxDistance) {
    _invDir.set(
        direction.x === 0 ? Number.MAX_VALUE : 1 / direction.x,
        direction.y === 0 ? Number.MAX_VALUE : 1 / direction.y,
        direction.z === 0 ? Number.MAX_VALUE : 1 / direction.z
    );

    let tmin = ((direction.x >= 0 ? bounds.minX : bounds.maxX) - origin.x) * _invDir.x;
    let tmax = ((direction.x >= 0 ? bounds.maxX : bounds.minX) - origin.x) * _invDir.x;
    let tymin = ((direction.y >= 0 ? bounds.minY : bounds.maxY) - origin.y) * _invDir.y;
    let tymax = ((direction.y >= 0 ? bounds.maxY : bounds.minY) - origin.y) * _invDir.y;

    if (tmin > tymax || tymin > tmax) return null;
    if (tymin > tmin) tmin = tymin;
    if (tymax < tmax) tmax = tymax;

    let tzmin = ((direction.z >= 0 ? bounds.minZ : bounds.maxZ) - origin.z) * _invDir.z;
    let tzmax = ((direction.z >= 0 ? bounds.maxZ : bounds.minZ) - origin.z) * _invDir.z;

    if (tmin > tzmax || tzmin > tmax) return null;
    if (tzmin > tmin) tmin = tzmin;
    if (tzmax < tmax) tmax = tzmax;

    if (tmax < 0 || tmin > maxDistance) return null;
    const distance = tmin >= 0 ? tmin : tmax;
    if (distance < 0 || distance > maxDistance) return null;

    _endPoint.copy(direction).multiplyScalar(distance).add(origin);
    return {
        distance,
        point: _endPoint.clone(),
        object: null
    };
}

/**
 * Spatial Grid for efficient collision queries
 */
class SpatialGrid {
    constructor(cellSize = 100) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    getCellKey(x, z) {
        const cellX = Math.floor(x / this.cellSize);
        const cellZ = Math.floor(z / this.cellSize);
        return `${cellX},${cellZ}`;
    }

    addObject(object) {
        if (object.userData?._spatialCells) {
            this.removeObject(object);
        }
        if (!object.userData) {
            object.userData = {};
        }
        object.userData._spatialCells = [];

        let minX, maxX, minZ, maxZ;
        if (object.userData.collisionBounds) {
            const b = object.userData.collisionBounds;
            minX = b.minX;
            maxX = b.maxX;
            minZ = b.minZ;
            maxZ = b.maxZ;
        } else {
            const box = new THREE.Box3().setFromObject(object);
            if (box.isEmpty()) return;
            minX = box.min.x;
            maxX = box.max.x;
            minZ = box.min.z;
            maxZ = box.max.z;
        }

        const minCellX = Math.floor(minX / this.cellSize);
        const maxCellX = Math.floor(maxX / this.cellSize);
        const minCellZ = Math.floor(minZ / this.cellSize);
        const maxCellZ = Math.floor(maxZ / this.cellSize);

        for (let x = minCellX; x <= maxCellX; x++) {
            for (let z = minCellZ; z <= maxCellZ; z++) {
                const key = `${x},${z}`;
                if (!this.grid.has(key)) {
                    this.grid.set(key, []);
                }
                this.grid.get(key).push(object);
                object.userData._spatialCells.push(key);
            }
        }
    }

    removeObject(object) {
        if (!object.userData?._spatialCells) return;

        for (const key of object.userData._spatialCells) {
            const cell = this.grid.get(key);
            if (!cell) continue;
            const index = cell.indexOf(object);
            if (index > -1) {
                cell.splice(index, 1);
            }
            if (cell.length === 0) {
                this.grid.delete(key);
            }
        }

        delete object.userData._spatialCells;
    }

    getObjectsInArea(minX, maxX, minZ, maxZ) {
        const objects = new Set();
        const minCellX = Math.floor(minX / this.cellSize);
        const maxCellX = Math.floor(maxX / this.cellSize);
        const minCellZ = Math.floor(minZ / this.cellSize);
        const maxCellZ = Math.floor(maxZ / this.cellSize);

        for (let x = minCellX; x <= maxCellX; x++) {
            for (let z = minCellZ; z <= maxCellZ; z++) {
                const key = `${x},${z}`;
                const cellObjects = this.grid.get(key);
                if (cellObjects) {
                    cellObjects.forEach(obj => objects.add(obj));
                }
            }
        }

        return Array.from(objects);
    }

    clear() {
        this.grid.clear();
    }
    
    dispose() {
        this.colliders = [];
        this.spatialGrid.clear();
    }
}

export class CollisionSystem {
    constructor() {
        this.colliders = [];
        this.groundHeight = 0;
        this.spatialGrid = new SpatialGrid(200);
        this.lineOfSightInterval = 1;
        this._lineOfSightFrame = 0;
    }

    setLineOfSightInterval(interval = 1) {
        this.lineOfSightInterval = Math.max(1, interval);
    }

    shouldCheckLineOfSight(entityId = 0) {
        return (this._lineOfSightFrame + entityId) % this.lineOfSightInterval === 0;
    }

    tickLineOfSightFrame() {
        this._lineOfSightFrame++;
    }

    addCollider(object) {
        cacheColliderBounds(object);
        this.colliders.push(object);
        this.spatialGrid.addObject(object);
    }

    removeCollider(object) {
        const index = this.colliders.indexOf(object);
        if (index > -1) {
            this.colliders.splice(index, 1);
            this.spatialGrid.removeObject(object);
        }
    }

    checkCollision(currentPos, newPos, radius, height) {
        _finalPos.copy(newPos);
        let onGround = false;

        if (_finalPos.y - height / 2 < this.groundHeight) {
            _finalPos.y = this.groundHeight + height / 2;
            onGround = true;
        }

        const searchRadius = radius + 10;
        const nearbyColliders = this.spatialGrid.getObjectsInArea(
            _finalPos.x - searchRadius,
            _finalPos.x + searchRadius,
            _finalPos.z - searchRadius,
            _finalPos.z + searchRadius
        );

        const verticalVelocity = newPos.y - currentPos.y;
        const isMovingDownward = verticalVelocity < 0;

        for (const collider of nearbyColliders) {
            const result = this.checkSphereCollider(_finalPos, radius, height, collider, isMovingDownward);
            _finalPos.copy(result.position);
            if (result.onGround) {
                onGround = true;
            }
        }

        return {
            position: _finalPos.clone(),
            onGround
        };
    }

    checkSphereCollider(position, radius, height, collider, isMovingDownward = false) {
        _finalPos.copy(position);
        let onGround = false;

        if (collider.userData && collider.userData.isGround) {
            return { position: _finalPos.clone(), onGround: false };
        }

        const bounds = collider.userData.collisionBounds;
        if (!bounds) {
            return { position: _finalPos.clone(), onGround: false };
        }

        _colliderMin.set(bounds.minX, bounds.minY, bounds.minZ);
        _colliderMax.set(bounds.maxX, bounds.maxY, bounds.maxZ);
        _center.set(bounds.centerX, bounds.centerY, bounds.centerZ);

        _playerMin.set(
            _finalPos.x - radius,
            _finalPos.y - height / 2,
            _finalPos.z - radius
        );
        _playerMax.set(
            _finalPos.x + radius,
            _finalPos.y + height / 2,
            _finalPos.z + radius
        );

        const horizontalOverlap = (
            _playerMin.x < _colliderMax.x &&
            _playerMax.x > _colliderMin.x &&
            _playerMin.z < _colliderMax.z &&
            _playerMax.z > _colliderMin.z
        );

        const playerFeetY = _finalPos.y - height / 2;
        const colliderTopY = _colliderMax.y;
        const distanceToTop = playerFeetY - colliderTopY;
        
        const playerHeadY = _finalPos.y + height / 2;
        const isAboveTop = playerHeadY > colliderTopY;
        
        const isIntersecting = (
            _playerMin.x < _colliderMax.x &&
            _playerMax.x > _colliderMin.x &&
            _playerMin.y < _colliderMax.y &&
            _playerMax.y > _colliderMin.y &&
            _playerMin.z < _colliderMax.z &&
            _playerMax.z > _colliderMin.z
        );

        if (horizontalOverlap) {
            const shouldStandOnTop = isAboveTop || 
                                    (distanceToTop >= -0.6 && distanceToTop <= 1.2) ||
                                    (isIntersecting && isMovingDownward && distanceToTop < 0 && distanceToTop > -height);
            
            if (shouldStandOnTop) {
                _finalPos.y = colliderTopY + height / 2;
                onGround = true;
            }
            else if (isIntersecting) {
                if (playerFeetY < colliderTopY - 0.1) {
                    const overlapX = Math.min(
                        Math.abs(_playerMax.x - _colliderMin.x),
                        Math.abs(_colliderMax.x - _playerMin.x)
                    );
                    const overlapZ = Math.min(
                        Math.abs(_playerMax.z - _colliderMin.z),
                        Math.abs(_colliderMax.z - _playerMin.z)
                    );

                    if (overlapX < overlapZ) {
                        if (_finalPos.x < _center.x) {
                            _finalPos.x = _colliderMin.x - radius;
                        } else {
                            _finalPos.x = _colliderMax.x + radius;
                        }
                    } else {
                        if (_finalPos.z < _center.z) {
                            _finalPos.z = _colliderMin.z - radius;
                        } else {
                            _finalPos.z = _colliderMax.z + radius;
                        }
                    }
                }
            }
        }
        else if (isIntersecting) {
            const overlapX = Math.min(
                Math.abs(_playerMax.x - _colliderMin.x),
                Math.abs(_colliderMax.x - _playerMin.x)
            );
            const overlapZ = Math.min(
                Math.abs(_playerMax.z - _colliderMin.z),
                Math.abs(_colliderMax.z - _playerMin.z)
            );

            if (overlapX < overlapZ) {
                if (_finalPos.x < _center.x) {
                    _finalPos.x = _colliderMin.x - radius;
                } else {
                    _finalPos.x = _colliderMax.x + radius;
                }
            } else {
                if (_finalPos.z < _center.z) {
                    _finalPos.z = _colliderMin.z - radius;
                } else {
                    _finalPos.z = _colliderMax.z + radius;
                }
            }
        }

        return {
            position: _finalPos.clone(),
            onGround
        };
    }

    /**
     * Check if a position is clear of colliders (for spawn validation)
     */
    isPositionClear(position, radius, height) {
        const searchRadius = radius + 5;
        const nearbyColliders = this.spatialGrid.getObjectsInArea(
            position.x - searchRadius,
            position.x + searchRadius,
            position.z - searchRadius,
            position.z + searchRadius
        );

        _playerMin.set(
            position.x - radius,
            position.y - height / 2,
            position.z - radius
        );
        _playerMax.set(
            position.x + radius,
            position.y + height / 2,
            position.z + radius
        );

        for (const collider of nearbyColliders) {
            if (collider.userData && collider.userData.isGround) {
                continue;
            }

            const bounds = collider.userData.collisionBounds;
            if (!bounds) continue;

            if (
                _playerMin.x < bounds.maxX &&
                _playerMax.x > bounds.minX &&
                _playerMin.y < bounds.maxY &&
                _playerMax.y > bounds.minY &&
                _playerMin.z < bounds.maxZ &&
                _playerMax.z > bounds.minZ
            ) {
                return false;
            }
        }

        return true;
    }

    /**
     * Find a clear spawn position near the desired position
     */
    findClearSpawnPosition(desiredPosition, radius, height, maxAttempts = 50) {
        let attempts = 0;
        let currentPos = desiredPosition.clone();
        
        // First check if desired position is clear
        if (this.isPositionClear(currentPos, radius, height)) {
            return currentPos;
        }

        // Try to find a clear position nearby
        const searchRadius = 5;
        const angleStep = (Math.PI * 2) / 8; // Try 8 directions
        
        for (let distance = searchRadius; distance < searchRadius * 10; distance += searchRadius) {
            for (let angle = 0; angle < Math.PI * 2; angle += angleStep) {
                attempts++;
                if (attempts > maxAttempts) {
                    // Fallback: return position far from center
                    return new THREE.Vector3(
                        desiredPosition.x + (Math.random() - 0.5) * 100,
                        0,
                        desiredPosition.z + (Math.random() - 0.5) * 100
                    );
                }

                const testPos = new THREE.Vector3(
                    desiredPosition.x + Math.cos(angle) * distance,
                    desiredPosition.y,
                    desiredPosition.z + Math.sin(angle) * distance
                );

                if (this.isPositionClear(testPos, radius, height)) {
                    return testPos;
                }
            }
        }

        // Fallback
        return desiredPosition.clone();
    }

    raycast(origin, direction, maxDistance = 1000) {
        _direction.copy(direction).normalize();
        _endPoint.copy(_direction).multiplyScalar(maxDistance).add(origin);

        const minX = Math.min(origin.x, _endPoint.x);
        const maxX = Math.max(origin.x, _endPoint.x);
        const minZ = Math.min(origin.z, _endPoint.z);
        const maxZ = Math.max(origin.z, _endPoint.z);

        const padding = 10;
        const nearbyColliders = this.spatialGrid.getObjectsInArea(
            minX - padding,
            maxX + padding,
            minZ - padding,
            maxZ + padding
        );

        let closestHit = null;

        for (const collider of nearbyColliders) {
            if (collider.userData && collider.userData.isGround) {
                continue;
            }

            const bounds = collider.userData.collisionBounds;
            if (!bounds) continue;

            const hit = intersectAABB(origin, _direction, bounds, maxDistance);
            if (!hit) continue;

            hit.object = collider;
            if (!closestHit || hit.distance < closestHit.distance) {
                closestHit = hit;
            }
        }

        return closestHit;
    }

    /**
     * Check bullet collision with world objects
     */
    checkBulletCollision(bulletPosition, bulletDirection, maxDistance = 100.0) {
        const hit = this.raycast(bulletPosition, bulletDirection, maxDistance);
        if (hit && hit.distance <= maxDistance) {
            const rootObject = hit.object;
            
            if (rootObject.userData) {
                if (rootObject.userData.isEnemy || rootObject.userData.team === 'blue' || rootObject.userData.team === 'red') {
                    return { hit: false, distance: hit.distance };
                }
            }
            
            return {
                hit: true,
                point: hit.point,
                object: rootObject,
                distance: hit.distance
            };
        }
        return { hit: false };
    }

    /**
     * Check line-of-sight from one position to another
     * Returns true if there's a clear line-of-sight (no world objects blocking)
     * Returns false if vision is blocked by world objects
     * Note: Enemies and allies don't block vision - only world objects (trees, buildings, walls, etc.)
     */
    checkLineOfSight(fromPosition, toPosition, eyeHeight = 1.0) {
        _direction.subVectors(toPosition, fromPosition);
        const distance = _direction.length();
        
        if (distance < 0.1) {
            return true;
        }
        
        _eyePosition.copy(fromPosition);
        _eyePosition.y += eyeHeight;
        
        _targetEyePosition.copy(toPosition);
        _targetEyePosition.y += 0.9;
        
        _eyeDirection.subVectors(_targetEyePosition, _eyePosition).normalize();
        const maxDistance = distance * 0.98;

        const hit = this.raycast(_eyePosition, _eyeDirection, maxDistance);
        if (!hit) {
            return true;
        }

        const rootObject = hit.object;
        if (rootObject.userData) {
            if (rootObject.userData.isEnemy || rootObject.userData.team === 'blue' || rootObject.userData.team === 'red') {
                return true;
            }
        }

        return false;
    }
}
