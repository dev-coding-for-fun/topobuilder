import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('@/integrations/tabvar/sessionStore', () => ({
  loadTabvarSession: jest.fn(),
  subscribeTabvarSession: jest.fn(() => jest.fn()),
}));

jest.mock('@/issues/sync', () => ({
  syncTabvarIssues: jest.fn(),
}));

jest.mock('@/storage/database', () => ({
  getDatabase: jest.fn(),
  runMigrations: jest.fn(),
}));

jest.mock('@/storage/repos', () => ({
  deletePendingAttachment: jest.fn(),
  getCurrentSyncJob: jest.fn(),
  getIssueDetailWithPending: jest.fn(),
  getPendingIssueCount: jest.fn(),
  insertIssueAttachments: jest.fn(),
  listIssueCragSummaries: jest.fn(),
  listIssueRoutes: jest.fn(),
  listIssuesForCragWithPending: jest.fn(),
  listUnsyncedIssues: jest.fn(),
}));

import { loadTabvarSession, subscribeTabvarSession } from '@/integrations/tabvar/sessionStore';
import { syncTabvarIssues } from '@/issues/sync';
import { getDatabase } from '@/storage/database';
import {
  getCurrentSyncJob,
  getPendingIssueCount,
  listIssueCragSummaries,
} from '@/storage/repos';

import { IssueStoreProvider, useIssueStore } from './IssueStore';

function Probe() {
  const store = useIssueStore();
  return (
    <>
      <Text testID="connected">{String(store.isConnected)}</Text>
      <Text testID="syncing">{String(store.isSyncing)}</Text>
      <Text testID="pending">{String(store.pendingIssueCount)}</Text>
      <Text onPress={() => void store.refresh()} testID="refresh">
        refresh
      </Text>
    </>
  );
}

describe('IssueStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getDatabase as jest.Mock).mockResolvedValue({});
    (listIssueCragSummaries as jest.Mock).mockResolvedValue([]);
    (getCurrentSyncJob as jest.Mock).mockResolvedValue(undefined);
    (getPendingIssueCount as jest.Mock).mockResolvedValue(0);
    (subscribeTabvarSession as jest.Mock).mockImplementation(() => jest.fn());
    (syncTabvarIssues as jest.Mock).mockResolvedValue(undefined);
  });

  it('exposes no-session connection state', async () => {
    (loadTabvarSession as jest.Mock).mockResolvedValue(undefined);

    render(
      <IssueStoreProvider>
        <Probe />
      </IssueStoreProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('connected').props.children).toBe('false'));
  });

  it('exposes the pending unsynced issue count from storage', async () => {
    (loadTabvarSession as jest.Mock).mockResolvedValue({ accessToken: 'token', tabvarUserId: 'user-1' });
    (getPendingIssueCount as jest.Mock).mockResolvedValue(3);

    render(
      <IssueStoreProvider>
        <Probe />
      </IssueStoreProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('pending').props.children).toBe('3'));
  });

  it('does not treat a leftover incomplete sync job as in progress', async () => {
    (loadTabvarSession as jest.Mock).mockResolvedValue({ accessToken: 'token', tabvarUserId: 'user-1' });
    (getCurrentSyncJob as jest.Mock).mockResolvedValue({
      kind: 'manual',
      startedAt: '2026-06-09T11:00:00.000Z',
    });

    render(
      <IssueStoreProvider>
        <Probe />
      </IssueStoreProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('connected').props.children).toBe('true'));
    expect(screen.getByTestId('syncing').props.children).toBe('false');
  });

  it('joins a coalesced sync on refresh and clears the spinner when it finishes', async () => {
    (loadTabvarSession as jest.Mock).mockResolvedValue({ accessToken: 'token', tabvarUserId: 'user-1' });
    let finishSync: () => void = () => undefined;
    (syncTabvarIssues as jest.Mock).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishSync = resolve;
        }),
    );

    render(
      <IssueStoreProvider>
        <Probe />
      </IssueStoreProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('syncing').props.children).toBe('false'));
    await act(async () => {
      screen.getByTestId('refresh').props.onPress();
    });

    await waitFor(() => expect(screen.getByTestId('syncing').props.children).toBe('true'));
    expect(syncTabvarIssues).toHaveBeenCalledWith('manual');

    await act(async () => {
      finishSync();
    });

    await waitFor(() => expect(screen.getByTestId('syncing').props.children).toBe('false'));
  });

  it('updates connection state and follows initial sync when a session is saved', async () => {
    (loadTabvarSession as jest.Mock).mockResolvedValue(undefined);

    render(
      <IssueStoreProvider>
        <Probe />
      </IssueStoreProvider>,
    );

    await waitFor(() => expect(subscribeTabvarSession).toHaveBeenCalled());
    expect(screen.getByTestId('connected').props.children).toBe('false');

    (loadTabvarSession as jest.Mock).mockResolvedValue({
      accessToken: 'token',
      tabvarUserId: 'user-1',
    });
    let finishSync: () => void = () => undefined;
    (syncTabvarIssues as jest.Mock).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishSync = resolve;
        }),
    );

    const listener = (subscribeTabvarSession as jest.Mock).mock.calls[0][0] as () => void;
    await act(async () => {
      listener();
    });

    await waitFor(() => expect(screen.getByTestId('connected').props.children).toBe('true'));
    await waitFor(() => expect(screen.getByTestId('syncing').props.children).toBe('true'));
    expect(syncTabvarIssues).toHaveBeenCalledWith('initial');

    await act(async () => {
      finishSync();
    });

    await waitFor(() => expect(screen.getByTestId('syncing').props.children).toBe('false'));
  });

  it('does not start a sync when the session is cleared', async () => {
    (loadTabvarSession as jest.Mock).mockResolvedValue({
      accessToken: 'token',
      tabvarUserId: 'user-1',
    });

    render(
      <IssueStoreProvider>
        <Probe />
      </IssueStoreProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('connected').props.children).toBe('true'));
    await waitFor(() => expect(subscribeTabvarSession).toHaveBeenCalled());

    (loadTabvarSession as jest.Mock).mockResolvedValue(undefined);
    const listener = (subscribeTabvarSession as jest.Mock).mock.calls[0][0] as () => void;
    await act(async () => {
      listener();
    });

    await waitFor(() => expect(screen.getByTestId('connected').props.children).toBe('false'));
    expect(syncTabvarIssues).not.toHaveBeenCalled();
  });

  it('toasts a live sync failure instead of keeping a persistent error', async () => {
    (loadTabvarSession as jest.Mock).mockResolvedValue({ accessToken: 'token', tabvarUserId: 'user-1' });
    (syncTabvarIssues as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'));

    render(
      <IssueStoreProvider>
        <Probe />
      </IssueStoreProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('syncing').props.children).toBe('false'));
    await act(async () => {
      screen.getByTestId('refresh').props.onPress();
    });

    await waitFor(() =>
      expect(screen.getByText("Couldn't sync with TABVAR. You can keep working offline.")).toBeTruthy(),
    );
    expect(screen.getByTestId('issues:sync-toast')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('syncing').props.children).toBe('false'));
  });

  it('toasts a failed initial sync when a session is saved', async () => {
    (loadTabvarSession as jest.Mock).mockResolvedValue(undefined);

    render(
      <IssueStoreProvider>
        <Probe />
      </IssueStoreProvider>,
    );

    await waitFor(() => expect(subscribeTabvarSession).toHaveBeenCalled());
    (loadTabvarSession as jest.Mock).mockResolvedValue({
      accessToken: 'token',
      tabvarUserId: 'user-1',
    });
    (syncTabvarIssues as jest.Mock).mockRejectedValue(new Error('Network request failed'));

    const listener = (subscribeTabvarSession as jest.Mock).mock.calls[0][0] as () => void;
    await act(async () => {
      listener();
    });

    await waitFor(() =>
      expect(screen.getByText("Couldn't sync with TABVAR. You can keep working offline.")).toBeTruthy(),
    );
    await waitFor(() => expect(screen.getByTestId('syncing').props.children).toBe('false'));
  });
});
