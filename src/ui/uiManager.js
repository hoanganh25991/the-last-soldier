export class UIManager {
    constructor(player, weaponManager, teamManager) {
        this.player = player;
        this.weaponManager = weaponManager;
        this.teamManager = teamManager;
        
        this.startTime = Date.now();
        this.fps = 60;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
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

        const rotation = this.player.getRotation();
        const angle = rotation.y * (180 / Math.PI);
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

        // Update FPS
        this.frameCount++;
        this.lastFpsUpdate += deltaTime;
        if (this.lastFpsUpdate >= 1.0) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsUpdate = 0;
            
            const fpsElement = document.getElementById('fps-counter');
            if (fpsElement) {
                fpsElement.textContent = this.fps;
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

