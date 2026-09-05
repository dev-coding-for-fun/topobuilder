import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ConnectedCragSummary } from '@/domain/types';

import { ConnectedCragCard } from './ConnectedCragCard';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');

const baseConnectedCrag: ConnectedCragSummary = {
  tabvarCragId: 50,
  name: 'Wasootch Slabs',
  notes: 'Popular limestone slab crag',
  sectorCount: 5,
  routeCount: 42,
  topoCount: 0,
};

describe('ConnectedCragCard', () => {
  it('renders un-adopted connected crag with adopt prompt and TABVAR badge', () => {
    const onPress = jest.fn();
    render(<ConnectedCragCard item={baseConnectedCrag} onPress={onPress} />);

    expect(screen.getByText('Wasootch Slabs')).toBeTruthy();
    expect(screen.getByText('5 sectors · 42 routes')).toBeTruthy();
    expect(screen.getByText('TABVAR')).toBeTruthy();
    expect(screen.getByText('Tap to add to workspace')).toBeTruthy();

    fireEvent.press(screen.getByTestId('crags:connected-card:50:open'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders adopted crag with workspace topo count', () => {
    const onPress = jest.fn();
    render(
      <ConnectedCragCard
        item={{
          ...baseConnectedCrag,
          workspaceCragId: 'workspace-crag-1',
          topoCount: 3,
        }}
        onPress={onPress}
      />,
    );

    expect(screen.getByText('3 topos in workspace')).toBeTruthy();
    expect(screen.queryByText('Tap to add to workspace')).toBeNull();
  });
});
