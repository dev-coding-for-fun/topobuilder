import type { IssuePhotoUpload } from '@/issues/attachments';

export async function persistIssuePhoto(photo: IssuePhotoUpload): Promise<IssuePhotoUpload> {
  if (photo.uri.startsWith('data:')) {
    return photo;
  }

  const response = await fetch(photo.uri);
  if (!response.ok) {
    throw new Error(`Could not persist issue photo "${photo.filename}".`);
  }
  const blob = await response.blob();
  const uri = await dataUriFromBlob(blob);
  return { ...photo, uri };
}

export async function deleteIssuePhoto(_uri: string): Promise<void> {
  return;
}

function dataUriFromBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Issue photo did not produce a data URL.'));
      }
    });
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Could not read issue photo.')));
    reader.readAsDataURL(blob);
  });
}
