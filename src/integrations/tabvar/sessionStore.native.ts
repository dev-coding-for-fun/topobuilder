import * as SecureStore from 'expo-secure-store';

import type { TabvarSession } from './types';

const SESSION_KEY = 'tabvar.session';

async function getItem(key: string) {
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string) {
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string) {
  await SecureStore.deleteItemAsync(key);
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
