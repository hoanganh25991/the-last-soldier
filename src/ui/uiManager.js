import * as THREE from 'three';

export class UIManager {
    constructor(player, weaponManager, teamManager, engine) {
        this.player = player;
        this.weaponManager = weaponManager;
        this.teamManager = teamManager;
        this.engine = engine;
        
        this.startTime = Date.now();
    }

    init() {
        this.setupControls();
        this.updateCompass();
    }

    setupControls() {
        // Exit button
        const exitBtn = document.getElementById('btn-exit');
        exitBtn.addEventListener('click', () => {
            if (confirm('Bạn có muốn thoát game?')) {
                window.close();
            }
        });

        // Sprint button
        const sprintBtn = document.getElementById('btn-sprint');
        sprintBtn.addEventListener('touchstart', () => {
            if (this.player) {
                this.player.isSprinting = true;
                this.player.currentSpeed = this.player.sprintSpeed;
            }
        });
        sprintBtn.addEventListener('touchend', () => {
            if (this.player) {
                this.player.isSprinting = false;
                this.player.currentSpeed = this.player.moveSpeed;
            }
        });

        // Crouch button
        const crouchBtn = document.getElementById('btn-crouch');
        let isCrouching = false;
        crouchBtn.addEventListener('click', () => {
            isCrouching = !isCrouching;
            if (this.player) {
                this.player.isCrouching = isCrouching;
                this.player.currentSpeed = isCrouching ? this.player.moveSpeed * 0.5 : this.player.moveSpeed;
            }
        });
    }

    updateCompass() {
        const compassArrow = document.getElementById('compass-arrow');
        if (!compassArrow || !this.player) return;

        // Get yaw rotation (horizontal rotation)
        const yawObject = this.player.getYawObject();
        if (!yawObject) return;
        
        const euler = new THREE.Euler();
        euler.setFromQuaternion(yawObject.quaternion);
        const angle = euler.y * (180 / Math.PI);
        compassArrow.style.transform = `rotate(${angle}deg)`;
    }

    update(deltaTime) {
        // Update timer
        const elapsed = (Date.now() - this.startTime) / 1000;
        const minutes = Math.floor(elapsed / 60);
        const seconds = Math.floor(elapsed % 60);
        const timerElement = document.getElementById('timer');
        if (timerElement) {
            timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        // Update FPS from Stats
        if (this.engine && this.engine.stats) {
            const fpsElement = document.getElementById('fps-counter');
            if (fpsElement) {
                // Get FPS from Stats panel DOM
                // Stats panel has structure: <div class="fps">60</div>
                const fpsDiv = this.engine.stats.dom.querySelector('.fps');
                if (fpsDiv) {
                    fpsElement.textContent = fpsDiv.textContent || '60';
                } else {
                    // Fallback: try to get from first child text
                    const statsText = this.engine.stats.dom.textContent;
                    const fpsMatch = statsText.match(/(\d+)/);
                    if (fpsMatch) {
                        fpsElement.textContent = fpsMatch[1];
                    }
                }
            }
        }

        // Update compass
        this.updateCompass();

        // Update team scores
        if (this.teamManager) {
            const redScoreElement = document.getElementById('team-red-score');
            const blueScoreElement = document.getElementById('team-blue-score');
            if (redScoreElement) redScoreElement.textContent = this.teamManager.redScore;
            if (blueScoreElement) blueScoreElement.textContent = this.teamManager.blueScore;
        }

        // Update weapon ammo
        if (this.weaponManager) {
            this.weaponManager.updateUI();
        }
    }
}

