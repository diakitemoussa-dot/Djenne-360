import './style.css';
import { App } from './core/App';

declare const importMeta: ImportMeta & { hot?: { accept: () => void; dispose: (fn: () => void) => void } };

let app: App | null = null;

async function main(): Promise<void> {
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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}

if (importMeta.hot) {
  importMeta.hot.accept();
  importMeta.hot.dispose(() => {
    app?.destroy();
    app = null;
  });
}

declare global {
  interface Window {
    __DJENNE_APP__: App | null;
  }
}

window.__DJENNE_APP__ = app;