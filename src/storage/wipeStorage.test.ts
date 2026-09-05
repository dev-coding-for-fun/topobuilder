jest.mock('expo-sqlite', () => ({
  deleteDatabaseAsync: jest.fn(),
}));

jest.mock('./database', () => ({
  DATABASE_NAME: 'topobuilder.db',
  resetDatabaseConnection: jest.fn(),
}));

import * as SQLite from 'expo-sqlite';

import { resetDatabaseConnection } from './database';
import { wipeLocalStorage } from './wipeStorage.web';

describe('web wipeLocalStorage', () => {
  const originalLocalStorage = window.localStorage;
  const originalSessionStorage = window.sessionStorage;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: originalSessionStorage,
      writable: true,
    });
  });

  it('resets database connection, deletes database, and clears browser storage', async () => {
    const mockLocalStorage = { clear: jest.fn() };
    const mockSessionStorage = { clear: jest.fn() };

    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true,
    });

    (SQLite.deleteDatabaseAsync as jest.Mock).mockResolvedValue(undefined);
    (resetDatabaseConnection as jest.Mock).mockResolvedValue(undefined);

    await wipeLocalStorage();

    expect(resetDatabaseConnection).toHaveBeenCalledTimes(1);
    expect(SQLite.deleteDatabaseAsync).toHaveBeenCalledWith('topobuilder.db');
    expect(mockLocalStorage.clear).toHaveBeenCalledTimes(1);
    expect(mockSessionStorage.clear).toHaveBeenCalledTimes(1);
  });
});
