# tabvar-route-import Specification

## Purpose

Define searching, selecting, and selectively importing TABVAR crags, sectors, and routes into the local Topo workspace, with unmapped route tracking and topo linking affordances.

## Requirements

### Requirement: Selective Crag and Sector Adoption from TABVAR
The system SHALL allow users to browse and search the local synchronized TABVAR catalog to selectively adopt a Crag and its Sectors into their local Topo workspace without importing unselected crags.

#### Scenario: Search and import TABVAR crag
- **WHEN** the user searches for a crag name in the TABVAR catalog list and selects a crag
- **THEN** the system creates a workspace Crag with `tabvar_crag_id` set to the selected TABVAR crag ID and prompts or imports its Sectors with `tabvar_sector_id` set

#### Scenario: Crags list does not auto-populate unimported TABVAR crags
- **WHEN** TABVAR catalog synchronization runs in the background
- **THEN** only crags explicitly adopted by the user are visible in the Topos tab

### Requirement: Universal App-Level Identifier for TABVAR Routes
The system SHALL maintain a universal text-based application identifier (`app_id`) on every record in `tabvar_routes` in addition to its canonical TABVAR numeric `id`.

#### Scenario: TABVAR route has both source ID and app ID
- **WHEN** a route is stored or synced into `tabvar_routes`
- **THEN** it possesses both its source numeric `id` and a unique non-null `app_id` string

### Requirement: Sector-Level Unmapped Routes Tracking
The system SHALL determine unmapped TABVAR routes for any sector associated with a TABVAR sector by querying routes belonging to that TABVAR sector that are not referenced by any Topo in the workspace sector.

#### Scenario: Displaying unmapped routes in sector
- **WHEN** a sector has associated TABVAR routes that are not linked to any of its topos
- **THEN** those routes are listed in a collapsible "Unmapped Routes" drawer within that sector

#### Scenario: Empty unmapped routes drawer
- **WHEN** all TABVAR routes for a sector are linked to at least one Topo in that sector
- **THEN** the unmapped routes drawer displays that all routes are mapped or remains hidden

### Requirement: Quick Topo Creation from Unmapped Route
The system SHALL provide a "+ Add Topo" affordance directly on each unmapped route row that prompts the user for a photo and creates a new Topo in that sector with the route pre-linked.

#### Scenario: Creating a topo directly from an unmapped route
- **WHEN** the user taps "+ Add Topo" on an unmapped route row and provides a photo
- **THEN** a new Topo is created in that sector, the route's `app_id` is linked to the topo, and the editor opens for that Topo

### Requirement: Linking Unmapped Route to Existing Topo
The system SHALL provide a link affordance on each unmapped route row allowing the user to select an existing Topo in that sector to associate the route with.

#### Scenario: Linking route to existing topo
- **WHEN** the user chooses an existing Topo for an unmapped route
- **THEN** the route is linked to that Topo in `topo_tabvar_routes` and vanishes from the sector's unmapped routes drawer
