import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

export type TopoDatabase = SQLite.SQLiteDatabase;

export const DATABASE_NAME = 'topobuilder.db';

export const CURRENT_SCHEMA_VERSION = 6;

type DbGlobal = typeof globalThis & {
  __topoDbPromise?: Promise<TopoDatabase>;
};
const globalRef = globalThis as DbGlobal;
const activeSchemaRuns = new WeakMap<TopoDatabase, Promise<void>>();

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function isLockedError(error: unknown): boolean {
  if (!error) return false;
  const name = (error as { name?: string }).name;
  const message = (error as { message?: string }).message ?? '';
  return (
    name === 'NoModificationAllowedError' ||
    message.includes('createSyncAccessHandle') ||
    message.includes('Access Handles cannot be created')
  );
}

async function openWithRetry(): Promise<TopoDatabase> {
  const maxAttempts = 5;
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await configureDatabase(db);
      return db;
    } catch (error) {
      lastError = error;
      if (!isLockedError(error)) {
        throw error;
      }
      await delay(150 * (attempt + 1));
    }
  }
  const hint =
    Platform.OS === 'web'
      ? ' The database is locked by another tab or a previous session. Close other tabs running this app and reload.'
      : '';
  const baseMessage = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Failed to open SQLite database after ${maxAttempts} attempts.${hint} ${baseMessage}`);
}

let transactionQueue: Promise<unknown> = Promise.resolve();

export function serializeTransactions(db: TopoDatabase): TopoDatabase {
  const originalWithTransaction = db.withTransactionAsync.bind(db);
  db.withTransactionAsync = async function (callback: () => Promise<void>): Promise<void> {
    const runTransaction = async () => {
      await originalWithTransaction(callback);
    };
    const next = transactionQueue.then(runTransaction, runTransaction);
    transactionQueue = next.catch(() => {});
    await next;
  };
  return db;
}

async function configureDatabase(db: TopoDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  serializeTransactions(db);
}

if (Platform.OS === 'web' && typeof window !== 'undefined' && !('__topoDbUnloadBound' in globalRef)) {
  (globalRef as Record<string, unknown>).__topoDbUnloadBound = true;
  const cleanup = () => {
    const pending = globalRef.__topoDbPromise;
    if (!pending) return;
    pending
      .then((db) => db.closeAsync().catch(() => undefined))
      .catch(() => undefined)
      .finally(() => {
        globalRef.__topoDbPromise = undefined;
      });
  };
  window.addEventListener('pagehide', cleanup);
  window.addEventListener('beforeunload', cleanup);
}

export function getDatabase(): Promise<TopoDatabase> {
  if (!globalRef.__topoDbPromise) {
    globalRef.__topoDbPromise = openWithRetry().catch((error) => {
      globalRef.__topoDbPromise = undefined;
      throw error;
    });
  }
  return globalRef.__topoDbPromise;
}

export async function resetDatabaseConnection(): Promise<void> {
  const pending = globalRef.__topoDbPromise;
  globalRef.__topoDbPromise = undefined;
  transactionQueue = Promise.resolve();
  if (!pending) return;
  try {
    const db = await pending;
    await db.closeAsync();
  } catch {
    // Ignore close errors; we are discarding the handle either way.
  }
}

const FRESH_INSTALL_SCHEMA = `
  CREATE TABLE IF NOT EXISTS crags (
    id             TEXT PRIMARY KEY NOT NULL,
    name           TEXT NOT NULL,
    description    TEXT,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    tabvar_crag_id INTEGER,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sectors (
    id               TEXT PRIMARY KEY NOT NULL,
    crag_id          TEXT NOT NULL,
    name             TEXT NOT NULL,
    description      TEXT,
    sort_order       INTEGER NOT NULL DEFAULT 0,
    tabvar_sector_id INTEGER,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    FOREIGN KEY (crag_id) REFERENCES crags(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS topos (
    id                    TEXT PRIMARY KEY NOT NULL,
    sector_id             TEXT NOT NULL,
    name                  TEXT NOT NULL,
    description           TEXT,
    photo_uri             TEXT,
    photo_width           INTEGER,
    photo_height          INTEGER,
    sort_order            INTEGER NOT NULL DEFAULT 0,
    tabvar_dirty          INTEGER NOT NULL DEFAULT 1,
    tabvar_submission_id  TEXT,
    tabvar_synced_at      TEXT,
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL,
    FOREIGN KEY (sector_id) REFERENCES sectors(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS routes (
    id          TEXT PRIMARY KEY NOT NULL,
    topo_id     TEXT NOT NULL,
    name        TEXT NOT NULL,
    grade       TEXT,
    route_type  TEXT,
    bolt_count  INTEGER,
    length_m    INTEGER,
    fa          TEXT,
    description TEXT,
    color       TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    FOREIGN KEY (topo_id) REFERENCES topos(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS annotations (
    id            TEXT PRIMARY KEY NOT NULL,
    topo_id       TEXT NOT NULL,
    route_id      TEXT,
    route_app_id  TEXT,
    kind          TEXT NOT NULL,
    color         TEXT NOT NULL,
    label         TEXT,
    point_json    TEXT,
    points_json   TEXT,
    metadata_json TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    FOREIGN KEY (topo_id) REFERENCES topos(id) ON DELETE CASCADE,
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL,
    FOREIGN KEY (route_app_id) REFERENCES tabvar_routes(app_id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS tabvar_sync_state (
    resource       TEXT PRIMARY KEY NOT NULL,
    cursor         TEXT,
    server_time    TEXT,
    last_synced_at TEXT,
    last_error     TEXT
  );

  CREATE TABLE IF NOT EXISTS tabvar_sync_jobs (
    id           TEXT PRIMARY KEY NOT NULL,
    job_kind     TEXT NOT NULL,
    started_at   TEXT NOT NULL,
    completed_at TEXT,
    error         TEXT
  );

  CREATE TABLE IF NOT EXISTS tabvar_crags (
    id                         INTEGER PRIMARY KEY NOT NULL,
    name                       TEXT NOT NULL,
    slug                       TEXT,
    latitude                   REAL,
    longitude                  REAL,
    notes                      TEXT,
    stats_active_issue_count   INTEGER,
    stats_issue_flagged        INTEGER,
    stats_public_issue_count   INTEGER,
    created_at                 TEXT,
    raw_json                   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tabvar_sectors (
    id          INTEGER PRIMARY KEY NOT NULL,
    crag_id     INTEGER NOT NULL,
    name        TEXT NOT NULL,
    latitude    REAL,
    longitude   REAL,
    notes       TEXT,
    sort_order  INTEGER,
    created_at  TEXT,
    raw_json    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tabvar_routes (
    id                 INTEGER PRIMARY KEY NOT NULL,
    app_id             TEXT UNIQUE NOT NULL,
    crag_id            INTEGER NOT NULL,
    sector_id          INTEGER NOT NULL,
    name               TEXT NOT NULL,
    alt_names          TEXT,
    grade_yds          TEXT,
    status             TEXT,
    latitude           REAL,
    longitude          REAL,
    notes              TEXT,
    sort_order         INTEGER,
    bolt_count         INTEGER,
    pitch_count        INTEGER,
    route_length       INTEGER,
    climb_style        TEXT,
    year               INTEGER,
    route_built_date   TEXT,
    first_ascent_by    TEXT,
    first_ascent_date  TEXT,
    crag_name          TEXT,
    sector_name        TEXT,
    created_at         TEXT,
    raw_json           TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS topo_tabvar_routes (
    topo_id        TEXT NOT NULL,
    route_app_id   TEXT NOT NULL,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL,
    PRIMARY KEY (topo_id, route_app_id),
    FOREIGN KEY (topo_id) REFERENCES topos(id) ON DELETE CASCADE,
    FOREIGN KEY (route_app_id) REFERENCES tabvar_routes(app_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tabvar_issues (
    id                INTEGER PRIMARY KEY NOT NULL,
    route_id          INTEGER NOT NULL,
    crag_id           INTEGER NOT NULL,
    issue_type        TEXT NOT NULL,
    sub_issue_type    TEXT,
    status            TEXT NOT NULL,
    last_status       TEXT,
    description       TEXT,
    bolts_affected    TEXT,
    is_flagged        INTEGER NOT NULL DEFAULT 0,
    flagged_message   TEXT,
    reported_by       TEXT,
    reported_by_uid   TEXT,
    created_at        TEXT,
    updated_at        TEXT NOT NULL,
    last_modified     TEXT,
    approved_at       TEXT,
    archived_at       TEXT,
    raw_json          TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tabvar_issue_attachments (
    id        INTEGER PRIMARY KEY NOT NULL,
    issue_id  INTEGER NOT NULL,
    url       TEXT NOT NULL,
    name      TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    FOREIGN KEY (issue_id) REFERENCES tabvar_issues(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pending_issues (
    external_id      TEXT PRIMARY KEY NOT NULL,
    route_id         INTEGER NOT NULL,
    crag_id          INTEGER NOT NULL,
    issue_type       TEXT NOT NULL,
    sub_issue_type   TEXT,
    status           TEXT NOT NULL,
    description      TEXT,
    bolts_affected   TEXT,
    is_flagged       INTEGER NOT NULL DEFAULT 0,
    flagged_message  TEXT,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pending_issue_edits (
    issue_id         INTEGER PRIMARY KEY NOT NULL,
    route_id         INTEGER NOT NULL,
    crag_id          INTEGER NOT NULL,
    issue_type       TEXT NOT NULL,
    sub_issue_type   TEXT,
    status           TEXT NOT NULL,
    description      TEXT,
    bolts_affected   TEXT,
    is_flagged       INTEGER NOT NULL DEFAULT 0,
    flagged_message  TEXT,
    base_updated_at  TEXT NOT NULL,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    FOREIGN KEY (issue_id) REFERENCES tabvar_issues(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pending_issue_attachments (
    id               TEXT PRIMARY KEY NOT NULL,
    issue_key        TEXT NOT NULL,
    local_uri        TEXT NOT NULL,
    filename         TEXT NOT NULL,
    mime_type        TEXT NOT NULL,
    file_size        INTEGER,
    uploaded         INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS issue_sync_log (
    id               TEXT PRIMARY KEY NOT NULL,
    trigger_kind     TEXT NOT NULL,
    started_at       TEXT NOT NULL,
    finished_at      TEXT NOT NULL,
    status           TEXT NOT NULL,
    summary          TEXT NOT NULL,
    details_json     TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tabvar_issues_crag_id ON tabvar_issues(crag_id);
  CREATE INDEX IF NOT EXISTS idx_tabvar_issues_route_id ON tabvar_issues(route_id);
  CREATE INDEX IF NOT EXISTS idx_tabvar_routes_crag_id ON tabvar_routes(crag_id);
  CREATE INDEX IF NOT EXISTS idx_tabvar_routes_sector_id ON tabvar_routes(sector_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_tabvar_routes_app_id ON tabvar_routes(app_id);
  CREATE INDEX IF NOT EXISTS idx_crags_tabvar_crag_id ON crags(tabvar_crag_id);
  CREATE INDEX IF NOT EXISTS idx_sectors_tabvar_sector_id ON sectors(tabvar_sector_id);
  CREATE INDEX IF NOT EXISTS idx_topo_tabvar_routes_app_id ON topo_tabvar_routes(route_app_id);
  CREATE INDEX IF NOT EXISTS idx_pending_issue_edits_crag_id ON pending_issue_edits(crag_id);
  CREATE INDEX IF NOT EXISTS idx_pending_issue_attachments_issue_key ON pending_issue_attachments(issue_key);
`;

async function readUserVersion(db: TopoDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

async function writeCurrentUserVersion(db: TopoDatabase): Promise<void> {
  await db.execAsync(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION};`);
}

async function ensureFreshSchemaUnlocked(db: TopoDatabase): Promise<void> {
  const version = await readUserVersion(db);
  if (version === CURRENT_SCHEMA_VERSION) return;
  if (version !== 0) {
    throw new Error('This development build expects a fresh local database. Clear app data and relaunch.');
  }

  await db.withTransactionAsync(async () => {
    const currentVersion = await readUserVersion(db);
    if (currentVersion === CURRENT_SCHEMA_VERSION) return;
    if (currentVersion !== 0) {
      throw new Error('This development build expects a fresh local database. Clear app data and relaunch.');
    }
    await db.execAsync(FRESH_INSTALL_SCHEMA);
    await writeCurrentUserVersion(db);
  });
}

export function runMigrations(db: TopoDatabase): Promise<void> {
  const activeRun = activeSchemaRuns.get(db);
  if (activeRun) return activeRun;

  const run = ensureFreshSchemaUnlocked(db).finally(() => {
    activeSchemaRuns.delete(db);
  });
  activeSchemaRuns.set(db, run);
  return run;
}

