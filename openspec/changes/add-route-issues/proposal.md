## Why

Route issue management is becoming a second major workflow alongside topo creation: users need to browse known TABVAR route issues offline while working at a crag, even before local issue creation and submission are added. TABVAR now exposes the issue and topo catalog data needed to build a read-only first slice with real crag, sector, and route context.

## What Changes

- Add a read-only Issues module that syncs TABVAR crag, sector, route, issue, and issue attachment data for offline browsing.
- Add an Issues bottom-tab entry alongside the existing topo/crag workflow, with issue screens isolated from topo editing except for shared app shell and settings access.
- Trigger an initial background TABVAR issue/catalog sync immediately after TABVAR connection succeeds.
- Disable pull-to-refresh while the initial sync is running, then allow manual refresh from issue screens after the initial sync completes.
- Show issue crags with counts, crag-filtered issue lists, full issue details in a bottom sheet, and image attachment viewing.
- Show a not-connected state in the Issues tab that points users to the shared header gear icon for connecting TABVAR in settings.
- Do not add offline issue creation, edits, status changes, or attachment uploads in this change.

## Capabilities

### New Capabilities

- `route-issues`: Syncing and browsing TABVAR route issues, catalog metadata, issue details, and attachments in a dedicated Issues module.

### Modified Capabilities

- None.

## Impact

- App routing changes to introduce a bottom-tab shell for Topos and Issues while preserving existing stack-style settings, TABVAR callback, editor, and camera flows.
- New TABVAR issue/catalog client code using the existing TABVAR session and API base URL conventions.
- New SQLite schema, repositories, and sync state for TABVAR catalogs, issues, attachments, and sync jobs.
- New isolated issue state/hooks for connection state, background initial sync, refresh locking, issue summaries, and filtered issue lists.
- New Issues UI components/screens for crag issue summaries, issue rows, issue detail sheets, and attachment viewing.
- Tests for TABVAR clients, storage behavior, sync locking, navigation smoke coverage, and issue UI rendering.
