export class Projectile {
  constructor(x, y, angle, speed, damage, isPlayer, color) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.damage = damage;
    this.isPlayer = isPlayer;
    this.radius = 8;
    this.color = color;
    this.distanceTraveled = 0;
    this.maxDistance = 600;
    this.active = true;
    this.canBounce = false;
    this.bounces = 0;
    this.speed = speed;
    this.isPiercing = false;
    this.piercedTargets = new Set();
  }

  update(dt, mapManager) {
    const dx = this.vx * dt * 60;
    const dy = this.vy * dt * 60;
    this.x += dx;
    this.y += dy;
    this.distanceTraveled += Math.hypot(dx, dy);

    if (this.distanceTraveled >= this.maxDistance) {
      this.active = false;
    }

    if (mapManager && mapManager.checkCollision(this.x, this.y, this.radius).collided) {
      this.active = false;
    }
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
    
    // Trail effect
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.1, this.y - this.vy * 0.1);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.radius * 2;
    ctx.globalAlpha = 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }
}
