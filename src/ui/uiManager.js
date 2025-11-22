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
        this.initMinimap();
        
        // Get crosshair element reference
        this.crosshairElement = document.getElementById('crosshair');
    }

    initMinimap() {
        const canvas = document.getElementById('minimap-canvas');
        if (!canvas) return;
        
        this.minimapCanvas = canvas;
        this.minimapCtx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = 150;
        canvas.height = 150;
        
        // Minimap settings
        this.minimapRange = 500; // Show 500 units radius around player
        this.visionRange = 500; // Enemies visible within this range
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

        // Helper function to add button visual feedback
        const addButtonFeedback = (button, action) => {
            const handleStart = (e) => {
                e.preventDefault();
                button.classList.add('btn-active');
                action(true);
            };
            const handleEnd = (e) => {
                e.preventDefault();
                button.classList.remove('btn-active');
                action(false);
            };
            
            button.addEventListener('touchstart', handleStart);
            button.addEventListener('touchend', handleEnd);
            button.addEventListener('mousedown', handleStart);
            button.addEventListener('mouseup', handleEnd);
            button.addEventListener('mouseleave', handleEnd); // Release if mouse leaves button
        };

        // Sprint button
        const sprintBtn = document.getElementById('btn-sprint');
        addButtonFeedback(sprintBtn, (isActive) => {
            if (this.player) {
                if (isActive && !this.player.isCrouching) {
                    this.player.isSprinting = true;
                    this.player.currentSpeed = this.player.sprintSpeed;
                } else {
                    this.player.isSprinting = false;
                    if (!this.player.isCrouching) {
                        this.player.currentSpeed = this.player.moveSpeed;
                    }
                }
            }
        });

        // Crouch button
        const crouchBtn = document.getElementById('btn-crouch');
        let isCrouching = false;
        addButtonFeedback(crouchBtn, (isActive) => {
            if (this.player) {
                isCrouching = isActive;
                this.player.isCrouching = isCrouching;
                if (isCrouching) {
                    this.player.currentSpeed = this.player.crouchSpeed;
                    this.player.pitchObject.position.y = -0.4; // Lower camera when crouching
                } else {
                    if (this.player.isSprinting) {
                        this.player.currentSpeed = this.player.sprintSpeed;
                    } else {
                        this.player.currentSpeed = this.player.moveSpeed;
                    }
                    this.player.pitchObject.position.y = 0; // Return camera to normal position
                }
            }
        });

        // Jump button - one-time action (not toggle)
        const jumpBtn = document.getElementById('btn-jump');
        if (jumpBtn) {
            const handleJump = () => {
                if (this.player && this.player.canJump && !this.player.isCrouching) {
                    this.player.velocity.y = this.player.jumpSpeed;
                    this.player.canJump = false;
                    // Visual feedback
                    jumpBtn.classList.add('btn-active');
                    setTimeout(() => {
                        jumpBtn.classList.remove('btn-active');
                    }, 200);
                }
            };
            
            jumpBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                handleJump();
            });
            jumpBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                handleJump();
            });
        }

        // Aim button
        const aimBtn = document.getElementById('btn-aim');
        if (aimBtn) {
            addButtonFeedback(aimBtn, (isActive) => {
                if (this.player && this.player.isAiming !== undefined) {
                    this.player.isAiming = isActive;
                }
            });
        }

        // Grenade/Gadget button - support hold to charge
        const grenadeBtn = document.getElementById('btn-grenade');
        if (grenadeBtn && this.weaponManager) {
            // Switch to gadget on press
            const handleGrenadeStart = () => {
                if (this.weaponManager.weaponType !== 'gadget') {
                    this.weaponManager.switchWeapon('gadget');
                }
                // Start charging if it's a grenade weapon
                if (this.weaponManager.currentWeapon && this.weaponManager.currentWeapon.startFiring) {
                    this.weaponManager.currentWeapon.startFiring();
                }
                grenadeBtn.classList.add('btn-active');
            };
            
            const handleGrenadeEnd = () => {
                // Release and throw
                if (this.weaponManager.currentWeapon && this.weaponManager.currentWeapon.stopFiring) {
                    this.weaponManager.currentWeapon.stopFiring();
                }
                grenadeBtn.classList.remove('btn-active');
            };
            
            // Support both touch and mouse
            grenadeBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                handleGrenadeStart();
            });
            grenadeBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                handleGrenadeEnd();
            });
            grenadeBtn.addEventListener('mousedown', handleGrenadeStart);
            grenadeBtn.addEventListener('mouseup', handleGrenadeEnd);
            grenadeBtn.addEventListener('mouseleave', handleGrenadeEnd); // Release if mouse leaves button
        }
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

        // Update minimap
        this.updateMinimap();

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

        // Update grenade power bar
        this.updateGrenadePowerBar();

        // Update player health
        if (this.player && typeof this.player.getHealth === 'function' && typeof this.player.getMaxHealth === 'function') {
            const healthElement = document.getElementById('player-health');
            const healthBarElement = document.getElementById('player-health-bar');
            if (healthElement) {
                const health = this.player.getHealth();
                const maxHealth = this.player.getMaxHealth();
                healthElement.textContent = `${Math.max(0, Math.floor(health))} / ${maxHealth}`;
                
                // Update health bar visual (scale based on health percentage)
                if (healthBarElement) {
                    const healthPercent = Math.max(0, health / maxHealth);
                    // Find the inner bar element or create visual feedback
                    // The health bar background color changes based on health
                    if (healthPercent > 0.5) {
                        healthBarElement.style.background = 'rgba(0, 255, 0, 0.4)'; // Green
                    } else if (healthPercent > 0.25) {
                        healthBarElement.style.background = 'rgba(255, 255, 0, 0.4)'; // Yellow
                    } else {
                        healthBarElement.style.background = 'rgba(255, 0, 0, 0.4)'; // Red
                    }
                }
            }
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

    updateMinimap() {
        if (!this.minimapCanvas || !this.minimapCtx || !this.player || !this.teamManager) return;
        
        const ctx = this.minimapCtx;
        const canvas = this.minimapCanvas;
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
        ctx.fillRect(0, 0, width, height);
        
        // Get player position
        const playerPosition = this.player.getPosition();
        if (!playerPosition) return;
        
        // Get player rotation for direction indicator
        // Use forward vector from quaternion to get smooth 360-degree rotation
        const yawObject = this.player.getYawObject();
        let playerRotation = 0;
        if (yawObject) {
            // Get forward direction vector (0, 0, -1) rotated by quaternion
            const forward = new THREE.Vector3(0, 0, -1);
            forward.applyQuaternion(yawObject.quaternion);
            // Canvas coordinate system: 0° = right, 90° = down, 180° = left, -90° = up
            // We want: forward (negative Z) → up (-90°), right (positive X) → right (0°)
            // Using atan2(forward.x, -forward.z) then subtracting 90°:
            // - forward (0,0,-1): atan2(0,1) - 90° = 0° - 90° = -90° (up) ✓
            // - right (1,0,0): atan2(1,0) - 90° = 90° - 90° = 0° (right) ✓
            // - back (0,0,1): atan2(0,-1) - 90° = 180° - 90° = 90° (down) ✓
            // - left (-1,0,0): atan2(-1,0) - 90° = -90° - 90° = -180° = 180° (left) ✓
            playerRotation = Math.atan2(forward.x, -forward.z) - Math.PI / 2;
        }
        
        // Helper function to convert world position to minimap coordinates
        const worldToMinimap = (worldPos) => {
            const dx = worldPos.x - playerPosition.x;
            const dz = worldPos.z - playerPosition.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            // Clamp to minimap range
            if (distance > this.minimapRange) {
                // Negate dz because canvas Y increases downward, but we want forward (negative Z) to point up
                const angle = Math.atan2(-dz, dx);
                const x = width / 2 + Math.cos(angle) * (width / 2 - 5);
                const y = height / 2 + Math.sin(angle) * (height / 2 - 5);
                return { x, y, offMap: true };
            }
            
            // Negate dz so forward (negative Z) points upward on minimap
            const x = width / 2 + (dx / this.minimapRange) * (width / 2);
            const y = height / 2 + (-dz / this.minimapRange) * (height / 2);
            return { x, y, offMap: false };
        };
        
        // Draw grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        
        // Draw vision range circle
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const visionRadius = (this.visionRange / this.minimapRange) * (width / 2);
        ctx.arc(width / 2, height / 2, visionRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw teammates (always visible)
        if (this.teamManager.allies) {
            ctx.fillStyle = '#0066ff'; // Blue for teammates
            for (const ally of this.teamManager.allies) {
                // Skip dead allies
                if (!ally || ally.health <= 0 || !ally.mesh) continue;
                
                // Get world position
                const worldPos = new THREE.Vector3();
                ally.mesh.getWorldPosition(worldPos);
                
                const pos = worldToMinimap(worldPos);
                if (!pos.offMap) {
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        // Draw enemies (only if within vision range)
        if (this.teamManager.enemies) {
            ctx.fillStyle = '#ff0000'; // Red for enemies
            for (const enemy of this.teamManager.enemies) {
                // Skip dead enemies
                if (!enemy || enemy.health <= 0 || !enemy.mesh) continue;
                
                // Get world position
                const worldPos = new THREE.Vector3();
                enemy.mesh.getWorldPosition(worldPos);
                
                // Check if enemy is within vision range
                const dx = worldPos.x - playerPosition.x;
                const dz = worldPos.z - playerPosition.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                if (distance <= this.visionRange) {
                    const pos = worldToMinimap(worldPos);
                    if (!pos.offMap) {
                        ctx.beginPath();
                        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
                        ctx.fill();
                    } else {
                        // Draw arrow on edge pointing to enemy
                        // Negate dz because canvas Y increases downward
                        const angle = Math.atan2(-dz, dx);
                        const edgeX = width / 2 + Math.cos(angle) * (width / 2 - 5);
                        const edgeY = height / 2 + Math.sin(angle) * (height / 2 - 5);
                        ctx.beginPath();
                        ctx.moveTo(edgeX, edgeY);
                        ctx.lineTo(
                            edgeX - Math.cos(angle - Math.PI / 6) * 5,
                            edgeY - Math.sin(angle - Math.PI / 6) * 5
                        );
                        ctx.moveTo(edgeX, edgeY);
                        ctx.lineTo(
                            edgeX - Math.cos(angle + Math.PI / 6) * 5,
                            edgeY - Math.sin(angle + Math.PI / 6) * 5
                        );
                        ctx.stroke();
                    }
                }
            }
        }
        
        // Draw player (green dot with direction indicator)
        ctx.fillStyle = '#00ff00'; // Green for player
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw player direction arrow
        // playerRotation is from atan2(forward.x, -forward.z) which gives correct canvas angle
        // Canvas: 0° = right, π/2 = down, π = left, -π/2 = up
        // No adjustment needed - playerRotation is already in canvas coordinate system
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#00ff00';
        const arrowLength = 10;
        const arrowHeadLength = 5;
        const arrowHeadAngle = Math.PI / 6; // 30 degrees
        const adjustedRotation = playerRotation;
        
        // Calculate arrow tip position
        const tipX = width / 2 + Math.cos(adjustedRotation) * arrowLength;
        const tipY = height / 2 + Math.sin(adjustedRotation) * arrowLength;
        
        // Draw arrow line
        ctx.beginPath();
        ctx.moveTo(width / 2, height / 2);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();
        
        // Draw arrowhead for better visibility
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(
            tipX - Math.cos(adjustedRotation - arrowHeadAngle) * arrowHeadLength,
            tipY - Math.sin(adjustedRotation - arrowHeadAngle) * arrowHeadLength
        );
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(
            tipX - Math.cos(adjustedRotation + arrowHeadAngle) * arrowHeadLength,
            tipY - Math.sin(adjustedRotation + arrowHeadAngle) * arrowHeadLength
        );
        ctx.lineTo(
            tipX - Math.cos(adjustedRotation - arrowHeadAngle) * arrowHeadLength,
            tipY - Math.sin(adjustedRotation - arrowHeadAngle) * arrowHeadLength
        );
        ctx.closePath();
        ctx.fill();
    }

    updateGrenadePowerBar() {
        const powerBarContainer = document.getElementById('grenade-power-bar-container');
        const powerBarFill = document.getElementById('grenade-power-bar-fill');
        
        if (!powerBarContainer || !powerBarFill) {
            return;
        }

        // Check if current weapon is grenade and is charging
        if (this.weaponManager && 
            this.weaponManager.currentWeapon && 
            this.weaponManager.currentWeapon.name === 'Grenade' &&
            typeof this.weaponManager.currentWeapon.getChargeRatio === 'function') {
            
            const chargeRatio = this.weaponManager.currentWeapon.getChargeRatio();
            
            if (chargeRatio > 0) {
                // Show power bar
                powerBarContainer.classList.add('visible');
                powerBarFill.style.width = `${chargeRatio * 100}%`;
            } else {
                // Hide power bar
                powerBarContainer.classList.remove('visible');
                powerBarFill.style.width = '0%';
            }
        } else {
            // Hide power bar if not grenade or not charging
            powerBarContainer.classList.remove('visible');
            powerBarFill.style.width = '0%';
        }
    }
}

