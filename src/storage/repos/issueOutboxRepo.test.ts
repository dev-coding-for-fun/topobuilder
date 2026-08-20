jest.mock('@/issues/photoStorage', () => ({
  deleteIssuePhoto: jest.fn(async () => undefined),
  persistIssuePhoto: jest.fn(async (photo: { uri: string }) => photo),
}));

import { deleteIssuePhoto, persistIssuePhoto } from '@/issues/photoStorage';

import type { TopoDatabase } from '../database';
import {
  getPendingIssueCount,
  listIssueSyncLogs,
  queuePendingIssueCreate,
} from './issueOutboxRepo';

class FakeDb {
  getAllResponses: unknown[][] = [];
  getAllCalls: { sql: string; args: unknown[] }[] = [];
  runCalls: { sql: string; args: unknown[] }[] = [];

  async getAllAsync<T>(sql: string, ...args: unknown[]): Promise<T[]> {
    this.getAllCalls.push({ sql, args });
    return (this.getAllResponses.shift() ?? []) as T[];
  }

  async runAsync(sql: string, ...args: unknown[]): Promise<void> {
    this.runCalls.push({ sql, args });
  }

  async withTransactionAsync(callback: () => Promise<void>): Promise<void> {
    await callback();
  }
}

function asDb(db: FakeDb): TopoDatabase {
  return db as unknown as TopoDatabase;
}

describe('getPendingIssueCount', () => {
  it('counts unique queued creates, edits, and pending photos', async () => {
    const db = new FakeDb();
    db.getAllResponses.push(
      [{ external_id: 'issue-local-1' }],
      [{ issue_id: 123 }],
      [{ issue_key: 'server:123' }, { issue_key: 'server:456' }, { issue_key: 'local:issue-local-1' }],
    );

    await expect(getPendingIssueCount(asDb(db))).resolves.toBe(3);
    expect(db.getAllCalls.map((call) => call.sql)).toEqual([
      'SELECT external_id FROM pending_issues',
      'SELECT issue_id FROM pending_issue_edits',
      'SELECT DISTINCT issue_key FROM pending_issue_attachments WHERE uploaded = 0',
    ]);
  });
});

describe('listIssueSyncLogs', () => {
  it('returns newest entries first and parses details JSON', async () => {
    const db = new FakeDb();
    db.getAllResponses.push([
      {
        details_json: '[{"op":"edit","issueId":123,"status":"error","error":"conflict"}]',
        finished_at: '2026-08-18T22:10:00.000Z',
        id: 'log_1',
        started_at: '2026-08-18T22:09:00.000Z',
        status: 'error',
        summary: 'Uploaded 0 issue changes; 1 failed.',
        trigger_kind: 'manual',
      },
    ]);

    await expect(listIssueSyncLogs(asDb(db))).resolves.toEqual([
      {
        details: [{ error: 'conflict', issueId: 123, op: 'edit', status: 'error' }],
        finishedAt: '2026-08-18T22:10:00.000Z',
        id: 'log_1',
        startedAt: '2026-08-18T22:09:00.000Z',
        status: 'error',
        summary: 'Uploaded 0 issue changes; 1 failed.',
        triggerKind: 'manual',
      },
    ]);
    expect(db.getAllCalls[0].sql).toContain('ORDER BY started_at DESC');
    expect(db.getAllCalls[0].args).toEqual([50]);
  });

  it('treats invalid details JSON as an empty list', async () => {
    const db = new FakeDb();
    db.getAllResponses.push([
      {
        details_json: '{not-json',
        finished_at: '2026-08-18T22:10:00.000Z',
        id: 'log_2',
        started_at: '2026-08-18T22:09:00.000Z',
        status: 'ok',
        summary: 'Uploaded 1 issue change.',
        trigger_kind: 'interactive',
      },
    ]);

    await expect(listIssueSyncLogs(asDb(db), 10)).resolves.toEqual([
      expect.objectContaining({ details: [], id: 'log_2', status: 'ok' }),
    ]);
    expect(db.getAllCalls[0].args).toEqual([10]);
  });
});

describe('queuePendingIssueCreate', () => {
  const fields = {
    cragId: 7,
    isFlagged: false,
    issueType: 'Bolts',
    routeId: 456,
    status: 'In Moderation',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (persistIssuePhoto as jest.Mock).mockImplementation(async (photo: { uri: string }) => photo);
  });

  it('rolls back persisted photos when a later photo cannot be stored', async () => {
    const db = new FakeDb();
    (persistIssuePhoto as jest.Mock)
      .mockResolvedValueOnce({ filename: 'one.jpg', mimeType: 'image/jpeg', uri: 'file:///one.jpg' })
      .mockRejectedValueOnce(new Error('disk full'));

    await expect(
      queuePendingIssueCreate(asDb(db), fields, [
        { filename: 'one.jpg', mimeType: 'image/jpeg', uri: 'file:///picker-1.jpg' },
        { filename: 'two.jpg', mimeType: 'image/jpeg', uri: 'file:///picker-2.jpg' },
      ]),
    ).rejects.toThrow('disk full');

    expect(db.runCalls.some((call) => call.sql.includes('INSERT INTO pending_issues'))).toBe(false);
    expect(deleteIssuePhoto).toHaveBeenCalledWith('file:///one.jpg');
  });
});
