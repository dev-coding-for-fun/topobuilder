import type { TabvarUploadImage } from './types';

export async function appendTopoUpload(
  formData: FormData,
  fieldName: string,
  image: TabvarUploadImage,
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
