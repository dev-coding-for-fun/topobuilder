## Context

The non-editor surfaces of the app — the project list and the project detail screen — were built as the thinnest possible scaffolding around the editor. They use developer vocabulary (`Project`, `Photo`), they expose a flat two-level model that doesn't match how routebuilders organize a real crag, and they offer no settings, sync, or export entry points. With no real users and a small data surface, this is the right window to fix all of it together rather than layering features onto bad foundations.

The current schema has three live FK targets (`photo_assets.topo_id`, `routes.topo_id`, `annotations.{topo_id,photo_id,route_id}`) all pointed at `topo_projects`. Migrating that into a Crag → Sector → Topo shape with routes re-parented to topos is a non-trivial transformation; specifically, today's routes attach to the project (crag) and can in principle reference annotations on multiple photos, which would be ambiguous to split. Combined with the absence of real users, a one-time wipe is much cheaper than an audited migration and just as safe.

The app runs on Expo SDK 54 across iOS, Android, and the web (wa-sqlite via OPFS). All persistence flows through `src/storage/database.ts` and a small set of repos. UI is React Native primitives with no design system component library.

## Goals / Non-Goals

**Goals:**
- Replace the current vocabulary with **Crag → Sector → Topo** consistently across UI copy, code symbols, route paths, testIDs, and stored data.
- Ship a redesigned, mobile-first app shell — Crags list, Crag detail, Topo info sheet, Settings — that feels like a native app, not a prototype.
- Make Sector a mandatory mid-level container with an auto-created default named after its parent Crag, so the structure is uniform without forcing the user through extra screens to create their first topo.
- Establish a versioned, forward-only schema migration system using `PRAGMA user_version`, with v1 as the new baseline.
- Wipe all pre-versioned data (rows + photo files) silently on first boot post-update; do not write a structural migration for v0 data.
- Lay out functional placeholders for share/export, sync destinations, and Cloudflare R2 configuration so future work has obvious places to land.
- Keep the editor itself untouched in this change; the editor is reached from the Topo row but its internals do not change.

**Non-Goals:**
- Real share/export rendering (PDF, HTML, PNG generation) — placeholders only.
- Real auth flows for TABVAR, Mountain Project, theCrag — placeholders only.
- Real Cloudflare R2 wiring (no SDK calls, no key validation) — placeholders only.
- Thumbnail generation from photos — visual placeholders only on Topo rows.
- Reordering UI for any entity — explicitly deferred.
- Web-specific layouts at large widths — keep the existing single-column max-width container.
- Project-scoped or topo-scoped settings — Settings is app-wide only.
- Linking routes to specific annotations on the topo image — preserved as today, no model change.

## Decisions

### Decision 1: Vocabulary — Crag, Sector, Topo

**Choice:** Use **Crag** for the top-level container, **Sector** for the mid-level grouping, **Topo** for the leaf (one annotated image). Routes are inline data on a Topo, not a separate screen tier.

**Rationale:** Mirrors what climbers actually say (TABVAR, theCrag, Vertical Life all use Sector for the mid-level). Frees the word "Topo" to mean what climbers mean by it: a single annotated image. Avoids the current double-meaning that confuses the project list page.

**Alternatives considered:**
- *Crag → Wall → Topo*: "Wall" is friendlier but ambiguous when a sector physically contains multiple walls (as at Barrier Bluffs' Cambodian Wall sector). "Sector" is the universal climbing term.
- *Area → Sub-area → Photo*: Mountain Project's vocabulary; correct but generic and developer-tinged.
- *Project → Topo → Route*: Status quo; explicitly the problem we are solving.

### Decision 2: Always three levels, with an auto-created default Sector

**Choice:** Every Crag has at least one Sector. When a Crag is created, a Sector is automatically created with the same name as the Crag. Sector chrome is always rendered in the Crag detail screen, even when there is only one Sector.

**Rationale:** Uniformity matters — a single-shape data model is easier to reason about, simpler to render, and friendlier to a future TABVAR-style sync. The default-named-after-parent pattern means a user creating their first topo never has to learn the word "sector"; they just see a heading that matches their crag name and add topos under it. The cost of always rendering the sector header in single-sector crags is one extra row of visual chrome — acceptable.

**Alternatives considered:**
- Hide sector chrome when the count is 1 and reveal it on the second sector: lower visual noise but creates a UI that grows extra structure invisibly; the user is surprised.
- Allow topos to live directly under a crag with sector being optional: violates the "always 3 levels" constraint and complicates queries, sync, and rendering forever.

### Decision 3: Wipe on v0 → v1, real migrations from v1 onward

**Choice:** Detect `PRAGMA user_version = 0` on boot. If found, drop all tables, delete all photo files in the app's photos directory (native FS or OPFS), recreate the v1 schema, and set `user_version = 1`. From v1 onward, structural changes will write proper migrations; this wipe is a one-time amnesty, not a policy.

**Rationale:** Writing a v0 structural migration would require splitting routes that have annotations on multiple photos, hand-writing a JS-driven re-parent map, and a backup-to-localStorage safety net. All of that is dead weight when there are no real users to protect. The amnesty is honest, sub-second, and unblocks shipping.

**Alternatives considered:**
- Write the structural migration anyway: ~10× more code and edge-case work for ~zero current value.
- Wipe permanently as policy: harms future testers; we don't want it.
- Show a "we reset your storage" notice on first boot: extra UI and copy for a one-time event nobody is around to see.

### Decision 4: One Topo info sheet, opened from the Crag screen, never the editor

**Choice:** A bottom sheet titled "Topo info" lets the user edit a Topo's name, description, and inline list of routes. It is reached by tapping `⋯` on a Topo row in the Crag detail screen. The editor screen has no link into it.

**Rationale:** Tapping a Topo row should go straight to the editor — that's the primary fast path for someone in the field. Metadata editing is a calmer task best done from the list. Keeping the editor free of metadata UI also keeps it focused.

**Alternatives considered:**
- Side drawer in the editor: clutters an already-dense screen; conflicts with editor toolbar real estate; tested poorly in spirit.
- Separate full-screen `/crags/x/topos/y/info` route: heavier than needed when the same content fits a sheet.

### Decision 5: Pattern A — inline route editing

**Choice:** Inside the Topo info sheet, the routes section renders each route as a small form (name, grade picker, route type, bolts, length, FA, description) editable in place. No drill-down to a per-route screen.

**Rationale:** Routebuilders enter routes in batches after a session. A spreadsheet-like inline editor is the right ergonomic shape for that. The cost — visual density — is acceptable inside a dedicated info sheet.

**Alternatives considered:**
- Drill-down (Pattern B): one extra tap per field, lower density. Better for occasional edits, worse for batch entry.

### Decision 6: Share placeholders on Crag, Sector, and Topo

**Choice:** A small share icon (`⤴` or similar) appears on the Crag header, on every Sector header, and on every Topo row. All three open the same placeholder bottom sheet titled "Share — coming soon" with a single line indicating what is being shared and a "Close" button. The actual share/export sheet is designed in a follow-up change.

**Rationale:** Putting the affordance in place now lets us reason about layout, density, and accessibility in this redesign and avoids retrofitting it later. Deferring the *content* of the sheet keeps this change focused.

**Alternatives considered:**
- A single share entry point on the Crag header: forces users to navigate to the crag to share a single topo; mismatched with the future export-scope picker.
- Implement the export/sync UI in this change: would double the scope and is the user's stated preference to defer.

### Decision 7: Settings is a root screen, app-wide only

**Choice:** Settings is a single root route at `/settings`, reached from a gear icon on the Crags list. It contains: Connected Services (TABVAR, MP, theCrag — placeholder rows), Storage & Sync (Cloudflare R2 sub-screen at `/settings/cloudflare-r2`), and App preferences. No project-scoped or topo-scoped settings exist.

**Rationale:** Matches the user's stated belief that no per-project options are needed yet. A single Settings surface is simpler, easier to find, and avoids the "where is this option?" maze.

### Decision 8: Routing — `/projects/...` becomes `/crags/...`

**Choice:** Old paths under `/projects` are deleted. New paths:
- `/` — Crags list (also functions as `/crags`)
- `/crags/[cragId]` — Crag detail
- `/crags/[cragId]/topos/[topoId]/editor` — Editor
- `/crags/[cragId]/topos/[topoId]/camera` — Native camera
- `/crags/[cragId]/topos/[topoId]/export` — Existing native export route (kept until the new share sheet replaces it; renamed only)
- `/settings` — Settings root
- `/settings/cloudflare-r2` — R2 sub-screen

**Rationale:** Keeps URL semantics aligned with the domain vocabulary. No external deep-links exist, so the rename is internal cost only.

### Decision 9: Versioning system mechanics

**Choice:** Use SQLite's built-in `PRAGMA user_version`. Maintain `CURRENT_SCHEMA_VERSION = 1` as a constant in `src/storage/database.ts`. On boot, after opening the connection, read the version. For each known step from `version → version + 1`, run the step inside a transaction. The v0 → v1 step is the wipe-and-recreate. Future steps will be regular migrations.

**Rationale:** `user_version` is a single integer SQLite already maintains; no extra table required. Forward-only stepwise migration is the simplest model that scales to many small versions over time.

**Alternatives considered:**
- A `schema_migrations` table tracking each migration's timestamp: more flexible, more code; not needed at this stage.

### Decision 10: Schema shape (v1)

```sql
CREATE TABLE crags (
  id          TEXT PRIMARY KEY NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE sectors (
  id          TEXT PRIMARY KEY NOT NULL,
  crag_id     TEXT NOT NULL REFERENCES crags(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE topos (
  id            TEXT PRIMARY KEY NOT NULL,
  sector_id     TEXT NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  photo_uri     TEXT,
  photo_width   INTEGER,
  photo_height  INTEGER,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE routes (
  id          TEXT PRIMARY KEY NOT NULL,
  topo_id     TEXT NOT NULL REFERENCES topos(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  grade       TEXT,
  route_type  TEXT,        -- e.g. 'sport', 'trad', 'mixed'
  bolt_count  INTEGER,
  length_m    INTEGER,
  fa          TEXT,        -- first-ascent line
  description TEXT,
  color       TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE annotations (
  id            TEXT PRIMARY KEY NOT NULL,
  topo_id       TEXT NOT NULL REFERENCES topos(id) ON DELETE CASCADE,
  route_id      TEXT REFERENCES routes(id) ON DELETE SET NULL,
  kind          TEXT NOT NULL,
  color         TEXT NOT NULL,
  label         TEXT,
  point_json    TEXT,
  points_json   TEXT,
  metadata_json TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
```

Notes:
- `photo_uri` is on the `topos` table — a Topo *is* the photo plus its annotations. Photos are no longer a separate entity.
- `annotations` no longer has a `photo_id` column; its `topo_id` IS the photo identity.
- All `photo_*` columns on `topos` are nullable so a Topo can exist before a photo is attached (matches the pattern in the new "Add topo" flow where a user might create a Topo and add the image later).
- No `sort_order` columns: reordering is deferred. When added, an integer column per child table is the obvious shape.

### Decision 11: Photo file cleanup on wipe

**Choice:** The v0 → v1 step deletes all files from the app's photos directory. On native, that is the directory used by `addPhotoFromLibrary` / camera capture (typically under `FileSystem.documentDirectory`). On web, where `expo-image-picker` returns blob/object URLs that live in OPFS, the wipe additionally clears any matching OPFS subtree. Cleanup is best-effort; failures log a warning and continue (the DB has already been wiped, references are gone).

**Rationale:** Without cleanup, a wipe leaks every imported photo onto the device forever.

## Risks / Trade-offs

- **[Risk]** Mid-migration crash leaves a partial v1 schema. **Mitigation:** the entire schema-creation step runs inside a single SQLite transaction; either everything commits or nothing does. The PRAGMA user_version write is the last statement before commit, so a crash mid-step leaves user_version at 0 and the next boot retries cleanly.
- **[Risk]** Two browser tabs racing the wipe on web. **Mitigation:** the existing `openWithRetry` lock handling already serializes DB opens; both tabs converge on the same final state because the v0 → v1 step is idempotent (after the first run, `user_version = 1` so the second tab no-ops the migration).
- **[Risk]** Photo file cleanup fails silently and leaks storage. **Mitigation:** logged at warn level; not user-visible. Acceptable for a one-time amnesty in a pre-1.0 app.
- **[Risk]** Vocabulary churn breaks every existing Playwright test. **Mitigation:** testIDs are renamed in the same change as the screens; tests are updated alongside; the editor's internal testIDs are unaffected.
- **[Trade-off]** Always rendering sector chrome adds a row of visual structure to every Crag detail page. Accepted as the cost of uniform structure and predictable navigation.
- **[Trade-off]** Inline route editing (Pattern A) makes the Topo info sheet visually dense. Accepted because the alternative (drill-down) is worse for batch entry, the dominant use case.
- **[Trade-off]** Shipping placeholders for share/export and sync risks users tapping them and being disappointed. Mitigation: the placeholder sheet's title and copy clearly say "coming soon" and dismiss without side effects.
- **[Trade-off]** Auto-named default Sector creates a sector that may feel redundant to power users. They can rename it freely; we never auto-rename it if the parent Crag is later renamed.

## Migration Plan

**Forward (deploy):**
1. App is updated; on next launch `getDatabase()` returns the connection.
2. The migration runner reads `PRAGMA user_version`.
3. If `0`, the v0 → v1 step runs:
   - In a transaction: drop all known old tables (`topo_projects`, `photo_assets`, `routes`, `annotations`), create the v1 tables, set `PRAGMA user_version = 1`, commit.
   - After commit, sweep the photos directory and any matching OPFS files (best-effort).
4. The store initializes with empty data; UI renders the empty Crags list.

**Rollback:** This change is a coordinated UI + schema redesign. Rolling back means redeploying the previous app build; it will see `user_version = 1` and refuse to operate against the new schema. There is no data-preserving rollback — accepted because there is no data to preserve in the wipe path. If a user has created data on v1 and we then ship a build that reverts, they would see a wipe-back-to-v0 only if we explicitly added that step, which we will not.

## Open Questions

- **Q:** The native `/crags/[cragId]/topos/[topoId]/export.tsx` route is preserved (renamed) so the old PDF flow keeps working until the new share sheet replaces it. Should it be feature-flagged to off in this change to avoid two paths to export at once? **Tentative answer:** leave it on for native users; the new share placeholder lives alongside it without conflict.
- **Q:** Do we ship a one-line dev-only console log when the v0 → v1 wipe runs, to confirm the path is taken during development? **Tentative answer:** yes — a single `console.info("[migrations] wiping pre-v1 data")` on the wipe step, no user-facing UI.
- **Q:** Should the placeholder Settings screen persist any of the entered text (R2 keys, profile name) to local secure storage so reloads keep it? **Tentative answer:** no; placeholders are inputs only, not persisted, until the real implementation lands.
