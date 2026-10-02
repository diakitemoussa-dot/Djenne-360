const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/App-TR2JyAGB.js","assets/three-CocmUqRH.js"])))=>i.map(i=>d[i]);
(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))o(t);new MutationObserver(t=>{for(const i of t)if(i.type==="childList")for(const n of i.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&o(n)}).observe(document,{childList:!0,subtree:!0});function r(t){const i={};return t.integrity&&(i.integrity=t.integrity),t.referrerPolicy&&(i.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?i.credentials="include":t.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function o(t){if(t.ep)return;t.ep=!0;const i=r(t);fetch(t.href,i)}})();const y="modulepreload",v=function(c){return"/Djenne-360/"+c},f={},m=function(e,r,o){let t=Promise.resolve();if(r&&r.length>0){document.getElementsByTagName("link");const n=document.querySelector("meta[property=csp-nonce]"),d=n?.nonce||n?.getAttribute("nonce");t=Promise.allSettled(r.map(s=>{if(s=v(s),s in f)return;f[s]=!0;const l=s.endsWith(".css"),b=l?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${s}"]${b}`))return;const a=document.createElement("link");if(a.rel=l?"stylesheet":y,l||(a.as="script"),a.crossOrigin="",a.href=s,d&&a.setAttribute("nonce",d),document.head.appendChild(a),l)return new Promise((u,g)=>{a.addEventListener("load",u),a.addEventListener("error",()=>g(new Error(`Unable to preload CSS for ${s}`)))})}))}function i(n){const d=new Event("vite:preloadError",{cancelable:!0});if(d.payload=n,window.dispatchEvent(d),!d.defaultPrevented)throw n}return t.then(n=>{for(const d of n||[])d.status==="rejected"&&i(d.reason);return e().catch(i)})},p=new URLSearchParams(window.location.search).get("debug");p==="native"?E():p==="360"?h():p==="scrub"?w():(p==="video"&&(window.__DEBUG_VIDEO__=!0,console.log("Debug video mode enabled")),T());async function E(){const c=document.getElementById("app");if(!c)return;c.innerHTML=`
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
  `;const e=document.getElementById("test-video"),r=document.getElementById("video-info");e.src="/Djenne-360/Djenne_360.mp4",e.muted=!0,e.playsInline=!0,e.preload="auto";function o(){r.innerHTML=`
      src: ${e.src}<br>
      duration: ${e.duration.toFixed(2)}s<br>
      videoWidth: ${e.videoWidth}<br>
      videoHeight: ${e.videoHeight}<br>
      readyState: ${e.readyState} (${t(e.readyState)})<br>
      networkState: ${e.networkState} (${i(e.networkState)})<br>
      currentTime: ${e.currentTime.toFixed(2)}s<br>
      buffered: ${e.buffered.length>0?e.buffered.end(e.buffered.length-1).toFixed(2):0}s<br>
      error: ${e.error?e.error.message:"null"} (code: ${e.error?.code||"N/A"})
    `}function t(n){return["HAVE_NOTHING","HAVE_METADATA","HAVE_CURRENT_DATA","HAVE_FUTURE_DATA","HAVE_ENOUGH_DATA"][n]||"UNKNOWN"}function i(n){return["NETWORK_EMPTY","NETWORK_IDLE","NETWORK_LOADING","NETWORK_NO_SOURCE"][n]||"UNKNOWN"}["loadstart","loadedmetadata","loadeddata","canplay","canplaythrough","progress","durationchange","loaded","waiting","stalled","seeking","seeked","ended","error","abort","play","pause","playing","timeupdate","durationchange"].forEach(n=>{e.addEventListener(n,()=>{console.log(`[NATIVE TEST] ${n}`),o()})}),e.addEventListener("loadedmetadata",()=>{console.log("[NATIVE TEST] loadedmetadata - duration:",e.duration,"size:",e.videoWidth,"x",e.videoHeight),o()}),e.addEventListener("canplay",()=>{console.log(">>> VIDEO CANPLAY OK"),o()}),e.addEventListener("error",()=>{console.error("MEDIA ERROR",e.error?.code,e.error?.message,e.src)}),document.getElementById("btn-play").onclick=()=>e.play(),document.getElementById("btn-pause").onclick=()=>e.pause(),document.getElementById("btn-seek-m10").onclick=()=>e.currentTime=Math.max(0,e.currentTime-10),document.getElementById("btn-seek-m1").onclick=()=>e.currentTime=Math.max(0,e.currentTime-1),document.getElementById("btn-seek-p1").onclick=()=>e.currentTime=Math.min(e.duration,e.currentTime+1),document.getElementById("btn-seek-p10").onclick=()=>e.currentTime=Math.min(e.duration,e.currentTime+10),[0,25,50,75,100].forEach(n=>{document.getElementById(`btn-${n}`).onclick=()=>{e.currentTime=e.duration*n/100}}),setInterval(o,500),o()}async function h(){const c=document.getElementById("app");if(!c)return;c.innerHTML=`
    <div style="width:100%;height:100%;background:#000;">
      <div id="viewer-container" style="width:100%;height:100%;"></div>
      <div id="debug-info" style="position:fixed;top:10px;left:10px;color:#fff;font-family:monospace;font-size:12px;background:rgba(0,0,0,0.7);padding:10px;z-index:1000;pointer-events:none;"></div>
    </div>
  `;const{App:e}=await m(async()=>{const{App:o}=await import("./App-TR2JyAGB.js");return{App:o}},__vite__mapDeps([0,1])),r=new e(document.getElementById("app"));await r.init(),setTimeout(()=>{if(document.getElementById("viewer-container")?.querySelector("canvas")&&r){const i=document.getElementById("debug-info");setInterval(()=>{const n=r.getVideoManager(),d=r.getViewer();if(d&&n){const s=n.getVideoElement(),l=d.getVideoTexture();i.innerHTML=`
            VIDEO: ${s.currentTime.toFixed(2)}s / ${s.duration.toFixed(2)}s<br>
            readyState: ${s.readyState}<br>
            networkState: ${s.networkState}<br>
            videoWidth: ${s.videoWidth}x${s.videoHeight}<br>
            VideoTexture: ${l?"OK":"NULL"}<br>
            camera: ${d.getCamera().position.x.toFixed(2)}, ${d.getCamera().position.y.toFixed(2)}, ${d.getCamera().position.z.toFixed(2)}<br>
            fov: ${d.getFov().toFixed(1)}°
          `}},500)}},2e3)}async function w(){const c=document.getElementById("app");if(!c)return;c.innerHTML=`
    <div style="width:100%;height:100%;background:#000;display:flex;flex-direction:column;">
      <div id="viewer-container" style="flex:1;"></div>
      <div id="scrub-debug" style="position:fixed;top:10px;right:10px;color:#fff;font-family:monospace;font-size:12px;background:rgba(0,0,0,0.8);padding:15px;z-index:1000;pointer-events:none;min-width:250px;"></div>
      <div id="controls" style="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:10px;z-index:1000;">
        <button id="scrub-0" class="btn btn-secondary">0%</button>
        <button id="scrub-25" class="btn btn-secondary">25%</button>
        <button id="scrub-50" class="btn btn-secondary">50%</button>
        <button id="scrub-75" class="btn btn-secondary">75%</button>
        <button id="scrub-100" class="btn btn-secondary">100%</button>
        <button id="scrub-cycle" class="btn btn-primary">Cycle 0-100-0</button>
      </div>
    </div>
  `;const{App:e}=await m(async()=>{const{App:o}=await import("./App-TR2JyAGB.js");return{App:o}},__vite__mapDeps([0,1])),r=new e(document.getElementById("app"));await r.init(),setTimeout(()=>{const o=r.getVideoManager(),t=r.getTimelineController(),i=o?.getVideoElement();if(!o||!i||!t)return;const n=document.getElementById("scrub-debug");let d=0,s=0;const l=t.seekToProgress.bind(t);t.seekToProgress=a=>{d++,s=performance.now(),l(a)};const b=()=>{const a=o.getVideoElement(),u=a.getVideoPlaybackQuality?a.getVideoPlaybackQuality():null;n.innerHTML=`
        SCRUB TEST<br>
        Duration: ${a.duration.toFixed(2)}s<br>
        Current: ${a.currentTime.toFixed(2)}s<br>
        Target: ${o.getCurrentTime().toFixed(2)}s<br>
        FPS: ${(1e3/(performance.now()-window.lastFrameTime||performance.now())).toFixed(1)}<br>
        Seek Count: ${d}<br>
        Last Seek: ${(performance.now()-s).toFixed(0)}ms ago<br>
        ${u?`Total Frames: ${u.totalVideoFrames}<br>Dropped: ${u.droppedVideoFrames}`:"PlaybackQuality: N/A"}
      `};[0,25,50,75,100].forEach(a=>{document.getElementById(`scrub-${a}`).onclick=()=>{t.seekToProgress(a/100)}}),document.getElementById("scrub-cycle").onclick=async()=>{for(const a of[0,25,50,75,100,75,50,25,0])t.seekToProgress(a/100),await new Promise(u=>setTimeout(u,200))},setInterval(b,100),setInterval(()=>{window.lastFrameTime=performance.now()},16)},2e3)}async function T(){new URLSearchParams(window.location.search).get("debug")==="video"&&(window.__DEBUG_VIDEO__=!0,console.log("Debug video mode enabled"));const{App:e}=await m(async()=>{const{App:t}=await import("./App-TR2JyAGB.js");return{App:t}},__vite__mapDeps([0,1]));let r=null;const o=document.getElementById("app");if(!o){console.error("App container not found");return}r=new e(o);try{await r.init(),console.log("Djenne 360° Experience initialized")}catch(t){console.error("Failed to initialize app:",t),o.innerHTML=`
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#fff;font-family:system-ui;padding:20px;text-align:center;">
        <div>
          <h1>Erreur d'initialisation</h1>
          <p>Impossible de démarrer l'expérience 360°</p>
          <pre style="text-align:left;background:#1a1a1a;padding:10px;border-radius:4px;overflow:auto;max-width:100%;">${t instanceof Error?t.message:String(t)}</pre>
        </div>
      </div>
    `}window.__DJENNE_APP__=r}
