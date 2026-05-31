## ADDED Requirements

### Requirement: Crag Entity
The system SHALL model a top-level container called a **Crag** that owns one or more Sectors. Each Crag has an `id`, a `name`, an optional `description`, and `created_at` / `updated_at` timestamps.

#### Scenario: A Crag exists with at least the required fields
- **WHEN** a Crag is created
- **THEN** the Crag has a non-empty `id`, a non-empty `name`, and `created_at` / `updated_at` timestamps

#### Scenario: A Crag may have an optional description
- **WHEN** a Crag is created without a description
- **THEN** the Crag's `description` is empty/null and the system does not require it for any subsequent operation

### Requirement: Default Sector On Crag Creation
The system SHALL automatically create exactly one Sector inside a newly created Crag, with the same name as the Crag and the same creation timestamps.

#### Scenario: New Crag yields a default Sector
- **WHEN** the user creates a Crag named "Barrier Bluffs"
- **THEN** the system creates a Sector named "Barrier Bluffs" inside that Crag in the same operation

#### Scenario: Default Sector name does not auto-update with Crag rename
- **WHEN** the user later renames the Crag "Barrier Bluffs" to "Barrier"
- **THEN** the existing default Sector retains the name "Barrier Bluffs" and is not renamed automatically

### Requirement: Crags List Screen
The system SHALL provide a Crags list screen as the app's home route (`/`). The screen SHALL render text-only Crag cards (no thumbnails), a search affordance, an entry point to Settings, and a primary action for creating a new Crag.

#### Scenario: Crags list is the home screen
- **WHEN** the user opens the app at the root route
- **THEN** the Crags list screen is displayed

#### Scenario: Crag cards summarise contents
- **WHEN** the Crags list renders a Crag with N Sectors and M Topos
- **THEN** the Crag card shows the Crag name and a count line such as "N sectors · M topos"

#### Scenario: Empty state is friendly
- **WHEN** the user opens the app for the first time and no Crags exist
- **THEN** the Crags list shows an empty state inviting the user to create their first Crag, not a developer-style "no items" notice

#### Scenario: Settings is reachable from the Crags list
- **WHEN** the user is on the Crags list screen
- **THEN** a gear icon (or equivalent affordance) is visible and tapping it navigates to `/settings`

#### Scenario: Creating a new Crag uses a primary action
- **WHEN** the user taps the primary "New crag" action on the Crags list
- **THEN** the system opens a name-entry control and on confirmation creates the Crag and its default Sector and navigates to the Crag detail screen

### Requirement: Crag Detail Screen
The system SHALL provide a Crag detail screen at `/crags/[cragId]` that displays the Crag's header, summary counts, every Sector inside the Crag, and entry points to add a new Topo or new Sector.

#### Scenario: Crag detail shows the Crag name
- **WHEN** the user opens a Crag detail screen
- **THEN** the screen header displays the Crag's name

#### Scenario: Crag detail summary counts
- **WHEN** the user opens a Crag detail screen
- **THEN** a summary line shows the Crag's Sector count and Topo count

#### Scenario: Sector chrome is always shown
- **WHEN** a Crag has exactly one Sector
- **THEN** the Crag detail still renders that Sector's header and groups its Topos under it (no auto-collapse, no hidden chrome)

### Requirement: Crag Lifecycle Operations
The system SHALL allow the user to create, rename, and delete a Crag. Deleting a Crag SHALL cascade-delete all of its Sectors, Topos, Routes, and Annotations and SHALL remove its photo files from device storage.

#### Scenario: Renaming a Crag updates the header
- **WHEN** the user renames a Crag
- **THEN** the new name appears on the Crag detail header and on the Crags list

#### Scenario: Deleting a Crag is confirmed
- **WHEN** the user chooses to delete a Crag
- **THEN** the system asks for explicit confirmation before deleting

#### Scenario: Deleting a Crag cascades
- **WHEN** the user confirms deletion of a Crag containing Sectors, Topos, Routes, and Annotations
- **THEN** all related rows are removed and the photo files for those Topos are deleted from device storage

### Requirement: Crag Header Action Menu
The Crag detail screen SHALL expose an overflow menu (`⋯`) on the Crag header containing at minimum: Rename Crag and Delete Crag.

#### Scenario: Overflow menu is reachable
- **WHEN** the user views a Crag detail screen
- **THEN** an overflow affordance is visible on or beside the Crag header and opens a menu listing Rename and Delete actions
