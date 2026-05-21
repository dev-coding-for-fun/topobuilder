import type { TopoDatabase } from './database';
import { upsertAnnotation } from './repositories';

describe('annotation repositories', () => {
  it('persists label font size in annotation metadata', async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const db = { runAsync } as unknown as TopoDatabase;

    await upsertAnnotation(db, {
      id: 'a1',
      topoId: 't1',
      photoId: 'p1',
      kind: 'label',
      color: '#111827',
      label: 'Pitch 1',
      labelFontSize: 36,
      point: { x: 0.2, y: 0.4 },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('metadata_json'),
      'a1',
      't1',
      'p1',
      null,
      'label',
      '#111827',
      'Pitch 1',
      JSON.stringify({ labelFontSize: 36 }),
      JSON.stringify({ x: 0.2, y: 0.4 }),
      null,
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    );
  });

  it('persists stamp size in annotation metadata', async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const db = { runAsync } as unknown as TopoDatabase;

    await upsertAnnotation(db, {
      id: 'a2',
      topoId: 't1',
      photoId: 'p1',
      kind: 'bolt',
      color: '#FACC15',
      stampSize: 'large',
      point: { x: 0.2, y: 0.4 },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('metadata_json'),
      'a2',
      't1',
      'p1',
      null,
      'bolt',
      '#FACC15',
      null,
      JSON.stringify({ stampSize: 'large' }),
      JSON.stringify({ x: 0.2, y: 0.4 }),
      null,
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    );
  });

  it('persists line weight in annotation metadata', async () => {
    const runAsync = jest.fn().mockResolvedValue(undefined);
    const db = { runAsync } as unknown as TopoDatabase;

    await upsertAnnotation(db, {
      id: 'a3',
      topoId: 't1',
      photoId: 'p1',
      kind: 'climbLine',
      color: '#FACC15',
      lineWeight: 'large',
      points: [
        { x: 0.2, y: 0.4 },
        { x: 0.6, y: 0.8 },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('metadata_json'),
      'a3',
      't1',
      'p1',
      null,
      'climbLine',
      '#FACC15',
      null,
      JSON.stringify({ lineWeight: 'large' }),
      null,
      JSON.stringify([
        { x: 0.2, y: 0.4 },
        { x: 0.6, y: 0.8 },
      ]),
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    );
  });
});
