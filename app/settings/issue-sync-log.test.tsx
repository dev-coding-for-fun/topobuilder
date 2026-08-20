import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('expo-router', () => {
  const React = require('react');
  const Stack = Object.assign(({ children }: { children?: React.ReactNode }) => children ?? null, {
    Screen: () => null,
  });
  return {
    Stack,
    useFocusEffect: (callback: () => void | (() => void)) => React.useEffect(callback, [callback]),
  };
});

jest.mock('@/storage/database', () => ({
  getDatabase: jest.fn(),
  runMigrations: jest.fn(),
}));

jest.mock('@/storage/repos/issueOutboxRepo', () => ({
  listIssueSyncLogs: jest.fn(),
}));

import { getDatabase } from '@/storage/database';
import { listIssueSyncLogs } from '@/storage/repos/issueOutboxRepo';

import IssueSyncLogScreen from './issue-sync-log';

describe('IssueSyncLogScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getDatabase as jest.Mock).mockResolvedValue({});
    (listIssueSyncLogs as jest.Mock).mockResolvedValue([]);
  });

  it('shows an empty state when there are no log entries', async () => {
    render(<IssueSyncLogScreen />);

    expect(await screen.findByTestId('settings:sync-log:empty')).toBeTruthy();
    expect(screen.getByText('No sync attempts yet')).toBeTruthy();
  });

  it('renders log entries and expands details on press', async () => {
    (listIssueSyncLogs as jest.Mock).mockResolvedValue([
      {
        details: [{ error: 'This issue was updated elsewhere.', issueId: 123, op: 'edit', status: 'error' }],
        finishedAt: '2026-08-18T22:10:00.000Z',
        id: 'log_1',
        startedAt: '2026-08-18T22:09:00.000Z',
        status: 'error',
        summary: 'Uploaded 0 issue changes; 1 failed.',
        triggerKind: 'manual',
      },
    ]);

    render(<IssueSyncLogScreen />);

    expect(await screen.findByText('Uploaded 0 issue changes; 1 failed.')).toBeTruthy();
    expect(screen.getByText('Refresh')).toBeTruthy();
    expect(screen.getByText('edit #123: This issue was updated elsewhere.')).toBeTruthy();
    expect(screen.queryByTestId('settings:sync-log:details:log_1')).toBeNull();

    fireEvent.press(screen.getByTestId('settings:sync-log:entry:log_1'));

    await waitFor(() => expect(screen.getByTestId('settings:sync-log:details:log_1')).toBeTruthy());
    expect(screen.getByText(/"op": "edit"/)).toBeTruthy();
  });
});
