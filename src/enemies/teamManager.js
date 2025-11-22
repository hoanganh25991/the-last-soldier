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
        // Spawn enemy team members
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 / 5) * i;
            const distance = 30 + Math.random() * 20;
            const position = new THREE.Vector3(
                Math.cos(angle) * distance,
                0,
                Math.sin(angle) * distance
            );

            const enemy = new Enemy(position, this.enemyTeam);
            enemy.init();
            this.scene.add(enemy.mesh);
            this.enemies.push(enemy);
        }
    }

    spawnAllies() {
        // Spawn friendly team members
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 / 4) * i + Math.PI;
            const distance = 25 + Math.random() * 15;
            const position = new THREE.Vector3(
                Math.cos(angle) * distance,
                0,
                Math.sin(angle) * distance
            );

            const ally = new Enemy(position, this.playerTeam);
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
                this.redScore = Math.max(0, this.redScore - 10);
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
                this.blueScore = Math.max(0, this.blueScore - 10);
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

    update(deltaTime) {
        // Update all enemies
        for (const enemy of this.enemies) {
            enemy.update(deltaTime);
        }

        // Update all allies
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
}

