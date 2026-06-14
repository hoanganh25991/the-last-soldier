import * as THREE from 'three';

const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _euler = new THREE.Euler();

function applyPartTransform(geometry, part) {
    _position.copy(part.position || _position.set(0, 0, 0));

    if (part.rotation) {
        if (part.rotation.isEuler) {
            _euler.copy(part.rotation);
        } else {
            _euler.set(part.rotation.x || 0, part.rotation.y || 0, part.rotation.z || 0);
        }
        _quaternion.setFromEuler(_euler);
    } else {
        _quaternion.identity();
    }

    _matrix.compose(_position, _quaternion, _scale);
    geometry.applyMatrix4(_matrix);
}

function mergeBufferGeometries(geometries) {
    let totalVertices = 0;
    let totalIndices = 0;
    let hasNormals = true;

    for (const geometry of geometries) {
        totalVertices += geometry.attributes.position.count;
        if (geometry.index) {
            totalIndices += geometry.index.count;
        } else {
            totalIndices += geometry.attributes.position.count;
        }
        if (!geometry.attributes.normal) {
            hasNormals = false;
        }
    }

    const positions = new Float32Array(totalVertices * 3);
    const normals = hasNormals ? new Float32Array(totalVertices * 3) : null;
    const indices = new Array(totalIndices);

    let vertexOffset = 0;
    let indexOffset = 0;

    for (const geometry of geometries) {
        const positionAttr = geometry.attributes.position;
        positions.set(positionAttr.array, vertexOffset * 3);

        if (normals && geometry.attributes.normal) {
            normals.set(geometry.attributes.normal.array, vertexOffset * 3);
        }

        if (geometry.index) {
            const indexArray = geometry.index.array;
            for (let i = 0; i < indexArray.length; i++) {
                indices[indexOffset++] = indexArray[i] + vertexOffset;
            }
        } else {
            const count = positionAttr.count;
            for (let i = 0; i < count; i++) {
                indices[indexOffset++] = vertexOffset + i;
            }
        }

        vertexOffset += positionAttr.count;
    }

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    if (normals) {
        merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    }
    merged.setIndex(indices);
    return merged;
}

/**
 * Merge mesh parts that share a material into one BufferGeometry per material.
 * Returns ready-to-add THREE.Mesh instances.
 */
export function mergePartsByMaterial(parts) {
    const buckets = new Map();

    for (const part of parts) {
        const material = part.material;
        if (!material) continue;

        const key = material.uuid;
        if (!buckets.has(key)) {
            buckets.set(key, {
                material,
                casterType: part.casterType || 'medium',
                castShadow: !!part.castShadow,
                receiveShadow: part.receiveShadow !== false,
                geometries: []
            });
        }

        const bucket = buckets.get(key);
        if (part.casterType === 'small') {
            bucket.casterType = 'small';
            bucket.castShadow = false;
        }

        const geometry = part.geometry.clone();
        applyPartTransform(geometry, part);
        bucket.geometries.push(geometry);
    }

    const meshes = [];

    for (const bucket of buckets.values()) {
        if (bucket.geometries.length === 0) continue;

        const mergedGeometry = bucket.geometries.length === 1
            ? bucket.geometries[0]
            : mergeBufferGeometries(bucket.geometries);

        if (bucket.geometries.length > 1) {
            for (const geometry of bucket.geometries) {
                geometry.dispose();
            }
        }

        const mesh = new THREE.Mesh(mergedGeometry, bucket.material);
        mesh.castShadow = bucket.castShadow;
        mesh.receiveShadow = bucket.receiveShadow;
        mesh.userData.shadowCasterType = bucket.casterType;
        mesh.userData._originalCastShadow = bucket.castShadow;
        meshes.push(mesh);
    }

    return meshes;
}

export function disposeGeometries(geometries) {
    for (const geometry of geometries) {
        geometry?.dispose?.();
    }
}
