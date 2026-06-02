## Context

The app now has the hierarchy needed for guidebook export: Crag -> Sector -> Topo -> Route. The current share/export implementation is narrower: `ShareSheet` can generate a native PDF only for an individual Topo with a photo, and `exportTopoPdf` renders only the annotated topo image.

The Crag detail loader already gathers sectors, topos, and routes, but it does not include annotations. Export needs annotations so each topo image can reuse the existing Skia artifact renderer. Existing list order is implicit (`created_at ASC` in nested lists, `updated_at DESC` for the Crags list), so export currently has no durable ordering field to preserve user intent once reordering exists.

Expo SDK 54 `expo-print` supports printing HTML to a PDF file across supported Expo platforms. This change should attempt the same PDF export path everywhere and surface any runtime generation or sharing errors to the user rather than pre-disabling PDF export based on platform assumptions.

## Goals / Non-Goals

**Goals:**

- Export complete Topo, Sector, and Crag scopes in a simple one-column guidebook format.
- Include every relevant persisted user-facing field in the export, including nested routes and topo images with saved annotations.
- Preserve the app's display order in export output.
- Add persistent sort order fields now so future drag/drop or menu-based reordering can reuse the same data model.
- Reuse the existing Skia artifact renderer for annotated topo images instead of introducing a second annotation rendering path.
- Keep the export data bundle independent from layout selection so future guidebook layouts can be added without changing repository contracts.

**Non-Goals:**

- No reordering UI.
- No multiple export layouts.
- No alternate HTML or PNG export formats.
- No external service publishing.
- No route marker to route-list synchronization.
- No change to annotation draw ordering.

## Decisions

### Decision: Introduce scoped guidebook export bundles

Add a domain-level export bundle shape that represents one of three scopes: Topo, Sector, or Crag. The bundle should contain enough data to render without further repository calls: parent context, sectors, topos, routes, annotations, and photo metadata.

Alternative considered: have the PDF renderer fetch data as it renders. That would make rendering harder to test and would mix persistence concerns into the export layer. A bundle boundary keeps data loading and layout rendering separate.

### Decision: Keep one canonical nested export shape

Even a Topo export should use the same nested shape as larger exports, with one Crag context, one Sector context, and one Topo entry. Sector and Crag exports then become larger instances of the same structure.

Alternative considered: define separate renderer input types for each scope. That would be slightly smaller up front, but it would duplicate route/topo rendering logic and make future layout choices branch on scope more often than necessary.

### Decision: Render guidebook PDFs from HTML plus rasterized topo images

The guidebook renderer should build a complete HTML document and pass it to `Print.printToFileAsync`. Each topo with a photo should be rasterized through `renderTopoRasterBase64`, embedded as a data URI, and displayed in the guidebook content. This preserves iOS local-image compatibility and reuses the current Skia artifact path.

Alternative considered: create a fully native PDF renderer. That would avoid HTML/CSS print quirks, but the app already uses `expo-print`, and HTML is enough for the first simple one-column guidebook layout.

### Decision: Keep route numbering based on route order

The numbered route list in exports should derive from `routes.sortOrder`, not from start-marker labels. Start-marker labels remain visual annotations on the topo image. The route list order is the source of truth for guidebook list numbering until a later route-marker synchronization feature exists.

Alternative considered: infer route order from start marker labels. That would break when markers are missing, duplicated, intentionally blank, or not linked to route rows.

### Decision: Preserve empty content in exports

Exports should include empty but relevant containers: sectors with no topos, topos with no photo, and topos with no routes. The renderer can use compact placeholder copy for those cases.

Alternative considered: omit empty content to make PDFs shorter. That would make exports feel incomplete and could hide intentional structure, especially for newly planned crags.

### Decision: Add `sort_order` to Crags, Sectors, Topos, and Routes

Add integer sort order columns and TypeScript `sortOrder` fields for all user-listable entities. Create operations should assign `max(sort_order) + 1` within the appropriate parent scope. Query order should be `sort_order ASC, created_at ASC, id ASC` for stable results.

Crags are parentless, but giving them `sort_order` now keeps the model consistent and supports future Crags-list reordering. The existing Crags list may continue to emphasize recent updates only if the product deliberately keeps that behavior; guidebook-relevant nested ordering should use sort order immediately.

Alternative considered: add sort order only to Sectors, Topos, and Routes. That matches the immediate nested export need, but it creates an exception for Crags and postpones a predictable schema change.

### Decision: Backfill sort order from current display order

The v1 -> v2 migration should preserve existing user-visible order by assigning sort orders according to the current queries: Crags by their current list order, Sectors by `created_at ASC` within a Crag, Topos by `created_at ASC` within a Sector, and Routes by `created_at ASC` within a Topo.

Alternative considered: set all existing rows to zero and rely on fallback ordering. That would technically work, but it would not establish useful values for future reordering and would make exports depend on fallback behavior.

### Decision: Do not add annotation sort order

Annotation draw order is already semantic: paths first, markers second, labels last. Guidebook export should continue using the existing render scene ordering and should not introduce a user-facing annotation ordering field in this change.

Alternative considered: add `sort_order` to annotations for completeness. That would imply future user-visible annotation layering controls, which is a separate editor feature and not required for guidebook exports.

## Risks / Trade-offs

- Large Crag exports may rasterize many topo images and use significant memory -> Render topo images sequentially and keep the first layout simple, with a practical target raster width.
- HTML-to-PDF layout may vary slightly by platform -> Keep CSS conservative, one-column, and avoid complex pagination rules.
- PDF generation or sharing may fail differently across platforms -> Attempt the same export path everywhere and surface failures clearly in the share sheet.
- Sort order backfill can be wrong if timestamps collide -> Use `id ASC` as a stable final tiebreaker.
- Adding Crag sort order may not immediately affect the existing recency-oriented Crags list -> Treat list sort behavior as a product decision, but persist the field now for future reordering.

## Migration Plan

1. Bump `CURRENT_SCHEMA_VERSION` from 1 to 2.
2. Add a forward-only v1 -> v2 migration that adds `sort_order` columns to `crags`, `sectors`, `topos`, and `routes`.
3. Backfill each table's `sort_order` from the current display order, scoped by parent where applicable.
4. Update repositories and domain mappers so all new rows receive an explicit sort order.
5. Switch nested list/export queries to sort-order-first ordering with stable fallbacks.
6. Add export bundle loaders, guidebook HTML rendering, and scoped PDF entry points.
7. Rollback strategy during development is to revert the code change and reset local dev data; after release, a later migration would be required because schema versions only move forward.

## Open Questions

- Should the Crags list immediately use `sort_order`, or should it keep `updated_at DESC` until explicit Crag reordering exists?
- Should the first guidebook PDF include created/updated timestamps, or are those internal metadata fields intentionally excluded from the human-facing guidebook?
