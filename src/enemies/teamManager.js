import * as THREE from 'three';
import { Enemy } from './enemy.js';

export class TeamManager {
    constructor(scene, collisionSystem) {
        this.scene = scene;
        this.collisionSystem = collisionSystem;
        
        this.playerTeam = 'red'; // Player is on red team
        this.enemyTeam = 'blue';
        
        this.redScore = 100;
        this.blueScore = 100;
        
        this.enemies = [];
        this.allies = [];
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
                1.6,
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
                1.6,
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

    damageEnemy(enemyMesh, damage) {
        const enemy = this.enemies.find(e => e.mesh === enemyMesh || e.mesh === enemyMesh.parent);
        if (enemy) {
            enemy.takeDamage(damage);
            if (enemy.health <= 0) {
                this.removeEnemy(enemy);
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

    update(deltaTime) {
        // Update all enemies
        for (const enemy of this.enemies) {
            enemy.update(deltaTime);
        }

        // Update all allies
        for (const ally of this.allies) {
            ally.update(deltaTime);
        }
    }
}

