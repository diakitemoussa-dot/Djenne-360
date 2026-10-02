export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate: number;
  hasAudio: boolean;
  audioCodec?: string;
  audioChannels?: number;
  audioSampleRate?: number;
}

export interface VideoQuality {
  label: string;
  url: string;
  width: number;
  height: number;
  bitrate: number;
}

export type VideoState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'error' | 'ended';

export interface VideoError extends Error {
  code: 'NETWORK_ERROR' | 'DECODE_ERROR' | 'NOT_SUPPORTED' | 'NOT_FOUND' | 'UNKNOWN';
  recoverable: boolean;
}

export interface Capabilities {
  webgl: boolean;
  webgl2: boolean;
  webxr: boolean;
  immersiveAR: boolean;
  deviceOrientation: boolean;
  camera: boolean;
  videoTexture: boolean;
  requestVideoFrameCallback: boolean;
  intersectionObserver: boolean;
  fullscreen: boolean;
  touch: boolean;
  pointerEvents: boolean;
  passiveEvents: boolean;
  memory?: number;
  gpuTier?: 'high' | 'medium' | 'low';
}

export interface PerformanceTier {
  tier: 'high' | 'medium' | 'low';
  pixelRatio: number;
  maxFPS: number;
  enablePostProcessing: boolean;
  videoQuality: 'high' | 'medium' | 'low';
}

export interface ScrubberConfig {
  maxSeekAhead: number;
  seekThrottleMs: number;
  useRequestVideoFrameCallback: boolean;
}

export interface ViewerConfig {
  fov: number;
  minFov: number;
  maxFov: number;
  autoRotate: boolean;
  autoRotateSpeed: number;
}

export type InteractionMode = 'exploration' | 'timeline';

export interface UIVisibilityState {
  timeline: boolean;
  controls: boolean;
  info: boolean;
}

export interface EventMap extends Record<string, unknown> {}

declare global {
  interface Navigator {
    xr?: XRSystem;
  }

  interface DeviceOrientationEvent {
    requestPermission(): Promise<PermissionState>;
  }

  interface XRSystem {
    isSessionSupported(mode: string): Promise<boolean>;
  }

  interface ImportMeta {
    readonly env: {
      readonly BASE_URL: string;
      readonly MODE: string;
      readonly DEV: boolean;
      readonly PROD: boolean;
      readonly SSR: boolean;
    };
  }
}