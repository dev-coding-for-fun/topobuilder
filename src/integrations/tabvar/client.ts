import { getTabvarApiBaseUrl } from './config';
import { buildTabvarSubmission } from './submission';
import type {
  BuiltTabvarSubmission,
  TabvarConnectResponse,
  TabvarSession,
  TabvarSubmissionResponse,
} from './types';
import { appendTopoUpload } from './uploadPart';

const COMPLETE_CONNECT_PATH = '/api/topobuilder/connect/complete';
const DISCONNECT_PATH = '/api/topobuilder/disconnect';
const SUBMISSIONS_PATH = '/api/topobuilder/submissions';

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

export async function submitTabvarGuidebook(
  input: Parameters<typeof buildTabvarSubmission>[0],
  accessToken: string,
): Promise<{ response: TabvarSubmissionResponse; submittedTopoIds: string[] }> {
  return submitBuiltTabvarSubmission(buildTabvarSubmission(input), accessToken);
}

async function submitBuiltTabvarSubmission(
  built: BuiltTabvarSubmission,
  accessToken: string,
): Promise<{ response: TabvarSubmissionResponse; submittedTopoIds: string[] }> {
  const formData = new FormData();
  formData.append('submission', JSON.stringify(built.submission));
  for (const image of built.images) {
    await appendTopoUpload(formData, image.fileKey, image);
  }

  const response = await fetch(`${getTabvarApiBaseUrl()}${SUBMISSIONS_PATH}`, {
    body: formData,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(await errorMessage(response, 'Tabvar submission failed.'));
  }

  return {
    response: normalizeSubmissionResponse((await response.json()) as TabvarSubmissionResponse),
    submittedTopoIds: built.topoIds,
  };
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

function normalizeSubmissionResponse(payload: TabvarSubmissionResponse): TabvarSubmissionResponse {
  if (!payload.id || !payload.status) {
    throw new Error('Tabvar returned an incomplete submission response.');
  }
  return payload;
}

async function errorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string; message?: string };
    return payload.message || payload.error || `${fallback} (${response.status})`;
  } catch {
    return `${fallback} (${response.status})`;
  }
}
