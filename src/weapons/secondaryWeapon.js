import * as THREE from 'three';
import { WeaponBase } from './weaponBase.js';
import { WEAPON_ICONS } from '../config/weaponIcons.js';

export class SecondaryWeapon extends WeaponBase {
    constructor(camera, scene, teamManager, bulletManager, audioManager = null) {
        super(camera, scene, teamManager, bulletManager, audioManager);
        
        this.name = 'Pistol';
        this.icon = WEAPON_ICONS.pistol;
        this.damage = 20;
        this.fireRate = 300; // rounds per minute
        this.maxAmmo = 12;
        this.reserveAmmo = 60;
        this.reloadTime = 1.5;
        this.range = 100;
        this.spread = 0.05;
        this.bulletSpeed = 60; // units per second (slower pistol bullet)
        
        // Different sound for pistol (can be overridden)
        this.bulletSoundUrl = 'sounds/pistol-shoot.mp3'; // Placeholder - user should add actual file
        
        // Pistol has less sway but snappy recoil
        this.swayIntensity = 0.012; // Less sway than rifle
        this.recoilAmount = 0.22; // Very strong recoil kick
        this.recoilRotation = 0.12; // Sharp upward kick
        this.basePosition = new THREE.Vector3(0.25, -0.25, -0.5); // Pistol position
    }

    init() {
        super.init();
        this.createWeaponModel();
        this.createMuzzleFlash();
    }

    createWeaponModel() {
        // Create a simple pistol model
        const group = new THREE.Group();

        // Barrel - rotate the geometry itself to point forward along Z
        // Create barrel extending along Z axis instead of X
        const barrelGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.3);
        const barrelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        // Position barrel so it extends forward (negative Z)
        barrel.position.set(0.25, -0.15, -0.55);
        group.add(barrel);

        // Grip - also extend along Z
        const gripGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.15);
        const gripMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const grip = new THREE.Mesh(gripGeometry, gripMaterial);
        grip.position.set(0.25, -0.25, -0.4);
        group.add(grip);

        // Body - also extend along Z
        const bodyGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.25);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0.25, -0.15, -0.45);
        group.add(body);

        // Position relative to camera - NO Y ROTATION NEEDED since geometry extends along Z
        group.position.set(0.25, -0.25, -0.5);
        group.rotation.x = 0.1;
        // Geometry already points forward (along -Z), no rotation needed
        
        this.weaponMesh = group;
        this.camera.add(group);
    }

    createMuzzleFlash() {
        if (!this.weaponMesh) return;
        
        // Create muzzle flash group
        const flashGroup = new THREE.Group();
        
        // Main flash - bright yellow/orange
        const flashGeometry = new THREE.SphereGeometry(0.12, 8, 8);
        const flashMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.9,
            emissive: 0xffff00,
            emissiveIntensity: 2.0
        });
        const mainFlash = new THREE.Mesh(flashGeometry, flashMaterial);
        flashGroup.add(mainFlash);
        
        // Outer glow - orange
        const glowGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const glowMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff6600,
            transparent: true,
            opacity: 0.6,
            emissive: 0xff6600,
            emissiveIntensity: 1.5
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        flashGroup.add(glow);
        
        // Bright core - white
        const coreGeometry = new THREE.SphereGeometry(0.06, 6, 6);
        const coreMaterial = new THREE.MeshStandardMaterial({ 
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
        // Position at pistol barrel end (barrel extends along Z, forward end is at -Z)
        // Barrel center at Z=-0.55, extends 0.3 along Z, so forward end at Z=-0.55-0.15=-0.7
        this.muzzleFlash.position.set(0.25, -0.15, -0.7);
        this.weaponMesh.add(this.muzzleFlash);
    }
}

