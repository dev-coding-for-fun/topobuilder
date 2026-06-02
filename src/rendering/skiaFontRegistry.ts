import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';

import type { RenderTextFontWeight } from './scene';

export const SKIA_INTER_FONT_BY_WEIGHT = {
  '400': Inter_400Regular,
  '700': Inter_700Bold,
} satisfies Record<RenderTextFontWeight, number>;
