import * as THREE from 'three';
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
            const isPlayerDead = this.player.isDead && this.player.isDead();
            
            if (isPlayerDead) {
                // Handle player death (increment score and start respawn timer)
                if (this.teamManager && this.teamManager.playerDeathTime === null) {
                    this.teamManager.handlePlayerDeath();
                }
                // Update player respawn timer
                if (this.teamManager) {
                    this.teamManager.updatePlayerRespawn(deltaTime, this.player);
                }
                // Don't update player when dead - wait for respawn
                // But still update other systems so game continues
            } else {
                // Player is alive - update normally
                this.player.update(deltaTime);
            }
            
            // Pass player velocity to weapon manager for weapon sway (only if alive)
            const playerVelocity = isPlayerDead ? new THREE.Vector3(0, 0, 0) : this.player.velocity;
            this.weaponManager.update(deltaTime, playerVelocity);
            
            // Pass player position and collider mesh to team manager so enemies can hunt and shoot at player
            // Use last known position if player is dead (for respawn location)
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
                // Scores should be equal at game end (both teams killed 100)
                const message = `${winnerText}\n\nBlue Score (Killed Allies): ${this.teamManager.blueScore}\nRed Score (Killed Enemies): ${this.teamManager.redScore}`;
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
        // Player death is now handled in the game loop with respawn
        // This method is kept for compatibility but no longer stops the game
        // The game continues and player respawns automatically
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
                        <button id="btn-main-menu" class="btn-main-menu">MAIN MENU</button>
                    </div>
                </div>
            `;
            document.body.appendChild(popup);
            
            // Add event listener for main menu button
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
            // Remove popup from DOM to ensure clean state
            popup.remove();
        }
    }

    returnToMainMenu() {
        // Hide popup
        this.hideGameOverPopup();
        
        // Stop game
        this.stop();
        
        // Stop battlefield music and restart menu music via menu manager
        if (window.menuManager) {
            window.menuManager.stopGame();
        }
        
        // Dispose all game resources
        this.dispose();
        
        // Clear game instance in menu manager
        if (window.menuManager) {
            window.menuManager.gameInstance = null;
            window.menuManager.showScreen('main-menu');
        }
    }
    
    dispose() {
        // Stop game loop
        this.stop();
        
        // Release pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        // Clear bullets
        if (this.weaponManager && this.weaponManager.bulletManager) {
            this.weaponManager.bulletManager.clear();
        }
        
        // Dispose team manager (enemies, allies, blood effects)
        if (this.teamManager) {
            // Remove all enemies
            this.teamManager.enemies.forEach(enemy => {
                if (enemy.mesh && this.engine && this.engine.scene) {
                    this.engine.scene.remove(enemy.mesh);
                }
                if (enemy.dispose) {
                    enemy.dispose();
                }
            });
            
            // Remove all allies
            this.teamManager.allies.forEach(ally => {
                if (ally.mesh && this.engine && this.engine.scene) {
                    this.engine.scene.remove(ally.mesh);
                }
                if (ally.dispose) {
                    ally.dispose();
                }
            });
            
            // Clear arrays
            this.teamManager.enemies = [];
            this.teamManager.allies = [];
            this.teamManager.enemyGroups = [];
            this.teamManager.bloodEffects = [];
            
            // Clear references
            this.teamManager.uiManager = null;
            this.teamManager.bulletManager = null;
        }
        
        // Dispose weapon manager
        if (this.weaponManager) {
            // Clear bullets
            if (this.weaponManager.bulletManager) {
                this.weaponManager.bulletManager.clear();
            }
            // Clear weapon references
            this.weaponManager.player = null;
        }
        
        // Dispose battlefield
        if (this.battlefield && this.battlefield.dispose) {
            this.battlefield.dispose();
        }
        
        // Dispose collision system
        if (this.collisionSystem && this.collisionSystem.dispose) {
            this.collisionSystem.dispose();
        }
        
        // Dispose player
        if (this.player) {
            // Remove player collider mesh from scene
            if (this.player.colliderMesh && this.engine && this.engine.scene) {
                this.engine.scene.remove(this.player.colliderMesh);
            }
            // Remove player camera hierarchy from scene
            if (this.player.yawObject && this.engine && this.engine.scene) {
                this.engine.scene.remove(this.player.yawObject);
            }
        }
        
        // Dispose UI manager (clean up any UI elements if needed)
        if (this.uiManager) {
            // UI elements are in DOM, they'll be cleaned up when screen changes
            this.uiManager = null;
        }
        
        // Dispose engine (scene, renderer, camera, stats)
        if (this.engine && this.engine.dispose) {
            this.engine.dispose();
        }
        
        // Clear all references
        this.engine = null;
        this.player = null;
        this.weaponManager = null;
        this.battlefield = null;
        this.collisionSystem = null;
        this.teamManager = null;
        this.uiManager = null;
        this.audioManager = null;
    }
}

