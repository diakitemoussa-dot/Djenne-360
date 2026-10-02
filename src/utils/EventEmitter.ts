type EventCallback<T = unknown> = (data: T) => void;

export class EventEmitter<EventMap extends Record<string, unknown> = Record<string, unknown>> {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>): () => void {
    const key = String(event);
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback as EventCallback);
    return () => this.off(event, callback);
  }

  off<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>): void {
    this.listeners.get(String(event))?.delete(callback as EventCallback);
  }

  emit<K extends keyof EventMap>(event: K, data?: EventMap[K]): void {
    this.listeners.get(String(event))?.forEach(cb => {
      try {
        cb(data as EventMap[K]);
      } catch (e) {
        console.error(`Error in event listener for ${String(event)}:`, e);
      }
    });
  }

  once<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>): void {
    const wrapper = (data: EventMap[K]) => {
      callback(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}