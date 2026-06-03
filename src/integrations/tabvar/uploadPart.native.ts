import type { TabvarSubmissionImage } from './types';

export async function appendTopoUpload(
  formData: FormData,
  fieldName: string,
  image: TabvarSubmissionImage,
): Promise<void> {
  formData.append(
    fieldName,
    {
      name: image.filename,
      type: image.mimeType,
      uri: image.uri,
    } as unknown as Blob,
  );
}
