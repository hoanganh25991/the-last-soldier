import { Engine } from './engine.js';
import { PlayerController } from '../player/playerController.js';
import { WeaponManager } from '../weapons/weaponManager.js';
import { Battlefield } from '../world/battlefield.js';
import { CollisionSystem } from '../collision/collisionSystem.js';
import { TeamManager } from '../enemies/teamManager.js';
import { UIManager } from '../ui/uiManager.js';

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
            
            // Check for game end condition
            const gameEndResult = this.teamManager.checkGameEnd();
            if (gameEndResult.ended) {
                this.stop();
                // Show game end message (you can enhance this with UI later)
                const winnerText = gameEndResult.winner === 'blue' ? 'Blue Team Wins!' : 'Red Team Wins!';
                alert(`Game Over!\n${winnerText}\nBlue Score: ${this.teamManager.blueScore}\nRed Score: ${this.teamManager.redScore}`);
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
}

