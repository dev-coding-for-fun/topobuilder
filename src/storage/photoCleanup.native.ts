import * as FileSystem from 'expo-file-system/legacy';

const ASSET_ROOT = `${FileSystem.documentDirectory ?? ''}topos`;

export async function clearPhotosDirectory(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(ASSET_ROOT);
    if (!info.exists) {
      return;
    }
    await FileSystem.deleteAsync(ASSET_ROOT, { idempotent: true });
  } catch (error) {
    console.warn('[photoCleanup] native sweep failed', error);
  }
}
