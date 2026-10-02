import { EventEmitter } from '../utils/EventEmitter';
import * as THREE from 'three';
import { Viewer360 } from '../viewer/Viewer360';
import { MouseController } from '../input/MouseController';
import { TouchController } from '../input/TouchController';
import { KeyboardController } from '../input/KeyboardController';
import { DeviceOrientationController } from '../input/DeviceOrientationController';
import { InteractionMode, EventMap } from '../types';

export interface CameraControllerEvents extends EventMap {
  modeChange: InteractionMode;
  rotate: { deltaX: number; deltaY: number };
  seek: { delta: number };
  playPause: void;
  muteToggle: void;
  fullscreen: void;
  modeToggle: void;
  gyroPermissionChange: { granted: boolean };
  gyroError: Error;
}

export class CameraController extends EventEmitter<CameraControllerEvents> {
  private viewer: Viewer360;
  private mouseController: MouseController;
  private touchController: TouchController;
  private keyboardController: KeyboardController;
  private gyroController: DeviceOrientationController;
  private mode: InteractionMode = 'exploration';
  private gyroEnabled = false;

  constructor(viewer: Viewer360, container: HTMLElement) {
    super();
    this.viewer = viewer;

    this.mouseController = new MouseController(container);
    this.touchController = new TouchController(container);
    this.keyboardController = new KeyboardController();
    this.gyroController = new DeviceOrientationController();

    this.bindEvents();
  }

  private bindEvents(): void {
    this.mouseController.on('rotate', e => {
      if (this.mode === 'exploration') {
        this.viewer.rotateCamera(e.deltaX, e.deltaY);
        this.emit('rotate', e);
      }
    });

    this.mouseController.on('zoom', e => {
      if (this.mode === 'exploration') {
        this.viewer.setFov(this.viewer.getTargetFov() + e.delta);
      }
    });

    this.mouseController.on('modeChange', mode => {
      this.setMode(mode);
    });

    this.touchController.on('rotate', e => {
      if (this.mode === 'exploration') {
        this.viewer.rotateCamera(e.deltaX, e.deltaY);
        this.emit('rotate', e);
      }
    });

    this.touchController.on('zoom', e => {
      if (this.mode === 'exploration') {
        this.viewer.setFov(this.viewer.getTargetFov() + e.delta);
      }
    });

    this.touchController.on('modeChange', mode => {
      this.setMode(mode);
    });

    this.keyboardController.on('rotate', e => {
      if (this.mode === 'exploration') {
        this.viewer.rotateCamera(e.deltaX, e.deltaY);
      }
    });

    this.keyboardController.on('zoom', e => {
      if (this.mode === 'exploration') {
        this.viewer.setFov(this.viewer.getTargetFov() + e.delta);
      }
    });

    this.keyboardController.on('seek', e => {
      this.emit('seek', e);
    });

    this.keyboardController.on('playPause', () => {
      this.emit('playPause');
    });

    this.keyboardController.on('muteToggle', () => {
      this.emit('muteToggle');
    });

    this.keyboardController.on('fullscreen', () => {
      this.emit('fullscreen');
    });

    this.keyboardController.on('modeToggle', () => {
      this.setMode(this.mode === 'exploration' ? 'timeline' : 'exploration');
    });

    this.gyroController.on('orientationChange', e => {
      if (this.gyroEnabled && this.mode === 'exploration') {
        this.applyGyroOrientation(e);
      }
    });

    this.gyroController.on('permissionChange', e => {
      this.emit('gyroPermissionChange', e);
    });

    this.gyroController.on('error', e => {
      this.emit('gyroError', e);
    });
  }

  private applyGyroOrientation(e: { alpha: number; beta: number; gamma: number }): void {
    const alpha = THREE.MathUtils.degToRad(e.alpha);
    const beta = THREE.MathUtils.degToRad(e.beta);
    const gamma = THREE.MathUtils.degToRad(e.gamma);

    const q = new THREE.Quaternion();
    q.setFromEuler(new THREE.Euler(-beta, -alpha, -gamma, 'YXZ'));
    this.viewer.setCameraQuaternion(q);
  }

  async enableGyro(useAbsolute = false): Promise<boolean> {
    if (this.gyroEnabled) return true;
    const granted = await this.gyroController.requestPermission();
    if (granted) {
      this.gyroController.start(useAbsolute);
      this.gyroEnabled = true;
    }
    return granted;
  }

  disableGyro(): void {
    this.gyroController.stop();
    this.gyroEnabled = false;
  }

  isGyroActive(): boolean {
    return this.gyroEnabled && this.gyroController.isActive();
  }

  calibrateGyro(): void {
    this.gyroController.calibrate();
  }

  setMode(mode: InteractionMode): void {
    this.mode = mode;
    this.mouseController.setMode(mode);
    this.touchController.setMode(mode);
    this.emit('modeChange', mode);
  }

  getMode(): InteractionMode {
    return this.mode;
  }

  toggleMode(): void {
    this.setMode(this.mode === 'exploration' ? 'timeline' : 'exploration');
  }

  setGyroEnabled(enabled: boolean): void {
    if (enabled) {
      this.enableGyro();
    } else {
      this.disableGyro();
    }
  }

  destroy(): void {
    this.mouseController.destroy();
    this.touchController.destroy();
    this.keyboardController.destroy();
    this.gyroController.destroy();
    this.removeAllListeners();
  }
}