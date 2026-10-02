import './style.css';
import { App } from './core/App';

declare global {
  interface Window {
    __DJENNE_APP__: App | null;
  }
}

// Debug modes
const debugMode = new URLSearchParams(window.location.search).get('debug');

if (debugMode === 'native') {
  runNativeVideoTest();
} else if (debugMode === '360') {
  run360Test();
} else if (debugMode === 'scrub') {
  runScrubTest();
} else {
  // Enable debug video overlay with ?debug=video
  if (debugMode === 'video') {
    (window as any).__DEBUG_VIDEO__ = true;
    console.log('Debug video mode enabled');
  }
  runMainApp();
}

async function runNativeVideoTest(): Promise<void> {
  const container = document.getElementById('app');
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#fff;font-family:system-ui;padding:20px;gap:20px;">
      <h1>Test Natif Vidéo HTML5</h1>
      <div style="width:100%;max-width:800px;">
        <video id="test-video" controls playsinline muted style="width:100%;background:#000;"></video>
      </div>
      <div id="video-info" style="font-family:monospace;font-size:14px;color:#e8c56d;text-align:left;width:100%;max-width:800px;"></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:20px;">
        <button id="btn-play" class="btn btn-primary">Play</button>
        <button id="btn-pause" class="btn btn-secondary">Pause</button>
        <button id="btn-seek-m10" class="btn btn-secondary">-10s</button>
        <button id="btn-seek-m1" class="btn btn-secondary">-1s</button>
        <button id="btn-seek-p1" class="btn btn-secondary">+1s</button>
        <button id="btn-seek-p10" class="btn btn-secondary">+10s</button>
        <button id="btn-0" class="btn btn-secondary">0%</button>
        <button id="btn-25" class="btn btn-secondary">25%</button>
        <button id="btn-50" class="btn btn-secondary">50%</button>
        <button id="btn-75" class="btn btn-secondary">75%</button>
        <button id="btn-100" class="btn btn-secondary">100%</button>
      </div>
    </div>
  `;

  const video = document.getElementById('test-video') as HTMLVideoElement;
  const infoDiv = document.getElementById('video-info')!;
  
  video.src = `${import.meta.env.BASE_URL}Djenne_360.mp4`;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  function updateInfo() {
    infoDiv.innerHTML = `
      src: ${video.src}<br>
      duration: ${video.duration.toFixed(2)}s<br>
      videoWidth: ${video.videoWidth}<br>
      videoHeight: ${video.videoHeight}<br>
      readyState: ${video.readyState} (${readyStateToString(video.readyState)})<br>
      networkState: ${video.networkState} (${networkStateToString(video.networkState)})<br>
      currentTime: ${video.currentTime.toFixed(2)}s<br>
      buffered: ${video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1).toFixed(2) : 0}s<br>
      error: ${video.error ? video.error.message : 'null'} (code: ${video.error?.code || 'N/A'})
    `;
  }

  function readyStateToString(state: number): string {
    return ['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'][state] || 'UNKNOWN';
  }

  function networkStateToString(state: number): string {
    return ['NETWORK_EMPTY', 'NETWORK_IDLE', 'NETWORK_LOADING', 'NETWORK_NO_SOURCE'][state] || 'UNKNOWN';
  }

  ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'progress', 'durationchange', 'loaded', 'waiting', 'stalled', 'seeking', 'seeked', 'ended', 'error', 'abort', 'play', 'pause', 'playing', 'timeupdate', 'durationchange'].forEach(event => {
    video.addEventListener(event, () => {
      console.log(`[NATIVE TEST] ${event}`);
      updateInfo();
    });
  });

  video.addEventListener('loadedmetadata', () => {
    console.log('[NATIVE TEST] loadedmetadata - duration:', video.duration, 'size:', video.videoWidth, 'x', video.videoHeight);
    updateInfo();
  });

  video.addEventListener('canplay', () => {
    console.log('>>> VIDEO CANPLAY OK');
    updateInfo();
  });

  video.addEventListener('error', () => {
    console.error('MEDIA ERROR', video.error?.code, video.error?.message, video.src);
  });

  document.getElementById('btn-play')!.onclick = () => video.play();
  document.getElementById('btn-pause')!.onclick = () => video.pause();
  document.getElementById('btn-seek-m10')!.onclick = () => video.currentTime = Math.max(0, video.currentTime - 10);
  document.getElementById('btn-seek-m1')!.onclick = () => video.currentTime = Math.max(0, video.currentTime - 1);
  document.getElementById('btn-seek-p1')!.onclick = () => video.currentTime = Math.min(video.duration, video.currentTime + 1);
  document.getElementById('btn-seek-p10')!.onclick = () => video.currentTime = Math.min(video.duration, video.currentTime + 10);
  
  [0, 25, 50, 75, 100].forEach(p => {
    document.getElementById(`btn-${p}`)!.onclick = () => {
      video.currentTime = video.duration * p / 100;
    };
  });

  setInterval(updateInfo, 500);
  updateInfo();
}

async function run360Test(): Promise<void> {
  const container = document.getElementById('app');
  if (!container) return;

  container.innerHTML = `
    <div style="width:100%;height:100%;background:#000;">
      <div id="viewer-container" style="width:100%;height:100%;"></div>
      <div id="debug-info" style="position:fixed;top:10px;left:10px;color:#fff;font-family:monospace;font-size:12px;background:rgba(0,0,0,0.7);padding:10px;z-index:1000;pointer-events:none;"></div>
    </div>
  `;

  const { App } = await import('./core/App');
  const app = new App(document.getElementById('app')!);
  await app.init();
  
  // Wait for viewer to be ready, then expose debug info
  setTimeout(() => {
    const viewerContainer = document.getElementById('viewer-container');
    const canvas = viewerContainer?.querySelector('canvas');
    if (canvas && app) {
      const debugInfo = document.getElementById('debug-info')!;
      setInterval(() => {
        const vm = app.getVideoManager();
        const viewer = app.getViewer();
        if (viewer && vm) {
          const video = vm.getVideoElement();
          const vt = viewer.getVideoTexture();
          debugInfo.innerHTML = `
            VIDEO: ${video.currentTime.toFixed(2)}s / ${video.duration.toFixed(2)}s<br>
            readyState: ${video.readyState}<br>
            networkState: ${video.networkState}<br>
            videoWidth: ${video.videoWidth}x${video.videoHeight}<br>
            VideoTexture: ${vt ? 'OK' : 'NULL'}<br>
            camera: ${viewer.getCamera().position.x.toFixed(2)}, ${viewer.getCamera().position.y.toFixed(2)}, ${viewer.getCamera().position.z.toFixed(2)}<br>
            fov: ${viewer.getFov().toFixed(1)}°
          `;
        }
      }, 500);
    }
  }, 2000);
}

async function runScrubTest(): Promise<void> {
  const container = document.getElementById('app');
  if (!container) return;

  container.innerHTML = `
    <div style="width:100%;height:100%;background:#000;display:flex;flex-direction:column;">
      <div id="viewer-container" style="flex:1;"></div>
      <div id="scrub-debug" style="position:fixed;top:10px;right:10px;color:#fff;font-family:monospace;font-size:11px;background:rgba(0,0,0,0.9);padding:15px;z-index:1000;pointer-events:none;min-width:300px;max-width:90vw;"></div>
      <div id="controls" style="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:8px;z-index:1000;flex-wrap:wrap;justify-content:center;padding:0 20px;">
        <button id="scrub-0" class="btn btn-secondary">0%</button>
        <button id="scrub-25" class="btn btn-secondary">25%</button>
        <button id="scrub-50" class="btn btn-secondary">50%</button>
        <button id="scrub-75" class="btn btn-secondary">75%</button>
        <button id="scrub-100" class="btn btn-secondary">100%</button>
        <button id="scrub-cycle" class="btn btn-primary">Cycle 0-100-0</button>
        <button id="scrub-fast" class="btn btn-warning">Fast 50x</button>
      </div>
    </div>
  `;

  const { App } = await import('./core/App');
  const app = new App(document.getElementById('app')!);
  await app.init();

  setTimeout(() => {
    const vm = app.getVideoManager();
    const timeline = app.getTimelineController();
    const video = vm?.getVideoElement();
    const scrubber = (vm as any).videoScrubber;
    
    if (!vm || !video || !timeline) return;

    const debugDiv = document.getElementById('scrub-debug')!;
    let seekCount = 0;
    
    // Override seekTo to count seeks
    const originalSeekTo = timeline.seekToProgress.bind(timeline);
    timeline.seekToProgress = (progress: number) => {
      seekCount++;
      originalSeekTo(progress);
    };

    // Listen to scrubber metrics
    if (scrubber && scrubber.on) {
      scrubber.on('metrics', (metrics: any) => {
        debugDiv.innerHTML = `
          SCRUB TEST<br>
          Duration: ${video.duration.toFixed(2)}s<br>
          Current: ${video.currentTime.toFixed(3)}s<br>
          Target: ${metrics.targetTime.toFixed(3)}s<br>
          Delta: ${metrics.delta.toFixed(3)}s<br>
          FPS: ${metrics.fps.toFixed(1)}<br>
          Requested Seeks: ${metrics.seekCount}<br>
          Actual Seeks: ${metrics.actualSeekCount}<br>
          Last Seek Latency: ${metrics.lastSeekLatencyMs.toFixed(1)}ms<br>
          Avg Seek Latency: ${metrics.avgSeekLatencyMs.toFixed(1)}ms<br>
          Dropped Frames: ${metrics.droppedFrames}/${metrics.totalFrames}<br>
          Using RVF: ${metrics.isUsingRVF ? 'YES' : 'NO'}
        `;
      });
    }

    [0, 25, 50, 75, 100].forEach(p => {
      document.getElementById(`scrub-${p}`)!.onclick = () => {
        timeline.seekToProgress(p / 100);
      };
    });

    document.getElementById('scrub-cycle')!.onclick = async () => {
      for (const p of [0, 25, 50, 75, 100, 75, 50, 25, 0]) {
        timeline.seekToProgress(p / 100);
        await new Promise(r => setTimeout(r, 200));
      }
    };

    document.getElementById('scrub-fast')!.onclick = async () => {
      for (let i = 0; i < 50; i++) {
        const p = Math.random();
        timeline.seekToProgress(p);
        await new Promise(r => setTimeout(r, 10));
      }
    };

    setInterval(() => {
      (window as any).lastFrameTime = performance.now();
    }, 16);
  }, 2000);
}

async function runMainApp(): Promise<void> {
  // Enable debug video overlay with ?debug=video
  const debugMode = new URLSearchParams(window.location.search).get('debug');
  if (debugMode === 'video') {
    (window as any).__DEBUG_VIDEO__ = true;
    console.log('Debug video mode enabled');
  }

  const { App } = await import('./core/App');
  
  let app: App | null = null;
  
  const container = document.getElementById('app');
  if (!container) {
    console.error('App container not found');
    return;
  }

  app = new App(container);

  try {
    await app.init();
    console.log('Djenne 360° Experience initialized');
  } catch (error) {
    console.error('Failed to initialize app:', error);
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#fff;font-family:system-ui;padding:20px;text-align:center;">
        <div>
          <h1>Erreur d'initialisation</h1>
          <p>Impossible de démarrer l'expérience 360°</p>
          <pre style="text-align:left;background:#1a1a1a;padding:10px;border-radius:4px;overflow:auto;max-width:100%;">${error instanceof Error ? error.message : String(error)}</pre>
        </div>
      </div>
    `;
  }

  if (typeof import.meta !== 'undefined' && (import.meta as any).hot) {
    (import.meta as any).hot.accept();
    (import.meta as any).hot.dispose(() => {
      app?.destroy();
      app = null;
    });
  }

  window.__DJENNE_APP__ = app;
}