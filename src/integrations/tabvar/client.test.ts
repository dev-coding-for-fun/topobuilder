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
        token: 'tb_token_123',
        user: {
          displayName: 'Test User',
          email: 'user@example.com',
          role: 'member',
          uid: 'user-1',
        },
      }),
      ok: true,
    });

    await expect(completeTabvarConnect('ticket-123')).resolves.toMatchObject({
      accessToken: 'tb_token_123',
      displayName: 'Test User',
      email: 'user@example.com',
      tabvarUserId: 'user-1',
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
