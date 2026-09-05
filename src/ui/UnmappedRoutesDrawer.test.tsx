import { fireEvent, render, screen } from '@testing-library/react-native';

import type { TabvarRoute, TopoWithRoutes } from '@/domain/types';

import { UnmappedRoutesDrawer } from './UnmappedRoutesDrawer';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

const mockRoutes: TabvarRoute[] = [
  {
    id: 201,
    appId: 'tabvar_route_201',
    cragId: 10,
    sectorId: 20,
    name: 'Crack of Doom',
    gradeYds: '5.10c',
    climbStyle: 'Trad',
  },
  {
    id: 202,
    appId: 'tabvar_route_202',
    cragId: 10,
    sectorId: 20,
    name: 'Lightning Bolt',
    gradeYds: '5.12a',
    climbStyle: 'Sport',
    boltCount: 6,
  },
];

const mockTopo: TopoWithRoutes = {
  id: 'topo-1',
  sectorId: 'sector-1',
  name: 'Main Wall',
  tabvarDirty: true,
  sortOrder: 0,
  createdAt: '2026-05-30T00:00:00.000Z',
  updatedAt: '2026-05-30T00:00:00.000Z',
  routes: [],
};

describe('UnmappedRoutesDrawer', () => {
  it('renders nothing when routes array is empty', () => {
    const { toJSON } = render(
      <UnmappedRoutesDrawer
        onAddTopoForRoute={jest.fn()}
        onLinkRoute={jest.fn()}
        routes={[]}
        sectorId="sector-1"
        topos={[mockTopo]}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders collapsed header initially and expands on press', () => {
    render(
      <UnmappedRoutesDrawer
        onAddTopoForRoute={jest.fn()}
        onLinkRoute={jest.fn()}
        routes={mockRoutes}
        sectorId="sector-1"
        topos={[mockTopo]}
      />,
    );

    expect(screen.getByText('Unmapped Routes (2)')).toBeTruthy();
    // Route names shouldn't be visible while collapsed
    expect(screen.queryByText('Crack of Doom')).toBeNull();

    // Tap toggle to expand
    fireEvent.press(screen.getByTestId('crag-detail:sector:sector-1:unmapped-toggle'));

    expect(screen.getByText('Crack of Doom')).toBeTruthy();
    expect(screen.getByText('Lightning Bolt')).toBeTruthy();
  });

  it('invokes onAddTopoForRoute when + Add Topo is pressed', () => {
    const onAddTopo = jest.fn();
    render(
      <UnmappedRoutesDrawer
        onAddTopoForRoute={onAddTopo}
        onLinkRoute={jest.fn()}
        routes={mockRoutes}
        sectorId="sector-1"
        topos={[mockTopo]}
      />,
    );

    fireEvent.press(screen.getByTestId('crag-detail:sector:sector-1:unmapped-toggle'));

    const addBtn = screen.getByTestId(
      'crag-detail:sector:sector-1:unmapped-route:tabvar_route_201:add-topo',
    );
    fireEvent.press(addBtn);

    expect(onAddTopo).toHaveBeenCalledTimes(1);
    expect(onAddTopo).toHaveBeenCalledWith(mockRoutes[0]);
  });

  it('invokes onLinkRoute when Link is pressed', () => {
    const onLink = jest.fn();
    render(
      <UnmappedRoutesDrawer
        onAddTopoForRoute={jest.fn()}
        onLinkRoute={onLink}
        routes={mockRoutes}
        sectorId="sector-1"
        topos={[mockTopo]}
      />,
    );

    fireEvent.press(screen.getByTestId('crag-detail:sector:sector-1:unmapped-toggle'));

    const linkBtn = screen.getByTestId(
      'crag-detail:sector:sector-1:unmapped-route:tabvar_route_201:link',
    );
    fireEvent.press(linkBtn);

    expect(onLink).toHaveBeenCalledTimes(1);
    expect(onLink).toHaveBeenCalledWith(mockRoutes[0]);
  });

  it('hides Link button when topos array is empty', () => {
    render(
      <UnmappedRoutesDrawer
        onAddTopoForRoute={jest.fn()}
        onLinkRoute={jest.fn()}
        routes={mockRoutes}
        sectorId="sector-1"
        topos={[]}
      />,
    );

    fireEvent.press(screen.getByTestId('crag-detail:sector:sector-1:unmapped-toggle'));

    expect(
      screen.queryByTestId('crag-detail:sector:sector-1:unmapped-route:tabvar_route_201:link'),
    ).toBeNull();
    // Add topo button is still present
    expect(
      screen.getByTestId('crag-detail:sector:sector-1:unmapped-route:tabvar_route_201:add-topo'),
    ).toBeTruthy();
  });
});
