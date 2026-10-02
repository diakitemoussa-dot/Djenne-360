import { EventEmitter } from '../utils/EventEmitter';
import { InteractionMode, EventMap } from '../types';

export interface InputControllerEvents extends EventMap {
  rotate: { deltaX: number; deltaY: number };
  zoom: { delta: number };
  modeChange: InteractionMode;
  tap: { x: number; y: number };
}

export class MouseController extends EventEmitter<InputControllerEvents> {
  private element: HTMLElement;
  private isDragging = false;
  private lastX = 0;
  private lastY = 0;
  private mode: InteractionMode = 'exploration';
  private dragThreshold = 5;
  private dragStartX = 0;
  private dragStartY = 0;
  private hasMovedEnough = false;

  constructor(element: HTMLElement) {
    super();
    this.element = element;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.element.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.element.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.element.addEventListener('contextmenu', e => e.preventDefault());

    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    document.addEventListener('mouseleave', this.onMouseUp.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.hasMovedEnough = false;
    this.element.style.cursor = 'grabbing';
    e.preventDefault();
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastX;
    const deltaY = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;

    const totalDeltaX = e.clientX - this.dragStartX;
    const totalDeltaY = e.clientY - this.dragStartY;
    const distance = Math.hypot(totalDeltaX, totalDeltaY);

    if (!this.hasMovedEnough && distance > this.dragThreshold) {
      this.hasMovedEnough = true;
    }

    if (this.mode === 'exploration' || (this.mode === 'timeline' && this.hasMovedEnough)) {
      this.emit('rotate', {
        deltaX: deltaX * 0.005,
        deltaY: deltaY * 0.005
      });
    }
  }

  private onMouseUp(): void {
    if (this.isDragging && !this.hasMovedEnough) {
      this.emit('tap', { x: this.dragStartX, y: this.dragStartY });
    }
    this.isDragging = false;
    this.hasMovedEnough = false;
    this.element.style.cursor = '';
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;

    if (this.mode === 'timeline') {
      this.emit('zoom', { delta: delta * 0.05 });
    } else {
      this.emit('zoom', { delta: delta * 5 });
    }
  }

  setMode(mode: InteractionMode): void {
    this.mode = mode;
    this.emit('modeChange', mode);
  }

  getMode(): InteractionMode {
    return this.mode;
  }

  destroy(): void {
    this.element.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.element.removeEventListener('wheel', this.onWheel.bind(this));
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
    document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    document.removeEventListener('mouseleave', this.onMouseUp.bind(this));
    this.removeAllListeners();
  }
}