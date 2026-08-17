jest.mock('@/issues/outbox', () => ({
  flushIssueOutbox: jest.fn(),
}));

jest.mock('@/storage/repos', () => ({
  getIssueDetailWithPending: jest.fn(),
  queuePendingAttachment: jest.fn(),
}));

import { flushIssueOutbox } from '@/issues/outbox';
import { getIssueDetailWithPending, queuePendingAttachment, type IssueDetail } from '@/storage/repos';

import {
  addIssueAttachment,
  issuePhotoFromPickerAsset,
  MAX_ISSUE_ATTACHMENT_BYTES,
} from './attachments';

const issue: IssueDetail = {
  attachmentCount: 1,
  attachments: [
    {
      id: 'issue_attachment_1',
      issueId: 123,
      mimeType: 'image/jpeg',
      name: 'photo.jpg',
      pendingSync: true,
      url: 'file:///photo.jpg',
    },
  ],
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

describe('issuePhotoFromPickerAsset', () => {
  it('maps a jpeg picker asset', () => {
    expect(
      issuePhotoFromPickerAsset({
        fileName: 'crag.jpg',
        fileSize: 2048,
        height: 800,
        mimeType: 'image/jpeg',
        uri: 'file:///crag.jpg',
        width: 600,
      }),
    ).toEqual({
      fileSize: 2048,
      filename: 'crag.jpg',
      mimeType: 'image/jpeg',
      uri: 'file:///crag.jpg',
    });
  });

  it('rejects oversized photos', () => {
    expect(() =>
      issuePhotoFromPickerAsset({
        fileName: 'huge.jpg',
        fileSize: MAX_ISSUE_ATTACHMENT_BYTES + 1,
        height: 4000,
        mimeType: 'image/jpeg',
        uri: 'file:///huge.jpg',
        width: 3000,
      }),
    ).toThrow('Each photo must be 5 MB or smaller.');
  });

  it('rejects unsupported image types', () => {
    expect(() =>
      issuePhotoFromPickerAsset({
        fileName: 'photo.heic',
        height: 800,
        mimeType: 'image/heic',
        uri: 'file:///photo.heic',
        width: 600,
      }),
    ).toThrow('TABVAR only accepts JPEG, PNG, GIF, or WebP photos.');
  });
});

describe('addIssueAttachment', () => {
  const db = {} as never;

  beforeEach(() => {
    jest.clearAllMocks();
    (getIssueDetailWithPending as jest.Mock).mockResolvedValue(issue);
    (flushIssueOutbox as jest.Mock).mockResolvedValue({ details: [], status: 'ok', summary: 'Uploaded.' });
  });

  it('queues a photo and attempts an interactive flush', async () => {
    const photo = {
      filename: 'photo.jpg',
      mimeType: 'image/jpeg' as const,
      uri: 'file:///photo.jpg',
    };

    await expect(addIssueAttachment(db, 123, photo, 'token')).resolves.toEqual(issue);

    expect(queuePendingAttachment).toHaveBeenCalledWith(db, 'server:123', photo);
    expect(flushIssueOutbox).toHaveBeenCalledWith(db, 'token', 'interactive');
  });
});
