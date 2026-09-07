# app-settings Specification

## Purpose
Define the app-wide settings surfaces and placeholder configuration flows for connected services and Cloudflare R2.

## Requirements

### Requirement: Settings Root Screen
The system SHALL provide an app-wide Settings screen at `/settings`, reached from the Crags list. Settings SHALL be the only options surface in this change; no project-scoped or topo-scoped settings exist.

#### Scenario: Settings is reachable from Crags list
- **WHEN** the user taps the gear affordance on the Crags list screen
- **THEN** the system navigates to `/settings`

#### Scenario: No per-Crag settings link
- **WHEN** the user views a Crag detail screen
- **THEN** no link to a Crag- or Topo-scoped settings screen is shown

### Requirement: Connected Services Section
The Settings screen SHALL display a "Connected Services" section listing TABVAR and Cloudflare R2. Mountain Project and theCrag are omitted. Cloudflare R2 SHALL be displayed as disabled with an under-construction indicator.

#### Scenario: Listing connected services
- **WHEN** the user opens Settings
- **THEN** TABVAR and Cloudflare R2 are visible in Connected Services, while Mountain Project and theCrag are not displayed
- **AND** Cloudflare R2 is disabled and displays an under-construction indicator

#### Scenario: Interacting with Cloudflare R2 row
- **WHEN** the user attempts to tap the Cloudflare R2 row in Settings
- **THEN** no navigation occurs because the row is disabled

#### Scenario: No real network calls are made
- **WHEN** the user interacts with any Connected Services control
- **THEN** the app makes no outbound HTTP request as part of this change

### Requirement: Cloudflare R2 Sub-Screen
The Cloudflare R2 sub-screen at `/settings/cloudflare-r2` SHALL display input controls for: Cloudflare Account ID, Access Key ID, Secret Access Key, Bucket Name, Endpoint. It SHALL also display a "Test connection" action and a "Save" action. None of these controls SHALL perform real R2 calls or persist values in this change.

#### Scenario: Navigating to the R2 sub-screen
- **WHEN** the user opens `/settings/cloudflare-r2`
- **THEN** the system displays the input fields and actions described

#### Scenario: Save action is a no-op placeholder
- **WHEN** the user taps "Save" on the R2 sub-screen
- **THEN** the system shows a brief confirmation, makes no network call, and does not persist the entered values

#### Scenario: Test connection is a no-op placeholder
- **WHEN** the user taps "Test connection" on the R2 sub-screen
- **THEN** the system shows a placeholder result without making any network call

### Requirement: App Preferences Section
The Settings screen SHALL include an "App" section with at minimum the following placeholder rows: Default Units, Theme, About. None of these rows are required to perform any behaviour in this change beyond opening a placeholder leaf screen or no-op confirmation.

#### Scenario: App section is visible
- **WHEN** the user opens Settings
- **THEN** rows for Default Units, Theme, and About are visible
