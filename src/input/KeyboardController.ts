import { EventEmitter } from '../utils/EventEmitter';
import { EventMap } from '../types';

export interface KeyboardControllerEvents extends EventMap {
  rotate: { deltaX: number; deltaY: number };
  zoom: { delta: number };
  seek: { delta: number };
  playPause: void;
  muteToggle: void;
  fullscreen: void;
  modeToggle: void;
}

export class KeyboardController extends EventEmitter<KeyboardControllerEvents> {
  private pressedKeys = new Set<string>();
  private repeatTimers = new Map<string, number>();

  constructor() {
    super();
    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    if (this.isInputFocused()) return;

    this.pressedKeys.add(e.code);
    this.handleKeyAction(e.code, true);

    if (!this.repeatTimers.has(e.code)) {
      const timer = window.setTimeout(() => {
        this.repeatTimers.delete(e.code);
        if (this.pressedKeys.has(e.code)) {
          this.handleKeyAction(e.code, true);
          this.startRepeat(e.code);
        }
      }, 500);
      this.repeatTimers.set(e.code, timer);
    }
  }

  private startRepeat(code: string): void {
    const timer = window.setInterval(() => {
      if (this.pressedKeys.has(code)) {
        this.handleKeyAction(code, true);
      } else {
        clearInterval(timer);
      }
    }, 100);
    this.repeatTimers.set(code, timer);
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.pressedKeys.delete(e.code);
    const timer = this.repeatTimers.get(e.code);
    if (timer) {
      clearTimeout(timer);
      this.repeatTimers.delete(e.code);
    }
  }

  private isInputFocused(): boolean {
    const active = document.activeElement;
    return active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active instanceof HTMLSelectElement ||
      (active instanceof HTMLElement && active.isContentEditable);
  }

  private handleKeyAction(code: string, isDown: boolean): void {
    switch (code) {
      case 'ArrowLeft':
        this.emit('rotate', { deltaX: -0.05, deltaY: 0 });
        break;
      case 'ArrowRight':
        this.emit('rotate', { deltaX: 0.05, deltaY: 0 });
        break;
      case 'ArrowUp':
        this.emit('seek', { delta: 5 });
        break;
      case 'ArrowDown':
        this.emit('seek', { delta: -5 });
        break;
      case 'PageUp':
        this.emit('seek', { delta: 30 });
        break;
      case 'PageDown':
        this.emit('seek', { delta: -30 });
        break;
      case 'Space':
        if (isDown) this.emit('playPause');
        break;
      case 'KeyM':
        if (isDown) this.emit('muteToggle');
        break;
      case 'KeyF':
        if (isDown) this.emit('fullscreen');
        break;
      case 'KeyT':
        if (isDown) this.emit('modeToggle');
        break;
      case 'Equal':
      case 'NumpadAdd':
        this.emit('zoom', { delta: -5 });
        break;
      case 'Minus':
      case 'NumpadSubtract':
        this.emit('zoom', { delta: 5 });
        break;
      case 'Home':
        this.emit('seek', { delta: -Infinity });
        break;
      case 'End':
        this.emit('seek', { delta: Infinity });
        break;
    }
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
    this.repeatTimers.forEach(timer => clearTimeout(timer));
    this.repeatTimers.clear();
    this.removeAllListeners();
  }
}