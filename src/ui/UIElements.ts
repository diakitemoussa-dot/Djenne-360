export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: {
    className?: string;
    id?: string;
    text?: string;
    html?: string;
    attributes?: Record<string, string>;
    styles?: Partial<CSSStyleDeclaration>;
    children?: (HTMLElement | SVGElement)[];
    onClick?: (e: Event) => void;
  } = {}
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.id) element.id = options.id;
  if (options.text) element.textContent = options.text;
  if (options.html) element.innerHTML = options.html;
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => element.setAttribute(key, value));
  }
  if (options.styles) {
    Object.assign(element.style, options.styles);
  }
  if (options.children) {
    options.children.forEach(child => element.appendChild(child));
  }
  if (options.onClick) {
    element.addEventListener('click', options.onClick);
  }
  return element;
}

export function createButton(
  text: string,
  onClick: (e: MouseEvent) => void,
  options: { className?: string; id?: string; ariaLabel?: string; disabled?: boolean; title?: string } = {}
): HTMLButtonElement {
  const button = createElement('button', {
    className: `btn ${options.className || ''}`.trim(),
    id: options.id,
    text,
    attributes: {
      'aria-label': options.ariaLabel || text,
      ...(options.disabled ? { disabled: 'true' } : {}),
      ...(options.title ? { title: options.title } : {})
    },
    onClick: onClick as (e: Event) => void
  });
  return button as HTMLButtonElement;
}

export function createIcon(name: string, size: number = 24): SVGElement {
  const icons: Record<string, string> = {
    play: `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`,
    volume: `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>`,
    volumeOff: `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3z"/></svg>`,
    fullscreen: `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`,
    fullscreenExit: `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`,
    gyro: `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`,
    gyroOff: `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="2"/></svg>`,
    timeline: `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path fill="currentColor" d="M18 12c0-3.31-2.69-6-6-6s-6 2.69-6 6 2.69 6 6 6 6-2.69 6-6zm0 2c0 2.21-1.79 4-4 4S8 16.21 8 14s1.79-4 4-4 4 1.79 4 4zm0-10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`,
    explore: `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`,
    close: `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
    loading: `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="30 60" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle></svg>`
  };

  const div = document.createElement('div');
  div.innerHTML = icons[name] || icons.close;
  return div.firstElementChild as SVGElement;
}