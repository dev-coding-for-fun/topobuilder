## 1. Database Schema & Migration

- [x] 1.1 Add schema version 6 migration adding `tabvar_crag_id` to `crags`, `tabvar_sector_id` to `sectors`, `app_id` to `tabvar_routes`, and creating `topo_tabvar_routes` table. Verify with database migration unit tests in `src/storage/database.test.ts`.
- [x] 1.2 Assign `app_id` for `tabvar_routes` and update sync logic in `tabvarIssuesRepo.ts` to assign deterministic `app_id` on sync. Verify with sync tests in `src/issues/sync.test.ts`.

## 2. Repositories & Domain Queries

- [x] 2.1 Implement `topoTabvarRoutesRepo` (link, unlink, list, count for topo). Verify with repo unit tests.
- [x] 2.2 Implement `listUnmappedTabvarRoutesForSector` and `countUnmappedTabvarRoutesForSector`. Verify with query unit tests.
- [x] 2.3 Implement optional `tabvarCragId` and `tabvarSectorId` support in `cragsRepo` and `sectorsRepo`. Verify with repository unit tests.

## 3. State & Store Operations

- [x] 3.1 Update `TopoStore` to expose `linkTabvarRoute`, `unlinkTabvarRoute`, `loadTabvarRoutesForTopo`, `loadUnmappedTabvarRoutes`, `countTabvarRoutesForTopo`, and `countUnmappedTabvarRoutes`.
- [x] 3.2 Update `TopoStore` with `countLocalRoutesForTopo` to support differentiated topo deletion warning.

## 4. UI: Crag Detail Screen Redesign

- [x] 4.1 Create `TopoCard` component rendering photo banner, topo metadata, and nested route rows with `[TABVAR]` and `[Local]` badges. Verify component rendering with unit test.
- [x] 4.2 Create `UnmappedRoutesDrawer` component with collapsible toggle, route rows, `+ Add Topo`, and `Link` actions. Verify with component tests.
- [x] 4.3 Update `app/crags/[cragId].tsx` to render sectors as containers with `TopoCard` list and `UnmappedRoutesDrawer`. Verify screen layout with test.

## 5. UI: Import & Linking Modals

- [x] 5.1 Implement connected crag list & adoption directly in the Crags list screen (`app/(tabs)/index.tsx`) to search and adopt TABVAR crags/sectors. Verify with interaction test.
- [x] 5.2 Implement route linking sheets (`link-unmapped-to-topo` and `link-route-to-topo`) in `app/crags/[cragId].tsx` allowing quick route association from Topo Card and unmapped drawer. Verify with interaction test.
- [x] 5.3 Update `ConfirmSheet` / topo deletion dialog to warn about local route destruction while confirming connected route preservation. Verify dialog behavior.

## 6. Verification & End-to-End

- [x] 6.1 Run full typecheck (`npm run typecheck`) and unit tests (`npm test`) to ensure 0 errors.
- [x] 6.2 Validate OpenSpec change and Playwright web smoke tests (`npm run test:web`).
