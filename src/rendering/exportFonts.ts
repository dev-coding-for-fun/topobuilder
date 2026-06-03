import { Skia, type SkTypeface } from '@shopify/react-native-skia';
import { Asset } from 'expo-asset';

import type { RenderTextFontWeight } from './scene';
import { SKIA_INTER_FONT_BY_WEIGHT } from './skiaFontRegistry';

export type ExportSkiaTypefaces = Record<RenderTextFontWeight, SkTypeface>;

let exportTypefacesPromise: Promise<ExportSkiaTypefaces> | undefined;

const EXPORT_FONT_WEIGHTS = Object.keys(SKIA_INTER_FONT_BY_WEIGHT) as RenderTextFontWeight[];

export function loadExportSkiaTypefaces() {
  exportTypefacesPromise ??= Promise.all(
    EXPORT_FONT_WEIGHTS.map(async (weight) => {
      const fontModule = SKIA_INTER_FONT_BY_WEIGHT[weight];
      const asset = await Asset.fromModule(fontModule).downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      const data = await Skia.Data.fromURI(uri);
      const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(data);
      if (!typeface) {
        throw new Error(`Export font ${weight} could not be loaded.`);
      }
      return [weight, typeface] as const;
    }),
  ).then((entries) => {
    const typefaces = Object.fromEntries(entries) as Partial<ExportSkiaTypefaces>;
    for (const weight of EXPORT_FONT_WEIGHTS) {
      if (!typefaces[weight]) {
        throw new Error(`Export font ${weight} could not be loaded.`);
      }
    }

    return typefaces as ExportSkiaTypefaces;
  });

  return exportTypefacesPromise;
}

export function clearExportSkiaTypefacesForTests() {
  exportTypefacesPromise = undefined;
}
