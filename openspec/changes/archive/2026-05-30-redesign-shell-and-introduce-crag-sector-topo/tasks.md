## 1. Schema Versioning Foundation

- [x] 1.1 Add `CURRENT_SCHEMA_VERSION = 1` constant to `src/storage/database.ts` and a typed `migrations: Array<{ from: number; to: number; run: (db) => Promise<void> }>` registry
- [x] 1.2 Implement `runMigrations(db)` that reads `PRAGMA user_version`, then for each step from current → `CURRENT_SCHEMA_VERSION` runs the registered step inside `db.withTransactionAsync`, ending each step by writing `PRAGMA user_version = N+1`
- [x] 1.3 Replace the existing idempotent `migrateDatabase` call site so that the store waits on `runMigrations` before any repo work
- [x] 1.4 Add a one-line `console.info("[migrations] wiping pre-v1 data")` inside the v0 → v1 step (dev visibility only; no user UI)

## 2. V0 → V1 Wipe Step

- [x] 2.1 Implement the v0 → v1 step body: `DROP TABLE IF EXISTS annotations; routes; photo_assets; topo_projects;` then create the v1 schema (`crags`, `sectors`, `topos`, `routes`, `annotations`) per `design.md` Decision 10
- [x] 2.2 Add a `clearPhotosDirectory()` helper covering native (`expo-file-system` recursive delete under the photos subdirectory) and web (best-effort OPFS sweep of any matching subtree); log per-file failures at warn level and continue
- [x] 2.3 Call `clearPhotosDirectory()` from the v0 → v1 step *after* the SQL transaction commits (never inside the txn)
- [x] 2.4 Verify idempotency by booting twice in a row on a fresh dev DB — covered by `src/storage/database.test.ts` asserting v1 no-op behavior and concurrent invocation coalescing

## 3. Domain Types And Repos

- [x] 3.1 Replace `src/domain/types.ts` exports: remove `TopoProject` / `PhotoAsset` types from domain, add `Crag`, `Sector`, `Topo`, refresh `Route` with placeholder fields, refresh `Annotation` to use `topoId`. (`PhotoAsset` / `TopoProject` retained as legacy structural shapes for the rendering/PDF layer per design Decision 11.)
- [x] 3.2 Create `src/storage/repos/cragsRepo.ts` with `list`, `get`, `create` (auto-creates default Sector with same name), `rename`, `delete` (cascade tested), `summariesWithCounts`
- [x] 3.3 Create `src/storage/repos/sectorsRepo.ts` with `listForCrag`, `get`, `create`, `rename`, `delete` (refuses delete of last Sector)
- [x] 3.4 Create `src/storage/repos/toposRepo.ts` with `listForSector`, `listForCrag`, `get`, `create`, `rename`, `updateDescription`, `attachPhoto`, `delete` (cascade + photo file removal)
- [x] 3.5 Update `src/storage/repos/routesRepo.ts` to scope by `topo_id`; add CRUD for the placeholder route fields
- [x] 3.6 Update `src/storage/repos/annotationsRepo.ts` to read/write the renamed `topo_id` column (no `photo_id` column anymore)

## 4. State Layer (TopoStore)

- [x] 4.1 Rename store actions: `createProject` → `createCrag`, `loadProject` → `loadCragDetail`, etc.; expose new actions for sectors, topos, and route metadata edits
- [x] 4.2 Replace `summaries` selector with `cragSummaries` returning `{ id, name, sectorCount, topoCount, updatedAt }`
- [x] 4.3 Add a `loadCragDetail(cragId)` action that returns the Crag with its Sectors and each Sector's Topos pre-grouped, in a single fetch
- [x] 4.4 Add `loadTopoInfo(topoId)` returning Topo + its Routes for the Topo info sheet

## 5. Routing And File Moves

- [x] 5.1 Delete `app/projects/[projectId].tsx`, `app/projects/[projectId]/editor.tsx`, `app/projects/[projectId]/camera.*`, `app/projects/[projectId]/export.*`
- [x] 5.2 Create `app/index.tsx` (Crags list — replaces existing) and `app/crags/[cragId].tsx` (Crag detail)
- [x] 5.3 Move the editor to `app/crags/[cragId]/topos/[topoId]/editor.tsx`; update its data loading to fetch by `topoId` (the editor's drawing logic is unchanged)
- [x] 5.4 Move camera and export routes to `app/crags/[cragId]/topos/[topoId]/camera.*` and `.../export.*` (rename only, behaviour unchanged)
- [x] 5.5 Update every `router.push` / `router.replace` / `<Link>` / `<Redirect>` in the codebase to the new paths (only test files now reference `/projects/`; covered by §11)
- [x] 5.6 Remove the stray `app\projects\[projectId]\editor.tsx` (Windows-cased path duplicate visible in git status)

## 6. UI Components — Crags List

- [x] 6.1 Implement `CragCard` with text-only layout: name, "N sectors · M topos" line, optional updated-time line, share affordance, overflow affordance
- [x] 6.2 Implement the Crags list screen: search input, list of `CragCard`s, gear icon → `/settings`, FAB-style "New crag" primary action that opens a name-entry sheet
- [x] 6.3 Implement an inviting empty state ("No crags yet" + onboarding copy) that replaces the developer-style copy
- [x] 6.4 Wire create flow: name → `cragsRepo.create` (auto-creates default Sector) → `router.push('/crags/' + id)`

## 7. UI Components — Crag Detail

- [x] 7.1 Implement `SectorHeader` with sector name, "N topos" count, share affordance, overflow affordance
- [x] 7.2 Implement `TopoRow` with thumbnail-placeholder slot, Topo name, summary line, share affordance, overflow affordance; tapping the row body navigates to the editor
- [x] 7.3 Implement the Crag detail screen scaffold: header + counts + share + overflow, every Sector rendered with its `TopoRow`s, "+ Add topo" inside each Sector group, "+ Add sector" at the bottom, FAB "New topo" that prompts for sector when count > 1
- [x] 7.4 Implement Crag overflow menu: Rename Crag (sheet), Delete Crag (confirm)
- [x] 7.5 Implement Sector overflow menu: Rename Sector (sheet), Delete Sector (confirm + last-sector-refusal at repo level)
- [x] 7.6 Implement Topo overflow menu: Edit Topo info (opens info sheet), Rename Topo (sheet), Delete Topo (confirm)

## 8. UI Components — Topo Info Sheet And Inline Route Editor

- [x] 8.1 Implement `TopoInfoSheet` (bottom sheet) with editable Name and Description fields and a Routes section
- [x] 8.2 Implement `InlineRouteEditor` rendering each Route as a row of inline inputs (name, grade, route type chips, bolts, length, FA, description)
- [x] 8.3 Implement "Add route" — inserts a blank Route row immediately editable
- [x] 8.4 Implement per-row "Delete route" — annotations' `route_id` is set to NULL via `ON DELETE SET NULL` and the Route is removed
- [x] 8.5 Confirm the editor screen has zero entry points to the Topo info sheet — only Crag detail's overflow menu opens it

## 9. Share Placeholders

- [x] 9.1 Implement `ShareSheetPlaceholder` bottom sheet with title "Share — coming soon", a single line stating the scope, and a Close button
- [x] 9.2 Wire the Crag header share affordance to open `ShareSheetPlaceholder` with the Crag scope
- [x] 9.3 Wire each Sector header share affordance to open `ShareSheetPlaceholder` with the Sector scope
- [x] 9.4 Wire each Topo row share affordance to open `ShareSheetPlaceholder` with the Topo scope
- [x] 9.5 Verify no share affordance triggers any network call or file write — placeholder is pure UI

## 10. Settings

- [x] 10.1 Create `app/settings/index.tsx` with sections: Connected Services (TABVAR / Mountain Project / theCrag rows, all "Not connected"), plus Cloudflare R2 row, App preferences placeholders, About
- [x] 10.2 Connected Services rows are disabled placeholders — no network calls; auth flow deferred
- [x] 10.3 Create `app/settings/cloudflare-r2.tsx` with input fields (Account ID, Access Key ID, Secret Access Key, Bucket Name, Endpoint) and disabled Test connection / Save buttons; no network or persistence
- [x] 10.4 Wire the gear icon on the Crags list to navigate to `/settings`

## 11. Testing And Selectors

- [x] 11.1 Update existing tests (`AnnotationShapes.test.tsx`, `TopoCanvas.test.tsx`, `EditorScreen.test.tsx`, `pdf.test.ts`, `routeMarkerNumbers.test.ts`, `scene.test.ts`) to drop `photoId` from annotation fixtures, re-point `EditorScreen.test.tsx` import + params to the new editor path, and adapt the `useTopoStore` mock to expose `loadTopoEditor` returning a `TopoEditorBundle` (with a `bundleFromProject` adapter for the existing fixtures). All 106 unit/integration tests pass.
- [x] 11.2 Add an e2e test covering the happy path: create Crag → default Sector visible → add Topo → tap row → editor loads
- [x] 11.3 Add an e2e test for Topo info sheet: open from Crag detail overflow → edit name + add a route inline → close sheet → values persisted on Crag detail and on reload
- [x] 11.4 Add an e2e test for share placeholders: tap on each of Crag/Sector/Topo opens the placeholder sheet with the correct scope text and dismisses cleanly
- [x] 11.5 Add an e2e test for Settings navigation: gear → Settings → Cloudflare R2 sub-screen renders inputs and buttons
- [x] 11.6 Add a node/integration test for `runMigrations` covering: starting at v0 wipes and reaches v1; starting at v1 is a no-op; concurrent invocations are safe

## 12. Cleanup

- [x] 12.1 Search for and remove any remaining references to `TopoProject`, `photo_assets`, `photoId` in code and comments. Remaining hits are intentional: v0 wipe SQL/spec text for `photo_assets`, and legacy structural `PhotoAsset` / `TopoProject` renderer/PDF types per Decision 11.
- [x] 12.2 Remove the old `migrateDatabase` if no longer referenced
- [x] 12.3 Run `npm run web` smoke pass: Crags list → create "Test crag" → see default Sector → add Topo → open editor → return to Crag detail → open Topo info sheet → add a route inline → save → reload → state persists. Photo import is not included because the redesigned shell currently exposes no web photo-import affordance.
- [x] 12.4 Update the Playwright SKILL example testIDs in `.claude/skills/playwright-selectors/SKILL.md` to reference the new prefixes (optional polish)
