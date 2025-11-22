import { PrimaryWeapon } from './primaryWeapon.js';
import { SecondaryWeapon } from './secondaryWeapon.js';
import { KnifeWeapon } from './knifeWeapon.js';
import { GrenadeWeapon } from './grenadeWeapon.js';
import { BulletManager } from './bulletManager.js';
import { WEAPON_ICONS, getWeaponIcon } from '../config/weaponIcons.js';

export class WeaponManager {
    constructor(camera, scene, teamManager, audioManager = null) {
        this.camera = camera;
        this.scene = scene;
        this.teamManager = teamManager;
        this.audioManager = audioManager;
        
        this.bulletManager = new BulletManager(scene);
        
        this.primaryWeapon = null;
        this.secondaryWeapon = null;
        this.gadgetWeapons = {}; // Map of gadget names to weapon instances
        this.currentWeapon = null;
        this.weaponType = 'primary'; // 'primary', 'secondary', or 'gadget'
        this.selectedGadget = 'Knife'; // Default gadget
        
        this.initControls();
    }

    async init() {
        // Create weapons with bullet manager and audio manager
        this.primaryWeapon = new PrimaryWeapon(this.camera, this.scene, this.teamManager, this.bulletManager, this.audioManager);
        this.secondaryWeapon = new SecondaryWeapon(this.camera, this.scene, this.teamManager, this.bulletManager, this.audioManager);
        
        this.primaryWeapon.init();
        this.secondaryWeapon.init();
        
        // Hide secondary weapon initially - only show primary
        if (this.secondaryWeapon && this.secondaryWeapon.hide) {
            this.secondaryWeapon.hide();
        }
        
        // Create gadget weapons
        this.gadgetWeapons['Knife'] = new KnifeWeapon(this.camera, this.scene, this.teamManager, this.bulletManager, this.audioManager);
        this.gadgetWeapons['Grenade'] = new GrenadeWeapon(this.camera, this.scene, this.teamManager, this.bulletManager, this.audioManager);
        
        this.gadgetWeapons['Knife'].init();
        this.gadgetWeapons['Grenade'].init();
        
        // Hide all gadget weapons initially
        Object.values(this.gadgetWeapons).forEach(weapon => {
            if (weapon && weapon.hide) {
                weapon.hide();
            }
        });
        
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

        // Weapon switch (1 for primary, 2 for secondary, 3 for gadget)
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Digit1') this.switchWeapon('primary');
            if (e.code === 'Digit2') this.switchWeapon('secondary');
            if (e.code === 'Digit3') this.switchWeapon('gadget');
            // Reload with 'R' key
            if (e.code === 'KeyR') {
                e.preventDefault();
                this.reload();
            }
        });

        // Weapon switch (click on weapon icon) - cycles through primary -> secondary -> gadget -> primary
        const weaponIcon = document.getElementById('weapon-icon');
        if (weaponIcon) {
            weaponIcon.addEventListener('click', () => {
                if (this.weaponType === 'primary') {
                    this.switchWeapon('secondary');
                } else if (this.weaponType === 'secondary') {
                    this.switchWeapon('gadget');
                } else {
                    this.switchWeapon('primary');
                }
            });
        }
    }

    switchWeapon(type) {
        // Hide current weapon
        if (this.currentWeapon && this.currentWeapon.hide) {
            this.currentWeapon.hide();
        }

        this.weaponType = type;
        
        if (type === 'gadget') {
            // Show the selected gadget weapon (if it has a 3D model)
            const gadgetWeapon = this.gadgetWeapons[this.selectedGadget];
            if (gadgetWeapon) {
                this.currentWeapon = gadgetWeapon;
                gadgetWeapon.show();
            } else {
                // Gadget without 3D model (medkit, binoculars, etc.)
                this.currentWeapon = null;
            }
        } else {
            this.currentWeapon = type === 'primary' ? this.primaryWeapon : this.secondaryWeapon;
            if (this.currentWeapon) {
                this.currentWeapon.show();
            }
        }
        
        this.updateUI();
    }
    
    setSelectedGadget(gadgetName) {
        // Hide current gadget if switching
        if (this.weaponType === 'gadget' && this.currentWeapon && this.currentWeapon.hide) {
            this.currentWeapon.hide();
        }
        
        this.selectedGadget = gadgetName;
        
        // Show new gadget weapon if gadget type is selected
        if (this.weaponType === 'gadget') {
            const gadgetWeapon = this.gadgetWeapons[gadgetName];
            if (gadgetWeapon) {
                // Hide previous gadget if switching
                if (this.currentWeapon && this.currentWeapon.hide) {
                    this.currentWeapon.hide();
                }
                this.currentWeapon = gadgetWeapon;
                gadgetWeapon.show();
            } else {
                // Gadget without 3D model (medkit, binoculars, etc.)
                if (this.currentWeapon && this.currentWeapon.hide) {
                    this.currentWeapon.hide();
                }
                this.currentWeapon = null;
            }
            this.updateUI();
        }
    }

    startFiring() {
        // Allow gadgets to fire (knife melee, grenade throw)
        if (this.currentWeapon) {
            this.currentWeapon.startFiring();
        }
    }

    stopFiring() {
        // Allow gadgets to stop firing
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
        
        // Update all gadget weapons (for grenade physics, etc.)
        Object.values(this.gadgetWeapons).forEach(weapon => {
            if (weapon && weapon.update && weapon !== this.currentWeapon) {
                weapon.update(deltaTime);
            }
        });
        
        // Update bullet manager
        if (this.bulletManager) {
            this.bulletManager.update(deltaTime);
            
            // Check bullet collisions with both enemies and allies (friendly fire)
            const enemies = this.teamManager.getEnemies();
            const allies = this.teamManager.getAllies();
            this.bulletManager.checkCollisions(
                enemies,
                allies,
                (enemy, damage, hitPosition) => {
                    this.teamManager.damageEnemy(enemy, damage, hitPosition);
                },
                (ally, damage, hitPosition) => {
                    this.teamManager.damageAlly(ally, damage, hitPosition);
                }
            );
        }
    }

    updateUI() {
        const ammoCurrent = document.getElementById('ammo-current');
        const ammoReserve = document.getElementById('ammo-reserve');
        const weaponIcon = document.getElementById('weapon-icon');

        // Update weapon icon based on current selection
        if (weaponIcon) {
            // Remove all weapon type classes
            weaponIcon.classList.remove('weapon-primary', 'weapon-secondary', 'weapon-gadget');
            
            let iconText = '';
            if (this.weaponType === 'primary') {
                iconText = WEAPON_ICONS.longGun;
                weaponIcon.classList.add('weapon-primary');
            } else if (this.weaponType === 'secondary') {
                iconText = WEAPON_ICONS.pistol;
                weaponIcon.classList.add('weapon-secondary');
            } else if (this.weaponType === 'gadget') {
                iconText = getWeaponIcon(this.selectedGadget);
                weaponIcon.classList.add('weapon-gadget');
            }
            
            // Wrap text in span for secondary weapon to allow scaling only the text
            if (this.weaponType === 'secondary') {
                weaponIcon.innerHTML = `<span class="weapon-text">${iconText}</span>`;
            } else {
                weaponIcon.textContent = iconText;
            }
        }

        // Update ammo display
        if (this.currentWeapon) {
            if (ammoCurrent) {
                // Show ammo or special display for gadgets
                if (this.weaponType === 'gadget' && this.selectedGadget === 'Knife') {
                    ammoCurrent.textContent = '∞'; // Infinite for knife
                } else {
                    ammoCurrent.textContent = this.currentWeapon.currentAmmo;
                }
            }
            if (ammoReserve) {
                if (this.weaponType === 'gadget' && this.selectedGadget === 'Knife') {
                    ammoReserve.textContent = '∞'; // Infinite for knife
                } else {
                    // Show "OUT" when reserve ammo is 0 (out of bullets)
                    if (this.currentWeapon.reserveAmmo <= 0) {
                        ammoReserve.textContent = 'OUT';
                    } else {
                        ammoReserve.textContent = this.currentWeapon.reserveAmmo;
                    }
                }
            }
        } else if (this.weaponType === 'gadget') {
            // Gadget not found
            if (ammoCurrent) ammoCurrent.textContent = '-';
            if (ammoReserve) ammoReserve.textContent = '-';
        }
        
        // Update button icons to match selected weapon
        this.updateButtonIcons();
    }
    
    updateButtonIcons() {
        // Update weapon switch button icons based on current selection
        // The weapon icon in HUD already shows the current weapon
        // We can add visual indicators if needed, but the main icon is already updated above
    }
}

