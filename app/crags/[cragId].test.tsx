import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import type { CragDetail, TabvarRoute } from '@/domain/types';
import { useTopoStore } from '@/state/TopoStore';

import CragDetailScreen from './[cragId]';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@/ui/ShareSheet', () => ({
  ShareSheet: () => null,
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
  useFocusEffect: (cb: () => void) => cb(),
  Stack: {
    Screen: () => null,
  },
}));

jest.mock('@/state/TopoStore', () => ({
  useTopoStore: jest.fn(),
}));

const mockUnmappedRoute: TabvarRoute = {
  id: 301,
  appId: 'tabvar_route_301',
  cragId: 1,
  sectorId: 10,
  name: 'Unmapped Classic',
  gradeYds: '5.10a',
};

const mockDetail: CragDetail = {
  crag: {
    id: 'crag-1',
    name: 'Echo Canyon',
    sortOrder: 0,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  },
  sectors: [
    {
      id: 'sector-1',
      cragId: 'crag-1',
      name: 'Lower Wall',
      sortOrder: 0,
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
      topos: [
        {
          id: 'topo-1',
          sectorId: 'sector-1',
          name: 'The Shield',
          tabvarDirty: false,
          sortOrder: 0,
          createdAt: '2026-06-01T00:00:00.000Z',
          updatedAt: '2026-06-01T00:00:00.000Z',
          routes: [
            {
              id: 'local-route-1',
              topoId: 'topo-1',
              name: 'Custom Line',
              color: '#3B82F6',
              sortOrder: 0,
              createdAt: '2026-06-01T00:00:00.000Z',
              updatedAt: '2026-06-01T00:00:00.000Z',
            },
          ],
          tabvarRoutes: [],
        },
      ],
      unmappedRoutes: [mockUnmappedRoute],
    },
  ],
};

describe('CragDetailScreen with TopoCard and UnmappedRoutesDrawer', () => {
  const mockCreateTopo = jest.fn();
  const mockCreateRoute = jest.fn();
  const mockLinkTabvarRoute = jest.fn();
  const mockUnlinkTabvarRoute = jest.fn();
  const mockReorderTopoRoutes = jest.fn();
  const mockDeleteTopo = jest.fn();
  const mockLoadCragDetail = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ cragId: 'crag-1' });
    mockLoadCragDetail.mockResolvedValue(mockDetail);
    mockCreateTopo.mockResolvedValue({ id: 'topo-new-1', name: 'Unmapped Classic' });
    mockCreateRoute.mockResolvedValue({ id: 'route-new-1', topoId: 'topo-1', name: '' });

    (useTopoStore as unknown as jest.Mock).mockReturnValue({
      isReady: true,
      loadCragDetail: mockLoadCragDetail,
      renameCrag: jest.fn(),
      deleteCrag: jest.fn(),
      createSector: jest.fn(),
      renameSector: jest.fn(),
      deleteSector: jest.fn(),
      createTopo: mockCreateTopo,
      renameTopo: jest.fn(),
      deleteTopo: mockDeleteTopo,
      createRoute: mockCreateRoute,
      linkTabvarRoute: mockLinkTabvarRoute,
      unlinkTabvarRoute: mockUnlinkTabvarRoute,
      reorderTopoRoutes: mockReorderTopoRoutes,
      loadTopoInfo: jest.fn().mockResolvedValue({
        topo: mockDetail.sectors[0].topos[0],
        routes: mockDetail.sectors[0].topos[0].routes,
      }),
      updateTopoDescription: jest.fn(),
      updateRouteField: jest.fn(),
      deleteRoute: jest.fn(),
    });
  });

  it('renders sector container with TopoCard and UnmappedRoutesDrawer', async () => {
    render(<CragDetailScreen />);

    expect(await screen.findByTestId('crag-detail:sector-container:sector-1')).toBeTruthy();
    expect(screen.getByTestId('crag-detail:topo:topo-1')).toBeTruthy();
    expect(screen.getByText('The Shield')).toBeTruthy();
    expect(screen.getByTestId('crag-detail:topo:topo-1:route-row:local-route-1')).toBeTruthy();
    expect(screen.getAllByText('Custom Line').length).toBeGreaterThan(0);
    expect(screen.getByTestId('crag-detail:sector:sector-1:unmapped-drawer')).toBeTruthy();
    expect(screen.getByText('Unmapped Routes (1)')).toBeTruthy();
  });

  it('handles + Add Topo for an unmapped route', async () => {
    render(<CragDetailScreen />);

    await screen.findByTestId('crag-detail:sector-container:sector-1');

    // Expand unmapped drawer
    fireEvent.press(screen.getByTestId('crag-detail:sector:sector-1:unmapped-toggle'));

    expect(screen.getByText('Unmapped Classic')).toBeTruthy();

    // Tap + Add Topo
    const addTopoBtn = screen.getByTestId(
      'crag-detail:sector:sector-1:unmapped-route:tabvar_route_301:add-topo',
    );
    fireEvent.press(addTopoBtn);

    await waitFor(() => {
      expect(mockCreateTopo).toHaveBeenCalledWith('sector-1', 'Unmapped Classic');
      expect(mockLinkTabvarRoute).toHaveBeenCalledWith('topo-new-1', 'tabvar_route_301');
      expect(router.push).toHaveBeenCalledWith('/crags/crag-1/topos/topo-new-1/editor');
    });
  });

  it('prompts differentiated confirmation warning when deleting a topo with local routes', async () => {
    render(<CragDetailScreen />);

    await screen.findByTestId('crag-detail:sector-container:sector-1');

    // Open topo menu
    fireEvent.press(screen.getByTestId('crag-detail:topo:topo-1:menu'));

    // Tap delete in action sheet
    const deleteAction = await screen.findByTestId('crag-detail:topo-menu:delete');
    fireEvent.press(deleteAction);

    // Verify confirmation sheet message
    await waitFor(() => {
      expect(
        screen.getByText(
          'Delete “The Shield”? This topo has 1 custom route created on it that will be permanently deleted.',
        ),
      ).toBeTruthy();
    });
  });

  it('allows linking an unmapped route from the TopoCard + Link Route button', async () => {
    render(<CragDetailScreen />);

    await screen.findByTestId('crag-detail:sector-container:sector-1');

    // Tap Link Route on TopoCard
    const linkBtn = screen.getByTestId('crag-detail:topo:topo-1:link-route');
    fireEvent.press(linkBtn);

    // Link route picker should appear
    const picker = await screen.findByTestId('crag-detail:link-route-picker');
    expect(picker).toBeTruthy();

    // Select the unmapped route
    const routeItem = screen.getByText('Unmapped Classic (5.10a)');
    fireEvent.press(routeItem);

    await waitFor(() => {
      expect(mockLinkTabvarRoute).toHaveBeenCalledWith('topo-1', 'tabvar_route_301');
    });
  });

  it('hides Link Route button on TopoCard when sector has no unmapped connected routes, but keeps Add Route button', async () => {
    mockLoadCragDetail.mockResolvedValue({
      ...mockDetail,
      sectors: [
        {
          ...mockDetail.sectors[0],
          unmappedRoutes: [],
        },
      ],
    });

    render(<CragDetailScreen />);

    await screen.findByTestId('crag-detail:sector-container:sector-1');

    expect(screen.queryByTestId('crag-detail:topo:topo-1:link-route')).toBeNull();
    expect(screen.getByTestId('crag-detail:topo:topo-1:create-route')).toBeTruthy();
  });

  it('creates a new route and opens route edit sheet when tapping Add Route on TopoCard', async () => {
    render(<CragDetailScreen />);

    await screen.findByTestId('crag-detail:sector-container:sector-1');

    const addRouteBtn = screen.getByTestId('crag-detail:topo:topo-1:create-route');
    fireEvent.press(addRouteBtn);

    await waitFor(() => {
      expect(mockCreateRoute).toHaveBeenCalledWith('topo-1', { name: '' });
      expect(screen.getByTestId('route-edit:sheet')).toBeTruthy();
    });
  });

  it('opens route edit sheet when tapping a locally created route row on TopoCard', async () => {
    render(<CragDetailScreen />);

    await screen.findByTestId('crag-detail:sector-container:sector-1');

    const routeRow = screen.getByTestId('crag-detail:topo:topo-1:route-row:local-route-1');
    fireEvent.press(routeRow);

    await waitFor(() => {
      expect(screen.getByTestId('route-edit:sheet')).toBeTruthy();
    });
  });

  it('supports drag-and-drop linking of an unmapped route onto a topo card', async () => {
    render(<CragDetailScreen />);

    await screen.findByTestId('crag-detail:sector-container:sector-1');

    // Expand unmapped drawer
    fireEvent.press(screen.getByTestId('crag-detail:sector:sector-1:unmapped-toggle'));

    const dragHandle = screen.getByTestId(
      'crag-detail:sector:sector-1:unmapped-route:tabvar_route_301:drag-handle',
    );
    expect(dragHandle).toBeTruthy();

    // Start drag
    act(() => {
      dragHandle.props._gesture._onStart({ absoluteX: 50, absoluteY: 150 });
    });

    // Drag preview should be visible
    const preview = screen.getByTestId('crag-detail:drag-preview');
    expect(preview).toBeTruthy();
    expect(screen.getAllByText('Unmapped Classic').length).toBeGreaterThanOrEqual(2);

    // Move drag over topo-1 (measured in jest.setup within x: 0..300, y: 100..300)
    act(() => {
      dragHandle.props._gesture._onUpdate({ absoluteX: 100, absoluteY: 150 });
    });

    // Drop onto topo
    await act(async () => {
      dragHandle.props._gesture._onEnd();
    });

    await waitFor(() => {
      expect(mockLinkTabvarRoute).toHaveBeenCalledWith('topo-1', 'tabvar_route_301', 0);
    });
  });

  it('unlinks a connected route when pressing the unlink button on TopoCard', async () => {
    const detailWithLinkedRoute: CragDetail = {
      ...mockDetail,
      sectors: [
        {
          ...mockDetail.sectors[0],
          topos: [
            {
              ...mockDetail.sectors[0].topos[0],
              tabvarRoutes: [mockUnmappedRoute],
            },
          ],
        },
      ],
    };
    mockLoadCragDetail.mockResolvedValue(detailWithLinkedRoute);

    render(<CragDetailScreen />);

    const unlinkBtn = await screen.findByTestId(
      'crag-detail:topo:topo-1:tabvar-route:tabvar_route_301:unlink',
    );
    expect(unlinkBtn).toBeTruthy();
    fireEvent.press(unlinkBtn);

    await waitFor(() => {
      expect(mockUnlinkTabvarRoute).toHaveBeenCalledWith('topo-1', 'tabvar_route_301');
    });
  });

  it('supports reordering routes within a topo by dragging', async () => {
    const detailWithTwoRoutes: CragDetail = {
      ...mockDetail,
      sectors: [
        {
          ...mockDetail.sectors[0],
          topos: [
            {
              ...mockDetail.sectors[0].topos[0],
              routes: [
                {
                  id: 'local-route-1',
                  topoId: 'topo-1',
                  name: 'First Line',
                  color: '#3B82F6',
                  sortOrder: 0,
                  createdAt: '2026-06-01T00:00:00.000Z',
                  updatedAt: '2026-06-01T00:00:00.000Z',
                },
                {
                  id: 'local-route-2',
                  topoId: 'topo-1',
                  name: 'Second Line',
                  color: '#EF4444',
                  sortOrder: 1,
                  createdAt: '2026-06-01T00:00:00.000Z',
                  updatedAt: '2026-06-01T00:00:00.000Z',
                },
              ],
            },
          ],
        },
      ],
    };
    mockLoadCragDetail.mockResolvedValue(detailWithTwoRoutes);

    render(<CragDetailScreen />);

    const handle = await screen.findByTestId(
      'crag-detail:topo:topo-1:route:local-route-2:drag-handle',
    );
    expect(handle).toBeTruthy();
    const gesture = handle.props._gesture;

    // Start drag on local-route-2
    act(() => {
      gesture._onStart({ absoluteX: 50, absoluteY: 180 });
    });

    // Move to slot 0 within topo-1 bounds
    act(() => {
      gesture._onUpdate({ absoluteX: 100, absoluteY: 110 });
    });

    // Drop
    await act(async () => {
      gesture._onEnd();
    });

    await waitFor(() => {
      expect(mockReorderTopoRoutes).toHaveBeenCalledWith('topo-1', [
        { kind: 'local', id: 'local-route-2' },
        { kind: 'local', id: 'local-route-1' },
      ]);
    });
  });

  it('does nothing when dragging an existing topo route onto another topo or off-target', async () => {
    const detailWithTwoTopos: CragDetail = {
      ...mockDetail,
      sectors: [
        {
          ...mockDetail.sectors[0],
          topos: [
            mockDetail.sectors[0].topos[0],
            {
              id: 'topo-2',
              sectorId: 'sector-1',
              name: 'Second Topo',
              tabvarDirty: false,
              sortOrder: 1,
              createdAt: '2026-06-01T00:00:00.000Z',
              updatedAt: '2026-06-01T00:00:00.000Z',
              routes: [],
              tabvarRoutes: [],
            },
          ],
        },
      ],
    };
    mockLoadCragDetail.mockResolvedValue(detailWithTwoTopos);

    render(<CragDetailScreen />);

    const handle = await screen.findByTestId(
      'crag-detail:topo:topo-1:route:local-route-1:drag-handle',
    );
    const gesture = handle.props._gesture;

    // Start drag on topo-1's route
    act(() => {
      gesture._onStart({ absoluteX: 50, absoluteY: 120 });
    });

    // Move outside any topo bounds (e.g. far below)
    act(() => {
      gesture._onUpdate({ absoluteX: 100, absoluteY: 999 });
    });

    // Drop outside
    await act(async () => {
      gesture._onEnd();
    });

    expect(mockReorderTopoRoutes).not.toHaveBeenCalled();
    expect(mockLinkTabvarRoute).not.toHaveBeenCalled();
  });
});


