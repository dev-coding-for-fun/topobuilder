import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { TopoProject } from '@/domain/types';
import { renderTopoRasterBase64 } from '@/rendering/artifact';

import { exportTopoPdf } from './pdf';

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
      photoId: 'photo-1',
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

    expect(renderTopoRasterBase64).toHaveBeenCalledWith(project, photo, { targetWidth: 2400 });
  });
});
