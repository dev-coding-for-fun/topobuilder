import '@expo/metro-runtime';

import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { version as canvasKitVersion } from 'canvaskit-wasm/package.json';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

LoadSkiaWeb({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/canvaskit-wasm@${canvasKitVersion}/bin/full/${file}`,
}).then(() => {
  renderRootComponent(App);
});
