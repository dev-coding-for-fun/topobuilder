## ADDED Requirements

### Requirement: TABVAR connection gate
The system SHALL show a route issues screen state for users who have not connected TABVAR.

#### Scenario: User has no TABVAR session
- **WHEN** the user opens the Issues tab without a saved TABVAR session
- **THEN** the system displays a not-connected message and keeps the header gear icon available for opening settings

#### Scenario: User opens settings from Issues
- **WHEN** the user taps the gear icon on the Issues crag list
- **THEN** the system navigates to settings where TABVAR connection can be managed

### Requirement: Initial background issue sync after TABVAR connection
The system SHALL start a background route issue sync after TABVAR connection completes.

#### Scenario: TABVAR connection succeeds
- **WHEN** the TABVAR callback saves a valid session
- **THEN** the system starts an initial background sync for TABVAR crags, sectors, routes, issues, and issue attachments

#### Scenario: Initial sync is running
- **WHEN** the user opens an Issues screen during the initial background sync
- **THEN** the system shows a syncing or preparing state using any locally available issue data

#### Scenario: Initial sync fails
- **WHEN** the initial background sync fails
- **THEN** the system stores the sync error and shows the Issues screen with an error state that allows retry after no sync is running

### Requirement: Single-flight issue sync
The system SHALL prevent overlapping route issue sync jobs.

#### Scenario: Pull-to-refresh during initial sync
- **WHEN** the initial background sync is running
- **THEN** pull-to-refresh is disabled on the issue crag list and crag-filtered issue list

#### Scenario: Manual refresh after initial sync
- **WHEN** the user performs pull-to-refresh after the initial sync has finished
- **THEN** the system runs one global issue sync for catalogs, issues, and attachments

#### Scenario: Refresh requested while manual sync is running
- **WHEN** a manual issue sync is already running
- **THEN** the system does not start another sync job

### Requirement: TABVAR catalog caching
The system SHALL cache TABVAR crag, sector, and route catalog data for offline issue display.

#### Scenario: Catalog sync succeeds
- **WHEN** the system receives crags, sectors, and routes from TABVAR
- **THEN** the system stores catalog records with their server IDs, display names, parent relationships, ordering metadata, route metadata, and raw payloads

#### Scenario: Issue references a route
- **WHEN** an issue references a `routeId`
- **THEN** the system resolves route, sector, and crag display metadata from the cached TABVAR catalog

### Requirement: TABVAR issue caching
The system SHALL cache TABVAR issues and their attachments for offline browsing.

#### Scenario: Full issue pull
- **WHEN** no issue sync cursor is stored
- **THEN** the system pulls TABVAR issues without a `since` parameter and stores the returned `serverTime` cursor

#### Scenario: Delta issue pull
- **WHEN** an issue sync cursor is stored
- **THEN** the system pulls TABVAR issues with the stored cursor as `since` and upserts issues by server issue ID

#### Scenario: Deleted issue received
- **WHEN** TABVAR returns an issue with status `Deleted`
- **THEN** the system removes or hides that issue from normal issue lists

#### Scenario: Issue has attachments
- **WHEN** TABVAR returns attachments for an issue
- **THEN** the system stores attachment ID, issue ID, URL, name, and MIME type for display

### Requirement: Issues bottom navigation
The system SHALL provide bottom navigation between the existing topo workflow and the route issues workflow.

#### Scenario: User opens Topos tab
- **WHEN** the user selects the Topos tab
- **THEN** the system displays the existing crag/topo management workflow

#### Scenario: User opens Issues tab
- **WHEN** the user selects the Issues tab
- **THEN** the system displays the route issues crag list workflow

#### Scenario: User opens immersive editor flow
- **WHEN** the user opens topo editor or camera screens
- **THEN** the system preserves the existing immersive stack behavior for those screens

### Requirement: Issue crag list
The system SHALL list TABVAR crags that have visible route issues.

#### Scenario: Synced crags have issues
- **WHEN** synced issue data contains visible issues grouped by crag
- **THEN** the Issues tab lists those crags with crag names, issue counts, flagged count when useful, and newest issue update metadata

#### Scenario: No visible issues exist
- **WHEN** sync has completed and no visible issues are cached
- **THEN** the system displays an empty state for the Issues tab

#### Scenario: User selects issue crag
- **WHEN** the user selects a crag from the issue crag list
- **THEN** the system opens an issue list filtered to that crag

### Requirement: Crag-filtered issue list
The system SHALL show issues filtered by TABVAR crag.

#### Scenario: Crag issue list opens
- **WHEN** the user opens issues for a crag
- **THEN** the system lists visible issues for that crag with route name, sector name, grade when useful, issue type, subtype, status, bolts affected, reporter/date metadata, and truncated long text

#### Scenario: Issue has attachments
- **WHEN** an issue row represents an issue with attachments
- **THEN** the system shows an attachment indicator or count on that row

#### Scenario: User selects issue
- **WHEN** the user selects an issue row
- **THEN** the system opens a read-only issue detail bottom sheet

### Requirement: Issue detail display
The system SHALL display complete read-only issue details.

#### Scenario: Issue detail opens
- **WHEN** the user opens an issue detail
- **THEN** the system displays untruncated issue description, flagged message, status fields, route metadata, reporter metadata, timestamps, and attachment list

#### Scenario: Issue has image attachment
- **WHEN** the user selects an image attachment from issue details
- **THEN** the system opens an image attachment viewer for that attachment

### Requirement: Read-only issue scope
The system SHALL keep route issue management read-only in this change.

#### Scenario: User views issue screens
- **WHEN** the user browses route issues
- **THEN** the system does not present controls for creating, editing, status-changing, deleting, or uploading attachments for issues
