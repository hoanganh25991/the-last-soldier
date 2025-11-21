import { PrimaryWeapon } from './primaryWeapon.js';
import { SecondaryWeapon } from './secondaryWeapon.js';

export class WeaponManager {
    constructor(camera, scene, teamManager) {
        this.camera = camera;
        this.scene = scene;
        this.teamManager = teamManager;
        
        this.primaryWeapon = null;
        this.secondaryWeapon = null;
        this.currentWeapon = null;
        this.weaponType = 'primary'; // 'primary' or 'secondary'
        
        this.initControls();
    }

    init() {
        // Create weapons
        this.primaryWeapon = new PrimaryWeapon(this.camera, this.scene, this.teamManager);
        this.secondaryWeapon = new SecondaryWeapon(this.camera, this.scene, this.teamManager);
        
        this.primaryWeapon.init();
        this.secondaryWeapon.init();
        
        // Start with primary weapon
        this.switchWeapon('primary');
    }

    initControls() {
        // Fire button
        const fireBtn = document.getElementById('btn-fire');
        fireBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startFiring();
        });
        fireBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.stopFiring();
        });
        fireBtn.addEventListener('mousedown', () => this.startFiring());
        fireBtn.addEventListener('mouseup', () => this.stopFiring());

        // Reload button
        const reloadBtn = document.getElementById('btn-reload');
        reloadBtn.addEventListener('click', () => this.reload());

        // Weapon switch (1 for primary, 2 for secondary)
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Digit1') this.switchWeapon('primary');
            if (e.code === 'Digit2') this.switchWeapon('secondary');
        });

        // Touch weapon switch (double tap on weapon icon)
        let lastTap = 0;
        const weaponIcon = document.getElementById('weapon-icon');
        weaponIcon.addEventListener('click', () => {
            const now = Date.now();
            if (now - lastTap < 300) {
                this.switchWeapon(this.weaponType === 'primary' ? 'secondary' : 'primary');
            }
            lastTap = now;
        });
    }

    switchWeapon(type) {
        if (this.currentWeapon) {
            this.currentWeapon.hide();
        }

        this.weaponType = type;
        this.currentWeapon = type === 'primary' ? this.primaryWeapon : this.secondaryWeapon;
        
        this.currentWeapon.show();
        this.updateUI();
    }

    startFiring() {
        if (this.currentWeapon) {
            this.currentWeapon.startFiring();
        }
    }

    stopFiring() {
        if (this.currentWeapon) {
            this.currentWeapon.stopFiring();
        }
    }

    reload() {
        if (this.currentWeapon) {
            this.currentWeapon.reload();
        }
    }

    update(deltaTime) {
        if (this.currentWeapon) {
            this.currentWeapon.update(deltaTime);
        }
    }

    updateUI() {
        const ammoCurrent = document.getElementById('ammo-current');
        const ammoReserve = document.getElementById('ammo-reserve');
        const weaponIcon = document.getElementById('weapon-icon');

        if (this.currentWeapon) {
            ammoCurrent.textContent = this.currentWeapon.currentAmmo;
            ammoReserve.textContent = this.currentWeapon.reserveAmmo;
            weaponIcon.textContent = this.currentWeapon.icon;
        }
    }
}

