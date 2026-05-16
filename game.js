function initGame(level) {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Check device orientation
    const isPortrait = canvas.height > canvas.width;
    
    if (isPortrait) {
        showOrientationScreen();
    } else {
        playLevel1();
    }

    function showOrientationScreen() {
        let selectedOrientation = null;

        function drawOrientationScreen() {
            ctx.fillStyle = '#1a7e28';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText('Choose Orientation', canvas.width / 2, 50);

            // Portrait button
            const portraitX = canvas.width / 4;
            const portraitY = canvas.height / 2 - 50;
            const buttonW = 150;
            const buttonH = 100;

            ctx.fillStyle = selectedOrientation === 'portrait' ? '#00ff00' : '#1a7e28';
            ctx.fillRect(portraitX - buttonW / 2, portraitY, buttonW, buttonH);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.strokeRect(portraitX - buttonW / 2, portraitY, buttonW, buttonH);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Portrait', portraitX, portraitY + buttonH / 2);

            // Landscape button
            const landscapeX = (canvas.width * 3) / 4;
            const landscapeY = canvas.height / 2 - 50;

            ctx.fillStyle = selectedOrientation === 'landscape' ? '#00ff00' : '#1a7e28';
            ctx.fillRect(landscapeX - buttonW / 2, landscapeY, buttonW, buttonH);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.strokeRect(landscapeX - buttonW / 2, landscapeY, buttonW, buttonH);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Landscape', landscapeX, landscapeY + buttonH / 2);
        }

        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const portraitX = canvas.width / 4;
            const landscapeX = (canvas.width * 3) / 4;
            const buttonY = canvas.height / 2 - 50;
            const buttonW = 150;
            const buttonH = 100;

            if (mouseX >= portraitX - buttonW / 2 && mouseX <= portraitX + buttonW / 2 &&
                mouseY >= buttonY && mouseY <= buttonY + buttonH) {
                selectedOrientation = 'portrait';
                screen.orientation.lock('portrait-primary').catch(() => {
                    screen.orientation.lock('portrait').catch(() => {});
                });
                setTimeout(() => {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                    playLevel1();
                }, 500);
            }

            if (mouseX >= landscapeX - buttonW / 2 && mouseX <= landscapeX + buttonW / 2 &&
                mouseY >= buttonY && mouseY <= buttonY + buttonH) {
                selectedOrientation = 'landscape';
                screen.orientation.lock('landscape-primary').catch(() => {
                    screen.orientation.lock('landscape').catch(() => {});
                });
                setTimeout(() => {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                    playLevel1();
                }, 500);
            }
        });

        function orientationLoop() {
            drawOrientationScreen();
            requestAnimationFrame(orientationLoop);
        }
        orientationLoop();
    }

    function playLevel1() {
        // Image preloader
        const preloadImages = [
            'dpea1.png',
            'ealc1.png',
            'projectile.png',
            'sun.png',
            'lvl1bcg.png'
        ];

        const imageCache = {};
        let imagesLoaded = 0;

        function preloadImage(src) {
            return new Promise((resolve) => {
                const img = new Image();
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
            // Game constants
            const GRID_COLS = 10;
            const GRID_ROWS = 6;
            const UNLOCKED_ROWS = 2;
            const GRID_CELL_WIDTH = 60;
            const GRID_CELL_HEIGHT = 60;
            const SIDE_PADDING = 100;
            const TOP_PADDING = 100;
            const GRID_WIDTH = GRID_COLS * GRID_CELL_WIDTH;
            const GRID_HEIGHT = GRID_ROWS * GRID_CELL_HEIGHT;
            const GRID_START_X = SIDE_PADDING;
            const GRID_START_Y = TOP_PADDING;
            const GRID_END_X = GRID_START_X + GRID_WIDTH;
            const PLANT_MENU_X = canvas.width - 150;
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

            const startTime = Date.now();

            // Plant types
            const PLANT_TYPES = {
                peashooter: {
                    name: 'Peashooter',
                    image: 'dpea1.png',
                    cost: 100,
                    health: 50,
                    attackRange: 300,
                    attackDamage: 50,
                    attackSpeed: 1000,
                    width: 50,
                    height: 50,
                    collisionRadius: 25
                }
            };

            // Enemy type
            const ENEMY_TYPE = {
                name: 'Basic Zombie',
                image: 'ealc1.png',
                health: 300,
                speed: 0.15,
                damage: 25,
                damageInterval: 1000,
                width: 50,
                height: 50,
                collisionRadius: 25
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
                }

                draw() {
                    const img = imageCache[this.type.image];
                    if (img) {
                        ctx.drawImage(img, this.x - this.type.width / 2, this.y - this.type.height / 2, this.type.width, this.type.height);
                    } else {
                        ctx.fillStyle = '#00cc00';
                        ctx.fillRect(this.x - this.type.width / 2, this.y - this.type.height / 2, this.type.width, this.type.height);
                    }
                    // Draw health bar
                    ctx.fillStyle = '#ff0000';
                    ctx.fillRect(this.x - this.type.width / 2, this.y - this.type.height / 2 - 10, this.type.width * (this.health / this.type.health), 5);
                }

                attack(enemies) {
                    const now = Date.now();
                    if (now - this.lastAttack < this.type.attackSpeed) return;

                    // Only shoot enemies in the same row
                    for (let enemy of enemies) {
                        if (enemy.rowIndex === this.gridY && enemy.x > this.x) {
                            projectiles.push(new Projectile(this.x, this.y, enemy));
                            this.lastAttack = now;
                            break;
                        }
                    }
                }

                collidesWith(x, y) {
                    const dist = Math.hypot(x - this.x, y - this.y);
                    return dist < this.type.collisionRadius + ENEMY_TYPE.collisionRadius;
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
                    // Spawn at RIGHT edge of grid (enemies come from right to left)
                    this.x = GRID_END_X;
                    this.rowIndex = rowIndex;
                    this.y = GRID_START_Y + rowIndex * GRID_CELL_HEIGHT + GRID_CELL_HEIGHT / 2;
                    this.health = ENEMY_TYPE.health;
                    this.speed = ENEMY_TYPE.speed;
                    this.lastDamage = 0;
                    this.desiredX = this.x;
                }

                update(plants) {
                    // Try to move left
                    let canMove = true;
                    const nextX = this.x - this.speed;

                    // Check collision with plants
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

                    // Check damage from nearby plants
                    const now = Date.now();
                    for (let plant of plants) {
                        if (plant.gridY === this.rowIndex) {
                            if (plant.collidesWith(this.x, this.y)) {
                                if (now - this.lastDamage > ENEMY_TYPE.damageInterval) {
                                    this.health -= ENEMY_TYPE.damage;
                                    this.lastDamage = now;
                                }
                            }
                        }
                    }

                    return this.x < GRID_START_X - 100; // Check if reached the left end
                }

                draw() {
                    const img = imageCache[ENEMY_TYPE.image];
                    if (img) {
                        ctx.drawImage(img, this.x - ENEMY_TYPE.width / 2, this.y - ENEMY_TYPE.height / 2, ENEMY_TYPE.width, ENEMY_TYPE.height);
                    } else {
                        ctx.fillStyle = '#ff6600';
                        ctx.fillRect(this.x - ENEMY_TYPE.width / 2, this.y - ENEMY_TYPE.height / 2, ENEMY_TYPE.width, ENEMY_TYPE.height);
                    }
                    // Draw health bar
                    ctx.fillStyle = '#ff0000';
                    ctx.fillRect(this.x - ENEMY_TYPE.width / 2, this.y - ENEMY_TYPE.height / 2 - 10, ENEMY_TYPE.width * (this.health / ENEMY_TYPE.health), 5);
                }
            }

            // Sun class
            class Sun {
                constructor(x) {
                    this.x = x;
                    this.y = -40; // Start above screen
                    this.value = 25;
                    this.radius = 25; // Bigger suns
                    this.speed = 1; // Fall speed
                    this.targetY = GRID_START_Y + Math.random() * (GRID_ROWS * GRID_CELL_HEIGHT);
                }

                update() {
                    // Fall down
                    if (this.y < this.targetY) {
                        this.y += this.speed;
                    }
                    return this.y > canvas.height + 50; // Remove if off screen
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

            // Plant menu drawing
            function drawPlantMenu() {
                const menuX = PLANT_MENU_X;
                const menuY = PLANT_MENU_Y;
                const slotWidth = 120;
                const slotHeight = 60;
                const slots = 5;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(menuX - 10, menuY - 10, 140, slotHeight * slots + 20);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Plants', menuX + 60, menuY - 25);

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

                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 12px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'top';
                        ctx.fillText(plant.name, slotX + slotWidth / 2, slotY + 5);
                        ctx.font = '11px Arial';
                        ctx.fillText(`Cost: ${plant.cost}`, slotX + slotWidth / 2, slotY + 22);
                        ctx.fillText(`HP: ${plant.health}`, slotX + slotWidth / 2, slotY + 35);
                        ctx.fillText(`DMG: ${plant.attackDamage}`, slotX + slotWidth / 2, slotY + 48);
                    } else {
                        ctx.fillStyle = '#333333';
                        ctx.strokeStyle = '#666666';
                        ctx.lineWidth = 1;
                        ctx.fillRect(slotX, slotY, slotWidth, slotHeight);
                        ctx.strokeRect(slotX, slotY, slotWidth, slotHeight);
                    }
                }
            }

            // Draw game grid with chessboard pattern
            function drawGrid() {
                ctx.lineWidth = 1;

                for (let row = 0; row < GRID_ROWS; row++) {
                    for (let col = 0; col < GRID_COLS; col++) {
                        const x = GRID_START_X + col * GRID_CELL_WIDTH;
                        const y = GRID_START_Y + row * GRID_CELL_HEIGHT;

                        if (row < UNLOCKED_ROWS) {
                            // Chessboard pattern for unlocked rows (green shades)
                            const isEvenSquare = (row + col) % 2 === 0;
                            if (isEvenSquare) {
                                ctx.fillStyle = '#228b22'; // Full green
                            } else {
                                ctx.fillStyle = '#1a6b1a'; // Dark green
                            }
                            ctx.fillRect(x, y, GRID_CELL_WIDTH, GRID_CELL_HEIGHT);
                            ctx.strokeStyle = '#ffffff';
                        } else {
                            // Chessboard pattern for locked rows (brown shades)
                            const isEvenSquare = (row + col) % 2 === 0;
                            if (isEvenSquare) {
                                ctx.fillStyle = '#8b6914'; // Brown
                            } else {
                                ctx.fillStyle = '#6b5411'; // Darker brown
                            }
                            ctx.fillRect(x, y, GRID_CELL_WIDTH, GRID_CELL_HEIGHT);
                            ctx.strokeStyle = '#665544';
                        }
                        ctx.strokeRect(x, y, GRID_CELL_WIDTH, GRID_CELL_HEIGHT);
                    }
                }
            }

            // Draw background
            function drawBackground() {
                const bgImg = imageCache['lvl1bcg.png'];
                if (bgImg) {
                    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
                } else {
                    ctx.fillStyle = '#1a7e28';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            }

            // Draw progress bar
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

            // Draw suns counter
            function drawSunCounter() {
                ctx.fillStyle = '#ffff00';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(`Suns: ${suns}`, 20, 50);
            }

            // Handle clicks
            canvas.addEventListener('click', (e) => {
                if (gameOver || levelWon) return;

                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                // Check sun clicks
                suns_on_screen = suns_on_screen.filter(sun => {
                    if (sun.isClicked(mouseX, mouseY)) {
                        suns += sun.value;
                        return false;
                    }
                    return true;
                });

                // Check plant menu clicks
                const plantList = ['peashooter'];
                const menuX = PLANT_MENU_X;
                const menuY = PLANT_MENU_Y;
                const slotWidth = 120;
                const slotHeight = 60;

                for (let i = 0; i < plantList.length; i++) {
                    const slotX = menuX;
                    const slotY = menuY + i * (slotHeight + 5);

                    if (mouseX >= slotX && mouseX <= slotX + slotWidth &&
                        mouseY >= slotY && mouseY <= slotY + slotHeight) {
                        selectedPlant = plantList[i];
                        return;
                    }
                }

                // Check grid clicks to place plant
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
            });

            // Main game loop
            function gameLoop() {
                const now = Date.now();
                gametime = now - startTime;

                drawBackground();
                drawProgressBar();
                drawSunCounter();
                drawGrid();

                // Spawn suns (same rate, now falling from top)
                if (now - lastSunSpawn > 8000) {
                    suns_on_screen.push(new Sun(GRID_START_X + Math.random() * GRID_WIDTH));
                    lastSunSpawn = now;
                }

                // Update and draw suns
                suns_on_screen = suns_on_screen.filter(sun => {
                    const shouldKeep = !sun.update();
                    if (shouldKeep) sun.draw();
                    return shouldKeep;
                });

                // Spawn enemies (after 20 seconds, every 5 seconds, only on grid rows)
                if (gametime > 20000 && now - lastEnemySpawn > 5000 && gametime < 120000) {
                    const randomRow = Math.floor(Math.random() * UNLOCKED_ROWS);
                    enemies.push(new Enemy(randomRow));
                    lastEnemySpawn = now;
                }

                // Update and draw plants
                for (let plant of plants) {
                    plant.draw();
                    plant.attack(enemies);
                }

                // Update and draw projectiles
                projectiles = projectiles.filter(p => {
                    const shouldKeep = p.update();
                    if (shouldKeep) p.draw();
                    return shouldKeep;
                });

                // Update and draw enemies
                enemies = enemies.filter(enemy => {
                    const reachedEnd = enemy.update(plants);
                    if (reachedEnd) {
                        gameOver = true;
                        gameOverTime = Date.now();
                        return false;
                    }
                    if (enemy.health <= 0) {
                        return false;
                    }
                    enemy.draw();
                    return true;
                });

                // Draw plants menu
                drawPlantMenu();

                // Check win condition
                if (gametime >= LEVEL_DURATION && enemies.length === 0) {
                    levelWon = true;
                }

                // Draw game over/win message
                if (gameOver) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#ff0000';
                    ctx.font = 'bold 48px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '24px Arial';
                    ctx.fillText('An enemy reached the end!', canvas.width / 2, canvas.height / 2 + 50);

                    // Auto return after 3 seconds
                    if (Date.now() - gameOverTime > 3000) {
                        returnToHome();
                        return;
                    }
                } else if (levelWon) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#00ff00';
                    ctx.font = 'bold 48px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('LEVEL CLEARED!', canvas.width / 2, canvas.height / 2);
                } else {
                    requestAnimationFrame(gameLoop);
                    return;
                }

                if (!gameOver && !levelWon) {
                    requestAnimationFrame(gameLoop);
                }
            }

            function returnToHome() {
                const homeScreen = document.getElementById('home-screen');
                const gameScreen = document.getElementById('game-screen');

                gameScreen.style.display = 'none';
                homeScreen.style.display = 'flex';
                gameScreen.classList.add('hidden');
                homeScreen.classList.remove('hidden');
            }

            gameLoop();
        }
    }
}
