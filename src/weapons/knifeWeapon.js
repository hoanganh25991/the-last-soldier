import * as THREE from 'three';
import { WeaponBase } from './weaponBase.js';
import { WEAPON_ICONS } from '../config/weaponIcons.js';

export class KnifeWeapon extends WeaponBase {
    constructor(camera, scene, teamManager, bulletManager, audioManager = null) {
        super(camera, scene, teamManager, bulletManager, audioManager);
        
        this.name = 'Knife';
        this.icon = WEAPON_ICONS.knife;
        this.damage = 50;
        this.fireRate = 300; // attacks per minute (melee speed)
        this.maxAmmo = Infinity; // Melee weapons don't use ammo
        this.reserveAmmo = Infinity;
        this.reloadTime = 0; // No reload for melee
        this.range = 2.0; // Melee range in units
        this.spread = 0;
        this.bulletSpeed = 0; // Not applicable for melee
        
        // Melee attack state
        this.isAttacking = false;
        this.attackDuration = 0.3; // Attack animation duration in seconds
        this.attackStartTime = 0;
    }

    init() {
        super.init();
        this.createWeaponModel();
        this.currentAmmo = Infinity;
        this.reserveAmmo = Infinity;
    }

    createWeaponModel() {
        // Create a simple knife model
        const group = new THREE.Group();

        // Blade
        const bladeGeometry = new THREE.BoxGeometry(0.15, 0.02, 0.3);
        const bladeMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.set(0, -0.2, -0.4);
        group.add(blade);

        // Handle
        const handleGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.12);
        const handleMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.set(0, -0.2, -0.5);
        group.add(handle);

        // Guard
        const guardGeometry = new THREE.BoxGeometry(0.12, 0.02, 0.02);
        const guardMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const guard = new THREE.Mesh(guardGeometry, guardMaterial);
        guard.position.set(0, -0.2, -0.44);
        group.add(guard);

        // Position relative to camera
        group.position.set(0.2, -0.25, -0.5);
        group.rotation.x = 0.1;
        group.rotation.y = Math.PI / 2; // Rotate 90 degrees to aim forward
        
        this.weaponMesh = group;
        this.camera.add(group);
    }

    startFiring() {
        if (this.isAttacking) return; // Prevent spam attacks
        this.isFiring = true;
    }

    stopFiring() {
        // Melee attacks are instant, but we keep the flag for animation
        this.isFiring = false;
    }

    fire() {
        if (this.isReloading || this.isAttacking) {
            return;
        }

        const now = Date.now() / 1000;
        if (now - this.lastFireTime < this.fireInterval) {
            return;
        }

        this.isAttacking = true;
        this.attackStartTime = now;
        this.lastFireTime = now;

        // Melee attack animation - swing the knife
        if (this.weaponMesh) {
            const originalRotation = this.weaponMesh.rotation.z;
            this.weaponMesh.rotation.z = -0.5; // Swing animation
            
            setTimeout(() => {
                if (this.weaponMesh) {
                    this.weaponMesh.rotation.z = originalRotation;
                }
            }, 100);
        }

        // Raycast for melee hit detection
        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        this.camera.getWorldPosition(worldPosition);
        this.camera.getWorldQuaternion(worldQuaternion);
        
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(worldQuaternion);
        direction.normalize();

        const raycaster = new THREE.Raycaster(
            worldPosition,
            direction,
            0,
            this.range
        );

        // Check for enemies in melee range
        const enemies = this.teamManager.getEnemies();
        const intersects = raycaster.intersectObjects(enemies, true);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const enemy = hit.object.parent || hit.object;
            if (enemy && enemy.userData.isEnemy) {
                this.teamManager.damageEnemy(enemy, this.damage);
            }
        }

        // Reset attack state after animation
        setTimeout(() => {
            this.isAttacking = false;
        }, this.attackDuration * 1000);
    }

    update(deltaTime) {
        // Handle firing (respects fire rate)
        if (this.isFiring && !this.isReloading) {
            this.fire();
        }
        
        // Handle attack animation
        if (this.isAttacking) {
            const now = Date.now() / 1000;
            if (now - this.attackStartTime >= this.attackDuration) {
                this.isAttacking = false;
            }
        }
    }

    reload() {
        // Melee weapons don't reload
        return;
    }
}

