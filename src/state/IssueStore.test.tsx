import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('@/integrations/tabvar/sessionStore', () => ({
  loadTabvarSession: jest.fn(),
}));

jest.mock('@/issues/sync', () => ({
  isIssueSyncInFlight: jest.fn(),
  syncTabvarIssues: jest.fn(),
}));

jest.mock('@/storage/database', () => ({
  getDatabase: jest.fn(),
  runMigrations: jest.fn(),
}));

jest.mock('@/storage/repos/tabvarIssuesRepo', () => ({
  getCurrentSyncJob: jest.fn(),
  getIssueDetail: jest.fn(),
  getSyncError: jest.fn(),
  listIssueCragSummaries: jest.fn(),
  listIssuesForCrag: jest.fn(),
}));

import { loadTabvarSession } from '@/integrations/tabvar/sessionStore';
import { isIssueSyncInFlight, syncTabvarIssues } from '@/issues/sync';
import { getDatabase } from '@/storage/database';
import {
  getCurrentSyncJob,
  getSyncError,
  listIssueCragSummaries,
} from '@/storage/repos/tabvarIssuesRepo';

import { IssueStoreProvider, useIssueStore } from './IssueStore';

function Probe() {
  const store = useIssueStore();
  return (
    <>
      <Text testID="connected">{String(store.isConnected)}</Text>
      <Text testID="syncing">{String(store.isSyncing)}</Text>
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
    (getSyncError as jest.Mock).mockResolvedValue(undefined);
    (isIssueSyncInFlight as jest.Mock).mockReturnValue(false);
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

  it('does not start manual refresh while a sync is already in flight', async () => {
    (loadTabvarSession as jest.Mock).mockResolvedValue({ accessToken: 'token', tabvarUserId: 'user-1' });
    (isIssueSyncInFlight as jest.Mock).mockReturnValue(true);

    render(
      <IssueStoreProvider>
        <Probe />
      </IssueStoreProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('syncing').props.children).toBe('true'));
    await act(async () => {
      screen.getByTestId('refresh').props.onPress();
    });

    expect(syncTabvarIssues).not.toHaveBeenCalled();
  });
});
