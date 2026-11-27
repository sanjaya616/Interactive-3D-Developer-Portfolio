import type { VehicleInputIntent } from './physicsMath';

export interface TouchInputState {
  throttle: number;
  steer: number;
  brake: boolean;
  handbrake: boolean;
  boost: boolean;
  jumpQueued: boolean;
}

export interface ActionCallbacks {
  onInteract: () => void;
  onToggleMap: () => void;
  onRespawn: () => void;
  onRecover: () => void;
  onHorn: () => void;
  onToggleHeadlights: () => void;
  onTogglePhotoMode: () => void;
  onTogglePause: () => void;
  onCycleCamera: () => void;
  onStartFromTitle: () => void;
}

export class GameControls {
  private keys = new Set<string>();
  private jumpQueued = false;
  private prevGamepadButtons = new Map<number, boolean>();
  private touchState: TouchInputState = {
    throttle: 0,
    steer: 0,
    brake: false,
    handbrake: false,
    boost: false,
    jumpQueued: false,
  };
  private callbacks: ActionCallbacks;
  private isTitleScreen = () => document.body.dataset.state === 'title';

  constructor(callbacks: ActionCallbacks) {
    this.callbacks = callbacks;
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.clearAll = this.clearAll.bind(this);
    this.handleVisibility = this.handleVisibility.bind(this);
  }

  attach(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.clearAll);
    document.addEventListener('visibilitychange', this.handleVisibility);
  }

  detach(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.clearAll);
    document.removeEventListener('visibilitychange', this.handleVisibility);
  }

  clearAll(): void {
    this.keys.clear();
    this.jumpQueued = false;
    this.touchState.throttle = 0;
    this.touchState.steer = 0;
    this.touchState.brake = false;
    this.touchState.handbrake = false;
    this.touchState.boost = false;
    this.touchState.jumpQueued = false;
  }

  private handleVisibility(): void {
    if (document.hidden) this.clearAll();
  }

  private isTypingInInput(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.isTypingInInput(e.target)) return;

    const code = e.code;

    if (this.isTitleScreen() && (code === 'Enter' || code === 'Space')) {
      e.preventDefault();
      this.callbacks.onStartFromTitle();
      return;
    }

    if (code === 'Escape') {
      e.preventDefault();
      this.callbacks.onTogglePause();
      return;
    }

    if (code === 'KeyP' && !e.repeat) {
      e.preventDefault();
      this.callbacks.onTogglePhotoMode();
      return;
    }

    const state = document.body.dataset.state;
    const isDrivingOrPhoto = state === 'playing' || state === 'photomode';

    if (
      isDrivingOrPhoto &&
      (code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight' ||
        code === 'Space')
    ) {
      e.preventDefault();
    }

    if (state === 'playing' && !e.repeat) {
      if (code === 'Space') this.jumpQueued = true;
      if (code === 'Enter' || code === 'KeyE') this.callbacks.onInteract();
      if (code === 'KeyM') this.callbacks.onToggleMap();
      if (code === 'KeyR') this.callbacks.onRespawn();
      if (code === 'KeyF') this.callbacks.onRecover();
      if (code === 'KeyH') this.callbacks.onHorn();
      if (code === 'KeyL') this.callbacks.onToggleHeadlights();
      if (code === 'KeyC') this.callbacks.onCycleCamera();
    }

    this.keys.add(code);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  setTouchInput(partial: Partial<TouchInputState>): void {
    Object.assign(this.touchState, partial);
  }

  triggerTouchJump(): void {
    this.touchState.jumpQueued = true;
  }

  getPhotoMoveIntent(): { forward: number; right: number; up: number } {
    const forward = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) -
      (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
    const right = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) -
      (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
    const up = (this.keys.has('KeyE') || this.keys.has('Space') ? 1 : 0) -
      (this.keys.has('KeyQ') || this.keys.has('ShiftLeft') ? 1 : 0);
    return { forward, right, up };
  }

  private getActiveGamepad(): Gamepad | null {
    const pads = typeof navigator !== 'undefined' ? navigator.getGamepads?.() : null;
    return pads ? Array.from(pads).find((p) => p && p.connected) || null : null;
  }

  private justPressedGamepad(pad: Gamepad, idx: number): boolean {
    const pressed = Boolean(pad.buttons[idx]?.pressed);
    const prev = this.prevGamepadButtons.get(idx) ?? false;
    this.prevGamepadButtons.set(idx, pressed);
    return pressed && !prev;
  }

  pollMenuGamepad(): void {
    const pad = this.getActiveGamepad();
    if (!pad) return;
    const state = document.body.dataset.state;
    const startPressed = this.justPressedGamepad(pad, 9);
    const aPressed = this.justPressedGamepad(pad, 0);
    const bPressed = this.justPressedGamepad(pad, 1);

    if (state === 'title' && (startPressed || aPressed)) {
      this.callbacks.onStartFromTitle();
    } else if (state === 'paused' && (startPressed || bPressed)) {
      this.callbacks.onTogglePause();
    }
  }

  getGamepadCameraLook(): { yawDelta: number; pitchDelta: number } {
    const pad = this.getActiveGamepad();
    if (!pad) return { yawDelta: 0, pitchDelta: 0 };
    const rx = pad.axes[2] ?? 0;
    const ry = pad.axes[3] ?? 0;
    return {
      yawDelta: Math.abs(rx) > 0.2 ? -rx * 0.032 : 0,
      pitchDelta: Math.abs(ry) > 0.2 ? ry * 0.022 : 0,
    };
  }

  private pollGamepad(): {
    throttle: number;
    steer: number;
    brake: boolean;
    handbrake: boolean;
    boost: boolean;
    jump: boolean;
  } {
    const pad = this.getActiveGamepad();
    if (!pad) {
      return { throttle: 0, steer: 0, brake: false, handbrake: false, boost: false, jump: false };
    }

    const rawStickX = pad.axes[0] ?? 0;
    const dpadLeft = pad.buttons[14]?.pressed ? 1 : 0;
    const dpadRight = pad.buttons[15]?.pressed ? 1 : 0;
    const stickSteer = Math.abs(rawStickX) > 0.18 ? -rawStickX : 0;
    const steer = stickSteer !== 0 ? stickSteer : dpadLeft - dpadRight;

    const rt = pad.buttons[7]?.value ?? (pad.buttons[12]?.pressed ? 1 : 0);
    const lt = pad.buttons[6]?.value ?? (pad.buttons[13]?.pressed ? 1 : 0);
    const throttle = rt - lt;

    const handbrake = Boolean(pad.buttons[1]?.pressed); // B / Circle
    const brake = Boolean(pad.buttons[2]?.pressed); // X / Square
    const boost = Boolean(pad.buttons[5]?.pressed); // RB
    const jump = this.justPressedGamepad(pad, 0); // A / Cross

    if (this.justPressedGamepad(pad, 3)) this.callbacks.onInteract(); // Y / Triangle
    if (this.justPressedGamepad(pad, 4)) this.callbacks.onCycleCamera(); // LB
    if (this.justPressedGamepad(pad, 8)) this.callbacks.onToggleMap(); // View / Back
    if (this.justPressedGamepad(pad, 9)) this.callbacks.onTogglePause(); // Start / Menu
    if (this.justPressedGamepad(pad, 10)) this.callbacks.onRecover(); // LS click

    return { throttle, steer, brake, handbrake, boost, jump };
  }

  consumeDrivingIntent(): VehicleInputIntent {
    const forward = this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0;
    const backward = this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0;
    const left = this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0;
    const right = this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0;

    const keyThrottle = forward - backward;
    const keySteer = left - right;
    const gp = this.pollGamepad();

    const throttle =
      Math.abs(keyThrottle) > 0.01
        ? keyThrottle
        : Math.abs(this.touchState.throttle) > 0.01
          ? this.touchState.throttle
          : gp.throttle;
    const steer =
      Math.abs(keySteer) > 0.01
        ? keySteer
        : Math.abs(this.touchState.steer) > 0.01
          ? this.touchState.steer
          : gp.steer;

    const brake =
      this.keys.has('KeyB') ||
      this.keys.has('ControlLeft') ||
      this.keys.has('ControlRight') ||
      this.touchState.brake ||
      gp.brake;

    const handbrake =
      this.keys.has('KeyX') ||
      this.touchState.handbrake ||
      gp.handbrake;

    const boost =
      this.keys.has('ShiftLeft') ||
      this.keys.has('ShiftRight') ||
      this.touchState.boost ||
      gp.boost;

    const jumpJustPressed = this.jumpQueued || this.touchState.jumpQueued || gp.jump;
    this.jumpQueued = false;
    this.touchState.jumpQueued = false;

    return { throttle, steer, boost, brake, handbrake, jump: jumpJustPressed, jumpJustPressed };
  }
}
