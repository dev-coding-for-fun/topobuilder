type TabvarSessionListener = () => void;

const listeners = new Set<TabvarSessionListener>();

export function subscribeTabvarSession(listener: TabvarSessionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyTabvarSessionChanged(): void {
  listeners.forEach((listener) => listener());
}

export function _resetTabvarSessionListenersForTests(): void {
  listeners.clear();
}
