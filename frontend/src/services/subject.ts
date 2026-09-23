type Handler<T> = (value: T) => void;

export interface Subscription {
  unsubscribe: () => void;
}

/** Minimal subject: multicasts values to current subscribers. */
export class Subject<T> {
  private handlers = new Set<Handler<T>>();

  subscribe(handler: Handler<T>): Subscription {
    this.handlers.add(handler);
    return {
      unsubscribe: () => {
        this.handlers.delete(handler);
      },
    };
  }

  next(value: T) {
    this.handlers.forEach((h) => {
      try {
        h(value);
      } catch (err) {
        console.error('[Subject] handler error', err);
      }
    });
  }

  get observerCount(): number {
    return this.handlers.size;
  }
}
