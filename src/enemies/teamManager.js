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
    }

    init() {
        this.spawnEnemies();
        this.spawnAllies();
    }

    spawnEnemies() {
        // Spawn 100 enemy team members (red team)
        // Player starts at center 0,0,0
        const teamSize = 100;
        const nearbyEnemyCount = 9; // <10 enemies deployed around player
        const currentSpawnRadius = 300; // Current spawn radius
        const nearbyRadius = currentSpawnRadius * 3; // 3x far away = 900 units
        const minDistance = 50; // Minimum distance from center
        const mapSize = 25000; // Map extends from -25000 to +25000
        
        // Spawn nearby enemies (<10 enemies around player within 3x distance)
        for (let i = 0; i < nearbyEnemyCount; i++) {
            const angle = (Math.PI * 2 / nearbyEnemyCount) * i + Math.random() * 0.3; // Slight variation
            const distance = minDistance + Math.random() * (nearbyRadius - minDistance);
            
            let desiredPosition = new THREE.Vector3(
                Math.cos(angle) * distance + (Math.random() - 0.5) * 50,
                0,
                Math.sin(angle) * distance + (Math.random() - 0.5) * 50
            );

            // Find a clear spawn position (not inside objects)
            const position = this.collisionSystem ? 
                this.collisionSystem.findClearSpawnPosition(desiredPosition, 0.5, 1.6) : 
                desiredPosition;

            const enemy = new Enemy(position, this.enemyTeam, this.collisionSystem);
            enemy.init();
            this.scene.add(enemy.mesh);
            this.enemies.push(enemy);
        }
        
        // Spawn remaining enemies scattered across the large map
        const remainingEnemyCount = teamSize - nearbyEnemyCount; // 91 enemies
        const farMinDistance = nearbyRadius + 500; // Start spawning beyond nearby radius
        const farMaxDistance = mapSize * 0.9; // Use 90% of map size to avoid edges
        
        for (let i = 0; i < remainingEnemyCount; i++) {
            // Random position across the large map
            const angle = Math.random() * Math.PI * 2;
            const distance = farMinDistance + Math.random() * (farMaxDistance - farMinDistance);
            
            let desiredPosition = new THREE.Vector3(
                Math.cos(angle) * distance + (Math.random() - 0.5) * 200,
                0,
                Math.sin(angle) * distance + (Math.random() - 0.5) * 200
            );

            // Find a clear spawn position (not inside objects)
            const position = this.collisionSystem ? 
                this.collisionSystem.findClearSpawnPosition(desiredPosition, 0.5, 1.6) : 
                desiredPosition;

            const enemy = new Enemy(position, this.enemyTeam, this.collisionSystem);
            enemy.init();
            this.scene.add(enemy.mesh);
            this.enemies.push(enemy);
        }
    }

    spawnAllies() {
        // Spawn 9 friendly team members (blue team) - 1 player + 9 teammates = 10 total
        // Player starts at center 0,0,0
        // Teammates start close to player (~100 units), can move away maximum 900 units
        const teamSize = 9; // 9 teammates (player makes 10 total)
        const startRadius = 100; // Start around 100 units from player
        const maxDistance = 900; // Maximum distance from player (3x current spawn radius)
        
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
            this.scene.add(ally.mesh);
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

