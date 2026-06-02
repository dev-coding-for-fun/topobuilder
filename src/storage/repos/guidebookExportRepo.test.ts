import type { TopoDatabase } from '../database';
import { loadGuidebookExportBundle } from './guidebookExportRepo';

type TableRow = Record<string, unknown>;

class FakeGuidebookDb {
  crags: TableRow[] = [
    {
      id: 'crag-1',
      name: 'Guide Crag',
      description: 'Crag notes',
      sort_order: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  sectors: TableRow[] = [
    {
      id: 'sector-1',
      crag_id: 'crag-1',
      name: 'Main Wall',
      description: 'Sector notes',
      sort_order: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'sector-empty',
      crag_id: 'crag-1',
      name: 'Empty Sector',
      description: null,
      sort_order: 1,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  topos: TableRow[] = [
    {
      id: 'topo-1',
      sector_id: 'sector-1',
      name: 'First Topo',
      description: 'Topo notes',
      photo_uri: 'file://topo.jpg',
      photo_width: 1200,
      photo_height: 900,
      sort_order: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'topo-2',
      sector_id: 'sector-1',
      name: 'Second Topo',
      description: null,
      photo_uri: null,
      photo_width: null,
      photo_height: null,
      sort_order: 1,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  routes: TableRow[] = [
    {
      id: 'route-1',
      topo_id: 'topo-1',
      name: 'Pine Line',
      grade: '5.10a',
      route_type: 'sport',
      bolt_count: 8,
      length_m: 25,
      fa: 'A. Climber',
      description: 'Positive edges.',
      color: '#EB5757',
      sort_order: 0,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  annotations: TableRow[] = [
    {
      id: 'line-1',
      topo_id: 'topo-1',
      route_id: 'route-1',
      kind: 'climbLine',
      color: '#2563EB',
      label: null,
      metadata_json: null,
      point_json: null,
      points_json: JSON.stringify([
        { x: 0.1, y: 0.1 },
        { x: 0.8, y: 0.8 },
      ]),
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  async getFirstAsync<T>(sql: string, id: string): Promise<T | null> {
    if (sql.includes('FROM crags')) {
      return (this.crags.find((row) => row.id === id) ?? null) as T | null;
    }
    if (sql.includes('FROM sectors')) {
      return (this.sectors.find((row) => row.id === id) ?? null) as T | null;
    }
    if (sql.includes('FROM topos')) {
      return (this.topos.find((row) => row.id === id) ?? null) as T | null;
    }
    return null;
  }

  async getAllAsync<T>(sql: string, id: string): Promise<T[]> {
    if (sql.includes('FROM sectors WHERE crag_id')) {
      return this.sectors.filter((row) => row.crag_id === id) as T[];
    }
    if (sql.includes('FROM topos WHERE sector_id')) {
      return this.topos.filter((row) => row.sector_id === id) as T[];
    }
    if (sql.includes('FROM routes WHERE topo_id')) {
      return this.routes.filter((row) => row.topo_id === id) as T[];
    }
    if (sql.includes('FROM annotations WHERE topo_id')) {
      return this.annotations.filter((row) => row.topo_id === id) as T[];
    }
    return [];
  }
}

function asDb(db: FakeGuidebookDb): TopoDatabase {
  return db as unknown as TopoDatabase;
}

describe('loadGuidebookExportBundle', () => {
  it('loads complete crag bundles with empty sectors, routes, annotations, and photo metadata', async () => {
    const bundle = await loadGuidebookExportBundle(asDb(new FakeGuidebookDb()), {
      kind: 'crag',
      cragId: 'crag-1',
    });

    expect(bundle?.scope).toBe('crag');
    expect(bundle?.crag.sectors.map((sector) => sector.id)).toEqual(['sector-1', 'sector-empty']);
    expect(bundle?.crag.sectors[0].topos.map((topo) => topo.id)).toEqual(['topo-1', 'topo-2']);
    expect(bundle?.crag.sectors[1].topos).toEqual([]);
    expect(bundle?.crag.sectors[0].topos[0].photo?.uri).toBe('file://topo.jpg');
    expect(bundle?.crag.sectors[0].topos[0].routes[0].name).toBe('Pine Line');
    expect(bundle?.crag.sectors[0].topos[0].annotations[0].id).toBe('line-1');
  });

  it('loads topo bundles with parent context and selected ids', async () => {
    const bundle = await loadGuidebookExportBundle(asDb(new FakeGuidebookDb()), {
      kind: 'topo',
      topoId: 'topo-1',
    });

    expect(bundle?.scope).toBe('topo');
    expect(bundle?.selectedSectorId).toBe('sector-1');
    expect(bundle?.selectedTopoId).toBe('topo-1');
    expect(bundle?.crag.id).toBe('crag-1');
    expect(bundle?.crag.sectors).toHaveLength(1);
    expect(bundle?.crag.sectors[0].topos).toHaveLength(1);
  });
});
