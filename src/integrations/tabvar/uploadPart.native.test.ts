const mockFileState = {
  exists: true,
};

jest.mock('expo-file-system', () => ({
  File: class File extends Blob {
    uri: string;

    constructor(uri: string) {
      super([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' });
      this.uri = uri;
    }

    get exists() {
      return mockFileState.exists;
    }

    bytes() {
      return Promise.resolve(new Uint8Array([1, 2, 3]));
    }
  },
}));

import { appendTopoUpload } from './uploadPart.native';

describe('appendTopoUpload (native)', () => {
  beforeEach(() => {
    mockFileState.exists = true;
  });

  it('appends the local file to FormData', async () => {
    const formData = new FormData();

    await appendTopoUpload(formData, 'photos', {
      filename: 'bolt.jpg',
      mimeType: 'image/jpeg',
      uri: 'file:///docs/issues/bolt.jpg',
    });

    const part = formData.get('photos') as File;
    expect(part).toBeInstanceOf(Blob);
    expect(part.name).toBe('bolt.jpg');
  });

  it('throws when the local file cannot be read', async () => {
    mockFileState.exists = false;

    await expect(
      appendTopoUpload(new FormData(), 'photos', {
        filename: 'missing.jpg',
        mimeType: 'image/jpeg',
        uri: 'file:///docs/issues/missing.jpg',
      }),
    ).rejects.toThrow('Could not read image "missing.jpg" for Tabvar upload.');
  });
});
