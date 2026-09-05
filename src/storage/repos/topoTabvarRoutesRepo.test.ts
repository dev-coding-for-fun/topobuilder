import type { TopoDatabase } from '../database';
import {
  countTabvarRoutesForTopo,
  countUnmappedTabvarRoutesForSector,
  linkTabvarRouteToTopo,
  listTabvarRoutesForTopo,
  listUnmappedTabvarRoutesForSector,
  unlinkTabvarRouteFromTopo,
} from './topoTabvarRoutesRepo';

type SqlCall = {
  sql: string;
  args: unknown[];
};

class FakeDb {
  getFirstResponses: unknown[] = [];
  getAllResponses: unknown[] = [];
  runCalls: SqlCall[] = [];
  getAllCalls: SqlCall[] = [];

  async getFirstAsync<T>(): Promise<T | null> {
    return (this.getFirstResponses.shift() ?? null) as T | null;
  }

  async getAllAsync<T>(sql: string, ...args: unknown[]): Promise<T[]> {
    this.getAllCalls.push({ sql, args });
    return (this.getAllResponses.shift() ?? []) as T[];
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

describe('topoTabvarRoutesRepo', () => {
  it('links a tabvar route to a topo and marks topo dirty', async () => {
    const db = new FakeDb();
    db.getFirstResponses.push({ next_sort: 3 });

    await linkTabvarRouteToTopo(asDb(db), 'topo-1', 'tabvar_route_456');

    expect(db.runCalls).toHaveLength(2);
    expect(db.runCalls[0].sql).toContain('INSERT INTO topo_tabvar_routes');
    expect(db.runCalls[0].args).toContain('topo-1');
    expect(db.runCalls[0].args).toContain('tabvar_route_456');
    expect(db.runCalls[0].args).toContain(3);
    expect(db.runCalls[1].sql).toContain('UPDATE topos SET updated_at = ?, tabvar_dirty = 1');
  });

  it('unlinks a tabvar route from a topo and marks topo dirty', async () => {
    const db = new FakeDb();

    await unlinkTabvarRouteFromTopo(asDb(db), 'topo-1', 'tabvar_route_456');

    expect(db.runCalls).toHaveLength(2);
    expect(db.runCalls[0].sql).toContain('DELETE FROM topo_tabvar_routes');
    expect(db.runCalls[0].args).toEqual(['topo-1', 'tabvar_route_456']);
    expect(db.runCalls[1].sql).toContain('UPDATE topos SET updated_at = ?, tabvar_dirty = 1');
  });

  it('lists tabvar routes for a topo', async () => {
    const db = new FakeDb();
    db.getAllResponses.push([
      {
        id: 456,
        app_id: 'tabvar_route_456',
        crag_id: 7,
        sector_id: 12,
        name: 'Solar Flare',
        alt_names: null,
        grade_yds: '5.11a',
        status: null,
        latitude: null,
        longitude: null,
        notes: null,
        sort_order: 1,
        bolt_count: 6,
        pitch_count: 1,
        route_length: 20,
        climb_style: 'Sport',
        year: null,
        route_built_date: null,
        first_ascent_by: null,
        first_ascent_date: null,
        crag_name: 'Sunny Crag',
        sector_name: 'Main Wall',
        created_at: '2026-01-01T00:00:00Z',
      },
    ]);

    const routes = await listTabvarRoutesForTopo(asDb(db), 'topo-1');

    expect(routes).toHaveLength(1);
    expect(routes[0].appId).toBe('tabvar_route_456');
    expect(routes[0].name).toBe('Solar Flare');
    expect(routes[0].gradeYds).toBe('5.11a');
    expect(db.getAllCalls[0].sql).toContain('JOIN topo_tabvar_routes');
  });

  it('counts tabvar routes for a topo', async () => {
    const db = new FakeDb();
    db.getFirstResponses.push({ count: 4 });

    const count = await countTabvarRoutesForTopo(asDb(db), 'topo-1');
    expect(count).toBe(4);
  });

  it('returns empty array when sector has no tabvar_sector_id', async () => {
    const db = new FakeDb();
    db.getFirstResponses.push({ tabvar_sector_id: null });

    const unmapped = await listUnmappedTabvarRoutesForSector(asDb(db), 'sector-1');
    expect(unmapped).toEqual([]);
    expect(db.getAllCalls).toHaveLength(0);
  });

  it('lists unmapped tabvar routes for a sector with tabvar_sector_id', async () => {
    const db = new FakeDb();
    db.getFirstResponses.push({ tabvar_sector_id: 12 });
    db.getAllResponses.push([
      {
        id: 457,
        app_id: 'tabvar_route_457',
        crag_id: 7,
        sector_id: 12,
        name: 'Lunar Eclipse',
        alt_names: null,
        grade_yds: '5.10b',
        status: null,
        latitude: null,
        longitude: null,
        notes: null,
        sort_order: 2,
        bolt_count: 4,
        pitch_count: 1,
        route_length: 15,
        climb_style: 'Sport',
        year: null,
        route_built_date: null,
        first_ascent_by: null,
        first_ascent_date: null,
        crag_name: 'Sunny Crag',
        sector_name: 'Main Wall',
        created_at: '2026-01-01T00:00:00Z',
      },
    ]);

    const unmapped = await listUnmappedTabvarRoutesForSector(asDb(db), 'sector-1');
    expect(unmapped).toHaveLength(1);
    expect(unmapped[0].name).toBe('Lunar Eclipse');
    expect(db.getAllCalls[0].args).toEqual([12, 'sector-1']);
    expect(db.getAllCalls[0].sql).toContain('NOT IN');
  });

  it('counts unmapped tabvar routes for a sector', async () => {
    const db = new FakeDb();
    db.getFirstResponses.push({ tabvar_sector_id: 12 });
    db.getFirstResponses.push({ count: 9 });

    const count = await countUnmappedTabvarRoutesForSector(asDb(db), 'sector-1');
    expect(count).toBe(9);
  });
});
