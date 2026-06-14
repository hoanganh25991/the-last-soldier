import * as THREE from 'three';
import { getPerformanceProfile } from '../config/performanceProfile.js';

export class LODTerrain {
    constructor(qualityLevel = 'medium') {
        this.mesh = null;
        this.qualityLevel = qualityLevel;
        this.profile = getPerformanceProfile(qualityLevel);
    }

    async init() {
        const lod = new THREE.LOD();
        const { segments, distances } = this.profile.terrainLod;
        const size = 5000;

        for (let i = 0; i < segments.length; i++) {
            const terrainMesh = this.createTerrainMesh(segments[i], size);
            lod.addLevel(terrainMesh, distances[i] ?? 0);
        }

        this.mesh = lod;
    }

    createTerrainMesh(segments, size) {
        const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
        
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
