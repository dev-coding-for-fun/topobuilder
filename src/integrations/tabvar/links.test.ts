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
    expect(buildTabvarCallbackUrl()).toBe('topobuilder://tabvar-connect');
    expect(Linking.createURL).toHaveBeenCalledWith('tabvar-connect');
  });

  it('uses the dev Tabvar connect URL by default', () => {
    expect(buildTabvarConnectUrl()).toBe(
      'http://localhost:5173/connect/topobuilder?return_to=topobuilder%3A%2F%2Ftabvar-connect',
    );
  });

  it('allows the Tabvar connect URL to be overridden', () => {
    process.env.EXPO_PUBLIC_TABVAR_CONNECT_URL = 'https://staging.tabvar.test/connect/topobuilder';

    expect(buildTabvarConnectUrl()).toBe(
      'https://staging.tabvar.test/connect/topobuilder?return_to=topobuilder%3A%2F%2Ftabvar-connect',
    );
  });
});
