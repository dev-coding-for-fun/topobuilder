export async function ensureAssetRoot() {
  return undefined;
}

export async function copyPhotoIntoLibrary(sourceUri: string, topoId: string) {
  try {
    return await dataUriFromSource(sourceUri);
  } catch (error) {
    throw new Error(`Could not persist imported photo for topo ${topoId}`, { cause: error });
  }
}

export async function pdfOutputUri(topoId: string) {
  throw new Error(`PDF export is not supported on web for topo ${topoId}`);
}

async function dataUriFromSource(sourceUri: string) {
  if (sourceUri.startsWith('data:')) {
    return sourceUri;
  }

  const response = await fetch(sourceUri);
  if (!response.ok) {
    throw new Error(`Failed to read imported photo: ${response.status}`);
  }

  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Imported photo did not produce a data URL'));
      }
    });
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Failed to read imported photo')));
    reader.readAsDataURL(blob);
  });
}
