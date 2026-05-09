export class InputManager {
  constructor() {
    this.keys = {};
    this.mouse = { x: 0, y: 0, down: false };
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Joystick states
    this.moveJoystick = { x: 0, y: 0, active: false, identifier: null, startX: 0, startY: 0 };
    this.aimJoystick = { x: 0, y: 0, active: false, identifier: null, startX: 0, startY: 0, released: false };

    window.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    window.addEventListener('mousedown', () => { this.mouse.down = true; });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });

    // Touch events for joysticks
    window.addEventListener('touchstart', (e) => this.handleTouch(e), { passive: false });
    window.addEventListener('touchmove', (e) => this.handleTouch(e), { passive: false });
    window.addEventListener('touchend', (e) => this.handleTouch(e), { passive: false });
  }

  handleTouch(e) {
    if (e.type !== 'touchend') {
        const isMainMenuVisible = !document.getElementById('main-menu')?.classList.contains('hidden');
        const isShopMenuVisible = !document.getElementById('shop-menu')?.classList.contains('hidden');
        const isRewardModalVisible = !document.getElementById('reward-modal')?.classList.contains('hidden');
        const isGameOverVisible = !document.getElementById('game-over')?.classList.contains('hidden');
        
        // If any menu is visible, allow the touch to pass through (don't preventDefault)
        if (isMainMenuVisible || isShopMenuVisible || isRewardModalVisible || isGameOverVisible) {
            return;
        }

        // Otherwise, prevent scrolling/zooming during gameplay
        e.preventDefault();
    }

    const rect = document.getElementById('game-canvas').getBoundingClientRect();
    const moveBase = document.getElementById('move-joystick-container');
    const aimBase = document.getElementById('aim-joystick-container');
    
    if (!moveBase || !aimBase) return;

    const moveRect = moveBase.getBoundingClientRect();
    const aimRect = aimBase.getBoundingClientRect();

    // Reset released flag
    this.aimJoystick.released = false;

    // Process each touch
    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
        const touch = touches[i];
        const tx = touch.clientX;
        const ty = touch.clientY;

        if (e.type === 'touchstart') {
            // Check if touch is in move joystick area
            if (tx < window.innerWidth / 2 && !this.moveJoystick.active) {
                this.moveJoystick.active = true;
                this.moveJoystick.identifier = touch.identifier;
                this.moveJoystick.startX = tx;
                this.moveJoystick.startY = ty;
            } 
            // Check if touch is in aim joystick area
            else if (tx >= window.innerWidth / 2 && !this.aimJoystick.active) {
                this.aimJoystick.active = true;
                this.aimJoystick.identifier = touch.identifier;
                this.aimJoystick.startX = tx;
                this.aimJoystick.startY = ty;
            }
        } else if (e.type === 'touchmove') {
            if (touch.identifier === this.moveJoystick.identifier) {
                this.updateJoystick(this.moveJoystick, tx, ty, 'move-joystick-knob');
            } else if (touch.identifier === this.aimJoystick.identifier) {
                this.updateJoystick(this.aimJoystick, tx, ty, 'aim-joystick-knob');
            }
        } else if (e.type === 'touchend' || e.type === 'touchcancel') {
            if (touch.identifier === this.moveJoystick.identifier) {
                this.moveJoystick.active = false;
                this.moveJoystick.identifier = null;
                this.moveJoystick.x = 0;
                this.moveJoystick.y = 0;
                this.resetKnob('move-joystick-knob');
            } else if (touch.identifier === this.aimJoystick.identifier) {
                this.aimJoystick.active = false;
                this.aimJoystick.identifier = null;
                this.aimJoystick.released = true;
                // Keep the last x,y for firing direction
                this.resetKnob('aim-joystick-knob');
            }
        }
    }
  }

  updateJoystick(joystick, tx, ty, knobId) {
    const dx = tx - joystick.startX;
    const dy = ty - joystick.startY;
    const dist = Math.hypot(dx, dy);
    const maxDist = 60;

    const angle = Math.atan2(dy, dx);
    const cappedDist = Math.min(dist, maxDist);

    joystick.x = Math.cos(angle) * (cappedDist / maxDist);
    joystick.y = Math.sin(angle) * (cappedDist / maxDist);

    const knob = document.getElementById(knobId);
    if (knob) {
        knob.style.transform = `translate(${Math.cos(angle) * cappedDist}px, ${Math.sin(angle) * cappedDist}px)`;
    }
  }

  resetKnob(knobId) {
    const knob = document.getElementById(knobId);
    if (knob) {
        knob.style.transform = `translate(0, 0)`;
    }
  }

  isKeyPressed(code) {
    return !!this.keys[code];
  }

  getMovement() {
    let dx = 0;
    let dy = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

    if (this.moveJoystick.active) {
        dx = this.moveJoystick.x;
        dy = this.moveJoystick.y;
    } else if (dx !== 0 && dy !== 0) {
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;
    }

    return { x: dx, y: dy };
  }

  getAim(playerX, playerY, camera) {
    if (this.aimJoystick.active || (this.aimJoystick.released && this.aimJoystick.x !== 0)) {
        return { 
            active: this.aimJoystick.active,
            released: this.aimJoystick.released,
            x: this.aimJoystick.x, 
            y: this.aimJoystick.y,
            angle: Math.atan2(this.aimJoystick.y, this.aimJoystick.x)
        };
    }

    const mouseWorldX = this.mouse.x + camera.x;
    const mouseWorldY = this.mouse.y + camera.y;
    const angle = Math.atan2(mouseWorldY - playerY, mouseWorldX - playerX);

    return {
        active: false,
        released: false,
        down: this.mouse.down,
        x: Math.cos(angle),
        y: Math.sin(angle),
        angle: angle
    };
  }
}
