import * as THREE from 'three';

export class WeaponBase {
    constructor(camera, scene, teamManager, bulletManager, audioManager = null) {
        this.camera = camera;
        this.scene = scene;
        this.teamManager = teamManager;
        this.bulletManager = bulletManager;
        this.audioManager = audioManager;
        
        this.weaponMesh = null;
        this.currentAmmo = 0;
        this.reserveAmmo = 0;
        this.isFiring = false;
        this.isReloading = false;
        this.lastFireTime = 0;
        this.fireInterval = 0;
        
        // Muzzle flash
        this.muzzleFlash = null;
        
        // Bullet speed (default, can be overridden)
        this.bulletSpeed = 50;
        
        // Bullet sound URL (can be overridden by subclasses)
        this.bulletSoundUrl = 'sounds/bullet-shoot.mp3'; // Placeholder - user should add actual file
    }

    init() {
        this.currentAmmo = this.maxAmmo;
        this.fireInterval = 60 / this.fireRate; // Convert RPM to seconds
        // Muzzle flash will be created after weapon mesh is created
    }

    createMuzzleFlash() {
        if (!this.weaponMesh) return;
        
        // Create muzzle flash group
        const flashGroup = new THREE.Group();
        
        // Main flash - bright yellow/orange
        const flashGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.9,
            emissive: 0xffff00,
            emissiveIntensity: 2.0
        });
        const mainFlash = new THREE.Mesh(flashGeometry, flashMaterial);
        flashGroup.add(mainFlash);
        
        // Outer glow - orange
        const glowGeometry = new THREE.SphereGeometry(0.25, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff6600,
            transparent: true,
            opacity: 0.6,
            emissive: 0xff6600,
            emissiveIntensity: 1.5
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        flashGroup.add(glow);
        
        // Bright core - white
        const coreGeometry = new THREE.SphereGeometry(0.08, 6, 6);
        const coreMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 1.0,
            emissive: 0xffffff,
            emissiveIntensity: 3.0
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        flashGroup.add(core);
        
        this.muzzleFlash = flashGroup;
        this.muzzleFlash.visible = false;
        // Position at barrel end - barrel extends along Z, forward end is at -Z
        // Barrel center at Z=-0.9, extends 0.8 along Z, so forward end at Z=-0.9-0.4=-1.3
        this.muzzleFlash.position.set(0.3, -0.2, -1.3);
        this.weaponMesh.add(this.muzzleFlash);
    }

    show() {
        if (this.weaponMesh) {
            this.weaponMesh.visible = true;
        }
    }

    hide() {
        if (this.weaponMesh) {
            this.weaponMesh.visible = false;
        }
    }

    startFiring() {
        this.isFiring = true;
    }

    stopFiring() {
        this.isFiring = false;
        if (this.muzzleFlash) {
            this.muzzleFlash.visible = false;
        }
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

        // Muzzle flash - enhanced visibility
        if (this.muzzleFlash) {
            this.muzzleFlash.visible = true;
            // Scale animation for flash effect
            this.muzzleFlash.scale.set(1, 1, 1);
            setTimeout(() => {
                if (this.muzzleFlash) {
                    this.muzzleFlash.scale.set(1.5, 1.5, 1.5);
                }
            }, 10);
            setTimeout(() => {
                if (this.muzzleFlash) {
                    this.muzzleFlash.visible = false;
                    this.muzzleFlash.scale.set(1, 1, 1);
                }
            }, 80);
        }

        // Raycast for hit detection
        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        this.camera.getWorldPosition(worldPosition);
        this.camera.getWorldQuaternion(worldQuaternion);
        
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(worldQuaternion);
        
        // Add spread
        const spreadX = (Math.random() - 0.5) * this.spread;
        const spreadY = (Math.random() - 0.5) * this.spread;
        direction.x += spreadX;
        direction.y += spreadY;
        direction.normalize();

        const raycaster = new THREE.Raycaster(
            worldPosition,
            direction,
            0,
            this.range
        );

        // Play bullet sound (optimized with pooling and rate limiting)
        if (this.audioManager) {
            this.audioManager.playBulletSound(this.bulletSoundUrl, 0.4);
        }

        // Create visible bullet
        if (this.bulletManager) {
            let bulletStart = worldPosition.clone();
            
            // Get muzzle flash position in world space for bullet origin
            if (this.muzzleFlash && this.weaponMesh) {
                const muzzleWorldPosition = new THREE.Vector3();
                this.muzzleFlash.getWorldPosition(muzzleWorldPosition);
                bulletStart = muzzleWorldPosition;
            } else {
                // Fallback: offset bullet start slightly forward from camera
                bulletStart.add(direction.clone().multiplyScalar(0.5));
            }
            
            this.bulletManager.createBullet(
                bulletStart,
                direction,
                this.bulletSpeed,
                this.range,
                this.damage
            );
        }

        // Also do instant raycast for immediate hit detection
        const enemies = this.teamManager.getEnemies();
        const intersects = raycaster.intersectObjects(enemies, true);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const enemy = hit.object.parent || hit.object;
            if (enemy && enemy.userData.isEnemy) {
                this.teamManager.damageEnemy(enemy, this.damage);
            }
        }
    }

    reload() {
        if (this.isReloading || this.currentAmmo >= this.maxAmmo || this.reserveAmmo <= 0) {
            return;
        }

        this.isReloading = true;
        
        setTimeout(() => {
            const needed = this.maxAmmo - this.currentAmmo;
            const available = Math.min(needed, this.reserveAmmo);
            this.currentAmmo += available;
            this.reserveAmmo -= available;
            this.isReloading = false;
        }, this.reloadTime * 1000);
    }

    update(deltaTime) {
        if (this.isFiring && !this.isReloading) {
            this.fire();
        }

        // Auto-reload if empty
        if (this.currentAmmo <= 0 && this.reserveAmmo > 0 && !this.isReloading) {
            this.reload();
        }
    }
}

