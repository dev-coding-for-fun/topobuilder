import { Asset } from 'expo-asset';
import { Skia } from '@shopify/react-native-skia';

import { clearExportSkiaTypefacesForTests, loadExportSkiaTypefaces } from './exportFonts';
import { SKIA_INTER_FONT_BY_WEIGHT } from './skiaFontRegistry';

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

    Object.entries(SKIA_INTER_FONT_BY_WEIGHT).forEach(([weight, fontModule]) => {
      expect(Asset.fromModule).toHaveBeenCalledWith(fontModule);
      expect(Skia.Data.fromURI).toHaveBeenCalledWith(`file://font-${fontModule}.ttf`);
      expect(typefaces).toHaveProperty(weight, 'sk-typeface');
    });
    expect(Skia.Typeface.MakeFreeTypeFaceFromData).toHaveBeenCalledTimes(
      Object.keys(SKIA_INTER_FONT_BY_WEIGHT).length,
    );
  });

  it('rejects when a registered export font cannot be loaded into a Skia typeface', async () => {
    (Skia.Typeface.MakeFreeTypeFaceFromData as jest.Mock).mockReturnValueOnce(null);

    await expect(loadExportSkiaTypefaces()).rejects.toThrow('Export font 400 could not be loaded.');
  });
});
