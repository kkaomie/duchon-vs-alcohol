/**
 * Level 3 Configuration & Logic
 * Modular, self-contained level implementation
 * 
 * Unlocks Orechoň plant, allows all 6 rows, introduces Lawn Mower tool
 */

const Level3 = {
    // Level metadata
    config: {
        name: 'Level 3',
        description: 'Full arsenal with lawn mower tool',
        unlockedRows: 6,
        levelDuration: 93000, // 30+30+30+3 seconds
    },

    // Wave configuration - easily modifiable
    waves: [
        {
            id: 1,
            name: 'Wave 1 - Start',
            duration: 50000,
            enemies: {
                ealc1: {
                    spawnChance: 0.7,
                    spawnInterval: 7000
                }
            },
            startDelay: 20000
        },
        {
            id: 2,
            name: 'Wave 2 - Ramp Up',
            duration: 40000,
            enemies: {
                ealc1: {
                    spawnChance: 0.85,
                    spawnInterval: 4000
                },
                ealc2: {
                    spawnChance: 1.0,
                    spawnInterval: 10000
                }
            },
            startDelay: 0
        },
        {
            id: 3,
            name: 'Wave 3 - Intense',
            duration: 40000,
            enemies: {
                ealc1: {
                    spawnChance: 1.0,
                    spawnInterval: 2500
                },
                ealc2: {
                    spawnChance: 0.6,
                    spawnInterval: 3000
                }
            },
            startDelay: 0
        }
    ],

    // Final wave configuration (triggered at 2 minutes)
    finalWave: {
        multiplier: 0.5,
        duration: 8000
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
        },
        ealc2: {
            name: 'Strong Zombie',
            image: 'ealc2.png',
            lowHealthImage: 'ealc2low.png',
            health: 500,
            speed: 0.1,
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
        'dsunflower.png',
        'dnut1.png',
        'dnut1low.png',
        'dlawnmowerO.png',
        'dlawnmowerC.png',
        'ealc1.png',
        'ealc1low.png',
        'ealc2.png',
        'ealc2low.png',
        'pecen.png',
        'projectile.png',
        'sun.png',
        'lvl1bcg.png'
    ],

    /**
     * Calculate total level duration from waves
     */
    getLevelDuration() {
        const wavesDuration = this.waves.reduce((sum, wave) => sum + wave.duration, 0);
        return wavesDuration + 3000;
    },

    /**
     * Get wave schedule for this level
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

        return null;
    },

    /**
     * Determine which enemy type should spawn and if it should spawn
     * Takes individual spawn timers for each enemy type
     */
    shouldSpawnEnemy(waveEnemyConfig, lastSpawnTimes, currentTime) {
        if (!waveEnemyConfig || !waveEnemyConfig.enemies) return null;

        // Collect all possible enemy types
        const enemyTypes = Object.keys(waveEnemyConfig.enemies);
        
        if (enemyTypes.length === 0) return null;

        // Check each enemy type independently with its own timer
        for (let enemyType of enemyTypes) {
            const spawnConfig = waveEnemyConfig.enemies[enemyType];
            const lastSpawn = lastSpawnTimes[enemyType] || 0;
            const timeSinceLastSpawn = currentTime - lastSpawn;

            // Check if enough time has passed and spawn chance succeeds
            if (timeSinceLastSpawn >= spawnConfig.spawnInterval && 
                Math.random() < spawnConfig.spawnChance) {
                return enemyType; // Return the enemy type to spawn
            }
        }

        return null;
    },

    /**
     * Get total enemies expected to spawn in all main waves
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
    },

    /**
     * Check if all main waves are complete
     */
    areWavesComplete(gametime) {
        const schedule = this.getWaveSchedule();
        if (schedule.length === 0) return false;
        const lastWave = schedule[schedule.length - 1];
        return gametime >= lastWave.endTime;
    }
};
