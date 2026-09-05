import * as FileSystem from 'expo-file-system/legacy';

import { createId } from '@/domain/ids';

function getAssetRoot() {
  return `${FileSystem.documentDirectory ?? ''}topos`;
}

export async function ensureAssetRoot() {
  const assetRoot = getAssetRoot();
  const info = await FileSystem.getInfoAsync(assetRoot);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(assetRoot, { intermediates: true });
  }
}

export async function copyPhotoIntoLibrary(sourceUri: string, topoId: string): Promise<string> {
  await ensureAssetRoot();
  const assetRoot = getAssetRoot();
  const topoDir = `${assetRoot}/${topoId}`;
  const info = await FileSystem.getInfoAsync(topoDir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(topoDir, { intermediates: true });
  }

  const extension = sourceUri.split('.').pop()?.split('?')[0] || 'jpg';
  const fileName = `${createId('photo')}.${extension}`;
  const relativePath = `topos/${topoId}/${fileName}`;
  const destination = `${FileSystem.documentDirectory ?? ''}${relativePath}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });

  return relativePath;
}

export function resolvePhotoUri(storedPath?: string): string | undefined {
  if (!storedPath) return undefined;
  if (
    storedPath.startsWith('data:') ||
    storedPath.startsWith('http://') ||
    storedPath.startsWith('https://') ||
    storedPath.startsWith('file://')
  ) {
    return storedPath;
  }
  return `${FileSystem.documentDirectory ?? ''}${storedPath}`;
}

export async function pdfOutputUri(topoId: string) {
  await ensureAssetRoot();
  const topoDir = `${getAssetRoot()}/${topoId}`;
  const info = await FileSystem.getInfoAsync(topoDir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(topoDir, { intermediates: true });
  }

  return `${topoDir}/${createId('topo')}.pdf`;
}
