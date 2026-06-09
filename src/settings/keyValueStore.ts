const memoryStore = new Map<string, string>();

function getStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return undefined;
  return window.localStorage;
}

export async function getItem(key: string) {
  return getStorage()?.getItem(key) ?? memoryStore.get(key) ?? null;
}

export async function setItem(key: string, value: string) {
  const storage = getStorage();
  if (storage) {
    storage.setItem(key, value);
  } else {
    memoryStore.set(key, value);
  }
}
