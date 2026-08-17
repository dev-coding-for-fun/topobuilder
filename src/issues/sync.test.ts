jest.mock('@/domain/ids', () => ({
  nowIso: jest.fn(() => '2026-06-09T11:00:00.000Z'),
}));

jest.mock('@/integrations/tabvar/issues', () => ({
  pullTabvarCrags: jest.fn(),
  pullTabvarIssues: jest.fn(),
  pullTabvarRoutes: jest.fn(),
  pullTabvarSectors: jest.fn(),
}));

jest.mock('@/integrations/tabvar/sessionStore', () => ({
  loadTabvarSession: jest.fn(),
}));

jest.mock('@/storage/database', () => ({
  getDatabase: jest.fn(),
  runMigrations: jest.fn(),
}));

jest.mock('@/issues/outbox', () => ({
  flushIssueOutbox: jest.fn(),
}));

jest.mock('@/storage/repos/tabvarIssuesRepo', () => ({
  clearTabvarIssueSyncData: jest.fn(),
  finishSyncJob: jest.fn(),
  getSyncCursor: jest.fn(),
  saveSyncState: jest.fn(),
  saveIssueSyncError: jest.fn(),
  startSyncJob: jest.fn(),
  upsertTabvarCrags: jest.fn(),
  upsertTabvarIssues: jest.fn(),
  upsertTabvarRoutes: jest.fn(),
  upsertTabvarSectors: jest.fn(),
}));

import {
  pullTabvarCrags,
  pullTabvarIssues,
  pullTabvarRoutes,
  pullTabvarSectors,
} from '@/integrations/tabvar/issues';
import { loadTabvarSession } from '@/integrations/tabvar/sessionStore';
import { getDatabase } from '@/storage/database';
import {
  clearTabvarIssueSyncData,
  finishSyncJob,
  getSyncCursor,
  saveSyncState,
  saveIssueSyncError,
  startSyncJob,
  upsertTabvarCrags,
  upsertTabvarIssues,
  upsertTabvarRoutes,
  upsertTabvarSectors,
} from '@/storage/repos/tabvarIssuesRepo';

import { resyncTabvarIssues, syncTabvarIssues } from './sync';

describe('issue sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getDatabase as jest.Mock).mockResolvedValue({});
    (loadTabvarSession as jest.Mock).mockResolvedValue({ accessToken: 'token', tabvarUserId: 'user-1' });
    (getSyncCursor as jest.Mock).mockImplementation((_db, resource: string) =>
      Promise.resolve(`${resource}-cursor`),
    );
    (pullTabvarCrags as jest.Mock).mockResolvedValue({
      crags: [{ id: 7, name: 'Sunny Crag' }],
      serverTime: 'crags-server-time',
    });
    (pullTabvarSectors as jest.Mock).mockResolvedValue({
      sectors: [{ cragId: 7, id: 12, name: 'Main Wall' }],
      serverTime: 'sectors-server-time',
    });
    (pullTabvarRoutes as jest.Mock).mockResolvedValue({
      routes: [{ cragId: 7, id: 456, name: 'Solar Flare', sectorId: 12 }],
      serverTime: 'routes-server-time',
    });
    (pullTabvarIssues as jest.Mock).mockResolvedValue({
      issues: [{ cragId: 7, id: 123, issueType: 'Bolts', routeId: 456, status: 'Reported', updatedAt: 'now' }],
      serverTime: 'issues-server-time',
    });
  });

  it('syncs catalogs and issues with separate stored cursors', async () => {
    await syncTabvarIssues('manual');

    expect(startSyncJob).toHaveBeenCalledWith({}, 'manual', '2026-06-09T11:00:00.000Z');
    expect(getSyncCursor).toHaveBeenCalledWith({}, 'crags');
    expect(getSyncCursor).toHaveBeenCalledWith({}, 'sectors');
    expect(getSyncCursor).toHaveBeenCalledWith({}, 'routes');
    expect(getSyncCursor).toHaveBeenCalledWith({}, 'issues');
    expect(pullTabvarCrags).toHaveBeenCalledWith('token', 'crags-cursor');
    expect(pullTabvarSectors).toHaveBeenCalledWith('token', 'sectors-cursor');
    expect(pullTabvarRoutes).toHaveBeenCalledWith('token', 'routes-cursor');
    expect(pullTabvarIssues).toHaveBeenCalledWith('token', 'issues-cursor');
    expect(upsertTabvarCrags).toHaveBeenCalledWith({}, [{ id: 7, name: 'Sunny Crag' }]);
    expect(upsertTabvarSectors).toHaveBeenCalledWith({}, [{ cragId: 7, id: 12, name: 'Main Wall' }]);
    expect(upsertTabvarRoutes).toHaveBeenCalledWith({}, [{ cragId: 7, id: 456, name: 'Solar Flare', sectorId: 12 }]);
    expect(saveSyncState).toHaveBeenCalledWith(
      {},
      'crags',
      expect.objectContaining({ cursor: 'crags-server-time' }),
    );
    expect(saveSyncState).toHaveBeenCalledWith(
      {},
      'sectors',
      expect.objectContaining({ cursor: 'sectors-server-time' }),
    );
    expect(saveSyncState).toHaveBeenCalledWith(
      {},
      'routes',
      expect.objectContaining({ cursor: 'routes-server-time' }),
    );
    expect(upsertTabvarIssues).toHaveBeenCalledWith(
      {},
      [{ cragId: 7, id: 123, issueType: 'Bolts', routeId: 456, status: 'Reported', updatedAt: 'now' }],
      'issues-server-time',
      '2026-06-09T11:00:00.000Z',
    );
    expect(finishSyncJob).toHaveBeenCalledWith({}, '2026-06-09T11:00:00.000Z');
  });

  it('clears cached issue data and redownloads without a cursor during resync', async () => {
    await resyncTabvarIssues();

    expect(clearTabvarIssueSyncData).toHaveBeenCalledWith({});
    expect(getSyncCursor).not.toHaveBeenCalled();
    expect(pullTabvarCrags).toHaveBeenCalledWith('token', undefined);
    expect(pullTabvarSectors).toHaveBeenCalledWith('token', undefined);
    expect(pullTabvarRoutes).toHaveBeenCalledWith('token', undefined);
    expect(pullTabvarIssues).toHaveBeenCalledWith('token', undefined);
    expect(startSyncJob).toHaveBeenCalledWith({}, 'manual', '2026-06-09T11:00:00.000Z');
  });

  it('uses one active sync for overlapping requests', async () => {
    let resolveCrags: (value: unknown) => void = () => undefined;
    (pullTabvarCrags as jest.Mock).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCrags = resolve;
      }),
    );

    const first = syncTabvarIssues('manual');
    const second = syncTabvarIssues('initial');
    resolveCrags({ crags: [] });
    await Promise.all([first, second]);

    expect(startSyncJob).toHaveBeenCalledTimes(1);
    expect(pullTabvarIssues).toHaveBeenCalledTimes(1);
  });

  it('persists sync errors when TABVAR is not connected', async () => {
    (loadTabvarSession as jest.Mock).mockResolvedValueOnce(undefined);

    await expect(syncTabvarIssues('initial')).rejects.toThrow('Connect TABVAR');

    expect(saveIssueSyncError).toHaveBeenCalledWith({}, 'Connect TABVAR before syncing route issues.');
    expect(finishSyncJob).toHaveBeenCalledWith(
      {},
      '2026-06-09T11:00:00.000Z',
      'Connect TABVAR before syncing route issues.',
    );
  });
});
