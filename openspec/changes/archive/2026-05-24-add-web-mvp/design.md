## Context

TopoBuilder is an Expo SDK 54 app using Expo Router, React Native Web dependencies, Skia for annotation rendering, SQLite for metadata, and document-directory files for copied photos and generated PDFs. The existing browser surface is partial: `package.json` has a `web` script and `app.json` has web metadata, but there is no Metro web customization and several native-adjacent modules assume mobile runtime behavior.

The web MVP should prove the core desktop/browser workflow before adding Electron or export/print. The useful first slice is: create a local topo, import a photo from the browser, edit annotations with the existing editor, reload the page, and see the project restored.

## Goals / Non-Goals

**Goals:**

- Make the app boot and navigate as an Expo web app.
- Preserve the existing native mobile behavior while introducing web-specific implementations behind clear platform boundaries.
- Support local browser persistence for topo metadata, imported photo assets, and annotations.
- Keep the web editor usable for mouse/pointer-driven import and annotation workflows.
- Configure Skia and any SQLite/WASM requirements needed by the browser runtime.

**Non-Goals:**

- Browser camera capture.
- PDF export, printing, sharing, or download flows.
- Electron, Tauri, or other desktop packaging.
- Cross-device sync, cloud accounts, or collaborative editing.
- SEO/static rendering optimization beyond what is necessary for this app-like browser experience.

## Decisions

- Treat the first target as an Expo web app, not Electron. Electron can wrap or reuse a working web app later, but starting with browser support keeps the first change focused on runtime compatibility and shared application behavior.
- Keep camera capture mobile-only for the MVP. The existing `react-native-vision-camera` dependency is native-focused, and the web workflow can rely on local photo import without blocking the editor validation.
- Introduce platform-specific capability modules for photo import/storage and export-facing behavior. Native implementations should keep using current Expo modules where appropriate, while web implementations should use browser-safe APIs. This avoids scattering `Platform.OS === 'web'` checks through screen and domain code.
- Prefer keeping the current SQLite repository contract if `expo-sqlite` web can be configured reliably. If SQLite web setup proves too unstable during implementation, replace only the web storage adapter with an IndexedDB-backed implementation that preserves the store/repository-facing behavior.
- Store imported browser photos in durable browser storage rather than depending on object URLs alone. Object URLs are useful for previews during a session, but persisted projects need reload-stable image references.
- Load Skia on web before rendering editor surfaces that import Skia components. React Native Skia web requires CanvasKit assets and asynchronous setup; deferring editor rendering behind a web loader is safer than assuming native-style eager imports will work in the browser.
- Exclude export/print UI paths from the web MVP rather than partially enabling them. Existing mobile export can remain available natively, but web should not promise PDF generation until a separate export design is chosen.

## Risks / Trade-offs

- Skia web setup may add noticeable initial editor load time because CanvasKit is a WASM asset -> show a loading state around editor surfaces and keep the rest of the app navigable.
- `expo-sqlite` web support is documented as alpha and requires headers/WASM configuration -> validate early with a minimal create/list/reload flow and keep the storage adapter boundary ready for IndexedDB fallback.
- Browser storage quotas and eviction differ by browser -> keep MVP expectations local-only and provide graceful errors if photo persistence fails.
- Gesture Handler/Reanimated interactions may feel different with mouse and browser pointer events -> verify essential actions manually on web and add focused tests around editor event behavior where practical.
- Platform-specific modules can drift -> keep shared contracts small and cover both native and web implementations with tests where behavior is not purely platform API glue.
