import { Skia, type SkTypeface } from '@shopify/react-native-skia';
import { Asset } from 'expo-asset';

import type { RenderTextFontWeight } from './scene';
import { SKIA_INTER_FONT_BY_WEIGHT } from './skiaFontRegistry';

export type ExportSkiaTypefaces = Partial<Record<RenderTextFontWeight, SkTypeface>>;

let exportTypefacesPromise: Promise<ExportSkiaTypefaces> | undefined;

export function loadExportSkiaTypefaces() {
  exportTypefacesPromise ??= Promise.all(
    Object.entries(SKIA_INTER_FONT_BY_WEIGHT).map(async ([weight, fontModule]) => {
      const asset = await Asset.fromModule(fontModule).downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      const data = await Skia.Data.fromURI(uri);
      const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(data);
      if (!typeface) {
        throw new Error(`Export font ${weight} could not be loaded.`);
      }
      return [weight, typeface] as const;
    }),
  ).then((entries) => Object.fromEntries(entries) as ExportSkiaTypefaces);

  return exportTypefacesPromise;
}

export function clearExportSkiaTypefacesForTests() {
  exportTypefacesPromise = undefined;
}
