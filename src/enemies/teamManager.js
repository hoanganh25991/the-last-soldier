import * as THREE from 'three';
import { Enemy } from './enemy.js';
import { BloodEffect } from '../effects/bloodEffect.js';

export class TeamManager {
    constructor(scene, collisionSystem) {
        this.scene = scene;
        this.collisionSystem = collisionSystem;
        
        this.playerTeam = 'blue'; // Player is on blue team (allies)
        this.enemyTeam = 'red';   // Enemies are red
        
        this.redScore = 100; // 100 enemies total
        this.blueScore = 10; // 1 player + 9 teammates = 10 total
        
        this.enemies = [];
        this.allies = [];
        this.bloodEffects = [];
        this.enemyGroups = []; // Store enemy groups for group movement
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
        const nearbyRadius = 300; // Spawn groups within 300 units
        const minDistance = 100; // Minimum distance from center for group centers
        const mapSize = 25000; // Map extends from -25000 to +25000
        
        // Spawn enemy groups
        for (let groupIndex = 0; groupIndex < numGroups; groupIndex++) {
            // Calculate group center position
            let groupCenter;
            
            if (groupIndex < 3) {
                // First 3 groups spawn nearby (within 300 units)
                const angle = (Math.PI * 2 / 3) * groupIndex + Math.random() * 0.5;
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

                const enemy = new Enemy(position, this.enemyTeam, this.collisionSystem);
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

    spawnAllies() {
        // Spawn 9 friendly team members (blue team) - 1 player + 9 teammates = 10 total
        // Player starts at center 0,0,0
        // Teammates start close to player (~100 units), can move away maximum 300 units
        const teamSize = 9; // 9 teammates (player makes 10 total)
        const startRadius = 100; // Start around 100 units from player
        const maxDistance = 300; // Maximum distance from player
        
        for (let i = 0; i < teamSize; i++) {
            // Distribute teammates evenly around player in circular formation
            const angle = (Math.PI * 2 / teamSize) * i + Math.random() * 0.2; // Slight variation
            const distance = startRadius * (0.7 + Math.random() * 0.6); // 70-130 units from player
            
            let desiredPosition = new THREE.Vector3(
                Math.cos(angle) * distance + (Math.random() - 0.5) * 20,
                0,
                Math.sin(angle) * distance + (Math.random() - 0.5) * 20
            );

            // Find a clear spawn position (not inside objects)
            const position = this.collisionSystem ? 
                this.collisionSystem.findClearSpawnPosition(desiredPosition, 0.5, 1.6) : 
                desiredPosition;

            const ally = new Enemy(position, this.playerTeam, this.collisionSystem);
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

    getEnemies() {
        return this.enemies.map(e => e.mesh);
    }

    getAllies() {
        return this.allies.map(a => a.mesh);
    }

    damageEnemy(enemyMesh, damage, hitPosition = null) {
        const enemy = this.enemies.find(e => e.mesh === enemyMesh || e.mesh === enemyMesh.parent);
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
        const ally = this.allies.find(a => a.mesh === allyMesh || a.mesh === allyMesh.parent);
        if (ally) {
            ally.takeDamage(damage);
            
            // Create blood effect at hit position or ally position
            const bloodPos = hitPosition || ally.mesh.position.clone();
            bloodPos.y += 1.0; // Slightly above center
            const bloodEffect = new BloodEffect(bloodPos, this.scene);
            this.bloodEffects.push(bloodEffect);
            
            if (ally.health <= 0) {
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

    update(deltaTime, playerPosition = null) {
        // Update all enemies (pass player position for hunting)
        for (const enemy of this.enemies) {
            if (playerPosition) {
                enemy.setPlayerPosition(playerPosition);
            }
            enemy.update(deltaTime);
        }

        // Update all allies (pass player position and enemies list for ally behavior)
        for (const ally of this.allies) {
            if (playerPosition) {
                ally.setPlayerPosition(playerPosition);
            }
            // Pass enemies list so allies can detect and engage them
            ally.setNearbyEnemies(this.enemies.filter(e => e.health > 0).map(e => e.mesh));
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
        // Check if game should end (one team reaches 0)
        if (this.redScore <= 0) {
            return { ended: true, winner: 'blue' };
        }
        if (this.blueScore <= 0) {
            return { ended: true, winner: 'red' };
        }
        return { ended: false, winner: null };
    }
}

