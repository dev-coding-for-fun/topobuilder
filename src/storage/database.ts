import * as SQLite from 'expo-sqlite';

export type TopoDatabase = SQLite.SQLiteDatabase;

let databasePromise: Promise<TopoDatabase> | undefined;

export function getDatabase() {
  databasePromise ??= SQLite.openDatabaseAsync('topobuilder.db');
  return databasePromise;
}

export async function migrateDatabase(db: TopoDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS topo_projects (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photo_assets (
      id TEXT PRIMARY KEY NOT NULL,
      topo_id TEXT NOT NULL,
      uri TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (topo_id) REFERENCES topo_projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS routes (
      id TEXT PRIMARY KEY NOT NULL,
      topo_id TEXT NOT NULL,
      name TEXT NOT NULL,
      grade TEXT,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (topo_id) REFERENCES topo_projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY NOT NULL,
      topo_id TEXT NOT NULL,
      photo_id TEXT NOT NULL,
      route_id TEXT,
      kind TEXT NOT NULL,
      color TEXT NOT NULL,
      label TEXT,
      point_json TEXT,
      points_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (topo_id) REFERENCES topo_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (photo_id) REFERENCES photo_assets(id) ON DELETE CASCADE,
      FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL
    );
  `);
}
