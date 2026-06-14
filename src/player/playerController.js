import * as THREE from 'three';

export class PlayerController {
    constructor(camera, collisionSystem, scene) {
        this.camera = camera;
        this.collisionSystem = collisionSystem;
        this.scene = scene;
        
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.worldPosition = new THREE.Vector3(0, 1.6, 0);
        this._forward = new THREE.Vector3();
        this._right = new THREE.Vector3();
        this._moveVelocity = new THREE.Vector3();
        this._newPosition = new THREE.Vector3();
        this._velocityStep = new THREE.Vector3();
        this._scenePoint = new THREE.Vector3();
        this.moveSpeed = 5.0;
        this.sprintSpeed = 8.0;
        this.crouchSpeed = 2.5;
        this.jumpSpeed = 7.0; // Jump velocity
        this.currentSpeed = this.moveSpeed;
        this.canJump = false;
        this.isSprinting = false;
        this.isCrouching = false;
        this.isAiming = false;
        
        // Aim/zoom settings
        this.defaultFOV = 75;
        this.aimFOV = 25; // Zoomed in FOV (lower = more zoom)
        this.aimTransitionSpeed = 8.0; // Speed of FOV transition
        
        // Player health
        this.health = 100;
        this.maxHealth = 100;
        
        // Mouse/pointer controls
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.pitchObject = new THREE.Object3D();
        this.yawObject = new THREE.Object3D();
        
        // Current FOV for smooth zoom transition
        this.currentFOV = this.defaultFOV;
        
        // Touch controls
        this.touchJoystick = { x: 0, y: 0 };
        this.touchRotation = { x: 0, y: 0 };
        this.lastTouch = null;
        this.joystickTouchId = null; // Track which touch is controlling the joystick
        this.aimTouchId = null; // Track which touch is controlling the aim/camera
        this.touchControlsInitialized = false; // Prevent duplicate initialization
        this.settings = {};
        this.joystickDeadZone = 0.15;
        this.gyroRotation = { x: 0, y: 0 };
        this._lastGyro = null;
        this.gyroPermissionGranted = false;
        this._deviceOrientationHandler = null;
        this._wasAiming = false;
        this.boundMouseMoveHandler = this.onMouseMove.bind(this);
        
        this.initControls();
    }

    init() {
        // Setup camera rotation hierarchy
        this.yawObject.add(this.pitchObject);
        this.pitchObject.add(this.camera);
        this.scene.add(this.yawObject);
        
        // Set initial position
        this.yawObject.position.set(0, 1.6, 0);
        this.worldPosition.set(0, 1.6, 0);
        
        // Initialize camera FOV
        if (this.camera && this.camera.fov !== undefined) {
            this.camera.fov = this.defaultFOV;
            this.currentFOV = this.defaultFOV;
            this.camera.updateProjectionMatrix();
        }
        
        // Create invisible collider mesh for bullet collision detection
        // This represents the player's body at center height (Y=0.9)
        // Use cylinder geometry as a capsule approximation
        // Make it slightly larger (radius 0.6) to ensure bullets hit even with spread
        const colliderGeometry = new THREE.CylinderGeometry(0.6, 0.6, 1.8, 8);
        const colliderMaterial = new THREE.MeshBasicMaterial({ 
            visible: true, // Must be visible for raycast to detect it
            transparent: true,
            opacity: 0, // But fully transparent so it's invisible
            side: THREE.DoubleSide // Ensure both sides are detectable
        });
        this.colliderMesh = new THREE.Mesh(colliderGeometry, colliderMaterial);
        this.colliderMesh.userData.isPlayer = true;
        this.colliderMesh.userData.team = 'blue'; // Player is on blue team
        // Make sure raycast can detect this mesh
        this.colliderMesh.raycast = THREE.Mesh.prototype.raycast;
        this.scene.add(this.colliderMesh);
        this.initGyro();
    }

    applySettings(settings = {}) {
        this.settings = { ...this.settings, ...settings };
        this._lastGyro = null;
    }

    getLookSensitivityMultiplier() {
        const hip = this.settings.lookSensitivity ?? window.menuManager?.settings?.lookSensitivity ?? 50;
        const ads = this.settings.adsSens ?? window.menuManager?.settings?.adsSens ?? 25;
        const setting = this.isAiming ? ads : hip;
        return 0.2 + (setting / 100) * 1.8;
    }

    getTouchSensitivity() {
        return 0.001 + this.getLookSensitivityMultiplier() * 0.002;
    }

    getMouseSensitivity() {
        return 0.0005 + this.getLookSensitivityMultiplier() * 0.003;
    }

    getGyroStrength() {
        const hip = (this.settings.gyroLook ?? window.menuManager?.settings?.gyroLook ?? 0) / 100;
        const ads = (this.settings.gyroADS ?? window.menuManager?.settings?.gyroADS ?? 0) / 100;

        if (this.isAiming) {
            return ads > 0 ? ads : hip * 0.5;
        }
        return hip;
    }

    isGyroEnabled() {
        return this.gyroPermissionGranted && this.getGyroStrength() > 0;
    }

    initGyro() {
        if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
            return;
        }

        this._deviceOrientationHandler = this.onDeviceOrientation.bind(this);
        window.addEventListener('deviceorientation', this._deviceOrientationHandler, true);
    }

    async requestGyroPermission() {
        if (typeof DeviceOrientationEvent === 'undefined') {
            return false;
        }

        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            try {
                const state = await DeviceOrientationEvent.requestPermission();
                this.gyroPermissionGranted = state === 'granted';
                return this.gyroPermissionGranted;
            } catch (error) {
                console.debug('Gyro permission denied:', error.message);
                this.gyroPermissionGranted = false;
                return false;
            }
        }

        this.gyroPermissionGranted = true;
        return true;
    }

    onDeviceOrientation(event) {
        if (!this.isGyroEnabled()) {
            this._lastGyro = null;
            return;
        }

        if (event.beta === null || event.gamma === null) {
            return;
        }

        if (this._lastGyro === null) {
            this._lastGyro = { beta: event.beta, gamma: event.gamma };
            return;
        }

        const deltaGamma = event.gamma - this._lastGyro.gamma;
        const deltaBeta = event.beta - this._lastGyro.beta;
        this._lastGyro = { beta: event.beta, gamma: event.gamma };

        if (Math.abs(deltaGamma) < 0.05 && Math.abs(deltaBeta) < 0.05) {
            return;
        }

        const strength = this.getGyroStrength();
        const sens = strength * 0.025 * (Math.PI / 180);
        this.gyroRotation.x += deltaGamma * sens;
        this.gyroRotation.y -= deltaBeta * sens;
    }

    disposeGyro() {
        if (this._deviceOrientationHandler) {
            window.removeEventListener('deviceorientation', this._deviceOrientationHandler, true);
            this._deviceOrientationHandler = null;
        }
    }

    getCamera() {
        return this.camera;
    }

    initControls() {
        // Initialize keys object
        this.keys = {};
        
        // Mouse lock for desktop
        this.container = document.getElementById('game-container');
        if (this.container) {
            this.container.addEventListener('click', () => {
                if (!document.pointerLockElement) {
                    this.container.requestPointerLock().catch((err) => {
                        // Silently handle pointer lock errors (user cancelled, etc.)
                        console.debug('Pointer lock not available:', err.message);
                    });
                }
            });
        }

        // Pointer lock change
        const handlePointerLockChange = () => {
            if (document.pointerLockElement === this.container) {
                document.addEventListener('mousemove', this.boundMouseMoveHandler);
            } else {
                document.removeEventListener('mousemove', this.boundMouseMoveHandler);
            }
        };
        document.addEventListener('pointerlockchange', handlePointerLockChange);
        document.addEventListener('pointerlockerror', () => {
            console.debug('Pointer lock error');
        });

        // ESC key handler to release pointer lock
        const handleEscKey = (e) => {
            if (e.code === 'Escape' && document.pointerLockElement === this.container) {
                document.exitPointerLock();
            }
        };
        document.addEventListener('keydown', handleEscKey);

        // Keyboard controls - use capture phase to ensure we get the events
        const handleKeyDown = (e) => {
            // Don't prevent default for special keys to avoid blocking browser shortcuts
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            // Prevent default for game keys
            const gameKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
            if (gameKeys.includes(e.code)) {
                e.preventDefault();
                e.stopPropagation();
                this.keys[e.code] = true;
            }
            // Handle Space for jump
            if (e.code === 'Space') {
                e.preventDefault();
                e.stopPropagation();
                if (this.canJump && !this.isCrouching) {
                    this.velocity.y = this.jumpSpeed;
                    this.canJump = false;
                }
            }
            // Handle Shift for sprint
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                if (!this.isCrouching) { // Can't sprint while crouching
                    this.isSprinting = true;
                    this.currentSpeed = this.sprintSpeed;
                }
            }
            // Handle Ctrl for crouch
            if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
                e.preventDefault();
                this.isCrouching = true;
                this.currentSpeed = this.crouchSpeed;
                // Lower camera position significantly to hide under rocks/walls
                this.pitchObject.position.y = -1.0; // Lower camera much more when crouching
            }
        };

        const handleKeyUp = (e) => {
            const gameKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
            if (gameKeys.includes(e.code)) {
                e.preventDefault();
                e.stopPropagation();
                this.keys[e.code] = false;
            }
            // Handle Shift release
            if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
                this.isSprinting = false;
                if (!this.isCrouching) {
                    this.currentSpeed = this.moveSpeed;
                }
            }
            // Handle Ctrl release
            if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
                e.preventDefault();
                this.isCrouching = false;
                if (!this.isSprinting) {
                    this.currentSpeed = this.moveSpeed;
                } else {
                    this.currentSpeed = this.sprintSpeed;
                }
                // Return camera to normal position
                this.pitchObject.position.y = 0;
            }
        };

        // Use capture phase and make sure we catch events early
        window.addEventListener('keydown', handleKeyDown, true);
        window.addEventListener('keyup', handleKeyUp, true);
        
        // Also add to document as backup
        document.addEventListener('keydown', handleKeyDown, true);
        document.addEventListener('keyup', handleKeyUp, true);

        // Touch controls
        this.initTouchControls();
    }

    initTouchControls() {
        // Prevent duplicate initialization
        if (this.touchControlsInitialized) {
            return;
        }
        
        // Retry initialization if elements don't exist yet (HUD might not be visible)
        const joystickContainer = document.getElementById('joystick-container');
        const joystick = document.getElementById('joystick');
        
        // Safety check - ensure elements exist, retry after a short delay if not
        if (!joystickContainer || !joystick) {
            setTimeout(() => this.initTouchControls(), 100);
            return;
        }
        
        this.touchControlsInitialized = true;
        
        const joystickRadius = 75;
        const joystickHandleRadius = 30;

        // Helper function to find joystick touch in touch list
        const findJoystickTouch = (touches) => {
            if (this.joystickTouchId === null) return null;
            // Handle mouse (identifier -1)
            if (this.joystickTouchId === -1) return null; // Mouse is handled separately
            for (let i = 0; i < touches.length; i++) {
                if (touches[i].identifier === this.joystickTouchId) {
                    return touches[i];
                }
            }
            return null;
        };

        // Joystick touch handlers - start on container
        const handleJoystickStart = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!e.touches) return;

            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                if (this.joystickTouchId === null) {
                    this.joystickTouchId = touch.identifier;
                    this.updateJoystick(touch, joystickContainer, joystick, joystickRadius, joystickHandleRadius);
                    break;
                }
            }
        };

        // Mouse handlers for desktop testing
        let isMouseDown = false;
        const handleMouseDown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            isMouseDown = true;
            const rect = joystickContainer.getBoundingClientRect();
            const mockTouch = {
                clientX: e.clientX,
                clientY: e.clientY,
                identifier: -1 // Use -1 for mouse
            };
            this.joystickTouchId = -1;
            this.updateJoystick(mockTouch, joystickContainer, joystick, joystickRadius, joystickHandleRadius);
        };

        const handleMouseMove = (e) => {
            if (isMouseDown && this.joystickTouchId === -1) {
                e.preventDefault();
                const rect = joystickContainer.getBoundingClientRect();
                const mockTouch = {
                    clientX: e.clientX,
                    clientY: e.clientY,
                    identifier: -1
                };
                this.updateJoystick(mockTouch, joystickContainer, joystick, joystickRadius, joystickHandleRadius);
            }
        };

        const handleMouseUp = (e) => {
            if (isMouseDown && this.joystickTouchId === -1) {
                isMouseDown = false;
                this.joystickTouchId = null;
                this.touchJoystick = { x: 0, y: 0 };
                joystick.style.transform = 'translate(-50%, -50%)';
            }
        };

        // Add listeners to container (handle has pointer-events: none)
        joystickContainer.addEventListener('touchstart', handleJoystickStart, { passive: false });
        joystickContainer.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        // Global touch handlers to track joystick drag anywhere on screen
        const handleGlobalTouchMove = (e) => {
            // Handle joystick touch
            const joystickTouch = findJoystickTouch(e.touches);
            if (joystickTouch) {
                e.preventDefault();
                e.stopPropagation();
                this.updateJoystick(joystickTouch, joystickContainer, joystick, joystickRadius, joystickHandleRadius);
            }
            
            // Handle aim touch (will be handled separately, but we prevent default here if needed)
            const aimTouch = findAimTouch(e.touches);
            if (aimTouch && !joystickTouch) {
                // Aim touch handling is done in handleAimTouchMove
                // We just need to make sure preventDefault is called
            }
        };

        const handleGlobalTouchEnd = (e) => {
            // Check if joystick touch ended
            if (this.joystickTouchId !== null) {
                // Check if the joystick touch is in the ended touches
                let joystickTouchEnded = false;
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === this.joystickTouchId) {
                        joystickTouchEnded = true;
                        break;
                    }
                }
                
                // If joystick touch ended, reset joystick
                if (joystickTouchEnded) {
                    // Double check it's not still in active touches (shouldn't happen, but safety check)
                    const joystickTouch = findJoystickTouch(e.touches);
                    if (!joystickTouch) {
                        this.joystickTouchId = null;
                        this.touchJoystick = { x: 0, y: 0 };
                        joystick.style.transform = 'translate(-50%, -50%)';
                    }
                }
            }
        };

        // Add global touch handlers to document to catch drags outside container
        document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
        document.addEventListener('touchend', handleGlobalTouchEnd);
        document.addEventListener('touchcancel', handleGlobalTouchEnd);

        // Helper function to find aim touch in touch list
        const findAimTouch = (touches) => {
            if (this.aimTouchId === null) return null;
            for (let i = 0; i < touches.length; i++) {
                if (touches[i].identifier === this.aimTouchId) {
                    return touches[i];
                }
            }
            return null;
        };

        const isOnActionButton = (clientX, clientY) => {
            const selectors = [
                '.hud-bottom-right .btn-action',
                '.hud-top-left .btn-exit',
                '.hud-top-left .btn-chat',
                '.hud-top-right .btn-info'
            ];

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const rect = element.getBoundingClientRect();
                    if (clientX >= rect.left && clientX <= rect.right
                        && clientY >= rect.top && clientY <= rect.bottom) {
                        return true;
                    }
                }
            }
            return false;
        };

        const isOnJoystickArea = (clientX, clientY) => {
            const joystickRect = joystickContainer.getBoundingClientRect();
            const padding = 40;
            return clientX >= joystickRect.left - padding
                && clientX <= joystickRect.right + padding
                && clientY >= joystickRect.top - padding
                && clientY <= joystickRect.bottom + padding;
        };

        const handleAimTouchStart = (e) => {
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                if (touch.identifier === this.joystickTouchId) continue;
                if (touch.identifier === this.aimTouchId) {
                    this.lastTouch = { x: touch.clientX, y: touch.clientY };
                    continue;
                }
                if (isOnActionButton(touch.clientX, touch.clientY)) continue;
                if (isOnJoystickArea(touch.clientX, touch.clientY)) continue;
                if (touch.clientX <= window.innerWidth / 2) continue;

                if (this.aimTouchId === null) {
                    this.aimTouchId = touch.identifier;
                    this.lastTouch = { x: touch.clientX, y: touch.clientY };
                    break;
                }
            }
        };

        const handleAimTouchMove = (e) => {
            const aimTouch = findAimTouch(e.touches);
            if (!aimTouch || aimTouch.identifier === this.joystickTouchId) return;

            if (isOnJoystickArea(aimTouch.clientX, aimTouch.clientY)) {
                this.aimTouchId = null;
                this.lastTouch = null;
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            const deltaX = aimTouch.clientX - this.lastTouch.x;
            const deltaY = aimTouch.clientY - this.lastTouch.y;
            const sensitivity = this.getTouchSensitivity();

            this.touchRotation.x += deltaX * sensitivity;
            this.touchRotation.y += deltaY * sensitivity;
            this.touchRotation.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.touchRotation.y));

            this.lastTouch = { x: aimTouch.clientX, y: aimTouch.clientY };
        };

        const handleAimTouchEnd = (e) => {
            // Check if aim touch ended
            if (this.aimTouchId !== null) {
                for (let i = 0; i < e.changedTouches.length; i++) {
                    if (e.changedTouches[i].identifier === this.aimTouchId) {
                        // Check if it's still in active touches (shouldn't happen, but safety check)
                        const aimTouch = findAimTouch(e.touches);
                        if (!aimTouch) {
                            this.aimTouchId = null;
                            this.lastTouch = null;
                        }
                        break;
                    }
                }
            }
        };

        // Add touch handlers for aim control on right half of screen
        this.container.addEventListener('touchstart', handleAimTouchStart, { passive: false });
        document.addEventListener('touchmove', handleAimTouchMove, { passive: false });
        document.addEventListener('touchend', handleAimTouchEnd);
        document.addEventListener('touchcancel', handleAimTouchEnd);
    }

    updateJoystick(touch, container, joystick, radius, handleRadius) {
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = touch.clientX - centerX;
        const deltaY = touch.clientY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance < radius) {
            let normX = deltaX / radius;
            let normY = deltaY / radius;
            const magnitude = Math.sqrt(normX * normX + normY * normY);

            if (magnitude < this.joystickDeadZone) {
                this.touchJoystick.x = 0;
                this.touchJoystick.y = 0;
            } else {
                const scaled = (magnitude - this.joystickDeadZone) / (1 - this.joystickDeadZone);
                this.touchJoystick.x = (normX / magnitude) * scaled;
                this.touchJoystick.y = (normY / magnitude) * scaled;
            }

            joystick.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
        } else {
            const angle = Math.atan2(deltaY, deltaX);
            this.touchJoystick.x = Math.cos(angle);
            this.touchJoystick.y = Math.sin(angle);
            joystick.style.transform = `translate(calc(-50% + ${Math.cos(angle) * radius}px), calc(-50% + ${Math.sin(angle) * radius}px))`;
        }
        
        // Debug log (can be removed later)
        // console.log('Joystick values:', this.touchJoystick.x.toFixed(2), this.touchJoystick.y.toFixed(2));
    }

    onMouseMove(event) {
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;
        const sensitivity = this.getMouseSensitivity();
        
        this.euler.setFromQuaternion(this.yawObject.quaternion);
        this.euler.y -= movementX * sensitivity;
        this.euler.x -= movementY * sensitivity;
        this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
        this.yawObject.quaternion.setFromEuler(this.euler);
    }

    getMoveDirection() {
        this.direction.set(0, 0, 0);

        // Ensure keys object exists
        if (!this.keys) {
            this.keys = {};
        }

        // Desktop keyboard controls
        if (this.keys['KeyW'] || this.keys['ArrowUp']) this.direction.z -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) this.direction.z += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.direction.x -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) this.direction.x += 1;

        // Mobile joystick controls
        if (Math.abs(this.touchJoystick.x) > 0.001 || Math.abs(this.touchJoystick.y) > 0.001) {
            this.direction.x += this.touchJoystick.x;
            this.direction.z += this.touchJoystick.y;
        }

        // Normalize direction
        if (this.direction.length() > 0) {
            this.direction.normalize();
        }

        return this.direction;
    }

    update(deltaTime) {
        if (this._wasAiming !== this.isAiming) {
            this._lastGyro = null;
            this._wasAiming = this.isAiming;
        }

        // Update aim/zoom FOV smoothly
        const targetFOV = this.isAiming ? this.aimFOV : this.defaultFOV;
        this.currentFOV += (targetFOV - this.currentFOV) * this.aimTransitionSpeed * deltaTime;
        if (this.camera && this.camera.fov !== undefined) {
            this.camera.fov = this.currentFOV;
            this.camera.updateProjectionMatrix();
        }
        
        // Update camera rotation from touch + gyro
        const hasTouchRotation = Math.abs(this.touchRotation.x) > 0.001 || Math.abs(this.touchRotation.y) > 0.001;
        const hasGyroRotation = Math.abs(this.gyroRotation.x) > 0.0001 || Math.abs(this.gyroRotation.y) > 0.0001;

        if (hasTouchRotation || hasGyroRotation) {
            this.euler.setFromQuaternion(this.yawObject.quaternion);
            this.euler.y -= this.touchRotation.x + this.gyroRotation.x;
            this.euler.x -= this.touchRotation.y + this.gyroRotation.y;
            this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
            this.yawObject.quaternion.setFromEuler(this.euler);
            this.touchRotation.x *= 0.9;
            this.touchRotation.y *= 0.9;
            this.gyroRotation.x = 0;
            this.gyroRotation.y = 0;
        }

        // Get movement direction
        const moveDirection = this.getMoveDirection();

        this._forward.set(0, 0, -1);
        this._right.set(1, 0, 0);
        this._forward.applyQuaternion(this.yawObject.quaternion);
        this._right.applyQuaternion(this.yawObject.quaternion);
        this._forward.y = 0;
        this._right.y = 0;
        this._forward.normalize();
        this._right.normalize();

        this._moveVelocity.set(0, 0, 0);
        if (moveDirection.length() > 0) {
            this._moveVelocity.add(this._forward.multiplyScalar(-moveDirection.z * this.currentSpeed));
            this._moveVelocity.add(this._right.multiplyScalar(moveDirection.x * this.currentSpeed));
        }

        this.velocity.x = this._moveVelocity.x;
        this.velocity.z = this._moveVelocity.z;

        this.velocity.y -= 9.8 * deltaTime;

        this._velocityStep.copy(this.velocity).multiplyScalar(deltaTime);
        this._newPosition.copy(this.worldPosition).add(this._velocityStep);
        
        const collisionHeight = this.isCrouching ? 0.8 : 1.6;
        
        if (this.collisionSystem) {
            const collisionResult = this.collisionSystem.checkCollision(
                this.worldPosition,
                this._newPosition,
                0.5,
                collisionHeight
            );
            
            if (collisionResult.onGround) {
                this.velocity.y = 0;
                this.canJump = true;
            }
            
            this.worldPosition.copy(collisionResult.position);
        } else {
            this.worldPosition.copy(this._newPosition);
        }

        this.yawObject.position.set(0, this.worldPosition.y, 0);
        
        if (this.colliderMesh) {
            const colliderHeight = this.isCrouching ? 0.3 : 0.9;
            this.colliderMesh.position.set(0, colliderHeight, 0);
            // Scale down collider height when crouching to match lower profile
            if (this.isCrouching) {
                this.colliderMesh.scale.y = 0.5; // Make collider shorter when crouching
            } else {
                this.colliderMesh.scale.y = 1.0; // Normal height when standing
            }
            // Ensure collider is visible to raycast
            this.colliderMesh.visible = true;
        }

        // Damping only when not moving
        if (moveDirection.length() === 0) {
            this.velocity.x *= 0.9;
            this.velocity.z *= 0.9;
        }
    }
    
    getColliderMesh() {
        return this.colliderMesh;
    }

    getPosition() {
        return this.worldPosition;
    }

    scenePointToWorld(scenePoint, out = this._scenePoint) {
        out.set(
            this.worldPosition.x + scenePoint.x,
            this.worldPosition.y + (scenePoint.y - this.yawObject.position.y),
            this.worldPosition.z + scenePoint.z
        );
        return out;
    }

    worldPointToScene(worldPoint, out = this._scenePoint) {
        out.set(
            worldPoint.x - this.worldPosition.x,
            worldPoint.y,
            worldPoint.z - this.worldPosition.z
        );
        return out;
    }

    getRotation() {
        return this.yawObject.rotation;
    }

    getYawObject() {
        return this.yawObject;
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        // Health update will be handled by UI manager
        return this.health;
    }

    isDead() {
        return this.health <= 0;
    }

    getHealth() {
        return this.health;
    }

    getMaxHealth() {
        return this.maxHealth;
    }
    
    isAimingMode() {
        return this.isAiming;
    }
}

