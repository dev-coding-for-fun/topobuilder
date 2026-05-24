import '@expo/metro-runtime';

import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

// Self-host CanvasKit so the deployed app is fully static and has no third-party
// CDN dependency. The wasm file is copied from node_modules/canvaskit-wasm into
// `public/` so Expo includes it at the root of the static export.
LoadSkiaWeb({
  locateFile: (file) => `/${file}`,
}).then(() => {
  renderRootComponent(App);
});
