# sector-organization Specification

## Purpose
Define Sector-level organization inside Crags, including mandatory Topo parenting and Sector lifecycle behavior.
## Requirements
### Requirement: Sector Entity
The system SHALL model a container called a **Sector** that belongs to exactly one Crag and serves as the parent container for both Topos and Routes in that area. A Sector has an `id`, a `crag_id`, an optional `tabvar_sector_id`, a `name`, an optional `description`, and `created_at` / `updated_at` timestamps.

#### Scenario: Every Sector belongs to a Crag
- **WHEN** a Sector exists
- **THEN** it has a non-null `crag_id` referencing an existing Crag

#### Scenario: A Sector may have zero Topos
- **WHEN** a Sector is created or imported
- **THEN** it is valid to contain zero Topos while containing zero or more unmapped routes

#### Scenario: Sector can link to TABVAR sector
- **WHEN** a Sector is imported from TABVAR
- **THEN** its `tabvar_sector_id` links to the corresponding TABVAR sector record

### Requirement: Mandatory Sector Layer
The system SHALL require that every Topo lives inside a Sector. Topos cannot be attached directly to a Crag.

#### Scenario: Topo creation requires a Sector
- **WHEN** the user creates a Topo
- **THEN** the operation requires a `sector_id` and the resulting Topo's parent is that Sector

### Requirement: Sector Header Rendering
The Crag detail screen SHALL render each Sector with a header displaying its name, topo count, mapped and unmapped route statistics, a collapsible toggle for the sector, an action menu, and a collapsible "Unmapped Routes" section below its Topo Cards.

#### Scenario: Sector header shows name and count
- **WHEN** a Crag detail screen renders a Sector containing N Topos and M routes
- **THEN** the Sector header shows the Sector name, topo count, and route status counts

#### Scenario: Sectors are always visible
- **WHEN** a Crag detail screen renders any number of Sectors
- **THEN** every Sector is displayed as its own section, including when there is only one Sector

### Requirement: Sector Lifecycle Operations
The system SHALL allow the user to create, rename, and delete a Sector. Deleting a Sector SHALL cascade-delete all its Topos, Routes, and Annotations and SHALL remove their photo files from device storage. The user SHALL NOT be able to delete a Crag's last remaining Sector by itself; deletion of the last Sector is only possible by deleting the parent Crag.

#### Scenario: Adding a Sector
- **WHEN** the user taps "Add sector" on the Crag detail screen and provides a name
- **THEN** a new Sector is created inside that Crag and rendered on the screen

#### Scenario: Renaming a Sector
- **WHEN** the user renames a Sector
- **THEN** the Sector header on the Crag detail updates to the new name

#### Scenario: Deleting a non-last Sector
- **WHEN** the user confirms deletion of a Sector and the parent Crag has at least one other Sector
- **THEN** the Sector and all its Topos, Routes, Annotations, and photo files are removed

#### Scenario: Cannot delete the last Sector
- **WHEN** the user attempts to delete the only Sector inside a Crag
- **THEN** the system refuses the operation and explains that the Crag must be deleted instead

### Requirement: Sector Header Action Menu
Each Sector header SHALL expose its own overflow menu (`...`) containing at minimum: Rename Sector and Delete Sector.

#### Scenario: Sector menu is reachable
- **WHEN** the user views a Sector header on a Crag detail screen
- **THEN** an overflow affordance is visible on the Sector header and opens a menu listing Rename and Delete actions

### Requirement: Sector Sort Order
The system SHALL store a persistent sort order value for each Sector within its parent Crag and SHALL render Sector lists using that order with stable fallback ordering.

#### Scenario: New Sector receives parent-scoped sort order
- **WHEN** the user creates a Sector inside a Crag
- **THEN** the new Sector receives a sort order value suitable for placing it after existing Sectors in that Crag

#### Scenario: Crag detail renders Sectors by sort order
- **WHEN** the Crag detail screen renders multiple Sectors
- **THEN** the Sectors appear by persisted sort order within the Crag

#### Scenario: Sector export uses Sector sort order
- **WHEN** the user exports a Crag
- **THEN** the exported guidebook lists Sectors by persisted sort order within the Crag

