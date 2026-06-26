import { render, screen } from '@testing-library/react-native';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('expo-router', () => {
  const Stack = Object.assign(({ children }: { children?: React.ReactNode }) => children ?? null, {
    Screen: ({ options }: { options?: { headerRight?: () => React.ReactNode } }) =>
      options?.headerRight ? options.headerRight() : null,
  });
  return {
    Stack,
    router: { push: jest.fn() },
  };
});

jest.mock('@/state/IssueStore', () => ({
  useIssueStore: jest.fn(),
}));

import { useIssueStore } from '@/state/IssueStore';

import IssuesCragListScreen from '../../app/(tabs)/issues/index';

describe('IssuesCragListScreen', () => {
  it('shows the connection gate without an extra settings button', () => {
    (useIssueStore as jest.Mock).mockReturnValue({
      cragSummaries: [],
      isConnected: false,
      isReady: true,
      isSyncing: false,
      refresh: jest.fn(),
    });

    render(<IssuesCragListScreen />);

    expect(screen.getByTestId('issues:not-connected')).toBeTruthy();
    expect(screen.getByText('Connect TABVAR to view route issues')).toBeTruthy();
    expect(screen.getByTestId('issues:settings-button')).toBeTruthy();
  });

  it('shows syncing state while refresh is locked', () => {
    (useIssueStore as jest.Mock).mockReturnValue({
      cragSummaries: [],
      isConnected: true,
      isReady: true,
      isSyncing: true,
      refresh: jest.fn(),
    });

    render(<IssuesCragListScreen />);

    expect(screen.getByTestId('issues:syncing')).toBeTruthy();
    expect(screen.getByText('Syncing issues')).toBeTruthy();
  });
});
