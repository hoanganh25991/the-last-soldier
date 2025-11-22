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
        this.reloadTime = 2.0;
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

        // Gun holder/hand grip - add a hand-like holder (more visible)
        const holderGeometry = new THREE.BoxGeometry(0.15, 0.2, 0.25);
        const holderMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 }); // Brown color for grip
        const holder = new THREE.Mesh(holderGeometry, holderMaterial);
        holder.position.set(0.3, -0.3, -0.65);
        holder.castShadow = true;
        group.add(holder);
        
        // Add a trigger guard for more realism (using box geometry)
        const triggerGuardGeometry = new THREE.BoxGeometry(0.12, 0.05, 0.08);
        const triggerGuardMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const triggerGuard = new THREE.Mesh(triggerGuardGeometry, triggerGuardMaterial);
        triggerGuard.position.set(0.3, -0.25, -0.6);
        group.add(triggerGuard);

        // Foregrip/handguard - front grip area
        const foregripGeometry = new THREE.BoxGeometry(0.1, 0.12, 0.25);
        const foregripMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const foregrip = new THREE.Mesh(foregripGeometry, foregripMaterial);
        foregrip.position.set(0.3, -0.22, -1.0);
        group.add(foregrip);

        // Position relative to camera - NO Y ROTATION NEEDED since geometry extends along Z
        group.position.set(0.3, -0.3, -0.6);
        group.rotation.x = 0.1;
        // Geometry already points forward (along -Z), no rotation needed
        
        this.weaponMesh = group;
        this.camera.add(group);
    }
}

