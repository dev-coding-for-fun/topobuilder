## 1. Navigation Shell

- [x] 1.1 Introduce an Expo Router bottom-tab layout with Topos and Issues tabs.
- [x] 1.2 Move or wrap the existing crag/topo entry screen so the Topos tab preserves existing user-facing behavior.
- [x] 1.3 Add Issues tab routes for the issue crag list and crag-filtered issue list.
- [x] 1.4 Preserve settings, TABVAR callback, editor, and camera as stack-style flows with the existing header/back behavior where applicable.
- [x] 1.5 Update parent-route navigation helpers and router smoke tests for the tab group and issue routes.

## 2. TABVAR Issue Client

- [x] 2.1 Add typed TABVAR catalog response models for crags, sectors, and routes.
- [x] 2.2 Add typed TABVAR issue and issue attachment response models.
- [x] 2.3 Implement authenticated catalog pull functions for `/api/v1/crags`, `/api/v1/sectors`, and `/api/v1/routes`.
- [x] 2.4 Implement authenticated issue pull with optional `since` cursor for `/api/v1/issues`.
- [x] 2.5 Add client tests for bearer auth, catalog pulls, issue full pull, issue delta pull, API error handling, and deleted issue payloads.

## 3. Local Storage

- [x] 3.1 Add a SQLite migration for TABVAR sync state, sync job state, crags, sectors, routes, issues, and issue attachments.
- [x] 3.2 Add repositories for replacing/upserting TABVAR catalog rows and preserving raw payloads.
- [x] 3.3 Add repositories for upserting issues, handling deleted issues, replacing attachments, and storing issue cursors.
- [x] 3.4 Add query helpers for issue crag summaries and crag-filtered issue lists resolved through cached catalog data.
- [x] 3.5 Add storage tests for catalog sync, issue upsert, inclusive cursor dedupe, deleted issue hiding/removal, attachment replacement, and crag summary counts.

## 4. Sync Orchestration And State

- [x] 4.1 Add an isolated issue store or hooks for TABVAR session state, issue sync state, errors, summaries, and filtered issue queries.
- [x] 4.2 Implement a single-flight sync lock that prevents overlapping initial and manual sync jobs.
- [x] 4.3 Implement the global sync pipeline: refresh catalogs, pull issues with the stored cursor, upsert data, and persist job/cursor state.
- [x] 4.4 Trigger a fire-and-forget initial issue sync after `/tabvar-connect` saves a TABVAR session.
- [x] 4.5 Expose pull-to-refresh state so issue screens disable refresh while any sync is running.
- [x] 4.6 Add store/hook tests for no-session gating, post-connect initial sync startup, sync failure state, single-flight locking, and refresh disabled/enabled transitions.

## 5. Issues UI

- [x] 5.1 Add the Issues crag list screen with the shared header gear icon, connection gate, syncing state, empty state, error state, and pull-to-refresh.
- [x] 5.2 Add issue crag summary cards using catalog crag names, visible issue counts, flagged count when useful, and newest issue update metadata.
- [x] 5.3 Add the crag-filtered issue list screen with pull-to-refresh controlled by the global sync state.
- [x] 5.4 Add issue row UI with route name, sector name, grade when useful, issue type/subtype, status, bolts affected, reporter/date metadata, truncated long text, and attachment indicator/count.
- [x] 5.5 Add a read-only issue detail bottom sheet with untruncated text, route metadata, reporter metadata, status fields, timestamps, and attachment list.
- [x] 5.6 Add an image attachment viewer for issue attachment URLs.
- [x] 5.7 Add component tests for the connection gate, sync-disabled refresh state, crag issue list, issue row truncation, attachment indicator, detail sheet, and attachment viewer.

## 6. Validation

- [x] 6.1 Run targeted client, storage, store, router, and UI tests while developing.
- [x] 6.2 Run `npm test`.
- [x] 6.3 Run `npm run typecheck`.
- [x] 6.4 Fix regressions introduced by route restructuring, sync state, or issue UI changes.
