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
          levelConfig = JSON.parse(JSON.stringify(Level1)); // Deep copy
          
          // Apply speci modifiers
          if (window.speciModifiers) {
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
              
              // Calculate level duration from waves and enemy wait time
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

              // Enemy types from level configuration
              const ENEMY_TYPES = levelData.enemyTypes;
              let ENEMY_TYPE = ENEMY_TYPES.ealc1; // Default enemy type for this level

              // Apply speci level modifiers
              let gameTimeMultiplier = 1.0;
              let kosackonEnabled = true;
              if (level === 99 && levelData.speciModifiers) {
                  gameTimeMultiplier = levelData.speciModifiers.timeSpeed;
                  kosackonEnabled = levelData.speciModifiers.kosackonEnabled;
                  
                  // Create a modified copy of ENEMY_TYPE
                  const modifiedEnemyType = JSON.parse(JSON.stringify(ENEMY_TYPE));
                  modifiedEnemyType.health *= levelData.speciModifiers.enemyDamage;
                  modifiedEnemyType.attackDamage *= levelData.speciModifiers.enemyDamage;
                  modifiedEnemyType.speed *= levelData.speciModifiers.enemySpeed;
                  ENEMY_TYPE = modifiedEnemyType;
                  
                  console.log('Speci level modifiers applied:', {
                      timeSpeed: gameTimeMultiplier,
                      enemyDamage: levelData.speciModifiers.enemyDamage,
                      enemySpeed: levelData.speciModifiers.enemySpeed,
                      unlockedRows: levelData.speciModifiers.unlockedRows,
                      kosackonEnabled: kosackonEnabled
                  });
              }

              // Kosackon class
              class Kosackon {
                    constructor(rowIndex) {
                        this.rowIndex = rowIndex;
                        this.x = GRID_START_X - 80; // Start outside arena to the left (30px closer to arena)
                        this.y = GRID_START_Y + rowIndex * GRID_CELL_HEIGHT + GRID_CELL_HEIGHT / 2;
                        this.speed = 3;
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
                            if (elapsed < this.type.explosionDuration) {
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
                        
                        if (this.type.shootImage && this.isShooting && now - this.shootStartTime < this.type.shootDuration) {
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
                        return (now - this.lastAttack >= this.type.attackSpeed);
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
                            
                            if (timeSincePlacement >= this.type.sunSpawnInterval && timeSinceLastSpawn >= this.type.sunSpawnInterval) {
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
                                        this.fullEndTime = now + (this.type.fullDuration || 10000);
                                        this.health = this.type.health;
                                        break;
                                    }
                                }
                            }
                            return;
                        }

                        if (!this.type.explodes) return;
                        if (!this.explosionStarted && now - this.placementTime >= this.type.explodeDelay) {
                            this.explosionStarted = true;
                            this.explosionStartTime = now;
                            this.explode(enemies);
                        }
                        if (this.explosionStarted && now - this.explosionStartTime >= this.type.explosionDuration) {
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
                        this.speed = 5;
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
                                this.target.slowEndTime = Date.now() + plantConfig.slowDuration;
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
                        
                        // Set initial speed based on state
                        this.currentSpeed = this.type.isFlyer && this.flyingState === 'flying'
                            ? this.type.flySpeed
                            : this.type.speed;
                    }

                    update(plants) {
                        const now = Date.now();
                        const isSlowActive = this.slowEndTime && now < this.slowEndTime;
                        const baseSpeed = this.type.isFlyer && this.flyingState === 'flying'
                            ? this.type.flySpeed
                            : this.type.speed;
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
                                        this.speed = this.type.speed; // Switch to normal speed 0.075
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
                                    if (nowDamage - this.lastDamage > this.type.damageInterval) {
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
                                this.speed = this.type.speed; // Keep at normal speed when low health
                            } else if (healthPercent > this.type.lowHealthThreshold && this.flyingState === 'low_health') {
                                this.flyingState = 'normal';
                                this.speed = this.type.speed; // Keep at normal speed
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
                        this.speed = 1;
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
                                const isOnCooldown = (now - lastPlacement) < plantCooldown;

                                // Set background color based on state
                                if (isOnCooldown) {
                                    ctx.fillStyle = '#808080'; // Gray for cooldown
                                } else if (isShovel || (isSelected && shovelMode)) {
                                    ctx.fillStyle = '#90EE90'; // Light green for shovel/active mode
                                } else if (isSelected) {
                                    ctx.fillStyle = '#00ff00'; // Green when selected and available
                                } else {
                                    ctx.fillStyle = '#1a7e28'; // Default green when available
                                }
                                
                                ctx.strokeStyle = '#ffffff';
                                ctx.lineWidth = 2;
                                ctx.fillRect(slotX, slotY, slotWidth, slotHeight);
                                ctx.strokeRect(slotX, slotY, slotWidth, slotHeight);

                                // Draw plant image
                                const img = imageCache[plant.image];
                                if (img) {
                                    ctx.drawImage(img, slotX + 5, slotY + 5, 50, 50);
                                }

                                // Draw cost (don't show for tools like shovel)
                                if (plant.cost > 0) {
                                    ctx.fillStyle = '#ffff00';
                                    ctx.font = 'bold 10px Arial';
                                    ctx.textAlign = 'right';
                                    ctx.textBaseline = 'bottom';
                                    ctx.fillText(plant.cost, slotX + slotWidth - 3, slotY + slotHeight - 3);
                                }
                            } else {
                                ctx.fillStyle = '#333333';
                                ctx.strokeStyle = '#666666';
                                ctx.lineWidth = 1;
                                ctx.fillRect(slotX, slotY, slotWidth, slotHeight);
                                ctx.strokeRect(slotX, slotY, slotWidth, slotHeight);
                            }
                        }
                    }

                    // Back button - positioned right next to plant menu, moved 200px left
                    const backBtnX = menuX + menuWidth + 20;
                    const backBtnY = menuY + menuHeight / 2;
                    const backBtnWidth = 30;
                    const backBtnHeight = menuHeight;

                    ctx.fillStyle = '#8b5411';
                    ctx.fillRect(backBtnX - backBtnWidth / 2, backBtnY - backBtnHeight / 2, backBtnWidth, backBtnHeight);
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(backBtnX - backBtnWidth / 2, backBtnY - backBtnHeight / 2, backBtnWidth, backBtnHeight);

                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 9px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    // Write text vertically
                    ctx.save();
                    ctx.translate(backBtnX, backBtnY);
                    ctx.rotate(-Math.PI / 2);
                    ctx.fillText('← Back', 0, 0);
                    ctx.restore();
                }

              function drawDestination() {
                    for (let row = 0; row < UNLOCKED_ROWS; row++) {
                        const destY = GRID_START_Y + row * GRID_CELL_HEIGHT + GRID_CELL_HEIGHT / 2;
                        
                        const img = imageCache['pecen.png'];
                        if (img) {
                            ctx.drawImage(img, DESTINATION_X - 25, destY - 25, 50, 50);
                        } else {
                            ctx.fillStyle = '#ff00ff';
                            ctx.fillRect(DESTINATION_X - 25, destY - 25, 50, 50);
                        }
                        
                        // Draw kosackon (slightly bigger) on top of pecen ALWAYS if not used
                        if (level >= 3 && kosackonEnabled && !kosackonActiveRows.has(row)) {
                            drawKosackonStatic(row);
                        }
                    }
                }

              function drawGrid() {
                    ctx.lineWidth = 1;

                    for (let row = 0; row < GRID_ROWS; row++) {
                        for (let col = 0; col < GRID_COLS; col++) {
                            const x = GRID_START_X + col * GRID_CELL_WIDTH;
                            const y = GRID_START_Y + row * GRID_CELL_HEIGHT;

                            if (row < UNLOCKED_ROWS) {
                                const isEvenSquare = (row + col) % 2 === 0;
                                if (isEvenSquare) {
                                    ctx.fillStyle = '#228b22';
                                } else {
                                    ctx.fillStyle = '#1a6b1a';
                                }
                                ctx.fillRect(x, y, GRID_CELL_WIDTH, GRID_CELL_HEIGHT);
                                ctx.strokeStyle = '#ffffff';
                            } else {
                                const isEvenSquare = (row + col) % 2 === 0;
                                if (isEvenSquare) {
                                    ctx.fillStyle = '#8b6914';
                                } else {
                                    ctx.fillStyle = '#6b5411';
                                }
                                ctx.fillRect(x, y, GRID_CELL_WIDTH, GRID_CELL_HEIGHT);
                                ctx.strokeStyle = '#665544';
                            }
                            ctx.strokeRect(x, y, GRID_CELL_WIDTH, GRID_CELL_HEIGHT);
                        }
                    }
                }

              function drawBackground() {
                    const bgImg = imageCache['lvl1bcg.png'];
                    if (bgImg) {
                        ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
                    } else {
                        ctx.fillStyle = '#1a7e28';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                }

              function drawProgressBar() {
                    const barWidth = GRID_WIDTH;
                    const barHeight = 20;
                    const barX = GRID_START_X;
                    const barY = 30;
                    const totalDuration = LEVEL_DURATION;
                    const progress = gametime / totalDuration;

                    ctx.fillStyle = '#333333';
                    ctx.fillRect(barX, barY, barWidth, barHeight);

                    // Change bar color and text during final wave
                    if (finalWaveTriggered) {
                        ctx.fillStyle = '#ff0000';
                        ctx.fillRect(barX, barY, barWidth, barHeight);
                    } else {
                        ctx.fillStyle = '#00ff00';
                        ctx.fillRect(barX, barY, barWidth * progress, barHeight);
                    }

                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(barX, barY, barWidth, barHeight);

                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    // Only show timer if final wave hasn't been triggered
                    if (!finalWaveTriggered) {
                        ctx.fillText(`${Math.ceil((totalDuration - gametime) / 1000)}s`, barX + barWidth / 2, barY + barHeight / 2);
                    } else {
                        ctx.fillText('PEČEŇ V OHROZENÍ', barX + barWidth / 2, barY + barHeight / 2);
                    }
                }

              function drawSunCounter() {
                    const sunImg = imageCache['sun.png'];
                    const sunX = 20;
                    const sunY = 20;
                    const sunSize = 30;

                    if (sunImg) {
                        ctx.drawImage(sunImg, sunX, sunY, sunSize, sunSize);
                    } else {
                        ctx.fillStyle = '#ffff00';
                        ctx.beginPath();
                        ctx.arc(sunX + sunSize / 2, sunY + sunSize / 2, sunSize / 2, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 24px Arial';
                    ctx.textAlign = 'left';
                    ctx.fillText(`${suns}`, sunX + sunSize + 10, sunY + sunSize / 2 + 8);
                }

              function drawWrappedText(text, x, y, maxWidth, lineHeight) {
                    const words = text.split(' ');
                    let line = '';
                    let lineCount = 0;
                    for (let n = 0; n < words.length; n++) {
                        const testLine = line ? `${line} ${words[n]}` : words[n];
                        const metrics = ctx.measureText(testLine);
                        if (metrics.width > maxWidth && line) {
                            ctx.fillText(line, x, y + lineCount * lineHeight);
                            line = words[n];
                            lineCount++;
                        } else {
                            line = testLine;
                        }
                    }
                    if (line) {
                        ctx.fillText(line, x, y + lineCount * lineHeight);
                    }
                }

              function drawFinalWaveWarning() {
                    // Draw warning banner
                    const bannerHeight = 60;
                    const bannerY = canvas.height / 2 - bannerHeight / 2;
                    
                    // Pulsing effect
                    const pulseAlpha = 0.7 + 0.3 * Math.sin(Date.now() / 100);
                    
                    ctx.fillStyle = `rgba(255, 165, 0, ${pulseAlpha})`;
                    ctx.fillRect(0, bannerY, canvas.width, bannerHeight);
                    
                    ctx.strokeStyle = '#ff0000';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(0, bannerY, canvas.width, bannerHeight);
                    
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 48px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('⚠️ VÝSTRAHA: NADMERNÝ ALKOHOL ⚠️', canvas.width / 2, canvas.height / 2);
                }

              function handleGameInput(e) {
                    if (gameOver || levelWon || isTransitioning) return;

                    const rect = canvas.getBoundingClientRect();
                    let mouseX, mouseY;

                    if (e.touches) {
                        mouseX = e.touches[0].clientX - rect.left;
                        mouseY = e.touches[0].clientY - rect.top;
                    } else {
                        mouseX = e.clientX - rect.left;
                        mouseY = e.clientY - rect.top;
                    }

                    suns_on_screen = suns_on_screen.filter(sun => {
                        if (sun.isClicked(mouseX, mouseY)) {
                            suns += sun.value;
                            return false;
                        }
                        return true;
                    });

                    // Handle shovel mode - click on plants to dig them up
                    if (shovelMode) {
                        for (let i = plants.length - 1; i >= 0; i--) {
                            const plant = plants[i];
                            const dist = Math.hypot(mouseX - plant.x, mouseY - plant.y);
                            if (dist < plant.type.collisionRadius + 10) {
                                // Calculate reward: half original cost, rounded down to nearest 25
                                const halfCost = Math.floor(plant.type.cost / 2);
                                const reward = Math.floor(halfCost / 25) * 25;
                                
                                // Only reward if plant is above 50% health
                                const healthPercent = plant.health / plant.type.health;
                                if (healthPercent > 0.5) {
                                    suns += reward;
                                }
                                
                                // Remove plant
                                plant.destroy();
                                plants.splice(i, 1);
                                shovelMode = false;
                                selectedPlant = null;
                                return;
                            }
                        }
                    }

                    // Handle kosackon clicks (level 3+)
                    if (level >= 3 && kosackonEnabled) {
                        for (let row = 0; row < UNLOCKED_ROWS; row++) {
                            if (!kosackonActiveRows.has(row)) {
                                const kosackonX = GRID_START_X - 80; // 30px closer
                                const kosackonY = GRID_START_Y + row * GRID_CELL_HEIGHT + GRID_CELL_HEIGHT / 2;
                                const kosackonSize = (GRID_CELL_WIDTH / 4) * 2.5; // Slightly bigger
                                const dist = Math.hypot(mouseX - kosackonX, mouseY - kosackonY);
                                
                                if (dist < kosackonSize / 2) {
                                    // Activate kosackon: start it traveling down the row
                                    activeKosackons.push(new Kosackon(row));
                                    kosackonActiveRows.add(row);
                                    return;
                                }
                            }
                        }
                    }

                    // Get selected plants from plant selector
                    const plantList = typeof plantSelector !== 'undefined' ? plantSelector.getSelectedPlants() : Object.keys(PLANT_TYPES);
                    const menuX = PLANT_MENU_X;
                    const menuY = PLANT_MENU_Y;
                    const slotWidth = 60;
                    const slotHeight = 60;
                    const gridCols = 2;
                    const spacing = 5;
                    const menuWidth = gridCols * slotWidth + (gridCols - 1) * spacing;
                    const menuHeight = 3 * slotHeight + 2 * spacing; // 3 rows

                    // Back button hit detection
                    const backBtnX = menuX + menuWidth + 20;
                    const backBtnY = menuY + menuHeight / 2;
                    const backBtnWidth = 30;
                    const backBtnHeight = menuHeight;

                    if (mouseX >= backBtnX - backBtnWidth / 2 && mouseX <= backBtnX + backBtnWidth / 2 &&
                        mouseY >= backBtnY - backBtnHeight / 2 && mouseY <= backBtnY + backBtnHeight / 2) {
                        returnToLevels();
                        return;
                    }

                    // Plant slot click handling - 2x3 grid
                    for (let row = 0; row < 3; row++) {
                        for (let col = 0; col < 2; col++) {
                            const index = row * 2 + col;
                            if (index < plantList.length) {
                                const slotX = menuX + col * (slotWidth + spacing);
                                const slotY = menuY + row * (slotHeight + spacing);

                                if (mouseX >= slotX && mouseX <= slotX + slotWidth &&
                                    mouseY >= slotY && mouseY <= slotY + slotHeight) {
                                    // ✅ SAFETY CHECK: Only select plants that exist in this level
                                    if (PLANT_TYPES[plantList[index]]) {
                                        const plantKey = plantList[index];
                                        const isShovel = plantKey === 'shovel';
                                        
                                        if (isShovel) {
                                            // Toggle shovel mode
                                            if (shovelMode && selectedPlant === 'shovel') {
                                                shovelMode = false;
                                                selectedPlant = null;
                                            } else {
                                                shovelMode = true;
                                                selectedPlant = 'shovel';
                                            }
                                        } else {
                                            // Normal plant selection
                                            shovelMode = false;
                                            if (selectedPlant === plantKey) {
                                                selectedPlant = null;
                                            } else {
                                                selectedPlant = plantKey;
                                            }
                                        }
                                    }
                                    return;
                                }
                            }
                        }
                    }

                    if (selectedPlant && !shovelMode && PLANT_TYPES[selectedPlant] && suns >= PLANT_TYPES[selectedPlant].cost) {
                        const relX = mouseX - GRID_START_X;
                        const relY = mouseY - GRID_START_Y;

                        if (relX >= 0 && relX < GRID_WIDTH && relY >= 0 && relY < GRID_HEIGHT) {
                            const gridX = Math.floor(relX / GRID_CELL_WIDTH);
                            const gridY = Math.floor(relY / GRID_CELL_HEIGHT);

                            if (gridY < UNLOCKED_ROWS) {
                                const occupied = plants.some(p => p.gridX === gridX && p.gridY === gridY);
                                if (!occupied) {
                                    // Check plant-specific cooldown
                                    const now = Date.now();
                                    const plantCooldown = PLANT_TYPES[selectedPlant].placementCooldown || 0;
                                    const lastPlacement = plantPlacementCooldowns[selectedPlant] || 0;
                                    
                                    if (now - lastPlacement >= plantCooldown) {
                                        plants.push(new Plant(selectedPlant, gridX, gridY));
                                        suns -= PLANT_TYPES[selectedPlant].cost;
                                        plantPlacementCooldowns[selectedPlant] = now;
                                    }
                                }
                            }
                        }
                    }
                }

              canvas.addEventListener('click', handleGameInput);
              canvas.addEventListener('touchend', handleGameInput);

              function gameLoop() {
                    if (isTransitioning) return;
                    
                    // Check if game was marked as failed (closed/switched away)
                    if (!gameActive && !gameOver && !levelWon) {
                        gameOver = true;
                        gameOverTime = Date.now();
                        loseScreenSubtitle = 'beda ti ze ides het z appky 🚨‼️';
                        console.log('Level failed - user closed/switched away');
                    }
                    
                    // Skip game logic if paused, but still draw the frame
                    const now = Date.now();
                    
                    if (!gamePaused) {
                        gametime = (now - startTime) * gameTimeMultiplier;
                    }

                    drawBackground();
                    drawProgressBar();
                    drawSunCounter();
                    drawGrid();

                    if (!gamePaused && now - lastSunSpawn > 8000) {
                        suns_on_screen.push(new Sun(GRID_START_X + Math.random() * GRID_WIDTH));
                        lastSunSpawn = now;
                    }

                    suns_on_screen = suns_on_screen.filter(sun => {
                        if (!gamePaused) {
                            const shouldKeep = !sun.update();
                            if (shouldKeep) sun.draw();
                            return shouldKeep;
                        } else {
                            sun.draw();
                            return true;
                        }
                    });

                    // Update and draw active kosackons
                    activeKosackons = activeKosackons.filter(kosackon => {
                        if (!gamePaused) {
                            // Remove enemies in this kosackon's row that it collides with
                            enemies = enemies.filter(enemy => {
                                if (enemy.rowIndex === kosackon.rowIndex && kosackon.collidesWith(enemy)) {
                                    return false; // Remove enemy
                                }
                                return true;
                            });

                            const isStillTraveling = kosackon.update();
                            kosackon.draw();
                            return isStillTraveling;
                        } else {
                            kosackon.draw();
                            return true;
                        }
                    });

                    // Check if we're in a wave and spawn enemies based on wave configuration
                    if (!gamePaused) {
                        waveEnemyConfig = levelData.getWaveEnemyConfig(gametime);
                        
                        if (waveEnemyConfig) {
                            const enemyTypeToSpawn = levelData.shouldSpawnEnemy(waveEnemyConfig, lastEnemySpawnTimes, now);
                            if (enemyTypeToSpawn) {
                                const randomRow = Math.floor(Math.random() * UNLOCKED_ROWS);
                                const enemyType = ENEMY_TYPES[enemyTypeToSpawn];
                                enemies.push(new Enemy(randomRow, enemyType));
                                // Track spawn time and per-type counts for the final wave calculation
                                lastEnemySpawnTimes[enemyTypeToSpawn] = now;
                                totalEnemiesSpawned++;
                                mainWaveSpawnCounts[enemyTypeToSpawn] = (mainWaveSpawnCounts[enemyTypeToSpawn] || 0) + 1;
                            }
                        }
                    }

                    // Show warning and trigger final wave when main waves complete
                    if (!gamePaused && levelData.areWavesComplete(gametime) && !finalWaveWarningTriggered) {
                        finalWaveWarningTriggered = true;
                        finalWaveWarningTime = now;
                    }

                    // Display warning for 5 seconds
                    if (finalWaveWarningTriggered && !finalWaveTriggered && (now - finalWaveWarningTime) < 5000) {
                        drawFinalWaveWarning();
                    }

                    // Spawn final wave after 5 seconds, over configured duration
                    if (finalWaveWarningTriggered && !finalWaveTriggered && (now - finalWaveWarningTime) >= 5000) {
                        finalWaveTriggered = true;
                        finalWaveSpawningTime = now;
                        
                        // Build the exact final wave list: half of each enemy type spawned in the main waves
                        const finalWaveSpawnList = [];
                        Object.entries(mainWaveSpawnCounts).forEach(([enemyTypeKey, count]) => {
                            const finalCount = Math.floor(count * levelData.finalWave.multiplier);
                            for (let j = 0; j < finalCount; j++) {
                                finalWaveSpawnList.push(enemyTypeKey);
                            }
                        });

                        const finalWaveCount = finalWaveSpawnList.length;
                        
                        // Schedule exact enemy types rather than choosing new random types
                        finalWaveSpawnList.forEach((enemyTypeKey, index) => {
                            setTimeout(() => {
                                if (!gamePaused) {
                                    const randomRow = Math.floor(Math.random() * UNLOCKED_ROWS);
                                    const enemyType = ENEMY_TYPES[enemyTypeKey];
                                    if (enemyType) {
                                        enemies.push(new Enemy(randomRow, enemyType));
                                        finalWaveEnemiesSpawned++;
                                    }
                                }
                            }, finalWaveCount > 0 ? (index / finalWaveCount) * levelData.finalWave.duration : 0);
                        });
                    }

                    plants = plants.filter(plant => {
                        if (!gamePaused) {
                            plant.update(enemies);
                            plant.attack(enemies);
                            if (plant.type.sunSpawnInterval) {
                                plant.produceSun();
                            }
                        }
                        plant.draw();
                        return plant.isAlive();
                    });

                    projectiles = projectiles.filter(p => {
                        if (!gamePaused) {
                            const shouldKeep = p.update();
                            if (shouldKeep) p.draw();
                            return shouldKeep;
                        } else {
                            p.draw();
                            return true;
                        }
                    });

                    enemies = enemies.filter(enemy => {
                        if (!gamePaused) {
                            const reachedEnd = enemy.update(plants);
                            if (reachedEnd) {
                                gameOver = true;
                                gameOverTime = Date.now();
                                return false;
                            }
                        }
                        if (!enemy.isAlive()) {
                            return false;
                        }
                        enemy.draw();
                        return true;
                    });

                    drawDestination();
                    
                    // Draw sun projectiles on top of everything
                    suns_on_screen.forEach(sun => sun.draw());
                    
                    drawPlantMenu();

                    // Win logic: check enemies only after final wave completes
                    if (finalWaveTriggered && !gamePaused && (now - finalWaveSpawningTime) >= levelData.finalWave.duration && enemies.length === 0) {
                        levelWon = true;
                    }

                    if (gameOver) {
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.fillStyle = '#ff0000';
                        ctx.font = 'bold 48px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        
                        // Special message for speci level
                        if (level === 99) {
                            ctx.fillText('trochu si si veril no', canvas.width / 2, canvas.height / 2 - 30);
                        } else {
                            ctx.fillText('mojko prehral si či ako sa tomu nadáva', canvas.width / 2, canvas.height / 2 - 30);
                        }
                        
                        // Select subtitle only on first game over
                        if (!loseScreenSubtitle) {
                            const subtitles = [
                                'duchoňotrón by sa hneval',
                                'alkohol neprospieva pečeni',
                                'ZABIL SI JEHO PEČEŇ!!!',
                                'tak tebe to teda fakt nejde',
                                'bruchoň je sklamaný'
                            ];
                            loseScreenSubtitle = subtitles[Math.floor(Math.random() * subtitles.length)];
                        }
                        
                        ctx.fillStyle = '#ffffff';
                        ctx.font = '18px Arial';
                        ctx.fillText(loseScreenSubtitle, canvas.width / 2, canvas.height / 2 + 40);

                        if (Date.now() - gameOverTime > 3000) {
                            isTransitioning = true;
                            gameActive = false; // Stop all game logic
                            returnToLevels();
                            return;
                        }
                        gameLoopId = requestAnimationFrame(gameLoop);
                    } else if (levelWon) {
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.fillStyle = '#00ff00';
                        ctx.font = 'bold 30px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'top';
                        
                        // Special message for speci level
                        if (level === 99) {
                            ctx.fillText('ta čo už', canvas.width / 2, canvas.height / 2 - 70);
                        } else if (level === 1) {
                            drawWrappedText('zachránil si Veľkého Duchoňa (aspoň pred alkoholom)', canvas.width / 2, canvas.height / 2 - 70, canvas.width * 0.75, 34);
                        } else if (level === 2) {
                            drawWrappedText('odomkol si Orechoňa, nuž hlavne Kosačkona, ktorý zachráni riadok raz za hru keď naňho klikneš', canvas.width / 2, canvas.height / 2 - 80, canvas.width * 0.75, 34);
                            
                            const orechonImg = imageCache['dnut1.png'];
                            if (orechonImg) {
                                ctx.drawImage(orechonImg, canvas.width / 2 - 40, canvas.height / 2 + 20, 80, 80);
                            }
                            
                            const kosackonImg = imageCache['dlawnmowerO.png'];
                            if (kosackonImg) {
                                ctx.drawImage(kosackonImg, canvas.width / 2 + 60, canvas.height / 2 + 20, 80, 80);
                            }
                        } else if (level === 3) {
                            drawWrappedText('odomkol si chlopatoňa (nie actually rastlina ale buď ticho) (mám rád malé detičky)', canvas.width / 2, canvas.height / 2 - 80, canvas.width * 0.75, 34);
                            
                            const shovelImg = imageCache['dshovel.png'];
                            if (shovelImg) {
                                ctx.drawImage(shovelImg, canvas.width / 2 - 40, canvas.height / 2 + 20, 80, 80);
                            }
                        } else if (level === 4) {
                            ctx.fillText('ej bisťu, vyhral si.', canvas.width / 2, canvas.height / 2 - 70);
                            ctx.font = 'bold 22px Arial';
                            ctx.fillText('máš nového rastlichoňa - čerešchňon.', canvas.width / 2, canvas.height / 2 - 30);

                            const cherryImg = imageCache['dcherry.png'];
                            if (cherryImg) {
                                ctx.drawImage(cherryImg, canvas.width / 2 - 60, canvas.height / 2 + 10, 120, 120);
                            }
                        } else if (level === 5) {
                            ctx.fillText('chcem ťa.', canvas.width / 2, canvas.height / 2 - 70);
                            ctx.font = 'bold 22px Arial';
                            ctx.fillText('tu máš tento chladničkouhor', canvas.width / 2, canvas.height / 2 - 30);
                            ctx.font = 'bold 20px Arial';
                            ctx.fillText('(odomkol sa chladičkouhorkoň)', canvas.width / 2, canvas.height / 2 - 5);

                            const coldpeaImg = imageCache['dchpea.png'];
                            if (coldpeaImg) {
                                ctx.drawImage(coldpeaImg, canvas.width / 2 - 60, canvas.height / 2 + 35, 120, 120);
                            }
                        } else if (level === 6) {
                            ctx.fillText('chcem ťa.', canvas.width / 2, canvas.height / 2 - 70);
                            ctx.font = 'bold 22px Arial';
                            ctx.fillText('tu máš tento objekt (neviem ako sa mu nadáva)', canvas.width / 2, canvas.height / 2 - 30);
                            ctx.font = 'bold 20px Arial';
                            ctx.fillText('(odomkol sa objekt#76)', canvas.width / 2, canvas.height / 2 - 5);

                            const objektImg = imageCache['dcarnivore1empty.png'];
                            if (objektImg) {
                                ctx.drawImage(objektImg, canvas.width / 2 - 60, canvas.height / 2 + 35, 120, 120);
                            }
                        }
                        
                        // Show unlocked message with sunflower image if applicable
                        if (level === 1) {
                            ctx.fillStyle = '#ffff00';
                            ctx.font = 'bold 24px Arial';
                            ctx.fillText('slnecnicoň odomknutý', canvas.width / 2, canvas.height / 2 + 20);
                            
                            const sunflowerImg = imageCache['dsunflower.png'];
                            if (sunflowerImg) {
                                ctx.drawImage(sunflowerImg, canvas.width / 2 - 40, canvas.height / 2 + 50, 80, 80);
                            }
                        }

                        if (!gameOverTime) {
                            gameOverTime = Date.now();
                        }
                        if (Date.now() - gameOverTime > 3000) {
                            isTransitioning = true;
                            gameActive = false; // Stop all game logic
                            
                            // Handle speci level completion
                            if (level === 99) {
                                if (typeof speciLevel !== 'undefined') {
                                    speciLevel.levelCompleted();
                                    // Regenerate levels grid to show updated speci level status
                                    if (typeof generateLevels === 'function') {
                                        generateLevels();
                                    }
                                }
                            } else {
                                // Unlock next level when level is completed
                                if (typeof plantSelector !== 'undefined') {
                                    plantSelector.completeLevel(level - 1); // 0-indexed
                                    if (level === 1) {
                                        plantSelector.unlockPlant('sunflower');
                                    } else if (level === 2) {
                                        plantSelector.unlockPlant('orechon');
                                    } else if (level === 3) {
                                        plantSelector.unlockPlant('shovel');
                                    } else if (level === 4) {
                                        plantSelector.unlockPlant('cherry');
                                    } else if (level === 5) {
                                        plantSelector.unlockPlant('coldpea');
                                    } else if (level === 6) {
                                        plantSelector.unlockPlant('coldpea');
                                        plantSelector.unlockPlant('objekt76');
                                    }
                                    // Regenerate levels grid to reflect unlocked levels
                                    if (typeof regenerateLevels === 'function') {
                                        regenerateLevels();
                                    }
                                }
                            }
                            returnToLevels();
                            return;
                        }
                        gameLoopId = requestAnimationFrame(gameLoop);
                    } else {
                        gameLoopId = requestAnimationFrame(gameLoop);
                    }
                }

              function returnToLevels() {
                    // CRITICAL FIX: Cancel the game loop animation frame to completely stop the game
                    // This prevents the background game loop from continuing to run and triggering
                    // false "level failed" messages when the user switches windows
                    if (gameLoopId !== null) {
                        cancelAnimationFrame(gameLoopId);
                        gameLoopId = null;
                    }
                    
                    // Stop all plant songs when returning to levels
                    if (typeof plantAudioManager !== 'undefined') {
                        plantAudioManager.stopAllSongs();
                    }
                    
                    // Restart background music when returning to levels
                    if (typeof bgMusicManager !== 'undefined') {
                        bgMusicManager.playBackgroundMusic();
                    }
                    
                    // Hide speci level screens if we're coming from a speci level
                    if (level === 99) {
                        const speciMainScreen = document.getElementById('speci-level-screen');
                        const speciModifiersScreen = document.getElementById('speci-modifiers-screen');
                        const speciHistoryScreen = document.getElementById('speci-history-screen');
                        
                        if (speciMainScreen) {
                            speciMainScreen.style.display = 'none';
                            speciMainScreen.classList.add('hidden');
                        }
                        if (speciModifiersScreen) {
                            speciModifiersScreen.style.display = 'none';
                            speciModifiersScreen.classList.add('hidden');
                        }
                        if (speciHistoryScreen) {
                            speciHistoryScreen.style.display = 'none';
                            speciHistoryScreen.classList.add('hidden');
                        }
                    }
                    
                    canvas.removeEventListener('click', handleGameInput);
                    canvas.removeEventListener('touchend', handleGameInput);
                    window.removeEventListener('resize', resizeCanvas);
                    window.removeEventListener('orientationchange', resizeCanvas);
                    document.removeEventListener('visibilitychange', handleVisibilityChange);
                    window.removeEventListener('blur', handleBlur);
                    window.removeEventListener('focus', handleFocus);
                    window.removeEventListener('beforeunload', handleBeforeUnload);
                    const levelsScreen = document.getElementById('levels-screen');
                    const gameScreen = document.getElementById('game-screen');

                    gameScreen.style.display = 'none';
                    levelsScreen.style.display = 'flex';
                    gameScreen.classList.add('hidden');
                    levelsScreen.classList.remove('hidden');
                }

              gameLoop();
            }
         }
}
