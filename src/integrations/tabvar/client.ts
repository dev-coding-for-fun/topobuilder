import { getTabvarApiBaseUrl } from './config';
import type { TabvarConnectResponse, TabvarSession } from './types';

const COMPLETE_CONNECT_PATH = '/api/topobuilder/connect/complete';
const DISCONNECT_PATH = '/api/topobuilder/disconnect';

export async function completeTabvarConnect(ticket: string): Promise<TabvarSession> {
  const response = await fetch(`${getTabvarApiBaseUrl()}${COMPLETE_CONNECT_PATH}`, {
    body: JSON.stringify({ ticket }),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Tabvar connection failed.'));
  }

  const payload = (await response.json()) as TabvarConnectResponse;
  return normalizeConnectResponse(payload);
}

export async function disconnectTabvar(accessToken: string): Promise<void> {
  const response = await fetch(`${getTabvarApiBaseUrl()}${DISCONNECT_PATH}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Tabvar disconnect failed.'));
  }
}

function normalizeConnectResponse(payload: TabvarConnectResponse): TabvarSession {
  const tabvarUserId = payload.user?.uid;
  const accessToken = payload.token;

  if (!tabvarUserId || !accessToken) {
    throw new Error('Tabvar returned an incomplete connection response.');
  }

  return {
    accessToken,
    connectedAt: new Date().toISOString(),
    displayName: payload.user?.displayName,
    email: payload.user?.email,
    tabvarUserId,
  };
}

async function errorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string; message?: string };
    return payload.message || payload.error || `${fallback} (${response.status})`;
  } catch {
    return `${fallback} (${response.status})`;
  }
}
