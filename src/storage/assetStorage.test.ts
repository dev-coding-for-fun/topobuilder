import { copyPhotoIntoLibrary, pdfOutputUri, resolvePhotoUri } from './assetStorage.web';

class MockFileReader {
  result: string | ArrayBuffer | null = null;
  error: Error | null = null;
  private listeners: Record<string, Array<() => void>> = {};

  addEventListener(event: string, callback: () => void) {
    this.listeners[event] = [...(this.listeners[event] ?? []), callback];
  }

  readAsDataURL() {
    this.result = 'data:image/jpeg;base64,photo-data';
    this.listeners.load?.forEach((callback) => callback());
  }
}

describe('web asset storage', () => {
  const originalFetch = globalThis.fetch;
  const originalFileReader = globalThis.FileReader;

  beforeEach(() => {
    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.FileReader = originalFileReader;
  });

  it('keeps existing data URI photos reload-stable', async () => {
    await expect(copyPhotoIntoLibrary('data:image/png;base64,abc', 'topo-1')).resolves.toBe('data:image/png;base64,abc');
  });

  it('converts imported photo blobs to data URIs', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      blob: jest.fn().mockResolvedValue(new Blob(['photo'], { type: 'image/jpeg' })),
      ok: true,
    });

    await expect(copyPhotoIntoLibrary('blob:http://localhost/photo', 'topo-1')).resolves.toBe(
      'data:image/jpeg;base64,photo-data',
    );
  });

  it('does not support PDF output on web', async () => {
    await expect(pdfOutputUri('topo-1')).rejects.toThrow('PDF export is not supported on web');
  });

  it('passes through photo URIs on web', () => {
    expect(resolvePhotoUri('data:image/jpeg;base64,abc')).toBe('data:image/jpeg;base64,abc');
    expect(resolvePhotoUri(undefined)).toBeUndefined();
  });
});
