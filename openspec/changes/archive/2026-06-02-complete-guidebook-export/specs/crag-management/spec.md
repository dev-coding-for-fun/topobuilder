## ADDED Requirements

### Requirement: Crag Sort Order
The system SHALL store a persistent sort order value for each Crag independent of the Crag id and timestamps.

#### Scenario: New Crag receives sort order
- **WHEN** the user creates a Crag
- **THEN** the new Crag receives a sort order value suitable for placing it after existing Crags in sort-order based lists

#### Scenario: Crag sort order is loaded with Crag data
- **WHEN** the system loads Crag records
- **THEN** each Crag includes its persisted sort order value

#### Scenario: Crag sort order is stable across reloads
- **WHEN** the user closes and reopens the app
- **THEN** Crag sort order values remain unchanged
