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

    async init(selectedWeapons = null) {
        // Initialize core engine
        this.engine = new Engine();
        await this.engine.init();

        // Initialize collision system
        this.collisionSystem = new CollisionSystem();

        // Initialize battlefield
        this.battlefield = new Battlefield(this.engine.scene);
        await this.battlefield.init();

        // Initialize team manager (will be updated with bulletManager after weaponManager is created)
        this.teamManager = new TeamManager(this.engine.scene, this.collisionSystem);
        // Spawn enemies and allies
        this.teamManager.init();

        // Initialize player
        this.player = new PlayerController(
            this.engine.camera,
            this.collisionSystem,
            this.engine.scene
        );
        this.player.init();

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
        
        await this.weaponManager.init();
        
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
        this.uiManager.init();

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
            
            // Reset scores
            this.teamManager.redScore = 100;
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
        
        // Reset player health and position
        if (this.player) {
            this.player.health = this.player.maxHealth;
            this.player.yawObject.position.set(0, 1.6, 0);
            this.player.velocity.set(0, 0, 0);
        }
        
        // Clear bullets
        if (this.weaponManager && this.weaponManager.bulletManager) {
            this.weaponManager.bulletManager.clear();
        }
        
        // Restart game loop
        this.start();
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

