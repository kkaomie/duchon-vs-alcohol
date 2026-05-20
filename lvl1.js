/**
 * Level 1 Configuration & Logic
 * Modular, self-contained level implementation
 * 
 * Simplest level with just Peashooter, 2 rows
 */

const Level1 = {
    // Level metadata
    config: {
        name: 'Level 1',
        description: 'Defend the liver from basic alcohol zombies',
        unlockedRows: 2,
    },

    // Wave configuration - easily modifiable
    waves: [
        {
            id: 1,
            name: 'Wave 1 - Warm Up',
            duration: 40000, // 40 seconds
            enemies: {
                ealc1: {
                    spawnChance: 0.8,    // 80% chance to spawn a zombie
                    spawnInterval: 7000  // Every 5 seconds
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
                    spawnChance: 0.8,    // 90% chance
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

    // Final wave configuration (triggered after main waves)
    finalWave: {
        multiplier: 0.5, // 50% of total enemies spawned in main waves
        duration: 8000   // 8 seconds to spawn all final wave enemies
    },

    // Plant types available in this level
    plantTypes: {
        peashooter: {
            name: 'Peashooter',
            image: 'dpea1.png',
            shootImage: 'dpea1shoot.png',
            cost: 100,
            health: 50,
            attackRange: 10000,
            attackDamage: 50,
            attackSpeed: 1000,
            shootDuration: 200,
            width: 50,
            height: 50,
            collisionRadius: 25,
            placementCooldown: 5000
        },
        sunflower: {
            name: 'Sunflower',
            image: 'dsunflower.png',
            cost: 50,
            health: 20,
            attackDamage: 0,
            sunSpawnInterval: 14000,
            width: 50,
            height: 50,
            collisionRadius: 25,
            placementCooldown: 3000
        },
        orechon: {
            name: 'Orechoň',
            image: 'dnut1.png',
            lowHealthImage: 'dnut1low.png',
            cost: 75,
            health: 3500,
            attackDamage: 0,
            width: 50,
            height: 50,
            collisionRadius: 25,
            placementCooldown: 18000,
            lowHealthThreshold: 0.5
        },
        shovel: {
            name: 'Chlopatoň',
            image: 'dshovel.png',
            cost: 0, // Special item - not purchased
            health: 0,
            attackDamage: 0,
            width: 50,
            height: 50,
            collisionRadius: 25,
            placementCooldown: 0,
            isTool: true
        }
    },

    // Enemy types for this level
    enemyTypes: {
        ealc1: {
            name: 'Basic Zombie',
            image: 'ealc1.png',
            lowHealthImage: 'ealc1low.png',
            health: 300,
            speed: 0.075,
            damage: 20,
            damageInterval: 1000,
            width: 50,
            height: 50,
            collisionRadius: 25,
            lowHealthThreshold: 0.5
        }
    },

    // Images to preload
    preloadImages: [
        'dpea1.png',
        'dpea1shoot.png',
        'ealc1.png',
        'ealc1low.png',
        'pecen.png',
        'projectile.png',
        'sun.png',
        'lvl1bcg.png',
        'dsunflower.png',
        'dshovel.png'
    ],

    /**
     * Calculate total level duration from waves
     * Formula: sum of all wave durations + 3 seconds buffer
     */
    getLevelDuration() {
        const wavesDuration = this.waves.reduce((sum, wave) => sum + wave.duration, 0);
        return wavesDuration + 3000; // Add 3 second buffer
    },

    /**
     * Get wave schedule for this level
     * Returns array of {waveId, startTime, endTime, config}
     */
    getWaveSchedule() {
        const schedule = [];
        let currentTime = 0;

        this.waves.forEach(wave => {
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
    },

    /**
     * Get enemy spawn configuration for current wave
     * Returns object with spawn chance and interval for each enemy type
     */
    getWaveEnemyConfig(gametime) {
        const schedule = this.getWaveSchedule();

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
    },

    /**
     * Determine if enemy should spawn based on wave configuration
     * Takes into account spawn chance and interval
     */
    shouldSpawnEnemy(waveEnemyConfig, lastSpawnTime, currentTime) {
        if (!waveEnemyConfig || !waveEnemyConfig.enemies.ealc1) return false;

        const spawnConfig = waveEnemyConfig.enemies.ealc1;
        const timeSinceLastSpawn = currentTime - lastSpawnTime;

        // Check interval
        if (timeSinceLastSpawn < spawnConfig.spawnInterval) {
            return false;
        }

        // Check spawn chance
        return Math.random() < spawnConfig.spawnChance;
    },

    /**
     * Check if all main waves are complete
     */
    areWavesComplete(gametime) {
        const schedule = this.getWaveSchedule();
        if (schedule.length === 0) return false;
        const lastWave = schedule[schedule.length - 1];
        return gametime >= lastWave.endTime;
    },

    /**
     * Get total enemies expected to spawn in all main waves
     * Used to calculate final wave count
     */
    calculateExpectedEnemyCount() {
        const schedule = this.getWaveSchedule();
        let expectedCount = 0;

        schedule.forEach(wave => {
            const spawnConfig = wave.config.enemies.ealc1;
            const spawnsPerWave = wave.duration / spawnConfig.spawnInterval;
            expectedCount += spawnsPerWave * spawnConfig.spawnChance;
        });

        return Math.floor(expectedCount);
    }
};
