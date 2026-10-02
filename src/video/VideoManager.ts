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
  private initialTime = 0;

  constructor(initialTime = 0) {
    super();
    this.initialTime = initialTime;
    this.video = this.createVideoElement();
    this.setupEventListeners();
  }

  private createVideoElement(): HTMLVideoElement {
    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    video.preload = 'auto';
    video.disableRemotePlayback = true;
    return video;
  }

  private logVideoState(label: string): void {
    const v = this.video;
    console.log(`[VIDEO DEBUG] ${label}`);
    console.log(`  src: ${v.src}`);
    console.log(`  readyState: ${v.readyState} (${this.readyStateToString(v.readyState)})`);
    console.log(`  networkState: ${v.networkState} (${this.networkStateToString(v.networkState)})`);
    console.log(`  duration: ${v.duration}`);
    console.log(`  currentTime: ${v.currentTime}`);
    console.log(`  videoWidth: ${v.videoWidth}`);
    console.log(`  videoHeight: ${v.videoHeight}`);
    console.log(`  error: ${v.error ? v.error.message : 'null'}`);
    console.log(`  error.code: ${v.error ? v.error.code : 'N/A'}`);
    console.log(`  paused: ${v.paused}`);
    console.log(`  muted: ${v.muted}`);
    console.log(`  ended: ${v.ended}`);
    console.log(`  buffered: ${v.buffered.length > 0 ? v.buffered.end(v.buffered.length - 1) : 0}`);
  }

  private readyStateToString(state: number): string {
    const states = ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'];
    return states[state] || 'UNKNOWN';
  }

  private networkStateToString(state: number): string {
    const states = ['NETWORK_EMPTY', 'NETWORK_IDLE', 'NETWORK_LOADING', 'NETWORK_NO_SOURCE'];
    return states[state] || 'UNKNOWN';
  }

  private setupEventListeners(): void {
    this.video.addEventListener('loadstart', () => {
      console.log('[VIDEO EVENT] loadstart');
      this.logVideoState('loadstart');
      this.setState('loading');
    });

    this.video.addEventListener('loadedmetadata', () => {
      console.log('[VIDEO EVENT] loadedmetadata');
      this.logVideoState('loadedmetadata');
      console.log(`  >>> DURATION: ${this.video.duration}s`);
      console.log(`  >>> RESOLUTION: ${this.video.videoWidth}x${this.video.videoHeight}`);
      this.onLoadedMetadata();
    });

    this.video.addEventListener('loadeddata', () => {
      console.log('[VIDEO EVENT] loadeddata');
      this.logVideoState('loadeddata');
      this.onLoadedData();
    });

    this.video.addEventListener('canplay', () => {
      console.log('[VIDEO EVENT] canplay');
      this.logVideoState('canplay');
      console.log('>>> VIDEO CANPLAY OK');
      this.onCanPlay();
    });

    this.video.addEventListener('canplaythrough', () => {
      console.log('[VIDEO EVENT] canplaythrough');
      this.logVideoState('canplaythrough');
      this.setState('ready');
    });

    this.video.addEventListener('progress', () => {
      console.log('[VIDEO EVENT] progress');
      this.onProgress();
    });

    this.video.addEventListener('durationchange', () => {
      console.log('[VIDEO EVENT] durationchange');
      this.logVideoState('durationchange');
      this.emit('durationchange', this.video.duration);
    });

    this.video.addEventListener('loaded', () => {
      console.log('[VIDEO EVENT] loaded');
      this.logVideoState('loaded');
    });

    this.video.addEventListener('waiting', () => {
      console.log('[VIDEO EVENT] waiting');
      this.setState('buffering');
    });

    this.video.addEventListener('stalled', () => {
      console.log('[VIDEO EVENT] stalled');
      this.setState('buffering');
    });

    this.video.addEventListener('seeking', () => {
      console.log('[VIDEO EVENT] seeking');
      this.isSeeking = true;
    });

    this.video.addEventListener('seeked', () => {
      console.log('[VIDEO EVENT] seeked');
      this.onSeeked();
    });

    this.video.addEventListener('ended', () => {
      console.log('[VIDEO EVENT] ended');
      this.setState('ended');
      this.emit('ended');
    });

    this.video.addEventListener('error', () => {
      console.log('[VIDEO EVENT] error');
      this.onError();
    });

    this.video.addEventListener('abort', () => {
      console.log('[VIDEO EVENT] abort');
      this.onError();
    });

    this.video.addEventListener('stalled', () => {
      console.log('[VIDEO EVENT] stalled (duplicate)');
      this.setState('buffering');
    });

    this.video.addEventListener('play', () => {
      console.log('[VIDEO EVENT] play');
      this.setState('playing');
    });

    this.video.addEventListener('pause', () => {
      console.log('[VIDEO EVENT] pause');
      this.setState('paused');
    });

    this.video.addEventListener('playing', () => {
      console.log('[VIDEO EVENT] playing');
    });

    this.video.addEventListener('timeupdate', () => {
      this.emit('timeupdate', this.video.currentTime);
    });

    this.video.addEventListener('durationchange', () => {
      this.emit('durationchange', this.video.duration);
    });
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
    if (this.initialTime > 0 && this.video.duration >= this.initialTime) {
      // Use a small delay to ensure the video is stable before seeking
      setTimeout(() => {
        if (this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          this.video.currentTime = this.initialTime;
        }
      }, 0);
    }
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
    
    // No actual error (code 0 = MEDIA_ERR_NONE), ignore
    if (!error || error.code === 0) {
      return;
    }

    // MEDIA_ERR_ABORTED often happens during normal seek/load operations, not fatal
    if (error.code === MediaError.MEDIA_ERR_ABORTED) {
      console.debug('Video load aborted (likely seek/load transition), ignoring');
      return;
    }

    let code: VideoError['code'] = 'UNKNOWN';
    let recoverable = false;

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