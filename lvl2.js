/**
 * Level 2 Configuration & Logic
 * Modular, self-contained level implementation
 * 
 * Unlocks sunflower plant, allows 4 rows instead of 2
 */

const Level2 = {
    // Level metadata
    config: {
        name: 'Level 2',
        description: 'Defend with more plant variety',
        unlockedRows: 4,
        levelDuration: 93000, // 30+30+30+3 seconds
    },

    // Wave configuration - easily modifiable
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
            sunSpawnInterval: 12000,
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
        cherry: {
            name: 'Čerešchňon',
            image: 'dcherry.png',
            explosionImage: 'dcherryexp.png',
            cost: 150,
            health: 500,
            attackDamage: 0,
            width: 50,
            height: 50,
            collisionRadius: 25,
            placementCooldown: 15000,
            explodes: true,
            explodeDelay: 3000,
            explosionDuration: 500
        },
        coldpea: {
            name: 'Chladničkouhorkoň',
            image: 'dchpea.png',
            shootImage: 'dchpeashoot.png',
            cost: 175,
            health: 50,
            attackRange: 10000,
            attackDamage: 40,
            attackSpeed: 1000,
            shootDuration: 300,
            width: 50,
            height: 50,
            collisionRadius: 25,
            placementCooldown: 7500,
            slowsEnemies: true,
            slowMultiplier: 0.5,
            slowDuration: 3000
        },
        objekt76: {
            name: 'objekt#76',
            image: 'dcarnivore1empty.png',
            fullImage: 'dcarnivore1full.png',
            cost: 150,
            health: 150,
            width: 50,
            height: 50,
            collisionRadius: 25,
            placementCooldown: 7000,
            eatsEnemies: true,
            eatRange: 100,
            fullDuration: 13000
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
        'dsunflower.png',
        'ealc1.png',
        'ealc1low.png',
        'pecen.png',
        'projectile.png',
        'sun.png',
        'lvl1bcg.png',
        'dnut1.png',
        'dlawnmowerO.png',
        'dlawnmowerC.png',
        'dshovel.png',
        'dcherry.png',
        'dcherryexp.png',
        'projectilecold.png',
        'dchpea.png',
        'dchpeashoot.png',
        'dcarnivore1empty.png',
        'dcarnivore1full.png'
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
     * Determine if enemy should spawn based on wave configuration
     */
    shouldSpawnEnemy(waveEnemyConfig, lastSpawnTimes, currentTime) {
        if (!waveEnemyConfig || !waveEnemyConfig.enemies) return null;

        const enemyTypes = Object.keys(waveEnemyConfig.enemies);
        if (enemyTypes.length === 0) return null;

        for (let enemyType of enemyTypes) {
            const spawnConfig = waveEnemyConfig.enemies[enemyType];
            if (!spawnConfig) continue;

            const lastSpawn = lastSpawnTimes[enemyType] || 0;
            const timeSinceLastSpawn = currentTime - lastSpawn;

            if (timeSinceLastSpawn >= spawnConfig.spawnInterval && Math.random() < spawnConfig.spawnChance) {
                return enemyType;
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
