import type { TopoDatabase } from '../database';
import {
  clearTabvarIssueSyncData,
  getIssueSyncCursor,
  getSyncCursor,
  listIssueCragSummaries,
  listIssuesForCrag,
  upsertTabvarCrags,
  upsertTabvarRoutes,
  upsertTabvarSectors,
  upsertTabvarIssues,
} from './tabvarIssuesRepo';

type SqlCall = {
  sql: string;
  args: unknown[];
};

class FakeDb {
  getFirstResponses: unknown[] = [];
  getAllResponses: unknown[][] = [];
  runCalls: SqlCall[] = [];
  getAllCalls: SqlCall[] = [];

  async getFirstAsync<T>(): Promise<T | null> {
    return (this.getFirstResponses.shift() ?? null) as T | null;
  }

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

describe('tabvarIssuesRepo', () => {
  it('clears all TABVAR issue sync data and sync state', async () => {
    const db = new FakeDb();

    await clearTabvarIssueSyncData(asDb(db));

    expect(db.runCalls.map((call) => call.sql)).toEqual([
      'DELETE FROM tabvar_issue_attachments',
      'DELETE FROM tabvar_issues',
      'DELETE FROM tabvar_routes',
      'DELETE FROM tabvar_sectors',
      'DELETE FROM tabvar_crags',
      'DELETE FROM tabvar_sync_state',
      'DELETE FROM tabvar_sync_jobs',
    ]);
  });

  it('upserts catalog tables while preserving raw payloads', async () => {
    const db = new FakeDb();

    await upsertTabvarCrags(asDb(db), [
      { id: 7, name: 'Sunny Crag', slug: 'sunny-crag', statsActiveIssueCount: 2 },
    ]);
    await upsertTabvarSectors(asDb(db), [
      { cragId: 7, id: 12, name: 'Main Wall', sortOrder: 10 },
    ]);
    await upsertTabvarRoutes(asDb(db), [
      {
        cragId: 7,
        cragName: 'Sunny Crag',
        gradeYds: '5.11a',
        id: 456,
        name: 'Solar Flare',
        sectorId: 12,
        sectorName: 'Main Wall',
      },
    ]);

    expect(db.runCalls[0].sql).toContain('INSERT INTO tabvar_crags');
    expect(db.runCalls[0].sql).toContain('ON CONFLICT(id) DO UPDATE');
    expect(db.runCalls[0].args).toContain('Sunny Crag');
    expect(db.runCalls[0].args[db.runCalls[0].args.length - 1]).toEqual(
      expect.stringContaining('"slug":"sunny-crag"'),
    );
    expect(db.runCalls[1].sql).toContain('INSERT INTO tabvar_sectors');
    expect(db.runCalls[2].sql).toContain('INSERT INTO tabvar_routes');
    expect(db.runCalls[2].args).toContain('Solar Flare');
  });

  it('upserts active issues, replaces attachments, deletes deleted issues, and stores cursor', async () => {
    const db = new FakeDb();

    await upsertTabvarIssues(
      asDb(db),
      [
        {
          attachments: [
            {
              id: 11,
              name: 'photo.jpg',
              type: 'image/jpeg',
              url: 'https://example.test/photo.jpg',
            },
          ],
          cragId: 7,
          id: 123,
          issueType: 'Bolts',
          routeId: 456,
          status: 'Reported',
          updatedAt: '2026-06-09 10:00:00',
        },
        {
          cragId: 7,
          id: 124,
          issueType: 'Bolts',
          routeId: 457,
          status: 'Deleted',
          updatedAt: '2026-06-09 10:01:00',
        },
      ],
      '2026-06-09 11:00:00',
      '2026-06-09T11:00:00.000Z',
    );

    expect(db.runCalls[0].sql).toContain('INSERT INTO tabvar_issues');
    expect(db.runCalls[1].sql).toBe('DELETE FROM tabvar_issue_attachments WHERE issue_id = ?');
    expect(db.runCalls[2].sql).toContain('INSERT INTO tabvar_issue_attachments');
    expect(db.runCalls[3]).toEqual({
      args: [124],
      sql: 'DELETE FROM tabvar_issues WHERE id = ?',
    });
    expect(db.runCalls[4].sql).toContain('INSERT INTO tabvar_sync_state');
    expect(db.runCalls[4].args).toContain('2026-06-09 11:00:00');
  });

  it('resolves missing issue crag id from the route catalog', async () => {
    const db = new FakeDb();
    db.getFirstResponses.push({ crag_id: 7 });

    await upsertTabvarIssues(
      asDb(db),
      [
        {
          cragId: null,
          id: 123,
          issueType: 'Bolts',
          routeId: 456,
          status: 'Reported',
          updatedAt: '2026-06-09 10:00:00',
        },
      ],
      '2026-06-09 11:00:00',
      '2026-06-09T11:00:00.000Z',
    );

    expect(db.runCalls[0].sql).toContain('INSERT INTO tabvar_issues');
    expect(db.runCalls[0].args[2]).toBe(7);
  });

  it('reads the issue sync cursor', async () => {
    const db = new FakeDb();
    db.getFirstResponses.push({ cursor: '2026-06-09 11:00:00' });

    await expect(getIssueSyncCursor(asDb(db))).resolves.toBe('2026-06-09 11:00:00');
  });

  it('reads endpoint-specific sync cursors', async () => {
    const db = new FakeDb();
    db.getFirstResponses.push({ cursor: '2026-06-09 09:00:00' });

    await expect(getSyncCursor(asDb(db), 'routes')).resolves.toBe('2026-06-09 09:00:00');
  });

  it('maps issue crag summaries', async () => {
    const db = new FakeDb();
    db.getAllResponses.push([
      {
        crag_id: 7,
        flagged_count: 1,
        issue_count: 2,
        name: 'Sunny Crag',
        newest_updated_at: '2026-06-09 10:00:00',
        stats_active_issue_count: 2,
        stats_issue_flagged: 1,
        stats_public_issue_count: 4,
      },
    ]);

    await expect(listIssueCragSummaries(asDb(db))).resolves.toEqual([
      {
        cragId: 7,
        flaggedCount: 1,
        issueCount: 2,
        name: 'Sunny Crag',
        newestUpdatedAt: '2026-06-09 10:00:00',
        statsActiveIssueCount: 2,
        statsIssueFlagged: 1,
        statsPublicIssueCount: 4,
      },
    ]);
    expect(db.getAllCalls[0].sql).toContain('GROUP BY issues.crag_id');
  });

  it('maps crag-filtered issue rows with attachment counts', async () => {
    const db = new FakeDb();
    db.getAllResponses.push([
      {
        attachment_count: 1,
        bolts_affected: '2',
        crag_id: 7,
        created_at: '2026-06-01 00:00:00',
        description: 'Spinner on bolt 2',
        flagged_message: null,
        grade_yds: '5.11a',
        id: 123,
        is_flagged: 0,
        issue_type: 'Bolts',
        reported_by: 'Jane Doe',
        route_id: 456,
        route_name: 'Solar Flare',
        sector_name: 'Main Wall',
        status: 'Reported',
        sub_issue_type: 'Rusted',
        updated_at: '2026-06-09 10:00:00',
      },
    ]);

    await expect(listIssuesForCrag(asDb(db), 7)).resolves.toEqual([
      {
        attachmentCount: 1,
        boltsAffected: '2',
        cragId: 7,
        createdAt: '2026-06-01 00:00:00',
        description: 'Spinner on bolt 2',
        gradeYds: '5.11a',
        id: 123,
        isFlagged: false,
        issueType: 'Bolts',
        reportedBy: 'Jane Doe',
        routeId: 456,
        routeName: 'Solar Flare',
        sectorName: 'Main Wall',
        status: 'Reported',
        subIssueType: 'Rusted',
        updatedAt: '2026-06-09 10:00:00',
      },
    ]);
    expect(db.getAllCalls[0].args).toEqual([7]);
  });
});
