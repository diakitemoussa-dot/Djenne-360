import { EventEmitter } from '../utils/EventEmitter';
import { VideoManager } from '../video/VideoManager';
import { VideoScrubber } from '../video/VideoScrubber';
import { CameraController } from '../controls/CameraController';
import { TimelineController } from '../controls/TimelineController';
import { Capabilities, InteractionMode, EventMap } from '../types';
import { createElement, createButton, createIcon } from './UIElements';

export interface UIManagerEvents extends EventMap {
  playPause: void;
  muteToggle: void;
  fullscreenToggle: void;
  modeChange: InteractionMode;
  gyroToggle: void;
  qualityChange: number;
  debugToggle: void;
  startExperience: void;
  errorDismiss: void;
}

export class UIManager extends EventEmitter<UIManagerEvents> {
  private container: HTMLElement;
  private videoManager: VideoManager;
  private cameraController: CameraController | null = null;
  private timelineController: TimelineController | null = null;
  private capabilities: Capabilities;

  private mainUI: HTMLElement | null = null;
  private timelineProgress: HTMLElement | null = null;
  private timelineHandle: HTMLElement | null = null;
  private currentTimeEl: HTMLElement | null = null;
  private durationEl: HTMLElement | null = null;
  private progressPercentEl: HTMLElement | null = null;
  private scrubTimeEl: HTMLElement | null = null;
  private playPauseBtn: HTMLButtonElement | null = null;
  private muteBtn: HTMLButtonElement | null = null;
  private fullscreenBtn: HTMLButtonElement | null = null;
  private gyroBtn: HTMLButtonElement | null = null;
  private exploreBtn: HTMLButtonElement | null = null;
  private timelineBtn: HTMLButtonElement | null = null;
  private errorOverlay: HTMLElement | null = null;
  private debugPanel: HTMLElement | null = null;
  private hideUITimeout: number | null = null;
  private uiVisible = true;
  private mainUICreated = false;

  constructor(
    container: HTMLElement,
    videoManager: VideoManager,
    _videoScrubber: VideoScrubber,
    cameraController: CameraController | null,
    timelineController: TimelineController | null,
    capabilities: Capabilities
  ) {
    super();
    this.container = container;
    this.videoManager = videoManager;
    this.cameraController = cameraController;
    this.timelineController = timelineController;
    this.capabilities = capabilities;

    // Don't create screens here - App handles start/loading screens
    // Main UI will be created when controllers are available
  }

  setControllers(cameraController: CameraController, timelineController: TimelineController): void {
    this.cameraController = cameraController;
    this.timelineController = timelineController;
    if (!this.mainUICreated) {
      this.createMainUI();
      this.bindEvents();
      this.mainUICreated = true;
    }
  }

  private createMainUI(): void {
    this.mainUI = createElement('div', {
      id: 'main-ui',
      className: 'main-ui hidden',
      children: [
        createElement('div', { id: 'viewer-container', className: 'viewer-container' }),
        createElement('div', { id: 'timeline-container', className: 'timeline-container', children: [
          createElement('div', { className: 'timeline-track', children: [
            createElement('div', { id: 'timeline-progress', className: 'timeline-progress' }),
            createElement('div', { id: 'timeline-handle', className: 'timeline-handle', attributes: { role: 'slider', 'aria-label': 'Position dans la vidéo', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' } })
          ]}),
          createElement('div', { className: 'timeline-labels', children: [
            createElement('span', { id: 'current-time', className: 'time-label', text: '0:00' }),
            createElement('span', { id: 'progress-percent', className: 'progress-percent', text: '0%' }),
            createElement('span', { id: 'duration', className: 'time-label', text: '3:30' })
          ]})
        ]}),
        createElement('div', { id: 'scrub-indicator', className: 'scrub-indicator hidden', children: [
          createElement('span', { id: 'scrub-time', className: 'scrub-time', text: '0:00' }),
          createElement('div', { className: 'scrub-arrow', text: '↑' })
        ]}),
        createElement('div', { id: 'controls', className: 'controls', children: [
          createElement('div', { className: 'controls-left', children: [
            this.playPauseBtn = createButton('', () => this.emit('playPause'), { id: 'play-pause-btn', ariaLabel: 'Lecture/Pause', className: 'icon-btn' }),
            this.muteBtn = createButton('', () => this.emit('muteToggle'), { id: 'mute-btn', ariaLabel: 'Muet/Activer le son', className: 'icon-btn' })
          ]}),
          createElement('div', { className: 'controls-center', children: [
            this.exploreBtn = createButton('', () => this.emit('modeChange', 'exploration'), { id: 'explore-btn', ariaLabel: 'Mode exploration', className: 'icon-btn active', title: 'Explorer (E)' }),
            this.timelineBtn = createButton('', () => this.emit('modeChange', 'timeline'), { id: 'timeline-btn', ariaLabel: 'Mode timeline', className: 'icon-btn', title: 'Timeline (T)' })
          ]}),
          createElement('div', { className: 'controls-right', children: [
            this.gyroBtn = createButton('', () => this.emit('gyroToggle'), { id: 'gyro-btn', ariaLabel: 'Gyroscope', className: 'icon-btn', disabled: !this.capabilities.deviceOrientation, title: 'Gyroscope (G)' }),
            this.fullscreenBtn = createButton('', () => this.emit('fullscreenToggle'), { id: 'fullscreen-btn', ariaLabel: 'Plein écran', className: 'icon-btn', title: 'Plein écran (F)' })
          ]})
        ]}),
        createElement('div', { id: 'debug-toggle', className: 'debug-toggle', children: [
          createButton('Debug', () => this.emit('debugToggle'), { id: 'debug-btn', className: 'btn-text', ariaLabel: 'Ouvrir le panneau de debug' })
        ]})
      ]
    });
    this.container.appendChild(this.mainUI);

    this.updateControlIcons();
    this.setupTimelineInteraction();
  }

  private setupTimelineInteraction(): void {
    const track = this.mainUI?.querySelector('.timeline-track') as HTMLElement;
    if (!track || !this.timelineController) return;

    track.addEventListener('click', (e) => {
      const rect = track.getBoundingClientRect();
      const progress = (e.clientX - rect.left) / rect.width;
      this.timelineController!.seekToProgress(Math.max(0, Math.min(1, progress)));
    });

    let isDragging = false;
    this.timelineHandle?.addEventListener('mousedown', (e) => {
      isDragging = true;
      e.stopPropagation();
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('mouseup', onDragEnd);
    });

    const onDrag = (e: MouseEvent) => {
      if (!isDragging || !this.timelineController) return;
      const rect = track.getBoundingClientRect();
      const progress = (e.clientX - rect.left) / rect.width;
      this.timelineController.seekToProgress(Math.max(0, Math.min(1, progress)));
    };

    const onDragEnd = () => {
      isDragging = false;
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', onDragEnd);
    };
  }

  private bindEvents(): void {
    this.videoManager.on('statechange', (state) => this.onVideoStateChange(state));
    this.videoManager.on('loadedmetadata', (meta) => this.onMetadataLoaded(meta));
    this.videoManager.on('progress', (progress) => this.onBufferProgress(progress));
    this.videoManager.on('error', (err) => this.onVideoError(err));

    this.timelineController?.on('progressChange', (progress) => this.updateTimeline(progress));
    this.timelineController?.on('timeChange', (time) => this.updateTimeDisplay(time));
    this.timelineController?.on('scrubStart', () => this.showScrubIndicator());
    this.timelineController?.on('scrubEnd', () => this.hideScrubIndicator());
    this.timelineController?.on('seekComplete', (time) => this.updateScrubTime(time));

    this.cameraController?.on('modeChange', (mode) => this.updateModeUI(mode));
    this.cameraController?.on('gyroPermissionChange', (e) => this.updateGyroButton(e.granted));
    this.cameraController?.on('gyroError', () => this.updateGyroButton(false));
  }

  private onVideoStateChange(state: string): void {
    this.updatePlayPauseButton(state === 'playing');
    if (state === 'error') {
      this.showError('Erreur de lecture vidéo');
    }
  }

  private onMetadataLoaded(meta: { duration: number }): void {
    if (this.durationEl) {
      this.durationEl.textContent = formatTime(meta.duration);
    }
  }

  private onBufferProgress(_progress: number): void {
    // Loading progress handled by App directly
  }

  private onVideoError(err: { message: string }): void {
    this.showError(err.message);
  }

  private updateTimeline(progress: number): void {
    if (this.timelineProgress) this.timelineProgress.style.width = `${progress * 100}%`;
    if (this.timelineHandle) {
      this.timelineHandle.style.left = `${progress * 100}%`;
      this.timelineHandle.setAttribute('aria-valuenow', Math.round(progress * 100).toString());
    }
    if (this.progressPercentEl) this.progressPercentEl.textContent = `${Math.round(progress * 100)}%`;
  }

  private updateTimeDisplay(time: number): void {
    if (this.currentTimeEl) this.currentTimeEl.textContent = formatTime(time);
  }

  private showScrubIndicator(): void {
    this.scrubTimeEl?.classList.remove('hidden');
  }

  private hideScrubIndicator(): void {
    this.scrubTimeEl?.classList.add('hidden');
  }

  private updateScrubTime(time: number): void {
    if (this.scrubTimeEl) this.scrubTimeEl.textContent = formatTime(time);
  }

  updateModeUI(mode: InteractionMode): void {
    this.exploreBtn?.classList.toggle('active', mode === 'exploration');
    this.timelineBtn?.classList.toggle('active', mode === 'timeline');
    this.mainUI?.classList.toggle('mode-timeline', mode === 'timeline');
    this.mainUI?.classList.toggle('mode-exploration', mode === 'exploration');
  }

  private updatePlayPauseButton(playing: boolean): void {
    if (!this.playPauseBtn) return;
    this.playPauseBtn.innerHTML = '';
    this.playPauseBtn.appendChild(createIcon(playing ? 'pause' : 'play', 24));
    this.playPauseBtn.setAttribute('aria-label', playing ? 'Pause' : 'Lecture');
  }

  private updateMuteButton(muted: boolean): void {
    if (!this.muteBtn) return;
    this.muteBtn.innerHTML = '';
    this.muteBtn.appendChild(createIcon(muted ? 'volumeOff' : 'volume', 24));
    this.muteBtn.setAttribute('aria-label', muted ? 'Activer le son' : 'Muet');
  }

  private updateFullscreenButton(fullscreen: boolean): void {
    if (!this.fullscreenBtn) return;
    this.fullscreenBtn.innerHTML = '';
    this.fullscreenBtn.appendChild(createIcon(fullscreen ? 'fullscreenExit' : 'fullscreen', 24));
    this.fullscreenBtn.setAttribute('aria-label', fullscreen ? 'Quitter le plein écran' : 'Plein écran');
  }

  private updateGyroButton(enabled: boolean): void {
    if (!this.gyroBtn) return;
    this.gyroBtn.innerHTML = '';
    this.gyroBtn.appendChild(createIcon(enabled ? 'gyro' : 'gyroOff', 24));
    this.gyroBtn.classList.toggle('active', enabled);
    this.gyroBtn.disabled = !this.capabilities.deviceOrientation;
    this.gyroBtn.setAttribute('aria-label', enabled ? 'Désactiver gyroscope' : 'Activer gyroscope');
  }

  private updateControlIcons(): void {
    this.playPauseBtn?.appendChild(createIcon('play', 24));
    this.muteBtn?.appendChild(createIcon('volume', 24));
    this.fullscreenBtn?.appendChild(createIcon('fullscreen', 24));
    this.exploreBtn?.appendChild(createIcon('explore', 24));
    this.timelineBtn?.appendChild(createIcon('timeline', 24));
    this.gyroBtn?.appendChild(createIcon('gyroOff', 24));
  }

  setPlayPauseState(playing: boolean): void {
    this.updatePlayPauseButton(playing);
  }

  setMuteState(muted: boolean): void {
    this.updateMuteButton(muted);
  }

  setFullscreenState(fullscreen: boolean): void {
    this.updateFullscreenButton(fullscreen);
  }

  setGyroState(enabled: boolean): void {
    this.updateGyroButton(enabled);
  }

  showError(message: string): void {
    if (this.errorOverlay) this.errorOverlay.remove();

    this.errorOverlay = createElement('div', {
      className: 'error-overlay',
      children: [
        createElement('div', { className: 'error-content', children: [
          createIcon('close', 48),
          createElement('h3', { text: 'Erreur' }),
          createElement('p', { text: message }),
          createElement('div', { className: 'error-actions', children: [
            createButton('Réessayer', () => { this.errorOverlay?.remove(); this.emit('startExperience'); }, { className: 'btn-primary' }),
            createButton('Ignorer', () => { this.errorOverlay?.remove(); }, { className: 'btn-secondary' })
          ]})
        ]})
      ]
    });
    this.container.appendChild(this.errorOverlay);
  }

  showDebugPanel(info: Record<string, unknown>): void {
    if (this.debugPanel) this.debugPanel.remove();

    this.debugPanel = createElement('div', {
      id: 'debug-panel',
      className: 'debug-panel',
      children: [
        createElement('div', { className: 'debug-header', children: [
          createElement('h3', { text: 'Debug Info' }),
          createButton('', () => this.debugPanel?.remove(), { className: 'icon-btn', ariaLabel: 'Fermer' }).appendChild(createIcon('close', 20))
        ]}),
        createElement('div', { className: 'debug-content', children: [
          createElement('pre', { text: JSON.stringify(info, null, 2) })
        ]})
      ]
    });
    this.container.appendChild(this.debugPanel);
  }

  hideDebugPanel(): void {
    this.debugPanel?.remove();
    this.debugPanel = null;
  }

  scheduleUIHide(): void {
    if (this.hideUITimeout) clearTimeout(this.hideUITimeout);
    this.hideUITimeout = window.setTimeout(() => {
      this.hideUI();
    }, 3000);
  }

  showUI(): void {
    this.uiVisible = true;
    this.mainUI?.classList.remove('ui-hidden');
    this.scheduleUIHide();
  }

  hideUI(): void {
    this.uiVisible = false;
    this.mainUI?.classList.add('ui-hidden');
  }

  toggleUI(): void {
    if (this.uiVisible) this.hideUI(); else this.showUI();
  }

  getViewerContainer(): HTMLElement {
    return this.mainUI?.querySelector('#viewer-container') as HTMLElement;
  }

  destroy(): void {
    if (this.hideUITimeout) clearTimeout(this.hideUITimeout);
    this.mainUI?.remove();
    this.errorOverlay?.remove();
    this.debugPanel?.remove();
    this.removeAllListeners();
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}