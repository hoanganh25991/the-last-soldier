import * as THREE from 'three';
import { WeaponBase } from './weaponBase.js';

export class SecondaryWeapon extends WeaponBase {
    constructor(camera, scene, teamManager) {
        super(camera, scene, teamManager);
        
        this.name = 'Pistol';
        this.icon = '🔫';
        this.damage = 20;
        this.fireRate = 300; // rounds per minute
        this.maxAmmo = 12;
        this.reserveAmmo = 60;
        this.reloadTime = 1.5;
        this.range = 100;
        this.spread = 0.05;
    }

    init() {
        super.init();
        this.createWeaponModel();
    }

    createWeaponModel() {
        // Create a simple pistol model
        const group = new THREE.Group();

        // Barrel
        const barrelGeometry = new THREE.BoxGeometry(0.3, 0.08, 0.08);
        const barrelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.position.set(0.15, -0.15, -0.4);
        group.add(barrel);

        // Grip
        const gripGeometry = new THREE.BoxGeometry(0.15, 0.2, 0.1);
        const gripMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
        const grip = new THREE.Mesh(gripGeometry, gripMaterial);
        grip.position.set(0, -0.25, -0.4);
        group.add(grip);

        // Body
        const bodyGeometry = new THREE.BoxGeometry(0.25, 0.12, 0.12);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0.05, -0.15, -0.4);
        group.add(body);

        // Position relative to camera
        group.position.set(0.25, -0.25, -0.5);
        group.rotation.x = 0.1;
        
        this.weaponMesh = group;
        this.camera.add(group);
    }
}

