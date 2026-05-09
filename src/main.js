import { InputManager } from './InputManager.js';
import { Camera } from './Camera.js';
import { Player } from './Player.js';
import { Enemy } from './Enemy.js';
import { Gem } from './Gem.js';
import { MapManager } from './MapManager.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let width, height;
function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

const MAP_SIZE = 2000;
const input = new InputManager();
const camera = new Camera(canvas);
const mapManager = new MapManager(MAP_SIZE);

let player;
let selectedCharacter = 'STAKAN';
let enemies = [];
let projectiles = [];
let mapGems = [];
let superZones = [];
let lastTime = performance.now();

let gameState = 'MENU'; // 'MENU', 'PLAYING', 'GAMEOVER'
let selectedMode = 'SHOWDOWN';
let activeMode = 'SHOWDOWN';
let score = 0;
let gemSpawnTimer = 0;
let gemCountdownTimer = 15;
let countdownActiveFor = null; // 'PLAYER' or 'ENEMY'

let totalGems = parseInt(localStorage.getItem('brawlGems') || '0');
let totalPP = parseInt(localStorage.getItem('brawlPowerPoints') || '0');
let playerLevel = parseInt(localStorage.getItem('brawlPlayerLevel') || '1');
let isBublykUnlocked = localStorage.getItem('isBublykUnlocked') === 'true';
let isSmaiUnlocked = localStorage.getItem('isSmaiUnlocked') === 'true';

// Poison gas variables for Showdown mode
let safeZoneRadius = MAP_SIZE;
const gasShrinkRate = 15; // pixels per second

// UI Elements
const mainMenu = document.getElementById('main-menu');
const uiLayer = document.getElementById('ui-layer');
const playBtn = document.getElementById('play-btn');
const shopMenu = document.getElementById('shop-menu');
const shopBtn = document.getElementById('shop-btn');
const shopBackBtn = document.getElementById('shop-back-btn');

const healthBar = document.getElementById('health-bar');
const ammoContainer = document.getElementById('ammo-container');
const scoreDisplay = document.getElementById('score');
const gameOverScreen = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');
const rankDisplay = document.getElementById('rank');
const menuGems = document.getElementById('menu-gems');
const shopGems = document.getElementById('shop-gems');
const menuPP = document.getElementById('menu-pp');
const shopPP = document.getElementById('shop-pp');
const menuLevel = document.getElementById('menu-level');
const shopLevel = document.getElementById('shop-level');
const upgradeCostSpan = document.getElementById('upgrade-cost');
const buyBoxBtn = document.getElementById('buy-box-btn');
const buyOmegaBoxBtn = document.getElementById('buy-omega-box-btn');
const buyUltraBoxBtn = document.getElementById('buy-ultra-box-btn');
const buyUpgradeBtn = document.getElementById('buy-upgrade-btn');
const resetBtn = document.getElementById('reset-btn');
const superBar = document.getElementById('super-bar');

const modeShowdownBtn = document.getElementById('mode-showdown');
const modeGemGrabBtn = document.getElementById('mode-gemgrab');
const gemGrabUi = document.getElementById('gem-grab-ui');
const playerGemScore = document.getElementById('player-gem-score');
const enemyGemScore = document.getElementById('enemy-gem-score');
const gemCountdown = document.getElementById('gem-countdown');

// Mobile UI
const mobileControls = document.getElementById('mobile-controls');
const mobileSuperBtn = document.getElementById('mobile-super-btn');

function getUpgradeCost(level) {
    return level * 20; // Level 1->2 costs 20, 2->3 costs 40, etc.
}

function updateUIState() {
    menuGems.innerText = totalGems;
    shopGems.innerText = totalGems;
    menuPP.innerText = totalPP;
    shopPP.innerText = totalPP;
    menuLevel.innerText = playerLevel;
    shopLevel.innerText = playerLevel;
    upgradeCostSpan.innerText = getUpgradeCost(playerLevel);
}

function initGame() {
  activeMode = selectedMode;
  player = new Player(MAP_SIZE / 2, MAP_SIZE / 2 + 300, selectedCharacter);
  enemies = [];
  projectiles = [];
  mapGems = [];
  superZones = [];
  score = 0;
  gameState = 'PLAYING';
  safeZoneRadius = MAP_SIZE * 0.8;
  gemSpawnTimer = 0;
  gemCountdownTimer = 15;
  countdownActiveFor = null;
  
  scoreDisplay.innerText = score;
  gameOverScreen.classList.add('hidden');
  
  if (activeMode === 'GEM_GRAB') {
      gemGrabUi.classList.remove('hidden');
      scoreDisplay.parentElement.classList.add('hidden'); // hide normal score
  } else {
      gemGrabUi.classList.add('hidden');
      scoreDisplay.parentElement.classList.remove('hidden');
  }

  mapManager.generateMap(activeMode);

  for (let i = 0; i < 5; i++) {
    spawnEnemy();
  }
}

function spawnEnemy() {
  let x, y, dist;
  do {
    x = Math.random() * MAP_SIZE;
    y = Math.random() * MAP_SIZE;
    dist = Math.hypot(x - player.x, y - player.y);
  } while (dist < 600);
  
  enemies.push(new Enemy(x, y));
}

function updateUI() {
  const hpPercent = Math.max(0, (player.health / player.maxHealth) * 100);
  healthBar.style.width = `${hpPercent}%`;
  const healthText = document.getElementById('health-text');
  if (healthText) {
    healthText.innerText = `${Math.ceil(player.health)} / ${player.maxHealth}`;
  }

  if (ammoContainer) {
    const slots = ammoContainer.children;
    for (let i = 0; i < slots.length; i++) {
      if (i < player.maxAmmo) {
        slots[i].style.display = 'block';
        if (i < player.ammo) {
          slots[i].classList.add('active');
        } else {
          slots[i].classList.remove('active');
        }
      } else {
        slots[i].style.display = 'none';
      }
    }
  }
  
  // Super Bar UI
  if (superBar) {
    const chargePercent = (player.superCharge / player.maxSuperCharge) * 100;
    superBar.style.width = chargePercent + '%';
    if (player.isSuperReady) {
      superBar.classList.add('ready');
      if (mobileSuperBtn) mobileSuperBtn.classList.add('ready');
    } else {
      superBar.classList.remove('ready');
      if (mobileSuperBtn) mobileSuperBtn.classList.remove('ready');
    }
  }
  
  if (activeMode === 'GEM_GRAB') {
      playerGemScore.innerText = player.gemCount;
      let highestEnemyGems = 0;
      for (const e of enemies) {
          if (e.gemCount > highestEnemyGems) highestEnemyGems = e.gemCount;
      }
      enemyGemScore.innerText = highestEnemyGems;
      
      if (countdownActiveFor) {
          gemCountdown.classList.remove('hidden');
          gemCountdown.innerText = Math.ceil(gemCountdownTimer);
      } else {
          gemCountdown.classList.add('hidden');
      }
  }
}

function updateSuperZones(dt) {
    for (let i = superZones.length - 1; i >= 0; i--) {
        const zone = superZones[i];
        zone.timer += dt;
        if (zone.timer >= zone.duration) {
            superZones.splice(i, 1);
            continue;
        }

        // Apply damage to enemies
        if (zone.owner === 'PLAYER') {
            for (const enemy of enemies) {
                if (!enemy.active) continue;
                const dist = Math.hypot(enemy.x - zone.x, enemy.y - zone.y);
                if (dist < zone.radius) {
                    let damage;
                    if (zone.damagePercentPerSec) {
                        damage = enemy.maxHealth * zone.damagePercentPerSec * dt;
                    } else {
                        damage = enemy.maxHealth * zone.damagePerSec * dt;
                    }
                    enemy.health -= damage;
                    if (enemy.health <= 0) {
                        enemy.active = false;
                        score++;
                        scoreDisplay.innerText = score;
                    }
                }
            }
        }

        if (zone.isSpeedZone && zone.owner === 'PLAYER') {
            const dist = Math.hypot(player.x - zone.x, player.y - zone.y);
            if (dist < zone.radius) {
                player.speedMultiplier = 2;
                player.speedBoostTimer = 6;
            }
        }

        if (zone.isCompanion && zone.type === 'ROBO_SPIDER') {
            // Follow player
            const dx = player.x - zone.x;
            const dy = player.y - zone.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 100) {
                const angle = Math.atan2(dy, dx);
                zone.x += Math.cos(angle) * 200 * dt; // speed 200
                zone.y += Math.sin(angle) * 200 * dt;
            }

            // Attack enemies
            zone.lastAttack += dt;
            if (zone.lastAttack >= zone.attackInterval) {
                let nearestEnemy = null;
                let minDist = zone.range;
                for (const e of enemies) {
                    if (!e.active) continue;
                    const d = Math.hypot(e.x - zone.x, e.y - zone.y);
                    if (d < minDist) {
                        minDist = d;
                        nearestEnemy = e;
                    }
                }

                if (nearestEnemy) {
                    zone.lastAttack = 0;
                    const angle = Math.atan2(nearestEnemy.y - zone.y, nearestEnemy.x - zone.x);
                    const proj = {
                        x: zone.x,
                        y: zone.y,
                        vx: Math.cos(angle) * 800,
                        vy: Math.sin(angle) * 800,
                        radius: 15,
                        damage: 0,
                        isPercentDamage: true,
                        percentAmount: 0.25,
                        color: '#00ffff',
                        active: true,
                        isPlayer: true,
                        distanceTraveled: 0,
                        maxDistance: 1000,
                        update: function(dt, mapManager) {
                            this.x += this.vx * dt;
                            this.y += this.vy * dt;
                            this.distanceTraveled += 800 * dt;
                            if (this.distanceTraveled > this.maxDistance) this.active = false;
                        },
                        draw: function(ctx) {
                            ctx.beginPath();
                            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                            ctx.fillStyle = this.color;
                            ctx.fill();
                        }
                    };
                    projectiles.push(proj);
                }
            }
        }
    }
}

function drawSuperZones(ctx) {
    for (const zone of superZones) {
        ctx.save();
        
        if (zone.isCompanion && zone.type === 'ROBO_SPIDER') {
            // Draw spider body
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(zone.x, zone.y, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Draw eyes
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.arc(zone.x - 8, zone.y - 5, 5, 0, Math.PI * 2);
            ctx.arc(zone.x + 8, zone.y - 5, 5, 0, Math.PI * 2);
            ctx.fill();

            // Draw legs (simple lines)
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 4;
            const time = performance.now() / 100;
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 + Math.sin(time + i) * 0.2;
                ctx.beginPath();
                ctx.moveTo(zone.x + Math.cos(angle) * 15, zone.y + Math.sin(angle) * 15);
                ctx.lineTo(zone.x + Math.cos(angle) * 40, zone.y + Math.sin(angle) * 40);
                ctx.stroke();
            }
        } else {
            ctx.beginPath();
            ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
            ctx.fillStyle = zone.color;
            ctx.fill();
            ctx.strokeStyle = zone.color.replace('0.3', '0.8');
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameState === 'PLAYING') {
        if (player.characterType === 'NESTOR') {
            const spiderCount = superZones.filter(z => z.isCompanion && z.type === 'ROBO_SPIDER').length;
            if (spiderCount >= 3) {
                // Remove oldest spider if limit reached
                const oldestSpiderIndex = superZones.findIndex(z => z.isCompanion && z.type === 'ROBO_SPIDER');
                if (oldestSpiderIndex !== -1) superZones.splice(oldestSpiderIndex, 1);
            }
        }
        player.useSuper(projectiles, superZones);
    }
});

function checkCollisions() {
  for (const proj of projectiles) {
    if (!proj.active) continue;

    if (!proj.isPlayer) {
      if (player.active) {
          const dist = Math.hypot(proj.x - player.x, proj.y - player.y);
          if (dist < player.radius + proj.radius) {
            player.health -= proj.damage;
            proj.active = false;
          }
      }
      
      // Check collision with companions (Robo-Spiders)
      for (let i = superZones.length - 1; i >= 0; i--) {
          const zone = superZones[i];
          if (zone.isCompanion && zone.type === 'ROBO_SPIDER') {
              const dist = Math.hypot(proj.x - zone.x, proj.y - zone.y);
              if (dist < 25 + proj.radius) { // spider radius is 25
                  zone.hits--;
                  proj.active = false;
                  if (zone.hits <= 0) {
                      superZones.splice(i, 1);
                  }
                  break;
              }
          }
      }
    } else {
      for (const enemy of enemies) {
        if (!enemy.active) continue;
        const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
        if (dist < enemy.radius + proj.radius) {
          if (proj.isPiercing) {
            if (proj.piercedTargets.has(enemy)) continue;
            proj.piercedTargets.add(enemy);
          }

          if (proj.isPercentDamage) {
            enemy.health -= enemy.maxHealth * proj.percentAmount;
          } else {
            enemy.health -= proj.damage;
          }
          player.chargeSuper(20); // 20% charge per hit (5 hits for super)
          
          if (proj.isPiercing) {
              // Don't deactivate piercing projectiles
          } else if (proj.canBounce && proj.bounces < 1) {
            proj.bounces++;
            // Find another enemy to bounce to
            let nearestEnemy = null;
            let minDist = 400; // bounce range
            for (const e of enemies) {
              if (e === enemy || !e.active) continue;
              const d = Math.hypot(proj.x - e.x, proj.y - e.y);
              if (d < minDist) {
                minDist = d;
                nearestEnemy = e;
              }
            }

            if (nearestEnemy) {
              const bounceAngle = Math.atan2(nearestEnemy.y - proj.y, nearestEnemy.x - proj.x);
              proj.vx = Math.cos(bounceAngle) * proj.speed;
              proj.vy = Math.sin(bounceAngle) * proj.speed;
              proj.distanceTraveled = 0; // reset distance for bounce
            } else {
              proj.active = false;
            }
          } else {
            proj.active = false;
          }
          
          if (enemy.health <= 0) {
            enemy.active = false;
            score++;
            scoreDisplay.innerText = score;
            if (activeMode === 'GEM_GRAB' && enemy.gemCount > 0) {
                dropGems(enemy.x, enemy.y, enemy.gemCount);
            }
          }
          break;
        }
      }
    }
  }
}

function update(dt) {
  if (gameState !== 'PLAYING') return;

  player.update(dt, input, camera, projectiles, mapManager);
  
  if (activeMode === 'SHOWDOWN') {
      safeZoneRadius -= gasShrinkRate * dt;
      if (safeZoneRadius < 100) safeZoneRadius = 100;

      const distFromCenter = Math.hypot(player.x - MAP_SIZE/2, player.y - MAP_SIZE/2);
      if (distFromCenter > safeZoneRadius) {
        player.health -= 50 * dt;
      }
  } else if (activeMode === 'GEM_GRAB') {
      gemSpawnTimer += dt;
      if (gemSpawnTimer >= 3) {
          gemSpawnTimer = 0;
          mapGems.push(new Gem(MAP_SIZE/2, MAP_SIZE/2));
      }
      
      for (const gem of mapGems) {
          gem.update(dt);
      }
  }

  for (const enemy of enemies) {
    enemy.update(dt, player, projectiles, activeMode, mapGems, mapManager);
    if (activeMode === 'SHOWDOWN') {
        const enemyDist = Math.hypot(enemy.x - MAP_SIZE/2, enemy.y - MAP_SIZE/2);
        if (enemyDist > safeZoneRadius) {
           enemy.health -= 50 * dt;
           if (enemy.health <= 0 && enemy.active) {
               enemy.active = false;
               if (enemy.gemCount > 0) dropGems(enemy.x, enemy.y, enemy.gemCount);
           }
        }
    }
  }

  for (const proj of projectiles) {
    proj.update(dt, mapManager);
  }

  checkCollisions();
  
  if (activeMode === 'GEM_GRAB') {
      checkGemPickups();
      updateCountdown(dt);
  }

  enemies = enemies.filter(e => e.active);
  projectiles = projectiles.filter(p => p.active);

  if (enemies.length < 5) {
      spawnEnemy();
  }

  camera.follow(player);
  updateUI();

  if (player.health <= 0 && player.active && gameState === 'PLAYING') {
    if (activeMode === 'GEM_GRAB') {
        if (player.gemCount > 0) {
            dropGems(player.x, player.y, player.gemCount);
            player.gemCount = 0;
        }
        player.active = false;
        player.respawnTimer = 3;
    } else {
        endGame("GAME OVER", score);
    }
  }
}

function endGame(title, scoreValue) {
    gameState = 'GAMEOVER';
    gameOverScreen.querySelector('h1').innerText = title;
    
    const statusText = gameOverScreen.querySelector('p');
    if (activeMode === 'SHOWDOWN') {
        statusText.innerHTML = `You Eliminated: <span id="rank">${scoreValue}</span> Bots`;
        totalGems += scoreValue;
    } else {
        statusText.innerText = title === "VICTORY!" ? `You secured the gems!` : `Bots took the gems!`;
        if (title === "VICTORY!") {
            totalGems += 10; // Reward for winning Gem Grab
        }
    }
    
    localStorage.setItem('brawlGems', totalGems.toString());
    updateUIState();

    gameOverScreen.classList.remove('hidden');
}

function checkGemPickups() {
    for (let i = mapGems.length - 1; i >= 0; i--) {
        const gem = mapGems[i];
        if (gem.lifeTime < 0.5) continue; // cannot pick up while popping out
        
        const distToPlayer = Math.hypot(player.x - gem.x, player.y - gem.y);
        if (distToPlayer < player.radius + gem.radius) {
            player.gemCount++;
            
            totalGems++;
            localStorage.setItem('brawlGems', totalGems.toString());
            updateUIState();

            mapGems.splice(i, 1);
            continue;
        }
        
        for (const enemy of enemies) {
            const distToEnemy = Math.hypot(enemy.x - gem.x, enemy.y - gem.y);
            if (distToEnemy < enemy.radius + gem.radius) {
                enemy.gemCount++;
                mapGems.splice(i, 1);
                break;
            }
        }
    }
}

function updateCountdown(dt) {
    let highestEnemyGems = 0;
    for (const e of enemies) {
        if (e.gemCount > highestEnemyGems) highestEnemyGems = e.gemCount;
    }
    
    if (player.gemCount >= 10 && highestEnemyGems < 10) {
        if (countdownActiveFor !== 'PLAYER') {
            countdownActiveFor = 'PLAYER';
            gemCountdownTimer = 15;
        }
    } else if (highestEnemyGems >= 10 && player.gemCount < 10) {
        if (countdownActiveFor !== 'ENEMY') {
            countdownActiveFor = 'ENEMY';
            gemCountdownTimer = 15;
        }
    } else if (player.gemCount >= 10 && highestEnemyGems >= 10) {
        // MATCH TIED, STOP COUNTDOWN
        countdownActiveFor = null;
    } else {
        countdownActiveFor = null;
    }
    
    if (countdownActiveFor) {
        gemCountdownTimer -= dt;
        if (gemCountdownTimer <= 0) {
            if (countdownActiveFor === 'PLAYER') {
                endGame("VICTORY!", score);
            } else {
                endGame("DEFEAT", score);
            }
        }
    }
}

function dropGems(x, y, count) {
    for (let i = 0; i < count; i++) {
        mapGems.push(new Gem(x, y));
    }
}

function drawMap() {
  ctx.fillStyle = '#222831';
  ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);

  ctx.strokeStyle = '#393E46';
  ctx.lineWidth = 2;
  const gridSize = 100;
  
  ctx.beginPath();
  for (let x = 0; x <= MAP_SIZE; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, MAP_SIZE);
  }
  for (let y = 0; y <= MAP_SIZE; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(MAP_SIZE, y);
  }
  ctx.stroke();

  if (activeMode === 'SHOWDOWN') {
      ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
      ctx.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
      
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(MAP_SIZE / 2, MAP_SIZE / 2, safeZoneRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      
      ctx.beginPath();
      ctx.arc(MAP_SIZE / 2, MAP_SIZE / 2, safeZoneRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#0f0';
      ctx.lineWidth = 4;
      ctx.stroke();
  } else if (activeMode === 'GEM_GRAB') {
      // Draw Mine
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(MAP_SIZE / 2, MAP_SIZE / 2, 80, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#a600ff';
      ctx.lineWidth = 6;
      ctx.stroke();
  }
  
  mapManager.draw(ctx);
}

function draw() {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  // If game hasn't started, don't draw entities
  if (gameState === 'MENU') {
      return;
  }

  ctx.save();
  camera.apply(ctx);

  drawMap();

  for (const gem of mapGems) {
      gem.draw(ctx);
  }

  for (const proj of projectiles) {
    proj.draw(ctx);
  }

  for (const enemy of enemies) {
    enemy.draw(ctx);
  }

  drawSuperZones(ctx);
  player.draw(ctx);

  ctx.restore();
}

function loop(time) {
  const dt = (time - lastTime) / 1000;
  lastTime = time;

  if (dt < 0.1) {
    update(dt);
    updateSuperZones(dt);
    checkCollisions();
    draw();
  }

  requestAnimationFrame(loop);
}

modeShowdownBtn.addEventListener('click', () => {
    selectedMode = 'SHOWDOWN';
    modeShowdownBtn.classList.add('active');
    modeGemGrabBtn.classList.remove('active');
});

modeGemGrabBtn.addEventListener('click', () => {
    selectedMode = 'GEM_GRAB';
    modeGemGrabBtn.classList.add('active');
    modeShowdownBtn.classList.remove('active');
});

function updateCharacterCards() {
    charCards.forEach(card => {
        const char = card.dataset.char;
        if (char === 'BUBLYK' || char === 'SMAI') {
            const unlocked = char === 'BUBLYK' ? isBublykUnlocked : isSmaiUnlocked;
            if (unlocked) {
                card.classList.remove('locked');
                card.querySelector('span').innerText = char.charAt(0) + char.slice(1).toLowerCase();
            } else {
                card.classList.add('locked');
                card.querySelector('span').innerText = 'LOCKED';
            }
        }
    });
}

const charCards = document.querySelectorAll('.char-card');
charCards.forEach(card => {
    card.addEventListener('click', () => {
        const char = card.dataset.char;
        if (char === 'BUBLYK' && !isBublykUnlocked) {
            alert('This brawler is locked! Open boxes to find him.');
            return;
        }
        if (char === 'SMAI' && !isSmaiUnlocked) {
            alert('This brawler is locked! Open boxes to find him.');
            return;
        }
        // STAKAN and MAXIM are free
        charCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedCharacter = char;
    });
});

updateCharacterCards();

playBtn.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    uiLayer.classList.remove('hidden');
    if (input.isMobile) {
        mobileControls.classList.remove('hidden');
    }
    initGame();
    lastTime = performance.now();
});

shopBtn.addEventListener('click', () => {
    mainMenu.classList.add('hidden');
    shopMenu.classList.remove('hidden');
});

shopBackBtn.addEventListener('click', () => {
    shopMenu.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

buyBoxBtn.addEventListener('click', () => {
    if (totalGems >= 80) {
        totalGems -= 80;
        
        // Random rewards
        const ppReward = Math.floor(Math.random() * 31) + 20; // 20 to 50 PP
        const gemReward = Math.floor(Math.random() * 16); // 0 to 15 Gems back
        
        totalPP += ppReward;
        totalGems += gemReward;
        
        let unlockMessage = "";
        if (!isBublykUnlocked || !isSmaiUnlocked) {
            const chance = Math.random() * 100;
            if (!isBublykUnlocked && chance <= 0.33) {
                isBublykUnlocked = true;
                localStorage.setItem('isBublykUnlocked', 'true');
                unlockMessage = "\n\n🎉 NEW BRAWLER UNLOCKED: BUBLYK!";
                updateCharacterCards();
            } else if (!isSmaiUnlocked && chance <= 0.0001) {
                isSmaiUnlocked = true;
                localStorage.setItem('isSmaiUnlocked', 'true');
                unlockMessage = "\n\n🔥 LEGENDARY! YOU UNLOCKED SMAI!";
                updateCharacterCards();
            }
        }
        
        localStorage.setItem('brawlGems', totalGems.toString());
        localStorage.setItem('brawlPowerPoints', totalPP.toString());
        
        updateUIState();
        alert(`You opened a Mega Box!\nRewards:\n- ${ppReward} Power Points\n- ${gemReward} Gems${unlockMessage}`);
    } else {
        alert('Not enough Gems! Play the game to earn more.');
    }
});

buyOmegaBoxBtn.addEventListener('click', () => {
    if (totalGems >= 200) {
        totalGems -= 200;
        
        // Random rewards for Omega Box: 100 to 275 PP
        const ppReward = Math.floor(Math.random() * 176) + 100; 
        const gemReward = Math.floor(Math.random() * 31) + 10; // 10 to 40 Gems back
        
        totalPP += ppReward;
        totalGems += gemReward;

        let unlockMessage = "";
        if (!isBublykUnlocked || !isSmaiUnlocked) {
            const chance = Math.random() * 100;
            if (!isBublykUnlocked && chance <= 5.52) {
                isBublykUnlocked = true;
                localStorage.setItem('isBublykUnlocked', 'true');
                unlockMessage = "\n\n🌈 UNBELIEVABLE! YOU UNLOCKED BUBLYK!";
                updateCharacterCards();
            } else if (!isSmaiUnlocked && chance <= 0.9) {
                isSmaiUnlocked = true;
                localStorage.setItem('isSmaiUnlocked', 'true');
                unlockMessage = "\n\n🌟 SPECTACULAR! YOU UNLOCKED SMAI!";
                updateCharacterCards();
            }
        }
        
        localStorage.setItem('brawlGems', totalGems.toString());
        localStorage.setItem('brawlPowerPoints', totalPP.toString());
        
        updateUIState();
        alert(`You opened an OMEGA BOX!\nRewards:\n- ${ppReward} Power Points\n- ${gemReward} Gems${unlockMessage}`);
    } else {
        alert('Not enough Gems! Play the game to earn more.');
    }
});

buyUltraBoxBtn.addEventListener('click', () => {
    if (totalGems >= 1000) {
        totalGems -= 1000;
        
        // Random rewards for Ultra Mega Box: 1000 to 1500 PP
        const ppReward = Math.floor(Math.random() * 501) + 1000; 
        const gemReward = Math.floor(Math.random() * 178) + 100; // 100 to 277 Gems back
        
        totalPP += ppReward;
        totalGems += gemReward;

        let unlockMessage = "";
        let brawlersUnlocked = [];
        
        if (!isBublykUnlocked || !isSmaiUnlocked) {
            const bublykChance = Math.random() * 100;
            const smaiChance = Math.random() * 100;
            
            if (!isBublykUnlocked && bublykChance <= 15) {
                isBublykUnlocked = true;
                localStorage.setItem('isBublykUnlocked', 'true');
                brawlersUnlocked.push("BUBLYK");
            }
            if (!isSmaiUnlocked && smaiChance <= 5) {
                isSmaiUnlocked = true;
                localStorage.setItem('isSmaiUnlocked', 'true');
                brawlersUnlocked.push("SMAI");
            }
            
            if (brawlersUnlocked.length > 0) {
                unlockMessage = `\n\n🌌 COSMIC LUCK! YOU UNLOCKED: ${brawlersUnlocked.join(", ")}!`;
                updateCharacterCards();
            }
        }
        
        localStorage.setItem('brawlGems', totalGems.toString());
        localStorage.setItem('brawlPowerPoints', totalPP.toString());
        
        updateUIState();
        alert(`You opened an ULTRA MEGA BOX!\nRewards:\n- ${ppReward} Power Points\n- ${gemReward} Gems${unlockMessage}`);
    } else {
        alert('Not enough Gems! You need 1000 gems for this cosmic box.');
    }
});

buyUpgradeBtn.addEventListener('click', () => {
    const cost = getUpgradeCost(playerLevel);
    if (totalPP >= cost) {
        totalPP -= cost;
        playerLevel++;
        
        localStorage.setItem('brawlPowerPoints', totalPP.toString());
        localStorage.setItem('brawlPlayerLevel', playerLevel.toString());
        
        updateUIState();
        alert(`Upgraded to Level ${playerLevel}! Stats increased by 10%.`);
    } else {
        alert('Not enough Power Points! Open Mega Boxes to get more.');
    }
});

restartBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    initGame();
    lastTime = performance.now();
});

menuBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    uiLayer.classList.add('hidden');
    mobileControls.classList.add('hidden');
    mainMenu.classList.remove('hidden');
    gameState = 'MENU';
});

resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all your progress? This cannot be undone!')) {
        localStorage.removeItem('brawlGems');
        localStorage.removeItem('brawlPowerPoints');
        localStorage.removeItem('brawlPlayerLevel');
        localStorage.removeItem('isBublykUnlocked');
        localStorage.removeItem('isSmaiUnlocked');
        
        totalGems = 0;
        totalPP = 0;
        playerLevel = 1;
        isBublykUnlocked = false;
        isSmaiUnlocked = false;
        selectedCharacter = 'STAKAN';
        
        // Reset visual state
        charCards.forEach(c => c.classList.remove('active'));
        const stakanCard = document.getElementById('char-stakan');
        if (stakanCard) stakanCard.classList.add('active');
        
        updateCharacterCards();
        updateUIState();
        alert('Progress has been reset!');
        location.reload(); // Reload to ensure everything is fresh
    }
});

document.getElementById('admin-trigger').addEventListener('click', () => {
    totalGems += 200;
    localStorage.setItem('brawlGems', totalGems.toString());
    updateUIState();
});

if (mobileSuperBtn) {
    mobileSuperBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameState === 'PLAYING') {
            if (player.characterType === 'NESTOR') {
                const spiderCount = superZones.filter(z => z.isCompanion && z.type === 'ROBO_SPIDER').length;
                if (spiderCount >= 3) {
                    const oldestSpiderIndex = superZones.findIndex(z => z.isCompanion && z.type === 'ROBO_SPIDER');
                    if (oldestSpiderIndex !== -1) superZones.splice(oldestSpiderIndex, 1);
                }
            }
            player.useSuper(projectiles, superZones);
        }
    });
}

updateUIState();
requestAnimationFrame(loop);
