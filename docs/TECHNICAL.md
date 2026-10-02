# Technical Documentation

## System Overview

Djenne 360° Experience is a modular, TypeScript-based web application for immersive 360° video playback. The architecture follows a component-based design with clear separation of concerns.

## Core Components

### 1. CapabilityDetector (`src/core/CapabilityDetector.ts`)

Detects browser capabilities at runtime:
- WebGL / WebGL2 support
- WebXR (immersive-ar, immersive-vr)
- DeviceOrientation API (with iOS permission handling)
- Camera API
- requestVideoFrameCallback
- Touch/Pointer events
- Device memory estimation
- GPU tier estimation (via renderer string)

Returns `Capabilities` object and calculates `PerformanceTier`:
- **High**: Desktop, ≥8GB RAM, discrete GPU → pixelRatio up to 2, 60fps target
- **Medium**: Mid-range → pixelRatio up to 2, 60fps target
- **Low**: Mobile, <4GB RAM, integrated GPU → pixelRatio up to 1.5, 30fps target

### 2. VideoManager (`src/video/VideoManager.ts`)

Wraps `HTMLVideoElement` with:
- State machine: `idle → loading → ready → playing/paused/buffering/ended/error`
- Event-driven API (extends EventEmitter)
- Quality switching support
- Muted autoplay compliance
- Buffered range tracking
- Error categorization (NETWORK_ERROR, DECODE_ERROR, NOT_SUPPORTED, NOT_FOUND)

Key methods:
- `load(url, qualities?)`
- `play()` / `pause()` / `togglePlay()`
- `seekTo(time)` - returns Promise, handles concurrent seeks
- `setCurrentTime(time)` - direct set without Promise
- `setMuted()` / `setVolume()` / `setPlaybackRate()`

### 3. VideoScrubber (`src/video/VideoScrubber.ts`)

High-performance scrubbing scheduler:
- **Request coalescing**: Only latest `requestedTime` is acted upon
- **Throttling**: Minimum 16ms between seeks (configurable)
- **requestVideoFrameCallback**: Uses native API when available for frame-perfect sync
- **Fallback**: `requestAnimationFrame` + `video.currentTime` polling
- **State tracking**: `isSeeking`, `isScrubbing`, `pendingSeek`

Flow:
```
requestSeek(progress) → requestedTime = target
  → scheduleSeek() (throttled)
    → executeSeek() → videoManager.seekTo()
      → on seeked → emit('seek', time) → check requestedTime again
```

### 4. Viewer360 (`src/viewer/Viewer360.ts`)

Three.js scene setup:
- **SphereGeometry**: 500 radius, 60x40 segments, inverted scale (-1,1,1) for inside viewing
- **MeshBasicMaterial**: `side: BackSide`, `depthWrite: false`, `toneMapped: false`
- **VideoTexture**: SRGBColorSpace, LinearFilter, no mipmaps
- **Camera**: PerspectiveCamera at origin (0,0,0.1), FOV 75° default
- **Renderer**: WebGLRenderer, ACESFilmicToneMapping, SRGB output, high-performance power preference

Render loop:
```typescript
renderFrame() {
  if (autoRotate) sphere.rotation.y += speed;
  fovCurrent = lerp(fovCurrent, fovTarget, 0.1);
  camera.fov = fovCurrent;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
}
```

### 5. CameraController (`src/controls/CameraController.ts`)

Unifies all input modes:
- **MouseController**: Drag to rotate, wheel to zoom
- **TouchController**: Drag to rotate, pinch to zoom, vertical swipe for timeline
- **KeyboardController**: Arrow keys, PageUp/Down, Space, M, F, T, Home/End
- **DeviceOrientationController**: Gyroscope with smoothing (lerp factor 0.15)

Interaction modes:
- **Exploration**: Rotate camera via drag/gyro
- **Timeline**: Vertical input controls video scrubber

### 6. TimelineController (`src/controls/TimelineController.ts`)

Maps vertical displacement → video progress:
- **Wheel**: ±1% per notch
- **Touch drag**: ΔY / viewportHeight = progress delta
- **Keyboard**: Arrow keys ±5s, PageUp/Down ±30s
- Emits `progressChange` (0-1), `timeChange` (seconds)

### 7. UIManager (`src/ui/UIManager.ts`)

Screen management:
- **Start Screen**: Title, description, start button
- **Loading Screen**: Progress bar, percentage, info text
- **Main UI**: Viewer canvas, timeline bar, scrub indicator, control buttons
- **Error Overlay**: Retry/Ignore actions
- **Debug Panel**: JSON dump of system state

Auto-hide: UI fades after 3s of inactivity, shows on any interaction.

## Data Flow

```
User Input (scroll/touch/drag)
    ↓
Input Controller (Mouse/Touch/Keyboard/Gyro)
    ↓
CameraController / TimelineController
    ↓
TimelineController: progress → VideoScrubber.requestSeek()
    ↓
VideoScrubber: throttled → VideoManager.seekTo()
    ↓
VideoManager: video.currentTime = time → 'seeked' event
    ↓
VideoTexture updates automatically (native)
    ↓
Viewer360 render loop: draws new frame
```

## Performance Optimizations

1. **Pixel Ratio Capping**: Based on performance tier (1.5-2.0)
2. **No Post-Processing**: No bloom, SSAO, shadows
3. **Single VideoTexture**: No frame copying or intermediate canvases
4. **Throttled Seeks**: 16ms minimum interval
5. **requestVideoFrameCallback**: Frame-aligned seeks when available
6. **Reduced Geometry**: Sphere only, no extra meshes
7. **Material Reuse**: Single MeshBasicMaterial
8. **Renderer Settings**: `preserveDrawingBuffer: false`, `failIfMajorPerformanceCaveat: false`
9. **Visibility Handling**: Pause render loop when tab hidden

## PWA Implementation

- **Manifest**: Auto-generated with icons, fullscreen display
- **Service Worker**: Workbox `generateSW`
- **Caching Strategy**: 
  - Static assets: CacheFirst
  - Video: NetworkOnly (not cached to save space)
- **Offline**: App shell cached, video streams from network

## Error Handling

Each component emits typed error events:
- `VideoManager`: `error` with `VideoError` (code, recoverable)
- `DeviceOrientationController`: `error` with permission denial
- `UIManager`: Shows error overlay with retry option

Debug mode (`?debug=true`) exposes full system state.

## Video Format Requirements

- **Projection**: Equirectangular (2:1 aspect ratio)
- **Codec**: H.264 (AVC) for maximum compatibility
- **Container**: MP4
- **Resolution**: 1280x640 minimum, 1920x960 recommended
- **Framerate**: 30 or 60 fps
- **Keyframe Interval**: ≤2 seconds for smooth scrubbing
- **Audio**: AAC, stereo (optional but recommended)

## Extending for AR

The architecture supports future AR features:
1. `CapabilityDetector` already checks `immersiveAR`
2. `CameraController` has gyro abstraction
3. `Viewer360` can be swapped for AR renderer
4. Add `ARController` in `controls/` for hit-testing, anchors
5. Add 3D model loading in `viewer/`

No AR code runs unless `immersiveAR` is supported and user consents.