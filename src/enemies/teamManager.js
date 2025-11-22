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
        
        this.redScore = 100; // Total enemy pool (100 enemies available, decreases when enemies die)
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
        
        // Respawn system for enemies - spawn to match soldier count (allies + player)
        this.enemyRespawnTimer = 0; // Timer for enemy respawning
        this.enemyRespawnInterval = 2.0; // Check and spawn enemies every 2 seconds
        this.gameEnded = false; // Track if game has ended
        this.waveNumber = 0; // Track current wave number
        this.baseEnemyDamage = 20; // Base damage per wave
        this.damagePerWave = 5; // Damage increase per wave
        this.totalEnemyPool = 100; // Total enemies available (pool decreases when enemies die)
    }

    init() {
        this.spawnEnemies();
        this.spawnAllies();
    }

    spawnEnemies() {
        // Initial spawn: spawn enemies matching initial soldier count (9 teammates + 1 player = 10)
        // This is wave 0
        // Note: Initial spawn happens before player position is known, so spawn at center
        this.waveNumber = 0;
        const initialSoldierCount = this.maxAllies + 1; // 9 teammates + 1 player = 10
        const enemiesToSpawn = Math.min(initialSoldierCount, this.redScore);
        if (enemiesToSpawn > 0) {
            // Spawn enemies near center (0,0,0) for initial spawn
            const centerPosition = new THREE.Vector3(0, 0, 0);
            this.spawnEnemyWave(enemiesToSpawn, centerPosition);
        }
    }

    spawnEnemyWave(enemyCount, playerPosition = null) {
        // Spawn a wave of enemies matching the teammate count
        // Each wave increases enemy damage
        // If playerPosition is provided, spawn enemies away from player
        // Otherwise spawn randomly on the map
        
        if (enemyCount <= 0) return; // Don't spawn if no enemies needed
        
        const groupSpreadRadius = 20; // Enemies in a group spawn within 20 units of group center
        const nearbyRadius = 500; // Spawn groups within 500 units
        const minDistance = 50; // Minimum distance from center
        const mapSize = 25000; // Map extends from -25000 to +25000
        
        // Calculate group center position
        let groupCenter;
        const spawnCenter = playerPosition ? playerPosition.clone() : new THREE.Vector3(0, 0, 0);
        
        // Spawn enemies away from player (or randomly if no player position)
        if (playerPosition) {
            // Spawn enemies at a distance from player (not too close, not too far)
            const angle = Math.random() * Math.PI * 2;
            const distance = minDistance + Math.random() * (nearbyRadius - minDistance);
            groupCenter = new THREE.Vector3(
                spawnCenter.x + Math.cos(angle) * distance,
                0,
                spawnCenter.z + Math.sin(angle) * distance
            );
        } else {
            // Random spawn on map
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
            targetPosition: null
        };
        
        // Calculate damage for this wave
        const waveDamage = this.baseEnemyDamage + (this.waveNumber * this.damagePerWave);
        
        // Spawn enemies in this wave
        for (let i = 0; i < enemyCount; i++) {
            const angle = (Math.PI * 2 / enemyCount) * i + Math.random() * 0.3;
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

            // Create enemy with wave number and damage scaling
            const enemy = new Enemy(
                position, 
                this.enemyTeam, 
                this.collisionSystem, 
                this.bulletManager, 
                this.scene,
                this.waveNumber,
                this.baseEnemyDamage,
                this.damagePerWave
            );
            enemy.init();
            // Assign enemy to group
            enemy.group = group;
            enemy.groupIndex = i;
            enemy.isInGroup = true;
            if (enemy.mesh) {
                this.scene.add(enemy.mesh);
            }
            this.enemies.push(enemy);
            group.enemies.push(enemy);
        }
        
        this.enemyGroups.push(group);
        
        // Note: Pool (redScore) is NOT reduced when enemies spawn
        // Pool is only reduced when enemies die (in damageEnemy method)
        
        // Increment wave number for next wave
        this.waveNumber++;
    }

    spawnAllies(playerPosition = null) {
        // Spawn 9 friendly team members (blue team) - 1 player + 9 teammates = 10 total
        // If playerPosition is provided, spawn near player (for respawning)
        // Otherwise spawn at center 0,0,0 (initial spawn)
        
        // Clear existing allies before spawning new ones (for respawn scenario)
        // This ensures we don't exceed maxAllies
        this.allies.forEach(ally => {
            if (ally.mesh) {
                this.scene.remove(ally.mesh);
                ally.dispose();
            }
        });
        this.allies = [];
        
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
        
        // Update blue score when teammates are deployed
        // Count only alive teammates (not including player, so max is 9)
        const aliveAlliesCount = this.allies.filter(a => a.health > 0).length;
        // blueScore should be 1 (player) + aliveAlliesCount
        this.blueScore = 1 + aliveAlliesCount;
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
                // Reduce enemy pool when enemy dies (redScore tracks remaining pool)
                this.redScore = Math.max(0, this.redScore - 1);
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
                // Remove dead ally (no individual respawn - only respawn all when all die)
                this.removeAlly(ally);
                // Update blue score: 1 (player) + alive teammates count
                const aliveAlliesCount = this.allies.filter(a => a.health > 0).length;
                this.blueScore = 1 + aliveAlliesCount;
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
        // Don't spawn enemies if game has ended
        if (this.gameEnded) {
            return;
        }
        
        // Handle ally respawning - only respawn when ALL teammates die + 10 seconds
        if (playerPosition) {
            const aliveAlliesCount = this.allies.filter(a => a.health > 0).length;
            
            // Track when all allies die (all teammates dead, not including player)
            if (aliveAlliesCount === 0 && this.allies.length === 0) {
                if (this.allAlliesDeadTime === null) {
                    this.allAlliesDeadTime = 0; // Start timer
                }
                this.allAlliesDeadTime += deltaTime;
                
                // If all allies are dead, respawn all after delay (10 seconds)
                if (this.allAlliesDeadTime >= this.respawnDelay) {
                    // Respawn all allies (max 9 teammates)
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
                // Don't respawn individual allies - only respawn all when all die
            }
            
            // Update blue score based on alive teammates count
            // blueScore = 1 (player) + aliveAlliesCount (max 9)
            const currentAliveAllies = this.allies.filter(a => a.health > 0).length;
            this.blueScore = 1 + Math.min(currentAliveAllies, this.maxAllies);
        }
        
        // Handle enemy respawning - spawn enemies to match soldier count (allies + player)
        const aliveEnemiesCount = this.enemies.filter(e => e.health > 0).length;
        const aliveAlliesCount = this.allies.filter(a => a.health > 0).length;
        const totalSoldierCount = aliveAlliesCount + 1; // Allies + player
        
        // Calculate how many enemies we need to match soldier count
        const enemiesNeeded = totalSoldierCount - aliveEnemiesCount;
        
        // Update respawn timer
        this.enemyRespawnTimer += deltaTime;
        
        // Spawn enemies if timer reached interval OR if we have no enemies at all (immediate spawn)
        const shouldSpawn = this.enemyRespawnTimer >= this.enemyRespawnInterval || (aliveEnemiesCount === 0 && enemiesNeeded > 0);
        
        if (shouldSpawn) {
            // Always try to spawn enemies to match soldier count, as long as pool has enemies
            if (this.redScore > 0 && enemiesNeeded > 0) {
                // Calculate how many enemies to spawn (don't exceed pool)
                const enemiesToSpawn = Math.min(enemiesNeeded, this.redScore);
                
                if (enemiesToSpawn > 0) {
                    // Use player position if available, otherwise use center
                    const spawnPosition = playerPosition || new THREE.Vector3(0, 0, 0);
                    
                    // Spawn enemy wave matching soldier count
                    this.spawnEnemyWave(enemiesToSpawn, spawnPosition);
                    
                    // Update bullet manager references for newly spawned enemies
                    if (this.bulletManager) {
                        // Get the last spawned enemies (the ones we just added)
                        const newlySpawned = this.enemies.slice(-enemiesToSpawn);
                        newlySpawned.forEach(enemy => {
                            enemy.bulletManager = this.bulletManager;
                        });
                    }
                }
            }
            
            // Reset timer
            this.enemyRespawnTimer = 0;
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
        // Check if game should end
        const aliveAllies = this.allies.filter(a => a.health > 0).length;
        
        // Blue team wins when all 100 enemies in pool have been deployed and killed
        // redScore tracks remaining enemies in pool (starts at 100, decreases when enemies die)
        if (this.redScore <= 0) {
            this.gameEnded = true; // Stop enemy spawning
            return { ended: true, winner: 'blue' };
        }
        
        // Red team wins when all allies are dead (including player)
        // Check: no alive allies AND we've killed all allies (blueScore reached 0 from initial 10)
        if (aliveAllies === 0 && this.blueScore === 0) {
            this.gameEnded = true; // Stop enemy spawning
            return { ended: true, winner: 'red' };
        }
        
        return { ended: false, winner: null };
    }
    
    getEnemiesOnScreen() {
        // Return count of enemies currently on screen (alive)
        return this.enemies.filter(e => e.health > 0).length;
    }
    
    getEnemyPool() {
        // Return remaining enemies in pool (redScore)
        return this.redScore;
    }
    
    getTotalEnemyPool() {
        // Return the total enemy pool size (100)
        return this.totalEnemyPool;
    }
    
    setGameEnded(ended) {
        // Allow external code to set game ended state (e.g., when player dies)
        this.gameEnded = ended;
    }
}

