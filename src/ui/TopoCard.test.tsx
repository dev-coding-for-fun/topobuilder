import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Route, TabvarRoute, TopoWithRoutes } from '@/domain/types';

import { TopoCard } from './TopoCard';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

const mockLocalRoute: Route = {
  id: 'route-local-1',
  topoId: 'topo-1',
  name: 'Warmup Slab',
  grade: '5.9',
  color: '#EF4444',
  sortOrder: 1,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const mockTabvarRoute: TabvarRoute = {
  id: 101,
  appId: 'tabvar_route_101',
  cragId: 10,
  sectorId: 20,
  name: 'Directissima',
  gradeYds: '5.11a',
  boltCount: 7,
  sortOrder: 2,
};

const baseTopo: TopoWithRoutes = {
  id: 'topo-1',
  sectorId: 'sector-1',
  name: 'Main Wall',
  photoUri: undefined,
  photoWidth: undefined,
  photoHeight: undefined,
  tabvarDirty: true,
  sortOrder: 0,
  createdAt: '2026-05-30T00:00:00.000Z',
  updatedAt: '2026-05-30T00:00:00.000Z',
  routes: [mockLocalRoute],
  tabvarRoutes: [mockTabvarRoute],
};

describe('TopoCard', () => {
  it('renders placeholder banner when no photo is attached', () => {
    render(
      <TopoCard
        onMenu={jest.fn()}
        onOpen={jest.fn()}
        onShare={jest.fn()}
        topo={baseTopo}
      />,
    );

    expect(screen.getByTestId('crag-detail:topo:topo-1:banner-placeholder')).toBeTruthy();
    expect(screen.queryByTestId('crag-detail:topo:topo-1:thumb-image')).toBeNull();
  });

  it('renders image banner when photoUri is provided', () => {
    render(
      <TopoCard
        onMenu={jest.fn()}
        onOpen={jest.fn()}
        onShare={jest.fn()}
        topo={{ ...baseTopo, photoUri: 'file://topo-image.jpg' }}
      />,
    );

    const image = screen.getByTestId('crag-detail:topo:topo-1:thumb-image');
    expect(image.props.source).toEqual([{ uri: 'file://topo-image.jpg' }]);
  });

  it('triggers onOpen when tapping banner', () => {
    const onOpen = jest.fn();
    render(
      <TopoCard
        onMenu={jest.fn()}
        onOpen={onOpen}
        onShare={jest.fn()}
        topo={baseTopo}
      />,
    );

    fireEvent.press(screen.getByTestId('crag-detail:topo:topo-1:open'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('triggers onShare and onMenu', () => {
    const onShare = jest.fn();
    const onMenu = jest.fn();
    render(
      <TopoCard
        onMenu={onMenu}
        onOpen={jest.fn()}
        onShare={onShare}
        topo={baseTopo}
      />,
    );

    fireEvent.press(screen.getByTestId('crag-detail:topo:topo-1:share'));
    expect(onShare).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId('crag-detail:topo:topo-1:menu'));
    expect(onMenu).toHaveBeenCalledTimes(1);
  });

  it('renders nested route rows with Local and TABVAR badges', () => {
    render(
      <TopoCard
        onMenu={jest.fn()}
        onOpen={jest.fn()}
        onShare={jest.fn()}
        topo={baseTopo}
      />,
    );

    expect(screen.getByText('Warmup Slab')).toBeTruthy();
    expect(screen.getByText('5.9')).toBeTruthy();
    const localBadge = screen.getByTestId('crag-detail:topo:topo-1:route:route-local-1:badge');
    expect(localBadge).toBeTruthy();

    expect(screen.getByText('Directissima')).toBeTruthy();
    expect(screen.getByText('5.11a')).toBeTruthy();
    const tabvarBadge = screen.getByTestId('crag-detail:topo:topo-1:tabvar-route:tabvar_route_101:badge');
    expect(tabvarBadge).toBeTruthy();
  });

  it('renders onLinkRoute button and invokes it on press', () => {
    const onLinkRoute = jest.fn();
    render(
      <TopoCard
        onLinkRoute={onLinkRoute}
        onMenu={jest.fn()}
        onOpen={jest.fn()}
        onShare={jest.fn()}
        topo={baseTopo}
      />,
    );

    const linkBtn = screen.getByTestId('crag-detail:topo:topo-1:link-route');
    expect(linkBtn).toBeTruthy();
    fireEvent.press(linkBtn);
    expect(onLinkRoute).toHaveBeenCalledTimes(1);
  });

  it('hides onLinkRoute button when canLinkRoute is false even if onLinkRoute is provided', () => {
    const onLinkRoute = jest.fn();
    render(
      <TopoCard
        canLinkRoute={false}
        onLinkRoute={onLinkRoute}
        onMenu={jest.fn()}
        onOpen={jest.fn()}
        onShare={jest.fn()}
        topo={baseTopo}
      />,
    );

    expect(screen.queryByTestId('crag-detail:topo:topo-1:link-route')).toBeNull();
  });

  it('hides onLinkRoute button when onLinkRoute is omitted', () => {
    render(
      <TopoCard
        onMenu={jest.fn()}
        onOpen={jest.fn()}
        onShare={jest.fn()}
        topo={baseTopo}
      />,
    );

    expect(screen.queryByTestId('crag-detail:topo:topo-1:link-route')).toBeNull();
  });

  it('renders drop target indicator when isDropTarget is true', () => {
    render(
      <TopoCard
        isDropTarget
        onMenu={jest.fn()}
        onOpen={jest.fn()}
        onShare={jest.fn()}
        topo={baseTopo}
      />,
    );

    expect(screen.getByTestId('crag-detail:topo:topo-1:drop-target')).toBeTruthy();
    expect(screen.getByText('Drop to link route')).toBeTruthy();
  });
});

