import { render, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => {
  const Stack = Object.assign(({ children }: { children?: React.ReactNode }) => children ?? null, {
    Screen: () => null,
  });
  return {
    Stack,
    router: {
      replace: jest.fn(),
    },
    useLocalSearchParams: jest.fn(() => ({ ticket: 'ticket-123' })),
  };
});

jest.mock('@/integrations/tabvar/client', () => ({
  completeTabvarConnect: jest.fn(),
}));

jest.mock('@/integrations/tabvar/sessionStore', () => ({
  saveTabvarSession: jest.fn(),
}));

jest.mock('@/issues/sync', () => ({
  startInitialIssueSync: jest.fn(),
}));

import { completeTabvarConnect } from '@/integrations/tabvar/client';
import { saveTabvarSession } from '@/integrations/tabvar/sessionStore';
import { startInitialIssueSync } from '@/issues/sync';

import TabvarConnectCallbackScreen, { _resetTabvarConnectTicketCacheForTests } from './tabvar-connect';

describe('TabvarConnectCallbackScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetTabvarConnectTicketCacheForTests();
  });

  it('completes a one-time ticket only once across duplicate callback mounts', async () => {
    (completeTabvarConnect as jest.Mock).mockResolvedValue({
      accessToken: 'token',
      connectedAt: '2026-06-20T00:00:00.000Z',
      tabvarUserId: 'user-1',
    });

    render(
      <>
        <TabvarConnectCallbackScreen />
        <TabvarConnectCallbackScreen />
      </>,
    );

    await waitFor(() => expect(saveTabvarSession).toHaveBeenCalledTimes(1));
    expect(completeTabvarConnect).toHaveBeenCalledTimes(1);
    expect(startInitialIssueSync).toHaveBeenCalledTimes(1);
  });
});
