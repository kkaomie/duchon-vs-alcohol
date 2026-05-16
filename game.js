function initGame(level) {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    if (level === 1) {
        playLevel1();
    }

    function playLevel1() {
        // Game constants
        const GRID_COLS = 10;
        const GRID_ROWS = 6;
        const UNLOCKED_ROWS = 2; // Only 2 rows unlocked in level 1
        const GRID_CELL_WIDTH = 60;
        const GRID_CELL_HEIGHT = 60;
        const SIDE_PADDING = 100;
        const TOP_PADDING = 100;
        const GRID_WIDTH = GRID_COLS * GRID_CELL_WIDTH;
        const GRID_HEIGHT = GRID_ROWS * GRID_CELL_HEIGHT;
        const GRID_START_X = SIDE_PADDING;
        const GRID_START_Y = TOP_PADDING;
        const PLANT_MENU_X = canvas.width - 150;
        const PLANT_MENU_Y = TOP_PADDING;
        const LEVEL_DURATION = 120000; // 2 minutes in milliseconds

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

        const startTime = Date.now();

        // Image cache
        const imageCache = {};
        
        function loadImage(src) {
            return new Promise((resolve) => {
                if (imageCache[src]) {
                    resolve(imageCache[src]);
                    return;
                }
                const img = new Image();
                img.onload = () => {
                    imageCache[src] = img;
                    resolve(img);
                };
                img.onerror = () => {
                    console.error('Failed to load image:', src);
                    resolve(null);
                };
                img.src = './assets/' + src;
            });
        }

        // Plant types
        const PLANT_TYPES = {
            peashooter: {
                name: 'Peashooter',
                image: 'dpea1.png',
                cost: 100,
                health: 50,
                attackRange: 150,
                attackDamage: 50,
                attackSpeed: 1000, // ms between attacks
                width: 50,
                height: 50
            }
        };

        // Enemy type
        const ENEMY_TYPE = {
            name: 'Basic Zombie',
            image: 'ealc1.png',
            health: 300,
            speed: 0.15, // pixels per frame (much slower)
            damage: 25,
            damageInterval: 1000, // ms between attacks
            width: 50,
            height: 50
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
                this.image = null;
                loadImage(this.type.image).then(img => this.image = img);
            }

            draw() {
                if (this.image) {
                    ctx.drawImage(this.image, this.x - this.type.width / 2, this.y - this.type.height / 2, this.type.width, this.type.height);
                } else {
                    // Fallback
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

                for (let enemy of enemies) {
                    const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                    if (dist < this.type.attackRange) {
                        projectiles.push(new Projectile(this.x, this.y, enemy));
                        this.lastAttack = now;
                        break;
                    }
                }
            }
        }

        // Projectile class
        class Projectile {
            constructor(x, y, target) {
                this.x = x;
                this.y = y;
                this.target = target;
                this.speed = 3;
                this.radius = 5;
            }

            update() {
                if (!this.target || this.target.health <= 0) {
                    return false; // Remove projectile
                }

                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                const dist = Math.hypot(dx, dy);

                if (dist < 10) {
                    this.target.health -= PLANT_TYPES.peashooter.attackDamage;
                    return false; // Hit, remove projectile
                }

                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
                return true;
            }

            draw() {
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Enemy class
        class Enemy {
            constructor(rowIndex) {
                // Spawn at LEFT edge of grid, not off-screen right
                this.x = GRID_START_X;
                this.rowIndex = rowIndex;
                this.y = GRID_START_Y + rowIndex * GRID_CELL_HEIGHT + GRID_CELL_HEIGHT / 2;
                this.health = ENEMY_TYPE.health;
                this.speed = ENEMY_TYPE.speed;
                this.lastDamage = 0;
                this.image = null;
                loadImage(ENEMY_TYPE.image).then(img => this.image = img);
            }

            update(plants) {
                this.x -= this.speed;

                // Check damage from nearby plants
                const now = Date.now();
                for (let plant of plants) {
                    if (plant.gridY === this.rowIndex) {
                        const dist = Math.abs(this.x - plant.x);
                        if (dist < GRID_CELL_WIDTH && now - this.lastDamage > ENEMY_TYPE.damageInterval) {
                            this.health -= ENEMY_TYPE.damage;
                            this.lastDamage = now;
                            break;
                        }
                    }
                }

                return this.x < GRID_START_X - 100; // Check if reached the end
            }

            draw() {
                if (this.image) {
                    ctx.drawImage(this.image, this.x - ENEMY_TYPE.width / 2, this.y - ENEMY_TYPE.height / 2, ENEMY_TYPE.width, ENEMY_TYPE.height);
                } else {
                    // Fallback
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
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.value = 25;
                this.radius = 15;
                this.clickable = true;
            }

            draw() {
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(this.value, this.x, this.y);
            }

            isClicked(mouseX, mouseY) {
                const dist = Math.hypot(mouseX - this.x, mouseY - this.y);
                return dist < this.radius;
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

        // Draw game grid
        function drawGrid() {
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 1;

            for (let row = 0; row < GRID_ROWS; row++) {
                for (let col = 0; col < GRID_COLS; col++) {
                    const x = GRID_START_X + col * GRID_CELL_WIDTH;
                    const y = GRID_START_Y + row * GRID_CELL_HEIGHT;

                    if (row < UNLOCKED_ROWS) {
                        ctx.fillStyle = 'rgba(200, 255, 200, 0.2)';
                        ctx.fillRect(x, y, GRID_CELL_WIDTH, GRID_CELL_HEIGHT);
                    } else {
                        ctx.fillStyle = 'rgba(100, 100, 100, 0.2)';
                        ctx.fillRect(x, y, GRID_CELL_WIDTH, GRID_CELL_HEIGHT);
                    }
                    ctx.strokeRect(x, y, GRID_CELL_WIDTH, GRID_CELL_HEIGHT);
                }
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
                        // Check if cell is empty
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

            ctx.fillStyle = '#1a7e28';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            drawProgressBar();
            drawSunCounter();
            drawGrid();

            // Spawn suns
            if (now - lastSunSpawn > 8000) {
                suns_on_screen.push(new Sun(GRID_START_X + Math.random() * GRID_WIDTH, GRID_START_Y + Math.random() * GRID_HEIGHT));
                lastSunSpawn = now;
            }

            // Draw and update suns
            for (let sun of suns_on_screen) {
                sun.draw();
            }

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
            } else if (levelWon) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#00ff00';
                ctx.font = 'bold 48px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('LEVEL CLEARED!', canvas.width / 2, canvas.height / 2);
            }

            if (!gameOver && !levelWon) {
                requestAnimationFrame(gameLoop);
            }
        }

        gameLoop();
    }
}
