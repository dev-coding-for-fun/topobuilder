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

let activeSync: Promise<void> | undefined;

export function isIssueSyncInFlight(): boolean {
  return Boolean(activeSync);
}

export function startInitialIssueSync(): void {
  void syncTabvarIssues('initial').catch((error) => {
    console.warn('[issues] initial sync failed', error);
  });
}

export function syncTabvarIssues(kind: TabvarSyncJobKind): Promise<void> {
  if (activeSync) return activeSync;

  activeSync = trackActiveSync(runIssueSync(kind));
  return activeSync;
}

export function resyncTabvarIssues(): Promise<void> {
  if (activeSync) {
    const queued = activeSync
      .catch(() => undefined)
      .then(() => runIssueSync('manual', { resetFirst: true }));
    activeSync = trackActiveSync(queued);
    return activeSync;
  }

  activeSync = trackActiveSync(runIssueSync('manual', { resetFirst: true }));
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
  options?: { resetFirst?: boolean },
): Promise<void> {
  const db = await prepareDb();
  if (options?.resetFirst) {
    await clearTabvarIssueSyncData(db);
  }
  const startedAt = nowIso();
  await startSyncJob(db, kind, startedAt);

  try {
    const session = await loadTabvarSession();
    if (!session) {
      throw new Error('Connect TABVAR before syncing route issues.');
    }

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
    await finishSyncJob(db, nowIso());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Route issue sync failed.';
    await saveIssueSyncError(db, message);
    await finishSyncJob(db, nowIso(), message);
    throw error;
  }
}

async function prepareDb(): Promise<TopoDatabase> {
  const db = await getDatabase();
  await runMigrations(db);
  return db;
}
