import {
  Inter_400Regular,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import type { FontSource } from 'expo-font';
import type { TextStyle } from 'react-native';

export const fontFamilies = {
  regular: 'Inter_400Regular',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
} as const;

export const interFontMap: Record<string, FontSource> = {
  [fontFamilies.regular]: Inter_400Regular,
  [fontFamilies.bold]: Inter_700Bold,
  [fontFamilies.extraBold]: Inter_800ExtraBold,
  [fontFamilies.black]: Inter_900Black,
};

/**
 * The numeric font weights we have an embedded Inter face for. `@expo-google-fonts/inter`
 * ships each weight as a separate family, so setting `fontWeight` alone is not enough —
 * `fontFamily` must match the weight or the renderer will fall back to a synthetic
 * bold (Android often ignores this entirely). Always pair the two via `interStyle`.
 */
export type InterFontWeight = '400' | '700' | '800' | '900';

const interFamilyByWeight: Record<InterFontWeight, (typeof fontFamilies)[keyof typeof fontFamilies]> = {
  '400': fontFamilies.regular,
  '700': fontFamilies.bold,
  '800': fontFamilies.extraBold,
  '900': fontFamilies.black,
};

/**
 * Returns the `fontFamily` + `fontWeight` pair for an embedded Inter weight.
 * Spread into a StyleSheet entry, e.g. `...interStyle('900')`, so that both
 * properties stay in lockstep.
 */
export function interStyle(weight: InterFontWeight = '400'): Pick<TextStyle, 'fontFamily' | 'fontWeight'> {
  return {
    fontFamily: interFamilyByWeight[weight],
    fontWeight: weight,
  };
}
