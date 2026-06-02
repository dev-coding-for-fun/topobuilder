import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { GuidebookExportBundle, TopoProject } from '@/domain/types';
import { renderTopoRasterBase64 } from '@/rendering/artifact';

import { buildGuidebookHtml, exportGuidebookPdf, exportTopoPdf } from './pdf';

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(async () => ({ uri: 'file://topo.pdf' })),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => false),
  shareAsync: jest.fn(),
}));

jest.mock('@/rendering/artifact', () => ({
  renderTopoRasterBase64: jest.fn(async () => ({
    base64: 'encoded-topo-raster',
    height: 1440,
    mimeType: 'image/jpeg',
    width: 1800,
  })),
}));

const project: TopoProject = {
  id: 'project-1',
  name: 'Export Test',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  photos: [
    {
      id: 'photo-1',
      topoId: 'project-1',
      uri: 'file://photo.jpg',
      width: 1000,
      height: 800,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  routes: [],
  annotations: [
    {
      id: 'line-1',
      topoId: 'project-1',
      kind: 'climbLine',
      color: '#2563EB',
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.8, y: 0.8 },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

describe('exportTopoPdf', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('embeds a Skia-rasterized topo image in the exported PDF HTML', async () => {
    await exportTopoPdf(project, project.photos[0]);

    expect(renderTopoRasterBase64).toHaveBeenCalledWith(project, project.photos[0], { targetWidth: 1000 });
    const html = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html as string;
    expect(html).toContain('<img src="data:image/jpeg;base64,encoded-topo-raster" />');
    expect(html).not.toContain('<svg');
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  it('caps the PDF raster width for high-resolution photos', async () => {
    const photo = { ...project.photos[0], width: 4000, height: 3200 };
    await exportTopoPdf(project, photo);

    expect(renderTopoRasterBase64).toHaveBeenCalledWith(
      expect.objectContaining({
        id: project.id,
        photos: [photo],
      }),
      photo,
      { targetWidth: 2400 },
    );
  });
});

const guidebookBundle: GuidebookExportBundle = {
  scope: 'crag',
  crag: {
    id: 'crag-1',
    name: 'Granite Canyon',
    description: 'A quiet crag.',
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sectors: [
      {
        id: 'sector-1',
        cragId: 'crag-1',
        name: 'Main Wall',
        description: 'Morning shade.',
        sortOrder: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        topos: [
          {
            id: 'topo-1',
            sectorId: 'sector-1',
            name: 'Left Slab',
            description: 'Start from the pine.',
            photoUri: 'file://left-slab.jpg',
            photoWidth: 1200,
            photoHeight: 900,
            sortOrder: 0,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            photo: {
              id: 'topo-1',
              topoId: 'topo-1',
              uri: 'file://left-slab.jpg',
              width: 1200,
              height: 900,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
            annotations: [],
            routes: [
              {
                id: 'route-1',
                topoId: 'topo-1',
                name: 'Pine Line',
                grade: '5.10a',
                routeType: 'sport',
                boltCount: 8,
                lengthM: 25,
                fa: 'A. Climber',
                description: 'Positive edges.',
                color: '#EB5757',
                sortOrder: 0,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
            ],
          },
          {
            id: 'topo-2',
            sectorId: 'sector-1',
            name: 'Right Slab',
            sortOrder: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            annotations: [],
            routes: [],
          },
        ],
      },
      {
        id: 'sector-2',
        cragId: 'crag-1',
        name: 'Upper Tier',
        sortOrder: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        topos: [],
      },
    ],
  },
};

describe('guidebook PDF export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nested crag, sector, topo, route metadata, placeholders, and raster images', async () => {
    const html = await buildGuidebookHtml(guidebookBundle);

    expect(html).toContain('Granite Canyon');
    expect(html).toContain('Main Wall');
    expect(html).toContain('Left Slab');
    expect(html).toContain('Pine Line');
    expect(html).toContain('5.10a | Sport | 25m | 8 bolts');
    expect(html).toContain('FA: A. Climber');
    expect(html).toContain('Positive edges.');
    expect(html).toContain('No topo image attached.');
    expect(html).toContain('No topos listed in this sector.');
    expect(html).toContain('<img src="data:image/jpeg;base64,encoded-topo-raster" />');
    expect(renderTopoRasterBase64).toHaveBeenCalledTimes(1);
  });

  it('generates and shares guidebook PDFs when sharing is available', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(true);

    await exportGuidebookPdf(guidebookBundle);

    expect(Print.printToFileAsync).toHaveBeenCalledWith({ html: expect.stringContaining('Granite Canyon') });
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file://topo.pdf', {
      UTI: '.pdf',
      mimeType: 'application/pdf',
    });
  });
});
