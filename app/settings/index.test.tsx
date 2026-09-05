import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
jest.mock('expo-linking', () => ({
  openURL: jest.fn(),
}));
jest.mock('expo-router', () => {
  const React = require('react');
  const Stack = Object.assign(({ children }: { children?: React.ReactNode }) => children ?? null, {
    Screen: () => null,
  });
  return {
    Stack,
    router: { push: jest.fn() },
    useFocusEffect: (callback: () => void | (() => void)) => React.useEffect(callback, [callback]),
    useLocalSearchParams: jest.fn(() => ({})),
  };
});

jest.mock('@/integrations/tabvar/sessionStore', () => ({
  clearTabvarSession: jest.fn(),
  loadTabvarSession: jest.fn(),
}));

jest.mock('@/integrations/tabvar/client', () => ({
  disconnectTabvar: jest.fn(),
}));

jest.mock('@/integrations/tabvar/links', () => ({
  buildTabvarConnectUrl: jest.fn(() => 'https://tabvar.test/connect'),
}));

jest.mock('@/issues/sync', () => ({
  resyncTabvarIssues: jest.fn(),
}));

jest.mock('@/settings/exportDisclaimer', () => ({
  DEFAULT_EXPORT_DISCLAIMER_SETTINGS: {
    enabled: true,
    text: 'Default disclaimer',
  },
  loadExportDisclaimerSettings: jest.fn(() =>
    Promise.resolve({
      enabled: true,
      text: 'Default disclaimer',
    }),
  ),
  saveExportDisclaimerSettings: jest.fn(),
}));

jest.mock('@/storage/wipeStorage', () => ({
  wipeLocalStorage: jest.fn(() => Promise.resolve()),
}));

import { loadTabvarSession } from '@/integrations/tabvar/sessionStore';
import { resyncTabvarIssues } from '@/issues/sync';
import { wipeLocalStorage } from '@/storage/wipeStorage';
import { router } from 'expo-router';

import SettingsScreen from './index';

describe('SettingsScreen TABVAR sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resyncs route issues from the connected TABVAR panel', async () => {
    (loadTabvarSession as jest.Mock).mockResolvedValue({
      accessToken: 'token',
      connectedAt: '2026-06-20T00:00:00.000Z',
      email: 'user@example.com',
      tabvarUserId: 'user-1',
    });
    (resyncTabvarIssues as jest.Mock).mockResolvedValue(undefined);

    render(<SettingsScreen />);

    const button = await screen.findByTestId('settings:tabvar-resync');
    fireEvent.press(button);

    await waitFor(() => expect(resyncTabvarIssues).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Route issues resynced from Tabvar.')).toBeTruthy();
  });

  it('opens the issue sync log from the TABVAR panel', async () => {
    (loadTabvarSession as jest.Mock).mockResolvedValue(undefined);

    render(<SettingsScreen />);

    fireEvent.press(await screen.findByTestId('settings:tabvar-sync-log'));

    expect(router.push).toHaveBeenCalledWith('/settings/issue-sync-log');
  });
});

describe('SettingsScreen Developer storage wipe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens confirmation sheet and invokes wipeLocalStorage on confirm', async () => {
    (loadTabvarSession as jest.Mock).mockResolvedValue(undefined);

    render(<SettingsScreen />);

    const wipeRow = await screen.findByTestId('settings:wipe-storage');
    expect(wipeRow).toBeTruthy();

    fireEvent.press(wipeRow);

    const confirmButton = await screen.findByTestId('settings:wipe-storage-confirm:confirm');
    expect(confirmButton).toBeTruthy();

    fireEvent.press(confirmButton);

    await waitFor(() => expect(wipeLocalStorage).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('settings:wipe-storage-notice')).toBeTruthy();
  });
});

