import type { GuidebookExportBundle } from '@/domain/types';

import { buildTabvarSubmission } from './submission';

const bundle: GuidebookExportBundle = {
  crag: {
    id: 'crag-1',
    name: 'Example Crag',
    sectors: [
      {
        id: 'sector-1',
        cragId: 'crag-1',
        name: 'Main Wall',
        sortOrder: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        topos: [
          {
            id: 'topo-1',
            sectorId: 'sector-1',
            name: 'Main Wall Topo',
            photoUri: 'file://topo-1.jpg',
            photoWidth: 1200,
            photoHeight: 900,
            sortOrder: 0,
            tabvarDirty: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            photo: {
              id: 'topo-1',
              topoId: 'topo-1',
              uri: 'file://topo-1.jpg',
              width: 1200,
              height: 900,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
            annotations: [],
            routes: [
              {
                id: 'route-1',
                topoId: 'topo-1',
                name: 'Route A',
                grade: '5.10a',
                color: '#EB5757',
                sortOrder: 0,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
              {
                id: 'route-2',
                topoId: 'topo-1',
                name: 'Route B',
                grade: '5.11b',
                color: '#2563EB',
                sortOrder: 1,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
            ],
          },
        ],
      },
    ],
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  scope: 'crag',
};

describe('buildTabvarSubmission', () => {
  it('builds normalized crag submissions with matching topo image keys', () => {
    const built = buildTabvarSubmission(bundle);

    expect(built.submission).toEqual({
      kind: 'crag',
      crag: { name: 'Example Crag' },
      sectors: [
        {
          name: 'Main Wall',
          routes: [
            { name: 'Route A', gradeYds: '5.10a' },
            { name: 'Route B', gradeYds: '5.11b' },
          ],
          topos: [
            {
              fileKey: 'topo-topo-1',
              routeRefs: ['Route A', 'Route B'],
            },
          ],
        },
      ],
    });
    expect(built.images).toEqual([
      {
        fileKey: 'topo-topo-1',
        filename: 'main-wall-topo.jpg',
        mimeType: 'image/jpeg',
        topoId: 'topo-1',
        uri: 'file://topo-1.jpg',
      },
    ]);
    expect(built.topoIds).toEqual(['topo-1']);
  });

  it('builds sector submissions with crag context', () => {
    const built = buildTabvarSubmission({
      ...bundle,
      scope: 'sector',
      selectedSectorId: 'sector-1',
    });

    expect(built.submission).toMatchObject({
      kind: 'sector',
      sector: { cragName: 'Example Crag', name: 'Main Wall' },
      topos: [{ fileKey: 'topo-topo-1', routeRefs: ['Route A', 'Route B'] }],
    });
  });

  it('builds topo submissions with sector and crag context', () => {
    const built = buildTabvarSubmission({
      ...bundle,
      scope: 'topo',
      selectedSectorId: 'sector-1',
      selectedTopoId: 'topo-1',
    });

    expect(built.submission).toEqual({
      kind: 'topo',
      routes: [
        { name: 'Route A', gradeYds: '5.10a' },
        { name: 'Route B', gradeYds: '5.11b' },
      ],
      topo: {
        cragName: 'Example Crag',
        fileKey: 'topo-topo-1',
        routeRefs: ['Route A', 'Route B'],
        sectorName: 'Main Wall',
      },
    });
  });

  it('requires every submitted topo to have a supported image', () => {
    const withoutPhoto = {
      ...bundle,
      crag: {
        ...bundle.crag,
        sectors: [
          {
            ...bundle.crag.sectors[0],
            topos: [{ ...bundle.crag.sectors[0].topos[0], photo: undefined }],
          },
        ],
      },
    };

    expect(() => buildTabvarSubmission(withoutPhoto)).toThrow(
      'needs a photo before it can be submitted',
    );
  });
});
