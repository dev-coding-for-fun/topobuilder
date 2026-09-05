jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///var/mobile/Containers/Data/Application/TEST-UUID/Documents/',
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
}));

import * as FileSystem from 'expo-file-system/legacy';
import { copyPhotoIntoLibrary, resolvePhotoUri } from './assetStorage.native';

describe('native asset storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('copyPhotoIntoLibrary', () => {
    it('copies to destination and returns a relative path', async () => {
      const result = await copyPhotoIntoLibrary('file:///tmp/source.jpg', 'topo-123');

      expect(result).toMatch(/^topos\/topo-123\/photo_[a-z0-9_]+\.jpg$/);
      expect(FileSystem.copyAsync).toHaveBeenCalledWith({
        from: 'file:///tmp/source.jpg',
        to: `file:///var/mobile/Containers/Data/Application/TEST-UUID/Documents/${result}`,
      });
    });

    it('preserves the original file extension', async () => {
      const result = await copyPhotoIntoLibrary('file:///tmp/source.png', 'topo-123');

      expect(result).toMatch(/\.png$/);
    });
  });

  describe('resolvePhotoUri', () => {
    it('returns undefined when input is undefined', () => {
      expect(resolvePhotoUri(undefined)).toBeUndefined();
    });

    it('resolves relative path against current documentDirectory', () => {
      const resolved = resolvePhotoUri('topos/topo-1/photo_abc.jpg');
      expect(resolved).toBe(
        'file:///var/mobile/Containers/Data/Application/TEST-UUID/Documents/topos/topo-1/photo_abc.jpg',
      );
    });

    it('passes through data URIs unchanged', () => {
      expect(resolvePhotoUri('data:image/jpeg;base64,xyz')).toBe('data:image/jpeg;base64,xyz');
    });

    it('passes through http and https URIs unchanged', () => {
      expect(resolvePhotoUri('https://example.com/photo.jpg')).toBe('https://example.com/photo.jpg');
      expect(resolvePhotoUri('http://example.com/photo.jpg')).toBe('http://example.com/photo.jpg');
    });

    it('passes through existing file:// URIs unchanged', () => {
      expect(resolvePhotoUri('file:///custom/path.jpg')).toBe('file:///custom/path.jpg');
    });
  });
});
