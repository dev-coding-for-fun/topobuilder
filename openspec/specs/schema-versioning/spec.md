# schema-versioning Specification

## Purpose
Define local database schema versioning, the v0 to v1 wipe baseline, and the forward-only migration policy.
## Requirements
### Requirement: Versioned Schema Using PRAGMA user_version
The system SHALL track the persistent schema version using SQLite's built-in `PRAGMA user_version`. The codebase SHALL define a constant `CURRENT_SCHEMA_VERSION` and a forward-only migration runner that, on every boot after opening the database, walks from the stored version up to `CURRENT_SCHEMA_VERSION` by applying one step per integer. The new baseline established by this change is **version 1**.

#### Scenario: Migration runner runs on boot
- **WHEN** the database is opened on app boot
- **THEN** the migration runner reads `PRAGMA user_version` and applies all required steps before any other repository call is allowed to read or write

#### Scenario: No migration needed
- **WHEN** `PRAGMA user_version` already equals `CURRENT_SCHEMA_VERSION`
- **THEN** the migration runner exits immediately without modifying the database

#### Scenario: Each step runs in a transaction
- **WHEN** a migration step from version N to version N+1 runs
- **THEN** all of its statements execute inside a single SQLite transaction and either fully commit (with `PRAGMA user_version = N+1` as the last statement before commit) or fully roll back

### Requirement: V0 -> V1 Wipe Step
The migration step from version `0` to version `1` SHALL drop all known pre-existing tables (`topo_projects`, `photo_assets`, `routes`, `annotations`), create the v1 schema (`crags`, `sectors`, `topos`, `routes`, `annotations`), set `PRAGMA user_version = 1`, commit, and then sweep all photo files from the app's photos directory. This wipe is a one-time amnesty and is NOT a general policy for future versions.

#### Scenario: Pre-existing data is wiped on first boot post-update
- **WHEN** the app boots against a database whose `PRAGMA user_version` is `0`
- **THEN** all old tables are dropped, the v1 schema is created, `PRAGMA user_version` is set to `1`, and the photo directory is swept

#### Scenario: Wipe is idempotent across tabs and retries
- **WHEN** two web tabs simultaneously trigger the v0 -> v1 step
- **THEN** the second tab observes `PRAGMA user_version = 1` after the first finishes and performs no destructive action

#### Scenario: Photo cleanup failure does not block startup
- **WHEN** the photo directory sweep fails for any individual file
- **THEN** the failure is logged at warn level and the app continues to start with the v1 schema in place

### Requirement: Forward-Only Migration Policy From V1
For all schema changes after v1, the system SHALL implement real, data-preserving migration steps. The wipe-and-recreate pattern used for v0 -> v1 SHALL NOT be reused for any later version transition.

#### Scenario: Future migration preserves data
- **WHEN** a future schema change introduces version `N+1` for some `N >= 1`
- **THEN** the corresponding migration step is implemented as a transformation that preserves user data, not a wipe

### Requirement: V1 To V2 Sort Order Migration
The migration step from schema version 1 to schema version 2 SHALL preserve existing user data while adding persistent `sort_order` fields to Crags, Sectors, Topos, and Routes.

#### Scenario: Migration adds sort order columns
- **WHEN** the app boots against a database whose `PRAGMA user_version` is `1`
- **THEN** the migration adds `sort_order` columns for Crags, Sectors, Topos, and Routes and advances `PRAGMA user_version` to `2`

#### Scenario: Migration backfills current Crag order
- **WHEN** existing Crags are migrated to schema version 2
- **THEN** each Crag receives a sort order value based on the app's current Crag display order before the migration

#### Scenario: Migration backfills nested order within parents
- **WHEN** existing Sectors, Topos, and Routes are migrated to schema version 2
- **THEN** each item receives a sort order value based on its current display order within its parent

#### Scenario: Migration preserves existing content
- **WHEN** the v1 to v2 migration completes
- **THEN** existing Crags, Sectors, Topos, Routes, Annotations, and photo references remain present

