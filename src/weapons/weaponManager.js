import { PrimaryWeapon } from './primaryWeapon.js';
import { SecondaryWeapon } from './secondaryWeapon.js';
import { BulletManager } from './bulletManager.js';

export class WeaponManager {
    constructor(camera, scene, teamManager, audioManager = null) {
        this.camera = camera;
        this.scene = scene;
        this.teamManager = teamManager;
        this.audioManager = audioManager;
        
        this.bulletManager = new BulletManager(scene);
        
        this.primaryWeapon = null;
        this.secondaryWeapon = null;
        this.currentWeapon = null;
        this.weaponType = 'primary'; // 'primary' or 'secondary'
        
        this.initControls();
    }

    init() {
        // Create weapons with bullet manager and audio manager
        this.primaryWeapon = new PrimaryWeapon(this.camera, this.scene, this.teamManager, this.bulletManager, this.audioManager);
        this.secondaryWeapon = new SecondaryWeapon(this.camera, this.scene, this.teamManager, this.bulletManager, this.audioManager);
        
        this.primaryWeapon.init();
        this.secondaryWeapon.init();
        
        // Start with primary weapon
        this.switchWeapon('primary');
    }

    initControls() {
        // Fire button (for mobile/touch)
        const fireBtn = document.getElementById('btn-fire');
        if (fireBtn) {
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
        }

        // Mouse click handlers for desktop FPS (when pointer is locked)
        const handleMouseDown = (e) => {
            // Fire on left mouse button (button 0) when pointer is locked
            if (document.pointerLockElement && e.button === 0) {
                e.preventDefault();
                e.stopPropagation();
                this.startFiring();
            }
        };

        const handleMouseUp = (e) => {
            if (document.pointerLockElement && e.button === 0) {
                e.preventDefault();
                e.stopPropagation();
                this.stopFiring();
            }
        };

        // Add listeners to document for pointer lock mode
        document.addEventListener('mousedown', handleMouseDown, true);
        document.addEventListener('mouseup', handleMouseUp, true);
        
        // Also handle clicks on the game container canvas
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.addEventListener('mousedown', (e) => {
                // If pointer is locked, fire weapon
                if (document.pointerLockElement && e.button === 0) {
                    this.startFiring();
                }
            });
            gameContainer.addEventListener('mouseup', (e) => {
                if (document.pointerLockElement && e.button === 0) {
                    this.stopFiring();
                }
            });
        }

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
        
        // Update bullet manager
        if (this.bulletManager) {
            this.bulletManager.update(deltaTime);
            
            // Check bullet collisions with enemies
            const enemies = this.teamManager.getEnemies();
            this.bulletManager.checkCollisions(enemies, (enemy, damage, hitPosition) => {
                this.teamManager.damageEnemy(enemy, damage, hitPosition);
            });
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

