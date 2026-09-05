import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
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
  const mockLinkTabvarRoute = jest.fn();
  const mockDeleteTopo = jest.fn();
  const mockLoadCragDetail = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ cragId: 'crag-1' });
    mockLoadCragDetail.mockResolvedValue(mockDetail);
    mockCreateTopo.mockResolvedValue({ id: 'topo-new-1', name: 'Unmapped Classic' });

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
      linkTabvarRoute: mockLinkTabvarRoute,
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
});
