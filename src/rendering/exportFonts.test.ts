import { Asset } from 'expo-asset';
import { Skia } from '@shopify/react-native-skia';

import { clearExportSkiaTypefacesForTests, loadExportSkiaTypefaces } from './exportFonts';

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn((moduleId: number) => ({
      downloadAsync: jest.fn(async () => ({
        localUri: `file://font-${moduleId}.ttf`,
        uri: `https://example.com/font-${moduleId}.ttf`,
      })),
    })),
  },
}));

describe('loadExportSkiaTypefaces', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearExportSkiaTypefacesForTests();
  });

  it('loads bundled Inter font assets into Skia typefaces for offscreen export text', async () => {
    const typefaces = await loadExportSkiaTypefaces();

    expect(Asset.fromModule).toHaveBeenCalledWith(400);
    expect(Asset.fromModule).toHaveBeenCalledWith(700);
    expect(Skia.Data.fromURI).toHaveBeenCalledWith('file://font-400.ttf');
    expect(Skia.Data.fromURI).toHaveBeenCalledWith('file://font-700.ttf');
    expect(Skia.Typeface.MakeFreeTypeFaceFromData).toHaveBeenCalledTimes(2);
    expect(typefaces).toEqual({
      '400': 'sk-typeface',
      '700': 'sk-typeface',
    });
  });
});
