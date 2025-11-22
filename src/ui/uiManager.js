import * as THREE from 'three';

export class UIManager {
    constructor(player, weaponManager, teamManager, engine) {
        this.player = player;
        this.weaponManager = weaponManager;
        this.teamManager = teamManager;
        this.engine = engine;
        
        this.startTime = Date.now();
        
        // Crosshair spread system
        this.baseCrosshairSize = 20; // Base size in pixels
        this.currentCrosshairSpread = 0; // Current spread amount
        this.crosshairElement = null;
        
        // Crosshair position jitter/shake
        this.crosshairOffsetX = 0;
        this.crosshairOffsetY = 0;
        this.crosshairRotation = 0;
        this.jitterTime = 0;
    }

    init() {
        this.setupControls();
        this.updateCompass();
        
        // Get crosshair element reference
        this.crosshairElement = document.getElementById('crosshair');
    }

    setupControls() {
        // Exit button
        const exitBtn = document.getElementById('btn-exit');
        exitBtn.addEventListener('click', () => {
            // Return to main menu
            if (window.menuManager) {
                window.menuManager.showScreen('main-menu');
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
            if (fpsElement && this.engine.stats.dom) {
                // Stats panel structure: <div><canvas></canvas><div class="fps">60</div></div>
                // Try multiple ways to get FPS value
                let fpsValue = null;
                
                // Method 1: Look for .fps class
                const fpsDiv = this.engine.stats.dom.querySelector('.fps');
                if (fpsDiv) {
                    fpsValue = fpsDiv.textContent.trim();
                }
                
                // Method 2: Get from all text nodes
                if (!fpsValue) {
                    const allText = this.engine.stats.dom.textContent || '';
                    const match = allText.match(/FPS[:\s]*(\d+)/i) || allText.match(/(\d+)/);
                    if (match) {
                        fpsValue = match[1];
                    }
                }
                
                // Method 3: Get from first number found
                if (!fpsValue) {
                    const text = this.engine.stats.dom.innerText || this.engine.stats.dom.textContent || '';
                    const numbers = text.match(/\d+/g);
                    if (numbers && numbers.length > 0) {
                        fpsValue = numbers[0];
                    }
                }
                
                if (fpsValue) {
                    fpsElement.textContent = fpsValue;
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
        
        // Update crosshair spread based on movement and shooting
        this.updateCrosshair(deltaTime);
    }

    updateCrosshair(deltaTime) {
        if (!this.crosshairElement) return;
        
        let targetSpread = 0; // Target spread in pixels
        let movementIntensity = 0; // Movement intensity for jitter
        
        // Calculate spread based on player movement
        if (this.player && this.player.velocity) {
            // Get horizontal movement speed (ignore vertical)
            const moveSpeed = Math.sqrt(
                this.player.velocity.x * this.player.velocity.x + 
                this.player.velocity.z * this.player.velocity.z
            );
            
            // Map movement speed to crosshair spread (minimal - max 2x base size)
            // Standing still (0) = 0 spread
            // Walking (5) = 5px spread
            // Sprinting (8) = 10px spread (max)
            const movementSpread = Math.min(moveSpeed * 1.25, 10);
            targetSpread += movementSpread;
            
            // Store movement intensity for position jitter
            movementIntensity = Math.min(moveSpeed / 5.0, 2.0); // 0 to 2x
        }
        
        // Add spread from weapon recoil
        let recoilIntensity = 0;
        if (this.weaponManager && this.weaponManager.currentWeapon) {
            const weapon = this.weaponManager.currentWeapon;
            
            // Calculate recoil spread based on weapon's current recoil
            if (weapon.currentRecoil) {
                const recoilMagnitude = Math.sqrt(
                    weapon.currentRecoil.x * weapon.currentRecoil.x +
                    weapon.currentRecoil.y * weapon.currentRecoil.y +
                    weapon.currentRecoil.z * weapon.currentRecoil.z
                );
                
                // Map recoil to spread (minimal - max 2x base size total)
                // Recoil adds max 10px spread (so total max is 20px = 2x base size)
                const recoilSpread = Math.min(recoilMagnitude * 50, 10);
                targetSpread += recoilSpread;
                
                // Store recoil intensity for position jitter
                recoilIntensity = recoilMagnitude * 10;
            }
        }
        
        // Smoothly interpolate to target spread
        this.currentCrosshairSpread += (targetSpread - this.currentCrosshairSpread) * 10 * deltaTime;
        
        // Apply spread to crosshair size (max 2x base size = 40px)
        const maxSpread = this.baseCrosshairSize; // Max spread equals base size (2x total)
        const clampedSpread = Math.min(this.currentCrosshairSpread, maxSpread);
        const finalSize = this.baseCrosshairSize + clampedSpread;
        this.crosshairElement.style.width = `${finalSize}px`;
        this.crosshairElement.style.height = `${finalSize}px`;
        
        // Keep opacity high since size change is minimal
        this.crosshairElement.style.opacity = 1.0;
        
        // ===== Crosshair Position Jitter/Shake =====
        
        // Update jitter time
        if (movementIntensity > 0.1 || recoilIntensity > 0.1) {
            this.jitterTime += deltaTime * (10 + movementIntensity * 5);
        }
        
        // Calculate position jitter based on movement
        let targetOffsetX = 0;
        let targetOffsetY = 0;
        let targetRotation = 0;
        
        if (movementIntensity > 0.1) {
            // Walking/sprinting - continuous shake with sine waves (much bigger position movement)
            const shakeAmount = movementIntensity * 12; // Max 24px shake when sprinting (much bigger!)
            targetOffsetX += Math.sin(this.jitterTime * 2.5) * shakeAmount;
            targetOffsetY += Math.cos(this.jitterTime * 3.2) * shakeAmount;
            targetRotation += Math.sin(this.jitterTime * 1.8) * movementIntensity * 4; // Max 8 degrees (bigger rotation)
        }
        
        // Add recoil kick to position (much bigger recoil shake)
        if (recoilIntensity > 0.1) {
            // Recoil causes sharp upward kick and random horizontal offset (much bigger!)
            targetOffsetY -= recoilIntensity * 20; // Kick upward (much bigger - was 8)
            targetOffsetX += Math.sin(this.jitterTime * 10) * recoilIntensity * 15; // Random horizontal (much bigger - was 6)
            targetRotation += Math.sin(this.jitterTime * 15) * recoilIntensity * 8; // Sharp rotation (much bigger - was 3)
        }
        
        // Smoothly interpolate position offsets (faster response for snappy feel)
        const positionLerpSpeed = 15;
        this.crosshairOffsetX += (targetOffsetX - this.crosshairOffsetX) * positionLerpSpeed * deltaTime;
        this.crosshairOffsetY += (targetOffsetY - this.crosshairOffsetY) * positionLerpSpeed * deltaTime;
        this.crosshairRotation += (targetRotation - this.crosshairRotation) * positionLerpSpeed * deltaTime;
        
        // When standing still, smoothly return to center
        if (movementIntensity < 0.1 && recoilIntensity < 0.1) {
            this.crosshairOffsetX *= 0.85;
            this.crosshairOffsetY *= 0.85;
            this.crosshairRotation *= 0.85;
        }
        
        // Apply position offset and rotation to crosshair
        const translateX = -50 + this.crosshairOffsetX;
        const translateY = -50 + this.crosshairOffsetY;
        this.crosshairElement.style.transform = 
            `translate(${translateX}%, ${translateY}%) rotate(${this.crosshairRotation}deg)`;
    }
}

