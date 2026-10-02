import { VideoManager } from '../video/VideoManager';
import { VideoScrubber } from '../video/VideoScrubber';
import { Viewer360 } from '../viewer/Viewer360';
import { CameraController } from '../controls/CameraController';
import { TimelineController } from '../controls/TimelineController';
import { UIManager } from '../ui/UIManager';
import { CapabilityDetector } from './CapabilityDetector';
import { Capabilities, PerformanceTier, VideoQuality } from '../types';

export class App {
  private container: HTMLElement;
  private videoManager: VideoManager;
  private videoScrubber: VideoScrubber;
  private viewer: Viewer360 | null = null;
  private cameraController: CameraController | null = null;
  private timelineController: TimelineController | null = null;
  private uiManager: UIManager | null = null;
  private capabilities: Capabilities | null = null;
  private performanceTier: PerformanceTier | null = null;
  private isInitialized = false;
  private videoUrl = '/Djenne_360.mp4';
  private _isFullscreen = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.videoManager = new VideoManager();
    this.videoScrubber = new VideoScrubber(this.videoManager);
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.detectCapabilities();
      this.setupVideo();
      this.createUI();
      this.bindGlobalEvents();
      this.setupDebugMode();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.uiManager?.showError('Impossible d\'initialiser l\'application');
    }
  }

  private async detectCapabilities(): Promise<void> {
    const detector = CapabilityDetector.getInstance();
    this.capabilities = await detector.detect();
    this.performanceTier = detector.getPerformanceTier();

    console.log('Capabilities:', this.capabilities);
    console.log('Performance Tier:', this.performanceTier);
  }

  private setupVideo(): void {
    const qualities: VideoQuality[] = [
      { label: 'Original (1280x640)', url: this.videoUrl, width: 1280, height: 640, bitrate: 1500000 }
    ];

    if (this.performanceTier?.videoQuality === 'low') {
      qualities.push({ label: 'Low (640x320)', url: this.videoUrl, width: 640, height: 320, bitrate: 500000 });
    } else if (this.performanceTier?.videoQuality === 'medium') {
      qualities.push({ label: 'Medium (960x480)', url: this.videoUrl, width: 960, height: 480, bitrate: 1000000 });
    }

    this.videoManager.load(this.videoUrl, qualities);
  }

  private createUI(): void {
    this.uiManager = new UIManager(
      this.container,
      this.videoManager,
      this.videoScrubber,
      this.cameraController!,
      this.timelineController!,
      this.capabilities!,
      this.performanceTier!
    );
  }

  private async startExperience(): Promise<void> {
    if (this.viewer) return;

    const viewerContainer = this.uiManager!.getViewerContainer();
    if (!viewerContainer) return;

    this.viewer = new Viewer360(viewerContainer, this.videoManager, {
      fov: 75,
      minFov: 30,
      maxFov: 100,
      autoRotate: false,
      autoRotateSpeed: 0.0005
    }, this.capabilities!);

    this.cameraController = new CameraController(this.viewer, viewerContainer);
    this.timelineController = new TimelineController(this.container, this.videoManager, this.videoScrubber);

    this.uiManager = new UIManager(
      this.container,
      this.videoManager,
      this.videoScrubber,
      this.cameraController,
      this.timelineController,
      this.capabilities!,
      this.performanceTier!
    );

    this.bindControllerEvents();
    await this.videoManager.play();
  }

  private bindControllerEvents(): void {
    if (!this.cameraController || !this.timelineController || !this.uiManager) return;

    this.cameraController.on('seek', (e) => {
      this.timelineController!.nudge(e.delta);
    });

    this.cameraController.on('playPause', () => {
      if (this.videoManager.getState() === 'playing') {
        this.videoManager.pause();
      } else {
        this.videoManager.play();
      }
    });

    this.cameraController.on('muteToggle', () => {
      const muted = !this.videoManager.getMuted();
      this.videoManager.setMuted(muted);
      this.uiManager!.setMuteState(muted);
    });

    this.cameraController.on('fullscreen', () => {
      this.toggleFullscreen();
    });

    this.cameraController.on('modeToggle', () => {
      this.cameraController!.toggleMode();
    });

    this.cameraController.on('modeChange', (mode) => {
      this.uiManager!.updateModeUI(mode);
    });

    this.cameraController.on('gyroPermissionChange', (e) => {
      this.uiManager!.setGyroState(e.granted);
    });

    this.cameraController.on('gyroError', () => {
      this.uiManager!.setGyroState(false);
    });

    this.uiManager.on('startExperience', () => this.startExperience());
    this.uiManager.on('playPause', () => {
      if (this.videoManager.getState() === 'playing') {
        this.videoManager.pause();
      } else {
        this.videoManager.play();
      }
    });
    this.uiManager.on('muteToggle', () => {
      const muted = !this.videoManager.getMuted();
      this.videoManager.setMuted(muted);
      this.uiManager!.setMuteState(muted);
    });
    this.uiManager.on('fullscreenToggle', () => this.toggleFullscreen());
    this.uiManager.on('modeChange', (mode) => this.cameraController?.setMode(mode));
    this.uiManager.on('gyroToggle', () => {
      if (this.cameraController?.isGyroActive()) {
        this.cameraController.disableGyro();
        this.uiManager!.setGyroState(false);
      } else {
        this.cameraController?.enableGyro().then(granted => {
          this.uiManager!.setGyroState(granted);
        });
      }
    });
    this.uiManager.on('debugToggle', () => this.showDebugPanel());

    this.videoManager.on('statechange', (state) => {
      this.uiManager!.setPlayPauseState(state === 'playing');
    });
  }

  private bindGlobalEvents(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.viewer?.pause();
      } else {
        this.viewer?.resume();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._isFullscreen) {
        this.exitFullscreen();
      }
    });
  }

  private setupDebugMode(): void {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') {
      setTimeout(() => this.showDebugPanel(), 1000);
    }
  }

  private showDebugPanel(): void {
    if (!this.uiManager) return;

    const info = {
      userAgent: navigator.userAgent,
      capabilities: this.capabilities,
      performanceTier: this.performanceTier,
      video: {
        duration: this.videoManager.getDuration(),
        currentTime: this.videoManager.getCurrentTime(),
        state: this.videoManager.getState(),
        muted: this.videoManager.getMuted(),
        volume: this.videoManager.getVolume(),
        buffered: this.getBufferedRanges()
      },
      renderer: this.viewer ? {
        pixelRatio: this.viewer.getPixelRatio(),
        fov: this.viewer.getFov(),
        targetFov: this.viewer.getTargetFov()
      } : null,
      mode: this.cameraController?.getMode()
    };

    this.uiManager.showDebugPanel(info);
  }

  private async toggleFullscreen(): Promise<void> {
    if (!this._isFullscreen) {
      await this.enterFullscreen();
    } else {
      await this.exitFullscreen();
    }
  }

  private async enterFullscreen(): Promise<void> {
    try {
      const elem = this.container;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as HTMLElement & { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen) {
        await (elem as HTMLElement & { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
      }
      this._isFullscreen = true;
      this.uiManager?.setFullscreenState(true);
    } catch (e) {
      console.warn('Fullscreen failed:', e);
    }
  }

  private async exitFullscreen(): Promise<void> {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as Document & { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen) {
        await (document as Document & { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
      }
      this._isFullscreen = false;
      this.uiManager?.setFullscreenState(false);
    } catch (e) {
      console.warn('Exit fullscreen failed:', e);
    }
  }

  getVideoManager(): VideoManager {
    return this.videoManager;
  }

  getViewer(): Viewer360 | null {
    return this.viewer;
  }

  getCameraController(): CameraController | null {
    return this.cameraController;
  }

  getTimelineController(): TimelineController | null {
    return this.timelineController;
  }

  getUIManager(): UIManager | null {
    return this.uiManager;
  }

  getCapabilities(): Capabilities | null {
    return this.capabilities;
  }

  getPerformanceTier(): PerformanceTier | null {
    return this.performanceTier;
  }

  private getBufferedRanges(): { start: number; end: number }[] {
    const ranges = this.videoManager.getBufferedRanges();
    const result: { start: number; end: number }[] = [];
    for (let i = 0; i < ranges.length; i++) {
      result.push({ start: ranges.start(i), end: ranges.end(i) });
    }
    return result;
  }

  destroy(): void {
    this.viewer?.dispose();
    this.cameraController?.destroy();
    this.timelineController?.destroy();
    this.videoScrubber.destroy();
    this.videoManager.destroy();
    this.uiManager?.destroy();
    this.isInitialized = false;
  }
}