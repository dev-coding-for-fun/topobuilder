import { ImageFormat } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { GuidebookExportBundle, TopoProject } from '@/domain/types';
import { renderTopoRasterBase64 } from '@/rendering/artifact';

import {
  exportSingleTopoImage,
  exportTopoImage,
  extractSingleTopoFromBundle,
  projectForGuidebookTopo,
  sanitizeImageFilename,
} from './image';

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  documentDirectory: 'file:///documents/',
  EncodingType: {
    Base64: 'base64',
  },
  writeAsStringAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => false),
  shareAsync: jest.fn(async () => undefined),
}));

jest.mock('@/rendering/artifact', () => ({
  renderTopoRasterBase64: jest.fn(async () => ({
    base64: 'encoded-webp-base64',
    height: 1200,
    mimeType: 'image/webp',
    width: 1600,
  })),
}));

const mockProject: TopoProject = {
  id: 'topo-1',
  name: 'Upper Wall',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  photos: [
    {
      id: 'photo-1',
      topoId: 'topo-1',
      uri: 'file://photo-1.jpg',
      width: 1600,
      height: 1200,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  routes: [
    {
      id: 'route-1',
      topoId: 'topo-1',
      name: 'Direct Line',
      grade: '5.10a',
      color: '#FF0000',
      sortOrder: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  annotations: [],
};

const validTopoBundle: GuidebookExportBundle = {
  scope: 'topo',
  crag: {
    id: 'crag-1',
    name: 'Main Crag',
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sectors: [
      {
        id: 'sector-1',
        cragId: 'crag-1',
        name: 'Main Sector',
        sortOrder: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        topos: [
          {
            id: 'topo-1',
            sectorId: 'sector-1',
            name: 'Upper Wall',
            sortOrder: 0,
            tabvarDirty: false,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            annotations: [],
            photo: mockProject.photos[0],
            routes: mockProject.routes,
          },
        ],
      },
    ],
  },
  selectedSectorId: 'sector-1',
  selectedTopoId: 'topo-1',
};

describe('sanitizeImageFilename', () => {
  it('converts special characters and spaces to hyphens and downcases', () => {
    expect(sanitizeImageFilename('Upper Wall #2 (Direct!)')).toBe('upper-wall-2-direct');
  });

  it('falls back to "topo" when name contains no alphanumeric characters', () => {
    expect(sanitizeImageFilename('   !@#   ')).toBe('topo');
  });
});

describe('projectForGuidebookTopo', () => {
  it('returns undefined if topo has no attached photo', () => {
    const topoWithoutPhoto = { ...validTopoBundle.crag.sectors[0].topos[0], photo: undefined };
    expect(projectForGuidebookTopo(topoWithoutPhoto)).toBeUndefined();
  });

  it('constructs TopoProject from GuidebookTopo', () => {
    const topo = validTopoBundle.crag.sectors[0].topos[0];
    const project = projectForGuidebookTopo(topo);
    expect(project).toBeDefined();
    expect(project?.id).toBe(topo.id);
    expect(project?.name).toBe(topo.name);
    expect(project?.photos).toEqual([topo.photo]);
    expect(project?.routes).toEqual(topo.routes);
  });
});

describe('extractSingleTopoFromBundle', () => {
  it('rejects crag scope bundles', () => {
    const cragBundle: GuidebookExportBundle = {
      ...validTopoBundle,
      scope: 'crag',
    };
    expect(() => extractSingleTopoFromBundle(cragBundle)).toThrow(
      'Image export is only available for single topo exports.',
    );
  });

  it('rejects sector scope bundles', () => {
    const sectorBundle: GuidebookExportBundle = {
      ...validTopoBundle,
      scope: 'sector',
    };
    expect(() => extractSingleTopoFromBundle(sectorBundle)).toThrow(
      'Image export is only available for single topo exports.',
    );
  });

  it('extracts the single topo when scope is topo', () => {
    const topo = extractSingleTopoFromBundle(validTopoBundle);
    expect(topo.id).toBe('topo-1');
  });
});

describe('exportTopoImage (Native)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);
  });

  it('renders raster as WEBP and writes to cacheDirectory', async () => {
    const uri = await exportTopoImage(mockProject, mockProject.photos[0], { quality: 85 });

    expect(renderTopoRasterBase64).toHaveBeenCalledWith(mockProject, mockProject.photos[0], {
      format: ImageFormat.WEBP,
      quality: 85,
      targetWidth: undefined,
    });
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      'file:///cache/upper-wall.webp',
      'encoded-webp-base64',
      { encoding: 'base64' },
    );
    expect(uri).toBe('file:///cache/upper-wall.webp');
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  it('triggers Sharing.shareAsync when sharing is available', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);

    const uri = await exportTopoImage(mockProject, mockProject.photos[0]);

    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/upper-wall.webp', {
      dialogTitle: 'Share Upper Wall',
      mimeType: 'image/webp',
      UTI: 'org.webmproject.webp',
    });
    expect(uri).toBe('file:///cache/upper-wall.webp');
  });
});

describe('exportSingleTopoImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('successfully exports a single topo from bundle', async () => {
    const uri = await exportSingleTopoImage(validTopoBundle);
    expect(renderTopoRasterBase64).toHaveBeenCalled();
    expect(uri).toBe('file:///cache/upper-wall.webp');
  });

  it('throws when topo has no photo', async () => {
    const bundleNoPhoto: GuidebookExportBundle = {
      ...validTopoBundle,
      crag: {
        ...validTopoBundle.crag,
        sectors: [
          {
            ...validTopoBundle.crag.sectors[0],
            topos: [{ ...validTopoBundle.crag.sectors[0].topos[0], photo: undefined }],
          },
        ],
      },
    };

    await expect(exportSingleTopoImage(bundleNoPhoto)).rejects.toThrow(
      'Topo does not have an attached photo to export.',
    );
  });

  it('throws when bundle is not topo scope', async () => {
    const cragBundle: GuidebookExportBundle = {
      ...validTopoBundle,
      scope: 'crag',
    };

    await expect(exportSingleTopoImage(cragBundle)).rejects.toThrow(
      'Image export is only available for single topo exports.',
    );
  });
});

describe('exportTopoImage (Web)', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
  });

  it('creates an anchor element to download the image file on web', async () => {
    const clickSpy = jest.fn();
    const appendChild = jest.fn();
    const removeChild = jest.fn();
    const fakeAnchor = {
      click: clickSpy,
      href: '',
      download: '',
    };
    const createElement = jest.fn(() => fakeAnchor);

    const originalDocument = (globalThis as any).document;
    (globalThis as any).document = {
      body: {
        appendChild,
        removeChild,
      },
      createElement,
    };

    try {
      const uri = await exportTopoImage(mockProject, mockProject.photos[0]);

      expect(renderTopoRasterBase64).toHaveBeenCalledWith(mockProject, mockProject.photos[0], {
        format: ImageFormat.WEBP,
        quality: 92,
        targetWidth: undefined,
      });
      expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
      expect(createElement).toHaveBeenCalledWith('a');
      expect(appendChild).toHaveBeenCalledWith(fakeAnchor);
      expect(clickSpy).toHaveBeenCalled();
      expect(removeChild).toHaveBeenCalledWith(fakeAnchor);
      expect(fakeAnchor.download).toBe('upper-wall.webp');
      expect(fakeAnchor.href).toBe('data:image/webp;base64,encoded-webp-base64');
      expect(uri).toBe('data:image/webp;base64,encoded-webp-base64');
    } finally {
      (globalThis as any).document = originalDocument;
    }
  });
});
