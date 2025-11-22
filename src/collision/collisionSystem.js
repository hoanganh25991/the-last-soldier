import * as THREE from 'three';

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
        const box = new THREE.Box3().setFromObject(object);
        const min = box.min;
        const max = box.max;

        // Get all cells this object overlaps
        const minCellX = Math.floor(min.x / this.cellSize);
        const maxCellX = Math.floor(max.x / this.cellSize);
        const minCellZ = Math.floor(min.z / this.cellSize);
        const maxCellZ = Math.floor(max.z / this.cellSize);

        for (let x = minCellX; x <= maxCellX; x++) {
            for (let z = minCellZ; z <= maxCellZ; z++) {
                const key = `${x},${z}`;
                if (!this.grid.has(key)) {
                    this.grid.set(key, []);
                }
                this.grid.get(key).push(object);
            }
        }
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
}

export class CollisionSystem {
    constructor() {
        this.colliders = [];
        this.groundHeight = 0;
        this.spatialGrid = new SpatialGrid(200); // 200 unit cells for spatial partitioning
    }

    addCollider(object) {
        this.colliders.push(object);
        // Add to spatial grid for efficient queries
        this.spatialGrid.addObject(object);
    }

    removeCollider(object) {
        const index = this.colliders.indexOf(object);
        if (index > -1) {
            this.colliders.splice(index, 1);
            // Rebuild spatial grid (simple approach - could be optimized)
            this.spatialGrid.clear();
            this.colliders.forEach(collider => {
                if (collider !== object) {
                    this.spatialGrid.addObject(collider);
                }
            });
        }
    }

    checkCollision(currentPos, newPos, radius, height) {
        let finalPos = newPos.clone();
        let onGround = false;

        // Ground collision
        if (finalPos.y - height / 2 < this.groundHeight) {
            finalPos.y = this.groundHeight + height / 2;
            onGround = true;
        }

        // Use spatial grid to get nearby colliders
        const searchRadius = radius + 10; // Add some padding
        const nearbyColliders = this.spatialGrid.getObjectsInArea(
            finalPos.x - searchRadius,
            finalPos.x + searchRadius,
            finalPos.z - searchRadius,
            finalPos.z + searchRadius
        );

        // Calculate vertical velocity to detect if falling/landing
        const verticalVelocity = newPos.y - currentPos.y;
        const isMovingDownward = verticalVelocity < 0;

        // Check against nearby colliders only
        for (const collider of nearbyColliders) {
            const result = this.checkSphereCollider(finalPos, radius, height, collider, currentPos, isMovingDownward);
            finalPos = result.position;
            if (result.onGround) {
                onGround = true;
            }
        }

        return {
            position: finalPos,
            onGround: onGround
        };
    }

    checkSphereCollider(position, radius, height, collider, previousPos = null, isMovingDownward = false) {
        let finalPos = position.clone();
        let onGround = false;

        // Skip ground plane collision (handled separately)
        if (collider.userData && collider.userData.isGround) {
            return { position: finalPos, onGround: false };
        }

        // Use Box3.setFromObject which works for groups, meshes, etc.
        // This traverses the object hierarchy and gets the bounding box
        const box = new THREE.Box3().setFromObject(collider);
        
        // Skip if bounding box is invalid (empty object)
        if (box.isEmpty()) {
            return { position: finalPos, onGround: false };
        }

        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Simple AABB collision
        const playerMin = new THREE.Vector3(
            finalPos.x - radius,
            finalPos.y - height / 2,
            finalPos.z - radius
        );
        const playerMax = new THREE.Vector3(
            finalPos.x + radius,
            finalPos.y + height / 2,
            finalPos.z + radius
        );

        const colliderMin = new THREE.Vector3(
            center.x - size.x / 2,
            center.y - size.y / 2,
            center.z - size.z / 2
        );
        const colliderMax = new THREE.Vector3(
            center.x + size.x / 2,
            center.y + size.y / 2,
            center.z + size.z / 2
        );

        // Check horizontal overlap (X and Z)
        const horizontalOverlap = (
            playerMin.x < colliderMax.x &&
            playerMax.x > colliderMin.x &&
            playerMin.z < colliderMax.z &&
            playerMax.z > colliderMin.z
        );

        // Check if player's feet are near or above the top of the collider
        const playerFeetY = finalPos.y - height / 2;
        const colliderTopY = colliderMax.y;
        const distanceToTop = playerFeetY - colliderTopY;
        
        // Check if landing/standing on top: horizontal overlap AND feet are near/above top surface
        // Use a more generous threshold to allow landing on top
        const landingThreshold = 0.8; // How close feet need to be to top surface (increased for better detection)
        const isNearTop = horizontalOverlap && 
                         distanceToTop >= -landingThreshold && 
                         distanceToTop <= landingThreshold;

        // Check if player is intersecting with the object
        const isIntersecting = (
            playerMin.x < colliderMax.x &&
            playerMax.x > colliderMin.x &&
            playerMin.y < colliderMax.y &&
            playerMax.y > colliderMin.y &&
            playerMin.z < colliderMax.z &&
            playerMax.z > colliderMin.z
        );

        // Priority 1: If near top surface and moving downward or already close, place on top
        if (isNearTop && (isMovingDownward || distanceToTop <= 0.2)) {
            finalPos.y = colliderTopY + height / 2;
            onGround = true;
        }
        // Priority 2: If intersecting and feet are above the top (but not too far), snap to top
        else if (isIntersecting && distanceToTop > -0.3 && distanceToTop < 0.5 && isMovingDownward) {
            finalPos.y = colliderTopY + height / 2;
            onGround = true;
        }
        // Priority 3: Otherwise, handle side collisions (push horizontally)
        else if (isIntersecting) {
            // Only push out horizontally, allow vertical movement
            const overlapX = Math.min(
                Math.abs(playerMax.x - colliderMin.x),
                Math.abs(colliderMax.x - playerMin.x)
            );
            const overlapZ = Math.min(
                Math.abs(playerMax.z - colliderMin.z),
                Math.abs(colliderMax.z - playerMin.z)
            );

            // Push out in the direction of least overlap
            if (overlapX < overlapZ) {
                if (finalPos.x < center.x) {
                    finalPos.x = colliderMin.x - radius;
                } else {
                    finalPos.x = colliderMax.x + radius;
                }
            } else {
                if (finalPos.z < center.z) {
                    finalPos.z = colliderMin.z - radius;
                } else {
                    finalPos.z = colliderMax.z + radius;
                }
            }
        }

        return {
            position: finalPos,
            onGround: onGround
        };
    }

    /**
     * Check if a position is clear of colliders (for spawn validation)
     */
    isPositionClear(position, radius, height) {
        const searchRadius = radius + 5; // Add padding
        const nearbyColliders = this.spatialGrid.getObjectsInArea(
            position.x - searchRadius,
            position.x + searchRadius,
            position.z - searchRadius,
            position.z + searchRadius
        );

        for (const collider of nearbyColliders) {
            if (collider.userData && collider.userData.isGround) {
                continue;
            }

            const box = new THREE.Box3().setFromObject(collider);
            if (box.isEmpty()) {
                continue;
            }

            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());

            const playerMin = new THREE.Vector3(
                position.x - radius,
                position.y - height / 2,
                position.z - radius
            );
            const playerMax = new THREE.Vector3(
                position.x + radius,
                position.y + height / 2,
                position.z + radius
            );

            const colliderMin = new THREE.Vector3(
                center.x - size.x / 2,
                center.y - size.y / 2,
                center.z - size.z / 2
            );
            const colliderMax = new THREE.Vector3(
                center.x + size.x / 2,
                center.y + size.y / 2,
                center.z + size.z / 2
            );

            // Check if there's any overlap
            if (
                playerMin.x < colliderMax.x &&
                playerMax.x > colliderMin.x &&
                playerMin.y < colliderMax.y &&
                playerMax.y > colliderMin.y &&
                playerMin.z < colliderMax.z &&
                playerMax.z > colliderMin.z
            ) {
                return false; // Position is not clear
            }
        }

        return true; // Position is clear
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
        const raycaster = new THREE.Raycaster(origin, direction, 0, maxDistance);
        const intersects = [];

        // Use spatial grid to get objects along ray path
        const endPoint = origin.clone().add(direction.clone().multiplyScalar(maxDistance));
        const minX = Math.min(origin.x, endPoint.x);
        const maxX = Math.max(origin.x, endPoint.x);
        const minZ = Math.min(origin.z, endPoint.z);
        const maxZ = Math.max(origin.z, endPoint.z);

        // Add padding to ensure we catch all objects along the path
        const padding = 10; // Add padding to account for object sizes
        const nearbyColliders = this.spatialGrid.getObjectsInArea(
            minX - padding, 
            maxX + padding, 
            minZ - padding, 
            maxZ + padding
        );

        for (const collider of nearbyColliders) {
            // Skip ground plane
            if (collider.userData && collider.userData.isGround) {
                continue;
            }
            
            const intersect = raycaster.intersectObject(collider, true);
            if (intersect.length > 0) {
                // Only include intersections within maxDistance
                for (const hit of intersect) {
                    if (hit.distance <= maxDistance) {
                        intersects.push(hit);
                    }
                }
            }
        }

        if (intersects.length > 0) {
            intersects.sort((a, b) => a.distance - b.distance);
            return intersects[0];
        }

        return null;
    }

    /**
     * Check bullet collision with world objects
     */
    checkBulletCollision(bulletPosition, bulletDirection, maxDistance = 100.0) {
        // Use raycast to check if bullet hits any world object
        // Use a longer distance to catch fast-moving bullets
        const hit = this.raycast(bulletPosition, bulletDirection, maxDistance);
        if (hit && hit.distance <= maxDistance) {
            // Check if it's a world object (not enemy/ally)
            // Traverse up the parent chain to find the root object
            let object = hit.object;
            let rootObject = object;
            
            // Find the root object by traversing up the parent chain
            while (object.parent && object.parent !== this.scene) {
                object = object.parent;
                // If this object has enemy/ally userData, it's the root we're looking for
                if (object.userData && (object.userData.isEnemy !== undefined || object.userData.team)) {
                    rootObject = object;
                    break;
                }
                // Otherwise, keep this as potential root (could be a tree group, house group, etc.)
                rootObject = object;
            }
            
            // Skip if it's an enemy or ally (they have userData.isEnemy or userData.team)
            if (rootObject.userData) {
                if (rootObject.userData.isEnemy || rootObject.userData.team === 'blue' || rootObject.userData.team === 'red') {
                    return { hit: false, distance: hit.distance }; // This is an enemy/ally, not a world object
                }
            }
            
            // It's a world object (house, tree, wall, etc.) - no userData or userData doesn't indicate enemy/ally
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
        // Calculate direction from origin to target
        const direction = new THREE.Vector3()
            .subVectors(toPosition, fromPosition);
        const distance = direction.length();
        
        if (distance < 0.1) {
            // Very close, consider it visible
            return true;
        }
        
        // Start raycast from eye level (soldier's eye height)
        const eyePosition = fromPosition.clone();
        eyePosition.y += eyeHeight;
        
        // Target at body center height (where targets are)
        const targetEyePosition = toPosition.clone();
        targetEyePosition.y += 0.9; // Body center height
        
        // Calculate direction from eye to target eye
        const eyeDirection = new THREE.Vector3()
            .subVectors(targetEyePosition, eyePosition)
            .normalize();
        
        // Cast ray and check all hits along the path
        // We need to check if any world object blocks before reaching the target
        const raycaster = new THREE.Raycaster(eyePosition, eyeDirection, 0, distance * 0.98); // 98% to account for target size
        const intersects = [];
        
        // Use spatial grid to get objects along ray path
        const endPoint = eyePosition.clone().add(eyeDirection.clone().multiplyScalar(distance * 0.98));
        const minX = Math.min(eyePosition.x, endPoint.x);
        const maxX = Math.max(eyePosition.x, endPoint.x);
        const minZ = Math.min(eyePosition.z, endPoint.z);
        const maxZ = Math.max(eyePosition.z, endPoint.z);
        
        const padding = 10;
        const nearbyColliders = this.spatialGrid.getObjectsInArea(
            minX - padding, 
            maxX + padding, 
            minZ - padding, 
            maxZ + padding
        );
        
        // Check all objects along the path
        for (const collider of nearbyColliders) {
            // Skip ground plane
            if (collider.userData && collider.userData.isGround) {
                continue;
            }
            
            const intersect = raycaster.intersectObject(collider, true);
            if (intersect.length > 0) {
                for (const hit of intersect) {
                    if (hit.distance <= distance * 0.98) {
                        intersects.push(hit);
                    }
                }
            }
        }
        
        if (intersects.length === 0) {
            // No hits means clear line-of-sight
            return true;
        }
        
        // Sort by distance to find the closest hit
        intersects.sort((a, b) => a.distance - b.distance);
        const closestHit = intersects[0];
        
        // Check if the closest hit is a world object (blocks vision) or enemy/ally (doesn't block)
        let object = closestHit.object;
        let rootObject = object;
        
        // Find the root object by traversing up the parent chain
        while (object.parent && object.parent !== this.scene) {
            object = object.parent;
            if (object.userData && (object.userData.isEnemy !== undefined || object.userData.team)) {
                rootObject = object;
                break;
            }
            rootObject = object;
        }
        
        // Check if it's an enemy or ally (they don't block vision)
        if (rootObject.userData) {
            if (rootObject.userData.isEnemy || rootObject.userData.team === 'blue' || rootObject.userData.team === 'red') {
                // This is an enemy/ally - they don't block vision
                // Check if there are any world objects before this hit
                for (let i = 1; i < intersects.length; i++) {
                    const hit = intersects[i];
                    let hitObject = hit.object;
                    let hitRoot = hitObject;
                    
                    while (hitObject.parent && hitObject.parent !== this.scene) {
                        hitObject = hitObject.parent;
                        if (hitObject.userData && (hitObject.userData.isEnemy !== undefined || hitObject.userData.team)) {
                            hitRoot = hitObject;
                            break;
                        }
                        hitRoot = hitObject;
                    }
                    
                    // If this hit is a world object (not enemy/ally), it's blocking vision
                    if (!hitRoot.userData || (!hitRoot.userData.isEnemy && hitRoot.userData.team !== 'blue' && hitRoot.userData.team !== 'red')) {
                        return false; // World object is blocking
                    }
                }
                // Only enemies/allies in the way, can see through them
                return true;
            }
        }
        
        // It's a world object (house, tree, wall, etc.) - blocks vision
        return false;
    }
}
