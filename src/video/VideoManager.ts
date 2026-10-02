import { EventEmitter } from '../utils/EventEmitter';
import { VideoMetadata, VideoState, VideoError, VideoQuality, EventMap } from '../types';

export interface VideoManagerEvents extends EventMap {
  statechange: VideoState;
  timeupdate: number;
  durationchange: number;
  progress: number;
  error: VideoError;
  loadedmetadata: VideoMetadata;
  qualitychange: VideoQuality;
  waiting: void;
  canplay: void;
  ended: void;
}

export class VideoManager extends EventEmitter<VideoManagerEvents> {
  private video: HTMLVideoElement;
  private state: VideoState = 'idle';
  private qualities: VideoQuality[] = [];
  private currentQualityIndex = 0;
  private metadata: VideoMetadata | null = null;
  private pendingSeekTime: number | null = null;
  private isSeeking = false;
  private seekResolve: ((value: void) => void) | null = null;
  private lastBufferedEnd = 0;

  constructor() {
    super();
    this.video = this.createVideoElement();
    this.setupEventListeners();
  }

  private createVideoElement(): HTMLVideoElement {
    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    video.disableRemotePlayback = true;
    return video;
  }

  private setupEventListeners(): void {
    this.video.addEventListener('loadstart', () => this.setState('loading'));
    this.video.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
    this.video.addEventListener('loadeddata', () => this.onLoadedData());
    this.video.addEventListener('canplay', () => this.onCanPlay());
    this.video.addEventListener('canplaythrough', () => this.setState('ready'));
    this.video.addEventListener('play', () => this.setState('playing'));
    this.video.addEventListener('pause', () => this.setState('paused'));
    this.video.addEventListener('timeupdate', () => this.emit('timeupdate', this.video.currentTime));
    this.video.addEventListener('durationchange', () => this.emit('durationchange', this.video.duration));
    this.video.addEventListener('progress', () => this.onProgress());
    this.video.addEventListener('waiting', () => this.setState('buffering'));
    this.video.addEventListener('seeking', () => { this.isSeeking = true; });
    this.video.addEventListener('seeked', () => this.onSeeked());
    this.video.addEventListener('ended', () => { this.setState('ended'); this.emit('ended'); });
    this.video.addEventListener('error', () => this.onError());
    this.video.addEventListener('abort', () => this.onError());
    this.video.addEventListener('stalled', () => this.setState('buffering'));
  }

  private onLoadedMetadata(): void {
    this.metadata = {
      duration: this.video.duration,
      width: this.video.videoWidth,
      height: this.video.videoHeight,
      fps: 30,
      codec: 'h264',
      bitrate: 0,
      hasAudio: true,
    };
    this.emit('loadedmetadata', this.metadata);
  }

  private onLoadedData(): void {
    this.setState('ready');
  }

  private onCanPlay(): void {
    this.emit('canplay');
  }

  private onProgress(): void {
    const buffered = this.video.buffered;
    if (buffered.length > 0) {
      const end = buffered.end(buffered.length - 1);
      if (end !== this.lastBufferedEnd) {
        this.lastBufferedEnd = end;
        const progress = this.video.duration > 0 ? end / this.video.duration : 0;
        this.emit('progress', Math.min(1, progress));
      }
    }
  }

  private onSeeked(): void {
    this.isSeeking = false;
    if (this.seekResolve) {
      this.seekResolve(undefined);
      this.seekResolve = null;
    }
    if (this.pendingSeekTime !== null) {
      const target = this.pendingSeekTime;
      this.pendingSeekTime = null;
      this.seekTo(target);
    }
  }

  private onError(): void {
    const error = this.video.error;
    let code: VideoError['code'] = 'UNKNOWN';
    let recoverable = false;

    if (error) {
      switch (error.code) {
        case MediaError.MEDIA_ERR_NETWORK:
          code = 'NETWORK_ERROR';
          recoverable = true;
          break;
        case MediaError.MEDIA_ERR_DECODE:
          code = 'DECODE_ERROR';
          recoverable = false;
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          code = 'NOT_SUPPORTED';
          recoverable = false;
          break;
        case MediaError.MEDIA_ERR_ABORTED:
          code = 'NETWORK_ERROR';
          recoverable = true;
          break;
      }
    }

    const videoError: VideoError = new Error(error?.message || 'Video error') as VideoError;
    videoError.code = code;
    videoError.recoverable = recoverable;

    this.setState('error');
    this.emit('error', videoError);
  }

  private setState(state: VideoState): void {
    if (this.state !== state) {
      this.state = state;
      this.emit('statechange', state);
    }
  }

  async load(url: string, qualities?: VideoQuality[]): Promise<void> {
    this.setState('loading');
    this.qualities = qualities || [{ label: 'Original', url, width: 1280, height: 640, bitrate: 1500000 }];
    this.currentQualityIndex = 0;
    this.video.src = this.qualities[0].url;
    this.video.load();
  }

  play(): Promise<void> {
    if (this.state === 'error') return Promise.reject(new Error('Video in error state'));
    return this.video.play().catch(err => {
      if (err.name === 'NotAllowedError') {
        this.video.muted = true;
        return this.video.play();
      }
      throw err;
    });
  }

  pause(): void {
    this.video.pause();
  }

  togglePlay(): void {
    if (this.video.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  seekTo(time: number): Promise<void> {
    const clampedTime = Math.max(0, Math.min(time, this.video.duration || 0));

    if (this.isSeeking) {
      this.pendingSeekTime = clampedTime;
      return new Promise(resolve => { this.seekResolve = resolve; });
    }

    this.isSeeking = true;
    this.video.currentTime = clampedTime;

    return new Promise(resolve => {
      this.seekResolve = resolve;
      if (!this.isSeeking) {
        resolve();
      }
    });
  }

  setCurrentTime(time: number): void {
    this.video.currentTime = Math.max(0, Math.min(time, this.video.duration || 0));
  }

  getCurrentTime(): number {
    return this.video.currentTime;
  }

  getDuration(): number {
    return this.video.duration;
  }

  getBufferedRanges(): TimeRanges {
    return this.video.buffered;
  }

  getState(): VideoState {
    return this.state;
  }

  getVideoElement(): HTMLVideoElement {
    return this.video;
  }

  setMuted(muted: boolean): void {
    this.video.muted = muted;
  }

  getMuted(): boolean {
    return this.video.muted;
  }

  setVolume(volume: number): void {
    this.video.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume(): number {
    return this.video.volume;
  }

  setPlaybackRate(rate: number): void {
    this.video.playbackRate = rate;
  }

  getPlaybackRate(): number {
    return this.video.playbackRate;
  }

  setQuality(index: number): void {
    if (index >= 0 && index < this.qualities.length && index !== this.currentQualityIndex) {
      const currentTime = this.video.currentTime;
      const wasPlaying = !this.video.paused;
      this.currentQualityIndex = index;
      this.video.src = this.qualities[index].url;
      this.video.load();
      this.video.addEventListener('loadedmetadata', () => {
        this.video.currentTime = currentTime;
        if (wasPlaying) this.video.play();
      }, { once: true });
      this.emit('qualitychange', this.qualities[index]);
    }
  }

  getQualities(): VideoQuality[] {
    return this.qualities;
  }

  getCurrentQuality(): VideoQuality {
    return this.qualities[this.currentQualityIndex];
  }

  getMetadata(): VideoMetadata | null {
    return this.metadata;
  }

  destroy(): void {
    this.video.pause();
    this.video.src = '';
    this.video.load();
    this.removeAllListeners();
  }
}