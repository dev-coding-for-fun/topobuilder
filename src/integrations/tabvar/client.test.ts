import { completeTabvarConnect, disconnectTabvar } from './client';

describe('Tabvar client', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.EXPO_PUBLIC_TABVAR_CONNECT_URL;
    globalThis.fetch = fetchMock;
  });

  it('exchanges a ticket for a normalized Tabvar session', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        accessToken: 'tabvar-token',
        displayName: 'Alex',
        email: 'alex@example.com',
        expiresAt: '2026-06-03T16:00:00.000Z',
        refreshToken: 'refresh-token',
        tabvarUserId: 'user-123',
      }),
      ok: true,
    });

    await expect(completeTabvarConnect('ticket-123')).resolves.toMatchObject({
      accessToken: 'tabvar-token',
      displayName: 'Alex',
      email: 'alex@example.com',
      expiresAt: '2026-06-03T16:00:00.000Z',
      refreshToken: 'refresh-token',
      tabvarUserId: 'user-123',
    });

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5173/api/topobuilder/connect/complete', {
      body: JSON.stringify({ ticket: 'ticket-123' }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  });

  it('surfaces Tabvar error messages', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ message: 'Ticket expired' }),
      ok: false,
      status: 400,
    });

    await expect(completeTabvarConnect('expired-ticket')).rejects.toThrow('Ticket expired');
  });

  it('requests server-side disconnect with the stored access token', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({}),
      ok: true,
    });

    await disconnectTabvar('tabvar-token');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5173/api/topobuilder/disconnect', {
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer tabvar-token',
      },
      method: 'POST',
    });
  });
});
