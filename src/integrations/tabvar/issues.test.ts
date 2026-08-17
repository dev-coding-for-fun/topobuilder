import {
  pullTabvarCrags,
  pullTabvarIssues,
  pullTabvarRoutes,
  pullTabvarSectors,
  pushTabvarIssue,
  uploadTabvarIssueAttachments,
} from './issues';

describe('Tabvar issue client', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.EXPO_PUBLIC_TABVAR_CONNECT_URL;
    globalThis.fetch = fetchMock;
  });

  it('pulls crag catalog data with bearer auth', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        crags: [
          {
            id: 7,
            name: 'Sunny Crag',
            slug: 'sunny-crag',
            statsActiveIssueCount: 2,
          },
        ],
        serverTime: '2026-06-09 11:00:00',
      }),
      ok: true,
    });

    await expect(pullTabvarCrags('tabvar-token')).resolves.toMatchObject({
      crags: [{ id: 7, name: 'Sunny Crag' }],
    });

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5173/api/v1/crags', {
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer tabvar-token',
      },
      method: 'GET',
    });
  });

  it('pulls crag catalog deltas with an encoded cursor', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        crags: [],
        serverTime: '2026-06-09 12:00:00',
      }),
      ok: true,
    });

    await pullTabvarCrags('tabvar-token', '2026-06-09 11:00:00');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5173/api/v1/crags?since=2026-06-09%2011%3A00%3A00',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('pulls sector catalog data with bearer auth', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        sectors: [{ cragId: 7, id: 12, name: 'Main Wall', sortOrder: 10 }],
        serverTime: '2026-06-09 11:00:00',
      }),
      ok: true,
    });

    await expect(pullTabvarSectors('tabvar-token')).resolves.toMatchObject({
      sectors: [{ cragId: 7, id: 12, name: 'Main Wall' }],
    });

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5173/api/v1/sectors', {
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer tabvar-token',
      },
      method: 'GET',
    });
  });

  it('pulls sector catalog deltas with an encoded cursor', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        sectors: [],
        serverTime: '2026-06-09 12:00:00',
      }),
      ok: true,
    });

    await pullTabvarSectors('tabvar-token', '2026-06-09 11:00:00');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5173/api/v1/sectors?since=2026-06-09%2011%3A00%3A00',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('pulls route catalog data with bearer auth', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        routes: [
          {
            cragId: 7,
            cragName: 'Sunny Crag',
            gradeYds: '5.11a',
            id: 456,
            name: 'Solar Flare',
            sectorId: 12,
            sectorName: 'Main Wall',
          },
        ],
        serverTime: '2026-06-09 11:00:00',
      }),
      ok: true,
    });

    await expect(pullTabvarRoutes('tabvar-token')).resolves.toMatchObject({
      routes: [{ id: 456, name: 'Solar Flare', sectorName: 'Main Wall' }],
    });

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5173/api/v1/routes', {
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer tabvar-token',
      },
      method: 'GET',
    });
  });

  it('pulls route catalog deltas with an encoded cursor', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        routes: [],
        serverTime: '2026-06-09 12:00:00',
      }),
      ok: true,
    });

    await pullTabvarRoutes('tabvar-token', '2026-06-09 11:00:00');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5173/api/v1/routes?since=2026-06-09%2011%3A00%3A00',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('pulls all issues without a cursor', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        issues: [issuePayload],
        serverTime: '2026-06-09 11:00:00',
      }),
      ok: true,
    });

    await expect(pullTabvarIssues('tabvar-token')).resolves.toMatchObject({
      issues: [{ id: 123, status: 'Reported' }],
      serverTime: '2026-06-09 11:00:00',
    });

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5173/api/v1/issues', {
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer tabvar-token',
      },
      method: 'GET',
    });
  });

  it('pulls issue deltas with an encoded cursor', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        issues: [{ ...issuePayload, status: 'Deleted' }],
        serverTime: '2026-06-09 12:00:00',
      }),
      ok: true,
    });

    await expect(pullTabvarIssues('tabvar-token', '2026-06-09 11:00:00')).resolves.toMatchObject({
      issues: [{ id: 123, status: 'Deleted' }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5173/api/v1/issues?since=2026-06-09%2011%3A00%3A00',
      {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer tabvar-token',
        },
        method: 'GET',
      },
    );
  });

  it('surfaces Tabvar issue API errors', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ message: 'Invalid token' }),
      ok: false,
      status: 401,
    });

    await expect(pullTabvarIssues('bad-token')).rejects.toThrow('Invalid token');
  });

  it('pushes an issue content update with bearer auth', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        issue: { ...issuePayload, description: 'Updated spinner' },
        serverId: 123,
        status: 'applied',
      }),
      ok: true,
      status: 200,
    });

    await expect(
      pushTabvarIssue('tabvar-token', {
        baseUpdatedAt: '2026-06-09 10:00:00',
        fields: { description: 'Updated spinner' },
        issueId: 123,
        op: 'update',
      }),
    ).resolves.toMatchObject({ description: 'Updated spinner', id: 123 });

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5173/api/v1/issues/sync', {
      body: JSON.stringify({
        baseUpdatedAt: '2026-06-09 10:00:00',
        fields: { description: 'Updated spinner' },
        issueId: 123,
        op: 'update',
      }),
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer tabvar-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  });

  it('pushes a status change', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        issue: { ...issuePayload, status: 'Completed' },
        serverId: 123,
        status: 'applied',
      }),
      ok: true,
      status: 200,
    });

    await expect(
      pushTabvarIssue('tabvar-token', {
        baseUpdatedAt: '2026-06-09 10:00:00',
        fields: { status: 'Completed' },
        issueId: 123,
        op: 'status',
      }),
    ).resolves.toMatchObject({ status: 'Completed' });
  });

  it('throws a conflict error with the current server issue', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        issue: { ...issuePayload, description: 'Server version' },
        serverId: 123,
        status: 'conflict',
      }),
      ok: false,
      status: 409,
    });

    await expect(
      pushTabvarIssue('tabvar-token', {
        baseUpdatedAt: '2026-06-09 09:00:00',
        fields: { description: 'Stale edit' },
        issueId: 123,
        op: 'update',
      }),
    ).rejects.toMatchObject({
      issue: { description: 'Server version' },
      name: 'TabvarIssueConflictError',
    });
  });

  it('uploads issue photos as multipart form data', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        attachments: [{ id: 12, name: 'photo.jpg', type: 'image/jpeg', url: 'https://example.test/photo.jpg' }],
      }),
      ok: true,
      status: 201,
    });

    await expect(
      uploadTabvarIssueAttachments('tabvar-token', 123, [
        {
          filename: 'photo.jpg',
          mimeType: 'image/jpeg',
          uri: 'file:///photo.jpg',
        },
      ]),
    ).resolves.toEqual({
      attachments: [{ id: 12, name: 'photo.jpg', type: 'image/jpeg', url: 'https://example.test/photo.jpg' }],
    });

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5173/api/v1/issues/123/attachments', {
      body: expect.any(FormData),
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer tabvar-token',
      },
      method: 'POST',
    });
  });
});

const issuePayload = {
  approvedAt: null,
  archivedAt: null,
  attachments: [{ id: 11, name: 'photo.jpg', type: 'image/jpeg', url: 'https://example.test/photo.jpg' }],
  boltsAffected: '2',
  cragId: 7,
  createdAt: '2026-06-01 00:00:00',
  description: 'Spinner on bolt 2',
  flaggedMessage: null,
  id: 123,
  isFlagged: false,
  issueType: 'Bolts',
  lastModified: '2026-06-09T10:00:00.000Z',
  lastStatus: null,
  reportedBy: 'Jane Doe',
  reportedByUid: 'user-uid',
  routeId: 456,
  status: 'Reported',
  subIssueType: 'Rusted',
  updatedAt: '2026-06-09 10:00:00',
};
