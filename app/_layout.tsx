import { Stack } from 'expo-router';
import { useFonts } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, TextInput, type StyleProp, type TextStyle } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { TopoStoreProvider } from '@/state/TopoStore';
import { interFontMap, interStyle } from '@/ui/fonts';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 200, fade: true });
installInterDefaults();

type ComponentWithDefaults = {
  defaultProps?: { style?: StyleProp<TextStyle> };
};

/**
 * Install Inter as the default font family for `<Text>` and `<TextInput>`.
 *
 * Run once at module load – before any component renders – so the defaults are
 * already in place by the time the first paint happens. Mutating `defaultProps`
 * after a render would require a forced re-render to take effect.
 *
 * Safe to call before the font files have finished loading: `defaultProps`
 * just stores a family name string; the renderer resolves it on each frame and
 * picks up the real font as soon as `useFonts` finishes.
 *
 * `StyleSheet.flatten` collapses the merged style into a single object so that
 * a Fast-Refresh re-run won't keep nesting style arrays inside `defaultProps`.
 */
function installInterDefaults() {
  const defaultStyle = interStyle('400');
  const merge = (component: ComponentWithDefaults) => {
    const defaults = component.defaultProps ?? {};
    component.defaultProps = {
      ...defaults,
      style: StyleSheet.flatten([defaults.style, defaultStyle]),
    };
  };
  merge(Text as unknown as ComponentWithDefaults);
  merge(TextInput as unknown as ComponentWithDefaults);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(interFontMap);

  useEffect(() => {
    if (fontError) {
      console.error('[fonts] Failed to load Inter font family', fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TopoStoreProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: '#F8FAFC' },
            headerShadowVisible: false,
            headerStyle: { backgroundColor: '#F8FAFC' },
          }}
        />
      </TopoStoreProvider>
    </GestureHandlerRootView>
  );
}
