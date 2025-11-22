import * as THREE from 'three';
import { Enemy } from './enemy.js';
import { BloodEffect } from '../effects/bloodEffect.js';

export class TeamManager {
    constructor(scene, collisionSystem) {
        this.scene = scene;
        this.collisionSystem = collisionSystem;
        
        this.playerTeam = 'blue'; // Player is on blue team (allies)
        this.enemyTeam = 'red';   // Enemies are red
        
        this.redScore = 100;
        this.blueScore = 100;
        
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
        // Spawn them around the deployment area (player starts at center 0,0,0)
        const teamSize = 100;
        const spawnRadius = 300; // Spawn enemies within 300 units of deployment area
        const minDistance = 50; // Minimum distance from center
        
        for (let i = 0; i < teamSize; i++) {
            // Create a formation pattern - distribute around deployment area
            // Mix of circular formation and random scatter
            let angle, distance;
            
            if (i < teamSize * 0.7) {
                // 70% spawn in circular formation around deployment
                angle = (Math.PI * 2 / (teamSize * 0.7)) * i;
                distance = minDistance + Math.random() * (spawnRadius - minDistance);
            } else {
                // 30% spawn randomly scattered around deployment area
                angle = Math.random() * Math.PI * 2;
                distance = minDistance + Math.random() * spawnRadius;
            }
            
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
    }

    spawnAllies() {
        // Spawn 100 friendly team members (blue team)
        // Spawn them around the deployment area (player starts at center 0,0,0)
        // Allies spawn slightly further out than enemies to create a defensive perimeter
        const teamSize = 100;
        const spawnRadius = 400; // Spawn allies within 400 units of deployment area
        const minDistance = 200; // Minimum distance from center (further than enemies)
        
        for (let i = 0; i < teamSize; i++) {
            // Create a formation pattern - distribute around deployment area
            // Mix of circular formation and random scatter
            let angle, distance;
            
            if (i < teamSize * 0.7) {
                // 70% spawn in circular formation around deployment
                angle = (Math.PI * 2 / (teamSize * 0.7)) * i;
                distance = minDistance + Math.random() * (spawnRadius - minDistance);
            } else {
                // 30% spawn randomly scattered around deployment area
                angle = Math.random() * Math.PI * 2;
                distance = minDistance + Math.random() * (spawnRadius - minDistance);
            }
            
            let desiredPosition = new THREE.Vector3(
                Math.cos(angle) * distance + (Math.random() - 0.5) * 50,
                0,
                Math.sin(angle) * distance + (Math.random() - 0.5) * 50
            );

            // Find a clear spawn position (not inside objects)
            const position = this.collisionSystem ? 
                this.collisionSystem.findClearSpawnPosition(desiredPosition, 0.5, 1.6) : 
                desiredPosition;

            const ally = new Enemy(position, this.playerTeam, this.collisionSystem);
            ally.init();
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

        // Update all allies (they don't hunt player, just move randomly)
        for (const ally of this.allies) {
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

