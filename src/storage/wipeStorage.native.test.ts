jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///var/mobile/Containers/Data/Application/TEST-UUID/Documents/',
  readDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

jest.mock('expo-sqlite', () => ({
  deleteDatabaseAsync: jest.fn(),
}));

jest.mock('./database', () => ({
  DATABASE_NAME: 'topobuilder.db',
  resetDatabaseConnection: jest.fn(),
}));

import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';

import { resetDatabaseConnection } from './database';
import { wipeLocalStorage } from './wipeStorage.native';

describe('native wipeLocalStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resets database connection, deletes database, and sweeps all files in documentDirectory', async () => {
    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue([
      'topos',
      'issues',
      'settings-test.txt',
      'tabvar.session.json',
    ]);
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
    (SQLite.deleteDatabaseAsync as jest.Mock).mockResolvedValue(undefined);
    (resetDatabaseConnection as jest.Mock).mockResolvedValue(undefined);

    await wipeLocalStorage();

    expect(resetDatabaseConnection).toHaveBeenCalledTimes(1);
    expect(SQLite.deleteDatabaseAsync).toHaveBeenCalledWith('topobuilder.db');
    expect(FileSystem.readDirectoryAsync).toHaveBeenCalledWith(
      'file:///var/mobile/Containers/Data/Application/TEST-UUID/Documents/',
    );
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      'file:///var/mobile/Containers/Data/Application/TEST-UUID/Documents/topos',
      { idempotent: true },
    );
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      'file:///var/mobile/Containers/Data/Application/TEST-UUID/Documents/issues',
      { idempotent: true },
    );
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      'file:///var/mobile/Containers/Data/Application/TEST-UUID/Documents/settings-test.txt',
      { idempotent: true },
    );
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      'file:///var/mobile/Containers/Data/Application/TEST-UUID/Documents/tabvar.session.json',
      { idempotent: true },
    );
  });

  it('tolerates SQLite deletion errors and continues deleting files', async () => {
    (SQLite.deleteDatabaseAsync as jest.Mock).mockRejectedValue(new Error('DB locked'));
    (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue(['topos']);
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

    await expect(wipeLocalStorage()).resolves.toBeUndefined();
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      'file:///var/mobile/Containers/Data/Application/TEST-UUID/Documents/topos',
      { idempotent: true },
    );
  });
});
