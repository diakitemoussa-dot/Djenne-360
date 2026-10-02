const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/App-DEG7aElA.js","assets/three-CocmUqRH.js"])))=>i.map(i=>d[i]);
(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))r(t);new MutationObserver(t=>{for(const i of t)if(i.type==="childList")for(const n of i.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&r(n)}).observe(document,{childList:!0,subtree:!0});function a(t){const i={};return t.integrity&&(i.integrity=t.integrity),t.referrerPolicy&&(i.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?i.credentials="include":t.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function r(t){if(t.ep)return;t.ep=!0;const i=a(t);fetch(t.href,i)}})();const y="modulepreload",v=function(c){return"/Djenne-360/"+c},m={},p=function(e,a,r){let t=Promise.resolve();if(a&&a.length>0){document.getElementsByTagName("link");const n=document.querySelector("meta[property=csp-nonce]"),s=n?.nonce||n?.getAttribute("nonce");t=Promise.allSettled(a.map(d=>{if(d=v(d),d in m)return;m[d]=!0;const o=d.endsWith(".css"),u=o?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${d}"]${u}`))return;const l=document.createElement("link");if(l.rel=o?"stylesheet":y,o||(l.as="script"),l.crossOrigin="",l.href=d,s&&l.setAttribute("nonce",s),document.head.appendChild(l),o)return new Promise((f,g)=>{l.addEventListener("load",f),l.addEventListener("error",()=>g(new Error(`Unable to preload CSS for ${d}`)))})}))}function i(n){const s=new Event("vite:preloadError",{cancelable:!0});if(s.payload=n,window.dispatchEvent(s),!s.defaultPrevented)throw n}return t.then(n=>{for(const s of n||[])s.status==="rejected"&&i(s.reason);return e().catch(i)})},b=new URLSearchParams(window.location.search).get("debug");b==="native"?E():b==="360"?h():b==="scrub"?x():(b==="video"&&(window.__DEBUG_VIDEO__=!0,console.log("Debug video mode enabled")),w());async function E(){const c=document.getElementById("app");if(!c)return;c.innerHTML=`
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
  `;const e=document.getElementById("test-video"),a=document.getElementById("video-info");e.src="/Djenne-360/Djenne_360.mp4",e.muted=!0,e.playsInline=!0,e.preload="auto";function r(){a.innerHTML=`
      src: ${e.src}<br>
      duration: ${e.duration.toFixed(2)}s<br>
      videoWidth: ${e.videoWidth}<br>
      videoHeight: ${e.videoHeight}<br>
      readyState: ${e.readyState} (${t(e.readyState)})<br>
      networkState: ${e.networkState} (${i(e.networkState)})<br>
      currentTime: ${e.currentTime.toFixed(2)}s<br>
      buffered: ${e.buffered.length>0?e.buffered.end(e.buffered.length-1).toFixed(2):0}s<br>
      error: ${e.error?e.error.message:"null"} (code: ${e.error?.code||"N/A"})
    `}function t(n){return["HAVE_NOTHING","HAVE_METADATA","HAVE_CURRENT_DATA","HAVE_FUTURE_DATA","HAVE_ENOUGH_DATA"][n]||"UNKNOWN"}function i(n){return["NETWORK_EMPTY","NETWORK_IDLE","NETWORK_LOADING","NETWORK_NO_SOURCE"][n]||"UNKNOWN"}["loadstart","loadedmetadata","loadeddata","canplay","canplaythrough","progress","durationchange","loaded","waiting","stalled","seeking","seeked","ended","error","abort","play","pause","playing","timeupdate","durationchange"].forEach(n=>{e.addEventListener(n,()=>{console.log(`[NATIVE TEST] ${n}`),r()})}),e.addEventListener("loadedmetadata",()=>{console.log("[NATIVE TEST] loadedmetadata - duration:",e.duration,"size:",e.videoWidth,"x",e.videoHeight),r()}),e.addEventListener("canplay",()=>{console.log(">>> VIDEO CANPLAY OK"),r()}),e.addEventListener("error",()=>{console.error("MEDIA ERROR",e.error?.code,e.error?.message,e.src)}),document.getElementById("btn-play").onclick=()=>e.play(),document.getElementById("btn-pause").onclick=()=>e.pause(),document.getElementById("btn-seek-m10").onclick=()=>e.currentTime=Math.max(0,e.currentTime-10),document.getElementById("btn-seek-m1").onclick=()=>e.currentTime=Math.max(0,e.currentTime-1),document.getElementById("btn-seek-p1").onclick=()=>e.currentTime=Math.min(e.duration,e.currentTime+1),document.getElementById("btn-seek-p10").onclick=()=>e.currentTime=Math.min(e.duration,e.currentTime+10),[0,25,50,75,100].forEach(n=>{document.getElementById(`btn-${n}`).onclick=()=>{e.currentTime=e.duration*n/100}}),setInterval(r,500),r()}async function h(){const c=document.getElementById("app");if(!c)return;c.innerHTML=`
    <div style="width:100%;height:100%;background:#000;">
      <div id="viewer-container" style="width:100%;height:100%;"></div>
      <div id="debug-info" style="position:fixed;top:10px;left:10px;color:#fff;font-family:monospace;font-size:12px;background:rgba(0,0,0,0.7);padding:10px;z-index:1000;pointer-events:none;"></div>
    </div>
  `;const{App:e}=await p(async()=>{const{App:r}=await import("./App-DEG7aElA.js");return{App:r}},__vite__mapDeps([0,1])),a=new e(document.getElementById("app"));await a.init(),setTimeout(()=>{if(document.getElementById("viewer-container")?.querySelector("canvas")&&a){const i=document.getElementById("debug-info");setInterval(()=>{const n=a.getVideoManager(),s=a.getViewer();if(s&&n){const d=n.getVideoElement(),o=s.getVideoTexture();i.innerHTML=`
            VIDEO: ${d.currentTime.toFixed(2)}s / ${d.duration.toFixed(2)}s<br>
            readyState: ${d.readyState}<br>
            networkState: ${d.networkState}<br>
            videoWidth: ${d.videoWidth}x${d.videoHeight}<br>
            VideoTexture: ${o?"OK":"NULL"}<br>
            camera: ${s.getCamera().position.x.toFixed(2)}, ${s.getCamera().position.y.toFixed(2)}, ${s.getCamera().position.z.toFixed(2)}<br>
            fov: ${s.getFov().toFixed(1)}°
          `}},500)}},2e3)}async function x(){const c=document.getElementById("app");if(!c)return;c.innerHTML=`
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
  `;const{App:e}=await p(async()=>{const{App:r}=await import("./App-DEG7aElA.js");return{App:r}},__vite__mapDeps([0,1])),a=new e(document.getElementById("app"));await a.init(),setTimeout(()=>{const r=a.getVideoManager(),t=a.getTimelineController(),i=r?.getVideoElement(),n=r.videoScrubber;if(!r||!i||!t)return;const s=document.getElementById("scrub-debug"),d=t.seekToProgress.bind(t);t.seekToProgress=o=>{d(o)},n&&n.on&&n.on("metrics",o=>{s.innerHTML=`
          SCRUB TEST<br>
          Duration: ${i.duration.toFixed(2)}s<br>
          Current: ${i.currentTime.toFixed(3)}s<br>
          Target: ${o.targetTime.toFixed(3)}s<br>
          Delta: ${o.delta.toFixed(3)}s<br>
          FPS: ${o.fps.toFixed(1)}<br>
          Requested Seeks: ${o.seekCount}<br>
          Actual Seeks: ${o.actualSeekCount}<br>
          Last Seek Latency: ${o.lastSeekLatencyMs.toFixed(1)}ms<br>
          Avg Seek Latency: ${o.avgSeekLatencyMs.toFixed(1)}ms<br>
          Dropped Frames: ${o.droppedFrames}/${o.totalFrames}<br>
          Using RVF: ${o.isUsingRVF?"YES":"NO"}
        `}),[0,25,50,75,100].forEach(o=>{document.getElementById(`scrub-${o}`).onclick=()=>{t.seekToProgress(o/100)}}),document.getElementById("scrub-cycle").onclick=async()=>{for(const o of[0,25,50,75,100,75,50,25,0])t.seekToProgress(o/100),await new Promise(u=>setTimeout(u,200))},document.getElementById("scrub-fast").onclick=async()=>{for(let o=0;o<50;o++){const u=Math.random();t.seekToProgress(u),await new Promise(l=>setTimeout(l,10))}},setInterval(()=>{window.lastFrameTime=performance.now()},16)},2e3)}async function w(){new URLSearchParams(window.location.search).get("debug")==="video"&&(window.__DEBUG_VIDEO__=!0,console.log("Debug video mode enabled"));const{App:e}=await p(async()=>{const{App:t}=await import("./App-DEG7aElA.js");return{App:t}},__vite__mapDeps([0,1]));let a=null;const r=document.getElementById("app");if(!r){console.error("App container not found");return}a=new e(r);try{await a.init(),console.log("Djenne 360° Experience initialized")}catch(t){console.error("Failed to initialize app:",t),r.innerHTML=`
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#fff;font-family:system-ui;padding:20px;text-align:center;">
        <div>
          <h1>Erreur d'initialisation</h1>
          <p>Impossible de démarrer l'expérience 360°</p>
          <pre style="text-align:left;background:#1a1a1a;padding:10px;border-radius:4px;overflow:auto;max-width:100%;">${t instanceof Error?t.message:String(t)}</pre>
        </div>
      </div>
    `}window.__DJENNE_APP__=a}
