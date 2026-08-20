import { File } from 'expo-file-system';

import type { TabvarUploadImage } from './types';

export async function appendTopoUpload(
  formData: FormData,
  fieldName: string,
  image: TabvarUploadImage,
): Promise<void> {
  const file = new File(image.uri);
  if (!file.exists) {
    throw new Error(`Could not read image "${image.filename}" for Tabvar upload.`);
  }
  formData.append(fieldName, file, image.filename);
}
