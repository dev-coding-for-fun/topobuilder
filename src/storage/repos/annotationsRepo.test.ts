import {
  listAnnotationsForTopo,
  upsertAnnotation,
} from './annotationsRepo';
import type { Annotation } from '@/domain/types';
import type { TopoDatabase } from '../database';

type SqlCall = {
  sql: string;
  args: unknown[];
};

class FakeDb {
  runCalls: SqlCall[] = [];
  getAllCalls: SqlCall[] = [];
  rowsToReturn: unknown[] = [];

  async getAllAsync<T>(sql: string, ...args: unknown[]): Promise<T[]> {
    this.getAllCalls.push({ sql, args });
    return this.rowsToReturn as T[];
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

describe('annotationsRepo', () => {
  it('serializes and parses lineStyle in annotation metadata', async () => {
    const db = new FakeDb();

    const annotation: Annotation = {
      id: 'ann-1',
      topoId: 'topo-1',
      kind: 'climbLine',
      color: '#FF0000',
      lineStyle: 'dashed',
      lineWeight: 'large',
      points: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    await upsertAnnotation(asDb(db), annotation);

    expect(db.runCalls.length).toBe(2);
    const insertCall = db.runCalls[0];
    expect(insertCall.sql).toContain('INSERT OR REPLACE INTO annotations');
    // metadata_json is the 7th param (index 6)
    const metadataJson = insertCall.args[6] as string;
    expect(JSON.parse(metadataJson)).toEqual({
      lineStyle: 'dashed',
      lineWeight: 'large',
    });

    // Test listAnnotationsForTopo parsing
    db.rowsToReturn = [
      {
        id: 'ann-1',
        topo_id: 'topo-1',
        route_id: null,
        kind: 'climbLine',
        color: '#FF0000',
        label: null,
        metadata_json: JSON.stringify({ lineStyle: 'dotted', lineWeight: 'medium' }),
        point_json: null,
        points_json: JSON.stringify([{ x: 10, y: 10 }, { x: 20, y: 20 }]),
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ];

    const results = await listAnnotationsForTopo(asDb(db), 'topo-1');
    expect(results).toHaveLength(1);
    expect(results[0].lineStyle).toBe('dotted');
    expect(results[0].lineWeight).toBe('medium');
  });

  it('ignores invalid lineStyle in metadata_json', async () => {
    const db = new FakeDb();
    db.rowsToReturn = [
      {
        id: 'ann-2',
        topo_id: 'topo-1',
        route_id: null,
        kind: 'walkoff',
        color: '#00FF00',
        label: null,
        metadata_json: JSON.stringify({ lineStyle: 'wavy' }),
        point_json: null,
        points_json: JSON.stringify([{ x: 5, y: 5 }]),
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ];

    const results = await listAnnotationsForTopo(asDb(db), 'topo-1');
    expect(results[0].lineStyle).toBeUndefined();
  });
});
