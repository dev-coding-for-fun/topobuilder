import { attachPhotoToTopo, deleteTopo, getTopo } from './toposRepo';
import type { TopoDatabase } from '../database';

type SqlCall = {
  sql: string;
  args: unknown[];
};

class FakeDb {
  getFirstResponses: unknown[] = [];
  runCalls: SqlCall[] = [];
  getAllCalls: SqlCall[] = [];

  async getFirstAsync<T>(): Promise<T | null> {
    return (this.getFirstResponses.shift() ?? null) as T | null;
  }

  async getAllAsync<T>(sql: string, ...args: unknown[]): Promise<T[]> {
    this.getAllCalls.push({ sql, args });
    return [];
  }

  async runAsync(sql: string, ...args: unknown[]): Promise<void> {
    this.runCalls.push({ sql, args });
  }

  async withTransactionAsync(callback: () => Promise<void>): Promise<void> {
    await callback();
  }
}

function asDb(db: FakeDb): TopoDatabase {
  return db as unknown as TopoDatabase;
}

describe('toposRepo', () => {
  it('maps photo_uri through resolvePhotoUri', async () => {
    const db = new FakeDb();
    db.getFirstResponses.push({
      id: 'topo-1',
      sector_id: 'sector-1',
      name: 'Test Topo',
      description: null,
      photo_uri: 'topos/topo-1/photo_123.jpg',
      photo_width: 1920,
      photo_height: 1080,
      tabvar_dirty: 0,
      tabvar_submission_id: null,
      tabvar_synced_at: null,
      sort_order: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });

    const topo = await getTopo(asDb(db), 'topo-1');
    expect(topo).toBeDefined();
    // On web/default assetStorage, resolvePhotoUri returns the path as is;
    // on native it prepends documentDirectory.
    expect(topo?.photoUri).toContain('topos/topo-1/photo_123.jpg');
    expect(topo?.photoWidth).toBe(1920);
    expect(topo?.photoHeight).toBe(1080);
  });

  it('attaches photo with relative uri to topo', async () => {
    const db = new FakeDb();
    // For touchAncestors
    db.getFirstResponses.push({
      id: 'topo-1',
      sector_id: 'sector-1',
      name: 'Test Topo',
      description: null,
      photo_uri: 'topos/topo-1/photo_123.jpg',
      photo_width: 1920,
      photo_height: 1080,
      tabvar_dirty: 1,
      tabvar_submission_id: null,
      tabvar_synced_at: null,
      sort_order: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    // For sector ancestor touch
    db.getFirstResponses.push({
      crag_id: 'crag-1',
    });

    await attachPhotoToTopo(asDb(db), 'topo-1', {
      uri: 'topos/topo-1/photo_123.jpg',
      width: 1920,
      height: 1080,
    });

    expect(db.runCalls[0].sql).toContain('UPDATE topos');
    expect(db.runCalls[0].args[0]).toBe('topos/topo-1/photo_123.jpg');
    expect(db.runCalls[0].args[1]).toBe(1920);
    expect(db.runCalls[0].args[2]).toBe(1080);
  });

  it('returns resolved photoUri when deleting topo', async () => {
    const db = new FakeDb();
    db.getFirstResponses.push({
      id: 'topo-1',
      sector_id: 'sector-1',
      name: 'Test Topo',
      description: null,
      photo_uri: 'topos/topo-1/photo_123.jpg',
      photo_width: 1920,
      photo_height: 1080,
      tabvar_dirty: 0,
      tabvar_submission_id: null,
      tabvar_synced_at: null,
      sort_order: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });

    const deletedUri = await deleteTopo(asDb(db), 'topo-1');
    expect(deletedUri).toContain('topos/topo-1/photo_123.jpg');
    expect(db.runCalls[0].sql).toContain('DELETE FROM topos WHERE id = ?');
  });
});
