export type ExpiredListener = () => void;

const listeners = new Set<ExpiredListener>();

export function subscribeExpired(listener: ExpiredListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitExpired(): void {
  for (const listener of Array.from(listeners)) {
    listener();
  }
}
