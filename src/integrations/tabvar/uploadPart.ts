import type { TabvarSubmissionImage } from './types';

export async function appendTopoUpload(
  formData: FormData,
  fieldName: string,
  image: TabvarSubmissionImage,
): Promise<void> {
  const response = await fetch(image.uri);
  if (!response.ok) {
    throw new Error(`Could not read topo image "${image.filename}" for Tabvar submission.`);
  }
  const blob = await response.blob();
  formData.append(fieldName, blob, image.filename);
}
