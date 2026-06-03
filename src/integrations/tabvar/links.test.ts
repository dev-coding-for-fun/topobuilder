import * as Linking from 'expo-linking';

import { buildTabvarCallbackUrl, buildTabvarConnectUrl } from './links';

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string, options?: { queryParams?: Record<string, string> }) => {
    const params = new URLSearchParams(options?.queryParams);
    const query = params.toString();
    return `topobuilder://${path}${query ? `?${query}` : ''}`;
  }),
}));

describe('Tabvar links', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.EXPO_PUBLIC_TABVAR_CONNECT_URL;
  });

  it('builds the callback URL through expo-linking', () => {
    expect(buildTabvarCallbackUrl('state-123')).toBe('topobuilder://tabvar-connect?state=state-123');
    expect(Linking.createURL).toHaveBeenCalledWith('tabvar-connect', {
      queryParams: { state: 'state-123' },
    });
  });

  it('uses the dev Tabvar connect URL by default', () => {
    expect(buildTabvarConnectUrl('state-123')).toBe(
      'http://localhost:5173/connect/topobuilder?return_to=topobuilder%3A%2F%2Ftabvar-connect%3Fstate%3Dstate-123',
    );
  });

  it('allows the Tabvar connect URL to be overridden', () => {
    process.env.EXPO_PUBLIC_TABVAR_CONNECT_URL = 'https://staging.tabvar.test/connect/topobuilder';

    expect(buildTabvarConnectUrl('state-123')).toBe(
      'https://staging.tabvar.test/connect/topobuilder?return_to=topobuilder%3A%2F%2Ftabvar-connect%3Fstate%3Dstate-123',
    );
  });
});
