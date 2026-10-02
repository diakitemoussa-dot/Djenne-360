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
  private videoUrl = '/Djenne-360/Djenne_360.mp4';
  private _isFullscreen = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.videoManager = new VideoManager(8);
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
    // Create only the start screen and loading screen initially
    // Full UIManager with controllers will be created in startExperience()
    this.createStartScreen();
    this.createLoadingScreen();
  }

  private createStartScreen(): void {
    const startScreen = document.createElement('div');
    startScreen.id = 'start-screen';
    startScreen.className = 'screen';
    startScreen.innerHTML = `
      <div class="start-content">
        <div class="logo">${this.getExploreIcon(80)}</div>
        <h1>Djenné 360°</h1>
        <p class="subtitle">Explorez la grande mosquée de Djenné en vidéo immersive 360°</p>
        <p class="duration">Durée : 3 min 30</p>
        <button id="start-btn" class="btn btn-primary" aria-label="Démarrer l'expérience 360°">Commencer l'expérience</button>
      </div>
    `;
    this.container.appendChild(startScreen);
    
    startScreen.querySelector('#start-btn')?.addEventListener('click', () => this.startExperience());
  }

  private createLoadingScreen(): void {
    const loadingScreen = document.createElement('div');
    loadingScreen.id = 'loading-screen';
    loadingScreen.className = 'screen hidden';
    loadingScreen.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner">${this.getLoadingIcon(48)}</div>
        <h2>Chargement de l'expérience</h2>
        <div class="progress-bar"><div id="loading-progress" class="progress-fill"></div></div>
        <p id="loading-percent" class="loading-percent">0%</p>
        <p id="loading-info" class="loading-info">Préparation de la vidéo...</p>
      </div>
    `;
    this.container.appendChild(loadingScreen);
  }

  private getExploreIcon(size: number): string {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`;
  }

  private getLoadingIcon(size: number): string {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="30 60" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle></svg>`;
  }

  private async startExperience(): Promise<void> {
    if (this.viewer) return;

    const startScreen = this.container.querySelector('#start-screen');
    startScreen?.classList.add('hidden');

    const loadingScreen = this.container.querySelector('#loading-screen');
    loadingScreen?.classList.remove('hidden');

    const viewerContainer = document.createElement('div');
    viewerContainer.id = 'viewer-container';
    viewerContainer.className = 'viewer-container';
    this.container.appendChild(viewerContainer);

    this.viewer = new Viewer360(viewerContainer, this.videoManager, {
      fov: 75,
      minFov: 30,
      maxFov: 100,
      autoRotate: false,
      autoRotateSpeed: 0.0005
    }, this.capabilities!);

    this.viewer.on('error', (err) => {
      console.error('Viewer error:', err);
      this.uiManager?.showError('Erreur de rendu 3D: ' + err.message);
      loadingScreen?.classList.add('hidden');
    });

    this.viewer.on('ready', () => {
      console.log('Viewer ready');
    });

    this.cameraController = new CameraController(this.viewer, viewerContainer);
    this.timelineController = new TimelineController(this.container, this.videoManager, this.videoScrubber);

    this.uiManager = new UIManager(
      this.container,
      this.videoManager,
      this.videoScrubber,
      this.cameraController,
      this.timelineController,
      this.capabilities!
    );

    this.bindUIEvents();

    this.videoManager.on('error', (err) => {
      console.error('Video error:', err);
      this.uiManager?.showError('Erreur vidéo: ' + err.message);
      loadingScreen?.classList.add('hidden');
    });

    // Wait for viewer to be ready before playing
    await new Promise<void>((resolve) => {
      if (this.viewer!.getVideoTexture()) {
        resolve();
      } else {
        this.viewer!.once('ready', resolve);
      }
    });

    // Wait for video to have enough data to play smoothly
    console.log('Waiting for video canplay...');
    const video = this.videoManager.getVideoElement();
    console.log('Video element:', video);
    console.log('Video readyState:', video.readyState);
    console.log('Video src:', video.src);
    console.log('Video duration:', video.duration);
    console.log('Video networkState:', video.networkState);
    console.log('Video error:', video.error);

    if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      console.log('Video already has enough data');
    } else {
      await new Promise<void>((resolve) => {
        video.addEventListener('canplay', () => {
          console.log('canplay fired, readyState:', video.readyState);
          resolve();
        }, { once: true });
        // Timeout fallback
        setTimeout(() => {
          console.log('Timeout waiting for canplay, resolving anyway');
          resolve();
        }, 10000);
      });
    }

    loadingScreen?.classList.add('hidden');
    try {
      console.log('Starting video playback...');
      console.log('Video paused:', video.paused);
      console.log('Video muted:', video.muted);
      console.log('Video currentTime:', video.currentTime);
      await this.videoManager.play();
      console.log('Video playing successfully');
      console.log('Video paused after play:', video.paused);
    } catch (err) {
      console.error('Play failed:', err);
      this.uiManager?.showError('Impossible de lire la vidéo: ' + (err as Error).message);
    }
  }

  private bindUIEvents(): void {
    if (!this.uiManager || !this.cameraController || !this.timelineController) return;

    // Camera controller events
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

    // UI Manager events
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