import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { GuidebookExportBundle } from '@/domain/types';
import { exportSingleTopoImage } from '@/export/image';
import { exportGuidebookPdf } from '@/export/pdf';
import { loadTabvarSession } from '@/integrations/tabvar/sessionStore';
import { useTopoStore } from '@/state/TopoStore';

import { ShareSheet, type ShareScope } from './ShareSheet';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

jest.mock('react-native-keyboard-controller', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    KeyboardAwareScrollView: ({ children }: { children: unknown }) => React.createElement(View, null, children),
  };
});

jest.mock('@/export/pdf', () => ({
  exportGuidebookPdf: jest.fn(async () => 'file://guidebook.pdf'),
}));

jest.mock('@/export/image', () => ({
  exportSingleTopoImage: jest.fn(async () => 'file://topo-image.webp'),
}));

jest.mock('@/integrations/tabvar/sessionStore', () => ({
  loadTabvarSession: jest.fn(),
}));

jest.mock('@/state/TopoStore', () => ({
  useTopoStore: jest.fn(),
}));

const bundle: GuidebookExportBundle = {
  scope: 'crag',
  crag: {
    id: 'crag-1',
    name: 'Guide Crag',
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    sectors: [],
  },
};

const singleRouteBundle: GuidebookExportBundle = {
  scope: 'topo',
  crag: {
    id: 'crag-1',
    name: 'Guide Crag',
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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
            name: 'Topo 1',
            sortOrder: 0,
            tabvarDirty: false,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            annotations: [],
            photo: {
              id: 'photo-1',
              topoId: 'topo-1',
              uri: 'file://photo.jpg',
              width: 1000,
              height: 800,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
            routes: [
              {
                id: 'route-1',
                topoId: 'topo-1',
                name: 'Route 1',
                grade: '5.10a',
                color: '#EF4444',
                sortOrder: 0,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
            ],
          },
        ],
      },
    ],
  },
};

const multiRouteBundle: GuidebookExportBundle = {
  scope: 'topo',
  crag: {
    id: 'crag-1',
    name: 'Guide Crag',
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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
            name: 'Topo 1',
            sortOrder: 0,
            tabvarDirty: false,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            annotations: [],
            photo: {
              id: 'photo-1',
              topoId: 'topo-1',
              uri: 'file://photo.jpg',
              width: 1000,
              height: 800,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
            routes: [
              {
                id: 'route-1',
                topoId: 'topo-1',
                name: 'Route 1',
                grade: '5.10a',
                color: '#EF4444',
                sortOrder: 0,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
              {
                id: 'route-2',
                topoId: 'topo-1',
                name: 'Route 2',
                grade: '5.11b',
                color: '#3B82F6',
                sortOrder: 1,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
            ],
          },
        ],
      },
    ],
  },
};

const scopes: ShareScope[] = [
  { kind: 'crag', cragId: 'crag-1', name: 'Guide Crag' },
  { kind: 'sector', sectorId: 'sector-1', name: 'Main Wall' },
  { kind: 'topo', topoId: 'topo-1', name: 'Left Slab' },
];

describe('ShareSheet', () => {
  const loadGuidebookExport = jest.fn(async () => bundle);
  const submitToTabvar = jest.fn(async () => ({ id: 'submission-1', status: 'pending' }));

  beforeEach(() => {
    jest.clearAllMocks();
    (loadTabvarSession as jest.Mock).mockResolvedValue(undefined);
    (useTopoStore as jest.Mock).mockReturnValue({ loadGuidebookExport, submitToTabvar });
  });

  it.each(scopes)('offers PDF export for $kind scopes', async (scope) => {
    render(<ShareSheet onClose={jest.fn()} scope={scope} />);

    await waitFor(() => expect(screen.getByText('Guidebook-style PDF')).toBeTruthy());

    fireEvent.press(screen.getByTestId('share:export-pdf'));

    await waitFor(() => expect(exportGuidebookPdf).toHaveBeenCalledWith(bundle));
    expect(screen.getByText('Saved: file://guidebook.pdf')).toBeTruthy();
  });

  it('surfaces runtime export errors without dismissing the sheet', async () => {
    (exportGuidebookPdf as jest.Mock).mockRejectedValueOnce(new Error('Print failed'));

    render(<ShareSheet onClose={jest.fn()} scope={scopes[0]} />);
    await waitFor(() => expect(screen.getByText('Guidebook-style PDF')).toBeTruthy());

    fireEvent.press(screen.getByTestId('share:export-pdf'));

    await waitFor(() => expect(screen.getByTestId('share:export-error').props.children).toBe('Print failed'));
    expect(screen.getByTestId('share-placeholder:sheet')).toBeTruthy();
  });

  it('disables Tabvar submission when Tabvar is not connected', async () => {
    render(<ShareSheet onClose={jest.fn()} scope={scopes[0]} />);

    await waitFor(() => expect(screen.getByText('Connect in Settings to submit')).toBeTruthy());

    fireEvent.press(screen.getByTestId('share:submit-tabvar'));

    expect(submitToTabvar).not.toHaveBeenCalled();
  });

  it('submits the current share scope to Tabvar when connected', async () => {
    (loadTabvarSession as jest.Mock).mockResolvedValueOnce({
      accessToken: 'tabvar-token',
      connectedAt: '2026-01-01T00:00:00.000Z',
      tabvarUserId: 'user-1',
    });

    render(<ShareSheet onClose={jest.fn()} scope={scopes[1]} />);

    await waitFor(() => expect(screen.getByText('Submit to Tabvar')).toBeTruthy());

    fireEvent.press(screen.getByTestId('share:submit-tabvar'));

    await waitFor(() => {
      expect(submitToTabvar).toHaveBeenCalledWith({ kind: 'sector', sectorId: 'sector-1' });
    });
    expect(screen.getByTestId('share:submit-tabvar-result').props.children).toBe(
      'Submitted to Tabvar (submission-1).',
    );
  });

  it('surfaces Tabvar submission errors without dismissing the sheet', async () => {
    (loadTabvarSession as jest.Mock).mockResolvedValueOnce({
      accessToken: 'tabvar-token',
      connectedAt: '2026-01-01T00:00:00.000Z',
      tabvarUserId: 'user-1',
    });
    submitToTabvar.mockRejectedValueOnce(new Error('Tabvar failed'));

    render(<ShareSheet onClose={jest.fn()} scope={scopes[2]} />);

    await waitFor(() => expect(screen.getByText('Submit to Tabvar')).toBeTruthy());
    fireEvent.press(screen.getByTestId('share:submit-tabvar'));

    await waitFor(() =>
      expect(screen.getByTestId('share:submit-tabvar-error').props.children).toBe('Tabvar failed'),
    );
    expect(screen.getByTestId('share-placeholder:sheet')).toBeTruthy();
  });

  it('offers Image export only for topo scope, not for crag or sector scopes', async () => {
    const { unmount: unmountCrag } = render(<ShareSheet onClose={jest.fn()} scope={scopes[0]} />);
    await waitFor(() => expect(screen.getByText('Guidebook-style PDF')).toBeTruthy());
    expect(screen.queryByTestId('share:export-image')).toBeNull();
    unmountCrag();

    const { unmount: unmountSector } = render(<ShareSheet onClose={jest.fn()} scope={scopes[1]} />);
    await waitFor(() => expect(screen.getByText('Guidebook-style PDF')).toBeTruthy());
    expect(screen.queryByTestId('share:export-image')).toBeNull();
    unmountSector();

    render(<ShareSheet onClose={jest.fn()} scope={scopes[2]} />);
    await waitFor(() => expect(screen.getByTestId('share:export-image')).toBeTruthy());
    expect(screen.getByText('Image')).toBeTruthy();
    expect(screen.getByText('Annotated topo image')).toBeTruthy();
  });

  it('exports single topo image directly when topo has <= 1 route', async () => {
    loadGuidebookExport.mockResolvedValueOnce(singleRouteBundle);

    render(<ShareSheet onClose={jest.fn()} scope={scopes[2]} />);

    await waitFor(() => expect(screen.getByTestId('share:export-image')).toBeTruthy());
    expect(screen.getByText('Annotated topo image')).toBeTruthy();

    fireEvent.press(screen.getByTestId('share:export-image'));

    await waitFor(() =>
      expect(exportSingleTopoImage).toHaveBeenCalledWith(singleRouteBundle, { includeRoutes: false }),
    );
    expect(screen.getByText('Saved: file://topo-image.webp')).toBeTruthy();
  });

  it('shows route options sheet when topo has > 1 route and exports with routes when Print Routes is selected', async () => {
    loadGuidebookExport.mockResolvedValueOnce(multiRouteBundle);

    render(<ShareSheet onClose={jest.fn()} scope={scopes[2]} />);

    await waitFor(() => expect(screen.getByTestId('share:export-image')).toBeTruthy());

    fireEvent.press(screen.getByTestId('share:export-image'));

    await waitFor(() => expect(screen.getByTestId('share:image-route-options:print-routes')).toBeTruthy());
    expect(exportSingleTopoImage).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('share:image-route-options:print-routes'));

    await waitFor(() =>
      expect(exportSingleTopoImage).toHaveBeenCalledWith(multiRouteBundle, { includeRoutes: true }),
    );
    expect(screen.getByText('Saved: file://topo-image.webp')).toBeTruthy();
  });

  it('exports topo only when Topo Only is selected from route options sheet', async () => {
    loadGuidebookExport.mockResolvedValueOnce(multiRouteBundle);

    render(<ShareSheet onClose={jest.fn()} scope={scopes[2]} />);

    await waitFor(() => expect(screen.getByTestId('share:export-image')).toBeTruthy());

    fireEvent.press(screen.getByTestId('share:export-image'));

    await waitFor(() => expect(screen.getByTestId('share:image-route-options:topo-only')).toBeTruthy());

    fireEvent.press(screen.getByTestId('share:image-route-options:topo-only'));

    await waitFor(() =>
      expect(exportSingleTopoImage).toHaveBeenCalledWith(multiRouteBundle, { includeRoutes: false }),
    );
    expect(screen.getByText('Saved: file://topo-image.webp')).toBeTruthy();
  });

  it('shows route options sheet when topo has 1 local and 1 connected route (total > 1)', async () => {
    const mixedBundle: GuidebookExportBundle = {
      ...singleRouteBundle,
      crag: {
        ...singleRouteBundle.crag,
        sectors: [
          {
            ...singleRouteBundle.crag.sectors[0],
            topos: [
              {
                ...singleRouteBundle.crag.sectors[0].topos[0],
                routes: [singleRouteBundle.crag.sectors[0].topos[0].routes[0]],
                tabvarRoutes: [
                  {
                    id: 99,
                    appId: 'tabvar-99',
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

    loadGuidebookExport.mockResolvedValueOnce(mixedBundle);

    render(<ShareSheet onClose={jest.fn()} scope={scopes[2]} />);
    await waitFor(() => expect(screen.getByTestId('share:export-image')).toBeTruthy());

    fireEvent.press(screen.getByTestId('share:export-image'));

    await waitFor(() => expect(screen.getByTestId('share:image-route-options:print-routes')).toBeTruthy());

    fireEvent.press(screen.getByTestId('share:image-route-options:print-routes'));

    await waitFor(() =>
      expect(exportSingleTopoImage).toHaveBeenCalledWith(mixedBundle, { includeRoutes: true }),
    );
  });

  it('exports directly when topo has 0 local routes and 1 connected route', async () => {
    const connectedOnlyBundle: GuidebookExportBundle = {
      ...singleRouteBundle,
      crag: {
        ...singleRouteBundle.crag,
        sectors: [
          {
            ...singleRouteBundle.crag.sectors[0],
            topos: [
              {
                ...singleRouteBundle.crag.sectors[0].topos[0],
                routes: [],
                tabvarRoutes: [
                  {
                    id: 99,
                    appId: 'tabvar-99',
                    cragId: 1,
                    sectorId: 1,
                    name: 'Connected Route',
                    gradeYds: '5.12a',
                    sortOrder: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    loadGuidebookExport.mockResolvedValueOnce(connectedOnlyBundle);

    render(<ShareSheet onClose={jest.fn()} scope={scopes[2]} />);
    await waitFor(() => expect(screen.getByTestId('share:export-image')).toBeTruthy());

    fireEvent.press(screen.getByTestId('share:export-image'));

    await waitFor(() =>
      expect(exportSingleTopoImage).toHaveBeenCalledWith(connectedOnlyBundle, { includeRoutes: false }),
    );
    expect(screen.getByText('Saved: file://topo-image.webp')).toBeTruthy();
  });

  it('surfaces runtime image export errors without dismissing the sheet', async () => {
    (exportSingleTopoImage as jest.Mock).mockRejectedValueOnce(new Error('Raster failed'));

    render(<ShareSheet onClose={jest.fn()} scope={scopes[2]} />);
    await waitFor(() => expect(screen.getByTestId('share:export-image')).toBeTruthy());

    fireEvent.press(screen.getByTestId('share:export-image'));

    await waitFor(() =>
      expect(screen.getByTestId('share:export-error').props.children).toBe('Raster failed'),
    );
    expect(screen.getByTestId('share-placeholder:sheet')).toBeTruthy();
  });
});
