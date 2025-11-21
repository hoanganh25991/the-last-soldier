import { Engine } from './engine.js';
import { PlayerController } from '../player/playerController.js';
import { WeaponManager } from '../weapons/weaponManager.js';
import { Battlefield } from '../world/battlefield.js';
import { CollisionSystem } from '../collision/collisionSystem.js';
import { TeamManager } from '../enemies/teamManager.js';
import { UIManager } from '../ui/uiManager.js';

export class Game {
    constructor() {
        this.engine = null;
        this.player = null;
        this.weaponManager = null;
        this.battlefield = null;
        this.collisionSystem = null;
        this.teamManager = null;
        this.uiManager = null;
        this.animationFrameId = null;
        this.isRunning = false;
    }

    async init() {
        // Initialize core engine
        this.engine = new Engine();
        await this.engine.init();

        // Initialize collision system
        this.collisionSystem = new CollisionSystem();

        // Initialize battlefield
        this.battlefield = new Battlefield(this.engine.scene);
        await this.battlefield.init();

        // Initialize team manager
        this.teamManager = new TeamManager(this.engine.scene, this.collisionSystem);
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
            this.teamManager
        );
        this.weaponManager.init();

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
            this.player.update(deltaTime);
            this.weaponManager.update(deltaTime);
            this.teamManager.update(deltaTime);
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

