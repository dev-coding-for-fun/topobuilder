jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock('./photoCleanup', () => ({
  clearPhotosDirectory: jest.fn().mockResolvedValue(undefined),
}));

import * as SQLite from 'expo-sqlite';

import { clearPhotosDirectory } from './photoCleanup';
import {
  CURRENT_SCHEMA_VERSION,
  getDatabase,
  resetDatabaseConnection,
  runMigrations,
  type TopoDatabase,
} from './database';

type ExecRecord = {
  sql: string;
  inTransaction: boolean;
};

class FakeDb {
  userVersion: number;
  execs: ExecRecord[] = [];
  transactionCount = 0;
  private activeTransaction?: Promise<void>;
  private topoColumns: Set<string>;

  constructor(userVersion = 0, options?: { topoColumns?: string[] }) {
    this.userVersion = userVersion;
    this.topoColumns = new Set(
      options?.topoColumns ??
        [
          'id',
          'sector_id',
          'name',
          'description',
          'photo_uri',
          'photo_width',
          'photo_height',
          ...(userVersion >= 2 ? ['sort_order'] : []),
          ...(userVersion >= 3 ? ['tabvar_dirty', 'tabvar_submission_id', 'tabvar_synced_at'] : []),
          'created_at',
          'updated_at',
        ],
    );
  }

  async getFirstAsync<T>(sql: string): Promise<T | null> {
    if (sql !== 'PRAGMA user_version') {
      throw new Error(`Unexpected getFirstAsync SQL: ${sql}`);
    }
    return { user_version: this.userVersion } as T;
  }

  async getAllAsync<T>(sql: string): Promise<T[]> {
    if (sql !== 'PRAGMA table_info(topos)') {
      throw new Error(`Unexpected getAllAsync SQL: ${sql}`);
    }
    return Array.from(this.topoColumns, (name) => ({ name }) as T);
  }

  async execAsync(sql: string): Promise<void> {
    this.execs.push({ sql, inTransaction: Boolean(this.activeTransaction) });
    const match = sql.match(/PRAGMA user_version = (\d+)/);
    if (match) {
      this.userVersion = Number(match[1]);
    }

    if (sql.includes('CREATE TABLE IF NOT EXISTS topos')) {
      this.topoColumns = new Set([
        'id',
        'sector_id',
        'name',
        'description',
        'photo_uri',
        'photo_width',
        'photo_height',
        'created_at',
        'updated_at',
      ]);
    }

    for (const column of ['sort_order', 'tabvar_dirty', 'tabvar_submission_id', 'tabvar_synced_at']) {
      if (sql.includes(`ALTER TABLE topos ADD COLUMN ${column}`)) {
        if (this.topoColumns.has(column)) {
          throw new Error(`duplicate column name: ${column}`);
        }
        this.topoColumns.add(column);
      }
    }
  }

  async withTransactionAsync(callback: () => Promise<void>): Promise<void> {
    this.transactionCount += 1;
    const run = async () => {
      await callback();
    };
    const next = this.activeTransaction ? this.activeTransaction.then(run) : run();
    this.activeTransaction = next.finally(() => {
      if (this.activeTransaction === next) {
        this.activeTransaction = undefined;
      }
    });
    return next;
  }

  async closeAsync(): Promise<void> {
    return undefined;
  }
}

function asDb(db: FakeDb): TopoDatabase {
  return db as unknown as TopoDatabase;
}

describe('runMigrations', () => {
  let infoSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    infoSpy.mockRestore();
  });

  it('configures WAL mode outside migrations', async () => {
    const db = new FakeDb(CURRENT_SCHEMA_VERSION);
    (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(asDb(db));

    await getDatabase();

    expect(db.execs).toEqual([
      {
        sql: 'PRAGMA journal_mode = WAL;',
        inTransaction: false,
      },
    ]);

    await resetDatabaseConnection();
  });

  it('wipes v0 data, creates the schema, runs migrations, and cleans photos after commit', async () => {
    const db = new FakeDb(0);

    await runMigrations(asDb(db));

    expect(db.userVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(db.transactionCount).toBe(4);
    expect(db.execs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sql: expect.stringContaining('DROP TABLE IF EXISTS photo_assets'),
          inTransaction: true,
        }),
        expect.objectContaining({
          sql: expect.stringContaining('CREATE TABLE IF NOT EXISTS crags'),
          inTransaction: true,
        }),
        expect.objectContaining({
          sql: 'PRAGMA user_version = 1;',
          inTransaction: true,
        }),
        expect.objectContaining({
          sql: expect.stringContaining('ALTER TABLE crags ADD COLUMN sort_order'),
          inTransaction: true,
        }),
        expect.objectContaining({
          sql: 'PRAGMA user_version = 2;',
          inTransaction: true,
        }),
        expect.objectContaining({
          sql: expect.stringContaining('ALTER TABLE topos ADD COLUMN tabvar_dirty'),
          inTransaction: true,
        }),
        expect.objectContaining({
          sql: 'PRAGMA user_version = 3;',
          inTransaction: true,
        }),
        expect.objectContaining({
          sql: expect.stringContaining('CREATE TABLE IF NOT EXISTS tabvar_issues'),
          inTransaction: true,
        }),
        expect.objectContaining({
          sql: 'PRAGMA user_version = 4;',
          inTransaction: true,
        }),
      ]),
    );
    expect(clearPhotosDirectory).toHaveBeenCalledTimes(1);
  });

  it('keeps the v1 schema at the historical column set', async () => {
    const db = new FakeDb(0);

    await runMigrations(asDb(db));

    const createTopoSchema = db.execs.find((record) =>
      record.sql.includes('CREATE TABLE IF NOT EXISTS topos'),
    );
    expect(createTopoSchema?.sql).not.toContain('tabvar_dirty');
    expect(createTopoSchema?.sql).not.toContain('tabvar_submission_id');
    expect(createTopoSchema?.sql).not.toContain('tabvar_synced_at');
  });

  it('migrates v1 data through sort order and Tabvar sync columns', async () => {
    const db = new FakeDb(1);

    await runMigrations(asDb(db));

    expect(db.userVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(db.transactionCount).toBe(3);
    expect(db.execs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sql: expect.stringContaining('ALTER TABLE crags ADD COLUMN sort_order'),
          inTransaction: true,
        }),
        expect.objectContaining({
          sql: expect.stringContaining('ROW_NUMBER() OVER (ORDER BY updated_at DESC'),
          inTransaction: true,
        }),
        expect.objectContaining({
          sql: expect.stringContaining('PARTITION BY crag_id'),
          inTransaction: true,
        }),
        expect.objectContaining({
          sql: expect.stringContaining('PARTITION BY sector_id'),
          inTransaction: true,
        }),
        expect.objectContaining({
          sql: expect.stringContaining('PARTITION BY topo_id'),
          inTransaction: true,
        }),
        expect.objectContaining({
          sql: expect.stringContaining('ALTER TABLE topos ADD COLUMN tabvar_dirty'),
          inTransaction: true,
        }),
        expect.objectContaining({
          sql: expect.stringContaining('CREATE TABLE IF NOT EXISTS tabvar_routes'),
          inTransaction: true,
        }),
      ]),
    );
    expect(db.execs.some((record) => record.sql.includes('DROP TABLE IF EXISTS'))).toBe(false);
    expect(clearPhotosDirectory).not.toHaveBeenCalled();
  });

  it('does not change journal mode inside a migration transaction', async () => {
    const db = new FakeDb(0);

    await runMigrations(asDb(db));

    expect(
      db.execs.some(
        (record) =>
          record.inTransaction && record.sql.toLowerCase().includes('pragma journal_mode'),
      ),
    ).toBe(false);
  });

  it('recovers a v2 database that already has TabVar columns', async () => {
    const db = new FakeDb(2, {
      topoColumns: [
        'id',
        'sector_id',
        'name',
        'description',
        'photo_uri',
        'photo_width',
        'photo_height',
        'sort_order',
        'tabvar_dirty',
        'tabvar_submission_id',
        'tabvar_synced_at',
        'created_at',
        'updated_at',
      ],
    });

    await runMigrations(asDb(db));

    expect(db.userVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(
      db.execs.some((record) => record.sql.includes('ALTER TABLE topos ADD COLUMN tabvar_dirty')),
    ).toBe(false);
  });

  it('does nothing when the database is already at the current version', async () => {
    const db = new FakeDb(CURRENT_SCHEMA_VERSION);

    await runMigrations(asDb(db));

    expect(db.transactionCount).toBe(0);
    expect(db.execs).toEqual([]);
    expect(clearPhotosDirectory).not.toHaveBeenCalled();
  });

  it('coalesces concurrent invocations for the same database handle', async () => {
    const db = new FakeDb(0);

    await Promise.all([runMigrations(asDb(db)), runMigrations(asDb(db)), runMigrations(asDb(db))]);

    expect(db.userVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(db.transactionCount).toBe(4);
    expect(db.execs.filter((record) => record.sql.includes('DROP TABLE IF EXISTS'))).toHaveLength(1);
    expect(clearPhotosDirectory).toHaveBeenCalledTimes(1);
  });
});
