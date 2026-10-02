import { EventEmitter } from '../utils/EventEmitter';
import { VideoScrubber } from '../video/VideoScrubber';
import { VideoManager } from '../video/VideoManager';
import { EventMap } from '../types';

export interface TimelineControllerEvents extends EventMap {
  progressChange: number;
  timeChange: number;
  scrubStart: void;
  scrubEnd: void;
  seekComplete: number;
}

export class TimelineController extends EventEmitter<TimelineControllerEvents> {
  private videoManager: VideoManager;
  private videoScrubber: VideoScrubber;
  private element: HTMLElement;
  private scrollTimeout: number | null = null;
  private lastScrollTime = 0;
  private scrollAccumulator = 0;
  private isDragging = false;
  private dragStartY = 0;
  private dragStartProgress = 0;

  constructor(element: HTMLElement, videoManager: VideoManager, videoScrubber: VideoScrubber) {
    super();
    this.element = element;
    this.videoManager = videoManager;
    this.videoScrubber = videoScrubber;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.element.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.element.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.element.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.element.addEventListener('touchend', this.onTouchEnd.bind(this));
    this.element.addEventListener('touchcancel', this.onTouchEnd.bind(this));

    this.videoScrubber.on('scrubStart', () => this.emit('scrubStart'));
    this.videoScrubber.on('scrubEnd', () => this.emit('scrubEnd'));
    this.videoScrubber.on('seek', time => this.emit('seekComplete', time));

    this.videoManager.on('timeupdate', time => {
      const duration = this.videoManager.getDuration();
      if (duration > 0) {
        this.emit('progressChange', time / duration);
        this.emit('timeChange', time);
      }
    });
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const now = performance.now();
    const delta = e.deltaY > 0 ? -1 : 1;
    const duration = this.videoManager.getDuration();

    if (duration <= 0) return;

    const progressChange = delta * 0.01;
    this.scrollAccumulator += progressChange;

    if (now - this.lastScrollTime > 16) {
      this.applyScroll();
      this.lastScrollTime = now;
    }

    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    this.scrollTimeout = window.setTimeout(() => {
      this.applyScroll();
      this.scrollAccumulator = 0;
    }, 100);
  }

  private applyScroll(): void {
    const currentProgress = this.videoManager.getCurrentTime() / this.videoManager.getDuration();
    const newProgress = Math.max(0, Math.min(1, currentProgress + this.scrollAccumulator));
    this.videoScrubber.seekToProgress(newProgress);
    this.scrollAccumulator = 0;
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.dragStartY = e.touches[0].clientY;
      const duration = this.videoManager.getDuration();
      this.dragStartProgress = duration > 0 ? this.videoManager.getCurrentTime() / duration : 0;
      this.videoScrubber.requestSeek(this.dragStartProgress);
      this.emit('scrubStart');
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();

    const deltaY = this.dragStartY - e.touches[0].clientY;
    const progressChange = deltaY / window.innerHeight;
    const newProgress = Math.max(0, Math.min(1, this.dragStartProgress + progressChange));
    this.videoScrubber.requestSeek(newProgress);
  }

  private onTouchEnd(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.videoScrubber.endScrub();
      this.emit('scrubEnd');
    }
  }

  seekToProgress(progress: number): void {
    this.videoScrubber.seekToProgress(Math.max(0, Math.min(1, progress)));
  }

  seekToTime(time: number): void {
    this.videoScrubber.seekToTime(time);
  }

  nudge(deltaSeconds: number): void {
    this.videoScrubber.nudge(deltaSeconds);
  }

  getProgress(): number {
    const duration = this.videoManager.getDuration();
    return duration > 0 ? this.videoManager.getCurrentTime() / duration : 0;
  }

  getCurrentTime(): number {
    return this.videoManager.getCurrentTime();
  }

  getDuration(): number {
    return this.videoManager.getDuration();
  }

  destroy(): void {
    this.element.removeEventListener('wheel', this.onWheel.bind(this));
    this.element.removeEventListener('touchstart', this.onTouchStart.bind(this));
    this.element.removeEventListener('touchmove', this.onTouchMove.bind(this));
    this.element.removeEventListener('touchend', this.onTouchEnd.bind(this));
    this.element.removeEventListener('touchcancel', this.onTouchEnd.bind(this));
    if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
    this.removeAllListeners();
  }
}