function initGame(level) {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Resize canvas to fit screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Game configuration based on level
    const levelConfig = {
        1: { speed: 3, difficulty: 'Easy' },
        2: { speed: 5, difficulty: 'Normal' },
        3: { speed: 8, difficulty: 'Hard' }
    };
    
    const config = levelConfig[level] || levelConfig[1];
    
    // Game state
    let player = { x: canvas.width / 2, y: canvas.height / 2, width: 40, height: 40, speed: config.speed };
    let keys = {};
    
    // Input handling
    window.addEventListener('keydown', (e) => keys[e.key] = true);
    window.addEventListener('keyup', (e) => keys[e.key] = false);
    
    // Touch controls for mobile
    canvas.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        player.x = touch.clientX - player.width / 2;
        player.y = touch.clientY - player.height / 2;
    });
    
    function update() {
        if (keys['ArrowUp'] || keys['w']) player.y -= player.speed;
        if (keys['ArrowDown'] || keys['s']) player.y += player.speed;
        if (keys['ArrowLeft'] || keys['a']) player.x -= player.speed;
        if (keys['ArrowRight'] || keys['d']) player.x += player.speed;
        
        // Keep player within bounds
        player.x = Math.max(0, Math.min(player.x, canvas.width - player.width));
        player.y = Math.max(0, Math.min(player.y, canvas.height - player.height));
    }
    
    function draw() {
        // Clear canvas
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw player
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(player.x, player.y, player.width, player.height);
        
        // Draw UI
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.fillText('Level: ' + level + ' (' + config.difficulty + ')', 10, 20);
        ctx.fillText('Use arrow keys or touch to move', 10, 40);
    }
    
    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
    
    gameLoop();
}