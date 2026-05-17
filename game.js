function initGame(level) {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
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

    playLevel1();

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
            let PLANT_MENU_X = canvas.width - 150;
            const PLANT_MENU_Y = TOP_PADDING;
            const LEVEL_DURATION = 120000;

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

            const startTime = Date.now();

            // Plant types
            const PLANT_TYPES = {
                peashooter: {
                    name: 'Peashooter',
                    image: 'dpea1.png',
                    shootImage: 'dpea1shoot.png',
                    cost: 100,
                    health: 50,
                    attackRange: 300,
                    attackDamage: 50,
                    attackSpeed: 1000,
                    shootDuration: 200,
                    width: 50,
                    height: 50,
                    collisionRadius: 25
                }
            };

            // Enemy type
            const ENEMY_TYPE = {
                name: 'Basic Zombie',
                image: 'ealc1.png',
                lowHealthImage: 'ealc1low.png',
                health: 300,
                speed: 0.15,
                damage: 25,
                damageInterval: 1000,
                width: 50,
                height: 50,
                collisionRadius: 25,
                lowHealthThreshold: 0.1
            };

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

                attack(enemies) {
                    const now = Date.now();
                    if (now - this.lastAttack < this.type.attackSpeed) return;

                    for (let enemy of enemies) {
                        if (enemy.rowIndex === this.gridY && enemy.x > this.x) {
                            projectiles.push(new Projectile(this.x, this.y, enemy));
                            this.lastAttack = now;
                            this.isShooting = true;
                            this.shootStartTime = now;
                            break;
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
                constructor(x) {
                    this.x = x;
                    this.y = -40;
                    this.value = 25;
                    this.radius = 25;
                    this.speed = 1;
                    this.targetY = GRID_START_Y + Math.random() * (GRID_ROWS * GRID_CELL_HEIGHT);
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
                const slotWidth = 80;
                const slotHeight = 80;
                const slots = 5;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(menuX - 10, menuY - 10, 100, slotHeight * slots + 20);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Plants', menuX + 40, menuY - 25);

                const plantList = ['peashooter'];

                for (let i = 0; i < slots; i++) {
                    const slotX = menuX;
                    const slotY = menuY + i * (slotHeight + 5);

                    if (i < plantList.length) {
                        const plant = PLANT_TYPES[plantList[i]];
                        const isSelected = selectedPlant === plantList[i];

                        ctx.fillStyle = isSelected ? '#00ff00' : '#1a7e28';
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 2;
                        ctx.fillRect(slotX, slotY, slotWidth, slotHeight);
                        ctx.strokeRect(slotX, slotY, slotWidth, slotHeight);

                        // Draw plant image - BIGGER (60x60)
                        const img = imageCache[plant.image];
                        if (img) {
                            ctx.drawImage(img, slotX + 10, slotY + 10, 60, 60);
                        }

                        // Draw cost (will overlap with bigger image)
                        ctx.fillStyle = '#ffff00';
                        ctx.font = 'bold 12px Arial';
                        ctx.textAlign = 'right';
                        ctx.textBaseline = 'bottom';
                        ctx.fillText(plant.cost, slotX + slotWidth - 5, slotY + slotHeight - 5);
                    } else {
                        ctx.fillStyle = '#333333';
                        ctx.strokeStyle = '#666666';
                        ctx.lineWidth = 1;
                        ctx.fillRect(slotX, slotY, slotWidth, slotHeight);
                        ctx.strokeRect(slotX, slotY, slotWidth, slotHeight);
                    }
                }

                const deselectX = menuX + slotWidth - 12;
                const deselectY = menuY - 10;
                const deselectSize = 20;

                ctx.fillStyle = '#ff0000';
                ctx.fillRect(deselectX - deselectSize / 2, deselectY, deselectSize, deselectSize);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(deselectX - deselectSize / 2, deselectY, deselectSize, deselectSize);

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(deselectX - 6, deselectY + 4);
                ctx.lineTo(deselectX + 6, deselectY + 16);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(deselectX + 6, deselectY + 4);
                ctx.lineTo(deselectX - 6, deselectY + 16);
                ctx.stroke();

                // Back button moved to TOP RIGHT
                const backBtnX = canvas.width - 60;
                const backBtnY = 20;
                const backBtnWidth = 100;
                const backBtnHeight = 40;

                ctx.fillStyle = '#8b5411';
                ctx.fillRect(backBtnX - backBtnWidth / 2, backBtnY, backBtnWidth, backBtnHeight);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(backBtnX - backBtnWidth / 2, backBtnY, backBtnWidth, backBtnHeight);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('← Back', backBtnX, backBtnY + backBtnHeight / 2);
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

                ctx.fillStyle = '#00ff00';
                ctx.fillRect(barX, barY, barWidth * progress, barHeight);

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(barX, barY, barWidth, barHeight);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${Math.ceil((LEVEL_DURATION - gametime) / 1000)}s`, barX + barWidth / 2, barY + barHeight / 2);
            }

            function drawSunCounter() {
                const sunImg = imageCache['sun.png'];
                const sunX = 20;
                const sunY = 40;
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
                const slotWidth = 80;
                const deselectX = menuX + slotWidth - 12;
                const deselectY = menuY - 10;
                const deselectSize = 20;

                if (mouseX >= deselectX - deselectSize / 2 && mouseX <= deselectX + deselectSize / 2 &&
                    mouseY >= deselectY && mouseY <= deselectY + deselectSize) {
                    selectedPlant = null;
                    return;
                }

                // Back button in TOP RIGHT
                const backBtnX = canvas.width - 60;
                const backBtnY = 20;
                const backBtnWidth = 100;
                const backBtnHeight = 40;

                if (mouseX >= backBtnX - backBtnWidth / 2 && mouseX <= backBtnX + backBtnWidth / 2 &&
                    mouseY >= backBtnY && mouseY <= backBtnY + backBtnHeight) {
                    returnToLevels();
                    return;
                }

                const slotHeight = 80;
                for (let i = 0; i < plantList.length; i++) {
                    const slotX = menuX;
                    const slotY = menuY + i * (slotHeight + 5);

                    if (mouseX >= slotX && mouseX <= slotX + slotWidth &&
                        mouseY >= slotY && mouseY <= slotY + slotHeight) {
                        selectedPlant = plantList[i];
                        return;
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

                const now = Date.now();
                gametime = now - startTime;

                drawBackground();
                drawProgressBar();
                drawSunCounter();
                drawGrid();

                if (now - lastSunSpawn > 8000) {
                    suns_on_screen.push(new Sun(GRID_START_X + Math.random() * GRID_WIDTH));
                    lastSunSpawn = now;
                }

                suns_on_screen = suns_on_screen.filter(sun => {
                    const shouldKeep = !sun.update();
                    if (shouldKeep) sun.draw();
                    return shouldKeep;
                });

                if (gametime > 20000 && now - lastEnemySpawn > 5000 && gametime < 120000) {
                    const randomRow = Math.floor(Math.random() * UNLOCKED_ROWS);
                    enemies.push(new Enemy(randomRow));
                    lastEnemySpawn = now;
                }

                plants = plants.filter(plant => {
                    plant.draw();
                    plant.attack(enemies);
                    return plant.isAlive();
                });

                projectiles = projectiles.filter(p => {
                    const shouldKeep = p.update();
                    if (shouldKeep) p.draw();
                    return shouldKeep;
                });

                enemies = enemies.filter(enemy => {
                    const reachedEnd = enemy.update(plants);
                    if (reachedEnd) {
                        gameOver = true;
                        gameOverTime = Date.now();
                        return false;
                    }
                    if (!enemy.isAlive()) {
                        return false;
                    }
                    enemy.draw();
                    return true;
                });

                drawDestination();
                drawPlantMenu();

                if (gametime >= LEVEL_DURATION && enemies.length === 0) {
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
                    
                    const subtitles = [
                        'duchoňotrón by sa hneval',
                        'alkohol neprospieva pečeni',
                        'ZABIL SI JEHO PEČEŇ!!!',
                        'tak tebe to teda fakt nejde',
                        'bruchoň je sklamaný',
                        'pusti si dúhoňové sväté piesne a neplač'
                    ];
                    const randomSubtitle = subtitles[Math.floor(Math.random() * subtitles.length)];
                    
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '18px Arial';
                    ctx.fillText(randomSubtitle, canvas.width / 2, canvas.height / 2 + 40);

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
                    ctx.font = 'bold 48px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('LEVEL CLEARED!', canvas.width / 2, canvas.height / 2);

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
