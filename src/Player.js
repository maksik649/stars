import { Projectile } from './Projectile.js';

export class Player {
  constructor(x, y, characterType = 'SHELLY') {
    this.x = x;
    this.y = y;
    this.characterType = characterType;
    this.radius = 30;
    this.speed = 300;
    this.level = parseInt(localStorage.getItem('brawlPlayerLevel') || '1');
    this.baseMaxHealth = 1000;
    this.maxHealth = this.baseMaxHealth * (1 + (this.level - 1) * 0.1);
    this.health = this.maxHealth;
    this.speedMultiplier = 1;
    this.speedBoostTimer = 0;

    this.ammo = characterType === 'NESTOR' ? 5 : 3;
    this.maxAmmo = characterType === 'NESTOR' ? 5 : 3;
    this.reloadTimer = 0;
    this.reloadTime = 1.5;
    this.fireRate = characterType === 'BUBLYK' ? 1.5 : (characterType === 'STAKAN' ? 1.0 : (characterType === 'MAXIM' ? 0.6 : (characterType === 'NESTOR' ? 0.4 : 0.2)));
    this.fireTimer = 0;
    this.gemCount = 0;
    this.active = true;
    this.respawnTimer = 0;

    this.image = new Image();
    this.image.src = characterType === 'BUBLYK' ? './public/assets/bublyk.png' : (characterType === 'SMAI' ? './public/assets/smai.png' : (characterType === 'STAKAN' ? './public/assets/stakan.png' : (characterType === 'MAXIM' ? './public/assets/maxim.png' : (characterType === 'NESTOR' ? './public/assets/nestor.png' : './public/assets/shelly.png'))));
    this.angle = 0;

    this.pendingShots = []; // For sequential attacks like Bublyk
    
    this.superCharge = 0;
    this.maxSuperCharge = 100;
    this.isSuperReady = false;
    this.lastFireTimer = 0;
  }

  update(dt, input, camera, projectiles, mapManager) {
    if (!this.active) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.active = true;
        this.health = this.maxHealth;
        this.x = 1000;
        this.y = 1300;
      }
      return;
    }

    if (this.health <= 0) return;

    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= dt;
      if (this.speedBoostTimer <= 0) {
        this.speedMultiplier = 1;
      }
    }

    // Handle pending shots for Bublyk
    if (this.pendingShots.length > 0) {
      for (let i = this.pendingShots.length - 1; i >= 0; i--) {
        const shot = this.pendingShots[i];
        shot.timer -= dt;
        if (shot.timer <= 0) {
          this.executeShot(shot.angle, projectiles);
          this.pendingShots.splice(i, 1);
        }
      }
    }

    // Movement handling
    const move = input.getMovement();
    let dx = move.x;
    let dy = move.y;

    const nextX = this.x + dx * this.speed * this.speedMultiplier * dt;
    const nextY = this.y + dy * this.speed * this.speedMultiplier * dt;

    // Simple wall collision handling
    if (mapManager) {
      const collisionX = mapManager.checkCollision(nextX, this.y, this.radius);
      if (!collisionX.collided) {
        this.x = nextX;
      }
      const collisionY = mapManager.checkCollision(this.x, nextY, this.radius);
      if (!collisionY.collided) {
        this.y = nextY;
      }
    } else {
      this.x = nextX;
      this.y = nextY;
    }

    this.x = Math.max(this.radius, Math.min(2000 - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(2000 - this.radius, this.y));

    // Aiming and firing
    const aim = input.getAim(this.x, this.y, camera);
    this.angle = aim.angle;

    if (this.fireTimer > 0) this.fireTimer -= dt;

    if (this.ammo < this.maxAmmo) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.ammo++;
        if (this.ammo < this.maxAmmo) {
          this.reloadTimer = this.reloadTime;
        }
      }
    }

    const shouldFire = aim.released || (aim.down && !aim.active);
    if (shouldFire && this.fireTimer <= 0 && this.ammo > 0) {
      this.fire(projectiles);
    }
    
    if (this.lastFireTimer > 0) this.lastFireTimer -= dt;
    this.inBush = mapManager ? mapManager.isInBush(this.x, this.y) : false;
  }

  fire(projectiles) {
    this.ammo--;
    this.fireTimer = this.fireRate;
    this.lastFireTimer = 1.0; // Visible for 1s after firing
    if (this.ammo < this.maxAmmo && this.reloadTimer <= 0) {
      this.reloadTimer = this.reloadTime;
    }

    if (this.characterType === 'SHELLY') {
      const baseDamage = 150; 
      const damage = baseDamage * (1 + (this.level - 1) * 0.1);
      const numPellets = 5;
      const spread = 0.4; 

      for (let i = 0; i < numPellets; i++) {
          const offset = (i - (numPellets - 1) / 2) * (spread / numPellets);
          const angle = this.angle + offset;
          this.executeShot(angle, projectiles, damage);
      }
    } else if (this.characterType === 'BUBLYK') {
      const damage = 600 * (1 + (this.level - 1) * 0.1); // One strong bullet
      
      // Shot 1: Center (immediate)
      this.executeShot(this.angle, projectiles, damage);

      // Shot 2: Right (0.5s later)
      this.pendingShots.push({
        timer: 0.5,
        angle: this.angle + 0.3,
        damage: damage
      });

      // Shot 3: Left (1.0s later)
      this.pendingShots.push({
        timer: 1.0,
        angle: this.angle - 0.3,
        damage: damage
      });
    } else if (this.characterType === 'SMAI') {
      const damage = 800 * (1 + (this.level - 1) * 0.1);
      const proj = this.executeShot(this.angle, projectiles, damage);
      proj.canBounce = true;
    } else if (this.characterType === 'STAKAN') {
      // Stakan: Percent damage (handled in main.js checkCollisions)
      // We pass a flag to the projectile
      const proj = this.executeShot(this.angle, projectiles, 0); 
      proj.isPercentDamage = true;
      proj.percentAmount = 0.25;
      proj.color = '#00d4ff'; // Water color
    } else if (this.characterType === 'MAXIM') {
      // Maxim: 3 beams (0, -0.5, +0.5 radians)
      const angles = [this.angle, this.angle - 0.5, this.angle + 0.5];
      for (const a of angles) {
        const proj = this.executeShot(a, projectiles, 0);
        proj.isPercentDamage = true;
        proj.percentAmount = 0.50;
        proj.color = '#fff700'; // Beam color (bright yellow)
        proj.speed = 1000; // Faster beams
      }
    } else if (this.characterType === 'NESTOR') {
      const proj = this.executeShot(this.angle, projectiles, 0);
      proj.isPercentDamage = true;
      proj.percentAmount = 0.50;
      proj.color = '#00ffff'; // Electric blue
    }
  }

  executeShot(angle, projectiles, damage = null) {
    if (damage === null) {
      const baseDamage = this.characterType === 'BUBLYK' ? 600 : (this.characterType === 'SMAI' ? 800 : 150);
      damage = baseDamage * (1 + (this.level - 1) * 0.1);
    }
    const spawnX = this.x + Math.cos(angle) * this.radius;
    const spawnY = this.y + Math.sin(angle) * this.radius;
    let color = '#ffcc00';
    let size = 10;
    
    if (this.characterType === 'BUBLYK') {
        color = '#ff69b4';
        size = 14;
    } else if (this.characterType === 'SMAI') {
        color = '#ffff00';
        size = 12;
    } else if (this.characterType === 'STAKAN') {
        color = '#00d4ff';
        size = 12;
    } else if (this.characterType === 'MAXIM') {
        color = '#fff700';
        size = 15;
    } else if (this.characterType === 'NESTOR') {
        color = '#00ffff';
        size = 12;
    }
    
    const speed = this.characterType === 'MAXIM' ? 1200 : (this.characterType === 'NESTOR' ? 1000 : 800);
    const proj = new Projectile(spawnX, spawnY, angle, speed, damage, true, color, size);
    projectiles.push(proj);
    return proj;
  }

  chargeSuper(amount) {
    if (this.isSuperReady) return;
    this.superCharge = Math.min(this.maxSuperCharge, this.superCharge + amount);
    if (this.superCharge >= this.maxSuperCharge) {
      this.isSuperReady = true;
    }
  }

  useSuper(projectiles, superZones) {
    if (!this.isSuperReady) return;
    
    this.superCharge = 0;
    this.isSuperReady = false;

    if (this.characterType === 'SHELLY') {
      // Shelly Super: Piercing shots
      const damage = 150 * (1 + (this.level - 1) * 0.1);
      for (let i = -2; i <= 2; i++) {
        const proj = this.executeShot(this.angle + i * 0.15, projectiles, damage);
        proj.isPiercing = true;
        proj.color = '#ff9900'; // Orange for super
        proj.radius = 12;
      }
    } else if (this.characterType === 'BUBLYK') {
      // Bublyk Super: Burst in all directions
      const damage = 400 * (1 + (this.level - 1) * 0.1);
      const numShots = 16;
      for (let i = 0; i < numShots; i++) {
        const angle = (i / numShots) * Math.PI * 2;
        const proj = this.executeShot(angle, projectiles, damage);
        proj.color = '#ff1493'; // Deep pink for super
      }
    } else if (this.characterType === 'SMAI') {
      // Smai Super: Damage zone
      superZones.push({
        x: this.x,
        y: this.y,
        radius: 120,
        damagePerSec: 0.20, // 20% max health per sec
        duration: 5, // 5 seconds
        timer: 0,
        color: 'rgba(255, 255, 0, 0.3)',
        owner: 'PLAYER'
      });
    } else if (this.characterType === 'STAKAN') {
      // Stakan Super: Water zone
      superZones.push({
        x: this.x,
        y: this.y,
        radius: 150,
        damagePercentPerSec: 0.05, // 5% max health per sec
        duration: 10, // 10 seconds
        timer: 0,
        color: 'rgba(0, 212, 255, 0.3)',
        owner: 'PLAYER'
      });
    } else if (this.characterType === 'MAXIM') {
      // Maxim Super: Speed zone
      superZones.push({
        x: this.x,
        y: this.y,
        radius: 100,
        isSpeedZone: true,
        duration: 2, // 2 seconds
        timer: 0,
        color: 'rgba(255, 255, 0, 0.4)',
        owner: 'PLAYER'
      });
    } else if (this.characterType === 'NESTOR') {
      // Nestor Super: Robo-Spider
      superZones.push({
        x: this.x,
        y: this.y,
        isCompanion: true,
        type: 'ROBO_SPIDER',
        lastAttack: 0,
        attackInterval: 2,
        range: 900,
        hits: 3,
        timer: 0,
        duration: 9999, // Permanent until death or respawn
        color: 'rgba(0, 255, 255, 0.5)',
        owner: 'PLAYER'
      });
    }
  }

  draw(ctx) {
    if (this.health <= 0 || !this.active) return;

    if (this.gemCount > 0) {
      ctx.fillStyle = '#00b4d8';
      ctx.font = 'bold 24px Outfit';
      ctx.textAlign = 'center';
      ctx.fillText(`💎 ${this.gemCount}`, this.x, this.y - 50);
    }

    ctx.save();
    if (this.inBush) ctx.globalAlpha = 0.5;
    
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.image.complete && this.image.naturalWidth !== 0) {
      // Draw shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 5, this.radius, this.radius, 0, 0, Math.PI * 2);
      ctx.fill();

      // The generated image might be a square with white bg, let's draw it as a circle
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.image, -this.radius, -this.radius, this.radius * 2, this.radius * 2);

      // Aim indicator
      ctx.beginPath();
      ctx.moveTo(this.radius, 0);
      ctx.lineTo(this.radius + 20, 0);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#0af';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(this.radius + 10, 0);
      ctx.lineWidth = 8;
      ctx.stroke();
    }

    ctx.restore();
  }
}
