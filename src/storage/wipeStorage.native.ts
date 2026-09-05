import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';

import { DATABASE_NAME, resetDatabaseConnection } from './database';

/**
 * Developer action: completely wipes the local SQLite database and all
 * files/directories under FileSystem.documentDirectory (topos, issue
 * attachments, settings, and session credentials).
 */
export async function wipeLocalStorage(): Promise<void> {
  await resetDatabaseConnection();

  try {
    await SQLite.deleteDatabaseAsync(DATABASE_NAME);
  } catch (error) {
    console.warn('[wipeStorage] SQLite database deletion failed:', error);
  }

  const dir = FileSystem.documentDirectory;
  if (!dir) {
    return;
  }

  try {
    const entries = await FileSystem.readDirectoryAsync(dir);
    await Promise.all(
      entries.map(async (entry) => {
        try {
          await FileSystem.deleteAsync(`${dir}${entry}`, { idempotent: true });
        } catch (error) {
          console.warn(`[wipeStorage] failed to delete ${entry}:`, error);
        }
      }),
    );
  } catch (error) {
    console.warn('[wipeStorage] failed to read documentDirectory:', error);
  }
}
