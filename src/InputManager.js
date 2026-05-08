export class InputManager {
  constructor() {
    this.keys = {};
    this.mouse = { x: 0, y: 0, down: false };

    window.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    window.addEventListener('mousedown', () => { this.mouse.down = true; });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
  }

  isKeyPressed(code) {
    return !!this.keys[code];
  }
}
