import type { TabvarUploadImage } from './types';

export async function appendTopoUpload(
  formData: FormData,
  fieldName: string,
  image: TabvarUploadImage,
): Promise<void> {
  const response = await fetch(image.uri);
  if (!response.ok) {
    throw new Error(`Could not read image "${image.filename}" for Tabvar upload.`);
  }
  const blob = await response.blob();
  formData.append(fieldName, blob, image.filename);
}
