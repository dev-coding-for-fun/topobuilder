import { getTabvarApiBaseUrl } from './config';
import type {
  TabvarCragsResponse,
  TabvarIssuesResponse,
  TabvarRoutesResponse,
  TabvarSectorsResponse,
} from './types';

const CRAGS_PATH = '/api/v1/crags';
const SECTORS_PATH = '/api/v1/sectors';
const ROUTES_PATH = '/api/v1/routes';
const ISSUES_PATH = '/api/v1/issues';

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
  try {
    const payload = (await response.json()) as { error?: string; message?: string };
    return payload.message || payload.error || `${fallback} (${response.status})`;
  } catch {
    return `${fallback} (${response.status})`;
  }
}
