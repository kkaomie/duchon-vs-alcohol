const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Simple game example - a moving square
let player = { x: canvas.width / 2, y: canvas.height / 2, width: 40, height: 40, speed: 5 };
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
}

function draw() {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.fillText('Use arrow keys or touch to move', 10, 20);
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();