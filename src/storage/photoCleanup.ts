import { Platform } from 'react-native';

/**
 * Best-effort sweep of the photo files written by `copyPhotoIntoLibrary`.
 * Per-platform implementations live in `photoCleanup.native.ts` and
 * `photoCleanup.web.ts`. This default fallback is a no-op so the migration
 * runner can always call into it.
 */
export async function clearPhotosDirectory(): Promise<void> {
  // Picked up by the platform-specific files at build time.
  if (Platform.OS === 'web' || Platform.OS === 'ios' || Platform.OS === 'android') {
    return;
  }
}
