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
  resolveTopoExportBaseFilename,
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

describe('resolveTopoExportBaseFilename', () => {
  it('uses custom topo name when provided', () => {
    expect(
      resolveTopoExportBaseFilename({
        topoName: 'The Great Arch',
        sectorName: 'Main Sector',
        routes: mockProject.routes,
      }),
    ).toBe('The Great Arch');
  });

  it('uses route name when topo has default name "Topo N" and exactly 1 route', () => {
    expect(
      resolveTopoExportBaseFilename({
        topoName: 'Topo 1',
        sectorName: 'Main Sector',
        routes: [{ ...mockProject.routes[0], name: 'Sunset Strip' }],
      }),
    ).toBe('Sunset Strip');

    expect(
      resolveTopoExportBaseFilename({
        topoName: 'Topo 42',
        sectorName: 'Main Sector',
        routes: [{ ...mockProject.routes[0], name: 'Red Crack' }],
      }),
    ).toBe('Red Crack');
  });

  it('uses "sector_name - Topo N" when topo has default name and route count is not 1', () => {
    // 2 routes
    expect(
      resolveTopoExportBaseFilename({
        topoName: 'Topo 2',
        sectorName: 'Main Sector',
        routes: [
          mockProject.routes[0],
          { ...mockProject.routes[0], id: 'route-2', name: 'Second' },
        ],
      }),
    ).toBe('Main Sector - Topo 2');

    // 0 routes
    expect(
      resolveTopoExportBaseFilename({
        topoName: 'Topo 3',
        sectorName: 'Main Sector',
        routes: [],
      }),
    ).toBe('Main Sector - Topo 3');
  });

  it('handles empty topo name by using route name if 1 route, or sector - Topo 1 if not 1 route', () => {
    expect(
      resolveTopoExportBaseFilename({
        topoName: '',
        sectorName: 'North Wall',
        routes: [{ ...mockProject.routes[0], name: 'Solo Line' }],
      }),
    ).toBe('Solo Line');

    expect(
      resolveTopoExportBaseFilename({
        topoName: '',
        sectorName: 'North Wall',
        routes: [],
      }),
    ).toBe('North Wall - Topo 1');
  });
});

describe('sanitizeImageFilename', () => {
  it('converts special characters and spaces to hyphens and downcases', () => {
    expect(sanitizeImageFilename('Upper Wall #2 (Direct!)')).toBe('upper-wall-2-direct');
  });

  it('collapses multiple consecutive hyphens into a single hyphen', () => {
    expect(sanitizeImageFilename('Main Sector - Topo 2')).toBe('main-sector-topo-2');
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

  it('unifies local and connected tabvar routes in sortOrder', () => {
    const topoWithBoth = {
      ...validTopoBundle.crag.sectors[0].topos[0],
      annotations: [
        {
          id: 'line-2',
          topoId: 'topo-1',
          routeAppId: 'tabvar_route_123',
          kind: 'climbLine' as const,
          color: '#10B981',
          points: [
            { x: 0.2, y: 0.2 },
            { x: 0.5, y: 0.5 },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      routes: [
        {
          id: 'local-1',
          topoId: 'topo-1',
          name: 'Second Local',
          grade: '5.10b',
          color: '#EF4444',
          sortOrder: 2,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      tabvarRoutes: [
        {
          id: 1,
          appId: 'tabvar_route_123',
          cragId: 1,
          sectorId: 1,
          name: 'First Tabvar',
          gradeYds: '5.11a',
          sortOrder: 0,
        },
        {
          id: 2,
          appId: 'tabvar_route_456',
          cragId: 1,
          sectorId: 1,
          name: 'Third Tabvar',
          gradeYds: '5.12c',
          sortOrder: 5,
        },
      ],
    };

    const project = projectForGuidebookTopo(topoWithBoth);
    expect(project?.routes).toHaveLength(3);
    // Ordered by sortOrder: First Tabvar (0), Second Local (2), Third Tabvar (5)
    expect(project?.routes[0].name).toBe('First Tabvar');
    expect(project?.routes[0].grade).toBe('5.11a');

    expect(project?.routes[1].name).toBe('Second Local');
    expect(project?.routes[1].grade).toBe('5.10b');

    expect(project?.routes[2].name).toBe('Third Tabvar');
    expect(project?.routes[2].grade).toBe('5.12c');
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

  it('passes includeRoutes option to renderTopoRasterBase64', async () => {
    await exportSingleTopoImage(validTopoBundle, { includeRoutes: true });
    expect(renderTopoRasterBase64).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ includeRoutes: true }),
    );
  });

  it('resolves filename to route name when topo name is default "Topo 1" with 1 route', async () => {
    const bundleDefaultName: GuidebookExportBundle = {
      ...validTopoBundle,
      crag: {
        ...validTopoBundle.crag,
        sectors: [
          {
            ...validTopoBundle.crag.sectors[0],
            topos: [
              {
                ...validTopoBundle.crag.sectors[0].topos[0],
                name: 'Topo 1',
                routes: [{ ...mockProject.routes[0], name: 'Sunset Strip' }],
              },
            ],
          },
        ],
      },
    };

    const uri = await exportSingleTopoImage(bundleDefaultName);
    expect(uri).toBe('file:///cache/sunset-strip.webp');
  });

  it('resolves filename to "sector - topo" when topo name is default "Topo 2" with multiple routes', async () => {
    const bundleDefaultMulti: GuidebookExportBundle = {
      ...validTopoBundle,
      crag: {
        ...validTopoBundle.crag,
        sectors: [
          {
            ...validTopoBundle.crag.sectors[0],
            name: 'Main Sector',
            topos: [
              {
                ...validTopoBundle.crag.sectors[0].topos[0],
                name: 'Topo 2',
                routes: [
                  mockProject.routes[0],
                  { ...mockProject.routes[0], id: 'route-2', name: 'Second' },
                ],
              },
            ],
          },
        ],
      },
    };

    const uri = await exportSingleTopoImage(bundleDefaultMulti);
    expect(uri).toBe('file:///cache/main-sector-topo-2.webp');
  });

  it('resolves filename to connected route name when default topo has 0 local routes and 1 connected route', async () => {
    const bundleWithConnectedRoute: GuidebookExportBundle = {
      ...validTopoBundle,
      crag: {
        ...validTopoBundle.crag,
        sectors: [
          {
            ...validTopoBundle.crag.sectors[0],
            topos: [
              {
                ...validTopoBundle.crag.sectors[0].topos[0],
                name: 'Topo 1',
                routes: [],
                tabvarRoutes: [
                  {
                    id: 42,
                    appId: 'tabvar_42',
                    cragId: 1,
                    sectorId: 1,
                    name: 'Super Crack',
                    gradeYds: '5.10c',
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const uri = await exportSingleTopoImage(bundleWithConnectedRoute);
    expect(uri).toBe('file:///cache/super-crack.webp');
  });

  it('passes both local and connected routes to renderTopoRasterBase64 when includeRoutes is true', async () => {
    const bundleWithBoth: GuidebookExportBundle = {
      ...validTopoBundle,
      crag: {
        ...validTopoBundle.crag,
        sectors: [
          {
            ...validTopoBundle.crag.sectors[0],
            topos: [
              {
                ...validTopoBundle.crag.sectors[0].topos[0],
                routes: [
                  {
                    id: 'local-1',
                    topoId: 'topo-1',
                    name: 'Local Route',
                    grade: '5.9',
                    color: '#FF0000',
                    sortOrder: 0,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                  },
                ],
                tabvarRoutes: [
                  {
                    id: 99,
                    appId: 'tabvar_99',
                    cragId: 1,
                    sectorId: 1,
                    name: 'Connected Route',
                    gradeYds: '5.12a',
                    sortOrder: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    await exportSingleTopoImage(bundleWithBoth, { includeRoutes: true });
    expect(renderTopoRasterBase64).toHaveBeenCalledWith(
      expect.objectContaining({
        routes: expect.arrayContaining([
          expect.objectContaining({ name: 'Local Route' }),
          expect.objectContaining({ name: 'Connected Route' }),
        ]),
      }),
      expect.anything(),
      expect.objectContaining({ includeRoutes: true }),
    );
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
