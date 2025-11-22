import * as THREE from 'three';

export class PlayerController {
    constructor(camera, collisionSystem, scene) {
        this.camera = camera;
        this.collisionSystem = collisionSystem;
        this.scene = scene;
        
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.moveSpeed = 5.0;
        this.sprintSpeed = 8.0;
        this.currentSpeed = this.moveSpeed;
        this.canJump = false;
        this.isSprinting = false;
        this.isCrouching = false;
        
        // Player health
        this.health = 100;
        this.maxHealth = 100;
        
        // Mouse/pointer controls
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.pitchObject = new THREE.Object3D();
        this.yawObject = new THREE.Object3D();
        
        // Touch controls
        this.touchJoystick = { x: 0, y: 0 };
        this.touchRotation = { x: 0, y: 0 };
        this.lastTouch = null;
        
        // Bind mouse move handler once so we can properly remove it
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
        
        // Create invisible collider mesh for bullet collision detection
        // This represents the player's body at center height (Y=0.9)
        // Use cylinder geometry as a capsule approximation
        const colliderGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.6, 8);
        const colliderMaterial = new THREE.MeshBasicMaterial({ 
            visible: false, // Invisible
            transparent: true,
            opacity: 0
        });
        this.colliderMesh = new THREE.Mesh(colliderGeometry, colliderMaterial);
        this.colliderMesh.userData.isPlayer = true;
        this.colliderMesh.userData.team = 'blue'; // Player is on blue team
        this.scene.add(this.colliderMesh);
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
            const gameKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (gameKeys.includes(e.code)) {
                e.preventDefault();
                e.stopPropagation();
                this.keys[e.code] = true;
            }
        };

        const handleKeyUp = (e) => {
            const gameKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (gameKeys.includes(e.code)) {
                e.preventDefault();
                e.stopPropagation();
                this.keys[e.code] = false;
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
        const joystickContainer = document.getElementById('joystick-container');
        const joystick = document.getElementById('joystick');
        
        let isJoystickActive = false;
        const joystickRadius = 75;
        const joystickHandleRadius = 30;

        // Joystick touch handlers
        joystickContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            isJoystickActive = true;
            this.updateJoystick(e.touches[0], joystickContainer, joystick, joystickRadius, joystickHandleRadius);
        });

        joystickContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (isJoystickActive) {
                this.updateJoystick(e.touches[0], joystickContainer, joystick, joystickRadius, joystickHandleRadius);
            }
        });

        joystickContainer.addEventListener('touchend', (e) => {
            e.preventDefault();
            isJoystickActive = false;
            this.touchJoystick = { x: 0, y: 0 };
            joystick.style.transform = 'translate(-50%, -50%)';
        });

        // Screen rotation for camera
        let isRotating = false;
        this.container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1 && !isJoystickActive) {
                isRotating = true;
                this.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });

        this.container.addEventListener('touchmove', (e) => {
            if (isRotating && e.touches.length === 1) {
                e.preventDefault();
                const touch = e.touches[0];
                const deltaX = touch.clientX - this.lastTouch.x;
                const deltaY = touch.clientY - this.lastTouch.y;
                
                this.touchRotation.x += deltaX * 0.002;
                this.touchRotation.y += deltaY * 0.002;
                this.touchRotation.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.touchRotation.y));
                
                this.lastTouch = { x: touch.clientX, y: touch.clientY };
            }
        });

        this.container.addEventListener('touchend', () => {
            isRotating = false;
        });
    }

    updateJoystick(touch, container, joystick, radius, handleRadius) {
        const rect = container.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = touch.clientX - centerX;
        const deltaY = touch.clientY - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        if (distance < radius) {
            this.touchJoystick.x = deltaX / radius;
            this.touchJoystick.y = deltaY / radius;
            joystick.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
        } else {
            const angle = Math.atan2(deltaY, deltaX);
            this.touchJoystick.x = Math.cos(angle);
            this.touchJoystick.y = Math.sin(angle);
            joystick.style.transform = `translate(calc(-50% + ${Math.cos(angle) * radius}px), calc(-50% + ${Math.sin(angle) * radius}px))`;
        }
    }

    onMouseMove(event) {
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;
        
        this.euler.setFromQuaternion(this.yawObject.quaternion);
        this.euler.y -= movementX * 0.002;
        this.euler.x -= movementY * 0.002;
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
        if (Math.abs(this.touchJoystick.x) > 0.1 || Math.abs(this.touchJoystick.y) > 0.1) {
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
        // Update camera rotation from touch
        if (Math.abs(this.touchRotation.x) > 0.001 || Math.abs(this.touchRotation.y) > 0.001) {
            this.euler.setFromQuaternion(this.yawObject.quaternion);
            this.euler.y -= this.touchRotation.x;
            this.euler.x -= this.touchRotation.y;
            this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
            this.yawObject.quaternion.setFromEuler(this.euler);
            this.touchRotation.x *= 0.9;
            this.touchRotation.y *= 0.9;
        }

        // Get movement direction
        const moveDirection = this.getMoveDirection();

        // Apply movement relative to camera rotation
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);
        forward.applyQuaternion(this.yawObject.quaternion);
        right.applyQuaternion(this.yawObject.quaternion);
        forward.y = 0;
        right.y = 0;
        forward.normalize();
        right.normalize();

        // Calculate movement velocity
        const moveVelocity = new THREE.Vector3();
        if (moveDirection.length() > 0) {
            moveVelocity.add(forward.multiplyScalar(-moveDirection.z * this.currentSpeed));
            moveVelocity.add(right.multiplyScalar(moveDirection.x * this.currentSpeed));
        }

        // Apply horizontal movement
        this.velocity.x = moveVelocity.x;
        this.velocity.z = moveVelocity.z;

        // Apply gravity
        this.velocity.y -= 9.8 * deltaTime;

        // Check collisions and move
        const newPosition = this.yawObject.position.clone().add(this.velocity.clone().multiplyScalar(deltaTime));
        
        if (this.collisionSystem) {
            const collisionResult = this.collisionSystem.checkCollision(
                this.yawObject.position,
                newPosition,
                0.5,
                1.6
            );
            
            if (collisionResult.onGround) {
                this.velocity.y = 0;
                this.canJump = true;
            }
            
            this.yawObject.position.copy(collisionResult.position);
        } else {
            this.yawObject.position.copy(newPosition);
        }
        
        // Update collider mesh position to match player position (at body center height)
        if (this.colliderMesh) {
            this.colliderMesh.position.copy(this.yawObject.position);
            this.colliderMesh.position.y = 0.9; // Body center height
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
        return this.yawObject.position;
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

    getHealth() {
        return this.health;
    }

    getMaxHealth() {
        return this.maxHealth;
    }
}

