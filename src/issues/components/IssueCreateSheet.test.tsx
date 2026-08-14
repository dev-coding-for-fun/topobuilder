import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('@/ui/BottomSheet', () => ({
  BottomSheet: ({
    children,
    testID,
    visible,
  }: {
    children: React.ReactNode;
    testID?: string;
    visible: boolean;
  }) => (visible ? <>{children}</> : null),
}));

import type { IssueRouteOption } from '@/storage/repos/tabvarIssuesRepo';

import { IssueCreateSheet } from './IssueCreateSheet';

const routes: IssueRouteOption[] = [
  {
    cragId: 7,
    cragName: 'Sunny Crag',
    gradeYds: '5.11a',
    id: 456,
    name: 'Solar Flare',
    sectorName: 'Main Wall',
  },
  {
    cragId: 7,
    cragName: 'Sunny Crag',
    gradeYds: '5.10c',
    id: 457,
    name: 'Moon Beam',
    sectorName: 'Main Wall',
  },
  {
    cragId: 8,
    cragName: 'North Face',
    gradeYds: '5.9',
    id: 458,
    name: 'Cold Front',
    sectorName: 'Upper Wall',
  },
];

describe('IssueCreateSheet route picker', () => {
  it('browses from crag to sector to route', () => {
    render(
      <IssueCreateSheet
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
        routes={routes}
        visible
      />,
    );

    fireEvent.press(screen.getByTestId('issues:create-sheet:route'));
    expect(screen.getByText('Choose a crag')).toBeTruthy();
    expect(screen.queryByTestId('issues:create-sheet:route-picker:route:456')).toBeNull();

    fireEvent.press(screen.getByTestId('issues:create-sheet:route-picker:crag:7'));
    expect(screen.getByText('Choose a sector')).toBeTruthy();

    fireEvent.press(screen.getByTestId('issues:create-sheet:route-picker:sector:7:Main Wall'));
    expect(screen.getByTestId('issues:create-sheet:route-picker:route:456')).toBeTruthy();
  });

  it('keeps search results hidden until a debounced query is entered', async () => {
    render(
      <IssueCreateSheet
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
        routes={routes}
        visible
      />,
    );

    fireEvent.press(screen.getByTestId('issues:create-sheet:route'));
    fireEvent.press(screen.getByTestId('issues:create-sheet:route-picker:mode:search'));
    expect(screen.getByText('Start typing to search routes.')).toBeTruthy();
    expect(screen.queryByTestId('issues:create-sheet:route-picker:route:456')).toBeNull();

    fireEvent.changeText(
      screen.getByTestId('issues:create-sheet:route-picker:search'),
      'solar',
    );
    expect(screen.queryByTestId('issues:create-sheet:route-picker:route:456')).toBeNull();

    await waitFor(() =>
      expect(screen.getByTestId('issues:create-sheet:route-picker:route:456')).toBeTruthy(),
    );
  });

  it('starts at the sector and scopes route search when a crag is provided', async () => {
    render(
      <IssueCreateSheet
        cragId={7}
        cragName="Sunny Crag"
        onCancel={jest.fn()}
        onConfirm={jest.fn()}
        routes={routes}
        visible
      />,
    );

    fireEvent.press(screen.getByTestId('issues:create-sheet:route'));
    expect(screen.getByText('Choose a sector')).toBeTruthy();
    expect(screen.queryByTestId('issues:create-sheet:route-picker:crag:7')).toBeNull();

    fireEvent.press(screen.getByTestId('issues:create-sheet:route-picker:mode:search'));
    expect(screen.getByText('Searching within Sunny Crag')).toBeTruthy();
    fireEvent.changeText(
      screen.getByTestId('issues:create-sheet:route-picker:search'),
      'solar',
    );

    await waitFor(() => {
      expect(screen.getByTestId('issues:create-sheet:route-picker:route:456')).toBeTruthy();
      expect(screen.queryByTestId('issues:create-sheet:route-picker:route:458')).toBeNull();
    });
  });
});
