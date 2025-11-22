import * as THREE from 'three';
import { Enemy } from './enemy.js';
import { BloodEffect } from '../effects/bloodEffect.js';

export class TeamManager {
    constructor(scene, collisionSystem, bulletManager = null) {
        this.scene = scene;
        this.collisionSystem = collisionSystem;
        this.bulletManager = bulletManager;
        
        this.playerTeam = 'blue'; // Player is on blue team (allies)
        this.enemyTeam = 'red';   // Enemies are red
        
        this.redScore = 100; // 100 enemies total
        this.blueScore = 10; // 1 player + 9 teammates = 10 total
        
        this.enemies = [];
        this.allies = [];
        this.bloodEffects = [];
        this.enemyGroups = []; // Store enemy groups for group movement
        
        // Respawn system for allies
        this.deadAllies = []; // Track dead allies waiting to respawn with their death times
        this.respawnDelay = 10.0; // Respawn delay in seconds (10 seconds)
        this.maxAllies = 9; // Maximum number of allies (9 teammates + 1 player = 10 total)
        this.allAlliesDeadTime = null; // Track when all allies died (for full respawn)
    }

    init() {
        this.spawnEnemies();
        this.spawnAllies();
    }

    spawnEnemies() {
        // Spawn 100 enemy team members (red team) in groups of 10
        // Player starts at center 0,0,0
        const teamSize = 100;
        const enemiesPerGroup = 10;
        const numGroups = teamSize / enemiesPerGroup; // 10 groups
        const groupSpreadRadius = 20; // Enemies in a group spawn within 20 units of group center
        const nearbyRadius = 500; // Spawn groups within 500 units (matching minimap range)
        const minDistance = 50; // Minimum distance from center for nearby groups (closer!)
        const mapSize = 25000; // Map extends from -25000 to +25000
        
        // Spawn enemy groups
        for (let groupIndex = 0; groupIndex < numGroups; groupIndex++) {
            // Calculate group center position
            let groupCenter;
            
            if (groupIndex < 5) {
                // First 5 groups spawn nearby (within 500 units) - more groups closer!
                // Distribute evenly around player
                const angle = (Math.PI * 2 / 5) * groupIndex + Math.random() * 0.3;
                const distance = minDistance + Math.random() * (nearbyRadius - minDistance);
                groupCenter = new THREE.Vector3(
                    Math.cos(angle) * distance,
                    0,
                    Math.sin(angle) * distance
                );
            } else {
                // Remaining groups spawn further away on the map
                const farMinDistance = nearbyRadius + 500;
                const farMaxDistance = mapSize * 0.9;
                const angle = Math.random() * Math.PI * 2;
                const distance = farMinDistance + Math.random() * (farMaxDistance - farMinDistance);
                groupCenter = new THREE.Vector3(
                    Math.cos(angle) * distance,
                    0,
                    Math.sin(angle) * distance
                );
            }
            
            // Create group object
            const group = {
                center: groupCenter.clone(),
                enemies: [],
                targetPosition: null // Will be set to player position
            };
            
            // Spawn enemies in this group (close together)
            for (let i = 0; i < enemiesPerGroup; i++) {
                // Spawn enemies in a tight formation around group center
                const angle = (Math.PI * 2 / enemiesPerGroup) * i + Math.random() * 0.3;
                const distance = Math.random() * groupSpreadRadius;
                
                let desiredPosition = new THREE.Vector3(
                    groupCenter.x + Math.cos(angle) * distance + (Math.random() - 0.5) * 5,
                    0,
                    groupCenter.z + Math.sin(angle) * distance + (Math.random() - 0.5) * 5
                );

                // Find a clear spawn position (not inside objects)
                const position = this.collisionSystem ? 
                    this.collisionSystem.findClearSpawnPosition(desiredPosition, 0.5, 1.6) : 
                    desiredPosition;
                
                // Ensure Y is always 0 (on ground)
                position.y = 0;

                const enemy = new Enemy(position, this.enemyTeam, this.collisionSystem, this.bulletManager, this.scene);
                enemy.init();
                // Assign enemy to group
                enemy.group = group;
                enemy.groupIndex = i; // Position in group formation
                enemy.isInGroup = true;
                if (enemy.mesh) {
                    this.scene.add(enemy.mesh);
                }
                this.enemies.push(enemy);
                group.enemies.push(enemy);
            }
            
            this.enemyGroups.push(group);
        }
    }

    spawnAllies(playerPosition = null) {
        // Spawn 9 friendly team members (blue team) - 1 player + 9 teammates = 10 total
        // If playerPosition is provided, spawn near player (for respawning)
        // Otherwise spawn at center 0,0,0 (initial spawn)
        const teamSize = this.maxAllies; // 9 teammates (player makes 10 total)
        const startRadius = 100; // Start around 100 units from player
        const maxDistance = 300; // Maximum distance from player
        
        // Use player position if provided, otherwise use center
        const spawnCenter = playerPosition ? playerPosition.clone() : new THREE.Vector3(0, 0, 0);
        
        for (let i = 0; i < teamSize; i++) {
            // Distribute teammates evenly around spawn center in circular formation
            const angle = (Math.PI * 2 / teamSize) * i + Math.random() * 0.2; // Slight variation
            const distance = startRadius * (0.7 + Math.random() * 0.6); // 70-130 units from spawn center
            
            let desiredPosition = new THREE.Vector3(
                spawnCenter.x + Math.cos(angle) * distance + (Math.random() - 0.5) * 20,
                0,
                spawnCenter.z + Math.sin(angle) * distance + (Math.random() - 0.5) * 20
            );

            // Find a clear spawn position (not inside objects)
            const position = this.collisionSystem ? 
                this.collisionSystem.findClearSpawnPosition(desiredPosition, 0.5, 1.6) : 
                desiredPosition;
            
            // Ensure Y is always 0 (on ground)
            position.y = 0;

            const ally = new Enemy(position, this.playerTeam, this.collisionSystem, this.bulletManager, this.scene);
            ally.init();
            // Mark as ally for special behavior
            ally.isAlly = true;
            ally.maxDistanceFromPlayer = maxDistance;
            if (ally.mesh) {
                this.scene.add(ally.mesh);
            }
            this.allies.push(ally);
        }
    }
    
    respawnAlly(playerPosition) {
        // Respawn a single ally near the player
        if (!playerPosition) return;
        
        const startRadius = 100; // Spawn around 100 units from player
        const maxDistance = 300; // Maximum distance from player
        
        // Random angle and distance around player
        const angle = Math.random() * Math.PI * 2;
        const distance = startRadius * (0.7 + Math.random() * 0.6); // 70-130 units from player
        
        let desiredPosition = new THREE.Vector3(
            playerPosition.x + Math.cos(angle) * distance + (Math.random() - 0.5) * 20,
            0,
            playerPosition.z + Math.sin(angle) * distance + (Math.random() - 0.5) * 20
        );

        // Find a clear spawn position (not inside objects)
        const position = this.collisionSystem ? 
            this.collisionSystem.findClearSpawnPosition(desiredPosition, 0.5, 1.6) : 
            desiredPosition;
        
        // Ensure Y is always 0 (on ground)
        position.y = 0;

        const ally = new Enemy(position, this.playerTeam, this.collisionSystem, this.bulletManager, this.scene);
        ally.init();
        // Mark as ally for special behavior
        ally.isAlly = true;
        ally.maxDistanceFromPlayer = maxDistance;
        if (ally.mesh) {
            this.scene.add(ally.mesh);
        }
        this.allies.push(ally);
        
        // Update bullet manager reference
        if (this.bulletManager) {
            ally.bulletManager = this.bulletManager;
        }
    }

    getEnemies() {
        return this.enemies.map(e => e.mesh);
    }

    getAllies() {
        return this.allies.map(a => a.mesh);
    }

    damageEnemy(enemyMesh, damage, hitPosition = null) {
        // Traverse up parent chain to find the root mesh
        let targetMesh = enemyMesh;
        while (targetMesh.parent && targetMesh.parent !== this.scene) {
            if (targetMesh.userData && (targetMesh.userData.isEnemy !== undefined || targetMesh.userData.team)) {
                break; // Found the root group with userData
            }
            targetMesh = targetMesh.parent;
        }
        
        const enemy = this.enemies.find(e => {
            // Check if this is the enemy's mesh or any parent/child
            let checkMesh = e.mesh;
            while (checkMesh) {
                if (checkMesh === targetMesh) return true;
                checkMesh = checkMesh.parent;
            }
            // Also check children
            let checkTarget = targetMesh;
            while (checkTarget) {
                if (checkTarget === e.mesh) return true;
                checkTarget = checkTarget.parent;
            }
            return false;
        });
        
        if (enemy) {
            enemy.takeDamage(damage);
            
            // Create blood effect at hit position or enemy position
            const bloodPos = hitPosition || enemy.mesh.position.clone();
            bloodPos.y += 1.0; // Slightly above center
            const bloodEffect = new BloodEffect(bloodPos, this.scene);
            this.bloodEffects.push(bloodEffect);
            
            if (enemy.health <= 0) {
                this.removeEnemy(enemy);
                this.redScore = Math.max(0, this.redScore - 1); // Each kill minus 1
            }
        }
    }

    damageAlly(allyMesh, damage, hitPosition = null) {
        // Traverse up parent chain to find the root mesh
        let targetMesh = allyMesh;
        while (targetMesh.parent && targetMesh.parent !== this.scene) {
            if (targetMesh.userData && (targetMesh.userData.isEnemy !== undefined || targetMesh.userData.team)) {
                break; // Found the root group with userData
            }
            targetMesh = targetMesh.parent;
        }
        
        const ally = this.allies.find(a => {
            // Check if this is the ally's mesh or any parent/child
            let checkMesh = a.mesh;
            while (checkMesh) {
                if (checkMesh === targetMesh) return true;
                checkMesh = checkMesh.parent;
            }
            // Also check children
            let checkTarget = targetMesh;
            while (checkTarget) {
                if (checkTarget === a.mesh) return true;
                checkTarget = checkTarget.parent;
            }
            return false;
        });
        
        if (ally) {
            ally.takeDamage(damage);
            
            // Create blood effect at hit position or ally position
            const bloodPos = hitPosition || ally.mesh.position.clone();
            bloodPos.y += 1.0; // Slightly above center
            const bloodEffect = new BloodEffect(bloodPos, this.scene);
            this.bloodEffects.push(bloodEffect);
            
            if (ally.health <= 0) {
                // Track dead ally for respawn (store death time in game time, not Date.now)
                this.deadAllies.push({
                    deathTime: 0 // Will be set in update method
                });
                this.removeAlly(ally);
                this.blueScore = Math.max(0, this.blueScore - 1); // Each kill minus 1
            }
        }
    }

    removeEnemy(enemy) {
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
            this.enemies.splice(index, 1);
            
            // Remove from group if in a group
            if (enemy.isInGroup && enemy.group) {
                const groupIndex = enemy.group.enemies.indexOf(enemy);
                if (groupIndex > -1) {
                    enemy.group.enemies.splice(groupIndex, 1);
                }
            }
            
            this.scene.remove(enemy.mesh);
            enemy.dispose();
        }
    }

    removeAlly(ally) {
        const index = this.allies.indexOf(ally);
        if (index > -1) {
            this.allies.splice(index, 1);
            this.scene.remove(ally.mesh);
            ally.dispose();
        }
    }

    update(deltaTime, playerPosition = null, playerMesh = null) {
        // Handle ally respawning
        if (playerPosition) {
            const aliveAlliesCount = this.allies.filter(a => a.health > 0).length;
            
            // Track when all allies die
            if (aliveAlliesCount === 0 && this.allies.length === 0) {
                if (this.allAlliesDeadTime === null) {
                    this.allAlliesDeadTime = 0; // Start timer
                }
                this.allAlliesDeadTime += deltaTime;
                
                // If all allies are dead, respawn all after delay
                if (this.allAlliesDeadTime >= this.respawnDelay) {
                    // Respawn all allies
                    this.spawnAllies(playerPosition);
                    this.allAlliesDeadTime = null; // Reset timer
                    this.deadAllies = []; // Clear dead allies list
                    
                    // Update bullet manager references
                    if (this.bulletManager) {
                        this.allies.forEach(ally => {
                            ally.bulletManager = this.bulletManager;
                        });
                    }
                }
            } else {
                // Reset all allies dead timer if we have allies again
                this.allAlliesDeadTime = null;
                
                // Update death times for dead allies and respawn them
                for (let i = this.deadAllies.length - 1; i >= 0; i--) {
                    const deadAlly = this.deadAllies[i];
                    deadAlly.deathTime += deltaTime;
                    
                    // If enough time has passed and we haven't reached max allies, respawn
                    if (deadAlly.deathTime >= this.respawnDelay && aliveAlliesCount < this.maxAllies) {
                        this.respawnAlly(playerPosition);
                        this.deadAllies.splice(i, 1); // Remove from dead list
                    }
                }
            }
        }
        
        // Get target lists for shooting
        const enemyMeshes = this.enemies.filter(e => e.health > 0).map(e => e.mesh);
        const allyMeshes = this.allies.filter(a => a.health > 0).map(a => a.mesh);
        
        // Update all enemies (pass player position for hunting and shooting)
        for (const enemy of this.enemies) {
            if (playerPosition) {
                enemy.setPlayerPosition(playerPosition);
            }
            // Enemies shoot at player and allies
            const enemyTargets = [];
            if (playerMesh) enemyTargets.push(playerMesh);
            enemyTargets.push(...allyMeshes);
            enemy.setTargets(enemyTargets);
            enemy.update(deltaTime);
        }

        // Update all allies (pass player position and enemies list for ally behavior and shooting)
        for (const ally of this.allies) {
            if (playerPosition) {
                ally.setPlayerPosition(playerPosition);
            }
            // Pass enemies list so allies can detect and engage them
            ally.setNearbyEnemies(enemyMeshes);
            // Allies shoot at enemies
            ally.setTargets(enemyMeshes);
            ally.update(deltaTime);
        }
        
        // Update blood effects
        for (let i = this.bloodEffects.length - 1; i >= 0; i--) {
            const effect = this.bloodEffects[i];
            if (effect.isActive) {
                effect.update(deltaTime);
            } else {
                this.bloodEffects.splice(i, 1);
            }
        }
    }

    checkGameEnd() {
        // Check if game should end - only win when all enemies are actually killed
        // Note: enemies are removed from array when they die, so we check if array is empty
        // AND verify that we had enemies spawned (redScore started at 100)
        const aliveEnemies = this.enemies.filter(e => e.health > 0).length;
        const aliveAllies = this.allies.filter(a => a.health > 0).length;
        
        // Blue team wins only when all enemies are killed
        // Check: no alive enemies AND we've killed all 100 (redScore reached 0 from initial 100)
        if (aliveEnemies === 0 && this.redScore === 0) {
            return { ended: true, winner: 'blue' };
        }
        
        // Red team wins when all allies are dead (including player)
        // Check: no alive allies AND we've killed all allies (blueScore reached 0 from initial 10)
        if (aliveAllies === 0 && this.blueScore === 0) {
            return { ended: true, winner: 'red' };
        }
        
        return { ended: false, winner: null };
    }
}

