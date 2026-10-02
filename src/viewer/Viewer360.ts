import * as THREE from 'three';
import { EventEmitter } from '../utils/EventEmitter';
import { VideoManager } from '../video/VideoManager';
import { ViewerConfig, Capabilities, EventMap } from '../types';

export interface Viewer360Events extends EventMap {
  resize: { width: number; height: number };
  render: void;
  error: Error;
  ready: void;
}

export class Viewer360 extends EventEmitter<Viewer360Events> {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sphere: THREE.Mesh;
  private videoManager: VideoManager;
  private videoTexture: THREE.VideoTexture | null = null;
  private config: ViewerConfig;
  private capabilities: Capabilities;
  private animationId: number | null = null;
  private isRendering = false;
  private lastResizeTime = 0;
  private pixelRatio = 1;
  private fovTarget = 75;
  private fovCurrent = 75;

  constructor(container: HTMLElement, videoManager: VideoManager, config?: Partial<ViewerConfig>, capabilities?: Capabilities) {
    super();
    this.container = container;
    this.videoManager = videoManager;
    this.config = {
      fov: 75,
      minFov: 30,
      maxFov: 100,
      autoRotate: false,
      autoRotateSpeed: 0.0005,
      ...config
    };
    this.capabilities = capabilities || {} as Capabilities;
    this.fovTarget = this.config.fov;
    this.fovCurrent = this.config.fov;

    this.renderer = this.createRenderer();
    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.sphere = this.createSphere();

    this.setupVideoTexture();
    this.setupResizeHandler();
    this.startRenderLoop();
  }

  private createRenderer(): THREE.WebGLRenderer {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    this.container.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false
    });

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = false;

    return renderer;
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    const camera = new THREE.PerspectiveCamera(this.config.fov, aspect, 0.1, 1000);
    camera.position.set(0, 0, 0.1);
    return camera;
  }

  private createSphere(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    const material = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: false
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.rotation.y = Math.PI;
    this.scene.add(sphere);
    return sphere;
  }

  private setupVideoTexture(): void {
    const video = this.videoManager.getVideoElement();

    this.videoTexture = new THREE.VideoTexture(video);
    this.videoTexture.colorSpace = THREE.SRGBColorSpace;
    this.videoTexture.minFilter = THREE.LinearFilter;
    this.videoTexture.magFilter = THREE.LinearFilter;
    this.videoTexture.generateMipmaps = false;
    this.videoTexture.flipY = false;

    const material = this.sphere.material as THREE.MeshBasicMaterial;
    material.map = this.videoTexture;
    material.needsUpdate = true;

    this.videoManager.on('canplay', () => {
      this.emit('ready');
    });

    this.videoManager.on('error', (err) => {
      this.emit('error', err);
    });
  }

  private setupResizeHandler(): void {
    const resizeObserver = new ResizeObserver(() => this.handleResize());
    resizeObserver.observe(this.container);

    window.addEventListener('resize', () => this.handleResize());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.handleResize(), 100);
    });
  }

  private handleResize(): void {
    const now = performance.now();
    if (now - this.lastResizeTime < 100) return;
    this.lastResizeTime = now;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.capabilities.gpuTier === 'low' ? 1.5 : 2);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(this.pixelRatio);

    this.emit('resize', { width, height });
  }

  private startRenderLoop(): void {
    this.isRendering = true;
    const render = () => {
      if (!this.isRendering) return;
      this.animationId = requestAnimationFrame(render);
      this.renderFrame();
    };
    render();
  }

  private renderFrame(): void {
    if (this.config.autoRotate) {
      this.sphere.rotation.y += this.config.autoRotateSpeed;
    }

    this.fovCurrent = THREE.MathUtils.lerp(this.fovCurrent, this.fovTarget, 0.1);
    this.camera.fov = this.fovCurrent;
    this.camera.updateProjectionMatrix();

    this.renderer.render(this.scene, this.camera);
    this.emit('render');
  }

  setOrientation(theta: number, phi: number): void {
    const target = new THREE.Vector3();
    target.x = Math.sin(phi) * Math.sin(theta);
    target.y = Math.cos(phi);
    target.z = Math.sin(phi) * Math.cos(theta);
    this.camera.lookAt(target);
  }

  getCameraQuaternion(): THREE.Quaternion {
    return this.camera.quaternion.clone();
  }

  setCameraQuaternion(q: THREE.Quaternion): void {
    this.camera.quaternion.copy(q);
  }

  rotateCamera(deltaX: number, deltaY: number): void {
    const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion);
    euler.y -= deltaX;
    euler.x -= deltaY;
    euler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, euler.x));
    this.camera.quaternion.setFromEuler(euler);
  }

  setFov(fov: number): void {
    this.fovTarget = THREE.MathUtils.clamp(fov, this.config.minFov, this.config.maxFov);
  }

  getFov(): number {
    return this.fovCurrent;
  }

  getTargetFov(): number {
    return this.fovTarget;
  }

  setAutoRotate(enabled: boolean): void {
    this.config.autoRotate = enabled;
  }

  setAutoRotateSpeed(speed: number): void {
    this.config.autoRotateSpeed = speed;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getSphere(): THREE.Mesh {
    return this.sphere;
  }

  getPixelRatio(): number {
    return this.pixelRatio;
  }

  setPixelRatio(ratio: number): void {
    this.pixelRatio = Math.min(ratio, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(this.pixelRatio);
  }

  pause(): void {
    this.isRendering = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resume(): void {
    if (!this.isRendering) {
      this.startRenderLoop();
    }
  }

  dispose(): void {
    this.pause();
    this.videoTexture?.dispose();
    this.sphere.geometry.dispose();
    (this.sphere.material as THREE.Material).dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    const canvas = this.renderer.domElement;
    canvas.remove();
    this.removeAllListeners();
  }
}