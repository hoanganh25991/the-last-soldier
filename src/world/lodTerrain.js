import * as THREE from 'three';

export class LODTerrain {
    constructor() {
        this.mesh = null;
        this.lodLevels = [];
        this.currentLOD = 0;
    }

    async init() {
        // Create LOD levels with different resolutions (100x bigger: 5000)
        const lod = new THREE.LOD();

        // High detail (close)
        const highDetail = this.createTerrainMesh(128, 5000);
        lod.addLevel(highDetail, 0);

        // Medium detail
        const mediumDetail = this.createTerrainMesh(64, 5000);
        lod.addLevel(mediumDetail, 3000);

        // Low detail (far)
        const lowDetail = this.createTerrainMesh(32, 5000);
        lod.addLevel(lowDetail, 6000);

        this.mesh = lod;
    }

    createTerrainMesh(segments, size) {
        const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
        
        // Simple height variation
        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            vertices[i + 1] = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2;
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();

        const material = new THREE.MeshLambertMaterial({ 
            color: 0x4a7c59,
            wireframe: false
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = true;
        
        return mesh;
    }

    update(camera) {
        if (this.mesh && camera) {
            this.mesh.update(camera);
        }
    }
}

