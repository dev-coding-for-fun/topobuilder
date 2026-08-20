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
    useFocusEffect: (effect: () => void | (() => void)) => {
      effect();
    },
  };
});

jest.mock('@/state/IssueStore', () => ({
  useIssueStore: jest.fn(),
}));

import { useIssueStore } from '@/state/IssueStore';

import IssuesCragListScreen from '../../app/(tabs)/issues/index';

describe('IssuesCragListScreen', () => {
  const store = {
    cragSummaries: [],
    isConnected: false,
    isReady: true,
    isSyncing: false,
    pendingIssueCount: 0,
    refresh: jest.fn(),
    reloadLocal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useIssueStore as jest.Mock).mockReturnValue(store);
  });

  it('shows the connection gate without an extra settings button', () => {
    render(<IssuesCragListScreen />);

    expect(screen.getByTestId('issues:not-connected')).toBeTruthy();
    expect(screen.getByText('Connect TABVAR to view route issues')).toBeTruthy();
    expect(screen.getByTestId('issues:settings-button')).toBeTruthy();
  });

  it('shows syncing state while refresh is locked', () => {
    (useIssueStore as jest.Mock).mockReturnValue({
      ...store,
      isConnected: true,
      isSyncing: true,
    });

    render(<IssuesCragListScreen />);

    expect(screen.getByTestId('issues:syncing')).toBeTruthy();
    expect(screen.getByText('Syncing issues')).toBeTruthy();
  });

  it('shows the unsynced-issue count and reloads it when focused', () => {
    (useIssueStore as jest.Mock).mockReturnValue({
      ...store,
      isConnected: true,
      pendingIssueCount: 2,
    });

    render(<IssuesCragListScreen />);

    expect(screen.getByTestId('issues:unsynced-button')).toBeTruthy();
    expect(screen.getByText('2 unsynced issues')).toBeTruthy();
    expect(store.reloadLocal).toHaveBeenCalled();
  });

  it('keeps a storage error banner and does not show leftover sync failures', () => {
    (useIssueStore as jest.Mock).mockReturnValue({
      ...store,
      isConnected: true,
      storageError: 'Issue storage could not be initialized.',
    });

    render(<IssuesCragListScreen />);

    expect(screen.getByText('Issue storage could not be initialized.')).toBeTruthy();
    expect(screen.queryByTestId('issues:sync-toast')).toBeNull();
    expect(screen.queryByText('Failed to fetch')).toBeNull();
  });
});
