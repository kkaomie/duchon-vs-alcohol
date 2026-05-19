/**
 * Level 1 Configuration
 * Modular wave-based level system
 * 
 * Each level consists of 3 waves (internal, not visible to player)
 * Last wave (final wave) remains a special wave that triggers at 2 minutes
 * Progress bar shows: Wave1 + Wave2 + Wave3 + 3 seconds
 */

const LEVEL_CONFIG = {
    1: {
        name: 'Level 1',
        description: 'Defend the liver from basic alcohol zombies',
        unlockedRows: 2,
        
        // Wave configuration - easily modifiable
        waves: [
            {
                id: 1,
                name: 'Wave 1 - Warm Up',
                duration: 40000, // 40 seconds
                enemies: {
                    ealc1: {
                        spawnChance: 0.8,    // 80% chance to spawn a zombie
                        spawnInterval: 5000  // Every 5 seconds
                    }
                },
                startDelay: 20000 // Start after 20 seconds
            },
            {
                id: 2,
                name: 'Wave 2 - Increase',
                duration: 40000, // 40 seconds
                enemies: {
                    ealc1: {
                        spawnChance: 0.9,    // 90% chance
                        spawnInterval: 4000  // Every 4 seconds
                    }
                },
                startDelay: 0 // Starts right after wave 1
            },
            {
                id: 3,
                name: 'Wave 3 - Heavy',
                duration: 40000, // 40 seconds
                enemies: {
                    ealc1: {
                        spawnChance: 1.0,    // 100% spawn
                        spawnInterval: 3000  // Every 3 seconds
                    }
                },
                startDelay: 0 // Starts right after wave 2
            }
        ],
        
        // Final wave configuration (triggered at 2 minutes)
        finalWave: {
            multiplier: 0.5, // 50% of total enemies spawned in main waves
            duration: 8000   // 8 seconds to spawn all final wave enemies
        }
    },
    
    2: {
        name: 'Level 2',
        description: 'Defend with more plant variety',
        unlockedRows: 4,
        
        waves: [
            {
                id: 1,
                name: 'Wave 1 - Start',
                duration: 30000,
                enemies: {
                    ealc1: {
                        spawnChance: 0.7,
                        spawnInterval: 5000
                    }
                },
                startDelay: 20000
            },
            {
                id: 2,
                name: 'Wave 2 - Ramp Up',
                duration: 30000,
                enemies: {
                    ealc1: {
                        spawnChance: 0.85,
                        spawnInterval: 4000
                    }
                },
                startDelay: 0
            },
            {
                id: 3,
                name: 'Wave 3 - Intense',
                duration: 30000,
                enemies: {
                    ealc1: {
                        spawnChance: 1.0,
                        spawnInterval: 2500
                    }
                },
                startDelay: 0
            }
        ],
        
        finalWave: {
            multiplier: 0.5,
            duration: 8000
        }
    }
};

/**
 * Calculate total level duration from waves
 * Formula: sum of all wave durations + 3 seconds buffer
 */
function calculateLevelDuration(levelNumber) {
    const levelConfig = LEVEL_CONFIG[levelNumber];
    if (!levelConfig) return 120000; // Default 2 minutes
    
    const wavesDuration = levelConfig.waves.reduce((sum, wave) => sum + wave.duration, 0);
    return wavesDuration + 3000; // Add 3 second buffer
}

/**
 * Get wave schedule for a level
 * Returns array of {waveId, startTime, endTime, config}
 */
function getWaveSchedule(levelNumber) {
    const levelConfig = LEVEL_CONFIG[levelNumber];
    if (!levelConfig) return [];
    
    const schedule = [];
    let currentTime = 0;
    
    levelConfig.waves.forEach(wave => {
        const startTime = currentTime + wave.startDelay;
        const endTime = startTime + wave.duration;
        
        schedule.push({
            waveId: wave.id,
            name: wave.name,
            startTime,
            endTime,
            duration: wave.duration,
            config: wave
        });
        
        currentTime = endTime;
    });
    
    return schedule;
}

/**
 * Get enemy spawn configuration for current wave
 * Returns object with spawn chance and interval for each enemy type
 */
function getWaveEnemyConfig(levelNumber, gametime) {
    const schedule = getWaveSchedule(levelNumber);
    
    for (let waveInfo of schedule) {
        if (gametime >= waveInfo.startTime && gametime < waveInfo.endTime) {
            return {
                waveId: waveInfo.waveId,
                waveName: waveInfo.name,
                enemies: waveInfo.config.enemies,
                progress: (gametime - waveInfo.startTime) / waveInfo.duration
            };
        }
    }
    
    return null; // Not in any wave
}

/**
 * Determine if enemy should spawn based on wave configuration
 * Takes into account spawn chance and interval
 */
function shouldSpawnEnemy(waveEnemyConfig, lastSpawnTime, currentTime) {
    if (!waveEnemyConfig || !waveEnemyConfig.enemies.ealc1) return false;
    
    const spawnConfig = waveEnemyConfig.enemies.ealc1;
    const timeSinceLastSpawn = currentTime - lastSpawnTime;
    
    // Check interval
    if (timeSinceLastSpawn < spawnConfig.spawnInterval) {
        return false;
    }
    
    // Check spawn chance
    return Math.random() < spawnConfig.spawnChance;
}

/**
 * Get total enemies expected to spawn in all main waves
 * Used to calculate final wave count
 */
function calculateExpectedEnemyCount(levelNumber) {
    const schedule = getWaveSchedule(levelNumber);
    let expectedCount = 0;
    
    schedule.forEach(wave => {
        const spawnConfig = wave.config.enemies.ealc1;
        const spawnsPerWave = wave.duration / spawnConfig.spawnInterval;
        expectedCount += spawnsPerWave * spawnConfig.spawnChance;
    });
    
    return Math.floor(expectedCount);
}
