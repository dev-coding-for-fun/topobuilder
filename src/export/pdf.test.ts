import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { TopoProject } from '@/domain/types';

import { exportTopoPdf } from './pdf';

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(async () => ({ uri: 'file://topo.pdf' })),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => false),
  shareAsync: jest.fn(),
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
    {
      id: 'bolt-1',
      topoId: 'project-1',
      photoId: 'photo-1',
      kind: 'bolt',
      color: '#EC4899',
      point: { x: 0.4, y: 0.5 },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

describe('exportTopoPdf', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports line and stamp annotations using their persisted colours', async () => {
    await exportTopoPdf(project, project.photos[0]);

    const html = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html as string;
    expect(html).toContain('stroke="#2563EB"');
    expect(html).toContain('fill="#EC4899"');
    expect(html).not.toContain('opacity="0.34"');
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });
});
