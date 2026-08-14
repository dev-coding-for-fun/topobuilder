import * as FileSystem from 'expo-file-system/legacy';

import { notifyTabvarSessionChanged } from './sessionStore.events';
import type { TabvarSession } from './types';

export { subscribeTabvarSession } from './sessionStore.events';

const SESSION_KEY = 'tabvar.session';

function itemUri(key: string) {
  const directory = FileSystem.documentDirectory;
  if (!directory) {
    throw new Error('Document storage is not available.');
  }
  return `${directory}${encodeURIComponent(key)}.json`;
}

async function getItem(key: string) {
  const uri = itemUri(key);
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) return null;
  return FileSystem.readAsStringAsync(uri);
}

async function setItem(key: string, value: string) {
  await FileSystem.writeAsStringAsync(itemUri(key), value);
}

async function deleteItem(key: string) {
  const uri = itemUri(key);
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}

export async function loadTabvarSession(): Promise<TabvarSession | undefined> {
  let raw: string | null;
  try {
    raw = await getItem(SESSION_KEY);
  } catch {
    return undefined;
  }
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
  notifyTabvarSessionChanged();
}

export async function clearTabvarSession(): Promise<void> {
  await deleteItem(SESSION_KEY);
  notifyTabvarSessionChanged();
}
