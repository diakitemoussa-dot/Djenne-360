import { EventEmitter } from '../utils/EventEmitter';
import { VideoManager } from './VideoManager';
import { ScrubberConfig, EventMap } from '../types';

export interface VideoScrubberEvents extends EventMap {
  seek: number;
  scrubStart: void;
  scrubEnd: void;
  frameUpdate: number;
  metrics: ScrubMetrics;
}

export interface ScrubMetrics {
  seekCount: number;
  actualSeekCount: number;
  totalSeekLatencyMs: number;
  avgSeekLatencyMs: number;
  lastSeekLatencyMs: number;
  targetTime: number;
  currentTime: number;
  delta: number;
  droppedFrames: number;
  totalFrames: number;
  fps: number;
  isUsingRVF: boolean;
}

export class VideoScrubber extends EventEmitter<VideoScrubberEvents> {
  private videoManager: VideoManager;
  private config: ScrubberConfig;
  private requestedTime: number = 0;
  private currentSeekTime: number = 0;
  private isSeeking: boolean = false;
  private isScrubbing: boolean = false;
  private lastFrameTime: number = 0;
  private rafId: number | null = null;
  private rvfId: number | null = null;
  private useRVF: boolean = false;

  // Metrics
  private seekCount: number = 0;
  private actualSeekCount: number = 0;
  private seekStartTime: number = 0;
  private totalSeekLatencyMs: number = 0;
  private lastSeekLatencyMs: number = 0;
  private lastFrameTimestamp: number = 0;
  private fps: number = 0;
  private lastPlaybackQuality: VideoPlaybackQuality | null = null;

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
    this.seekCount++;

    if (!this.isScrubbing) {
      this.isScrubbing = true;
      this.emit('scrubStart');
    }

    this.scheduleSeek();
  }

  private scheduleSeek(): void {
    const now = performance.now();
    const timeSinceLastFrame = now - this.lastFrameTime;

    if (timeSinceLastFrame < this.config.seekThrottleMs) {
      // Latest target wins - don't schedule if throttled, just wait for next execution
      return;
    }

    this.executeSeek();
  }

  private executeSeek(): void {
    if (this.isSeeking) {
      return;
    }

    this.isSeeking = true;
    this.currentSeekTime = this.requestedTime;
    this.seekStartTime = performance.now();
    this.actualSeekCount++;

    this.videoManager.seekTo(this.currentSeekTime).then(() => {
      const seekEndTime = performance.now();
      this.lastSeekLatencyMs = seekEndTime - this.seekStartTime;
      this.totalSeekLatencyMs += this.lastSeekLatencyMs;

      this.isSeeking = false;
      this.lastFrameTime = seekEndTime;
      this.emit('seek', this.currentSeekTime);
      this.emit('frameUpdate', this.currentSeekTime);
      this.emitMetrics();

      if (this.requestedTime !== this.currentSeekTime) {
        // Latest target wins - execute immediately if target moved
        this.executeSeek();
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
    this.seekCount++;

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
    this.seekStartTime = performance.now();
    this.actualSeekCount++;

    this.videoManager.seekTo(this.currentSeekTime).then(() => {
      const seekEndTime = performance.now();
      this.lastSeekLatencyMs = seekEndTime - this.seekStartTime;
      this.totalSeekLatencyMs += this.lastSeekLatencyMs;

      this.isSeeking = false;
      this.lastFrameTime = seekEndTime;
      this.emit('seek', this.currentSeekTime);
      this.emit('frameUpdate', this.currentSeekTime);
      this.emitMetrics();

      // Update playback quality metrics
      this.updatePlaybackQuality();

      if (this.requestedTime !== this.currentSeekTime) {
        this.requestSeekRVF(this.requestedTime);
      }
    }).catch(() => {
      this.isSeeking = false;
    });
  }

  private updatePlaybackQuality(): void {
    const video = this.videoManager.getVideoElement();
    if (video.getVideoPlaybackQuality) {
      this.lastPlaybackQuality = video.getVideoPlaybackQuality();
    }
  }

  private emitMetrics(): void {
    const video = this.videoManager.getVideoElement();
    const currentTime = video.currentTime;
    const delta = Math.abs(this.requestedTime - currentTime);
    const avgSeekLatency = this.actualSeekCount > 0 ? this.totalSeekLatencyMs / this.actualSeekCount : 0;

    // Calculate FPS
    const now = performance.now();
    if (this.lastFrameTimestamp > 0) {
      this.fps = 1000 / (now - this.lastFrameTimestamp);
    }
    this.lastFrameTimestamp = now;

    let droppedFrames = 0;
    let totalFrames = 0;
    if (this.lastPlaybackQuality) {
      droppedFrames = this.lastPlaybackQuality.droppedVideoFrames;
      totalFrames = this.lastPlaybackQuality.totalVideoFrames;
    }

    const metrics: ScrubMetrics = {
      seekCount: this.seekCount,
      actualSeekCount: this.actualSeekCount,
      totalSeekLatencyMs: this.totalSeekLatencyMs,
      avgSeekLatencyMs: avgSeekLatency,
      lastSeekLatencyMs: this.lastSeekLatencyMs,
      targetTime: this.requestedTime,
      currentTime: currentTime,
      delta,
      droppedFrames,
      totalFrames: totalFrames,
      fps: this.fps,
      isUsingRVF: this.useRVF
    };

    this.emit('metrics', metrics);
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