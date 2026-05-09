export class Camera {
  constructor(canvas) {
    this.x = 0;
    this.y = 0;
    this.canvas = canvas;
    this.zoom = 1;
  }

  follow(target) {
    // Center the target on the zoomed canvas
    this.x = target.x - (this.canvas.width / 2) / this.zoom;
    this.y = target.y - (this.canvas.height / 2) / this.zoom;
  }

  apply(ctx) {
    // Apply zoom and then translation
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  reset(ctx) {
    ctx.translate(this.x, this.y);
    ctx.scale(1 / this.zoom, 1 / this.zoom);
  }
}
