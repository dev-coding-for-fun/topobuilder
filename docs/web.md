# Web MVP Notes

The web MVP is an app-like Expo web build:

```sh
npm run web
npx expo export --platform web
```

React Native Skia loads CanvasKit from `/canvaskit.wasm`, which is self-hosted out of `public/canvaskit.wasm` (copied from `node_modules/canvaskit-wasm/bin/full/canvaskit.wasm`). The static export emits it to `dist/canvaskit.wasm`. Ensure the host serves `.wasm` with the `application/wasm` MIME type — Cloudflare Workers Static Assets and most modern hosts do this by default.

To refresh after a `canvaskit-wasm` version bump:

```sh
Copy-Item node_modules/canvaskit-wasm/bin/full/canvaskit.wasm public/canvaskit.wasm
```

`expo-sqlite` web support uses WASM and `SharedArrayBuffer`. Local development through Expo CLI handles the development server path, but deployed web hosting must send these headers:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

The browser MVP intentionally does not expose PDF export, print, share, or Electron packaging.
