export class Gem {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 15;
    this.vy = -200; // Pop up slightly when spawning
    this.vx = (Math.random() - 0.5) * 200;
    this.lifeTime = 0;
  }

  update(dt) {
    this.lifeTime += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    // Friction and gravity effect for the initial pop
    this.vx *= 0.9;
    this.vy += 600 * dt; // Gravity
    if (this.vy > 0 && this.lifeTime > 0.4) {
      this.vy = 0;
      this.vx = 0;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    // Floating animation
    ctx.translate(0, Math.sin(this.lifeTime * 4) * 5);
    
    ctx.fillStyle = '#cc00ff';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(0, -this.radius);
    ctx.lineTo(this.radius * 0.8, 0);
    ctx.lineTo(0, this.radius);
    ctx.lineTo(-this.radius * 0.8, 0);
    ctx.closePath();
    
    ctx.fill();
    ctx.stroke();
    
    // Inner highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(0, -this.radius + 4);
    ctx.lineTo(this.radius * 0.4, 0);
    ctx.lineTo(0, this.radius * 0.5);
    ctx.lineTo(-this.radius * 0.4, 0);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }
}
