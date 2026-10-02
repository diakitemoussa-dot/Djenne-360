# Djenne 360° Experience

An immersive 360° video web experience of the Great Mosque of Djenné, Mali. Built with Three.js, TypeScript, and Vite.

## Features

- **360° Video Playback**: Explore the video in all directions using mouse, touch, or device orientation
- **Vertical Scroll Timeline**: Control video progression with vertical scroll/swipe
- **High-performance Scrubbing**: Optimized seek scheduler using `requestVideoFrameCallback` when available
- **Device Orientation/Gyroscope**: Use phone movement to explore on mobile devices
- **Adaptive Quality**: Automatically selects video quality based on device capabilities
- **PWA Support**: Installable as a Progressive Web App
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Accessibility**: Keyboard navigation, ARIA labels, reduced motion support

## Architecture

```
src/
├── core/
│   ├── App.ts              # Main application orchestrator
│   └── CapabilityDetector.ts  # Browser capability detection
├── video/
│   ├── VideoManager.ts     # HTMLVideoElement wrapper with state management
│   └── VideoScrubber.ts    # High-performance scrubbing scheduler
├── viewer/
│   └── Viewer360.ts        # Three.js 360° sphere renderer
├── controls/
│   ├── CameraController.ts # Unified input handling (mouse, touch, keyboard, gyro)
│   └── TimelineController.ts # Vertical scroll → video time mapping
├── input/
│   ├── MouseController.ts  # Mouse drag, wheel, click
│   ├── TouchController.ts  # Touch drag, pinch, scrub
│   ├── KeyboardController.ts # Arrow keys, space, shortcuts
│   └── DeviceOrientationController.ts # Gyroscope/device orientation
├── ui/
│   ├── UIManager.ts        # All UI screens and overlays
│   └── UIElements.ts       # Reusable UI component factories
├── utils/
│   ├── EventEmitter.ts     # Type-safe event emitter
│   └── math.ts             # Math utilities
├── types/
│   └── index.ts            # TypeScript interfaces
└── main.ts                 # Entry point
```

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Starts Vite dev server at http://localhost:3000

## Build

```bash
npm run build
```

Creates production build in `dist/` folder.

## Preview Production Build

```bash
npm run preview
```

## Type Checking

```bash
npm run typecheck
```

## Project Structure

- **Video**: `public/Djenne_360.mp4` (1280x640, 30fps, H.264, 3m30s, ~43MB)
- **Icons**: Auto-generated SVG icons in `public/`
- **Manifest**: Auto-generated PWA manifest
- **Service Worker**: Workbox-generated for offline support (video excluded from cache)

## Video Controls

### Desktop
- **Mouse drag**: Rotate view
- **Mouse wheel**: Zoom (FOV)
- **Vertical scroll**: Control video timeline
- **Arrow Up/Down**: Seek ±5s
- **Page Up/Down**: Seek ±30s
- **Space**: Play/Pause
- **M**: Mute toggle
- **F**: Fullscreen
- **T**: Toggle exploration/timeline mode
- **E**: Exploration mode
- **Home/End**: Jump to start/end

### Mobile
- **Touch drag**: Rotate view (exploration mode)
- **Vertical swipe**: Control video timeline (timeline mode)
- **Pinch**: Zoom (FOV)
- **Gyroscope button**: Enable device orientation
- **Double tap**: Toggle UI visibility

## Browser Compatibility

| Feature | Chrome Android | Safari iOS | Chrome Desktop | Edge | Firefox |
|---------|---------------|------------|----------------|------|---------|
| 360° Video | ✅ | ✅ | ✅ | ✅ | ✅ |
| Touch | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gyroscope | ✅* | ✅* | ❌ | ❌ | ❌ |
| WebGL | ✅ | ✅ | ✅ | ✅ | ✅ |
| WebXR AR | ✅** | ❌ | ❌ | ❌ | ❌ |
| Scrubbing | ✅ | ✅ | ✅ | ✅ | ✅ |

*Requires HTTPS and user permission
**Requires ARCore-supported device

## Limitations

### iOS
- DeviceOrientation requires user gesture to request permission
- No WebXR AR support (no ARKit integration)
- Autoplay policy requires muted video initially

### Video Seeking Precision
- H.264 keyframe intervals affect seek precision
- For frame-accurate scrubbing, re-encode with shorter GOP
- Current video: 30fps, keyframe interval unknown

## Deployment

Deploy the `dist/` folder to any static hosting:

- **Cloudflare Pages**: Connect repo, build command `npm run build`, output `dist`
- **Netlify**: Connect repo, build command `npm run build`, publish `dist`
- **Vercel**: Connect repo, auto-detects Vite
- **GitHub Pages**: Push `dist` to `gh-pages` branch
- **Any HTTPS static host**: Upload `dist` contents

Requires HTTPS for device orientation and PWA features.

## Video Replacement

1. Replace `public/Djenne_360.mp4` with new equirectangular video
2. Update video metadata in `src/video/VideoManager.ts` if resolution changes
3. Rebuild: `npm run build`

For optimal performance, use:
- Equirectangular projection (2:1 aspect ratio)
- H.264 codec (broad compatibility)
- 30fps or 60fps
- Keyframe every 1-2 seconds for smooth scrubbing
- Resolution: 1920x960 (high), 1280x640 (medium), 640x320 (low)

## Video Optimization Script

If ffmpeg is available, create optimized versions:

```bash
# High quality (original)
ffmpeg -i Djenne_360.mp4 -c:v libx264 -preset slow -crf 20 -g 30 -sc_threshold 0 -c:a aac -b:a 128k video-high.mp4

# Medium quality
ffmpeg -i Djenne_360.mp4 -vf scale=960:480 -c:v libx264 -preset slow -crf 23 -g 30 -sc_threshold 0 -c:a aac -b:a 96k video-medium.mp4

# Low quality (mobile)
ffmpeg -i Djenne_360.mp4 -vf scale=640:320 -c:v libx264 -preset fast -crf 28 -g 30 -sc_threshold 0 -c:a aac -b:a 64k video-low.mp4
```

Place in `public/` and update `VideoManager.ts` qualities array.

## Debug Mode

Add `?debug=true` to URL to open debug panel with:
- Browser/user agent info
- Detected capabilities
- Performance tier
- Video state and buffered ranges
- Renderer settings

## License

MIT License - See LICENSE file for details.

## Credits

- Video: Djenné Great Mosque 360° footage
- Three.js: 3D rendering
- Vite: Build tool
- Workbox: PWA service worker