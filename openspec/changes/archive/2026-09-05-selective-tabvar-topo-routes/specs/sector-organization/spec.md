## MODIFIED Requirements

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

### Requirement: Sector Header Rendering
The Crag detail screen SHALL render each Sector with a header displaying its name, topo count, mapped and unmapped route statistics, a collapsible toggle for the sector, an action menu, and a collapsible "Unmapped Routes" section below its Topo Cards.

#### Scenario: Sector header shows name and count
- **WHEN** a Crag detail screen renders a Sector containing N Topos and M routes
- **THEN** the Sector header shows the Sector name, topo count, and route status counts

#### Scenario: Sectors are always visible
- **WHEN** a Crag detail screen renders any number of Sectors
- **THEN** every Sector is displayed as its own section, including when there is only one Sector
