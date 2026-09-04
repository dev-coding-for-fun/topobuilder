import type { ImagePickerAsset } from 'expo-image-picker';

import type { TabvarUploadImage } from '@/integrations/tabvar/types';
import { localIssueKey, serverIssueKey, type IssueKey } from '@/issues/keys';
import { flushIssueOutbox } from '@/issues/outbox';
import {
  getIssueDetailWithPending,
  queuePendingAttachment,
  type IssueDetail,
} from '@/storage/repos';
import type { TopoDatabase } from '@/storage/database';

export const MAX_ISSUE_ATTACHMENTS = 5;
export const MAX_ISSUE_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export type IssuePhotoUpload = TabvarUploadImage & {
  fileSize?: number;
};

export function issuePhotoFromPickerAsset(asset: ImagePickerAsset): IssuePhotoUpload {
  const mimeType = imageMimeType(asset.mimeType, asset.fileName, asset.uri);
  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
    throw new Error('TABVAR only accepts JPEG, PNG, GIF, or WebP photos.');
  }
  const allowedType = mimeType as IssuePhotoUpload['mimeType'];
  if (asset.fileSize != null && asset.fileSize > MAX_ISSUE_ATTACHMENT_BYTES) {
    throw new Error('Each photo must be 5 MB or smaller.');
  }

  return {
    filename: asset.fileName?.trim() || defaultFilename(allowedType),
    mimeType: allowedType,
    uri: asset.uri,
    ...(asset.fileSize != null ? { fileSize: asset.fileSize } : {}),
  };
}

export async function addIssueAttachment(
  db: TopoDatabase,
  issueId: number | string,
  photo: IssuePhotoUpload,
  accessToken: string,
): Promise<IssueDetail> {
  if (photo.fileSize != null && photo.fileSize > MAX_ISSUE_ATTACHMENT_BYTES) {
    throw new Error('Each photo must be 5 MB or smaller.');
  }
  if (!ALLOWED_IMAGE_TYPES.has(photo.mimeType)) {
    throw new Error('TABVAR only accepts JPEG, PNG, GIF, or WebP photos.');
  }

  const issueKey = issueKeyFromId(issueId);
  await queuePendingAttachment(db, issueKey, photo);
  const queuedDetail = await getIssueDetailWithPending(db, issueKey);
  await flushIssueOutbox(db, accessToken, 'interactive').catch((error) => {
    console.warn('[issues] interactive attachment flush failed', error);
  });
  const detail = (await getIssueDetailWithPending(db, issueKey)) ?? queuedDetail;
  if (!detail) {
    throw new Error('TABVAR queued the photo, but the issue could not be loaded locally.');
  }
  return detail;
}

function issueKeyFromId(issueId: number | string): IssueKey {
  if (typeof issueId === 'number') return serverIssueKey(issueId);
  if (issueId.startsWith('server:') || issueId.startsWith('local:')) return issueId as IssueKey;
  return localIssueKey(issueId);
}

function imageMimeType(
  mimeType: string | null | undefined,
  fileName: string | null | undefined,
  uri: string,
): TabvarUploadImage['mimeType'] | string {
  const detected = mimeType?.toLowerCase() || mimeTypeFromName(fileName) || mimeTypeFromName(uri);
  if (detected === 'image/jpg') return 'image/jpeg';
  return detected;
}

function mimeTypeFromName(value: string | null | undefined): string {
  const clean = value?.split('?')[0]?.split('#')[0] ?? '';
  const extension = clean.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return '';
  }
}

function defaultFilename(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'issue-photo.jpg';
    case 'image/png':
      return 'issue-photo.png';
    case 'image/gif':
      return 'issue-photo.gif';
    case 'image/webp':
      return 'issue-photo.webp';
    default:
      return 'issue-photo.jpg';
  }
}
