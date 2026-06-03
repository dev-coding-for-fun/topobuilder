import type { TabvarSession } from './types';

const SESSION_KEY = 'tabvar.session';
const PENDING_STATE_KEY = 'tabvar.pendingConnectState';

function getStorage() {
  return typeof window === 'undefined' ? undefined : window.localStorage;
}

async function getItem(key: string) {
  return getStorage()?.getItem(key) ?? null;
}

async function setItem(key: string, value: string) {
  getStorage()?.setItem(key, value);
}

async function deleteItem(key: string) {
  getStorage()?.removeItem(key);
}

export async function loadTabvarSession(): Promise<TabvarSession | undefined> {
  const raw = await getItem(SESSION_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as TabvarSession;
  } catch {
    await deleteItem(SESSION_KEY);
    return undefined;
  }
}

export async function saveTabvarSession(session: TabvarSession): Promise<void> {
  await setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearTabvarSession(): Promise<void> {
  await deleteItem(SESSION_KEY);
}

export async function savePendingTabvarConnectState(state: string): Promise<void> {
  await setItem(PENDING_STATE_KEY, state);
}

export async function loadPendingTabvarConnectState(): Promise<string | undefined> {
  return (await getItem(PENDING_STATE_KEY)) ?? undefined;
}

export async function clearPendingTabvarConnectState(): Promise<void> {
  await deleteItem(PENDING_STATE_KEY);
}
