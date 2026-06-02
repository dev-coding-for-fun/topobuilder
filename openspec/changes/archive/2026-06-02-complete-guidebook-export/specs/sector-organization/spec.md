## ADDED Requirements

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
