export class Camera {
  constructor(canvas) {
    this.x = 0;
    this.y = 0;
    this.canvas = canvas;
  }

  follow(target) {
    this.x = target.x - this.canvas.width / 2;
    this.y = target.y - this.canvas.height / 2;
  }

  apply(ctx) {
    ctx.translate(-this.x, -this.y);
  }

  reset(ctx) {
    ctx.translate(this.x, this.y);
  }
}
