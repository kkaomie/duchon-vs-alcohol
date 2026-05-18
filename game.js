function initGame(level) {
     const canvas = document.getElementById('gameCanvas');
     const ctx = canvas.getContext('2d');
     
     // Game paused state
     let gamePaused = false;
     let gameActive = true; // Track if game should still be running
     
     // Handle visibility changes - freeze game when window loses focus
     const handleVisibilityChange = () => {
         if (document.hidden) {
             gamePaused = true;
             gameActive = false; // Mark as failed
             console.log('Game paused and marked as failed - window lost focus');
         } else {
             gamePaused = false;
             console.log('Game resumed - window regained focus');
         }
     };
     
     // Handle window/tab blur - user switched away
     const handleBlur = () => {
         gamePaused = true;
         gameActive = false; // Mark as failed
         console.log('Game paused and marked as failed - window blurred');
     };
     
     // Handle window/tab focus - user came back
     const handleFocus = () => {
         gamePaused = false;
         console.log('Game resumed - window focused');
     };
     
     // Handle beforeunload - app/window closing
     const handleBeforeUnload = () => {
         gameActive = false; // Mark as failed
         console.log('Game marked as failed - app/window closing');
     };
     
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

     if (level === 1) {
         playLevel1();
     } else if (level === 2) {
         playLevel2();
     }

     function playLevel1() {
         // Image preloader
         const preloadImages = [
             'dpea1.png',
             'dpea1shoot.png',
             'ealc1.png',
             'ealc1low.png',
             'pecen.png',
             'projectile.png',
             'sun.png',
             'lvl1bcg.png',
             'dsunflower.png'
         ];

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
             let UNLOCKED_ROWS = 2;
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
             let PLANT_MENU_X = canvas.width - 150 - 160; // Moved 200px to the left
             const PLANT_MENU_Y = TOP_PADDING;
             const LEVEL_DURATION = 120000;
             const TWO_MINUTE_MARK = 120000;

             // Game state
             let suns = 50;
             let selectedPlant = null;
             let plants = [];
             let enemies = [];
             let projectiles = [];
             let gameOver = false;
             let levelWon = false;
             let gametime = 0;
             let lastEnemySpawn = 0;
             let lastSunSpawn = 0;
             let gameOverTime = null;
             let isTransitioning = false;
             let totalEnemiesSpawned = {}; // Track enemies by type
             let finalWaveTriggered = false;
             let finalWaveWarningTriggered = false;
             let finalWaveWarningTime = null;
             let loseScreenSubtitle = null; // Store the selected subtitle
             let finalWaveSpawningTime = null; // Time when final wave spawning started
             let finalWaveEnemiesSpawned = 0; // Track how many enemies spawned in final wave

             const startTime = Date.now();

             // Plant types
             const PLANT_TYPES = {
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
                     placementCooldown: 10000
                 }
             };

             // Enemy type - use ealc1 as default, can be expanded
             const ENEMY_TYPES = {
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
                 // Can easily add ealc2, ealc3, etc. here for future expansion
             };

             const ENEMY_TYPE = ENEMY_TYPES.ealc1; // Default enemy type for this level

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
                 }

                 draw() {
                     const now = Date.now();
                     if (this.isShooting && now - this.shootStartTime < this.type.shootDuration) {
                         const img = imageCache[this.type.shootImage];
                         if (img) {
                             ctx.drawImage(img, this.x - this.type.width / 2, this.y - this.type.height / 2, this.type.width, this.type.height);
                         } else {
                             ctx.fillStyle = '#00cc00';
                             ctx.fillRect(this.x - this.type.width / 2, this.y - this.type.height / 2, this.type.width, this.type.height);
                         }
                     } else {
                         this.isShooting = false;
                         const img = imageCache[this.type.image];
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
                     const now = Date.now();
                     if (!this.canAttack()) return;

                     for (let enemy of enemies) {
                         if (enemy.rowIndex === this.gridY && enemy.x > this.x) {
                             const distX = enemy.x - this.x;
                             if (distX <= this.type.attackRange) {
                                 projectiles.push(new Projectile(this.x, this.y, enemy));
                                 this.lastAttack = now;
                                 this.isShooting = true;
                                 this.shootStartTime = now;
                                 break;
                             }
                         }
                     }
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
             }

             // Projectile class
             class Projectile {
                 constructor(x, y, target) {
                     this.x = x;
                     this.y = y;
                     this.target = target;
                     this.speed = 5;
                     this.radius = 8;
                 }

                 update() {
                     if (!this.target || this.target.health <= 0) {
                         return false;
                     }

                     const dx = this.target.x - this.x;
                     const dy = this.target.y - this.y;
                     const dist = Math.hypot(dx, dy);

                     if (dist < 15) {
                         this.target.health -= PLANT_TYPES.peashooter.attackDamage;
                         return false;
                     }

                     this.x += (dx / dist) * this.speed;
                     this.y += (dy / dist) * this.speed;
                     return true;
                 }

                 draw() {
                     const img = imageCache['projectile.png'];
                     if (img) {
                         ctx.drawImage(img, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
                     } else {
                         ctx.fillStyle = '#ffff00';
                         ctx.beginPath();
                         ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                         ctx.fill();
                     }
                 }
             }

             // Enemy class
             class Enemy {
                 constructor(rowIndex) {
                     this.x = GRID_END_X;
                     this.rowIndex = rowIndex;
                     this.y = GRID_START_Y + rowIndex * GRID_CELL_HEIGHT + GRID_CELL_HEIGHT / 2;
                     this.health = ENEMY_TYPE.health;
                     this.speed = ENEMY_TYPE.speed;
                     this.lastDamage = 0;
                     this.desiredX = this.x;
                 }

                 update(plants) {
                     let canMove = true;
                     const nextX = this.x - this.speed;

                     for (let plant of plants) {
                         if (plant.gridY === this.rowIndex) {
                             if (plant.collidesWith(nextX, this.y)) {
                                 canMove = false;
                                 break;
                             }
                         }
                     }

                     if (canMove) {
                         this.x = nextX;
                     }

                     const now = Date.now();
                     for (let plant of plants) {
                         if (plant.gridY === this.rowIndex) {
                             if (plant.isNearby(this.x, this.y)) {
                                 if (now - this.lastDamage > ENEMY_TYPE.damageInterval) {
                                     plant.health -= ENEMY_TYPE.damage;
                                     this.lastDamage = now;
                                 }
                             }
                         }
                     }

                     return this.x < DESTINATION_X;
                 }

                 draw() {
                     const healthPercent = this.health / ENEMY_TYPE.health;
                     let imageToUse = ENEMY_TYPE.image;
                     
                     if (healthPercent <= ENEMY_TYPE.lowHealthThreshold) {
                         imageToUse = ENEMY_TYPE.lowHealthImage;
                     }

                     const img = imageCache[imageToUse];
                     if (img) {
                         ctx.drawImage(img, this.x - ENEMY_TYPE.width / 2, this.y - ENEMY_TYPE.height / 2, ENEMY_TYPE.width, ENEMY_TYPE.height);
                     } else {
                         ctx.fillStyle = '#ff6600';
                         ctx.fillRect(this.x - ENEMY_TYPE.width / 2, this.y - ENEMY_TYPE.height / 2, ENEMY_TYPE.width, ENEMY_TYPE.height);
                     }
                     ctx.fillStyle = '#ff0000';
                     ctx.fillRect(this.x - ENEMY_TYPE.width / 2, this.y - ENEMY_TYPE.height / 2 - 10, ENEMY_TYPE.width * healthPercent, 5);
                 }

                 isAlive() {
                     return this.health > 0;
                 }
             }

             // Sun class
             class Sun {
                 constructor(x, stationary = false) {
                     this.x = x;
                     this.y = -40;
                     this.value = 25;
                     this.radius = 25;
                     this.speed = 1;
                     this.stationary = stationary;
                     if (stationary) {
                         this.targetY = this.y;
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

                 const plantList = ['peashooter'];

                 // Draw 2x3 grid
                 for (let row = 0; row < gridRows; row++) {
                     for (let col = 0; col < gridCols; col++) {
                         const index = row * gridCols + col;
                         const slotX = menuX + col * (slotWidth + spacing);
                         const slotY = menuY + row * (slotHeight + spacing);

                         if (index < plantList.length) {
                             const plant = PLANT_TYPES[plantList[index]];
                             const isSelected = selectedPlant === plantList[index];

                             ctx.fillStyle = isSelected ? '#00ff00' : '#1a7e28';
                             ctx.strokeStyle = '#ffffff';
                             ctx.lineWidth = 2;
                             ctx.fillRect(slotX, slotY, slotWidth, slotHeight);
                             ctx.strokeRect(slotX, slotY, slotWidth, slotHeight);

                             // Draw plant image
                             const img = imageCache[plant.image];
                             if (img) {
                                 ctx.drawImage(img, slotX + 5, slotY + 5, 50, 50);
                             }

                             // Draw cost
                             ctx.fillStyle = '#ffff00';
                             ctx.font = 'bold 10px Arial';
                             ctx.textAlign = 'right';
                             ctx.textBaseline = 'bottom';
                             ctx.fillText(plant.cost, slotX + slotWidth - 3, slotY + slotHeight - 3);
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
                 const progress = gametime / LEVEL_DURATION;

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
                     ctx.fillText(`${Math.ceil((LEVEL_DURATION - gametime) / 1000)}s`, barX + barWidth / 2, barY + barHeight / 2);
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

                 const plantList = ['peashooter'];
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
                                 // If clicking the same plant, deselect it
                                 if (selectedPlant === plantList[index]) {
                                     selectedPlant = null;
                                 } else {
                                     // Otherwise select the new plant
                                     selectedPlant = plantList[index];
                                 }
                                 return;
                             }
                         }
                     }
                 }

                 if (selectedPlant && suns >= PLANT_TYPES[selectedPlant].cost) {
                     const relX = mouseX - GRID_START_X;
                     const relY = mouseY - GRID_START_Y;

                     if (relX >= 0 && relX < GRID_WIDTH && relY >= 0 && relY < GRID_HEIGHT) {
                         const gridX = Math.floor(relX / GRID_CELL_WIDTH);
                         const gridY = Math.floor(relY / GRID_CELL_HEIGHT);

                         if (gridY < UNLOCKED_ROWS) {
                             const occupied = plants.some(p => p.gridX === gridX && p.gridY === gridY);
                             if (!occupied) {
                                 plants.push(new Plant(selectedPlant, gridX, gridY));
                                 suns -= PLANT_TYPES[selectedPlant].cost;
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
                     gametime = now - startTime;
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

                 // Spawn enemies for first 2 minutes - only if not paused
                 if (!gamePaused && gametime > 20000 && now - lastEnemySpawn > 5000 && gametime < TWO_MINUTE_MARK) {
                     const randomRow = Math.floor(Math.random() * UNLOCKED_ROWS);
                     enemies.push(new Enemy(randomRow));
                     lastEnemySpawn = now;
                     
                     // Track enemy count for final wave
                     totalEnemiesSpawned['ealc1'] = (totalEnemiesSpawned['ealc1'] || 0) + 1;
                 }

                 // Show warning and trigger final wave at 2 minutes
                 if (!gamePaused && gametime >= TWO_MINUTE_MARK && !finalWaveWarningTriggered) {
                     finalWaveWarningTriggered = true;
                     finalWaveWarningTime = now;
                 }

                 // Display warning for 5 seconds
                 if (finalWaveWarningTriggered && !finalWaveTriggered && (now - finalWaveWarningTime) < 5000) {
                     drawFinalWaveWarning();
                 }

                 // Spawn final wave after 5 seconds, over an 8 second period
                 if (finalWaveWarningTriggered && !finalWaveTriggered && (now - finalWaveWarningTime) >= 5000) {
                     finalWaveTriggered = true;
                     finalWaveSpawningTime = now;
                     
                     // Calculate final wave count: 0.5x enemies (rounded down)
                     const finalWaveCount = Math.floor((totalEnemiesSpawned['ealc1'] || 0) * 0.5);
                     
                     // Schedule enemies to spawn over 8 seconds
                     for (let i = 0; i < finalWaveCount; i++) {
                         setTimeout(() => {
                             if (!gamePaused) {
                                 const randomRow = Math.floor(Math.random() * UNLOCKED_ROWS);
                                 enemies.push(new Enemy(randomRow));
                                 finalWaveEnemiesSpawned++;
                             }
                         }, (i / finalWaveCount) * 8000);
                     }
                 }

                 plants = plants.filter(plant => {
                     plant.draw();
                     if (!gamePaused) {
                         plant.attack(enemies);
                     }
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
                 drawPlantMenu();

                 // Win logic: check enemies only after final wave completes
                 if (finalWaveTriggered && !gamePaused && (now - finalWaveSpawningTime) >= 8000 && enemies.length === 0) {
                     levelWon = true;
                 }

                 if (gameOver) {
                     ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                     ctx.fillRect(0, 0, canvas.width, canvas.height);
                     ctx.fillStyle = '#ff0000';
                     ctx.font = 'bold 48px Arial';
                     ctx.textAlign = 'center';
                     ctx.textBaseline = 'middle';
                     ctx.fillText('mojko prehral si či ako sa tomu nadáva', canvas.width / 2, canvas.height / 2 - 30);
                     
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
                         returnToLevels();
                         return;
                     }
                     requestAnimationFrame(gameLoop);
                 } else if (levelWon) {
                     ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                     ctx.fillRect(0, 0, canvas.width, canvas.height);
                     ctx.fillStyle = '#00ff00';
                     ctx.font = 'bold 30px Arial';
                     ctx.textAlign = 'center';
                     ctx.textBaseline = 'middle';
                     ctx.fillText('zachránil si Veľkého Duchoňa (aspoň pred alkoholom)', canvas.width / 2, canvas.height / 2 - 50);
                     
                     // Show unlocked message with sunflower image
                     ctx.fillStyle = '#ffff00';
                     ctx.font = 'bold 24px Arial';
                     ctx.fillText('slnecnicoň odomknutý', canvas.width / 2, canvas.height / 2 + 20);
                     
                     const sunflowerImg = imageCache['dsunflower.png'];
                     if (sunflowerImg) {
                         ctx.drawImage(sunflowerImg, canvas.width / 2 - 40, canvas.height / 2 + 50, 80, 80);
                     }

                     if (!gameOverTime) {
                         gameOverTime = Date.now();
                     }
                     if (Date.now() - gameOverTime > 3000) {
                         isTransitioning = true;
                         // Unlock sunflower and level 2 when level 1 is completed
                         if (typeof plantSelector !== 'undefined') {
                             plantSelector.completeLevel(0); // Level 0 is level 1
                             plantSelector.unlockPlant('sunflower');
                         }
                         returnToLevels();
                         return;
                     }
                     requestAnimationFrame(gameLoop);
                 } else {
                     requestAnimationFrame(gameLoop);
                 }
             }

             function returnToLevels() {
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

     function playLevel2() {
         // Image preloader
         const preloadImages = [
             'dpea1.png',
             'dpea1shoot.png',
             'dsunflower.png',
             'ealc1.png',
             'ealc1low.png',
             'pecen.png',
             'projectile.png',
             'sun.png',
             'lvl1bcg.png'
         ];

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
             let UNLOCKED_ROWS = 4;
             let GRID_CELL_WIDTH = 60;
             let GRID_CELL_HEIGHT = 60;
             let SIDE_PADDING = 200;
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
             const DESTINATION_X = GRID_START_X - 40;
             let PLANT_MENU_X = canvas.width - 150 - 160;
             const PLANT_MENU_Y = TOP_PADDING;
             const LEVEL_DURATION = 120000;
             const TWO_MINUTE_MARK = 120000;
             
             // Track when plants can be placed (placement cooldown)
             let lastPlacementTime = 0;

             // Game state
             let suns = 50;
             let selectedPlant = null;
             let plants = [];
             let enemies = [];
             let projectiles = [];
             let gameOver = false;
             let levelWon = false;
             let gametime = 0;
             let lastEnemySpawn = 0;
             let lastSunSpawn = 0;
             let gameOverTime = null;
             let isTransitioning = false;
             let totalEnemiesSpawned = {};
             let finalWaveTriggered = false;
             let finalWaveWarningTriggered = false;
             let finalWaveWarningTime = null;
             let loseScreenSubtitle = null;
             let finalWaveSpawningTime = null;
             let finalWaveEnemiesSpawned = 0;

             const startTime = Date.now();

             // Plant types
             const PLANT_TYPES = {
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
                     sunSpawnInterval: 8000,
                     width: 50,
                     height: 50,
                     collisionRadius: 25,
                     placementCooldown: 3000
                 }
             };

             // Enemy type - use ealc1 as default
             const ENEMY_TYPES = {
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
             };

             const ENEMY_TYPE = ENEMY_TYPES.ealc1;

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
                 }

                 draw() {
                     const now = Date.now();
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
                         const img = imageCache[this.type.image];
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
                     const now = Date.now();
                     if (!this.canAttack()) return;

                     for (let enemy of enemies) {
                         if (enemy.rowIndex === this.gridY && enemy.x > this.x) {
                             const distX = enemy.x - this.x;
                             if (distX <= this.type.attackRange) {
                                 projectiles.push(new Projectile(this.x, this.y, enemy));
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
                     if (now - this.lastSunSpawn >= this.type.sunSpawnInterval) {
                         suns_on_screen.push(new Sun(this.x, true));
                         this.lastSunSpawn = now;
                     }
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
             }

             // Projectile class
             class Projectile {
                 constructor(x, y, target) {
                     this.x = x;
                     this.y = y;
                     this.target = target;
                     this.speed = 5;
                     this.radius = 8;
                 }

                 update() {
                     if (!this.target || this.target.health <= 0) {
                         return false;
                     }

                     const dx = this.target.x - this.x;
                     const dy = this.target.y - this.y;
                     const dist = Math.hypot(dx, dy);

                     if (dist < 15) {
                         this.target.health -= PLANT_TYPES.peashooter.attackDamage;
                         return false;
                     }

                     this.x += (dx / dist) * this.speed;
                     this.y += (dy / dist) * this.speed;
                     return true;
                 }

                 draw() {
                     const img = imageCache['projectile.png'];
                     if (img) {
                         ctx.drawImage(img, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
                     } else {
                         ctx.fillStyle = '#ffff00';
                         ctx.beginPath();
                         ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                         ctx.fill();
                     }
                 }
             }

             // Enemy class
             class Enemy {
                 constructor(rowIndex) {
                     this.x = GRID_END_X;
                     this.rowIndex = rowIndex;
                     this.y = GRID_START_Y + rowIndex * GRID_CELL_HEIGHT + GRID_CELL_HEIGHT / 2;
                     this.health = ENEMY_TYPE.health;
                     this.speed = ENEMY_TYPE.speed;
                     this.lastDamage = 0;
                     this.desiredX = this.x;
                 }

                 update(plants) {
                     let canMove = true;
                     const nextX = this.x - this.speed;

                     for (let plant of plants) {
                         if (plant.gridY === this.rowIndex) {
                             if (plant.collidesWith(nextX, this.y)) {
                                 canMove = false;
                                 break;
                             }
                         }
                     }

                     if (canMove) {
                         this.x = nextX;
                     }

                     const now = Date.now();
                     for (let plant of plants) {
                         if (plant.gridY === this.rowIndex) {
                             if (plant.isNearby(this.x, this.y)) {
                                 if (now - this.lastDamage > ENEMY_TYPE.damageInterval) {
                                     plant.health -= ENEMY_TYPE.damage;
                                     this.lastDamage = now;
                                 }
                             }
                         }
                     }

                     return this.x < DESTINATION_X;
                 }

                 draw() {
                     const healthPercent = this.health / ENEMY_TYPE.health;
                     let imageToUse = ENEMY_TYPE.image;
                     
                     if (healthPercent <= ENEMY_TYPE.lowHealthThreshold) {
                         imageToUse = ENEMY_TYPE.lowHealthImage;
                     }

                     const img = imageCache[imageToUse];
                     if (img) {
                         ctx.drawImage(img, this.x - ENEMY_TYPE.width / 2, this.y - ENEMY_TYPE.height / 2, ENEMY_TYPE.width, ENEMY_TYPE.height);
                     } else {
                         ctx.fillStyle = '#ff6600';
                         ctx.fillRect(this.x - ENEMY_TYPE.width / 2, this.y - ENEMY_TYPE.height / 2, ENEMY_TYPE.width, ENEMY_TYPE.height);
                     }
                     ctx.fillStyle = '#ff0000';
                     ctx.fillRect(this.x - ENEMY_TYPE.width / 2, this.y - ENEMY_TYPE.height / 2 - 10, ENEMY_TYPE.width * healthPercent, 5);
                 }

                 isAlive() {
                     return this.health > 0;
                 }
             }

             // Sun class
             class Sun {
                 constructor(x, stationary = false) {
                     this.x = x;
                     this.y = -40;
                     this.value = 25;
                     this.radius = 25;
                     this.speed = 1;
                     this.stationary = stationary;
                     if (stationary) {
                         this.targetY = this.y;
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

                 const plantList = ['peashooter', 'sunflower'];

                 // Draw 2x3 grid
                 for (let row = 0; row < gridRows; row++) {
                     for (let col = 0; col < gridCols; col++) {
                         const index = row * gridCols + col;
                         const slotX = menuX + col * (slotWidth + spacing);
                         const slotY = menuY + row * (slotHeight + spacing);

                         if (index < plantList.length) {
                             const plant = PLANT_TYPES[plantList[index]];
                             const isSelected = selectedPlant === plantList[index];

                             ctx.fillStyle = isSelected ? '#00ff00' : '#1a7e28';
                             ctx.strokeStyle = '#ffffff';
                             ctx.lineWidth = 2;
                             ctx.fillRect(slotX, slotY, slotWidth, slotHeight);
                             ctx.strokeRect(slotX, slotY, slotWidth, slotHeight);

                             // Draw plant image
                             const img = imageCache[plant.image];
                             if (img) {
                                 ctx.drawImage(img, slotX + 5, slotY + 5, 50, 50);
                             }

                             // Draw cost
                             ctx.fillStyle = '#ffff00';
                             ctx.font = 'bold 10px Arial';
                             ctx.textAlign = 'right';
                             ctx.textBaseline = 'bottom';
                             ctx.fillText(plant.cost, slotX + slotWidth - 3, slotY + slotHeight - 3);
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
                 const progress = gametime / LEVEL_DURATION;

                 ctx.fillStyle = '#333333';
                 ctx.fillRect(barX, barY, barWidth, barHeight);

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
                 
                 if (!finalWaveTriggered) {
                     ctx.fillText(`${Math.ceil((LEVEL_DURATION - gametime) / 1000)}s`, barX + barWidth / 2, barY + barHeight / 2);
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

             function drawFinalWaveWarning() {
                 const bannerHeight = 60;
                 const bannerY = canvas.height / 2 - bannerHeight / 2;
                 
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

                 const plantList = ['peashooter', 'sunflower'];
                 const menuX = PLANT_MENU_X;
                 const menuY = PLANT_MENU_Y;
                 const slotWidth = 60;
                 const slotHeight = 60;
                 const gridCols = 2;
                 const spacing = 5;
                 const menuWidth = gridCols * slotWidth + (gridCols - 1) * spacing;
                 const menuHeight = 3 * slotHeight + 2 * spacing;

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
                                 if (selectedPlant === plantList[index]) {
                                     selectedPlant = null;
                                 } else {
                                     selectedPlant = plantList[index];
                                 }
                                 return;
                             }
                         }
                     }
                 }

                 if (selectedPlant && suns >= PLANT_TYPES[selectedPlant].cost) {
                     const now = Date.now();
                     const cooldown = PLANT_TYPES[selectedPlant].placementCooldown;
                     
                     if (now - lastPlacementTime >= cooldown) {
                         const relX = mouseX - GRID_START_X;
                         const relY = mouseY - GRID_START_Y;

                         if (relX >= 0 && relX < GRID_WIDTH && relY >= 0 && relY < GRID_HEIGHT) {
                             const gridX = Math.floor(relX / GRID_CELL_WIDTH);
                             const gridY = Math.floor(relY / GRID_CELL_HEIGHT);

                             if (gridY < UNLOCKED_ROWS) {
                                 const occupied = plants.some(p => p.gridX === gridX && p.gridY === gridY);
                                 if (!occupied) {
                                     plants.push(new Plant(selectedPlant, gridX, gridY));
                                     suns -= PLANT_TYPES[selectedPlant].cost;
                                     lastPlacementTime = now;
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
                 
                 if (!gameActive && !gameOver && !levelWon) {
                     gameOver = true;
                     gameOverTime = Date.now();
                     loseScreenSubtitle = 'beda ti ze ides het z appky 🚨‼️';
                     console.log('Level failed - user closed/switched away');
                 }
                 
                 const now = Date.now();
                 
                 if (!gamePaused) {
                     gametime = now - startTime;
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

                 if (!gamePaused && gametime > 20000 && now - lastEnemySpawn > 5000 && gametime < TWO_MINUTE_MARK) {
                     const randomRow = Math.floor(Math.random() * UNLOCKED_ROWS);
                     enemies.push(new Enemy(randomRow));
                     lastEnemySpawn = now;
                     
                     totalEnemiesSpawned['ealc1'] = (totalEnemiesSpawned['ealc1'] || 0) + 1;
                 }

                 if (!gamePaused && gametime >= TWO_MINUTE_MARK && !finalWaveWarningTriggered) {
                     finalWaveWarningTriggered = true;
                     finalWaveWarningTime = now;
                 }

                 if (finalWaveWarningTriggered && !finalWaveTriggered && (now - finalWaveWarningTime) < 5000) {
                     drawFinalWaveWarning();
                 }

                 if (finalWaveWarningTriggered && !finalWaveTriggered && (now - finalWaveWarningTime) >= 5000) {
                     finalWaveTriggered = true;
                     finalWaveSpawningTime = now;
                     
                     const finalWaveCount = Math.floor((totalEnemiesSpawned['ealc1'] || 0) * 0.5);
                     
                     for (let i = 0; i < finalWaveCount; i++) {
                         setTimeout(() => {
                             if (!gamePaused) {
                                 const randomRow = Math.floor(Math.random() * UNLOCKED_ROWS);
                                 enemies.push(new Enemy(randomRow));
                                 finalWaveEnemiesSpawned++;
                             }
                         }, (i / finalWaveCount) * 8000);
                     }
                 }

                 plants = plants.filter(plant => {
                     plant.draw();
                     if (!gamePaused) {
                         plant.attack(enemies);
                         if (plant.type.sunSpawnInterval) {
                             plant.produceSun();
                         }
                     }
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
                 drawPlantMenu();

                 if (finalWaveTriggered && !gamePaused && (now - finalWaveSpawningTime) >= 8000 && enemies.length === 0) {
                     levelWon = true;
                 }

                 if (gameOver) {
                     ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                     ctx.fillRect(0, 0, canvas.width, canvas.height);
                     ctx.fillStyle = '#ff0000';
                     ctx.font = 'bold 48px Arial';
                     ctx.textAlign = 'center';
                     ctx.textBaseline = 'middle';
                     ctx.fillText('mojko prehral si či ako sa tomu nadáva', canvas.width / 2, canvas.height / 2 - 30);
                     
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
                         returnToLevels();
                         return;
                     }
                     requestAnimationFrame(gameLoop);
                 } else if (levelWon) {
                     ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                     ctx.fillRect(0, 0, canvas.width, canvas.height);
                     ctx.fillStyle = '#00ff00';
                     ctx.font = 'bold 30px Arial';
                     ctx.textAlign = 'center';
                     ctx.textBaseline = 'middle';
                     ctx.fillText('zachránil si Veľkého Duchoňa (aspoň pred alkoholom)', canvas.width / 2, canvas.height / 2 - 50);

                     if (!gameOverTime) {
                         gameOverTime = Date.now();
                     }
                     if (Date.now() - gameOverTime > 3000) {
                         isTransitioning = true;
                         returnToLevels();
                         return;
                     }
                     requestAnimationFrame(gameLoop);
                 } else {
                     requestAnimationFrame(gameLoop);
                 }
             }

             function returnToLevels() {
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
