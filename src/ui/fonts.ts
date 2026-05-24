import {
  Inter_400Regular,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';

export const fontFamilies = {
  regular: 'Inter_400Regular',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
} as const;

export const interFontMap = {
  [fontFamilies.regular]: Inter_400Regular,
  [fontFamilies.bold]: Inter_700Bold,
  [fontFamilies.extraBold]: Inter_800ExtraBold,
  [fontFamilies.black]: Inter_900Black,
};
