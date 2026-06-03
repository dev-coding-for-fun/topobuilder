import type { GuidebookExportBundle } from '@/domain/types';

import { completeTabvarConnect, disconnectTabvar, submitTabvarGuidebook } from './client';

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

  it('submits guidebook topo data as multipart form data', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ id: 'submission-1', status: 'pending' }),
      ok: true,
    });

    await expect(submitTabvarGuidebook(submissionBundle, 'tabvar-token')).resolves.toEqual({
      response: { id: 'submission-1', status: 'pending' },
      submittedTopoIds: ['topo-1'],
    });

    expect(fetchMock).toHaveBeenLastCalledWith('http://localhost:5173/api/topobuilder/submissions', {
      body: expect.any(FormData),
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer tabvar-token',
      },
      method: 'POST',
    });
  });
});

const submissionBundle: GuidebookExportBundle = {
  crag: {
    id: 'crag-1',
    name: 'Example Crag',
    sectors: [
      {
        id: 'sector-1',
        cragId: 'crag-1',
        name: 'Main Wall',
        sortOrder: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        topos: [
          {
            id: 'topo-1',
            sectorId: 'sector-1',
            name: 'Main Wall Topo',
            sortOrder: 0,
            tabvarDirty: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            photo: {
              id: 'topo-1',
              topoId: 'topo-1',
              uri: 'data:image/jpeg;base64,cGhvdG8=',
              width: 1200,
              height: 900,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
            annotations: [],
            routes: [
              {
                id: 'route-1',
                topoId: 'topo-1',
                name: 'Route A',
                grade: '5.10a',
                color: '#EB5757',
                sortOrder: 0,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
              },
            ],
          },
        ],
      },
    ],
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  scope: 'crag',
};
