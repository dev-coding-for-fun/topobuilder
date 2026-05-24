## Why

TopoBuilder is currently mobile-focused even though much of its Expo Router and React Native UI structure can run on the web. A browser MVP lets users import an existing rock face photo, mark it up on a larger screen, and keep their local work across reloads without taking on Electron packaging or export/print behavior yet.

## What Changes

- Add support for launching the app as an Expo web app.
- Support the core browser workflow: create a topo, import a photo from the local browser file picker, edit annotations, leave/reload the page, and return to the saved local project.
- Configure web-specific runtime requirements for dependencies that need them, including Skia web assets/loading and SQLite web/WASM setup if SQLite remains the metadata store.
- Introduce platform-specific boundaries for native-only or browser-specific capabilities such as photo asset storage and camera capture.
- Keep camera capture mobile-only for this MVP; web users import photos instead.
- Leave PDF export, printing, sharing, Electron packaging, and cross-device sync out of scope for this change.

## Capabilities

### New Capabilities

- `web-local-topo-workflow`: Browser users can create, import, edit, and reopen local topo projects using web-compatible storage and rendering.

### Modified Capabilities

None.

## Impact

- Affects Expo web configuration, Metro configuration, app routing/runtime startup, Skia web loading, local storage, photo import, editor rendering/interaction on web, and tests.
- May add web-only dependencies or configuration for WASM/assets and browser persistence.
- Does not change mobile behavior except through shared abstractions that must preserve the existing native project/photo/editor flows.
