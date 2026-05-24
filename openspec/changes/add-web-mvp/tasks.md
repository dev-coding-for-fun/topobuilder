## 1. Web Runtime Setup

- [x] 1.1 Add any missing Expo web dependencies and verify `npm run web` starts the Expo web dev server.
- [x] 1.2 Add Metro/web configuration for required WASM and static assets.
- [x] 1.3 Configure React Native Skia web loading so editor routes wait for CanvasKit before rendering Skia components.
- [x] 1.4 Configure SQLite web support and required headers if the current SQLite repository contract remains viable.
- [x] 1.5 Document any required local dev or hosting headers for the browser MVP.

## 2. Platform Boundaries

- [x] 2.1 Split photo capture/import helpers into native and web implementations behind the existing store-facing API.
- [x] 2.2 Split asset storage into native and web implementations that preserve reload-stable photo URIs for each platform.
- [x] 2.3 Keep native PDF export behavior intact while hiding or disabling export/print/share actions on web.
- [x] 2.4 Ensure camera routes/actions on web display the mobile-only guidance instead of importing or executing VisionCamera code.

## 3. Browser Persistence

- [x] 3.1 Validate whether `expo-sqlite` web can run the current migration and repository queries in the app.
- [x] 3.2 If SQLite web is viable, add focused tests or integration coverage for create/list/load behavior on web-compatible storage.
- [x] 3.3 If SQLite web is not viable, implement an IndexedDB-backed web persistence adapter that preserves the store-facing behavior.
- [x] 3.4 Persist imported browser photo data in durable browser storage so photos survive reloads.
- [x] 3.5 Surface a clear error state when browser storage or photo persistence fails.

## 4. Web App Workflow

- [x] 4.1 Verify the project list screen renders in a desktop browser without native runtime errors.
- [x] 4.2 Verify creating a project, navigating to project detail, and returning to the project list works on web.
- [x] 4.3 Verify browser photo import adds an image to the current project and canceling import leaves the project unchanged.
- [x] 4.4 Verify imported photos remain visible after a page reload.
- [x] 4.5 Verify the editor opens imported photos and supports the core add/edit annotation workflow on web.
- [x] 4.6 Verify annotations remain visible and editable after a page reload.

## 5. Responsive and UX Polish

- [x] 5.1 Adjust project and editor screens for desktop browser widths without regressing mobile layouts.
- [x] 5.2 Add web-appropriate loading states for storage initialization and Skia initialization.
- [x] 5.3 Hide web-inapplicable actions or copy so the web MVP does not promise camera capture, export, print, or sharing.

## 6. Verification

- [x] 6.1 Add or update unit tests for platform-specific photo import/storage behavior where practical.
- [x] 6.2 Add or update store/repository tests for web persistence behavior or its selected adapter.
- [x] 6.3 Add focused editor tests for web-safe rendering and core annotation persistence if existing test tooling supports it.
- [x] 6.4 Run typecheck and the relevant Jest test suite.
- [x] 6.5 Manually smoke-test the browser flow: open app, create topo, import photo, annotate, reload, reopen.
