jest.mock('@/issues/outbox', () => ({
  flushIssueOutbox: jest.fn(),
}));

jest.mock('@/storage/repos', () => ({
  getIssueRouteOption: jest.fn(),
  queuePendingIssueCreate: jest.fn(),
}));

import { flushIssueOutbox } from '@/issues/outbox';
import { getIssueRouteOption, queuePendingIssueCreate, type IssueDetail } from '@/storage/repos';

import { createIssue } from './create';

const queued: IssueDetail = {
  attachmentCount: 0,
  attachments: [],
  cragId: 7,
  description: 'Spinner on bolt 2',
  id: 'issue-1',
  issueKey: 'local:issue-1',
  isFlagged: false,
  issueType: 'Bolts',
  routeId: 456,
  routeName: 'Solar Flare',
  status: 'In Moderation',
  updatedAt: '2026-06-09T10:00:00.000Z',
};

const photo = {
  filename: 'photo.jpg',
  mimeType: 'image/jpeg' as const,
  uri: 'file:///photo.jpg',
};

describe('createIssue', () => {
  const db = {} as never;

  beforeEach(() => {
    jest.clearAllMocks();
    (getIssueRouteOption as jest.Mock).mockResolvedValue({
      cragId: 7,
      cragName: 'Bow Valley',
      id: 456,
      name: 'Solar Flare',
    });
    (queuePendingIssueCreate as jest.Mock).mockResolvedValue(queued);
    (flushIssueOutbox as jest.Mock).mockResolvedValue({ details: [], status: 'ok', summary: 'Uploaded.' });
  });

  it('queues an issue create and attempts an interactive flush', async () => {
    await expect(
      createIssue(
        db,
        {
          boltsAffected: '2',
          description: 'Spinner on bolt 2',
          issueType: 'Bolts',
          photos: [photo],
          routeId: 456,
          subIssueType: 'Rusted',
        },
        'token',
      ),
    ).resolves.toEqual(queued);

    expect(queuePendingIssueCreate).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        boltsAffected: '2',
        cragId: 7,
        description: 'Spinner on bolt 2',
        issueType: 'Bolts',
        routeId: 456,
        status: 'In Moderation',
        subIssueType: 'Rusted',
      }),
      [photo],
    );
    expect(flushIssueOutbox).toHaveBeenCalledWith(db, 'token', 'interactive');
  });

  it('requires the route to be in the local catalog', async () => {
    (getIssueRouteOption as jest.Mock).mockResolvedValue(undefined);

    await expect(createIssue(db, { issueType: 'Bolts', routeId: 999 }, 'token')).rejects.toThrow(
      'Choose a synced route before creating an offline issue.',
    );
  });
});
