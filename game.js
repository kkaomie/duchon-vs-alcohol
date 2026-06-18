window.initGame = function initGame(level) {
      console.log('game.js loaded: initGame registered');
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d');
      
      // Game paused state
      let gamePaused = false;
      let gameActive = true; // Track if game should still be running
      
      // Handle visibility changes - freeze game when window loses focus
      const handleVisibilityChange = () => {
          if (document.hidden) {
              gamePaused = true;
              // Don't mark as failed immediately - wait for actual blur
              console.log('Game paused - window hidden');
          } else {
              gamePaused = false;
              console.log('Game resumed - window visible');
          }
      };
      
      // Handle window/tab blur - user switched away
      const handleBlur = () => {
          // Add a small delay to detect if this is a real blur or just a temporary focus loss
          blurTimeout = setTimeout(() => {
              gamePaused = true;
              gameActive = false; // Mark as failed
              console.log('Game paused and marked as failed - window blurred (real blur detected)');
          }, 500); // 500ms grace period
      };
      
      // Handle window/tab focus - user came back
      const handleFocus = () => {
          // Clear the blur timeout if user comes back quickly
          if (blurTimeout) {
              clearTimeout(blurTimeout);
              blurTimeout = null;
          }
          gamePaused = false;
          console.log('Game resumed - window focused');
      };
      
      // Handle beforeunload - app/window closing
      const handleBeforeUnload = () => {
          gameActive = false; // Mark as failed
          console.log('Game marked as failed - app/window closing');
      };
      
      let blurTimeout = null;
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleBlur);
      window.addEventListener('focus', handleFocus);
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Set initial canvas size
      function resizeCanvas() {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
      }
      
      resizeCanvas();
      
      // Handle window resize and orientation change
      window.addEventListener('resize', resizeCanvas);
      window.addEventListener('orientationchange', () => {
          setTimeout(resizeCanvas, 100);
      });

      // Get level configuration
      let levelConfig = null;
      if (level === 99) {
          // Special speci level with modifiers
          // Use Level1 as the base and modify it
          if (typeof Level1 === 'undefined') {
              console.error('Level1 not loaded for speci level base');
              return;
          }
          // Create a shallow copy that preserves Level1's prototype chain and methods
          levelConfig = Object.assign(Object.create(Object.getPrototypeOf(Level1)), Level1);
          
          // Deep copy only the data properties to avoid reference issues
          levelConfig.config = JSON.parse(JSON.stringify(Level1.config));
          levelConfig.plantTypes = JSON.parse(JSON.stringify(Level1.plantTypes));
          levelConfig.enemyTypes = JSON.parse(JSON.stringify(Level1.enemyTypes));
          levelConfig.waves = JSON.parse(JSON.stringify(Level1.waves));
          if (Level1.finalWave) {
              levelConfig.finalWave = JSON.parse(JSON.stringify(Level1.finalWave));
          }
          levelConfig.preloadImages = [...Level1.preloadImages];
          
          // Ensure kosackon images are always preloaded for speci level
          ['dlawnmowerO.png', 'dlawnmowerC.png'].forEach(imgName => {
              if (!levelConfig.preloadImages.includes(imgName)) {
                  levelConfig.preloadImages.push(imgName);
              }
          });

          // Apply speci modifiers
          if (window.speciModifiers) {
              // For speci, default kosackon enabled when unspecified but allow the user to disable it via the checkbox
              if (window.speciModifiers.kosackonEnabled === undefined) {
                  window.speciModifiers.kosackonEnabled = true;
              }

              levelConfig.config.unlockedRows = window.speciModifiers.unlockedRows;
              levelConfig.speciModifiers = window.speciModifiers;
          }
      } else if (level === 1) {
          levelConfig = Level1;
      } else if (level === 2) {
          levelConfig = Level2;
      } else if (level === 3) {
          levelConfig = Level3;
      } else if (level === 4) {
          levelConfig = Level4;
      } else if (level === 5) {
          if (typeof Level5 === 'undefined') {
              const fallbackScript = document.createElement('script');
              fallbackScript.src = 'lvl5.js';
              fallbackScript.onload = () => {
                  if (typeof Level5 !== 'undefined') {
                      playLevel(Level5);
                  } else {
                      console.error('Level5 loaded but Level5 is still undefined');
                  }
              };
              fallbackScript.onerror = () => {
                  console.error('Failed to load lvl5.js fallback');
              };
              document.body.appendChild(fallbackScript);
              return;
          }
          levelConfig = Level5;
      } else if (level === 6) {
          if (typeof Level6 === 'undefined') {
              const fallbackScript = document.createElement('script');
              fallbackScript.src = 'lvl6.js';
              fallbackScript.onload = () => {
                  if (typeof Level6 !== 'undefined') {
                      playLevel(Level6);
                  } else {
                      console.error('Level6 loaded but Level6 is still undefined');
                  }
              };
              fallbackScript.onerror = () => {
                  console.error('Failed to load lvl6.js fallback');
              };
              document.body.appendChild(fallbackScript);
              return;
          }
          levelConfig = Level6;
      }

      if (!levelConfig) {
          console.error(`Level ${level} not found`);
          return;
      }

      playLevel(levelConfig);

      function playLevel(levelData) {
          // Stop background music when entering level
          if (typeof bgMusicManager !== 'undefined') {
              bgMusicManager.stopBackgroundMusic();
          }

          // Image preloader
          const preloadImages = levelData.preloadImages;

          const imageCache = {};
          let imagesLoaded = 0;

          function preloadImage(src) {
              return new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        imageCache[src] = img;
                        imagesLoaded++;
                        console.log(`Loaded: ${src} (${imagesLoaded}/${preloadImages.length})`);
                        resolve(img);
                    };
                    img.onerror = () => {
                        console.error('Failed to load:', src);
                        imagesLoaded++;
                        resolve(null);
                    };
                    img.src = './assets/' + src;
                });
          }

          // Preload all images
          Promise.all(preloadImages.map(preloadImage)).then(() => {
              console.log('All images preloaded');
              startGame();
          });

          function startGame() {
              // Responsive game constants based on screen size
              const isLandscape = window.innerWidth > window.innerHeight;
              
              let GRID_COLS = 10;
              let GRID_ROWS = 6;
              let UNLOCKED_ROWS = levelData.config.unlockedRows;
              let GRID_CELL_WIDTH = 60;
              let GRID_CELL_HEIGHT = 60;
              let SIDE_PADDING = 200; // Moved arena to the right
              let TOP_PADDING = 100;
              
              // Adjust for small screens (mobile landscape)
              if (window.innerHeight < 500) {
                    GRID_CELL_WIDTH = 45;
                    GRID_CELL_HEIGHT = 45;
                    SIDE_PADDING = 150;
                    TOP_PADDING = 60;
                }
                
              const GRID_WIDTH = GRID_COLS * GRID_CELL_WIDTH;
              const GRID_HEIGHT = GRID_ROWS * GRID_CELL_HEIGHT;
              const GRID_START_X = SIDE_PADDING;
              const GRID_START_Y = TOP_PADDING;
              const GRID_END_X = GRID_START_X + GRID_WIDTH;
              const DESTINATION_X = GRID_START_X - 40; // Closer to the finish line
              let PLANT_MENU_X = canvas.width - 150 - 60; // Moved 200px to the left, then 100px to the right
              const PLANT_MENU_Y = TOP_PADDING;
              
              // Calculate level duration from waves
              const LEVEL_DURATION = levelData.getLevelDuration();

              // Game state
              let suns = 50;
              let selectedPlant = null;
              let shovelMode = false; // Track if shovel is in use
              let plants = [];
              let enemies = [];
              let projectiles = [];
              let gameOver = false;
              let levelWon = false;
              let gametime = 0;
              let lastEnemySpawnTimes = {}; // Track spawn timers per enemy type
              let lastSunSpawn = 0;
              let gameOverTime = null;
              let isTransitioning = false;
              let totalEnemiesSpawned = 0;
              let mainWaveSpawnCounts = {}; // Track how many enemies of each type spawned during main waves
              let finalWaveTriggered = false;
              let finalWaveWarningTriggered = false;
              let finalWaveWarningTime = null;
              let loseScreenSubtitle = null; // Store the selected subtitle
              let finalWaveSpawningTime = null; // Time when final wave spawning started
              let finalWaveEnemiesSpawned = 0; // Track how many enemies spawned in final wave
              let waveEnemyConfig = null; // Current wave configuration
              let plantPlacementCooldowns = {}; // Track individual plant type cooldowns
              let lawnMowerUsedRows = new Set(); // Track which rows have been mowed
              let selectedLawnMowerRow = null; // Track selected lawn mower row
              let kosackonActiveRows = new Set(); // Track which rows have kosackon activated
              let kosackonAnimationState = {}; // Track state for each row
              let activeKosackons = []; // Track active kosackons traveling
              let gameLoopId = null; // Store the requestAnimationFrame ID so we can cancel it

              const startTime = Date.now();

              // Apply secret bonus suns if available
              if (typeof plantSelector !== 'undefined' && plantSelector.secretBonusSuns) {
                    suns += plantSelector.secretBonusSuns;
                    console.log(`Applied secret bonus: +${plantSelector.secretBonusSuns} suns`);
                }

              // Plant types from level configuration
              const PLANT_TYPES = levelData.plantTypes;

              // Enemy types from level configuration (clone so we can safely modify for speci)
              let ENEMY_TYPES = JSON.parse(JSON.stringify(levelData.enemyTypes));
              let ENEMY_TYPE = ENEMY_TYPES.ealc1; // Default enemy type for this level

              // Apply speci level modifiers
              let gameTimeMultiplier = 1.0;
              let kosackonEnabled = true;
              let enabledEnemyTypes = {ealc1: true, ealc2: true, ealc3: true};
              let finalWavePercent = 50;
              
              if (level === 99 && levelData.speciModifiers) {
                  gameTimeMultiplier = levelData.speciModifiers.timeSpeed;
                  kosackonEnabled = !!levelData.speciModifiers.kosackonEnabled;
                  enabledEnemyTypes = levelData.speciModifiers.enemyTypes || enabledEnemyTypes;
                  finalWavePercent = levelData.speciModifiers.finalWavePercent || finalWavePercent;

                  // Apply damage & speed multipliers to ALL enemy type definitions used for spawning
                  const dmgMult = levelData.speciModifiers.enemyDamage || 1.0;
                  const spdMult = levelData.speciModifiers.enemySpeed || 1.0;

                  Object.keys(ENEMY_TYPES).forEach(key => {
                      const e = ENEMY_TYPES[key];
                      if (!e) return;
                      if (typeof e.health === 'number') e.health = Math.max(1, e.health * dmgMult);
                      // enemy property for damage is sometimes 'damage' or 'attackDamage'
                      if (typeof e.damage === 'number') e.damage = Math.max(0, e.damage * dmgMult);
                      if (typeof e.attackDamage === 'number') e.attackDamage = Math.max(0, e.attackDamage * dmgMult);
                      if (typeof e.speed === 'number') e.speed = Math.max(0.001, e.speed * spdMult);
                      if (typeof e.flySpeed === 'number') e.flySpeed = Math.max(0.001, e.flySpeed * spdMult);
                  });

                  // Update default single ENEMY_TYPE reference in case some code uses it
                  ENEMY_TYPE = ENEMY_TYPES.ealc1 ? ENEMY_TYPES.ealc1 : ENEMY_TYPE;

                  console.log('Speci level modifiers applied:', {
                      timeSpeed: gameTimeMultiplier,
                      enemyDamage: levelData.speciModifiers.enemyDamage,
                      enemySpeed: levelData.speciModifiers.enemySpeed,
                      unlockedRows: levelData.speciModifiers.unlockedRows,
                      kosackonEnabled: kosackonEnabled,
                      enabledEnemyTypes: enabledEnemyTypes,
                      finalWavePercent: finalWavePercent
                  });
              }

              // Kosackon class
              class Kosackon {
                    constructor(rowIndex) {
                        this.rowIndex = rowIndex;
                        this.x = GRID_START_X - 80; // Start outside arena to the left (30px closer to arena)
                        this.y = GRID_START_Y + rowIndex * GRID_CELL_HEIGHT + GRID_CELL_HEIGHT / 2;
                        this.speed = 3 * gameTimeMultiplier; // Apply speed multiplier
                        this.size = (GRID_CELL_WIDTH / 4) * 2.5; // Slightly bigger (was 2x)
                        this.startTime = Date.now();
                        this.animationState = 0;
                    }

                    update() {
                        this.x += this.speed;
                        
                        // Update animation
                        const now = Date.now();
                        const timeSinceStart = now - this.startTime;
                        this.animationState = Math.floor((timeSinceStart / 200) % 2); // Alternate every 200ms
                        
                        // Return true if still traveling, false if reached end
                        return this.x < GRID_END_X + 100;
                    }

                    draw() {
                        const kosackonImage = this.animationState === 0 ? 'dlawnmowerO.png' : 'dlawnmowerC.png';
                        const img = imageCache[kosackonImage];
                        if (img) {
                            ctx.drawImage(img, this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
                        } else {
                            ctx.fillStyle = '#888888';
                            ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
                        }
                    }

                    collidesWith(enemy) {
                        const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                        return dist < this.size / 2 + enemy.type.collisionRadius;
                    }
                }

              // Plant class
              class Plant {
                    constructor(type, gridX, gridY) {
                        this.type = PLANT_TYPES[type];
                        this.gridX = gridX;
                        this.gridY = gridY;
                        this.x = GRID_START_X + gridX * GRID_CELL_WIDTH + GRID_CELL_WIDTH / 2;
                        this.y = GRID_START_Y + gridY * GRID_CELL_HEIGHT + GRID_CELL_HEIGHT / 2;
                        this.health = this.type.health;
                        this.lastAttack = 0;
                        this.isShooting = false;
                        this.shootStartTime = 0;
                        this.lastSunSpawn = 0;
                        this.placementTime = Date.now();
                        this.plantType = type;
                        this.explosionStarted = false;
                        this.explosionStartTime = null;
                        this.isFull = false;
                        this.fullEndTime = 0;
                        this.songId = `plant_${gridX}_${gridY}_${type}_${this.placementTime}`;
                        
                        // Start playing the plant's level song when placed
                        if (typeof plantAudioManager !== 'undefined' && typeof PLANT_DATABASE !== 'undefined') {
                            const plantData = PLANT_DATABASE[type];
                            if (plantData && plantData.levelSong) {
                                plantAudioManager.playPlantSong(this.songId, plantData.levelSong);
                            }
                        }
                    }

                    draw() {
                        const now = Date.now();
                        if (this.type.explodes && this.explosionStarted) {
                            const elapsed = now - this.explosionStartTime;
                            if (elapsed < this.type.explosionDuration / gameTimeMultiplier) {
                                const img = imageCache[this.type.explosionImage];
                                const explosionSize = Math.max(GRID_CELL_WIDTH, GRID_CELL_HEIGHT) * 3;
                                if (img) {
                                    ctx.drawImage(img, this.x - explosionSize / 2, this.y - explosionSize / 2, explosionSize, explosionSize);
                                } else {
                                    ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
                                    ctx.fillRect(this.x - explosionSize / 2, this.y - explosionSize / 2, explosionSize, explosionSize);
                                }
                                return;
                            }
                        }
                        let imageToUse = this.type.image;
                        
                        if (this.isFull && this.type.fullImage) {
                            imageToUse = this.type.fullImage;
                        }
                        
                        // Check for low health state
                        if (!this.isFull && this.type.lowHealthImage) {
                            const healthPercent = this.health / this.type.health;
                            if (healthPercent <= this.type.lowHealthThreshold) {
                                imageToUse = this.type.lowHealthImage;
                            }
                        }
                        
                        if (this.type.shootImage && this.isShooting && now - this.shootStartTime < this.type.shootDuration / gameTimeMultiplier) {
                            const img = imageCache[this.type.shootImage];
                            if (img) {
                                ctx.drawImage(img, this.x - this.type.width / 2, this.y - this.type.height / 2, this.type.width, this.type.height);
                            } else {
                                ctx.fillStyle = '#00cc00';
                                ctx.fillRect(this.x - this.type.width / 2, this.y - this.type.height / 2, this.type.width, this.type.height);
                            }
                        } else {
                            this.isShooting = false;
                            const img = imageCache[imageToUse];
                            if (img) {
                                ctx.drawImage(img, this.x - this.type.width / 2, this.y - this.type.height / 2, this.type.width, this.type.height);
                            } else {
                                ctx.fillStyle = '#00cc00';
                                ctx.fillRect(this.x - this.type.width / 2, this.y - this.type.height / 2, this.type.width, this.type.height);
                            }
                        }
                        ctx.fillStyle = '#ff0000';
                        ctx.fillRect(this.x - this.type.width / 2, this.y - this.type.height / 2 - 10, this.type.width * (this.health / this.type.health), 5);
                    }

                    canAttack() {
                        const now = Date.now();
                        return (now - this.lastAttack >= this.type.attackSpeed / gameTimeMultiplier);
                    }

                    attack(enemies) {
                        if (this.type.explodes || this.type.eatsEnemies) return;
                        const now = Date.now();
                        if (!this.canAttack()) return;

                        for (let enemy of enemies) {
                            if (enemy.rowIndex === this.gridY && enemy.x > this.x) {
                                const distX = enemy.x - this.x;
                                if (distX <= this.type.attackRange) {
                                    projectiles.push(new Projectile(this.x, this.y, enemy, this.plantType));
                                    this.lastAttack = now;
                                    this.isShooting = true;
                                    this.shootStartTime = now;
                                    break;
                                }
                            }
                        }
                    }

                    produceSun() {
                        const now = Date.now();
                        if (this.type.sunSpawnInterval) {
                            const timeSincePlacement = now - this.placementTime;
                            const timeSinceLastSpawn = now - this.lastSunSpawn;
                            
                            if (timeSincePlacement >= this.type.sunSpawnInterval / gameTimeMultiplier && timeSinceLastSpawn >= this.type.sunSpawnInterval / gameTimeMultiplier) {
                                suns_on_screen.push(new Sun(this.x, this.y, true));
                                this.lastSunSpawn = now;
                            }
                        }
                    }

                    update(enemies) {
                        const now = Date.now();
                        if (this.type.eatsEnemies) {
                            if (this.isFull) {
                                if (now >= this.fullEndTime) {
                                    this.isFull = false;
                                }
                                return;
                            }

                            for (let enemy of enemies) {
                                if (enemy.rowIndex === this.gridY && enemy.x > this.x) {
                                    const distX = enemy.x - this.x;
                                    if (distX <= (this.type.eatRange || 50)) {
                                        enemy.health = 0;
                                        this.isFull = true;
                                        this.fullEndTime = now + (this.type.fullDuration / gameTimeMultiplier || 10000);
                                        this.health = this.type.health;
                                        break;
                                    }
                                }
                            }
                            return;
                        }

                        if (!this.type.explodes) return;
                        if (!this.explosionStarted && now - this.placementTime >= this.type.explodeDelay / gameTimeMultiplier) {
                            this.explosionStarted = true;
                            this.explosionStartTime = now;
                            this.explode(enemies);
                        }
                        if (this.explosionStarted && now - this.explosionStartTime >= this.type.explosionDuration / gameTimeMultiplier) {
                            this.health = 0;
                        }
                    }

                    explode(enemies) {
                        enemies.forEach(enemy => {
                            const enemyGridX = Math.floor((enemy.x - GRID_START_X) / GRID_CELL_WIDTH);
                            const dx = enemyGridX - this.gridX;
                            const dy = enemy.rowIndex - this.gridY;
                            if ((dy === 0 && Math.abs(dx) <= 1) || (dx === 0 && Math.abs(dy) <= 1)) {
                                enemy.health = 0;
                            }
                        });
                    }

                    collidesWith(x, y) {
                        const dist = Math.hypot(x - this.x, y - this.y);
                        return dist < this.type.collisionRadius + ENEMY_TYPE.collisionRadius;
                    }

                    isNearby(x, y) {
                        const dist = Math.hypot(x - this.x, y - this.y);
                        return dist < this.type.collisionRadius + ENEMY_TYPE.collisionRadius + 30;
                    }

                    isAlive() {
                        return this.health > 0;
                    }

                    destroy() {
                        // Stop the plant's song when it dies
                        if (typeof plantAudioManager !== 'undefined') {
                            plantAudioManager.stopPlantSongs(this.songId);
                        }
                    }
                }

              // Projectile class
              class Projectile {
                    constructor(x, y, target, plantType = null) {
                        this.x = x;
                        this.y = y;
                        this.target = target;
                        this.speed = 5 * gameTimeMultiplier; // Apply speed multiplier
                        this.radius = 8;
                        this.plantType = plantType;
                    }

                    update() {
                        if (!this.target || this.target.health <= 0) {
                            return false;
                        }

                        const dx = this.target.x - this.x;
                        const dy = this.target.y - this.y;
                        const dist = Math.hypot(dx, dy);

                        if (dist < 15) {
                            const plantConfig = this.plantType && PLANT_TYPES[this.plantType]
                                ? PLANT_TYPES[this.plantType]
                                : PLANT_TYPES.peashooter;
                            this.target.health -= plantConfig.attackDamage || 0;

                            if (plantConfig.slowsEnemies) {
                                const baseSpeed = this.target.type.isFlyer && this.target.flyingState === 'flying'
                                    ? this.target.type.flySpeed
                                    : this.target.type.speed;
                                this.target.slowMultiplier = plantConfig.slowMultiplier;
                                this.target.slowEndTime = Date.now() + plantConfig.slowDuration / gameTimeMultiplier;
                                this.target.currentSpeed = baseSpeed * plantConfig.slowMultiplier;
                            }

                            return false;
                        }

                        this.x += (dx / dist) * this.speed;
                        this.y += (dy / dist) * this.speed;
                        return true;
                    }

                    draw() {
                        // Use cold projectile image if available, otherwise regular projectile
                        const imageKey = this.plantType && PLANT_TYPES[this.plantType] && PLANT_TYPES[this.plantType].slowsEnemies ? 'projectilecold.png' : 'projectile.png';
                        const img = imageCache[imageKey];
                        if (img) {
                            ctx.drawImage(img, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
                        } else {
                            ctx.fillStyle = this.plantType && PLANT_TYPES[this.plantType] && PLANT_TYPES[this.plantType].slowsEnemies ? '#00ccff' : '#ffff00';
                            ctx.beginPath();
                            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }

              // Enemy class
              class Enemy {
                    constructor(rowIndex, enemyType = null) {
                        this.x = GRID_END_X;
                        this.rowIndex = rowIndex;
                        this.y = GRID_START_Y + rowIndex * GRID_CELL_HEIGHT + GRID_CELL_HEIGHT / 2;
                        this.type = enemyType || ENEMY_TYPE;
                        this.health = this.type.health;
                        this.lastDamage = 0;
                        this.desiredX = this.x;
                        this.slowMultiplier = 1;
                        this.slowEndTime = 0;
                        
                        // ealc3 three-state system
                        this.flyingState = 'flying'; // 'flying', 'normal', or 'low_health'
                        this.plantSkipped = false; // Track if we've already skipped a plant in flying state
                        
                        // Set initial speed based on state, apply speed multiplier
                        this.currentSpeed = this.type.isFlyer && this.flyingState === 'flying'
                            ? this.type.flySpeed * gameTimeMultiplier
                            : this.type.speed * gameTimeMultiplier;
                    }

                    update(plants) {
                        const now = Date.now();
                        const isSlowActive = this.slowEndTime && now < this.slowEndTime;
                        const baseSpeed = (this.type.isFlyer && this.flyingState === 'flying'
                            ? this.type.flySpeed
                            : this.type.speed) * gameTimeMultiplier;
                        this.currentSpeed = isSlowActive ? baseSpeed * this.slowMultiplier : baseSpeed;
                        let canMove = true;
                        const nextX = this.x - this.currentSpeed;

                        // Check if ealc3 is in flying state
                        const isEalc3Flying = this.type.isFlyer && this.flyingState === 'flying';
                        
                        // Regular collision detection for non-flying enemies or landed ealc3
                        if (!isEalc3Flying) {
                            for (let plant of plants) {
                                if (plant.gridY === this.rowIndex) {
                                    if (plant.collidesWith(nextX, this.y)) {
                                        canMove = false;
                                        break;
                                    }
                                }
                            }
                        } else {
                            // Flying ealc3: check if next position would cross a plant
                            for (let plant of plants) {
                                if (plant.gridY === this.rowIndex && !this.plantSkipped) {
                                    // If moving from right of plant to left of plant, we're crossing it
                                    if (this.x > plant.x && nextX <= plant.x) {
                                        // Plant occupies a grid cell - skip it by moving to next grid block
                                        this.x = plant.x - GRID_CELL_WIDTH;
                                        this.flyingState = 'normal';
                                        this.plantSkipped = true;
                                        this.speed = this.type.speed * gameTimeMultiplier;
                                        return this.x < DESTINATION_X;
                                    }
                                }
                            }
                        }

                        if (canMove) {
                            this.x = nextX;
                        }

                        const nowDamage = Date.now();
                        for (let plant of plants) {
                            if (plant.gridY === this.rowIndex) {
                                if (plant.isNearby(this.x, this.y)) {
                                    if (nowDamage - this.lastDamage > this.type.damageInterval / gameTimeMultiplier) {
                                        plant.health -= this.type.damage;
                                        this.lastDamage = nowDamage;
                                    }
                                }
                            }
                        }

                        // Check health state transitions for ealc3
                        if (this.type.isFlyer) {
                            const healthPercent = this.health / this.type.health;
                            if (healthPercent <= this.type.lowHealthThreshold && this.flyingState !== 'flying') {
                                this.flyingState = 'low_health';
                                this.speed = this.type.speed * gameTimeMultiplier;
                            } else if (healthPercent > this.type.lowHealthThreshold && this.flyingState === 'low_health') {
                                this.flyingState = 'normal';
                                this.speed = this.type.speed * gameTimeMultiplier;
                            }
                        }

                        return this.x < DESTINATION_X;
                    }

                    draw() {
                        const healthPercent = this.health / this.type.health;
                        let imageToUse = this.type.image;
                        
                        // ealc3 specific image selection based on state
                        if (this.type.isFlyer) {
                            if (this.flyingState === 'flying') {
                                imageToUse = this.type.flyImage;
                            } else if (this.flyingState === 'low_health' && healthPercent <= this.type.lowHealthThreshold) {
                                imageToUse = this.type.lowHealthImage;
                            }
                        } else {
                            // Regular health-based image selection for other enemies
                            if (healthPercent <= this.type.lowHealthThreshold) {
                                imageToUse = this.type.lowHealthImage;
                            }
                        }

                        const img = imageCache[imageToUse];
                        if (img) {
                            ctx.drawImage(img, this.x - this.type.width / 2, this.y - this.type.height / 2, this.type.width, this.type.height);
                        } else {
                            ctx.fillStyle = '#ff6600';
                            ctx.fillRect(this.x - this.type.width / 2, this.y - this.type.height / 2, this.type.width, this.type.height);
                        }

                        const now = Date.now();
                        if (this.slowEndTime && now < this.slowEndTime) {
                            ctx.save();
                            ctx.globalAlpha = 0.5;
                            const iceImg = imageCache['ice.png'] || imageCache['projectilecold.png'];
                            if (iceImg) {
                                ctx.drawImage(iceImg, this.x - this.type.width / 2, this.y - this.type.height / 2, this.type.width, this.type.height);
                            } else {
                                ctx.fillStyle = '#88ccff';
                                ctx.fillRect(this.x - this.type.width / 2, this.y - this.type.height / 2, this.type.width, this.type.height);
                            }
                            ctx.restore();
                        }

                        ctx.fillStyle = '#ff0000';
                        ctx.fillRect(this.x - this.type.width / 2, this.y - this.type.height / 2 - 10, this.type.width * healthPercent, 5);
                    }

                    isAlive() {
                        return this.health > 0;
                    }
                }

              // Sun class
              class Sun {
                    constructor(x, y, stationary = false) {
                        this.x = x;
                        this.y = stationary ? y : -40;
                        this.value = 25;
                        this.radius = 25;
                        this.speed = 1 * gameTimeMultiplier; // Apply speed multiplier
                        this.stationary = stationary;
                        if (stationary) {
                            this.targetY = y;
                        } else {
                            this.targetY = GRID_START_Y + Math.random() * (GRID_ROWS * GRID_CELL_HEIGHT);
                        }
                    }

                    update() {
                        if (this.y < this.targetY) {
                            this.y += this.speed;
                        }
                        return this.y > canvas.height + 50;
                    }

                    draw() {
                        const img = imageCache['sun.png'];
                        if (img) {
                            ctx.drawImage(img, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
                        } else {
                            ctx.fillStyle = '#ffff00';
                            ctx.beginPath();
                            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.fillStyle = '#000000';
                            ctx.font = 'bold 14px Arial';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(this.value, this.x, this.y);
                        }
                    }

                    isClicked(mouseX, mouseY) {
                        const dist = Math.hypot(mouseX - this.x, mouseY - this.y);
                        return dist < this.radius + 5;
                    }
                }

              let suns_on_screen = [];

              function drawKosackonStatic(rowIndex) {
                    const kosackonX = GRID_START_X - 80; // 30px closer to arena
                    const kosackonY = GRID_START_Y + rowIndex * GRID_CELL_HEIGHT + GRID_CELL_HEIGHT / 2;
                    const kosackonSize = (GRID_CELL_WIDTH / 4) * 2.5; // Slightly bigger
                    
                    // Initialize animation state if needed
                    if (!kosackonAnimationState[rowIndex]) {
                        kosackonAnimationState[rowIndex] = { startTime: Date.now() };
                    }
                    
                    const now = Date.now();
                    const timeSinceStart = now - kosackonAnimationState[rowIndex].startTime;
                    const animationFrame = Math.floor((timeSinceStart / 200) % 2); // Alternate every 200ms
                    const kosackonImage = animationFrame === 0 ? 'dlawnmowerO.png' : 'dlawnmowerC.png';
                    
                    const img = imageCache[kosackonImage];
                    if (img) {
                        ctx.drawImage(img, kosackonX - kosackonSize / 2, kosackonY - kosackonSize / 2, kosackonSize, kosackonSize);
                    } else {
                        ctx.fillStyle = '#888888';
                        ctx.fillRect(kosackonX - kosackonSize / 2, kosackonY - kosackonSize / 2, kosackonSize, kosackonSize);
                    }
                }

              function drawPlantMenu() {
                    const menuX = PLANT_MENU_X;
                    const menuY = PLANT_MENU_Y;
                    const slotWidth = 60;
                    const slotHeight = 60;
                    const gridCols = 2;
                    const gridRows = 3;
                    const spacing = 5;
                    const menuWidth = gridCols * slotWidth + (gridCols - 1) * spacing;
                    const menuHeight = gridRows * slotHeight + (gridRows - 1) * spacing;

                    // Draw menu background
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.fillRect(menuX - 10, menuY - 35, menuWidth + 20, menuHeight + 45);

                    // Draw title
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('Plants', menuX + menuWidth / 2, menuY - 20);

                    // Get selected plants from plant selector
                    const plantList = typeof plantSelector !== 'undefined' ? plantSelector.getSelectedPlants() : Object.keys(PLANT_TYPES);

                    // Draw 2x3 grid
                    for (let row = 0; row < gridRows; row++) {
                        for (let col = 0; col < gridCols; col++) {
                            const index = row * gridCols + col;
                            const slotX = menuX + col * (slotWidth + spacing);
                            const slotY = menuY + row * (slotHeight + spacing);

                            if (index < plantList.length) {
                                const plant = PLANT_TYPES[plantList[index]];
                                
                                // ✅ SAFETY CHECK: Skip if plant doesn't exist in this level
                                if (!plant) {
                                    console.warn(`Plant ${plantList[index]} not found in PLANT_TYPES for level ${level}`);
                                    continue;
                                }
                                
                                const isSelected = selectedPlant === plantList[index];
                                const isShovel = selectedPlant === 'shovel' && plantList[index] === 'shovel';
                                
                                // Check if plant is on cooldown
                                const now = Date.now();
                                const plantCooldown = plant.placementCooldown || 0;
                                const lastPlacement = plantPlacementCooldowns[plantList[index]] || 0;
                                const isOnCooldown = (now - lastPlacement) < plantCooldown / gameTimeMultiplier;

                                // Set background color based on state
                                if (isOnCooldown) {
                                    ctx.fillStyle = '#808080'; // Gray for cooldown
                                } else if (isShovel || (isSelected && shovelMode)) {
                                    ctx.fillStyle = '#90EE90'; // Light green for shovel/active mode
                                } else if (isSelected) {
                                    ctx.fillStyle = '#00ff00'; // Green when selected and available
                                } else {
                                    ctx.fillStyle = '#1a7e28';
                                }