import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ConnectedCragSummary, CragSummary } from '@/domain/types';

import { CragCard } from './CragCard';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

const localCrag: CragSummary = {
  id: 'crag-1',
  name: 'Cougar Canyon',
  sortOrder: 0,
  sectorCount: 3,
  topoCount: 8,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
};

const connectedCrag: ConnectedCragSummary = {
  tabvarCragId: 50,
  name: 'Wasootch Slabs',
  notes: 'Popular limestone slab crag',
  sectorCount: 5,
  routeCount: 42,
  topoCount: 2,
};

describe('CragCard', () => {
  it('renders local crag with LOCAL badge, stats, and share action', () => {
    const onOpen = jest.fn();
    const onShare = jest.fn();
    render(<CragCard onOpen={onOpen} onShare={onShare} summary={localCrag} />);

    expect(screen.getByText('Cougar Canyon')).toBeTruthy();
    expect(screen.getByText('3 sectors · 8 topos')).toBeTruthy();
    expect(screen.getByText('LOCAL')).toBeTruthy();
    expect(screen.getByText('Updated 5m ago')).toBeTruthy();

    fireEvent.press(screen.getByTestId('crags:card:crag-1:open'));
    expect(onOpen).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByTestId('crags:card:crag-1:share'));
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('renders connected crag with TABVAR badge and workspace status', () => {
    const onOpen = jest.fn();
    render(<CragCard onOpen={onOpen} summary={connectedCrag} variant="connected" />);

    expect(screen.getByText('Wasootch Slabs')).toBeTruthy();
    expect(screen.getByText('5 sectors · 42 routes')).toBeTruthy();
    expect(screen.getByText('TABVAR')).toBeTruthy();
    expect(screen.getByText('2 topos in workspace')).toBeTruthy();

    fireEvent.press(screen.getByTestId('crags:connected-card:50:open'));
    expect(onOpen).toHaveBeenCalledTimes(1);

    expect(screen.queryByTestId('crags:card:crag-1:share')).toBeNull();
  });
});
