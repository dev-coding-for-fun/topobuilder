import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Route } from '@/domain/types';
import { useTopoStore } from '@/state/TopoStore';

import { RouteEditSheet } from './RouteEditSheet';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@/state/TopoStore', () => ({
  useTopoStore: jest.fn(),
}));

const mockRoute: Route = {
  id: 'route-1',
  topoId: 'topo-1',
  name: 'Warmup Slab',
  grade: '5.9',
  boltCount: 4,
  lengthM: 20,
  routeType: 'sport',
  fa: 'Alice & Bob',
  description: 'Nice warmup pitch.',
  color: '#3B82F6',
  sortOrder: 1,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

describe('RouteEditSheet', () => {
  const mockUpdateRouteField = jest.fn();
  const mockDeleteRoute = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnAfterChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useTopoStore as unknown as jest.Mock).mockReturnValue({
      updateRouteField: mockUpdateRouteField,
      deleteRoute: mockDeleteRoute,
    });
  });

  it('renders route details when route is provided', () => {
    render(
      <RouteEditSheet
        onAfterChange={mockOnAfterChange}
        onClose={mockOnClose}
        route={mockRoute}
      />,
    );

    expect(screen.getByTestId('route-edit:sheet')).toBeTruthy();
    expect(screen.getByDisplayValue('Warmup Slab')).toBeTruthy();
    expect(screen.getByDisplayValue('5.9')).toBeTruthy();
    expect(screen.getByDisplayValue('4')).toBeTruthy();
    expect(screen.getByDisplayValue('20')).toBeTruthy();
    expect(screen.getByDisplayValue('Alice & Bob')).toBeTruthy();
    expect(screen.getByDisplayValue('Nice warmup pitch.')).toBeTruthy();
  });

  it('updates route name on blur', async () => {
    render(
      <RouteEditSheet
        onAfterChange={mockOnAfterChange}
        onClose={mockOnClose}
        route={mockRoute}
      />,
    );

    const nameInput = screen.getByTestId('route-edit:name');
    fireEvent.changeText(nameInput, 'Great Slab');
    fireEvent(nameInput, 'blur');

    await waitFor(() => {
      expect(mockUpdateRouteField).toHaveBeenCalledWith(mockRoute, { name: 'Great Slab' });
      expect(mockOnAfterChange).toHaveBeenCalled();
    });
  });

  it('updates route type when pressing a type chip', async () => {
    render(
      <RouteEditSheet
        onAfterChange={mockOnAfterChange}
        onClose={mockOnClose}
        route={mockRoute}
      />,
    );

    const tradChip = screen.getByTestId('route-edit:type:trad');
    fireEvent.press(tradChip);

    await waitFor(() => {
      expect(mockUpdateRouteField).toHaveBeenCalledWith(mockRoute, { routeType: 'trad' });
      expect(mockOnAfterChange).toHaveBeenCalled();
    });
  });

  it('deletes route when pressing delete button', async () => {
    render(
      <RouteEditSheet
        onAfterChange={mockOnAfterChange}
        onClose={mockOnClose}
        route={mockRoute}
      />,
    );

    const deleteBtn = screen.getByTestId('route-edit:delete');
    fireEvent.press(deleteBtn);

    await waitFor(() => {
      expect(mockDeleteRoute).toHaveBeenCalledWith('route-1');
      expect(mockOnAfterChange).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('does not render content when route is undefined', () => {
    render(
      <RouteEditSheet
        onAfterChange={mockOnAfterChange}
        onClose={mockOnClose}
        route={undefined}
      />,
    );

    expect(screen.queryByTestId('route-edit:name')).toBeNull();
  });
});
