import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

import { clearPhotosDirectory } from './photoCleanup';

export type TopoDatabase = SQLite.SQLiteDatabase;

const DATABASE_NAME = 'topobuilder.db';

export const CURRENT_SCHEMA_VERSION = 4;

type MigrationStep = {
  from: number;
  to: number;
  run: (db: TopoDatabase) => Promise<void>;
};

type DbGlobal = typeof globalThis & {
  __topoDbPromise?: Promise<TopoDatabase>;
};
const globalRef = globalThis as DbGlobal;
const activeMigrationRuns = new WeakMap<TopoDatabase, Promise<void>>();

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

async function configureDatabase(db: TopoDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
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
  if (!pending) return;
  try {
    const db = await pending;
    await db.closeAsync();
  } catch {
    // Ignore close errors; we are discarding the handle either way.
  }
}

const V1_SCHEMA = `
  CREATE TABLE IF NOT EXISTS crags (
    id          TEXT PRIMARY KEY NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sectors (
    id          TEXT PRIMARY KEY NOT NULL,
    crag_id     TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    FOREIGN KEY (crag_id) REFERENCES crags(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS topos (
    id           TEXT PRIMARY KEY NOT NULL,
    sector_id    TEXT NOT NULL,
    name         TEXT NOT NULL,
    description  TEXT,
    photo_uri    TEXT,
    photo_width  INTEGER,
    photo_height INTEGER,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
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
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    FOREIGN KEY (topo_id) REFERENCES topos(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS annotations (
    id            TEXT PRIMARY KEY NOT NULL,
    topo_id       TEXT NOT NULL,
    route_id      TEXT,
    kind          TEXT NOT NULL,
    color         TEXT NOT NULL,
    label         TEXT,
    point_json    TEXT,
    points_json   TEXT,
    metadata_json TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    FOREIGN KEY (topo_id) REFERENCES topos(id) ON DELETE CASCADE,
    FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL
  );
`;

const migrations: MigrationStep[] = [
  {
    from: 0,
    to: 1,
    run: async (db) => {
      console.info('[migrations] wiping pre-v1 data');
      await db.execAsync(`
        DROP TABLE IF EXISTS annotations;
        DROP TABLE IF EXISTS routes;
        DROP TABLE IF EXISTS photo_assets;
        DROP TABLE IF EXISTS topo_projects;
        DROP TABLE IF EXISTS topos;
        DROP TABLE IF EXISTS sectors;
        DROP TABLE IF EXISTS crags;
      `);
      await db.execAsync(V1_SCHEMA);
    },
  },
  {
    from: 1,
    to: 2,
    run: async (db) => {
      await db.execAsync(`
        ALTER TABLE crags ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE sectors ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE topos ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE routes ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

        WITH ordered AS (
          SELECT
            id,
            (ROW_NUMBER() OVER (ORDER BY updated_at DESC, created_at ASC, id ASC) - 1) AS next_sort_order
          FROM crags
        )
        UPDATE crags
           SET sort_order = (
             SELECT ordered.next_sort_order
               FROM ordered
              WHERE ordered.id = crags.id
           );

        WITH ordered AS (
          SELECT
            id,
            (ROW_NUMBER() OVER (
              PARTITION BY crag_id
              ORDER BY created_at ASC, id ASC
            ) - 1) AS next_sort_order
          FROM sectors
        )
        UPDATE sectors
           SET sort_order = (
             SELECT ordered.next_sort_order
               FROM ordered
              WHERE ordered.id = sectors.id
           );

        WITH ordered AS (
          SELECT
            id,
            (ROW_NUMBER() OVER (
              PARTITION BY sector_id
              ORDER BY created_at ASC, id ASC
            ) - 1) AS next_sort_order
          FROM topos
        )
        UPDATE topos
           SET sort_order = (
             SELECT ordered.next_sort_order
               FROM ordered
              WHERE ordered.id = topos.id
           );

        WITH ordered AS (
          SELECT
            id,
            (ROW_NUMBER() OVER (
              PARTITION BY topo_id
              ORDER BY created_at ASC, id ASC
            ) - 1) AS next_sort_order
          FROM routes
        )
        UPDATE routes
           SET sort_order = (
             SELECT ordered.next_sort_order
               FROM ordered
              WHERE ordered.id = routes.id
           );
      `);
    },
  },
  {
    from: 2,
    to: 3,
    run: async (db) => {
      await addColumnIfMissing(db, 'topos', 'tabvar_dirty', 'INTEGER NOT NULL DEFAULT 1');
      await addColumnIfMissing(db, 'topos', 'tabvar_submission_id', 'TEXT');
      await addColumnIfMissing(db, 'topos', 'tabvar_synced_at', 'TEXT');
    },
  },
  {
    from: 3,
    to: 4,
    run: async (db) => {
      await db.execAsync(`
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

        CREATE INDEX IF NOT EXISTS idx_tabvar_issues_crag_id ON tabvar_issues(crag_id);
        CREATE INDEX IF NOT EXISTS idx_tabvar_issues_route_id ON tabvar_issues(route_id);
        CREATE INDEX IF NOT EXISTS idx_tabvar_routes_crag_id ON tabvar_routes(crag_id);
        CREATE INDEX IF NOT EXISTS idx_tabvar_routes_sector_id ON tabvar_routes(sector_id);
      `);
    },
  },
];

async function readUserVersion(db: TopoDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

async function writeUserVersion(db: TopoDatabase, version: number): Promise<void> {
  // PRAGMA does not accept bound parameters; the value is inlined and is integer-safe.
  await db.execAsync(`PRAGMA user_version = ${version};`);
}

async function addColumnIfMissing(
  db: TopoDatabase,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (columns.some((row) => row.name === column)) {
    return;
  }

  await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
}

/**
 * Read PRAGMA user_version and apply each registered step in order until the DB
 * reaches CURRENT_SCHEMA_VERSION. Each step runs inside a SQLite transaction;
 * the version bump is the last statement before commit. Photo cleanup runs
 * outside the transaction (best-effort, never blocks app startup).
 */
async function runMigrationsUnlocked(db: TopoDatabase): Promise<void> {
  let version = await readUserVersion(db);

  while (version < CURRENT_SCHEMA_VERSION) {
    const step = migrations.find((m) => m.from === version);
    if (!step) {
      throw new Error(`No migration registered from schema version ${version}`);
    }

    let didRunStep = false;
    await db.withTransactionAsync(async () => {
      const currentVersion = await readUserVersion(db);
      if (currentVersion !== version) {
        version = currentVersion;
        return;
      }
      await step.run(db);
      await writeUserVersion(db, step.to);
      didRunStep = true;
    });

    if (didRunStep && step.from === 0 && step.to === 1) {
      try {
        await clearPhotosDirectory();
      } catch (error) {
        console.warn('[migrations] photo cleanup failed (non-fatal)', error);
      }
    }

    if (didRunStep) {
      version = step.to;
    }
  }
}

export function runMigrations(db: TopoDatabase): Promise<void> {
  const activeRun = activeMigrationRuns.get(db);
  if (activeRun) return activeRun;

  const run = runMigrationsUnlocked(db).finally(() => {
    activeMigrationRuns.delete(db);
  });
  activeMigrationRuns.set(db, run);
  return run;
}

