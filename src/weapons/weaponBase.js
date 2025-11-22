import * as THREE from 'three';

export class WeaponBase {
    constructor(camera, scene, teamManager, bulletManager, audioManager = null) {
        this.camera = camera;
        this.scene = scene;
        this.teamManager = teamManager;
        this.bulletManager = bulletManager;
        this.audioManager = audioManager;
        
        this.weaponMesh = null;
        this.currentAmmo = 0;
        this.reserveAmmo = 0;
        this.isFiring = false;
        this.isReloading = false;
        this.lastFireTime = 0;
        this.fireInterval = 0;
        this.reloadStartTime = 0;
        this.reloadStartRotation = 0;
        this.reloadStartPosition = null;
        this.reloadShells = []; // Bullet shells dropped during reload
        
        // Muzzle flash
        this.muzzleFlash = null;
        
        // Bullet speed (default, can be overridden)
        this.bulletSpeed = 50;
        
        // Bullet sound URL (can be overridden by subclasses)
        this.bulletSoundUrl = 'sounds/bullet-shoot.mp3'; // Placeholder - user should add actual file
    }

    init() {
        this.currentAmmo = this.maxAmmo;
        this.fireInterval = 60 / this.fireRate; // Convert RPM to seconds
        // Muzzle flash will be created after weapon mesh is created
    }

    createMuzzleFlash() {
        if (!this.weaponMesh) return;
        
        // Create muzzle flash group
        const flashGroup = new THREE.Group();
        
        // Main flash - bright yellow/orange
        const flashGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.9,
            emissive: 0xffff00,
            emissiveIntensity: 2.0
        });
        const mainFlash = new THREE.Mesh(flashGeometry, flashMaterial);
        flashGroup.add(mainFlash);
        
        // Outer glow - orange
        const glowGeometry = new THREE.SphereGeometry(0.25, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff6600,
            transparent: true,
            opacity: 0.6,
            emissive: 0xff6600,
            emissiveIntensity: 1.5
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        flashGroup.add(glow);
        
        // Bright core - white
        const coreGeometry = new THREE.SphereGeometry(0.08, 6, 6);
        const coreMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 1.0,
            emissive: 0xffffff,
            emissiveIntensity: 3.0
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        flashGroup.add(core);
        
        this.muzzleFlash = flashGroup;
        this.muzzleFlash.visible = false;
        // Position at barrel end - barrel extends along Z, forward end is at -Z
        // Barrel center at Z=-0.9, extends 0.8 along Z, so forward end at Z=-0.9-0.4=-1.3
        this.muzzleFlash.position.set(0.3, -0.2, -1.3);
        this.weaponMesh.add(this.muzzleFlash);
    }

    show() {
        if (this.weaponMesh) {
            this.weaponMesh.visible = true;
        }
    }

    hide() {
        if (this.weaponMesh) {
            this.weaponMesh.visible = false;
        }
    }

    startFiring() {
        this.isFiring = true;
    }

    stopFiring() {
        this.isFiring = false;
        if (this.muzzleFlash) {
            this.muzzleFlash.visible = false;
        }
    }

    fire() {
        if (this.isReloading || this.currentAmmo <= 0) {
            return;
        }

        const now = Date.now() / 1000;
        if (now - this.lastFireTime < this.fireInterval) {
            return;
        }

        this.currentAmmo--;
        this.lastFireTime = now;

        // Muzzle flash - enhanced visibility
        if (this.muzzleFlash) {
            this.muzzleFlash.visible = true;
            // Scale animation for flash effect
            this.muzzleFlash.scale.set(1, 1, 1);
            setTimeout(() => {
                if (this.muzzleFlash) {
                    this.muzzleFlash.scale.set(1.5, 1.5, 1.5);
                }
            }, 10);
            setTimeout(() => {
                if (this.muzzleFlash) {
                    this.muzzleFlash.visible = false;
                    this.muzzleFlash.scale.set(1, 1, 1);
                }
            }, 80);
        }

        // Raycast for hit detection
        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        this.camera.getWorldPosition(worldPosition);
        this.camera.getWorldQuaternion(worldQuaternion);
        
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(worldQuaternion);
        
        // Add spread
        const spreadX = (Math.random() - 0.5) * this.spread;
        const spreadY = (Math.random() - 0.5) * this.spread;
        direction.x += spreadX;
        direction.y += spreadY;
        direction.normalize();

        const raycaster = new THREE.Raycaster(
            worldPosition,
            direction,
            0,
            this.range
        );

        // Play bullet sound (optimized with pooling and rate limiting)
        if (this.audioManager) {
            this.audioManager.playBulletSound(this.bulletSoundUrl, 0.4);
        }

        // Create visible bullet
        if (this.bulletManager) {
            let bulletStart = worldPosition.clone();
            
            // Get muzzle flash position in world space for bullet origin
            if (this.muzzleFlash && this.weaponMesh) {
                const muzzleWorldPosition = new THREE.Vector3();
                this.muzzleFlash.getWorldPosition(muzzleWorldPosition);
                bulletStart = muzzleWorldPosition;
            } else {
                // Fallback: offset bullet start slightly forward from camera
                bulletStart.add(direction.clone().multiplyScalar(0.5));
            }
            
            this.bulletManager.createBullet(
                bulletStart,
                direction,
                this.bulletSpeed,
                this.range,
                this.damage
            );
        }

        // Also do instant raycast for immediate hit detection
        // Check both enemies and allies for friendly fire
        const enemies = this.teamManager.getEnemies();
        const allies = this.teamManager.getAllies();
        const allTargets = [...enemies, ...allies];
        const intersects = raycaster.intersectObjects(allTargets, true);

        if (intersects.length > 0) {
            const hit = intersects[0];
            const target = hit.object.parent || hit.object;
            if (target && target.userData.isEnemy) {
                // Hit an enemy
                this.teamManager.damageEnemy(target, this.damage);
            } else if (target && target.userData.team === 'blue') {
                // Hit an ally (friendly fire)
                this.teamManager.damageAlly(target, this.damage);
            }
        }
    }

    reload() {
        // Don't reload if already reloading
        if (this.isReloading) {
            return;
        }

        // Don't reload if already full
        if (this.currentAmmo >= this.maxAmmo) {
            return;
        }

        // Don't reload if no reserve ammo
        if (this.reserveAmmo <= 0) {
            return;
        }

        this.isReloading = true;
        
        // Start reload animation
        this.startReloadAnimation();
        
        setTimeout(() => {
            // Always fully reload: fill currentAmmo to maxAmmo
            // Use all available reserve ammo to fill the magazine
            const needed = this.maxAmmo - this.currentAmmo;
            const available = Math.min(needed, this.reserveAmmo);
            this.currentAmmo += available;
            this.reserveAmmo -= available;
            
            // End reload animation
            this.endReloadAnimation();
            this.isReloading = false;
        }, this.reloadTime * 1000);
    }

    startReloadAnimation() {
        if (!this.weaponMesh) return;
        
        // Tilt weapon down significantly during reload (gun holder lays down)
        this.reloadStartRotation = this.weaponMesh.rotation.x;
        this.reloadStartPosition = this.weaponMesh.position.clone();
        this.reloadStartTime = Date.now();
        
        // Create bullet shells dropping during reload
        this.createReloadShells();
    }

    createReloadShells() {
        if (!this.weaponMesh || !this.scene) return;
        
        // Clear any existing shells
        this.reloadShells.forEach(shell => {
            if (shell && shell.parent) {
                this.scene.remove(shell);
                if (shell.geometry) shell.geometry.dispose();
                if (shell.material) shell.material.dispose();
            }
        });
        this.reloadShells = [];
        
        // Get weapon position and rotation in world space
        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        this.weaponMesh.getWorldPosition(worldPosition);
        this.weaponMesh.getWorldQuaternion(worldQuaternion);
        
        // Calculate ejection port position relative to weapon
        // Ejection port is typically on the right side of the weapon
        const ejectionOffset = new THREE.Vector3(0.15, -0.1, -0.3); // Right side, slightly forward
        ejectionOffset.applyQuaternion(worldQuaternion);
        const ejectionPosition = worldPosition.clone().add(ejectionOffset);
        
        // Number of shells = number of bullets currently in magazine (being ejected)
        // Limit to reasonable number for performance (max 10 shells at once)
        const shellCount = Math.min(this.currentAmmo || 1, 10);
        
        // Create shells with staggered timing for more realistic effect
        for (let i = 0; i < shellCount; i++) {
            // Stagger shell creation slightly
            setTimeout(() => {
                this.createSingleShell(ejectionPosition, worldQuaternion, i);
            }, i * 50); // 50ms delay between each shell
        }
    }

    createSingleShell(ejectionPosition, worldQuaternion, index) {
        if (!this.scene) return;
        
        const shellGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8);
        const shellMaterial = new THREE.MeshLambertMaterial({ color: 0xffd700 }); // Gold/brass color
        const shell = new THREE.Mesh(shellGeometry, shellMaterial);
        
        // Position shell at ejection port with slight variation
        shell.position.copy(ejectionPosition);
        shell.position.x += (Math.random() - 0.5) * 0.05;
        shell.position.y += (Math.random() - 0.5) * 0.05;
        shell.position.z += (Math.random() - 0.5) * 0.05;
        
        // Random rotation
        shell.rotation.x = Math.random() * Math.PI;
        shell.rotation.y = Math.random() * Math.PI * 2;
        shell.rotation.z = Math.random() * Math.PI * 2;
        
        // Calculate ejection direction (rightward from weapon)
        const rightDirection = new THREE.Vector3(1, 0, 0);
        rightDirection.applyQuaternion(worldQuaternion);
        
        // Add physics-like properties with ejection force
        const ejectionForce = 0.8 + Math.random() * 0.4; // Random ejection force
        shell.userData.velocity = new THREE.Vector3(
            rightDirection.x * ejectionForce + (Math.random() - 0.5) * 0.2,
            -0.2 - Math.random() * 0.3, // Downward with variation
            rightDirection.z * ejectionForce * 0.5 + (Math.random() - 0.5) * 0.2
        );
        
        shell.userData.rotationSpeed = new THREE.Vector3(
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8,
            (Math.random() - 0.5) * 8
        );
        shell.userData.spawnTime = Date.now();
        shell.userData.lifetime = 3000; // Shells disappear after 3 seconds
        shell.userData.hasHitGround = false;
        
        shell.castShadow = true;
        shell.receiveShadow = true;
        this.scene.add(shell);
        this.reloadShells.push(shell);
    }

    endReloadAnimation() {
        if (!this.weaponMesh) return;
        
        // Reset weapon position/rotation
        this.weaponMesh.rotation.x = this.reloadStartRotation;
        if (this.reloadStartPosition) {
            this.weaponMesh.position.copy(this.reloadStartPosition);
        }
        
        // Clean up shells after a delay
        setTimeout(() => {
            this.reloadShells.forEach(shell => {
                if (shell && shell.parent) {
                    this.scene.remove(shell);
                    if (shell.geometry) shell.geometry.dispose();
                    if (shell.material) shell.material.dispose();
                }
            });
            this.reloadShells = [];
        }, 2000);
    }

    update(deltaTime) {
        if (this.isFiring && !this.isReloading) {
            this.fire();
        }

        // Update reload animation
        if (this.isReloading && this.weaponMesh && this.reloadStartTime > 0) {
            const elapsed = (Date.now() - this.reloadStartTime) / 1000;
            const normalizedProgress = Math.min(elapsed / this.reloadTime, 1);
            
            // Animate weapon tilting down significantly (gun holder lays down)
            // More aggressive tilt - weapon rotates down more
            const tiltAmount = Math.sin(normalizedProgress * Math.PI) * 0.8; // Increased from 0.3 to 0.8
            this.weaponMesh.rotation.x = this.reloadStartRotation + tiltAmount;
            
            // Position shift during reload (moves down and back)
            if (this.reloadStartPosition) {
                const shiftY = Math.sin(normalizedProgress * Math.PI) * 0.15; // Move down more
                const shiftZ = Math.sin(normalizedProgress * Math.PI) * 0.1; // Move forward slightly
                this.weaponMesh.position.y = this.reloadStartPosition.y - shiftY;
                this.weaponMesh.position.z = this.reloadStartPosition.z + shiftZ;
            }
        }
        
        // Update bullet shells physics
        this.updateReloadShells(deltaTime);

        // Auto-reload if empty
        if (this.currentAmmo <= 0 && this.reserveAmmo > 0 && !this.isReloading) {
            this.reload();
        }
    }

    updateReloadShells(deltaTime) {
        if (!this.reloadShells || this.reloadShells.length === 0) return;
        
        const now = Date.now();
        const gravity = -9.8;
        
        for (let i = this.reloadShells.length - 1; i >= 0; i--) {
            const shell = this.reloadShells[i];
            
            if (!shell || !shell.userData) {
                this.reloadShells.splice(i, 1);
                continue;
            }
            
            // Check lifetime
            if (now - shell.userData.spawnTime > shell.userData.lifetime) {
                if (shell.parent) {
                    this.scene.remove(shell);
                    if (shell.geometry) shell.geometry.dispose();
                    if (shell.material) shell.material.dispose();
                }
                this.reloadShells.splice(i, 1);
                continue;
            }
            
            // Skip physics if shell has hit ground and stopped
            if (shell.userData.hasHitGround) {
                // Shell is on ground, just slow down rotation gradually
                if (shell.userData.rotationSpeed) {
                    shell.userData.rotationSpeed.multiplyScalar(0.95);
                    shell.rotation.x += shell.userData.rotationSpeed.x * deltaTime;
                    shell.rotation.y += shell.userData.rotationSpeed.y * deltaTime;
                    shell.rotation.z += shell.userData.rotationSpeed.z * deltaTime;
                    
                    // Stop rotation if very slow
                    if (Math.abs(shell.userData.rotationSpeed.x) < 0.1 && 
                        Math.abs(shell.userData.rotationSpeed.y) < 0.1 && 
                        Math.abs(shell.userData.rotationSpeed.z) < 0.1) {
                        shell.userData.rotationSpeed.set(0, 0, 0);
                    }
                }
                continue;
            }
            
            // Update physics (gravity and velocity)
            if (shell.userData.velocity) {
                shell.userData.velocity.y += gravity * deltaTime;
                shell.position.add(shell.userData.velocity.clone().multiplyScalar(deltaTime));
            }
            
            // Update rotation
            if (shell.userData.rotationSpeed) {
                shell.rotation.x += shell.userData.rotationSpeed.x * deltaTime;
                shell.rotation.y += shell.userData.rotationSpeed.y * deltaTime;
                shell.rotation.z += shell.userData.rotationSpeed.z * deltaTime;
            }
            
            // Check collision with ground (account for terrain height if available)
            const groundHeight = this.getGroundHeightAt(shell.position.x, shell.position.z);
            if (shell.position.y <= groundHeight + 0.01) {
                // Small bounce effect if falling fast
                const verticalSpeed = shell.userData.velocity.y;
                if (verticalSpeed < -0.5 && !shell.userData.hasHitGround) {
                    // Bounce with reduced energy
                    shell.userData.velocity.y = -verticalSpeed * 0.3;
                    shell.position.y = groundHeight + 0.02;
                } else {
                    // Settle on ground
                    shell.position.y = groundHeight + 0.01;
                    shell.userData.hasHitGround = true;
                    
                    // Apply friction
                    shell.userData.velocity.y = 0;
                    shell.userData.velocity.x *= 0.7; // Horizontal friction
                    shell.userData.velocity.z *= 0.7;
                    
                    // Reduce rotation speed on impact
                    if (shell.userData.rotationSpeed) {
                        shell.userData.rotationSpeed.multiplyScalar(0.5);
                    }
                }
            }
        }
    }

    getGroundHeightAt(x, z) {
        // Use raycasting to find ground height
        const raycaster = new THREE.Raycaster();
        const origin = new THREE.Vector3(x, 100, z); // Start high above
        const direction = new THREE.Vector3(0, -1, 0); // Cast downward
        raycaster.set(origin, direction);
        
        // Raycast against all objects in scene to find ground
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
            // Find the first ground-like object (terrain, ground plane, etc.)
            for (const intersect of intersects) {
                const obj = intersect.object;
                // Check if it's ground or terrain
                if (obj.userData && obj.userData.isGround) {
                    return intersect.point.y;
                }
                // Check if it's terrain mesh
                if (obj.parent && obj.parent.type === 'LOD') {
                    return intersect.point.y;
                }
            }
            // Return first intersection if no specific ground found
            return intersects[0].point.y;
        }
        
        // Fallback to 0 if no intersection
        return 0;
    }
}

