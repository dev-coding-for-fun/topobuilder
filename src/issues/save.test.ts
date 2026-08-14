jest.mock('@/integrations/tabvar/issues', () => ({
  TabvarIssueConflictError: class TabvarIssueConflictError extends Error {
    issue: unknown;
    constructor(issue: unknown) {
      super('This issue was updated elsewhere. The latest version is now shown.');
      this.name = 'TabvarIssueConflictError';
      this.issue = issue;
    }
  },
  pushTabvarIssue: jest.fn(),
}));

jest.mock('@/storage/repos/tabvarIssuesRepo', () => ({
  applyTabvarIssue: jest.fn(),
  getIssueDetail: jest.fn(),
}));

import { pushTabvarIssue, TabvarIssueConflictError } from '@/integrations/tabvar/issues';
import type { TabvarIssue } from '@/integrations/tabvar/types';
import { applyTabvarIssue, getIssueDetail, type IssueDetail } from '@/storage/repos/tabvarIssuesRepo';

import { saveIssueEdits } from './save';

const issue: IssueDetail = {
  attachmentCount: 0,
  attachments: [],
  cragId: 7,
  description: 'Spinner on bolt 2',
  id: 123,
  isFlagged: false,
  issueType: 'Bolts',
  routeId: 456,
  routeName: 'Solar Flare',
  status: 'Reported',
  updatedAt: '2026-06-09 10:00:00',
};

describe('saveIssueEdits', () => {
  const db = {} as never;

  beforeEach(() => {
    jest.clearAllMocks();
    (getIssueDetail as jest.Mock).mockResolvedValue({ ...issue, description: 'Updated spinner' });
  });

  it('pushes a content update then a status change using the new base timestamp', async () => {
    (pushTabvarIssue as jest.Mock)
      .mockResolvedValueOnce({
        ...issue,
        description: 'Updated spinner',
        updatedAt: '2026-06-09 10:05:00',
      })
      .mockResolvedValueOnce({
        ...issue,
        description: 'Updated spinner',
        status: 'Completed',
        updatedAt: '2026-06-09 10:06:00',
      });

    await saveIssueEdits(
      db,
      issue,
      { description: 'Updated spinner', flaggedMessage: '', status: 'Completed' },
      'token',
    );

    expect(pushTabvarIssue).toHaveBeenNthCalledWith(1, 'token', {
      baseUpdatedAt: '2026-06-09 10:00:00',
      fields: { description: 'Updated spinner', flaggedMessage: null, isFlagged: false },
      issueId: 123,
      op: 'update',
    });
    expect(pushTabvarIssue).toHaveBeenNthCalledWith(2, 'token', {
      baseUpdatedAt: '2026-06-09 10:05:00',
      fields: { status: 'Completed' },
      issueId: 123,
      op: 'status',
    });
    expect(applyTabvarIssue).toHaveBeenCalledTimes(2);
  });

  it('rejects illegal status transitions before calling the API', async () => {
    await expect(
      saveIssueEdits(
        db,
        issue,
        { description: 'Spinner on bolt 2', flaggedMessage: '', status: 'In Moderation' },
        'token',
      ),
    ).rejects.toThrow('Cannot change status from Reported to In Moderation.');
    expect(pushTabvarIssue).not.toHaveBeenCalled();
  });

  it('applies the server issue and reports a conflict', async () => {
    const serverIssue: TabvarIssue = {
      cragId: 7,
      description: 'Server version',
      id: 123,
      issueType: 'Bolts',
      routeId: 456,
      status: 'Reported',
      updatedAt: '2026-06-09 11:00:00',
    };
    (pushTabvarIssue as jest.Mock).mockRejectedValueOnce(new TabvarIssueConflictError(serverIssue));
    (getIssueDetail as jest.Mock).mockResolvedValueOnce({ ...issue, description: 'Server version' });

    await expect(
      saveIssueEdits(
        db,
        issue,
        { description: 'Stale edit', flaggedMessage: '', status: 'Reported' },
        'token',
      ),
    ).resolves.toEqual({
      conflict: true,
      issue: expect.objectContaining({ description: 'Server version' }),
    });
    expect(applyTabvarIssue).toHaveBeenCalledWith(db, serverIssue);
  });
});
