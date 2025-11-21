import * as THREE from 'three';

export class WeaponBase {
    constructor(camera, scene, teamManager, bulletManager) {
        this.camera = camera;
        this.scene = scene;
        this.teamManager = teamManager;
        this.bulletManager = bulletManager;
        
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
    }

    init() {
        this.currentAmmo = this.maxAmmo;
        this.fireInterval = 60 / this.fireRate; // Convert RPM to seconds
        // Muzzle flash will be created after weapon mesh is created
    }

    createMuzzleFlash() {
        if (!this.weaponMesh) return;
        
        const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        this.muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
        this.muzzleFlash.visible = false;
        this.muzzleFlash.position.set(0.4, -0.2, -0.5); // Position at barrel end
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

        // Muzzle flash
        if (this.muzzleFlash) {
            this.muzzleFlash.visible = true;
            setTimeout(() => {
                if (this.muzzleFlash) {
                    this.muzzleFlash.visible = false;
                }
            }, 50);
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

        // Create visible bullet
        if (this.bulletManager) {
            const bulletStart = worldPosition.clone();
            // Offset bullet start slightly forward from camera
            bulletStart.add(direction.clone().multiplyScalar(0.5));
            
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

