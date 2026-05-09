export class MapManager {
  constructor(mapSize) {
    this.mapSize = mapSize;
    this.walls = [];
    this.bushes = [];
  }

  generateMap(mode) {
    this.walls = [];
    this.bushes = [];

    if (mode === 'GEM_GRAB') {
      this.generateGemGrabMap();
    } else {
      this.generateShowdownMap();
    }
  }

  generateGemGrabMap() {
    const center = this.mapSize / 2;
    
    // Central walls around the mine
    this.addWall(center - 200, center - 200, 100, 100);
    this.addWall(center + 100, center - 200, 100, 100);
    this.addWall(center - 200, center + 100, 100, 100);
    this.addWall(center + 100, center + 100, 100, 100);

    // Some defensive walls near spawns
    this.addWall(center - 100, center + 400, 200, 50);
    this.addWall(center - 100, center - 450, 200, 50);

    // Bushes on the sides
    this.addBush(center - 400, center - 300, 200, 600);
    this.addBush(center + 200, center - 300, 200, 600);
    
    // Some small bushes near center
    this.addBush(center - 50, center - 300, 100, 100);
    this.addBush(center - 50, center + 200, 100, 100);
  }

  generateShowdownMap() {
    // Random clumps of walls and bushes
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * (this.mapSize - 300) + 150;
      const y = Math.random() * (this.mapSize - 300) + 150;
      
      // Don't place too close to center spawn
      if (Math.hypot(x - this.mapSize/2, y - this.mapSize/2) < 300) continue;

      if (Math.random() > 0.4) {
        this.addWall(x, y, 100 + Math.random() * 150, 40 + Math.random() * 60);
      } else {
        this.addBush(x, y, 150 + Math.random() * 200, 150 + Math.random() * 200);
      }
    }
    
    // Borders (optional, but good for visual)
    // Actually the game logic already clamps movement to 0-MAP_SIZE
  }

  addWall(x, y, w, h) {
    this.walls.push({ x, y, w, h });
  }

  addBush(x, y, w, h) {
    this.bushes.push({ x, y, w, h });
  }

  checkCollision(x, y, radius) {
    for (const wall of this.walls) {
      // Find the closest point on the rectangle to the circle's center
      const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.w));
      const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.h));

      // Calculate the distance between the circle's center and this closest point
      const distanceX = x - closestX;
      const distanceY = y - closestY;

      // If the distance is less than the circle's radius, an intersection occurs
      const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
      if (distanceSquared < (radius * radius)) {
        return {
            collided: true,
            closestX,
            closestY
        };
      }
    }
    return { collided: false };
  }

  isInBush(x, y) {
    for (const bush of this.bushes) {
      if (x >= bush.x && x <= bush.x + bush.w && y >= bush.y && y <= bush.y + bush.h) {
        return true;
      }
    }
    return false;
  }

  draw(ctx) {
    // Draw Bushes first (so they are under walls)
    ctx.save();
    for (const bush of this.bushes) {
      // Create a nice bushy effect
      ctx.fillStyle = 'rgba(34, 139, 34, 0.7)'; // ForestGreen
      ctx.beginPath();
      ctx.roundRect(bush.x, bush.y, bush.w, bush.h, 20);
      ctx.fill();
      
      // Border for bushes
      ctx.strokeStyle = 'rgba(0, 100, 0, 0.8)';
      ctx.lineWidth = 4;
      ctx.stroke();
      
      // Add some "leaves" detail
      ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
      for(let i=0; i<5; i++) {
          ctx.beginPath();
          ctx.arc(bush.x + Math.random()*bush.w, bush.y + Math.random()*bush.h, 20, 0, Math.PI*2);
          ctx.fill();
      }
    }
    ctx.restore();

    // Draw Walls
    ctx.save();
    for (const wall of this.walls) {
      // Wall body
      const gradient = ctx.createLinearGradient(wall.x, wall.y, wall.x + wall.w, wall.y + wall.h);
      gradient.addColorStop(0, '#4e4e4e');
      gradient.addColorStop(1, '#2c2c2c');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(wall.x, wall.y, wall.w, wall.h, 5);
      ctx.fill();
      
      // Wall border/edge
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Decorative line/texture
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.strokeRect(wall.x + 5, wall.y + 5, wall.w - 10, wall.h - 10);
    }
    ctx.restore();
  }
}
