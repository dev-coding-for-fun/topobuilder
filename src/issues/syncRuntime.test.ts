const netInfoListeners: Array<(state: { isConnected?: boolean; isInternetReachable?: boolean }) => void> =
  [];
const appStateListeners: Array<(state: string) => void> = [];

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn((listener: (state: unknown) => void) => {
      netInfoListeners.push(listener);
      return () => undefined;
    }),
  },
}));

jest.mock('expo-background-task', () => ({
  BackgroundTaskResult: { Failed: 2, Success: 1 },
  BackgroundTaskStatus: { Available: 1 },
  getStatusAsync: jest.fn(async () => 1),
  registerTaskAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskDefined: jest.fn(() => true),
  isTaskRegisteredAsync: jest.fn(async () => true),
}));

jest.mock('@/integrations/tabvar/sessionStore', () => ({
  loadTabvarSession: jest.fn(),
}));

jest.mock('@/issues/notifications', () => ({
  dismissIssueUploadNotification: jest.fn(),
  showIssueUploadNotification: jest.fn(),
}));

jest.mock('@/issues/sync', () => ({
  syncTabvarIssues: jest.fn(),
}));

jest.mock('@/storage/database', () => ({
  getDatabase: jest.fn(),
  runMigrations: jest.fn(),
}));

jest.mock('@/storage/repos', () => ({
  getPendingIssueCount: jest.fn(),
}));

import { waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { loadTabvarSession } from '@/integrations/tabvar/sessionStore';
import { showIssueUploadNotification } from '@/issues/notifications';
import { syncTabvarIssues } from '@/issues/sync';
import { getDatabase } from '@/storage/database';
import { getPendingIssueCount } from '@/storage/repos';

import { registerIssueSyncRuntime } from './syncRuntime';

describe('registerIssueSyncRuntime', () => {
  let stop: () => void = () => undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    netInfoListeners.length = 0;
    appStateListeners.length = 0;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      appStateListeners.push(listener);
      return { remove: jest.fn() };
    });
    (loadTabvarSession as jest.Mock).mockResolvedValue({ accessToken: 'token' });
    (getDatabase as jest.Mock).mockResolvedValue({});
    (getPendingIssueCount as jest.Mock).mockResolvedValue(1);
    (showIssueUploadNotification as jest.Mock).mockResolvedValue('note-1');
    (syncTabvarIssues as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    stop();
  });

  it('does not start a background sync when a picker makes the app inactive', async () => {
    stop = registerIssueSyncRuntime();
    appStateListeners.forEach((listener) => listener('inactive'));
    await Promise.resolve();

    expect(syncTabvarIssues).not.toHaveBeenCalled();
  });

  it('starts a background sync when the app is actually backgrounded', async () => {
    stop = registerIssueSyncRuntime();
    appStateListeners.forEach((listener) => listener('background'));

    await waitFor(() => {
      expect(syncTabvarIssues).toHaveBeenCalledWith('manual', 'background');
    });
  });
});
