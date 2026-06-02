## ADDED Requirements

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
