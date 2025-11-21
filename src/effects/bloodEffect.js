import * as THREE from 'three';

export class BloodEffect {
    constructor(position, scene) {
        this.position = position.clone();
        this.scene = scene;
        this.particles = [];
        this.isActive = true;
        
        this.createParticles();
    }

    createParticles() {
        // Create blood particles
        const particleCount = 20;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const velocities = [];

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random position around hit point
            positions[i3] = this.position.x + (Math.random() - 0.5) * 0.5;
            positions[i3 + 1] = this.position.y + (Math.random() - 0.5) * 0.5;
            positions[i3 + 2] = this.position.z + (Math.random() - 0.5) * 0.5;
            
            // Red color
            colors[i3] = 0.8 + Math.random() * 0.2; // R
            colors[i3 + 1] = Math.random() * 0.2; // G
            colors[i3 + 2] = Math.random() * 0.1; // B
            
            // Random velocity
            velocities.push({
                x: (Math.random() - 0.5) * 5,
                y: Math.random() * 3 + 1,
                z: (Math.random() - 0.5) * 5
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 1.0
        });

        this.particleSystem = new THREE.Points(geometry, material);
        this.scene.add(this.particleSystem);
        this.velocities = velocities;
        this.lifetime = 1.0; // 1 second
    }

    update(deltaTime) {
        if (!this.isActive) return;

        this.lifetime -= deltaTime;
        
        if (this.lifetime <= 0) {
            this.destroy();
            return;
        }

        // Update particle positions
        const positions = this.particleSystem.geometry.attributes.position.array;
        for (let i = 0; i < this.velocities.length; i++) {
            const i3 = i * 3;
            positions[i3] += this.velocities[i].x * deltaTime;
            positions[i3 + 1] += this.velocities[i].y * deltaTime - 9.8 * deltaTime * deltaTime; // Gravity
            positions[i3 + 2] += this.velocities[i].z * deltaTime;
            
            // Damping
            this.velocities[i].x *= 0.95;
            this.velocities[i].y *= 0.95;
            this.velocities[i].z *= 0.95;
        }
        
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
        
        // Fade out
        const opacity = this.lifetime;
        this.particleSystem.material.opacity = opacity;
    }

    destroy() {
        if (this.particleSystem) {
            this.scene.remove(this.particleSystem);
            this.particleSystem.geometry.dispose();
            this.particleSystem.material.dispose();
        }
        this.isActive = false;
    }
}

