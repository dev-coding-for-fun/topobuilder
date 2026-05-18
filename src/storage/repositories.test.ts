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
});
