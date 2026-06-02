## 1. Schema And Domain Model

- [x] 1.1 Review Expo SDK 54 `expo-print` and `expo-sharing` docs before changing export code.
- [x] 1.2 Bump `CURRENT_SCHEMA_VERSION` to 2 and add a v1 -> v2 migration entry.
- [x] 1.3 Add `sort_order` columns to `crags`, `sectors`, `topos`, and `routes` in the v2 migration.
- [x] 1.4 Backfill Crag sort order from the current Crags list order.
- [x] 1.5 Backfill Sector, Topo, and Route sort order from current parent-scoped display order.
- [x] 1.6 Add `sortOrder` to `Crag`, `Sector`, `Topo`, and `Route` domain types and row mappers.
- [x] 1.7 Add guidebook export bundle types for Topo, Sector, and Crag scopes.

## 2. Repository Ordering

- [x] 2.1 Update Crag creation to assign the next Crag sort order.
- [x] 2.2 Update Sector creation to assign the next sort order within the parent Crag.
- [x] 2.3 Update Topo creation to assign the next sort order within the parent Sector.
- [x] 2.4 Update Route creation to assign the next sort order within the parent Topo.
- [x] 2.5 Update Crag, Sector, Topo, and Route list queries to use `sort_order ASC, created_at ASC, id ASC` where sort-order based display is required.
- [x] 2.6 Preserve existing Crags list recency behavior or deliberately switch it to sort order based on the design open question.

## 3. Export Bundle Loading

- [x] 3.1 Add a store/repository loader for Topo export bundles including parent Crag, parent Sector, Topo, Routes, Annotations, and photo metadata.
- [x] 3.2 Add a loader for Sector export bundles including parent Crag, Sector, ordered Topos, Routes, Annotations, and photo metadata.
- [x] 3.3 Add a loader for Crag export bundles including ordered Sectors, Topos, Routes, Annotations, and photo metadata.
- [x] 3.4 Ensure export loaders include empty Sectors, Topos without photos, and Topos without Routes.
- [x] 3.5 Add focused tests for export bundle shape and ordering.

## 4. Guidebook PDF Rendering

- [x] 4.1 Extract HTML escaping and small guidebook formatting helpers for names, descriptions, route metadata, and placeholder copy.
- [x] 4.2 Implement one-column guidebook HTML generation for Topo, Sector, and Crag bundles.
- [x] 4.3 Render each topo photo with saved annotations by reusing `renderTopoRasterBase64`.
- [x] 4.4 Embed rasterized topo images as data URIs in the guidebook HTML.
- [x] 4.5 Number each Topo's route list from ordered Routes, independent of start-marker labels.
- [x] 4.6 Add `exportGuidebookPdf(bundle)` that attempts PDF generation and sharing on every platform and returns or throws clear runtime results.
- [x] 4.7 Keep existing topo-only export behavior only if it is implemented as a compatibility wrapper around the guidebook exporter.

## 5. Share Sheet Integration

- [x] 5.1 Replace topo-only share sheet data loading with scoped guidebook export loading for Crag, Sector, and Topo scopes.
- [x] 5.2 Enable the PDF option for all Crag, Sector, and Topo scopes once the bundle is loaded.
- [x] 5.3 Do not disable PDF export based on `Platform.OS`; let generation or sharing errors surface through the normal export error state.
- [x] 5.4 Surface export loading and generation errors inside the share sheet.
- [x] 5.5 Preserve connected-service placeholder rows and disabled future export formats.

## 6. Tests And Verification

- [x] 6.1 Add database migration tests covering v1 -> v2 sort order columns, backfill ordering, and data preservation.
- [x] 6.2 Add repository tests for next sort order assignment and ordered listing within each parent scope.
- [x] 6.3 Add export renderer tests asserting Topo, Sector, and Crag guidebook HTML includes nested content, route metadata, placeholders, and embedded raster image data.
- [x] 6.4 Add share sheet tests confirming PDF is offered for Topo, Sector, and Crag scopes regardless of platform and that runtime errors are displayed.
- [x] 6.5 Run focused Jest tests for database, repositories, export, and share sheet changes.
- [x] 6.6 Run `npm run typecheck`.
- [ ] 6.7 Smoke test guidebook PDF generation for a Topo, Sector, and Crag with at least one annotated topo image.
