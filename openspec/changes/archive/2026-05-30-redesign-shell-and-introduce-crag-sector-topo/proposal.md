## Why

The screens outside the editor are confusing and feel like a prototype rather than a native app. The word "topo" is overloaded — it currently names both the top-level container ("crag topo") and the individual annotated artifacts inside it. Routebuilders working at real crags think in three levels (Crag → Sector → Routes), and the app's flat two-level model breaks down as soon as a single crag has more than a handful of photos. The shell also lacks a place for the things we know are coming next: settings, sync destinations, and exports.

This change reshapes the app shell, vocabulary, and data model now — while there are no real users — so every feature added afterward fits cleanly. We also introduce a schema-version system so future changes can migrate forward instead of wiping data again.

## What Changes

- **BREAKING**: Rename and restructure the domain. `Project` → `Crag`. `Photo asset` → `Topo` (= one annotated image). New mid-level `Sector` is mandatory; every Crag has at least one. Routes are re-parented from Crag to Topo.
- **BREAKING**: Replace the existing flat schema with a versioned one. On first boot after the update, any DB whose `PRAGMA user_version = 0` is wiped (tables dropped, photo files deleted) and recreated at version 1. Silent. One-time amnesty; from v1 onward we write real migrations.
- **BREAKING**: Route paths change. `/projects/[projectId]` → `/crags/[cragId]`. The editor moves to `/crags/[cragId]/topos/[topoId]/editor`. There are no external deep-links to preserve.
- Redesign the **Crags list** as a mobile-first, native-feeling screen: search, text-only crag cards, FAB for "New crag", improved empty state.
- Redesign the **Crag detail** screen as the workhorse: collapsible sector groups, topo rows with thumbnail placeholders, share-icon (`⤴`) and overflow-menu (`⋯`) affordances on the crag header, every sector header, and every topo row, FAB for "New topo".
- Add a **Topo info** sheet (reached from the Crag screen `⋯` menu, never from the editor) that edits the topo's name, description, and an inline list of routes. Route fields edit in place (Pattern A): name, grade, route type, bolt count, length, FA, description.
- Add a root **Settings** screen (`/settings`) reached from a gear icon on the Crags list. Sections for Connected Services (TABVAR, Mountain Project, theCrag), Storage & Sync (Cloudflare R2 sub-screen), and basic App preferences. All connection / R2 controls are functional placeholders — UI only, no auth or network calls.
- Add **share placeholders**. Tapping `⤴` on a Crag, Sector, or Topo opens a "Share — coming soon" sheet that shows the scope. The real share/export sheet is intentionally deferred.
- Auto-create a default **Sector** named after its parent **Crag** when a Crag is created. Sectors are always shown in the Crag detail (no hide-on-single-sector behaviour).
- Add **basic management** verbs to Crags, Sectors, and Topos: create, rename, delete. **No reordering** in this change.
- Add **placeholder route fields** (`length_m`, `bolt_count`, `fa`, `route_type`, `description`) to the routes table so the inline route editor has somewhere to write. All nullable.
- Establish a **schema-versioning system** using `PRAGMA user_version`, with an explicit migration runner that walks from the current version forward. Set v1 as the new baseline.

Out of scope for this change: real share/export rendering, real TABVAR/MP/theCrag auth, real R2 wiring, thumbnail generation, reordering UI, route ↔ annotation linking changes, web-specific layouts beyond the existing max-width container.

## Capabilities

### New Capabilities
- `crag-management`: Top-level Crag entity, list and detail screens, create/rename/delete, plus the auto-created default Sector and the gear-icon entry into Settings.
- `sector-organization`: Sector entity nested under Crag, sector header rendering inside the Crag detail screen, create/rename/delete sector verbs, sector-scope share placeholder.
- `topo-and-routes`: Topo entity nested under Sector with thumbnail-placeholder rows, the Topo info sheet, inline route editing (Pattern A), placeholder route fields, topo-scope share placeholder.
- `app-settings`: The root Settings screen and its sections — Connected Services placeholders for TABVAR / Mountain Project / theCrag, the Cloudflare R2 sub-screen, and app preferences.
- `share-placeholders`: The share-icon affordance on every Crag, Sector, and Topo, and the placeholder bottom sheet they all open.
- `schema-versioning`: `PRAGMA user_version`-based migration runner, the v0 → v1 wipe-and-recreate amnesty, and the policy that future versions migrate rather than wipe.

### Modified Capabilities
- `web-local-topo-workflow`: Existing capability speaks in the old "project / photo" vocabulary and its happy path (create project, add photo, edit). It needs delta updates so the workflow is described in Crag → Sector → Topo terms and reflects the new screen flow.

## Impact

- **Database (`src/storage/database.ts`)**: New tables (`crags`, `sectors`, `topos`, refreshed `routes`, refreshed `annotations`). New `PRAGMA user_version` handling. New v0 → v1 wipe path including a sweep of the photos directory on native and OPFS-resident files on web. The current idempotent `migrateDatabase` is replaced by a versioned runner.
- **Domain types (`src/domain/types.ts`)**: `TopoProject` removed/renamed to `Crag`. `Sector` and `Topo` added. `Route` gains placeholder fields. `Annotation`'s `photo_id` reference becomes a `topo_id` reference (semantic rename; the FK target table is what changes).
- **State (`src/state/TopoStore.ts`)**: Public surface renamed (`createProject` → `createCrag`, `loadProject` → `loadCrag`, etc.), plus new methods for sectors, topos, and route metadata. Selectors that returned `summaries` of projects now return crag summaries with sector/topo counts.
- **Repositories (`src/storage/repos/*`)**: New repo modules for sectors and topos. Existing project/photo/route repos rewritten to point at the new tables and types.
- **Routing & screens (`app/`)**: New `app/index.tsx` (Crags list), new `app/crags/[cragId].tsx` (Crag detail), new `app/settings/index.tsx` and `app/settings/cloudflare-r2.tsx`. Editor moves to `app/crags/[cragId]/topos/[topoId]/editor.tsx`. Old `app/projects/*` files deleted. Internal `router.push` / `router.replace` / `Link` callsites updated app-wide.
- **UI components (`src/ui/`)**: New components — `CragCard`, `SectorHeader`, `TopoRow` (with thumbnail placeholder slot), `ShareSheetPlaceholder`, `TopoInfoSheet`, `InlineRouteEditor`. Existing `Button`, `Screen`, font helpers reused.
- **E2E and tests**: All Playwright/`testID` selectors using `project-list:*` / `project-detail:*` are renamed to `crags:*` / `crag-detail:*` / `topo-info:*`. Existing editor tests are unaffected by content but their navigation prefix changes.
- **Files on disk**: A new helper for clearing the photos directory (native FS and web OPFS) is added and called only by the v0→v1 migration step.
- **Documentation / SKILLs**: The Playwright skill's example testIDs may want to reference the new prefixes; not required for this change to land.
