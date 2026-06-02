import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { Skia, type SkTypeface } from '@shopify/react-native-skia';
import { Asset } from 'expo-asset';

import type { RenderTextFontWeight } from './scene';

export type ExportSkiaTypefaces = Partial<Record<RenderTextFontWeight, SkTypeface>>;

const EXPORT_FONT_BY_WEIGHT = {
  '400': Inter_400Regular,
  '700': Inter_700Bold,
} satisfies Record<RenderTextFontWeight, Parameters<typeof Asset.fromModule>[0]>;

let exportTypefacesPromise: Promise<ExportSkiaTypefaces> | undefined;

export function loadExportSkiaTypefaces() {
  exportTypefacesPromise ??= Promise.all(
    Object.entries(EXPORT_FONT_BY_WEIGHT).map(async ([weight, fontModule]) => {
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
