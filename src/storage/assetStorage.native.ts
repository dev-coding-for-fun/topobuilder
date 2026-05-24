import * as FileSystem from 'expo-file-system/legacy';

import { createId } from '@/domain/ids';

const assetRoot = `${FileSystem.documentDirectory ?? ''}topos`;

export async function ensureAssetRoot() {
  const info = await FileSystem.getInfoAsync(assetRoot);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(assetRoot, { intermediates: true });
  }
}

export async function copyPhotoIntoLibrary(sourceUri: string, topoId: string) {
  await ensureAssetRoot();
  const topoDir = `${assetRoot}/${topoId}`;
  const info = await FileSystem.getInfoAsync(topoDir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(topoDir, { intermediates: true });
  }

  const extension = sourceUri.split('.').pop()?.split('?')[0] || 'jpg';
  const destination = `${topoDir}/${createId('photo')}.${extension}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });

  return destination;
}

export async function pdfOutputUri(topoId: string) {
  await ensureAssetRoot();
  const topoDir = `${assetRoot}/${topoId}`;
  const info = await FileSystem.getInfoAsync(topoDir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(topoDir, { intermediates: true });
  }

  return `${topoDir}/${createId('topo')}.pdf`;
}
