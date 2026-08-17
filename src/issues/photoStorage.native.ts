import * as FileSystem from 'expo-file-system/legacy';

import { createId } from '@/domain/ids';
import type { IssuePhotoUpload } from '@/issues/attachments';

const ISSUE_ASSET_ROOT = `${FileSystem.documentDirectory ?? ''}issues`;

export async function persistIssuePhoto(photo: IssuePhotoUpload): Promise<IssuePhotoUpload> {
  await ensureIssueAssetRoot();
  const extension = extensionForMimeType(photo.mimeType);
  const destination = `${ISSUE_ASSET_ROOT}/${createId('issue_photo')}.${extension}`;
  await FileSystem.copyAsync({ from: photo.uri, to: destination });
  return { ...photo, uri: destination };
}

export async function deleteIssuePhoto(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (error) {
    console.warn('[issues] could not delete pending issue photo', error);
  }
}

async function ensureIssueAssetRoot() {
  const info = await FileSystem.getInfoAsync(ISSUE_ASSET_ROOT);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(ISSUE_ASSET_ROOT, { intermediates: true });
  }
}

function extensionForMimeType(mimeType: IssuePhotoUpload['mimeType']): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
  }
}
