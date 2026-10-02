import { EventEmitter } from '../utils/EventEmitter';
import { VideoManager } from './VideoManager';
import { ScrubberConfig, EventMap } from '../types';

export interface VideoScrubberEvents extends EventMap {
  seek: number;
  scrubStart: void;
  scrubEnd: void;
  frameUpdate: number;
}

export class VideoScrubber extends EventEmitter<VideoScrubberEvents> {
  private videoManager: VideoManager;
  private config: ScrubberConfig;
  private requestedTime: number = 0;
  private currentSeekTime: number = 0;
  private isSeeking: boolean = false;
  private isScrubbing: boolean = false;
  private pendingSeek: boolean = false;
  private lastFrameTime: number = 0;
  private rafId: number | null = null;
  private rvfId: number | null = null;
  private useRVF: boolean = false;

  constructor(videoManager: VideoManager, config?: Partial<ScrubberConfig>) {
    super();
    this.videoManager = videoManager;
    this.config = {
      maxSeekAhead: 0.5,
      seekThrottleMs: 16,
      useRequestVideoFrameCallback: true,
      ...config
    };
    this.useRVF = this.config.useRequestVideoFrameCallback && 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
  }

  requestSeek(progress: number): void {
    const duration = this.videoManager.getDuration();
    if (duration <= 0) return;

    const targetTime = Math.max(0, Math.min(progress * duration, duration));
    this.requestedTime = targetTime;

    console.log('[VideoScrubber] requestSeek:', progress, '->', targetTime);

    if (!this.isScrubbing) {
      this.isScrubbing = true;
      this.emit('scrubStart');
    }

    this.scheduleSeek();
  }

  private scheduleSeek(): void {
    if (this.pendingSeek) return;

    const now = performance.now();
    const timeSinceLastFrame = now - this.lastFrameTime;

    if (timeSinceLastFrame < this.config.seekThrottleMs) {
      this.pendingSeek = true;
      setTimeout(() => {
        this.pendingSeek = false;
        this.scheduleSeek();
      }, this.config.seekThrottleMs - timeSinceLastFrame);
      return;
    }

    this.executeSeek();
  }

  private executeSeek(): void {
    if (this.isSeeking) {
      console.log('[VideoScrubber] executeSeek skipped - already seeking');
      return;
    }

    this.isSeeking = true;
    this.currentSeekTime = this.requestedTime;

    console.log('[VideoScrubber] executeSeek to:', this.currentSeekTime);

    this.videoManager.seekTo(this.currentSeekTime).then(() => {
      this.isSeeking = false;
      this.lastFrameTime = performance.now();
      this.emit('seek', this.currentSeekTime);
      this.emit('frameUpdate', this.currentSeekTime);

      if (this.requestedTime !== this.currentSeekTime) {
        this.scheduleSeek();
      }
    }).catch(() => {
      this.isSeeking = false;
    });
  }

  requestSeekRVF(time: number): void {
    const video = this.videoManager.getVideoElement();
    if (!this.useRVF) {
      this.requestSeek(time / this.videoManager.getDuration());
      return;
    }

    const duration = this.videoManager.getDuration();
    const targetTime = Math.max(0, Math.min(time, duration));
    this.requestedTime = targetTime;

    if (!this.isScrubbing) {
      this.isScrubbing = true;
      this.emit('scrubStart');
    }

    if (this.rvfId !== null) {
      video.cancelVideoFrameCallback(this.rvfId);
    }

    this.rvfId = video.requestVideoFrameCallback((_frameTime, _metadata) => {
      this.rvfId = null;
      this.executeSeekRVF();
    });
  }

  private executeSeekRVF(): void {
    if (this.isSeeking) return;

    this.isSeeking = true;
    this.currentSeekTime = this.requestedTime;

    this.videoManager.seekTo(this.currentSeekTime).then(() => {
      this.isSeeking = false;
      this.emit('seek', this.currentSeekTime);
      this.emit('frameUpdate', this.currentSeekTime);

      if (this.requestedTime !== this.currentSeekTime) {
        this.requestSeekRVF(this.requestedTime);
      }
    }).catch(() => {
      this.isSeeking = false;
    });
  }

  seekToProgress(progress: number): void {
    this.requestSeek(progress);
  }

  seekToTime(time: number): void {
    const duration = this.videoManager.getDuration();
    if (duration > 0) {
      this.requestSeek(time / duration);
    }
  }

  nudge(deltaSeconds: number): void {
    const currentTime = this.videoManager.getCurrentTime();
    const duration = this.videoManager.getDuration();
    const newTime = Math.max(0, Math.min(currentTime + deltaSeconds, duration));
    this.requestSeek(newTime / duration);
  }

  endScrub(): void {
    if (this.isScrubbing) {
      this.isScrubbing = false;
      this.emit('scrubEnd');
    }
  }

  isCurrentlyScrubbing(): boolean {
    return this.isScrubbing;
  }

  isCurrentlySeeking(): boolean {
    return this.isSeeking;
  }

  getRequestedTime(): number {
    return this.requestedTime;
  }

  getCurrentSeekTime(): number {
    return this.currentSeekTime;
  }

  setConfig(config: Partial<ScrubberConfig>): void {
    this.config = { ...this.config, ...config };
    this.useRVF = this.config.useRequestVideoFrameCallback && 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.rvfId !== null) {
      this.videoManager.getVideoElement().cancelVideoFrameCallback(this.rvfId);
      this.rvfId = null;
    }
    this.removeAllListeners();
  }
}