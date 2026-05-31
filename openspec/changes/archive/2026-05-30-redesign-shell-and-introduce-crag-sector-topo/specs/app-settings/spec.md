## ADDED Requirements

### Requirement: Settings Root Screen
The system SHALL provide an app-wide Settings screen at `/settings`, reached from the Crags list. Settings SHALL be the only options surface in this change; no project-scoped or topo-scoped settings exist.

#### Scenario: Settings is reachable from Crags list
- **WHEN** the user taps the gear affordance on the Crags list screen
- **THEN** the system navigates to `/settings`

#### Scenario: No per-Crag settings link
- **WHEN** the user views a Crag detail screen
- **THEN** no link to a Crag- or Topo-scoped settings screen is shown

### Requirement: Connected Services Section
The Settings screen SHALL display a "Connected Services" section listing TABVAR, Mountain Project, and theCrag, each with a connection-status label and a tap target. Tapping any row SHALL open a placeholder authentication flow that does not perform any network call in this change.

#### Scenario: Listing connected services
- **WHEN** the user opens Settings
- **THEN** rows for TABVAR, Mountain Project, and theCrag are visible, each labelled "Not connected" by default

#### Scenario: Tapping a service opens a placeholder
- **WHEN** the user taps any service row
- **THEN** the system opens a placeholder screen or sheet that explains authentication is not implemented yet, and provides a "Disconnect" stub for symmetry

#### Scenario: No real network calls are made
- **WHEN** the user interacts with any Connected Services control
- **THEN** the app makes no outbound HTTP request as part of this change

### Requirement: Cloudflare R2 Sub-Screen
The Settings screen SHALL include a Cloudflare R2 row that navigates to `/settings/cloudflare-r2`. The sub-screen SHALL display input controls for: Cloudflare Account ID, Access Key ID, Secret Access Key, Bucket Name, Region. It SHALL also display a "Test connection" action and a "Save" action. None of these controls SHALL perform real R2 calls or persist values in this change.

#### Scenario: Navigating to the R2 sub-screen
- **WHEN** the user taps the Cloudflare R2 row in Settings
- **THEN** the system navigates to `/settings/cloudflare-r2` showing the input fields and actions described

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
