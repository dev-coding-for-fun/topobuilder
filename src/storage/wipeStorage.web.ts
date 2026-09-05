import * as SQLite from 'expo-sqlite';

import { DATABASE_NAME, resetDatabaseConnection } from './database';

/**
 * Developer action: completely wipes the local SQLite database and
 * browser localStorage/sessionStorage on web.
 */
export async function wipeLocalStorage(): Promise<void> {
  await resetDatabaseConnection();

  try {
    await SQLite.deleteDatabaseAsync(DATABASE_NAME);
  } catch (error) {
    console.warn('[wipeStorage] SQLite database deletion failed:', error);
  }

  if (typeof window !== 'undefined') {
    try {
      window.localStorage?.clear();
      window.sessionStorage?.clear();
    } catch (error) {
      console.warn('[wipeStorage] storage clear failed:', error);
    }
  }
}
