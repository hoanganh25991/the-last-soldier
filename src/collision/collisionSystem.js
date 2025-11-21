import * as THREE from 'three';

export class CollisionSystem {
    constructor() {
        this.colliders = [];
        this.groundHeight = 0;
    }

    addCollider(object) {
        this.colliders.push(object);
    }

    removeCollider(object) {
        const index = this.colliders.indexOf(object);
        if (index > -1) {
            this.colliders.splice(index, 1);
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

        // Check against all colliders
        for (const collider of this.colliders) {
            const result = this.checkSphereCollider(finalPos, radius, height, collider);
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

    checkSphereCollider(position, radius, height, collider) {
        let finalPos = position.clone();
        let onGround = false;

        if (collider.geometry) {
            const box = new THREE.Box3().setFromObject(collider);
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

            // Check collision
            if (
                playerMin.x < colliderMax.x &&
                playerMax.x > colliderMin.x &&
                playerMin.y < colliderMax.y &&
                playerMax.y > colliderMin.y &&
                playerMin.z < colliderMax.z &&
                playerMax.z > colliderMin.z
            ) {
                // Push out of collision
                const overlapX = Math.min(
                    Math.abs(playerMax.x - colliderMin.x),
                    Math.abs(colliderMax.x - playerMin.x)
                );
                const overlapZ = Math.min(
                    Math.abs(playerMax.z - colliderMin.z),
                    Math.abs(colliderMax.z - playerMin.z)
                );

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

                // Check if standing on top
                if (playerMax.y - height / 2 <= colliderMax.y + 0.1 && 
                    playerMax.y - height / 2 > colliderMax.y - 0.5) {
                    finalPos.y = colliderMax.y + height / 2;
                    onGround = true;
                }
            }
        }

        return {
            position: finalPos,
            onGround: onGround
        };
    }

    raycast(origin, direction, maxDistance = 1000) {
        const raycaster = new THREE.Raycaster(origin, direction, 0, maxDistance);
        const intersects = [];

        for (const collider of this.colliders) {
            const intersect = raycaster.intersectObject(collider, true);
            if (intersect.length > 0) {
                intersects.push(...intersect);
            }
        }

        if (intersects.length > 0) {
            intersects.sort((a, b) => a.distance - b.distance);
            return intersects[0];
        }

        return null;
    }
}

