## Context

The app currently has a topo/crag workflow backed by Expo Router stack screens, `TopoStore`, and SQLite storage. TABVAR connection already exists through settings and `/tabvar-connect`, with bearer sessions saved locally and guidebook submission using the same API base URL conventions.

Route issue management is a separate workflow. TABVAR now exposes issue sync plus full-pull catalog endpoints for crags, sectors, and routes. The route catalog may be large, so the first sync must begin in the background after connection and must prevent duplicate manual refreshes while running.

## Goals / Non-Goals

**Goals:**

- Add a read-only Issues module for offline browsing of TABVAR route issues.
- Keep issue sync, storage, and UI isolated from topo editing state.
- Resolve issue display through TABVAR catalog data for crag, sector, and route names.
- Add a bottom-tab shell with Topos and Issues while preserving stack flows for settings, TABVAR callback, editor, and camera.
- Start initial issue/catalog sync after TABVAR connection succeeds and expose progress/error state to Issues screens.
- Disable pull-to-refresh while any issue sync is already running.

**Non-Goals:**

- Creating new issues locally.
- Editing issue content or status.
- Uploading issue attachments.
- Mapping TABVAR issue routes to locally authored topo route IDs.
- Adding automatic periodic background refresh beyond the initial post-connect sync and user-initiated pull-to-refresh.

## Decisions

### Use a dedicated issue module and store

Add issue-specific client, storage repositories, sync orchestration, and state under new issue-focused modules rather than expanding `TopoStore`.

Rationale: issue data belongs to TABVAR catalogs and server issue IDs, while topo data belongs to local authoring IDs. Keeping stores separate limits coupling and avoids pulling a large issue catalog into editor state.

Alternative considered: add issue state to `TopoStore`. This would reuse an existing provider but would mix unrelated domain lifecycles and make topo screens depend on TABVAR issue sync state.

### Store TABVAR catalogs separately from issues

Persist TABVAR crags, sectors, routes, issues, issue attachments, and sync state in SQLite tables. Use catalog tables to resolve crag/sector/route display data for issue lists.

Rationale: issues reference numeric `cragId` and `routeId`, while catalog endpoints provide names and route metadata. Separate tables make refresh behavior explicit and leave room for future catalog cursors.

Alternative considered: denormalize all route and crag names onto each issue. This would simplify display queries but would duplicate a large route catalog and make catalog changes harder to reconcile.

### Run initial sync after TABVAR connection

After `/tabvar-connect` saves a session, trigger a fire-and-forget issue sync for crags, sectors, routes, then issues. Persist job state so the Issues tab can show that setup is running or failed.

Rationale: the route catalog can be large. Starting sync only when the user opens Issues would make the first Issues visit feel stalled and would invite repeated pull-to-refresh attempts.

Alternative considered: lazy initial sync on first Issues tab visit. This is simpler but gives worse first-use behavior and does not use the time between connection and Issues navigation.

### Use single-flight sync locking

Issue sync should have one active job at a time. Manual pull-to-refresh must be disabled or ignored while initial or manual sync is running.

Rationale: full catalog pulls are expensive and can race with cursor updates. A single-flight lock keeps local state coherent and makes UI feedback predictable.

Alternative considered: allow overlapping refreshes and rely on upserts. Upserts protect issue rows, but concurrent catalog replacement and cursor writes can still produce confusing progress and waste network/database work.

### Use standard Expo Router tabs

Use Expo Router's standard `Tabs` layout for the Topos and Issues bottom nav, with stack flows retained for settings, callback, editor, and camera.

Rationale: the app already uses Expo Router and Ionicons. Standard tabs are stable in SDK 54 and fit the existing custom stack styling better than unstable native tabs.

Alternative considered: custom tab UI or unstable native tabs. Custom UI adds unnecessary navigation code, and unstable native tabs are not needed for this first module.

### Use the existing bottom sheet pattern for issue details

Show full issue details in the existing modal bottom sheet component, and use a full-screen modal or route for image attachment viewing.

Rationale: the app already uses bottom sheets for contextual details and actions. Issue detail is read-only and benefits from staying anchored to the filtered issue list.

Alternative considered: a dedicated issue detail route. This is more shareable later but adds stack complexity before there are issue actions or deep links.

## Risks / Trade-offs

- Large route catalogs may make initial sync slow -> trigger sync immediately after connection, persist progress state, and disable duplicate refreshes.
- Catalog endpoints are full pulls and do not expose deletion cursors -> replace/upsert catalog data carefully and keep raw JSON for forward compatibility.
- Moving the existing root screen into a tab shell can disrupt route paths or tests -> preserve user-facing paths where practical and add router smoke coverage early.
- Attachment URLs may require auth or may expire -> start with documented URLs, but isolate the viewer so authenticated loading/caching can be added later.
- Sync failures after connection may leave the Issues tab empty -> persist last error and provide a manual refresh once no sync is running.
- Future offline creation will require an outbox, local photo queue, `externalId` mapping, and conflict handling -> keep read-only sync code structured so an outbox can be added without rewriting browsing.
