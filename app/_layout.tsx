import { Stack, useNavigationContainerRef, usePathname } from 'expo-router';
import { useFonts } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { StrictMode, useEffect } from 'react';
import { Platform, StyleSheet, Text, TextInput, type StyleProp, type TextStyle } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TopoStoreProvider } from '@/state/TopoStore';
import { IssueStoreProvider } from '@/state/IssueStore';
import { registerIssueSyncRuntime } from '@/issues/syncRuntime';
import { stackScreenOptionsForPathname } from '@/navigation/stackScreenOptions';
import { interFontMap, interStyle } from '@/ui/fonts';

import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';

const sentryDsn =
  process.env.EXPO_PUBLIC_SENTRY_DSN ??
  (Constants.expoConfig?.extra?.sentryDsn as string | undefined);

const routingInstrumentation = sentryDsn
  ? Sentry.reactNavigationIntegration({
      enableTimeToInitialDisplay: Platform.OS !== 'web',
    })
  : undefined;

if (sentryDsn && routingInstrumentation) {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    integrations: [
      routingInstrumentation,
    ],
    enableNativeFramesTracking: Platform.OS !== 'web',
  });
}

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
 * Safe to call before web font files have finished loading: `defaultProps`
 * just stores a family name string; the renderer resolves it on each frame.
 * Native builds embed these fonts with the expo-font config plugin.
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

function RootLayout() {
  return (
    <StrictMode>
      {Platform.OS === 'web' ? <RootLayoutWithRuntimeFonts /> : <RootLayoutShell />}
    </StrictMode>
  );
}

export default sentryDsn ? Sentry.wrap(RootLayout) : RootLayout;

function RootLayoutWithRuntimeFonts() {
  const [fontsLoaded, fontError] = useFonts(interFontMap);

  useEffect(() => {
    if (fontError) {
      console.error('[fonts] Failed to load Inter font family', fontError);
    }
  }, [fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return <RootLayoutShell />;
}

function RootLayoutShell() {
  const pathname = usePathname();
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    if (routingInstrumentation && navigationRef?.current) {
      routingInstrumentation.registerNavigationContainer(navigationRef);
    }
  }, [navigationRef]);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => registerIssueSyncRuntime(), []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <TopoStoreProvider>
            <IssueStoreProvider>
              <StatusBar style="dark" />
              <Stack
                screenOptions={stackScreenOptionsForPathname(pathname)}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              </Stack>
            </IssueStoreProvider>
          </TopoStoreProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
