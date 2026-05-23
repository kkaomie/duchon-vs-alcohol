/**
 * Level 6 Configuration & Logic
 * Harder, longer version of Level 5 with more aggressive waves
 */

const Level6 = {
    config: {
        name: 'Level 6',
        description: 'Harder and longer version of level 5',
        unlockedRows: 6,
        levelDuration: 130000
    },

    waves: [
        {
            id: 1,
            name: 'Wave 1 - Brutal Start',
            duration: 60000,
            enemies: {
                ealc1: {
                    spawnChance: 1,
                    spawnInterval: 6500
                },
                ealc2: {
                    spawnChance: 1.0,
                    spawnInterval: 15000
                }
            },
            startDelay: 30000
        },
        {
            id: 2,
            name: 'Wave 2 - Cold Pressure',
            duration: 55000,
            enemies: {
                ealc1: {
                    spawnChance: 0.95,
                    spawnInterval: 3200
                },
                ealc2: {
                    spawnChance: 1.0,
                    spawnInterval: 8000
                },
                ealc3: {
                    spawnChance: 0.7,
                    spawnInterval: 12000
                }
            },
            startDelay: 10000
        },
        {
            id: 3,
            name: 'Wave 3 - Last Stand',
            duration: 55000,
            enemies: {
                ealc1: {
                    spawnChance: 1.0,
                    spawnInterval: 2000
                },
                ealc2: {
                    spawnChance: 0.8,
                    spawnInterval: 2800
                },
                ealc3: {
                    spawnChance: 1.0,
                    spawnInterval: 11000
                }
            },
            startDelay: 10000
        }
    ],

    finalWave: {
        multiplier: 0.55,
        duration: 22000
    },

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
            attackDamage: 0,
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
            cost: 0,
            health: 0,
            attackDamage: 0,
            width: 50,
            height: 50,
            collisionRadius: 25,
            placementCooldown: 0,
            isTool: true
        }
    },

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
        },
        ealc3: {
            name: 'Flying Zombie',
            image: 'ealc3.png',
            lowHealthImage: 'ealc3low.png',
            flyImage: 'ealc3fly.png',
            health: 500,
            speed: 0.075,
            flySpeed: 0.3,
            damage: 20,
            damageInterval: 1000,
            width: 50,
            height: 50,
            collisionRadius: 25,
            lowHealthThreshold: 0.5,
            isFlyer: true,
            initialState: 'flying'
        }
    },

    preloadImages: [
        'dpea1.png',
        'dpea1shoot.png',
        'dsunflower.png',
        'dnut1.png',
        'dnut1low.png',
        'dlawnmowerO.png',
        'dlawnmowerC.png',
        'dshovel.png',
        'ealc1.png',
        'ealc1low.png',
        'ealc2.png',
        'ealc2low.png',
        'ealc3.png',
        'ealc3low.png',
        'ealc3fly.png',
        'pecen.png',
        'projectile.png',
        'projectilecold.png',
        'ice.png',
        'sun.png',
        'lvl1bcg.png',
        'dcherryexp.png',
        'dchpea.png',
        'dchpeashoot.png',
        'dcarnivore1empty.png',
        'dcarnivore1full.png'
    ],

    getLevelDuration() {
        const wavesSum = this.waves.reduce((sum, wave) => sum + wave.duration + (wave.startDelay || 0), 0);
        const finalDur = (this.finalWave && this.finalWave.duration) ? this.finalWave.duration : 0;
        return wavesSum + finalDur + 5000;
    },

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

    shouldSpawnEnemy(waveEnemyConfig, lastSpawnTimes, currentTime) {
        if (!waveEnemyConfig || !waveEnemyConfig.enemies) return null;

        const enemyTypes = Object.keys(waveEnemyConfig.enemies);
        if (enemyTypes.length === 0) return null;

        for (let enemyType of enemyTypes) {
            const spawnConfig = waveEnemyConfig.enemies[enemyType];
            if (!spawnConfig) {
                console.warn(`Invalid spawn config for enemy type: ${enemyType}`);
                continue;
            }

            const lastSpawn = lastSpawnTimes[enemyType] || 0;
            const timeSinceLastSpawn = currentTime - lastSpawn;

            if (timeSinceLastSpawn >= spawnConfig.spawnInterval &&
                Math.random() < spawnConfig.spawnChance) {
                return enemyType;
            }
        }

        return null;
    },

    calculateExpectedEnemyCount() {
        const schedule = this.getWaveSchedule();
        let expectedCount = 0;

        schedule.forEach(wave => {
            if (wave.config.enemies && wave.config.enemies.ealc1) {
                const spawnConfig = wave.config.enemies.ealc1;
                const spawnsPerWave = wave.duration / spawnConfig.spawnInterval;
                expectedCount += spawnsPerWave * spawnConfig.spawnChance;
            }
        });

        return Math.floor(expectedCount);
    },

    areWavesComplete(gametime) {
        const schedule = this.getWaveSchedule();
        if (schedule.length === 0) return false;
        const lastWave = schedule[schedule.length - 1];
        return gametime >= lastWave.endTime;
    }
};
