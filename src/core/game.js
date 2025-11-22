import { Engine } from './engine.js';
import { PlayerController } from '../player/playerController.js';
import { WeaponManager } from '../weapons/weaponManager.js';
import { Battlefield } from '../world/battlefield.js';
import { CollisionSystem } from '../collision/collisionSystem.js';
import { TeamManager } from '../enemies/teamManager.js';
import { UIManager } from '../ui/uiManager.js';
import { showAlert } from '../ui/dialogManager.js';

export class Game {
    constructor(audioManager = null) {
        this.engine = null;
        this.player = null;
        this.weaponManager = null;
        this.battlefield = null;
        this.collisionSystem = null;
        this.teamManager = null;
        this.uiManager = null;
        this.audioManager = audioManager;
        this.animationFrameId = null;
        this.isRunning = false;
    }

    async init(selectedWeapons = null, settings = null, loadingManager = null) {
        // Initialize core engine
        this.engine = new Engine();
        if (loadingManager) {
            await loadingManager.loadWithProgress(
                this.engine.init(),
                'Initializing engine...'
            );
        } else {
            await this.engine.init();
        }
        
        // Apply FPS visibility setting if provided
        if (settings && settings.showFPS !== undefined) {
            this.engine.setFPSVisibility(settings.showFPS);
        } else {
            // Default to hidden if no settings provided
            this.engine.setFPSVisibility(false);
        }

        // Initialize collision system
        this.collisionSystem = new CollisionSystem();

        // Initialize battlefield
        this.battlefield = new Battlefield(this.engine.scene);
        if (loadingManager) {
            await loadingManager.loadWithProgress(
                this.battlefield.init(),
                'Loading battlefield...'
            );
        } else {
            await this.battlefield.init();
        }

        // Initialize team manager (will be updated with bulletManager after weaponManager is created)
        this.teamManager = new TeamManager(this.engine.scene, this.collisionSystem);
        // Spawn enemies and allies
        if (loadingManager) {
            await loadingManager.loadWithProgress(
                Promise.resolve(this.teamManager.init()),
                'Spawning teams...'
            );
        } else {
            this.teamManager.init();
        }

        // Initialize player
        this.player = new PlayerController(
            this.engine.camera,
            this.collisionSystem,
            this.engine.scene
        );
        if (loadingManager) {
            await loadingManager.loadWithProgress(
                Promise.resolve(this.player.init()),
                'Initializing player...'
            );
        } else {
            this.player.init();
        }

        // Register battlefield objects for collision
        if (this.battlefield.objects) {
            for (const obj of this.battlefield.objects) {
                this.collisionSystem.addCollider(obj);
            }
        }

        // Initialize weapon manager (use player's camera hierarchy)
        this.weaponManager = new WeaponManager(
            this.player.getCamera(),
            this.engine.scene,
            this.teamManager,
            this.audioManager,
            this.collisionSystem
        );
        
        // Set selected weapons BEFORE init so they're applied during initialization
        if (selectedWeapons) {
            if (selectedWeapons.gadget) {
                this.weaponManager.selectedGadget = selectedWeapons.gadget;
            }
        }
        
        if (loadingManager) {
            await loadingManager.loadWithProgress(
                this.weaponManager.init(),
                'Loading weapons...'
            );
        } else {
            await this.weaponManager.init();
        }
        
        // Set player reference in weapon manager for bullet collision detection
        this.weaponManager.player = this.player;
        
        // Update team manager with bullet manager for soldier shooting
        this.teamManager.bulletManager = this.weaponManager.bulletManager;
        // Update existing enemies and allies with bullet manager
        this.teamManager.enemies.forEach(enemy => {
            enemy.bulletManager = this.weaponManager.bulletManager;
        });
        this.teamManager.allies.forEach(ally => {
            ally.bulletManager = this.weaponManager.bulletManager;
        });
        
        // Ensure selected gadget is applied after init (in case weapon type is gadget)
        if (selectedWeapons && selectedWeapons.gadget) {
            this.weaponManager.setSelectedGadget(selectedWeapons.gadget);
        }

        // Initialize UI
        this.uiManager = new UIManager(
            this.player,
            this.weaponManager,
            this.teamManager,
            this.engine
        );
        if (loadingManager) {
            await loadingManager.loadWithProgress(
                Promise.resolve(this.uiManager.init()),
                'Initializing UI...'
            );
        } else {
            this.uiManager.init();
        }
        
        // Pass UI manager reference to team manager for deployment notifications
        this.teamManager.uiManager = this.uiManager;

        // Start game loop
        this.start();
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        const animate = () => {
            if (!this.isRunning) return;
            
            this.animationFrameId = requestAnimationFrame(animate);

            const deltaTime = this.engine.update();

            // Update systems
            if (!this.player) return; // Safety check
            
            // Check if player is dead
            if (this.player.isDead && this.player.isDead()) {
                this.handlePlayerDeath();
                return;
            }
            
            this.player.update(deltaTime);
            
            // Pass player velocity to weapon manager for weapon sway
            const playerVelocity = this.player.velocity;
            this.weaponManager.update(deltaTime, playerVelocity);
            
            // Pass player position and collider mesh to team manager so enemies can hunt and shoot at player
            const playerPosition = this.player.getPosition();
            const playerColliderMesh = (this.player && typeof this.player.getColliderMesh === 'function') 
                ? this.player.getColliderMesh() 
                : null; // Use collider mesh for accurate targeting
            this.teamManager.update(deltaTime, playerPosition, playerColliderMesh);
            
            // Check for game end condition (team elimination)
            const gameEndResult = this.teamManager.checkGameEnd();
            if (gameEndResult.ended) {
                // Stop enemy spawning
                this.teamManager.setGameEnded(true);
                
                this.stop();
                // Release pointer lock so player can interact with dialog
                if (document.pointerLockElement) {
                    document.exitPointerLock();
                }
                // Show game end message with custom dialog
                const winnerText = gameEndResult.winner === 'blue' ? 'Blue Team Wins!' : 'Red Team Wins!';
                const message = `${winnerText}\n\nBlue Score: ${this.teamManager.blueScore}\nRed Score: ${this.teamManager.redScore}`;
                showAlert(message, 'Game Over').then(() => {
                    // Return to main menu after dialog is closed
                    if (window.menuManager) {
                        window.menuManager.showScreen('main-menu');
                    }
                });
                return;
            }
            
            this.uiManager.update(deltaTime);
            this.battlefield.update(this.engine.camera);

            // Render
            this.engine.render();
        };

        animate();
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    handlePlayerDeath() {
        // Stop enemy spawning
        if (this.teamManager) {
            this.teamManager.setGameEnded(true);
        }
        
        // Stop the game loop
        this.stop();
        
        // Release pointer lock so player can interact with popup buttons
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        // Show game over popup
        this.showGameOverPopup();
    }

    showGameOverPopup() {
        // Create or show game over popup
        let popup = document.getElementById('game-over-popup');
        if (!popup) {
            // Create popup if it doesn't exist
            popup = document.createElement('div');
            popup.id = 'game-over-popup';
            popup.className = 'game-over-popup';
            popup.innerHTML = `
                <div class="game-over-content">
                    <h1>GAME OVER</h1>
                    <p class="game-over-message">You have been eliminated!</p>
                    <div class="game-over-stats">
                        <p>Blue Team Score: <span id="final-blue-score">0</span></p>
                        <p>Red Team Score: <span id="final-red-score">0</span></p>
                    </div>
                    <div class="game-over-buttons">
                        <button id="btn-replay" class="btn-replay">REPLAY</button>
                        <button id="btn-main-menu" class="btn-main-menu">MAIN MENU</button>
                    </div>
                </div>
            `;
            document.body.appendChild(popup);
            
            // Add event listeners
            document.getElementById('btn-replay').addEventListener('click', (e) => {
                e.stopPropagation();
                this.restartGame();
            });
            
            document.getElementById('btn-main-menu').addEventListener('click', (e) => {
                e.stopPropagation();
                this.returnToMainMenu();
            });
            
            // Prevent clicks on popup from triggering pointer lock
            popup.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        // Update scores
        const blueScoreEl = document.getElementById('final-blue-score');
        const redScoreEl = document.getElementById('final-red-score');
        if (blueScoreEl) blueScoreEl.textContent = this.teamManager.blueScore;
        if (redScoreEl) redScoreEl.textContent = this.teamManager.redScore;
        
        // Show popup
        popup.style.display = 'flex';
        
        // Ensure pointer lock is released (in case it wasn't already)
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
    }

    hideGameOverPopup() {
        const popup = document.getElementById('game-over-popup');
        if (popup) {
            popup.style.display = 'none';
        }
    }

    async restartGame() {
        // Hide popup
        this.hideGameOverPopup();
        
        // Ensure pointer lock is released before restarting
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        // Small delay to ensure pointer lock is fully released
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Clear existing enemies and allies
        if (this.teamManager) {
            // Remove all existing enemies and allies from scene
            this.teamManager.enemies.forEach(enemy => {
                if (enemy.mesh) {
                    this.engine.scene.remove(enemy.mesh);
                    enemy.dispose();
                }
            });
            this.teamManager.allies.forEach(ally => {
                if (ally.mesh) {
                    this.engine.scene.remove(ally.mesh);
                    ally.dispose();
                }
            });
            
            // Clear arrays
            this.teamManager.enemies = [];
            this.teamManager.allies = [];
            this.teamManager.enemyGroups = [];
            this.teamManager.bloodEffects = [];
            
            // Reset respawn system
            this.teamManager.deadAllies = [];
            this.teamManager.allAlliesDeadTime = null;
            
            // Reset game ended flag
            this.teamManager.setGameEnded(false);
            this.teamManager.waveNumber = 0; // Reset wave number
            this.teamManager.currentWaveEnemies = []; // Reset current wave tracking
            
            // Reset scores
            this.teamManager.redScore = 100; // Reset enemy pool to 100
            this.teamManager.blueScore = 10;
            
            // Respawn enemies and allies
            this.teamManager.init();
            
            // Update bullet manager references
            if (this.weaponManager && this.weaponManager.bulletManager) {
                this.teamManager.bulletManager = this.weaponManager.bulletManager;
                this.teamManager.enemies.forEach(enemy => {
                    enemy.bulletManager = this.weaponManager.bulletManager;
                });
                this.teamManager.allies.forEach(ally => {
                    ally.bulletManager = this.weaponManager.bulletManager;
                });
            }
        }
        
        // Reset player state completely
        if (this.player) {
            // Reset health
            this.player.health = this.player.maxHealth;
            
            // Reset position
            this.player.yawObject.position.set(0, 1.6, 0);
            
            // Reset velocity
            this.player.velocity.set(0, 0, 0);
            
            // Reset rotation (camera rotation)
            this.player.yawObject.quaternion.set(0, 0, 0, 1);
            this.player.pitchObject.quaternion.set(0, 0, 0, 1);
            this.player.euler.set(0, 0, 0, 'YXZ');
            
            // Reset player states
            this.player.isAiming = false;
            this.player.isCrouching = false;
            this.player.isSprinting = false;
            this.player.canJump = false;
            this.player.currentSpeed = this.player.moveSpeed;
            
            // Reset camera position (for crouching)
            this.player.pitchObject.position.y = 0;
            
            // Reset FOV
            this.player.currentFOV = this.player.defaultFOV;
            if (this.player.camera && this.player.camera.fov !== undefined) {
                this.player.camera.fov = this.player.defaultFOV;
                this.player.camera.updateProjectionMatrix();
            }
            
            // Reset collider mesh scale
            if (this.player.colliderMesh) {
                this.player.colliderMesh.scale.y = 1.0;
            }
        }
        
        // Reset weapon manager state
        if (this.weaponManager) {
            // Reset primary weapon
            if (this.weaponManager.primaryWeapon) {
                this.weaponManager.primaryWeapon.currentAmmo = this.weaponManager.primaryWeapon.maxAmmo;
                this.weaponManager.primaryWeapon.reserveAmmo = 288; // Reset to initial reserve
                this.weaponManager.primaryWeapon.isFiring = false;
                this.weaponManager.primaryWeapon.isReloading = false;
                if (this.weaponManager.primaryWeapon.currentRecoil) {
                    this.weaponManager.primaryWeapon.currentRecoil.set(0, 0, 0);
                }
                if (this.weaponManager.primaryWeapon.currentSway) {
                    this.weaponManager.primaryWeapon.currentSway.set(0, 0, 0);
                }
            }
            
            // Reset secondary weapon
            if (this.weaponManager.secondaryWeapon) {
                this.weaponManager.secondaryWeapon.currentAmmo = this.weaponManager.secondaryWeapon.maxAmmo;
                this.weaponManager.secondaryWeapon.reserveAmmo = 60; // Reset to initial reserve
                this.weaponManager.secondaryWeapon.isFiring = false;
                this.weaponManager.secondaryWeapon.isReloading = false;
                if (this.weaponManager.secondaryWeapon.currentRecoil) {
                    this.weaponManager.secondaryWeapon.currentRecoil.set(0, 0, 0);
                }
                if (this.weaponManager.secondaryWeapon.currentSway) {
                    this.weaponManager.secondaryWeapon.currentSway.set(0, 0, 0);
                }
            }
            
            // Reset gadget weapons
            Object.values(this.weaponManager.gadgetWeapons).forEach(weapon => {
                if (weapon) {
                    if (weapon.currentAmmo !== undefined && weapon.maxAmmo !== undefined) {
                        weapon.currentAmmo = weapon.maxAmmo;
                    }
                    if (weapon.reserveAmmo !== undefined) {
                        // Reset to initial reserve (grenade has 0 reserve, knife has no ammo system)
                        weapon.reserveAmmo = weapon.name === 'Grenade' ? 0 : (weapon.reserveAmmo || 0);
                    }
                    weapon.isFiring = false;
                    weapon.isReloading = false;
                    // Reset grenade charging state and clear active grenades
                    if (weapon.name === 'Grenade') {
                        if (weapon.isCharging !== undefined) {
                            weapon.isCharging = false;
                            weapon.chargeStartTime = 0;
                        }
                        // Clear all active grenades from scene
                        if (weapon.grenades && Array.isArray(weapon.grenades)) {
                            weapon.grenades.forEach(grenadeData => {
                                if (grenadeData.mesh && grenadeData.mesh.parent) {
                                    grenadeData.mesh.parent.remove(grenadeData.mesh);
                                    if (grenadeData.mesh.geometry) grenadeData.mesh.geometry.dispose();
                                    if (grenadeData.mesh.material) grenadeData.mesh.material.dispose();
                                }
                            });
                            weapon.grenades = [];
                        }
                    }
                    if (weapon.currentRecoil) {
                        weapon.currentRecoil.set(0, 0, 0);
                    }
                    if (weapon.currentSway) {
                        weapon.currentSway.set(0, 0, 0);
                    }
                }
            });
            
            // Switch back to primary weapon
            this.weaponManager.switchWeapon('primary');
            
            // Update UI
            this.weaponManager.updateUI();
        }
        
        // Reset UI manager state
        if (this.uiManager) {
            // Reset timer
            this.uiManager.startTime = Date.now();
            
            // Reset crosshair state
            this.uiManager.currentCrosshairSpread = 0;
            this.uiManager.crosshairOffsetX = 0;
            this.uiManager.crosshairOffsetY = 0;
            this.uiManager.crosshairRotation = 0;
            this.uiManager.jitterTime = 0;
            
            // Reset crosshair element if it exists
            if (this.uiManager.crosshairElement) {
                this.uiManager.crosshairElement.style.width = `${this.uiManager.baseCrosshairSize}px`;
                this.uiManager.crosshairElement.style.height = `${this.uiManager.baseCrosshairSize}px`;
                this.uiManager.crosshairElement.style.transform = 'translate(-50%, -50%) rotate(0deg)';
            }
        }
        
        // Clear bullets
        if (this.weaponManager && this.weaponManager.bulletManager) {
            this.weaponManager.bulletManager.clear();
        }
        
        // Restart game loop
        this.start();
        
        // Re-capture mouse (pointer lock) after restart
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            // Small delay to ensure game container is ready and pointer lock was released
            setTimeout(() => {
                if (!document.pointerLockElement) {
                    gameContainer.requestPointerLock().catch((err) => {
                        console.debug('Pointer lock not available:', err.message);
                    });
                }
            }, 200);
        }
    }

    returnToMainMenu() {
        // Hide popup
        this.hideGameOverPopup();
        
        // Stop game
        this.stop();
        
        // Return to main menu
        if (window.menuManager) {
            window.menuManager.showScreen('main-menu');
        }
    }
}

