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

    async init() {
        // Create weapons with bullet manager and audio manager
        this.primaryWeapon = new PrimaryWeapon(this.camera, this.scene, this.teamManager, this.bulletManager, this.audioManager);
        this.secondaryWeapon = new SecondaryWeapon(this.camera, this.scene, this.teamManager, this.bulletManager, this.audioManager);
        
        this.primaryWeapon.init();
        this.secondaryWeapon.init();
        
        // Preload weapon sounds to avoid network requests on each shot
        // CRITICAL: Wait for preloading to complete before continuing
        if (this.audioManager) {
            const soundsToPreload = [
                this.primaryWeapon.bulletSoundUrl,
                this.secondaryWeapon.bulletSoundUrl,
                'sounds/bullet-shoot.mp3' // Fallback
            ];
            
            // Preload all sounds in parallel and wait for completion
            await Promise.allSettled(
                soundsToPreload.map(url => 
                    this.audioManager.preloadSound(url).catch(() => {
                        // Silently fail - sound will be skipped if not found
                    })
                )
            );
            
            console.log('Weapon sounds preloaded - ready to fire without network requests');
        }
        
        // Start with primary weapon
        this.switchWeapon('primary');
        
        // Initialize UI to show both weapons
        this.updateUI();
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

        // Weapon switch (click on weapon slots)
        const weaponSwitch = document.getElementById('weapon-switch');
        if (weaponSwitch) {
            weaponSwitch.addEventListener('click', (e) => {
                const weaponSlot = e.target.closest('.weapon-slot');
                if (weaponSlot) {
                    const weaponType = weaponSlot.dataset.weaponType;
                    if (weaponType && weaponType !== this.weaponType) {
                        this.switchWeapon(weaponType);
                    }
                }
            });
        }
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
        const primaryIcon = document.getElementById('weapon-icon-primary');
        const secondaryIcon = document.getElementById('weapon-icon-secondary');
        const primarySlot = document.getElementById('weapon-slot-primary');
        const secondarySlot = document.getElementById('weapon-slot-secondary');

        // Update weapon icons
        if (this.primaryWeapon && primaryIcon) {
            primaryIcon.textContent = this.primaryWeapon.icon;
        }
        if (this.secondaryWeapon && secondaryIcon) {
            secondaryIcon.textContent = this.secondaryWeapon.icon;
        }

        // Update active weapon slot
        if (primarySlot && secondarySlot) {
            if (this.weaponType === 'primary') {
                primarySlot.classList.add('active');
                secondarySlot.classList.remove('active');
            } else {
                primarySlot.classList.remove('active');
                secondarySlot.classList.add('active');
            }
        }

        // Update ammo display
        if (this.currentWeapon) {
            if (ammoCurrent) ammoCurrent.textContent = this.currentWeapon.currentAmmo;
            if (ammoReserve) ammoReserve.textContent = this.currentWeapon.reserveAmmo;
        }
    }
}

