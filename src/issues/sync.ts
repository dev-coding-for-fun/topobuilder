import { nowIso } from '@/domain/ids';
import {
  pullTabvarCrags,
  pullTabvarIssues,
  pullTabvarRoutes,
  pullTabvarSectors,
} from '@/integrations/tabvar/issues';
import { loadTabvarSession } from '@/integrations/tabvar/sessionStore';
import { getDatabase, runMigrations, type TopoDatabase } from '@/storage/database';
import {
  clearTabvarIssueSyncData,
  finishSyncJob,
  getSyncCursor,
  saveSyncState,
  saveIssueSyncError,
  startSyncJob,
  upsertTabvarCrags,
  upsertTabvarIssues,
  upsertTabvarRoutes,
  upsertTabvarSectors,
  type TabvarSyncJobKind,
} from '@/storage/repos/tabvarIssuesRepo';

import { flushIssueOutbox, type IssueOutboxTrigger } from './outbox';

let activeSync: Promise<void> | undefined;

export function isIssueSyncInFlight(): boolean {
  return Boolean(activeSync);
}

export function startInitialIssueSync(): void {
  void syncTabvarIssues('initial').catch((error) => {
    console.warn('[issues] initial sync failed', error);
  });
}

export function syncTabvarIssues(
  kind: TabvarSyncJobKind,
  flushTrigger: IssueOutboxTrigger = kind,
): Promise<void> {
  if (activeSync) return activeSync;

  activeSync = trackActiveSync(runIssueSync(kind, { flushTrigger }));
  return activeSync;
}

export function resyncTabvarIssues(): Promise<void> {
  if (activeSync) {
    const queued = activeSync
      .catch(() => undefined)
      .then(() => runIssueSync('manual', { flushTrigger: 'manual', resetFirst: true }));
    activeSync = trackActiveSync(queued);
    return activeSync;
  }

  activeSync = trackActiveSync(runIssueSync('manual', { flushTrigger: 'manual', resetFirst: true }));
  return activeSync;
}

function trackActiveSync(sync: Promise<void>): Promise<void> {
  const tracked = sync.finally(() => {
    if (activeSync === tracked) {
      activeSync = undefined;
    }
  });
  return tracked;
}

async function runIssueSync(
  kind: TabvarSyncJobKind,
  options?: { flushTrigger?: IssueOutboxTrigger; resetFirst?: boolean },
): Promise<void> {
  const db = await prepareDb();
  if (options?.resetFirst) {
    await clearTabvarIssueSyncData(db);
  }
  const startedAt = nowIso();
  await startSyncJob(db, kind, startedAt);

  let syncError: string | undefined;
  try {
    const session = await loadTabvarSession();
    if (!session) {
      throw new Error('Connect TABVAR before syncing route issues.');
    }

    await flushIssueOutbox(db, session.accessToken, options?.flushTrigger ?? kind);

    const [cragsCursor, sectorsCursor, routesCursor, issuesCursor] = options?.resetFirst
      ? []
      : await Promise.all([
          getSyncCursor(db, 'crags'),
          getSyncCursor(db, 'sectors'),
          getSyncCursor(db, 'routes'),
          getSyncCursor(db, 'issues'),
        ]);
    const [crags, sectors, routes, issues] = await Promise.all([
      pullTabvarCrags(session.accessToken, cragsCursor),
      pullTabvarSectors(session.accessToken, sectorsCursor),
      pullTabvarRoutes(session.accessToken, routesCursor),
      pullTabvarIssues(session.accessToken, issuesCursor),
    ]);

    const syncedAt = nowIso();
    await upsertTabvarCrags(db, crags.crags);
    await saveSyncState(db, 'crags', {
      cursor: crags.serverTime,
      lastSyncedAt: syncedAt,
      serverTime: crags.serverTime,
    });
    await upsertTabvarSectors(db, sectors.sectors);
    await saveSyncState(db, 'sectors', {
      cursor: sectors.serverTime,
      lastSyncedAt: syncedAt,
      serverTime: sectors.serverTime,
    });
    await upsertTabvarRoutes(db, routes.routes);
    await saveSyncState(db, 'routes', {
      cursor: routes.serverTime,
      lastSyncedAt: syncedAt,
      serverTime: routes.serverTime,
    });
    await upsertTabvarIssues(db, issues.issues, issues.serverTime, syncedAt);
  } catch (error) {
    syncError = error instanceof Error ? error.message : 'Route issue sync failed.';
    await saveIssueSyncError(db, syncError);
    throw error;
  } finally {
    await finishSyncJob(db, nowIso(), syncError);
  }
}

async function prepareDb(): Promise<TopoDatabase> {
  const db = await getDatabase();
  await runMigrations(db);
  return db;
}
