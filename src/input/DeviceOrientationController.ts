import { EventEmitter } from '../utils/EventEmitter';
import * as THREE from 'three';
import { EventMap } from '../types';

export interface DeviceOrientationControllerEvents extends EventMap {
  orientationChange: { alpha: number; beta: number; gamma: number; absolute: boolean };
  permissionChange: { granted: boolean };
  error: Error;
}

type DeviceOrientationEventType = 'deviceorientation' | 'deviceorientationabsolute';

export class DeviceOrientationController extends EventEmitter<DeviceOrientationControllerEvents> {
  private hasPermission = false;
  private isListening = false;
  private alphaOffset = 0;
  private lastAlpha = 0;
  private lastBeta = 0;
  private lastGamma = 0;
  private smoothingFactor = 0.15;
  private useAbsolute = false;
  private listener: ((event: DeviceOrientationEvent) => void) | null = null;

  constructor() {
    super();
  }

  async requestPermission(): Promise<boolean> {
    const DOR = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<PermissionState> };
    if (typeof DOR.requestPermission === 'function') {
      try {
        const permission = await DOR.requestPermission!();
        this.hasPermission = permission === 'granted';
      } catch (e) {
        this.hasPermission = false;
        this.emit('error', e as Error);
      }
    } else {
      this.hasPermission = true;
    }
    this.emit('permissionChange', { granted: this.hasPermission });
    return this.hasPermission;
  }

  start(useAbsolute = false): void {
    if (this.isListening) return;
    const DOR = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<PermissionState> };
    if (!this.hasPermission && typeof DOR.requestPermission === 'function') {
      this.requestPermission().then(granted => {
        if (granted) this.startListening(useAbsolute);
      });
      return;
    }
    this.startListening(useAbsolute);
  }

  private startListening(useAbsolute: boolean): void {
    this.useAbsolute = useAbsolute;
    this.listener = this.onDeviceOrientation.bind(this);
    const eventType: DeviceOrientationEventType = useAbsolute ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(eventType, this.listener);
    this.isListening = true;
  }

  private onDeviceOrientation(event: DeviceOrientationEvent): void {
    if (event.alpha === null || event.beta === null || event.gamma === null) return;

    let alpha = event.alpha;
    const beta = event.beta;
    const gamma = event.gamma;

    if (this.useAbsolute && event.absolute) {
      alpha = alpha - this.alphaOffset;
    } else {
      alpha = alpha - this.alphaOffset;
    }

    const smoothedAlpha = THREE.MathUtils.lerp(this.lastAlpha, alpha, this.smoothingFactor);
    const smoothedBeta = THREE.MathUtils.lerp(this.lastBeta, beta, this.smoothingFactor);
    const smoothedGamma = THREE.MathUtils.lerp(this.lastGamma, gamma, this.smoothingFactor);

    this.lastAlpha = smoothedAlpha;
    this.lastBeta = smoothedBeta;
    this.lastGamma = smoothedGamma;

    this.emit('orientationChange', {
      alpha: smoothedAlpha,
      beta: smoothedBeta,
      gamma: smoothedGamma,
      absolute: event.absolute ?? false
    });
  }

  stop(): void {
    if (this.listener) {
      const eventType: DeviceOrientationEventType = this.useAbsolute ? 'deviceorientationabsolute' : 'deviceorientation';
      window.removeEventListener(eventType, this.listener);
      this.listener = null;
      this.isListening = false;
    }
  }

  setAlphaOffset(offset: number): void {
    this.alphaOffset = offset;
  }

  calibrate(): void {
    this.alphaOffset = this.lastAlpha;
  }

  setSmoothing(factor: number): void {
    this.smoothingFactor = Math.max(0.01, Math.min(1, factor));
  }

  isActive(): boolean {
    return this.isListening;
  }

  hasOrientationPermission(): boolean {
    return this.hasPermission;
  }

  destroy(): void {
    this.stop();
    this.removeAllListeners();
  }
}