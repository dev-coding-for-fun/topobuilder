import type { TopoDatabase } from '../database';
import { getPendingIssueCount, listIssueSyncLogs } from './issueOutboxRepo';

class FakeDb {
  getAllResponses: unknown[][] = [];
  getAllCalls: { sql: string; args: unknown[] }[] = [];

  async getAllAsync<T>(sql: string, ...args: unknown[]): Promise<T[]> {
    this.getAllCalls.push({ sql, args });
    return (this.getAllResponses.shift() ?? []) as T[];
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
