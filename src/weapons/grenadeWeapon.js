import * as THREE from 'three';
import { WeaponBase } from './weaponBase.js';
import { WEAPON_ICONS } from '../config/weaponIcons.js';

export class GrenadeWeapon extends WeaponBase {
    constructor(camera, scene, teamManager, bulletManager, audioManager = null) {
        super(camera, scene, teamManager, bulletManager, audioManager);
        
        this.name = 'Grenade';
        this.icon = WEAPON_ICONS.grenade;
        this.damage = 100;
        this.fireRate = 30; // throws per minute (slow)
        this.maxAmmo = 3; // Limited grenades
        this.reserveAmmo = 0; // No reserve ammo
        this.reloadTime = 0; // No reload
        this.range = 30; // Throw range
        this.spread = 0;
        this.bulletSpeed = 15; // Throw speed
        
        // Grenade properties
        this.blastRadius = 5.0;
        this.fuseTime = 4.0; // seconds before explosion
        this.grenades = []; // Active grenades in the world
    }

    init() {
        super.init();
        this.createWeaponModel();
        this.currentAmmo = this.maxAmmo;
    }

    createWeaponModel() {
        // Create a simple grenade model
        const group = new THREE.Group();

        // Main body
        const bodyGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0, -0.2, -0.4);
        group.add(body);

        // Pin
        const pinGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.05, 8);
        const pinMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        const pin = new THREE.Mesh(pinGeometry, pinMaterial);
        pin.position.set(0.05, -0.15, -0.4);
        pin.rotation.z = Math.PI / 2;
        group.add(pin);

        // Position relative to camera
        group.position.set(0.2, -0.25, -0.5);
        group.rotation.x = 0.1;
        group.rotation.y = Math.PI / 2; // Rotate 90 degrees to aim forward
        
        this.weaponMesh = group;
        this.camera.add(group);
    }

    fire() {
        if (this.isReloading || this.currentAmmo <= 0) {
            return;
        }

        const now = Date.now() / 1000;
        if (now - this.lastFireTime < this.fireInterval) {
            return;
        }

        this.currentAmmo--;
        this.lastFireTime = now;

        // Get throw direction
        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        this.camera.getWorldPosition(worldPosition);
        this.camera.getWorldQuaternion(worldQuaternion);
        
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(worldQuaternion);
        
        // Add slight upward arc for throwing
        direction.y += 0.2;
        direction.normalize();

        // Create grenade object in the world
        this.throwGrenade(worldPosition, direction);
    }

    throwGrenade(startPosition, direction) {
        // Create grenade mesh
        const grenadeGroup = new THREE.Group();
        
        const bodyGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        grenadeGroup.add(body);

        // Pin
        const pinGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.05, 8);
        const pinMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        const pin = new THREE.Mesh(pinGeometry, pinMaterial);
        pin.position.set(0.05, 0, 0);
        pin.rotation.z = Math.PI / 2;
        grenadeGroup.add(pin);

        grenadeGroup.position.copy(startPosition);
        grenadeGroup.userData.isGrenade = true;
        grenadeGroup.userData.fuseTime = this.fuseTime;
        grenadeGroup.userData.damage = this.damage;
        grenadeGroup.userData.blastRadius = this.blastRadius;
        grenadeGroup.userData.teamManager = this.teamManager;
        
        this.scene.add(grenadeGroup);

        // Store grenade data
        const grenadeData = {
            mesh: grenadeGroup,
            velocity: direction.clone().multiplyScalar(this.bulletSpeed),
            startTime: Date.now() / 1000,
            fuseTime: this.fuseTime,
            damage: this.damage,
            blastRadius: this.blastRadius
        };

        this.grenades.push(grenadeData);

        // Set explosion timer
        setTimeout(() => {
            this.explodeGrenade(grenadeData);
        }, this.fuseTime * 1000);
    }

    explodeGrenade(grenadeData) {
        const position = grenadeData.mesh.position;
        
        // Remove grenade mesh
        if (grenadeData.mesh.parent) {
            grenadeData.mesh.parent.remove(grenadeData.mesh);
        }

        // Remove from active grenades
        const index = this.grenades.indexOf(grenadeData);
        if (index > -1) {
            this.grenades.splice(index, 1);
        }

        // Create explosion effect
        this.createExplosionEffect(position);

        // Damage enemies in blast radius
        const enemies = this.teamManager.getEnemies();
        for (const enemy of enemies) {
            const enemyPosition = new THREE.Vector3();
            enemy.getWorldPosition(enemyPosition);
            
            const distance = position.distanceTo(enemyPosition);
            if (distance <= grenadeData.blastRadius) {
                // Damage decreases with distance
                const damageMultiplier = 1 - (distance / grenadeData.blastRadius);
                const finalDamage = Math.floor(grenadeData.damage * damageMultiplier);
                this.teamManager.damageEnemy(enemy, finalDamage);
            }
        }
    }

    createExplosionEffect(position) {
        // Create explosion particles/effect
        const explosionGroup = new THREE.Group();
        
        // Main explosion sphere
        const explosionGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const explosionMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.8,
            emissive: 0xff3300,
            emissiveIntensity: 2.0
        });
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosionGroup.add(explosion);

        // Fire particles
        for (let i = 0; i < 20; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.9
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            const angle = (Math.PI * 2 * i) / 20;
            const radius = 0.3;
            particle.position.set(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                (Math.random() - 0.5) * 0.5
            );
            explosionGroup.add(particle);
        }

        explosionGroup.position.copy(position);
        this.scene.add(explosionGroup);

        // Animate and remove explosion
        let scale = 0.1;
        const animate = () => {
            scale += 0.1;
            explosionGroup.scale.set(scale, scale, scale);
            explosionMaterial.opacity = Math.max(0, 0.8 - scale * 0.2);
            
            if (scale < 3) {
                requestAnimationFrame(animate);
            } else {
                if (explosionGroup.parent) {
                    explosionGroup.parent.remove(explosionGroup);
                }
            }
        };
        animate();
    }

    update(deltaTime) {
        // Update grenade physics
        for (let i = this.grenades.length - 1; i >= 0; i--) {
            const grenade = this.grenades[i];
            
            // Apply gravity
            grenade.velocity.y -= 9.8 * deltaTime;
            
            // Update position
            const movement = grenade.velocity.clone().multiplyScalar(deltaTime);
            grenade.mesh.position.add(movement);
            
            // Rotate grenade for visual effect
            grenade.mesh.rotation.x += deltaTime * 5;
            grenade.mesh.rotation.y += deltaTime * 5;
            
            // Check ground collision (simple)
            if (grenade.mesh.position.y < 0.1) {
                grenade.mesh.position.y = 0.1;
                // Bounce or stop
                grenade.velocity.y *= -0.3;
                grenade.velocity.x *= 0.8;
                grenade.velocity.z *= 0.8;
                
                // Stop if velocity is very low
                if (Math.abs(grenade.velocity.y) < 0.5 && 
                    grenade.velocity.length() < 1) {
                    grenade.velocity.set(0, 0, 0);
                }
            }
        }

        // Handle firing
        if (this.isFiring && !this.isReloading) {
            this.fire();
        }
    }

    reload() {
        // Grenades don't reload
        return;
    }
}

