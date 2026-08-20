jest.mock('@/issues/outbox', () => ({
  flushIssueOutbox: jest.fn(),
}));

jest.mock('@/storage/repos', () => ({
  getIssueDetailWithPending: jest.fn(),
  queuePendingIssueEdit: jest.fn(),
}));

import { flushIssueOutbox } from '@/issues/outbox';
import { getIssueDetailWithPending, queuePendingIssueEdit, type IssueDetail } from '@/storage/repos';

import { saveIssueEdits } from './save';

const issue: IssueDetail = {
  attachmentCount: 0,
  attachments: [],
  cragId: 7,
  description: 'Spinner on bolt 2',
  id: 123,
  issueKey: 'server:123',
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
    (queuePendingIssueEdit as jest.Mock).mockResolvedValue({ ...issue, description: 'Updated spinner' });
    (getIssueDetailWithPending as jest.Mock).mockResolvedValue({ ...issue, description: 'Updated spinner' });
    (flushIssueOutbox as jest.Mock).mockResolvedValue({ details: [], status: 'ok', summary: 'Uploaded.' });
  });

  it('queues edits and attempts an interactive flush', async () => {
    await expect(
      saveIssueEdits(
        db,
        issue,
        {
          boltsAffected: '2',
          description: 'Updated spinner',
          flaggedMessage: 'Needs review',
          issueType: 'Bolts',
          status: 'Completed',
          subIssueType: 'Rusted',
        },
        'token',
      ),
    ).resolves.toEqual({ issue: expect.objectContaining({ description: 'Updated spinner' }) });

    expect(queuePendingIssueEdit).toHaveBeenCalledWith(
      db,
      issue,
      expect.objectContaining({
        boltsAffected: '2',
        description: 'Updated spinner',
        flaggedMessage: 'Needs review',
        isFlagged: true,
        issueType: 'Bolts',
        routeId: 456,
        status: 'Completed',
        subIssueType: 'Rusted',
      }),
      '2026-06-09 10:00:00',
    );
    expect(flushIssueOutbox).toHaveBeenCalledWith(db, 'token', 'interactive');
  });

  it('queues a cleared description as null instead of omitting it', async () => {
    (queuePendingIssueEdit as jest.Mock).mockResolvedValue({ ...issue, description: undefined });
    (getIssueDetailWithPending as jest.Mock).mockResolvedValue({ ...issue, description: undefined });

    await saveIssueEdits(
      db,
      issue,
      { description: '   ', flaggedMessage: '', status: 'Reported' },
      'token',
    );

    expect(queuePendingIssueEdit).toHaveBeenCalledWith(
      db,
      issue,
      expect.objectContaining({
        description: null,
        flaggedMessage: null,
        isFlagged: false,
      }),
      '2026-06-09 10:00:00',
    );
  });

  it('rejects illegal status transitions before queueing', async () => {
    await expect(
      saveIssueEdits(
        db,
        issue,
        { description: 'Spinner on bolt 2', flaggedMessage: '', status: 'In Moderation' },
        'token',
      ),
    ).rejects.toThrow('Cannot change status from Reported to In Moderation.');
    expect(queuePendingIssueEdit).not.toHaveBeenCalled();
  });
});
