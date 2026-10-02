import { EventEmitter } from '../utils/EventEmitter';
import { InteractionMode, EventMap } from '../types';

export interface TouchControllerEvents extends EventMap {
  rotate: { deltaX: number; deltaY: number };
  pan: { deltaX: number; deltaY: number };
  zoom: { delta: number };
  modeChange: InteractionMode;
  tap: { x: number; y: number };
  scrub: { progress: number };
  scrubStart: void;
  scrubEnd: void;
}

export class TouchController extends EventEmitter<TouchControllerEvents> {
  private element: HTMLElement;
  private mode: InteractionMode = 'exploration';
  private touches: Map<number, { x: number; y: number; startX: number; startY: number; startTime: number }> = new Map();
  private initialDistance = 0;
  private initialScale = 1;
  private isScrubbing = false;
  private scrubStartY = 0;

  constructor(element: HTMLElement) {
    super();
    this.element = element;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.element.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.onTouchEnd.bind(this));
    this.element.addEventListener('touchcancel', this.onTouchEnd.bind(this));
  }

  private onTouchStart(e: TouchEvent): void {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      this.touches.set(touch.identifier, {
        x: touch.clientX,
        y: touch.clientY,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now()
      });
    }

    if (this.touches.size === 2) {
      const touchArray = Array.from(this.touches.values());
      this.initialDistance = this.getDistance(touchArray[0], touchArray[1]);
    }

    if (this.mode === 'timeline' && this.touches.size === 1) {
      const touch = e.changedTouches[0];
      this.isScrubbing = true;
      this.scrubStartY = touch.clientY;
      this.emit('scrubStart');
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const touchData = this.touches.get(touch.identifier);
      if (touchData) {
        touchData.x = touch.clientX;
        touchData.y = touch.clientY;
      }
    }

    if (this.mode === 'timeline' && this.isScrubbing && this.touches.size === 1) {
      const touch = e.changedTouches[0];
      const deltaY = this.scrubStartY - touch.clientY;
      const progress = deltaY / window.innerHeight;
      this.emit('scrub', { progress });
      return;
    }

    if (this.touches.size === 1) {
      const touchData = Array.from(this.touches.values())[0];
      const deltaX = touchData.x - touchData.startX;
      const deltaY = touchData.y - touchData.startY;

      if (this.mode === 'exploration') {
        this.emit('rotate', {
          deltaX: deltaX * 0.005,
          deltaY: deltaY * 0.005
        });
      } else {
        this.emit('pan', { deltaX, deltaY });
      }
    } else if (this.touches.size === 2) {
      const touchArray = Array.from(this.touches.values());
      const currentDistance = this.getDistance(touchArray[0], touchArray[1]);
      const scale = currentDistance / this.initialDistance;
      this.emit('zoom', { delta: (scale - this.initialScale) * 10 });
      this.initialScale = scale;
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const touchData = this.touches.get(touch.identifier);

      if (touchData) {
        const duration = Date.now() - touchData.startTime;
        const distance = Math.hypot(touch.clientX - touchData.startX, touch.clientY - touchData.startY);

        if (duration < 300 && distance < 20 && !this.isScrubbing) {
          this.emit('tap', { x: touch.clientX, y: touch.clientY });
        }
      }

      this.touches.delete(touch.identifier);
    }

    if (this.isScrubbing) {
      this.isScrubbing = false;
      this.emit('scrubEnd');
    }

    if (this.touches.size < 2) {
      this.initialDistance = 0;
      this.initialScale = 1;
    }
  }

  private getDistance(t1: { x: number; y: number }, t2: { x: number; y: number }): number {
    return Math.hypot(t1.x - t2.x, t1.y - t2.y);
  }

  setMode(mode: InteractionMode): void {
    this.mode = mode;
    this.emit('modeChange', mode);
  }

  getMode(): InteractionMode {
    return this.mode;
  }

  destroy(): void {
    this.element.removeEventListener('touchstart', this.onTouchStart.bind(this));
    this.element.removeEventListener('touchmove', this.onTouchMove.bind(this));
    this.element.removeEventListener('touchend', this.onTouchEnd.bind(this));
    this.element.removeEventListener('touchcancel', this.onTouchEnd.bind(this));
    this.removeAllListeners();
  }
}