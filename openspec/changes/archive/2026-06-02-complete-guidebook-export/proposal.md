## Why

Sharing exists at the Crag, Sector, and Topo levels, but export output is currently limited to a single topo image PDF and does not include the guidebook metadata climbers expect: sectors, topos, routes, descriptions, grades, lengths, bolt counts, and first ascents. This change turns export into a complete, ordered guidebook-style artifact while adding explicit sort order fields now so future reordering can be added without reshaping export contracts.

## What Changes

- Add complete guidebook exports for three scopes: Topo, Sector, and Crag.
- Replace the current topo-only PDF behavior with a scoped export flow that builds a complete export bundle before rendering.
- Render a simple one-column guidebook layout: scope title, descriptions, nested sections in application order, annotated topo images where available, and route lists with route metadata.
- Include all relevant user-facing fields for each scope: names, descriptions, topo photo output, annotations, and route fields (`name`, `grade`, `route_type`, `bolt_count`, `length_m`, `fa`, `description`).
- Preserve empty but relevant content in exports, such as sectors with no topos, topos with no photo, and topos with no routes.
- Add persistent `sort_order` fields so Crags, Sectors, Topos, and Routes can be ordered independently of ids and timestamps.
- Backfill sort order from the app's current display order, then use `sort_order ASC` with stable fallback ordering in list/detail/export queries.
- Keep multiple layouts out of scope for now, but structure export rendering so future layout choices can be added without changing the export bundle shape.

## Capabilities

### New Capabilities

- `guidebook-export`: Complete guidebook-style exports for Topo, Sector, and Crag scopes, including nested content and one-column PDF rendering.

### Modified Capabilities

- `share-placeholders`: Share affordances no longer remain placeholder-only; they expose a real export option for Crag, Sector, and Topo scopes.
- `schema-versioning`: Introduce the next forward-only data-preserving migration to add and backfill sort order columns.
- `crag-management`: Crags gain a persistent sort order field for future list reordering and stable export/list ordering.
- `sector-organization`: Sectors gain persistent sort order within their parent Crag and render/list/export by that order.
- `topo-and-routes`: Topos gain persistent sort order within their parent Sector, Routes gain persistent sort order within their parent Topo, and route lists use that order.

## Impact

- **Database (`src/storage/database.ts`)**: Bump schema version and add a v1 -> v2 migration that adds `sort_order` columns and backfills existing rows without data loss.
- **Domain types (`src/domain/types.ts`)**: Add `sortOrder` to Crag, Sector, Topo, and Route types. Add export bundle types for scoped guidebook rendering.
- **Repositories (`src/storage/repos/*`)**: Populate sort order on create, map sort order fields, and update list queries to order by `sort_order` with stable fallbacks.
- **State (`src/state/TopoStore.tsx`)**: Add scoped export bundle loaders that include nested entities, routes, annotations, and photo metadata needed for rendering.
- **Export (`src/export/pdf.ts` and related helpers)**: Add a guidebook renderer that can export Topo, Sector, or Crag scope using the existing Skia rasterization path for topo images.
- **Share UI (`src/ui/ShareSheet.tsx`)**: Enable PDF export for all three scopes and surface any runtime export or sharing errors in the sheet.
- **Tests**: Add migration, repository ordering, export HTML/PDF generation, and share sheet coverage for all export scopes.
