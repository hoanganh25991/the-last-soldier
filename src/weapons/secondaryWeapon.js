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
    }

    init() {
        super.init();
        this.createWeaponModel();
        this.createMuzzleFlash();
    }

    createWeaponModel() {
        // Create a simple pistol model
        const group = new THREE.Group();

        // Barrel - oriented along Z axis (forward/backward) instead of X
        const barrelGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.3);
        const barrelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.position.set(0.15, -0.15, -0.25); // Adjusted Z position since barrel now extends along Z
        group.add(barrel);

        // Grip - oriented along Y axis (vertical)
        const gripGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.15);
        const gripMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const grip = new THREE.Mesh(gripGeometry, gripMaterial);
        grip.position.set(0, -0.25, -0.3); // Adjusted Z position
        group.add(grip);

        // Body - oriented along Z axis
        const bodyGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.25);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0.05, -0.15, -0.25); // Adjusted Z position
        group.add(body);

        // Position relative to camera
        group.position.set(0.25, -0.25, -0.5);
        group.rotation.x = 0.1;
        // No Y rotation needed - geometry is already oriented along Z axis (forward)
        
        this.weaponMesh = group;
        this.camera.add(group);
    }

    createMuzzleFlash() {
        if (!this.weaponMesh) return;
        
        // Create muzzle flash group
        const flashGroup = new THREE.Group();
        
        // Main flash - bright yellow/orange
        const flashGeometry = new THREE.SphereGeometry(0.12, 8, 8);
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
        const glowGeometry = new THREE.SphereGeometry(0.2, 8, 8);
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
        const coreGeometry = new THREE.SphereGeometry(0.06, 6, 6);
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
        // Position at pistol barrel end (barrel extends along Z, from -0.4 to -0.1, so end is at -0.1)
        this.muzzleFlash.position.set(0.15, -0.15, -0.1);
        this.weaponMesh.add(this.muzzleFlash);
    }
}

