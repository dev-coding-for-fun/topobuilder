import { Stack } from 'expo-router';
import { useFonts } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, TextInput } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { TopoStoreProvider } from '@/state/TopoStore';
import { fontFamilies, interFontMap } from '@/ui/fonts';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 200, fade: true });

type ComponentWithDefaults = {
  defaultProps?: { style?: unknown };
};

let interDefaultsInstalled = false;

function installInterDefaults() {
  if (interDefaultsInstalled) {
    return;
  }

  const text = Text as unknown as ComponentWithDefaults;
  const textInput = TextInput as unknown as ComponentWithDefaults;
  const defaultTextProps = text.defaultProps ?? {};
  text.defaultProps = {
    ...defaultTextProps,
    style: [defaultTextProps.style, { fontFamily: fontFamilies.regular }],
  };

  const defaultTextInputProps = textInput.defaultProps ?? {};
  textInput.defaultProps = {
    ...defaultTextInputProps,
    style: [defaultTextInputProps.style, { fontFamily: fontFamilies.regular }],
  };
  interDefaultsInstalled = true;
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

  installInterDefaults();

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
