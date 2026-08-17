jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

import * as SQLite from 'expo-sqlite';

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

  constructor(userVersion = 0) {
    this.userVersion = userVersion;
  }

  async getFirstAsync<T>(sql: string): Promise<T | null> {
    if (sql !== 'PRAGMA user_version') {
      throw new Error(`Unexpected getFirstAsync SQL: ${sql}`);
    }
    return { user_version: this.userVersion } as T;
  }

  async execAsync(sql: string): Promise<void> {
    this.execs.push({ sql, inTransaction: Boolean(this.activeTransaction) });
    const match = sql.match(/PRAGMA user_version = (\d+)/);
    if (match) {
      this.userVersion = Number(match[1]);
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('configures WAL mode outside schema initialization', async () => {
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

  it('initializes the complete current schema for a fresh database', async () => {
    const db = new FakeDb(0);

    await runMigrations(asDb(db));

    expect(db.userVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(db.transactionCount).toBe(1);
    expect(db.execs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sql: expect.stringContaining('CREATE TABLE IF NOT EXISTS crags'),
          inTransaction: true,
        }),
        expect.objectContaining({
          sql: expect.stringContaining('sort_order  INTEGER NOT NULL DEFAULT 0'),
          inTransaction: true,
        }),
        expect.objectContaining({
          sql: expect.stringContaining('tabvar_dirty          INTEGER NOT NULL DEFAULT 1'),
          inTransaction: true,
        }),
        expect.objectContaining({
          sql: expect.stringContaining('CREATE TABLE IF NOT EXISTS tabvar_issues'),
          inTransaction: true,
        }),
        expect.objectContaining({
          sql: expect.stringContaining('CREATE TABLE IF NOT EXISTS pending_issues'),
          inTransaction: true,
        }),
        expect.objectContaining({
          sql: `PRAGMA user_version = ${CURRENT_SCHEMA_VERSION};`,
          inTransaction: true,
        }),
      ]),
    );
    expect(db.execs.some((record) => record.sql.includes('ALTER TABLE'))).toBe(false);
    expect(db.execs.some((record) => record.sql.includes('DROP TABLE'))).toBe(false);
  });

  it('does not change journal mode inside the schema transaction', async () => {
    const db = new FakeDb(0);

    await runMigrations(asDb(db));

    expect(
      db.execs.some(
        (record) =>
          record.inTransaction && record.sql.toLowerCase().includes('pragma journal_mode'),
      ),
    ).toBe(false);
  });

  it('does nothing when the database already has the current schema', async () => {
    const db = new FakeDb(CURRENT_SCHEMA_VERSION);

    await runMigrations(asDb(db));

    expect(db.transactionCount).toBe(0);
    expect(db.execs).toEqual([]);
  });

  it('rejects non-fresh old local databases instead of migrating them', async () => {
    const db = new FakeDb(4);

    await expect(runMigrations(asDb(db))).rejects.toThrow(
      'This development build expects a fresh local database.',
    );
  });

  it('coalesces concurrent invocations for the same database handle', async () => {
    const db = new FakeDb(0);

    await Promise.all([runMigrations(asDb(db)), runMigrations(asDb(db)), runMigrations(asDb(db))]);

    expect(db.userVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(db.transactionCount).toBe(1);
    expect(db.execs.filter((record) => record.sql.includes('CREATE TABLE'))).toHaveLength(1);
  });
});
