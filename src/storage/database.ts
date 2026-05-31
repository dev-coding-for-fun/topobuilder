import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

import { clearPhotosDirectory } from './photoCleanup';

export type TopoDatabase = SQLite.SQLiteDatabase;

const DATABASE_NAME = 'topobuilder.db';

export const CURRENT_SCHEMA_VERSION = 1;

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
      return await SQLite.openDatabaseAsync(DATABASE_NAME);
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
  PRAGMA journal_mode = WAL;

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
];

async function readUserVersion(db: TopoDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

async function writeUserVersion(db: TopoDatabase, version: number): Promise<void> {
  // PRAGMA does not accept bound parameters; the value is inlined and is integer-safe.
  await db.execAsync(`PRAGMA user_version = ${version};`);
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

