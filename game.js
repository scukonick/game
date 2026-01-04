const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const gameOverElement = document.getElementById('gameOver');
const cooldownFill = document.getElementById('cooldownFill');
const cooldownText = document.getElementById('cooldownText');
const activePowerupsElement = document.getElementById('activePowerups');
const destroyedElement = document.getElementById('destroyed');
const dodgedElement = document.getElementById('dodged');

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch(type) {
        case 'shoot':
            oscillator.frequency.value = 300;
            oscillator.type = 'square';
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'hit':
            oscillator.frequency.value = 150;
            oscillator.type = 'sawtooth';
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
            break;
        case 'destroy':
            oscillator.frequency.value = 100;
            oscillator.type = 'sawtooth';
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.25);
            break;
        case 'bonus':
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            const freq2 = audioContext.createOscillator();
            freq2.frequency.value = 1000;
            freq2.type = 'sine';
            freq2.connect(gainNode);
            oscillator.start(audioContext.currentTime);
            freq2.start(audioContext.currentTime + 0.05);
            oscillator.stop(audioContext.currentTime + 0.2);
            freq2.stop(audioContext.currentTime + 0.2);
            break;
        case 'powerup':
            oscillator.frequency.value = 600;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.3);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
            break;
        case 'gameOver':
            oscillator.frequency.value = 400;
            oscillator.type = 'sawtooth';
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.5);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
            break;
    }
}

let gameRunning = false;
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
highScoreElement.textContent = highScore;

let destroyed = 0;
let dodged = 0;
let activePowerups = [];

const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 80,
    width: 50,
    height: 50,
    speed: 6,
    dx: 0,
    color: '#00ff88'
};

const obstacles = [];
let obstacleSpeed = 3;
let obstacleSpawnRate = 70;
let frameCount = 0;

const bullets = [];
const bonuses = [];
let bulletSpeed = 8;
let shootCooldown = 0;
let shootCooldownMax = 40;
let bonusSpawnRate = 200;

const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    a: false,
    d: false,
    ' ': false
};

document.addEventListener('keydown', (e) => {
    if (e.key in keys) {
        keys[e.key] = true;
    }
    if (!gameRunning && (e.key === ' ' || e.key === 'Enter')) {
        restartGame();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key in keys) {
        keys[e.key] = false;
    }
});

function createObstacle() {
    const width = 40 + Math.random() * 40;
    const x = Math.random() * (canvas.width - width);
    const armored = Math.random() < 0.4;
    obstacles.push({
        x: x,
        y: -50,
        width: width,
        height: 40,
        color: armored ? '#666' : `hsl(${Math.random() * 360}, 70%, 60%)`,
        armored: armored,
        health: armored ? 3 : 1,
        maxHealth: armored ? 3 : 1
    });
}

function createBonus() {
    const types = [
        { type: 'score', color: '#ffdd00', symbol: '★' },
        { type: 'rapid', color: '#ff6b9d', symbol: '⚡' },
        { type: 'multi', color: '#00ddff', symbol: '◆' },
        { type: 'slow', color: '#9d4eff', symbol: '⏱' }
    ];
    const bonusType = types[Math.floor(Math.random() * types.length)];
    const x = Math.random() * (canvas.width - 30);
    bonuses.push({
        x: x,
        y: -30,
        width: 30,
        height: 30,
        ...bonusType
    });
}

function shoot() {
    if (shootCooldown <= 0) {
        bullets.push({
            x: player.x + player.width / 2 - 3,
            y: player.y,
            width: 6,
            height: 15,
            color: '#ffff00'
        });
        shootCooldown = shootCooldownMax;
        playSound('shoot');
    }
}

function updatePlayer() {
    player.dx = 0;

    if (keys.ArrowLeft || keys.a) {
        player.dx = -player.speed;
    }
    if (keys.ArrowRight || keys.d) {
        player.dx = player.speed;
    }

    if (keys[' ']) {
        shoot();
    }

    player.x += player.dx;

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
    }

    if (shootCooldown > 0) shootCooldown--;
}

function updateObstacles() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].y += obstacleSpeed;

        if (obstacles[i].y > canvas.height) {
            obstacles.splice(i, 1);
            score++;
            dodged++;
            scoreElement.textContent = score;
            dodgedElement.textContent = dodged;

            if (score % 10 === 0) {
                obstacleSpeed += 0.5;
                obstacleSpawnRate = Math.max(30, obstacleSpawnRate - 5);
            }
        }
    }
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bulletSpeed;

        if (bullets[i].y < -20) {
            bullets.splice(i, 1);
        }
    }
}

function updateBonuses() {
    for (let i = bonuses.length - 1; i >= 0; i--) {
        bonuses[i].y += 2;

        if (bonuses[i].y > canvas.height) {
            bonuses.splice(i, 1);
        }
    }
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.fillStyle = '#001a33';
    ctx.fillRect(player.x + 15, player.y + 15, 8, 8);
    ctx.fillRect(player.x + 27, player.y + 15, 8, 8);
}

function drawObstacles() {
    obstacles.forEach(obs => {
        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        if (obs.armored) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

            if (obs.health === 3) {
                ctx.strokeRect(obs.x + 4, obs.y + 4, obs.width - 8, obs.height - 8);
            } else if (obs.health === 2) {
                ctx.strokeStyle = '#ff9900';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(obs.x + obs.width * 0.3, obs.y);
                ctx.lineTo(obs.x + obs.width * 0.2, obs.y + obs.height);
                ctx.stroke();
            } else if (obs.health === 1) {
                ctx.strokeStyle = '#ff3300';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(obs.x + obs.width * 0.3, obs.y);
                ctx.lineTo(obs.x + obs.width * 0.2, obs.y + obs.height);
                ctx.moveTo(obs.x + obs.width * 0.7, obs.y);
                ctx.lineTo(obs.x + obs.width * 0.8, obs.y + obs.height);
                ctx.stroke();
            }

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(obs.health, obs.x + obs.width / 2, obs.y + obs.height / 2 + 5);
        }
    });
}

function drawBullets() {
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

function drawBonuses() {
    bonuses.forEach(bonus => {
        ctx.fillStyle = bonus.color;
        ctx.fillRect(bonus.x, bonus.y, bonus.width, bonus.height);

        ctx.fillStyle = '#000';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(bonus.symbol, bonus.x + bonus.width / 2, bonus.y + bonus.height / 2 + 7);
    });
}

function updateUI() {
    const cooldownPercent = Math.max(0, (shootCooldownMax - shootCooldown) / shootCooldownMax * 100);
    cooldownFill.style.width = cooldownPercent + '%';

    if (shootCooldown === 0) {
        cooldownText.textContent = 'READY';
    } else {
        cooldownText.textContent = Math.ceil(shootCooldown / 60) + 's';
    }

    if (activePowerups.length === 0) {
        activePowerupsElement.innerHTML = '<div class="no-powerups">None</div>';
    } else {
        const now = Date.now();
        activePowerupsElement.innerHTML = activePowerups.map(p => {
            const remaining = Math.ceil((p.endTime - now) / 1000);
            const percentRemaining = Math.max(0, Math.min(100, ((p.endTime - now) / 5000) * 100));
            let className = 'powerup-rapid';
            if (p.type === 'multi') className = 'powerup-multi';
            if (p.type === 'slow') className = 'powerup-slow';

            return `<div class="powerup-item ${className}">
                <div class="powerup-header">
                    <span class="powerup-name">${p.name}</span>
                    <span class="powerup-timer">${remaining}s</span>
                </div>
                <div class="powerup-bar">
                    <div class="powerup-bar-fill" style="width: ${percentRemaining}%"></div>
                </div>
            </div>`;
        }).join('');
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawPlayer();
    drawObstacles();
    drawBullets();
    drawBonuses();
}

function gameOver() {
    gameRunning = false;
    gameOverElement.style.display = 'block';
    playSound('gameOver');

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        highScoreElement.textContent = highScore;
    }
}

function update() {
    if (!gameRunning) return;

    updatePlayer();
    updateObstacles();
    updateBullets();
    updateBonuses();

    for (let obs of obstacles) {
        if (checkCollision(player, obs)) {
            gameOver();
            return;
        }
    }

    const hitBullets = new Set();
    const obstacleHits = new Map();

    for (let i = 0; i < bullets.length; i++) {
        for (let j = 0; j < obstacles.length; j++) {
            if (!hitBullets.has(i) && checkCollision(bullets[i], obstacles[j])) {
                hitBullets.add(i);
                obstacleHits.set(j, (obstacleHits.get(j) || 0) + 1);
                break;
            }
        }
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        if (hitBullets.has(i)) {
            bullets.splice(i, 1);
        }
    }

    for (let j = obstacles.length - 1; j >= 0; j--) {
        if (obstacleHits.has(j)) {
            const damage = obstacleHits.get(j);
            obstacles[j].health -= damage;

            if (obstacles[j].health <= 0) {
                obstacles.splice(j, 1);
                score += 5;
                destroyed++;
                scoreElement.textContent = score;
                destroyedElement.textContent = destroyed;
                playSound('destroy');
            } else {
                playSound('hit');
            }
        }
    }

    for (let i = bonuses.length - 1; i >= 0; i--) {
        if (checkCollision(player, bonuses[i])) {
            const bonus = bonuses[i];
            bonuses.splice(i, 1);

            if (bonus.type === 'score') {
                score += 20;
                scoreElement.textContent = score;
                playSound('bonus');
            } else if (bonus.type === 'rapid') {
                const oldCooldown = shootCooldownMax;
                shootCooldownMax = 20;
                const endTime = Date.now() + 5000;
                activePowerups.push({ name: 'Rapid Fire', endTime: endTime, type: 'rapid' });
                playSound('powerup');
                setTimeout(() => {
                    shootCooldownMax = oldCooldown;
                    activePowerups = activePowerups.filter(p => p.type !== 'rapid');
                }, 5000);
            } else if (bonus.type === 'multi') {
                const oldShoot = shoot;
                const endTime = Date.now() + 5000;
                activePowerups.push({ name: 'Triple Shot', endTime: endTime, type: 'multi' });
                playSound('powerup');
                window.shoot = function() {
                    if (shootCooldown <= 0) {
                        bullets.push(
                            { x: player.x + player.width / 2 - 3, y: player.y, width: 6, height: 15, color: '#ffff00' },
                            { x: player.x + player.width / 2 - 15, y: player.y, width: 6, height: 15, color: '#ffff00' },
                            { x: player.x + player.width / 2 + 9, y: player.y, width: 6, height: 15, color: '#ffff00' }
                        );
                        shootCooldown = shootCooldownMax;
                    }
                };
                setTimeout(() => {
                    window.shoot = oldShoot;
                    activePowerups = activePowerups.filter(p => p.type !== 'multi');
                }, 5000);
            } else if (bonus.type === 'slow') {
                const oldSpeed = obstacleSpeed;
                obstacleSpeed = Math.max(1, obstacleSpeed * 0.5);
                const endTime = Date.now() + 5000;
                activePowerups.push({ name: 'Slow Motion', endTime: endTime, type: 'slow' });
                playSound('powerup');
                setTimeout(() => {
                    obstacleSpeed = oldSpeed;
                    activePowerups = activePowerups.filter(p => p.type !== 'slow');
                }, 5000);
            }
        }
    }

    frameCount++;
    if (frameCount % obstacleSpawnRate === 0) {
        createObstacle();
    }
    if (frameCount % bonusSpawnRate === 0) {
        createBonus();
    }

    updateUI();
    draw();
    requestAnimationFrame(update);
}

function restartGame() {
    gameRunning = true;
    score = 0;
    frameCount = 0;
    obstacleSpeed = 3;
    obstacleSpawnRate = 70;
    shootCooldownMax = 40;
    destroyed = 0;
    dodged = 0;
    activePowerups = [];
    obstacles.length = 0;
    bullets.length = 0;
    bonuses.length = 0;
    player.x = canvas.width / 2 - 25;
    scoreElement.textContent = score;
    destroyedElement.textContent = destroyed;
    dodgedElement.textContent = dodged;
    gameOverElement.style.display = 'none';

    update();
}

restartGame();
