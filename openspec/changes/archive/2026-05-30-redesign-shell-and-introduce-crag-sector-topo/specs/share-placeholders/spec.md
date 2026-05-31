## ADDED Requirements

### Requirement: Share Affordance On Three Scopes
The system SHALL render a share affordance (`⤴` icon or equivalent) on the Crag header, every Sector header, and every Topo row in the Crag detail screen.

#### Scenario: Crag share affordance
- **WHEN** the user views a Crag detail screen
- **THEN** a share affordance is visible on the Crag header

#### Scenario: Sector share affordance
- **WHEN** the user views a Sector header on the Crag detail screen
- **THEN** a share affordance is visible on the Sector header

#### Scenario: Topo share affordance
- **WHEN** the user views a Topo row on the Crag detail screen
- **THEN** a share affordance is visible on the Topo row

### Requirement: Share Placeholder Sheet
Tapping any share affordance SHALL open the same placeholder bottom sheet titled "Share — coming soon". The sheet SHALL display a single line of copy identifying the scope being shared (Crag name, Sector name, or Topo name) and a primary "Close" action that dismisses the sheet without side effects.

#### Scenario: Share placeholder shows the scope
- **WHEN** the user taps the share affordance on a Topo row named "Black Hole"
- **THEN** the placeholder sheet displays text identifying "Black Hole" as the scope

#### Scenario: Share placeholder dismisses cleanly
- **WHEN** the user taps "Close" on the share placeholder sheet
- **THEN** the sheet dismisses and no other state changes

#### Scenario: No real share or export occurs
- **WHEN** the user interacts with any control inside the share placeholder sheet
- **THEN** no PDF, HTML, PNG, or any other artifact is generated, and no outbound request is made
