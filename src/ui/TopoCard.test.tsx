import { StyleSheet } from 'react-native';
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

  it('renders onCreateRoute button and invokes it on press', () => {
    const onCreateRoute = jest.fn();
    render(
      <TopoCard
        onCreateRoute={onCreateRoute}
        onMenu={jest.fn()}
        onOpen={jest.fn()}
        onShare={jest.fn()}
        topo={baseTopo}
      />,
    );

    const createBtn = screen.getByTestId('crag-detail:topo:topo-1:create-route');
    expect(createBtn).toBeTruthy();
    fireEvent.press(createBtn);
    expect(onCreateRoute).toHaveBeenCalledTimes(1);
  });

  it('invokes onEditRoute when a local route row is pressed', () => {
    const onEditRoute = jest.fn();
    render(
      <TopoCard
        onEditRoute={onEditRoute}
        onMenu={jest.fn()}
        onOpen={jest.fn()}
        onShare={jest.fn()}
        topo={baseTopo}
      />,
    );

    const localRow = screen.getByTestId('crag-detail:topo:topo-1:route-row:route-local-1');
    fireEvent.press(localRow);
    expect(onEditRoute).toHaveBeenCalledWith(mockLocalRoute);
  });

  it('does not invoke onEditRoute when a TABVAR route row is pressed', () => {
    const onEditRoute = jest.fn();
    render(
      <TopoCard
        onEditRoute={onEditRoute}
        onMenu={jest.fn()}
        onOpen={jest.fn()}
        onShare={jest.fn()}
        topo={baseTopo}
      />,
    );

    const tabvarRow = screen.getByTestId('crag-detail:topo:topo-1:route-row:tabvar_route_101');
    fireEvent.press(tabvarRow);
    expect(onEditRoute).not.toHaveBeenCalled();
  });

  it('invokes onUnlinkRoute when unlink button for a TABVAR route is pressed', () => {
    const onUnlinkRoute = jest.fn();
    render(
      <TopoCard
        onMenu={jest.fn()}
        onOpen={jest.fn()}
        onShare={jest.fn()}
        onUnlinkRoute={onUnlinkRoute}
        topo={baseTopo}
      />,
    );

    const unlinkBtn = screen.getByTestId(
      'crag-detail:topo:topo-1:tabvar-route:tabvar_route_101:unlink',
    );
    expect(unlinkBtn).toBeTruthy();
    fireEvent.press(unlinkBtn);
    expect(onUnlinkRoute).toHaveBeenCalledWith(mockTabvarRoute);
  });

  it('does not render unlink button for local routes', () => {
    render(
      <TopoCard
        onMenu={jest.fn()}
        onOpen={jest.fn()}
        onShare={jest.fn()}
        onUnlinkRoute={jest.fn()}
        topo={baseTopo}
      />,
    );

    expect(
      screen.queryByTestId('crag-detail:topo:topo-1:route:route-local-1:unlink'),
    ).toBeNull();
  });

  it('renders drop target indicator when isDropTarget is true with blue border', () => {
    render(
      <TopoCard
        isDropTarget
        onMenu={jest.fn()}
        onOpen={jest.fn()}
        onShare={jest.fn()}
        topo={baseTopo}
      />,
    );

    const dropTarget = screen.getByTestId('crag-detail:topo:topo-1:drop-target');
    expect(dropTarget).toBeTruthy();
    expect(screen.queryByText('Drop to link route')).toBeNull();

    const flatStyle = StyleSheet.flatten(dropTarget.props.style);
    expect(flatStyle.borderColor).toBe('#2563EB');
    expect(flatStyle.backgroundColor).toBe('#F8FAFC');
  });

  it('renders drag handles for local and tabvar routes when onRouteDragStart is provided', () => {
    const onRouteDragStart = jest.fn();
    render(
      <TopoCard
        onMenu={jest.fn()}
        onOpen={jest.fn()}
        onRouteDragStart={onRouteDragStart}
        onShare={jest.fn()}
        topo={baseTopo}
      />,
    );

    const localHandle = screen.getByTestId('crag-detail:topo:topo-1:route:route-local-1:drag-handle');
    const tabvarHandle = screen.getByTestId('crag-detail:topo:topo-1:tabvar-route:tabvar_route_101:drag-handle');

    expect(localHandle).toBeTruthy();
    expect(tabvarHandle).toBeTruthy();

    // Trigger pan start
    localHandle.props._gesture._onStart({ absoluteX: 50, absoluteY: 120 });
    expect(onRouteDragStart).toHaveBeenCalledWith(
      'topo-1',
      expect.objectContaining({ kind: 'local', route: mockLocalRoute }),
      0,
      50,
      120,
    );
  });

  it('makes space for incoming route without rendering a ghost element', () => {
    render(
      <TopoCard
        dragItem={{ kind: 'unmapped', name: 'Incoming Classic' }}
        hoverSlotIndex={1}
        isDropTarget
        onMenu={jest.fn()}
        onOpen={jest.fn()}
        onShare={jest.fn()}
        topo={baseTopo}
      />,
    );

    expect(screen.queryByTestId('crag-detail:topo:topo-1:slot-preview')).toBeNull();
    expect(screen.queryByText('Drop here')).toBeNull();
  });

  it('updates marker numbers to make space during reorder without rendering a ghost element', () => {
    render(
      <TopoCard
        dragItem={{ kind: 'topo-route', topoId: 'topo-1', index: 1, name: 'Directissima' }}
        hoverSlotIndex={0}
        isDropTarget
        onMenu={jest.fn()}
        onOpen={jest.fn()}
        onShare={jest.fn()}
        topo={baseTopo}
      />,
    );

    expect(screen.queryByTestId('crag-detail:topo:topo-1:slot-preview')).toBeNull();
    expect(screen.queryByText('Drop here')).toBeNull();
  });

  it('registers target with getSlotIndex calculation', () => {
    let targetMeasurable: any = null;
    render(
      <TopoCard
        onMenu={jest.fn()}
        onOpen={jest.fn()}
        onRegisterTarget={(_id, target) => {
          targetMeasurable = target;
        }}
        onShare={jest.fn()}
        topo={baseTopo}
      />,
    );

    expect(targetMeasurable).toBeTruthy();
    expect(typeof targetMeasurable.getSlotIndex).toBe('function');
    // Calling getSlotIndex returns a valid number within bounds
    expect(typeof targetMeasurable.getSlotIndex(150, false)).toBe('number');
    expect(typeof targetMeasurable.getSlotIndex(150, true)).toBe('number');
  });

  it('does not render a ghost slot indicator during reorder', () => {
    render(
      <TopoCard
        dragItem={{ kind: 'topo-route', topoId: 'topo-1', index: 0, name: 'Warmup Slab' }}
        hoverSlotIndex={1}
        isDropTarget
        onMenu={jest.fn()}
        onOpen={jest.fn()}
        onShare={jest.fn()}
        topo={baseTopo}
      />,
    );

    expect(screen.queryByTestId('crag-detail:topo:topo-1:slot-preview')).toBeNull();
    expect(screen.queryByText('Drop here')).toBeNull();
  });

  it('calculates symmetrical midpoint slots when dragging down and up between routes', () => {
    let targetMeasurable: any = null;
    const threeRouteTopo: TopoWithRoutes = {
      ...baseTopo,
      routes: [
        mockLocalRoute,
        { ...mockLocalRoute, id: 'route-local-2', name: 'Second Route', sortOrder: 2 },
      ],
      tabvarRoutes: [
        { ...mockTabvarRoute, id: 103, appId: 'tabvar_route_103', name: 'Third Route', sortOrder: 3 },
      ],
    };

    render(
      <TopoCard
        onMenu={jest.fn()}
        onOpen={jest.fn()}
        onRegisterTarget={(_id, target) => {
          targetMeasurable = target;
        }}
        onRouteDragStart={jest.fn()}
        onShare={jest.fn()}
        topo={threeRouteTopo}
      />,
    );

    expect(targetMeasurable).toBeTruthy();

    // Container is measured or defaults to Y=180 (100 + 80).
    // Row 0 is at relY 0..44 (pageY 180..224)
    // Row 1 is at relY 44..88 (pageY 224..268)
    // Row 2 is at relY 88..132 (pageY 268..312)

    // Simulate drag start on Row 0 at pageY = 180
    const row0Handle = screen.getByTestId('crag-detail:topo:topo-1:route:route-local-1:drag-handle');
    row0Handle.props._gesture._onStart({ absoluteX: 50, absoluteY: 180 });

    // Dragging down:
    // Move +10px (pageY 190) -> relY 10 -> still in slot 0
    expect(targetMeasurable.getSlotIndex(190, true)).toBe(0);
    // Move +30px (pageY 210, past 22px midpoint) -> flips to slot 1 (between Row 1 and Row 2)
    expect(targetMeasurable.getSlotIndex(210, true)).toBe(1);
    // Move +75px (pageY 255) -> flips to slot 2 (after Row 2)
    expect(targetMeasurable.getSlotIndex(255, true)).toBe(2);

    // Now simulate drag start on Row 2 at pageY = 280
    const row2Handle = screen.getByTestId('crag-detail:topo:topo-1:tabvar-route:tabvar_route_103:drag-handle');
    row2Handle.props._gesture._onStart({ absoluteX: 50, absoluteY: 280 });

    // Dragging up:
    // Move -10px (pageY 270) -> still in slot 2
    expect(targetMeasurable.getSlotIndex(270, true)).toBe(2);
    // Move -35px (pageY 245, past 22px midpoint) -> flips to slot 1 (between Row 0 and Row 1)
    expect(targetMeasurable.getSlotIndex(245, true)).toBe(1);
    // Move -75px (pageY 205) -> flips to slot 0 (above Row 0)
    expect(targetMeasurable.getSlotIndex(205, true)).toBe(0);
  });

  it('measures using getBoundingClientRect on web nodes', () => {
    let targetMeasurable: any = null;
    const { unmount } = render(
      <TopoCard
        onMenu={jest.fn()}
        onOpen={jest.fn()}
        onRegisterTarget={(_id, target) => {
          targetMeasurable = target;
        }}
        onShare={jest.fn()}
        ref={(node) => {
          if (node) {
            (node as any).getBoundingClientRect = () => ({ left: 10, top: 250, width: 320, height: 180 });
          }
        }}
        topo={baseTopo}
      />,
    );

    let measured: any = null;
    targetMeasurable.measureInWindow((x: number, y: number, w: number, h: number) => {
      measured = { x, y, w, h };
    });

    expect(measured).toEqual({ x: 10, y: 250, w: 320, h: 180 });
    unmount();
  });
});

