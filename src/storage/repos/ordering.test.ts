jest.mock('@/domain/ids', () => ({
  createId: jest.fn((prefix: string) => `${prefix}-new`),
  nowIso: jest.fn(() => '2026-01-01T00:00:00.000Z'),
}));

import { createCrag } from './cragsRepo';
import { createRoute, listRoutesForTopo } from './routesRepo';
import { createSector, listSectorsForCrag } from './sectorsRepo';
import { createTopo, listToposForSector } from './toposRepo';
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

describe('repository sort ordering', () => {
  it('assigns next sort order when creating crags and default sectors', async () => {
    const db = new FakeDb();
    db.getFirstResponses.push({ next_sort_order: 4 });

    const { crag, defaultSector } = await createCrag(asDb(db), { name: 'New Crag' });

    expect(crag.sortOrder).toBe(4);
    expect(defaultSector.sortOrder).toBe(0);
    expect(db.runCalls[0].sql).toContain('sort_order');
    expect(db.runCalls[0].args).toContain(4);
    expect(db.runCalls[1].sql).toContain('sort_order');
    expect(db.runCalls[1].args).toContain(0);
  });

  it('assigns next parent-scoped sort order for sectors, topos, and routes', async () => {
    const sectorDb = new FakeDb();
    sectorDb.getFirstResponses.push({ next_sort_order: 2 });
    const sector = await createSector(asDb(sectorDb), { cragId: 'crag-1', name: 'New Sector' });

    const topoDb = new FakeDb();
    topoDb.getFirstResponses.push({ count: 0 }, { next_sort_order: 3 });
    const topo = await createTopo(asDb(topoDb), { sectorId: 'sector-1' });

    const routeDb = new FakeDb();
    routeDb.getFirstResponses.push({ next_sort_order: 5 });
    const route = await createRoute(asDb(routeDb), { topoId: 'topo-1', name: 'New Route' });

    expect(sector.sortOrder).toBe(2);
    expect(topo.sortOrder).toBe(3);
    expect(route.sortOrder).toBe(5);
  });

  it('lists nested entities by sort order with stable fallbacks', async () => {
    const db = new FakeDb();

    await listSectorsForCrag(asDb(db), 'crag-1');
    await listToposForSector(asDb(db), 'sector-1');
    await listRoutesForTopo(asDb(db), 'topo-1');

    expect(db.getAllCalls[0].sql).toContain('ORDER BY sort_order ASC, created_at ASC, id ASC');
    expect(db.getAllCalls[1].sql).toContain('ORDER BY sort_order ASC, created_at ASC, id ASC');
    expect(db.getAllCalls[2].sql).toContain('ORDER BY sort_order ASC, created_at ASC, id ASC');
  });
});
