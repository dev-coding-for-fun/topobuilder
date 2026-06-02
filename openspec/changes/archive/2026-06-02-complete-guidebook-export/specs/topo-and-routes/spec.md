## ADDED Requirements

### Requirement: Topo Sort Order
The system SHALL store a persistent sort order value for each Topo within its parent Sector and SHALL render Topo lists using that order with stable fallback ordering.

#### Scenario: New Topo receives parent-scoped sort order
- **WHEN** the user creates a Topo inside a Sector
- **THEN** the new Topo receives a sort order value suitable for placing it after existing Topos in that Sector

#### Scenario: Crag detail renders Topos by sort order
- **WHEN** the Crag detail screen renders multiple Topos inside a Sector
- **THEN** the Topos appear by persisted sort order within the Sector

#### Scenario: Sector and Crag exports use Topo sort order
- **WHEN** the user exports a Sector or Crag
- **THEN** each Sector's Topos are listed by persisted sort order

### Requirement: Route Sort Order
The system SHALL store a persistent sort order value for each Route within its parent Topo and SHALL render route lists using that order with stable fallback ordering.

#### Scenario: New Route receives parent-scoped sort order
- **WHEN** the user creates a Route inside a Topo
- **THEN** the new Route receives a sort order value suitable for placing it after existing Routes in that Topo

#### Scenario: Topo info renders Routes by sort order
- **WHEN** the Topo info sheet renders multiple Routes
- **THEN** the Routes appear by persisted sort order within the Topo

#### Scenario: Export route numbers follow Route sort order
- **WHEN** the user exports a Topo, Sector, or Crag
- **THEN** each Topo's exported route numbers follow persisted Route sort order
