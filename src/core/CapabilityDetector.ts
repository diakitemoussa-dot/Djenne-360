import { Capabilities, PerformanceTier } from '../types';

export class CapabilityDetector {
  private static instance: CapabilityDetector;
  private capabilities: Capabilities | null = null;
  private performanceTier: PerformanceTier | null = null;

  static getInstance(): CapabilityDetector {
    if (!CapabilityDetector.instance) {
      CapabilityDetector.instance = new CapabilityDetector();
    }
    return CapabilityDetector.instance;
  }

  async detect(): Promise<Capabilities> {
    if (this.capabilities) return this.capabilities;

    const caps: Capabilities = {
      webgl: false,
      webgl2: false,
      webxr: false,
      immersiveAR: false,
      deviceOrientation: false,
      camera: false,
      videoTexture: true,
      requestVideoFrameCallback: 'requestVideoFrameCallback' in HTMLVideoElement.prototype,
      intersectionObserver: 'IntersectionObserver' in window,
      fullscreen: this.checkFullscreenSupport(),
      touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      pointerEvents: 'PointerEvent' in window,
      passiveEvents: this.checkPassiveEvents(),
    };

    caps.webgl = this.checkWebGLSupport();
    caps.webgl2 = this.checkWebGL2Support();
    caps.webxr = 'xr' in navigator;
    caps.immersiveAR = await this.checkImmersiveARSupport();
    caps.deviceOrientation = this.checkDeviceOrientationSupport();
    caps.camera = await this.checkCameraSupport();
    caps.memory = this.getDeviceMemory();
    caps.gpuTier = this.estimateGPUTier();

    this.capabilities = caps;
    return caps;
  }

  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  private checkWebGL2Support(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('webgl2');
    } catch {
      return false;
    }
  }

  private async checkImmersiveARSupport(): Promise<boolean> {
    if (!('xr' in navigator)) return false;
    try {
      const xr = (navigator as Navigator & { xr: XRSystem }).xr;
      return await xr.isSessionSupported('immersive-ar');
    } catch {
      return false;
    }
  }

  private checkDeviceOrientationSupport(): boolean {
    const hasPermission = typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<PermissionState> }).requestPermission === 'function';
    return 'DeviceOrientationEvent' in window && (hasPermission || 'ondeviceorientation' in window);
  }

  private async checkCameraSupport(): Promise<boolean> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  private checkFullscreenSupport(): boolean {
    return 'requestFullscreen' in document.documentElement ||
      'webkitRequestFullscreen' in document.documentElement ||
      'msRequestFullscreen' in document.documentElement;
  }

  private checkPassiveEvents(): boolean {
    let passive = false;
    const options = {
      get passive() {
        passive = true;
        return false;
      }
    };
    window.addEventListener('test', () => {}, options as EventListenerOptions);
    window.removeEventListener('test', () => {});
    return passive;
  }

  private getDeviceMemory(): number | undefined {
    if ('deviceMemory' in navigator) {
      return (navigator as Navigator & { deviceMemory: number }).deviceMemory;
    }
    return undefined;
  }

  private estimateGPUTier(): 'high' | 'medium' | 'low' {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return 'low';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const rendererStr = (renderer || '') + (vendor || '');

      if (/adreno|mali|powervr|videocore|angle/i.test(rendererStr)) return 'low';
      if (/intel/i.test(rendererStr) && !/iris|arc/i.test(rendererStr)) return 'low';
      if (/nvidia|geforce|rtx|gtx|amd|radeon|rx /i.test(rendererStr)) return 'high';
    }

    const memory = this.getDeviceMemory();
    if (memory && memory >= 8) return 'high';
    if (memory && memory >= 4) return 'medium';
    return 'low';
  }

  getPerformanceTier(): PerformanceTier {
    if (this.performanceTier) return this.performanceTier;

    const caps = this.capabilities || this.detect() as unknown as Capabilities;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let tier: PerformanceTier;

    if (caps.gpuTier === 'high' && !isMobile && (caps.memory || 0) >= 8) {
      tier = {
        tier: 'high',
        pixelRatio: Math.min(dpr, 2),
        maxFPS: 60,
        enablePostProcessing: true,
        videoQuality: 'high'
      };
    } else if (caps.gpuTier === 'low' || isMobile || (caps.memory || 0) < 4) {
      tier = {
        tier: 'low',
        pixelRatio: Math.min(dpr, 1.5),
        maxFPS: 30,
        enablePostProcessing: false,
        videoQuality: 'low'
      };
    } else {
      tier = {
        tier: 'medium',
        pixelRatio: Math.min(dpr, 2),
        maxFPS: 60,
        enablePostProcessing: false,
        videoQuality: 'medium'
      };
    }

    this.performanceTier = tier;
    return tier;
  }

  getCapabilities(): Capabilities | null {
    return this.capabilities;
  }

  supportsWebXR(): boolean {
    return this.capabilities?.webxr ?? false;
  }

  supportsImmersiveAR(): boolean {
    return this.capabilities?.immersiveAR ?? false;
  }

  supportsDeviceOrientation(): boolean {
    return this.capabilities?.deviceOrientation ?? false;
  }
}