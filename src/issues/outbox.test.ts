jest.mock('@/integrations/tabvar/issues', () => ({
  pushTabvarIssue: jest.fn(),
  uploadTabvarIssueAttachments: jest.fn(),
}));

jest.mock('@/storage/repos/issueOutboxRepo', () => ({
  addIssueSyncLog: jest.fn(),
  deletePendingIssueCreate: jest.fn(),
  deletePendingIssueEdit: jest.fn(),
  deleteUploadedPendingAttachment: jest.fn(),
  listPendingAttachments: jest.fn(),
  listPendingCreates: jest.fn(),
  listPendingEdits: jest.fn(),
  markPendingAttachmentUploaded: jest.fn(),
  updatePendingIssueEditBase: jest.fn(),
}));

jest.mock('@/storage/repos/tabvarIssuesRepo', () => ({
  applyTabvarIssue: jest.fn(),
  getIssueDetail: jest.fn(),
  insertIssueAttachments: jest.fn(),
}));

import { pushTabvarIssue, uploadTabvarIssueAttachments } from '@/integrations/tabvar/issues';
import type { TabvarIssueAttachment } from '@/integrations/tabvar/types';
import {
  addIssueSyncLog,
  deletePendingIssueCreate,
  deleteUploadedPendingAttachment,
  listPendingAttachments,
  listPendingCreates,
  listPendingEdits,
  type PendingIssueAttachment,
} from '@/storage/repos/issueOutboxRepo';
import { applyTabvarIssue, insertIssueAttachments } from '@/storage/repos/tabvarIssuesRepo';

import { flushIssueOutbox } from './outbox';

const { markPendingAttachmentUploaded } = jest.requireMock('@/storage/repos/issueOutboxRepo') as {
  markPendingAttachmentUploaded: jest.Mock;
};

const db = {} as never;
const serverAttachment: TabvarIssueAttachment = {
  id: 12,
  name: 'photo.jpg',
  type: 'image/jpeg',
  url: 'https://example.test/photo.jpg',
};

function pendingAttachment(
  overrides: Partial<PendingIssueAttachment> & Pick<PendingIssueAttachment, 'id' | 'issueKey'>,
): PendingIssueAttachment {
  return {
    createdAt: '2026-08-19T12:00:00.000Z',
    filename: 'photo.jpg',
    localUri: `file:///${overrides.id}.jpg`,
    mimeType: 'image/jpeg',
    uploaded: false,
    ...overrides,
  };
}

describe('flushIssueOutbox attachment upload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listPendingCreates as jest.Mock).mockResolvedValue([]);
    (listPendingEdits as jest.Mock).mockResolvedValue([]);
    (listPendingAttachments as jest.Mock).mockResolvedValue([]);
    (addIssueSyncLog as jest.Mock).mockResolvedValue(undefined);
    (deletePendingIssueCreate as jest.Mock).mockResolvedValue(undefined);
    (deleteUploadedPendingAttachment as jest.Mock).mockResolvedValue(undefined);
    (applyTabvarIssue as jest.Mock).mockResolvedValue(undefined);
    (insertIssueAttachments as jest.Mock).mockResolvedValue(undefined);
    (uploadTabvarIssueAttachments as jest.Mock).mockResolvedValue({ attachments: [serverAttachment] });
    (pushTabvarIssue as jest.Mock).mockResolvedValue({
      id: 99,
      issueType: 'Bolts',
      routeId: 456,
      status: 'In Moderation',
      updatedAt: '2026-08-19T12:00:00.000Z',
    });
  });

  it('uploads then inserts local rows then deletes pending photos without marking uploaded', async () => {
    const pending = pendingAttachment({ id: 'att-1', issueKey: 'server:123' });
    (listPendingAttachments as jest.Mock).mockResolvedValue([pending]);
    const calls: string[] = [];
    (uploadTabvarIssueAttachments as jest.Mock).mockImplementation(async () => {
      calls.push('upload');
      return { attachments: [serverAttachment] };
    });
    (insertIssueAttachments as jest.Mock).mockImplementation(async () => {
      calls.push('insert');
    });
    (deleteUploadedPendingAttachment as jest.Mock).mockImplementation(async () => {
      calls.push('delete');
    });
    (markPendingAttachmentUploaded as jest.Mock).mockImplementation(async () => {
      calls.push('mark');
    });

    await expect(flushIssueOutbox(db, 'token', 'manual')).resolves.toEqual(
      expect.objectContaining({
        status: 'ok',
        summary: 'Uploaded 1 issue change.',
      }),
    );

    expect(uploadTabvarIssueAttachments).toHaveBeenCalledWith('token', 123, [
      { filename: 'photo.jpg', mimeType: 'image/jpeg', uri: 'file:///att-1.jpg' },
    ]);
    expect(insertIssueAttachments).toHaveBeenCalledWith(db, 123, [serverAttachment]);
    expect(deleteUploadedPendingAttachment).toHaveBeenCalledWith(db, 'att-1');
    expect(markPendingAttachmentUploaded).not.toHaveBeenCalled();
    expect(calls).toEqual(['upload', 'insert', 'delete']);
  });

  it('leaves pending rows unuploaded when local insert fails after a successful HTTP upload', async () => {
    const pending = pendingAttachment({ id: 'att-1', issueKey: 'server:123' });
    (listPendingAttachments as jest.Mock).mockResolvedValue([pending]);
    (insertIssueAttachments as jest.Mock).mockRejectedValue(new Error('sqlite busy'));

    await expect(flushIssueOutbox(db, 'token', 'manual')).resolves.toEqual(
      expect.objectContaining({
        status: 'error',
        summary: 'Uploaded 0 issue changes; 1 failed.',
      }),
    );

    expect(uploadTabvarIssueAttachments).toHaveBeenCalled();
    expect(insertIssueAttachments).toHaveBeenCalledWith(db, 123, [serverAttachment]);
    expect(markPendingAttachmentUploaded).not.toHaveBeenCalled();
    expect(deleteUploadedPendingAttachment).not.toHaveBeenCalled();
  });

  it('only uploads not-yet-uploaded server-issue photos', async () => {
    (listPendingAttachments as jest.Mock).mockResolvedValue([
      pendingAttachment({ id: 'att-uploaded', issueKey: 'server:123', uploaded: true }),
      pendingAttachment({ id: 'att-local', issueKey: 'local:issue-1' }),
      pendingAttachment({ id: 'att-pending', issueKey: 'server:123' }),
    ]);

    await flushIssueOutbox(db, 'token', 'manual');

    expect(uploadTabvarIssueAttachments).toHaveBeenCalledTimes(1);
    expect(uploadTabvarIssueAttachments).toHaveBeenCalledWith('token', 123, [
      { filename: 'photo.jpg', mimeType: 'image/jpeg', uri: 'file:///att-pending.jpg' },
    ]);
    expect(deleteUploadedPendingAttachment).toHaveBeenCalledWith(db, 'att-pending');
    expect(deleteUploadedPendingAttachment).not.toHaveBeenCalledWith(db, 'att-uploaded');
    expect(deleteUploadedPendingAttachment).not.toHaveBeenCalledWith(db, 'att-local');
  });

  it('only uploads not-yet-uploaded photos after a local issue create', async () => {
    (listPendingCreates as jest.Mock).mockResolvedValue([
      {
        createdAt: '2026-08-19T12:00:00.000Z',
        cragId: 7,
        externalId: 'issue-local-1',
        isFlagged: false,
        issueType: 'Bolts',
        routeId: 456,
        status: 'In Moderation',
        updatedAt: '2026-08-19T12:00:00.000Z',
      },
    ]);
    (listPendingAttachments as jest.Mock).mockImplementation((_db, issueKey?: string) => {
      if (issueKey === 'local:issue-local-1') {
        return Promise.resolve([
          pendingAttachment({ id: 'att-uploaded', issueKey: 'local:issue-local-1', uploaded: true }),
          pendingAttachment({ id: 'att-pending', issueKey: 'local:issue-local-1' }),
        ]);
      }
      return Promise.resolve([]);
    });

    const result = await flushIssueOutbox(db, 'token', 'manual');

    expect(pushTabvarIssue).toHaveBeenCalledWith(
      'token',
      expect.objectContaining({ op: 'create', externalId: 'issue-local-1' }),
    );
    expect(result.createdIssueIds).toEqual({ 'issue-local-1': 99 });
    expect(uploadTabvarIssueAttachments).toHaveBeenCalledTimes(1);
    expect(uploadTabvarIssueAttachments).toHaveBeenCalledWith('token', 99, [
      { filename: 'photo.jpg', mimeType: 'image/jpeg', uri: 'file:///att-pending.jpg' },
    ]);
    expect(deleteUploadedPendingAttachment).toHaveBeenCalledWith(db, 'att-pending');
    expect(deleteUploadedPendingAttachment).not.toHaveBeenCalledWith(db, 'att-uploaded');
  });
});
