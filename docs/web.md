# Web MVP Notes

The web MVP is an app-like Expo web build:

```sh
npm run web
npx expo export --platform web
```

React Native Skia loads CanvasKit from the version-matched `canvaskit-wasm` CDN in `index.web.tsx`. If this changes back to local hosting, ensure `canvaskit.wasm` is served with the `application/wasm` MIME type.

`expo-sqlite` web support uses WASM and `SharedArrayBuffer`. Local development through Expo CLI handles the development server path, but deployed web hosting must send these headers:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

The browser MVP intentionally does not expose PDF export, print, share, or Electron packaging.
