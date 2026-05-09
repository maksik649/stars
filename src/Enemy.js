import { Projectile } from './Projectile.js';

export class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 30;
    
    // Choose enemy type
    const types = ['COLT', 'EL_PRIMO', 'SHELLY'];
    this.type = types[Math.floor(Math.random() * types.length)];
    
    this.setupStats();
    
    this.health = this.maxHealth;
    this.active = true;
    this.gemCount = 0;
    
    this.fireTimer = Math.random() * this.fireRate;
    
    // Burst attack state
    this.isBursting = false;
    this.burstCount = 0;
    this.burstMax = 0;
    this.burstInterval = 0;
    this.burstTimer = 0;

    this.image = new Image();
    this.setImage();
    this.angle = 0;
    
    this.isVisible = true;
    this.aiState = 'WANDER';
    this.aiTimer = 1 + Math.random();
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.inBush = false;
  }

  setupStats() {
    switch(this.type) {
        case 'COLT':
            this.speed = 120;
            this.maxHealth = 600;
            this.fireRate = 3.0; // Longer pause between bursts
            this.range = 550;
            this.damage = 80;
            this.burstMax = 6;
            this.burstInterval = 0.12; // Slightly slower burst to see bullets
            break;
        case 'EL_PRIMO':
            this.speed = 160;
            this.maxHealth = 1300;
            this.fireRate = 1.2;
            this.range = 150;
            this.damage = 200;
            this.burstMax = 4; // Multi-punch
            this.burstInterval = 0.08;
            break;
        case 'SHELLY':
            this.speed = 100;
            this.maxHealth = 800;
            this.fireRate = 1.8;
            this.range = 350;
            this.damage = 150;
            this.burstMax = 1; // Single blast
            this.burstInterval = 0;
            break;
    }
  }

  setImage() {
      switch(this.type) {
          case 'COLT': this.image.src = './public/assets/colt.png'; break;
          case 'EL_PRIMO': this.image.src = './public/assets/el_primo.png'; break;
          case 'SHELLY': this.image.src = './public/assets/shelly.png'; break;
          default: this.image.src = './public/assets/enemy.png';
      }
  }

  update(dt, player, projectiles, activeMode, mapGems, mapManager) {
    if (!this.active) return;

    if (player.active) {
        this.angle = Math.atan2(player.y - this.y, player.x - this.x);
    }

    let targetX = player.active ? player.x : 1000;
    let targetY = player.active ? player.y : 1000;
    let targetDist = player.active ? Math.hypot(this.x - player.x, this.y - player.y) : Infinity;

    // Movement logic
    if (activeMode === 'GEM_GRAB') {
        if (this.gemCount < 10) {
            let closestGem = null;
            let minGemDist = Infinity;
            if (mapGems) {
                for (const gem of mapGems) {
                    const d = Math.hypot(this.x - gem.x, this.y - gem.y);
                    if (d < minGemDist) {
                        minGemDist = d;
                        closestGem = gem;
                    }
                }
            }
            if (closestGem && minGemDist < targetDist) {
                targetX = closestGem.x;
                targetY = closestGem.y;
                targetDist = minGemDist;
            }
        } else {
            targetX = this.x + (this.x - player.x);
            targetY = this.y + (this.y - player.y);
            targetDist = Math.hypot(this.x - targetX, this.y - targetY);
        }
    }

    let dx = 0;
    let dy = 0;

    // Different AI behavior based on type
    let desiredDist = this.range * 0.7;
    if (this.type === 'EL_PRIMO') desiredDist = 40;

    if (targetDist > desiredDist) {
        const moveAngle = Math.atan2(targetY - this.y, targetX - this.x);
        dx = Math.cos(moveAngle);
        dy = Math.sin(moveAngle);
    } else if (targetDist < desiredDist * 0.5 && this.type !== 'EL_PRIMO') {
        const moveAngle = Math.atan2(targetY - this.y, targetX - this.x);
        dx = -Math.cos(moveAngle);
        dy = -Math.sin(moveAngle);
    }

    if (dx !== 0 || dy !== 0) {
        const nextX = this.x + dx * this.speed * dt;
        const nextY = this.y + dy * this.speed * dt;

        if (mapManager) {
            const collisionX = mapManager.checkCollision(nextX, this.y, this.radius);
            if (!collisionX.collided) this.x = nextX;
            const collisionY = mapManager.checkCollision(this.x, nextY, this.radius);
            if (!collisionY.collided) this.y = nextY;
        } else {
            this.x = nextX;
            this.y = nextY;
        }
    }

    this.x = Math.max(this.radius, Math.min(2000 - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(2000 - this.radius, this.y));

    this.aiTimer -= dt;
    this.strafeTimer -= dt;
    if (this.strafeTimer <= 0) {
        this.strafeTimer = 1 + Math.random();
        this.strafeDir *= -1;
    }

    const distToPlayer = player.active ? Math.hypot(this.x - player.x, this.y - player.y) : Infinity;
    const playerInBush = mapManager && mapManager.isInBush(player.x, player.y);
    const canSeePlayer = player.active && (!playerInBush || distToPlayer < 250 || player.lastFireTimer > 0);

    if (canSeePlayer) {
        this.angle = Math.atan2(player.y - this.y, player.x - this.x);
    }

    // Gem Grab Priority
    let targetGem = null;
    if (activeMode === 'GEM_GRAB' && this.gemCount < 10) {
        let minGemDist = Infinity;
        if (mapGems) {
            for (const gem of mapGems) {
                const d = Math.hypot(this.x - gem.x, this.y - gem.y);
                if (d < minGemDist) {
                    minGemDist = d;
                    targetGem = gem;
                }
            }
        }
    }

    // State Transitions
    if (this.health < this.maxHealth * 0.35 && this.aiState !== 'RETREAT') {
        this.aiState = 'RETREAT';
        this.aiTimer = 5;
    } else if (targetGem && this.aiState !== 'RETREAT') {
        this.aiState = 'GET_GEMS';
    } else if (canSeePlayer) {
        if (this.aiState === 'AMBUSH') {
            if (distToPlayer < this.range * 0.9) this.aiState = 'ATTACK';
        } else if (this.aiState !== 'RETREAT') {
            this.aiState = 'ATTACK';
        }
    } else if (this.aiState === 'ATTACK' || this.aiState === 'GET_GEMS') {
        this.aiState = 'WANDER';
        this.aiTimer = 2;
    } else if (this.aiState === 'AMBUSH' && this.aiTimer <= 0) {
        this.aiState = 'WANDER';
        this.aiTimer = 2;
    }

    // AI Actions based on state
    let ax = 0, ay = 0;
    if (this.aiState === 'GET_GEMS' && targetGem) {
        const angle = Math.atan2(targetGem.y - this.y, targetGem.x - this.x);
        ax = Math.cos(angle);
        ay = Math.sin(angle);
    } else if (this.aiState === 'RETREAT') {
        // Move towards nearest bush
        let nearestBush = null;
        let minBDist = Infinity;
        if (mapManager) {
            for (const b of mapManager.bushes) {
                const d = Math.hypot(this.x - (b.x + b.w/2), this.y - (b.y + b.h/2));
                if (d < minBDist) {
                    minBDist = d;
                    nearestBush = b;
                }
            }
        }
        if (nearestBush) {
            const angle = Math.atan2((nearestBush.y + nearestBush.h/2) - this.y, (nearestBush.x + nearestBush.w/2) - this.x);
            ax = Math.cos(angle);
            ay = Math.sin(angle);
        } else {
            const angle = Math.atan2(this.y - player.y, this.x - player.x);
            ax = Math.cos(angle);
            ay = Math.sin(angle);
        }
        if (this.health > this.maxHealth * 0.8 || this.aiTimer <= 0) this.aiState = 'WANDER';
    } else if (this.aiState === 'ATTACK') {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        if (distToPlayer > this.range * 0.7) {
            ax = Math.cos(angle);
            ay = Math.sin(angle);
        } else if (distToPlayer < this.range * 0.4 && this.type !== 'EL_PRIMO') {
            ax = -Math.cos(angle);
            ay = -Math.sin(angle);
        }
        const strafeAngle = angle + (Math.PI / 2) * this.strafeDir;
        ax += Math.cos(strafeAngle) * 0.8;
        ay += Math.sin(strafeAngle) * 0.8;
    } else if (this.aiState === 'WANDER') {
        if (this.aiTimer <= 0) {
            this.wanderAngle = Math.random() * Math.PI * 2;
            this.aiTimer = 1 + Math.random() * 2;
            if (Math.random() < 0.2) {
                this.aiState = 'AMBUSH';
                this.aiTimer = 8 + Math.random() * 5;
            }
        }
        ax = Math.cos(this.wanderAngle);
        ay = Math.sin(this.wanderAngle);
    } else if (this.aiState === 'AMBUSH') {
        if (!mapManager || !mapManager.isInBush(this.x, this.y)) {
            let nearestBush = null;
            let minBDist = Infinity;
            if (mapManager) {
                for (const b of mapManager.bushes) {
                    const d = Math.hypot(this.x - (b.x + b.w/2), this.y - (b.y + b.h/2));
                    if (d < minBDist) {
                        minBDist = d;
                        nearestBush = b;
                    }
                }
            }
            if (nearestBush) {
                const angle = Math.atan2((nearestBush.y + nearestBush.h/2) - this.y, (nearestBush.x + nearestBush.w/2) - this.x);
                ax = Math.cos(angle);
                ay = Math.sin(angle);
            }
        }
    }

    if (ax !== 0 || ay !== 0) {
        const mag = Math.hypot(ax, ay);
        if (mag > 0.01) {
            const nax = ax / mag;
            const nay = ay / mag;
            const nextX = this.x + nax * this.speed * dt;
            const nextY = this.y + nay * this.speed * dt;

            if (mapManager) {
                const collisionX = mapManager.checkCollision(nextX, this.y, this.radius);
                if (!collisionX.collided) this.x = nextX;
                const collisionY = mapManager.checkCollision(this.x, nextY, this.radius);
                if (!collisionY.collided) this.y = nextY;
                if (collisionX.collided && collisionY.collided && this.aiState === 'ATTACK') {
                    this.strafeDir *= -1;
                }
            } else {
                this.x = nextX;
                this.y = nextY;
            }
        }
    }

    // Final Clamping
    this.x = Math.max(this.radius, Math.min(2000 - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(2000 - this.radius, this.y));

    // Attack timers
    if (this.fireTimer > 0) this.fireTimer -= dt;
    
    // Handle burst firing
    if (this.isBursting) {
        this.burstTimer -= dt;
        if (this.burstTimer <= 0) {
            this.performBurstShot(projectiles);
            this.burstTimer = this.burstInterval;
            this.burstCount++;
            if (this.burstCount >= this.burstMax) {
                this.isBursting = false;
            }
        }
    } else if (canSeePlayer) {
        if (distToPlayer < this.range && this.fireTimer <= 0) {
            this.startBurst();
        }
    }
    
    this.inBush = mapManager ? mapManager.isInBush(this.x, this.y) : false;
    
    // Determine visibility for the player
    const sharedBushVision = playerInBush && this.inBush && distToPlayer < 400;
    this.isVisible = !this.inBush || distToPlayer < 250 || this.isBursting || sharedBushVision;
  }

  startBurst() {
      this.isBursting = true;
      this.burstCount = 0;
      this.burstTimer = 0;
      this.fireTimer = this.fireRate;
  }

  performBurstShot(projectiles) {
    if (this.type === 'COLT') {
        const spread = 0.05;
        const angle = this.angle + (Math.random() - 0.5) * spread;
        projectiles.push(new Projectile(this.x, this.y, angle, 900, this.damage, false, '#ff4b2b', 10));
    } else if (this.type === 'SHELLY') {
        const numPellets = 5;
        const spread = 0.5;
        for (let i = 0; i < numPellets; i++) {
            const angle = this.angle + (i - (numPellets - 1) / 2) * (spread / numPellets);
            projectiles.push(new Projectile(this.x, this.y, angle, 750, this.damage, false, '#ff4b2b', 8));
        }
    } else if (this.type === 'EL_PRIMO') {
        const angle = this.angle + (Math.random() - 0.5) * 0.3;
        const p = new Projectile(this.x, this.y, angle, 1100, this.damage, false, '#ffaa00', 15);
        p.maxDistance = 200;
        projectiles.push(p);
    }
  }

  draw(ctx) {
    if (!this.active || !this.isVisible) return;

    ctx.save();
    if (this.inBush) ctx.globalAlpha = 0.5;
    
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    
    if (this.image.complete && this.image.naturalWidth !== 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 5, this.radius, this.radius, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.image, -this.radius, -this.radius, this.radius * 2, this.radius * 2);
      
      ctx.beginPath();
      ctx.moveTo(this.radius, 0);
      ctx.lineTo(this.radius + 15, 0);
      ctx.strokeStyle = this.type === 'EL_PRIMO' ? '#fa0' : '#f00';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.type === 'EL_PRIMO' ? '#fa0' : '#f00';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
    ctx.restore();

    const hpPercentage = Math.max(0, this.health / this.maxHealth);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(this.x - 25, this.y - 45, 50, 8);
    ctx.fillStyle = '#ff4b2b';
    ctx.fillRect(this.x - 25, this.y - 45, 50 * hpPercentage, 8);
    
    // Type name
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText(this.type, this.x, this.y - 50);

    if (this.gemCount > 0) {
      ctx.fillStyle = '#cc00ff';
      ctx.font = 'bold 20px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(`💎 ${this.gemCount}`, this.x, this.y - 65);
    }
  }
}
