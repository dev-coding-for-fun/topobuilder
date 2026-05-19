import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

import type { TopoProject } from '@/domain/types';

import { exportTopoPdf } from './pdf';

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(async () => ({ uri: 'file://topo.pdf' })),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => false),
  shareAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  EncodingType: {
    Base64: 'base64',
  },
  readAsStringAsync: jest.fn(async () => 'encoded-photo'),
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
      stampSize: 'large',
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
    expect(html).toContain('stroke="#EC4899"');
    expect(html).toContain('stroke-width="6.666666666666667"');
    expect(html).toContain('stroke-width="4"');
    expect(html).not.toContain('opacity="0.34"');
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  it('exports bolt, rappel, and belay stamp shapes instead of generic circles', async () => {
    await exportTopoPdf(
      {
        ...project,
        annotations: [
          project.annotations[1],
          {
            id: 'rappel-1',
            topoId: 'project-1',
            photoId: 'photo-1',
            kind: 'rappel',
            color: '#22C55E',
            point: { x: 0.5, y: 0.5 },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'belay-1',
            topoId: 'project-1',
            photoId: 'photo-1',
            kind: 'belay',
            color: '#F97316',
            point: { x: 0.6, y: 0.5 },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      project.photos[0],
    );

    const html = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html as string;
    expect(html).toContain('<line x1="389.3333333333333" y1="389.3333333333333" x2="410.6666666666667" y2="410.6666666666667"');
    expect(html).toContain('<line x1="500" y1="411.1111111111111" x2="500" y2="426.6666666666667"');
    expect(html).toContain('<circle cx="600" cy="400" r="11.11111111111111" fill="#F97316"');
  });

  it('scales start circles for high-resolution photos so they stay visible in the PDF', async () => {
    await exportTopoPdf(
      {
        ...project,
        annotations: [
          {
            id: 'start-hires',
            topoId: 'project-1',
            photoId: 'photo-1',
            kind: 'start',
            color: '#FACC15',
            label: '1',
            point: { x: 0.2, y: 0.3 },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      { ...project.photos[0], width: 4000, height: 3200 },
    );

    const html = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html as string;
    expect(html).toContain('<circle cx="800" cy="960" r="66.66666666666667" fill="#FACC15"');
    expect(html).toContain('font-size="71.11111111111111"');
  });

  it('inlines local photo data so native PDF generation can render the image', async () => {
    await exportTopoPdf(project, project.photos[0]);

    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('file://photo.jpg', { encoding: 'base64' });
    const html = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html as string;
    expect(html).toContain('<img src="data:image/jpeg;base64,encoded-photo" />');
    expect(html).not.toContain('<img src="file://photo.jpg" />');
  });

  it('exports route marker numbers and leaves blank route markers unnumbered', async () => {
    await exportTopoPdf(
      {
        ...project,
        annotations: [
          {
            id: 'start-1',
            topoId: 'project-1',
            photoId: 'photo-1',
            kind: 'start',
            color: '#FACC15',
            label: '12',
            point: { x: 0.2, y: 0.3 },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'start-blank',
            topoId: 'project-1',
            photoId: 'photo-1',
            kind: 'start',
            color: '#FACC15',
            point: { x: 0.4, y: 0.5 },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      project.photos[0],
    );

    const html = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html as string;
    expect(html).toContain('>12</text>');
    expect(html.match(/<text/g)).toHaveLength(1);
  });

  it('exports route marker numbers with contrasting text colours', async () => {
    await exportTopoPdf(
      {
        ...project,
        annotations: [
          {
            id: 'start-light',
            topoId: 'project-1',
            photoId: 'photo-1',
            kind: 'start',
            color: '#FACC15',
            label: '1',
            point: { x: 0.2, y: 0.3 },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'start-dark',
            topoId: 'project-1',
            photoId: 'photo-1',
            kind: 'start',
            color: '#1E3A8A',
            label: '2',
            point: { x: 0.4, y: 0.5 },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      project.photos[0],
    );

    const html = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html as string;
    expect(html).toContain('fill="#111827"');
    expect(html).toContain('fill="#F8FAFC"');
  });
});
