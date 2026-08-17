import { getTabvarApiBaseUrl } from './config';
import type {
  TabvarCragsResponse,
  TabvarIssue,
  TabvarIssueAttachmentsResponse,
  TabvarIssueSyncRequest,
  TabvarIssueSyncResponse,
  TabvarIssuesResponse,
  TabvarRoutesResponse,
  TabvarSectorsResponse,
  TabvarUploadImage,
} from './types';
import { appendTopoUpload } from './uploadPart';

const CRAGS_PATH = '/api/v1/crags';
const SECTORS_PATH = '/api/v1/sectors';
const ROUTES_PATH = '/api/v1/routes';
const ISSUES_PATH = '/api/v1/issues';
const ISSUE_SYNC_PATH = '/api/v1/issues/sync';

export class TabvarIssueConflictError extends Error {
  issue: TabvarIssue;

  constructor(issue: TabvarIssue) {
    super('This issue was updated elsewhere. The latest version is now shown.');
    this.name = 'TabvarIssueConflictError';
    this.issue = issue;
  }
}

export function pullTabvarCrags(
  accessToken: string,
  since?: string,
): Promise<TabvarCragsResponse> {
  return getJson<TabvarCragsResponse>(
    pathWithSince(CRAGS_PATH, since),
    accessToken,
    'Tabvar crag catalog sync failed.',
  );
}

export function pullTabvarSectors(
  accessToken: string,
  since?: string,
): Promise<TabvarSectorsResponse> {
  return getJson<TabvarSectorsResponse>(
    pathWithSince(SECTORS_PATH, since),
    accessToken,
    'Tabvar sector catalog sync failed.',
  );
}

export function pullTabvarRoutes(
  accessToken: string,
  since?: string,
): Promise<TabvarRoutesResponse> {
  return getJson<TabvarRoutesResponse>(
    pathWithSince(ROUTES_PATH, since),
    accessToken,
    'Tabvar route catalog sync failed.',
  );
}

export function pullTabvarIssues(
  accessToken: string,
  since?: string,
): Promise<TabvarIssuesResponse> {
  return getJson<TabvarIssuesResponse>(
    pathWithSince(ISSUES_PATH, since),
    accessToken,
    'Tabvar issue sync failed.',
  );
}

export async function pushTabvarIssue(
  accessToken: string,
  mutation: TabvarIssueSyncRequest,
): Promise<TabvarIssue> {
  const response = await fetch(`${getTabvarApiBaseUrl()}${ISSUE_SYNC_PATH}`, {
    body: JSON.stringify(mutation),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  const payload = await readJson(response);
  if (response.status === 409 && isSyncResponse(payload) && payload.issue) {
    throw new TabvarIssueConflictError(payload.issue);
  }
  if (!response.ok) {
    throw new Error(messageFromPayload(payload, `Tabvar issue ${mutation.op} failed.`, response.status));
  }
  if (!isSyncResponse(payload) || !payload.issue) {
    throw new Error(`Tabvar returned an incomplete issue ${mutation.op} response.`);
  }
  return payload.issue;
}

export async function uploadTabvarIssueAttachments(
  accessToken: string,
  issueId: number,
  photos: TabvarUploadImage[],
): Promise<TabvarIssueAttachmentsResponse> {
  if (photos.length === 0) {
    return { attachments: [] };
  }

  const formData = new FormData();
  for (const photo of photos) {
    await appendTopoUpload(formData, 'photos', photo);
  }

  const response = await fetch(`${getTabvarApiBaseUrl()}/api/v1/issues/${issueId}/attachments`, {
    body: formData,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    method: 'POST',
  });

  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(messageFromPayload(payload, 'Tabvar issue attachment upload failed.', response.status));
  }
  if (!isAttachmentsResponse(payload)) {
    throw new Error('Tabvar returned an incomplete issue attachment response.');
  }
  return payload;
}

function pathWithSince(path: string, since?: string) {
  return since ? `${path}?since=${encodeURIComponent(since)}` : path;
}

async function getJson<T>(path: string, accessToken: string, fallback: string): Promise<T> {
  const response = await fetch(`${getTabvarApiBaseUrl()}${path}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(await errorMessage(response, fallback));
  }

  return (await response.json()) as T;
}

async function errorMessage(response: Response, fallback: string) {
  return messageFromPayload(await readJson(response), fallback, response.status);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function messageFromPayload(payload: unknown, fallback: string, status: number) {
  if (payload && typeof payload === 'object') {
    const { error, message } = payload as { error?: string; message?: string };
    return message || error || `${fallback} (${status})`;
  }
  return `${fallback} (${status})`;
}

function isAttachmentsResponse(payload: unknown): payload is TabvarIssueAttachmentsResponse {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      'attachments' in payload &&
      Array.isArray((payload as TabvarIssueAttachmentsResponse).attachments),
  );
}

function isSyncResponse(payload: unknown): payload is TabvarIssueSyncResponse {
  return Boolean(payload && typeof payload === 'object' && 'status' in payload && 'serverId' in payload);
}
