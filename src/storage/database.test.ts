jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock('./photoCleanup', () => ({
  clearPhotosDirectory: jest.fn().mockResolvedValue(undefined),
}));

import { clearPhotosDirectory } from './photoCleanup';
import { CURRENT_SCHEMA_VERSION, runMigrations, type TopoDatabase } from './database';

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

  it('wipes v0 data, creates v1 schema, bumps user_version, and cleans photos after commit', async () => {
    const db = new FakeDb(0);

    await runMigrations(asDb(db));

    expect(db.userVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(db.transactionCount).toBe(1);
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
      ]),
    );
    expect(clearPhotosDirectory).toHaveBeenCalledTimes(1);
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
    expect(db.transactionCount).toBe(1);
    expect(db.execs.filter((record) => record.sql.includes('DROP TABLE IF EXISTS'))).toHaveLength(1);
    expect(clearPhotosDirectory).toHaveBeenCalledTimes(1);
  });
});
