jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  deleteAsync: jest.fn(async () => undefined),
  getInfoAsync: jest.fn(async () => ({ exists: true })),
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(async () => undefined),
}));

import {
  _resetTabvarSessionListenersForTests,
  notifyTabvarSessionChanged,
  subscribeTabvarSession,
} from './sessionStore.events';
import { clearTabvarSession, saveTabvarSession } from './sessionStore';

describe('Tabvar session listeners', () => {
  beforeEach(() => {
    _resetTabvarSessionListenersForTests();
  });

  it('notifies subscribers until they unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeTabvarSession(listener);

    notifyTabvarSessionChanged();
    unsubscribe();
    notifyTabvarSessionChanged();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers after a session is saved or cleared', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeTabvarSession(listener);

    await saveTabvarSession({
      accessToken: 'token',
      connectedAt: '2026-08-12T00:00:00.000Z',
      tabvarUserId: 'user-1',
    });
    await clearTabvarSession();

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });
});
