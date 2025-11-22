import * as THREE from 'three';
import { WeaponBase } from './weaponBase.js';
import { WEAPON_ICONS } from '../config/weaponIcons.js';

export class PrimaryWeapon extends WeaponBase {
    constructor(camera, scene, teamManager, bulletManager, audioManager = null) {
        super(camera, scene, teamManager, bulletManager, audioManager);
        
        this.name = 'Rifle';
        this.icon = WEAPON_ICONS.longGun;
        this.damage = 30;
        this.fireRate = 600; // rounds per minute
        this.maxAmmo = 32;
        this.reserveAmmo = 288;
        this.reloadTime = 2.5;
        this.range = 200;
        this.spread = 0.02;
        this.bulletSpeed = 100; // units per second (fast rifle bullet)
        
        // Rifle sound (can be overridden)
        this.bulletSoundUrl = 'sounds/rifle-shoot.mp3'; // Placeholder - user should add actual file
    }

    init() {
        super.init();
        this.createWeaponModel();
        this.createMuzzleFlash();
    }

    createWeaponModel() {
        // Create a simple rifle model
        const group = new THREE.Group();

        // Barrel - rotate the geometry itself to point forward along Z
        // Create barrel extending along Z axis instead of X
        const barrelGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.8);
        const barrelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        // Position barrel so it extends forward (negative Z)
        barrel.position.set(0.3, -0.2, -0.9);
        group.add(barrel);

        // Stock - also extend along Z
        const stockGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.3);
        const stockMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const stock = new THREE.Mesh(stockGeometry, stockMaterial);
        stock.position.set(0.3, -0.15, -0.5);
        group.add(stock);

        // Body - also extend along Z
        const bodyGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.6);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0.3, -0.2, -0.7);
        group.add(body);

        // Position relative to camera - NO Y ROTATION NEEDED since geometry extends along Z
        group.position.set(0.3, -0.3, -0.6);
        group.rotation.x = 0.1;
        // Geometry already points forward (along -Z), no rotation needed
        
        this.weaponMesh = group;
        this.camera.add(group);
    }
}

