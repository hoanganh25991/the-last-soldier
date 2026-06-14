export const SPAWN_COUNTS = {
    high:    { treeMultiplier: 1.0, obstacles: 170, houses: 150, vehicles: 80, barrels: 200, walls: 100, farStructures: true },
    medium:  { treeMultiplier: 0.5, obstacles: 85,  houses: 75,  vehicles: 40, barrels: 100, walls: 50,  farStructures: true },
    low:     { treeMultiplier: 0.3, obstacles: 51,  houses: 45,  vehicles: 24, barrels: 60,  walls: 30,  farStructures: true },
    minimal: { treeMultiplier: 0.15, obstacles: 26, houses: 23,  vehicles: 12, barrels: 30,  walls: 15,  farStructures: false }
};

export const TERRAIN_LOD = {
    high:    { segments: [96, 48, 24], distances: [0, 120, 280] },
    medium:  { segments: [64, 32, 16], distances: [0, 80, 200] },
    low:     { segments: [32, 16, 8],  distances: [0, 60, 150] },
    minimal: { segments: [16, 8, 4],   distances: [0, 40, 100] }
};

export const WORLD_VISIBILITY = {
    high:    { showDistance: 450, hideDistance: 600, fogNear: 50, fogFar: 220 },
    medium:  { showDistance: 320, hideDistance: 450, fogNear: 40, fogFar: 180 },
    low:     { showDistance: 220, hideDistance: 320, fogNear: 30, fogFar: 140 },
    minimal: { showDistance: 150, hideDistance: 220, fogNear: 25, fogFar: 110 }
};

export const ENEMY_LOD = {
    high:    { highDetail: 120, hide: 400 },
    medium:  { highDetail: 90,  hide: 300 },
    low:     { highDetail: 70,  hide: 220 },
    minimal: { highDetail: 50,  hide: 160 }
};

export const COLLISION_PROFILE = {
    high:    { lineOfSightInterval: 1, staggerMod: 1 },
    medium:  { lineOfSightInterval: 2, staggerMod: 2 },
    low:     { lineOfSightInterval: 3, staggerMod: 3 },
    minimal: { lineOfSightInterval: 4, staggerMod: 4 }
};

export const BULLET_PROFILE = {
    high:    { showTrail: true,  segments: 8 },
    medium:  { showTrail: true,  segments: 6 },
    low:     { showTrail: false, segments: 4 },
    minimal: { showTrail: false, segments: 4 }
};

let cachedProfiles = {};

export function getPerformanceProfile(qualityLevel) {
    if (cachedProfiles[qualityLevel]) {
        return cachedProfiles[qualityLevel];
    }

    cachedProfiles[qualityLevel] = {
        terrainLod: TERRAIN_LOD[qualityLevel] || TERRAIN_LOD.medium,
        worldVisibility: WORLD_VISIBILITY[qualityLevel] || WORLD_VISIBILITY.medium,
        enemyLod: ENEMY_LOD[qualityLevel] || ENEMY_LOD.medium,
        collision: COLLISION_PROFILE[qualityLevel] || COLLISION_PROFILE.medium,
        bullets: BULLET_PROFILE[qualityLevel] || BULLET_PROFILE.medium,
        spawnCounts: SPAWN_COUNTS[qualityLevel] || SPAWN_COUNTS.medium,
        castShadows: qualityLevel === 'high' || qualityLevel === 'medium',
        receiveShadows: qualityLevel === 'high' || qualityLevel === 'medium'
    };

    return cachedProfiles[qualityLevel];
}

export function clearPerformanceProfileCache() {
    cachedProfiles = {};
}
