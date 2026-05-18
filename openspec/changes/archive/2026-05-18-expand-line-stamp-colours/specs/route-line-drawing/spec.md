## ADDED Requirements

### Requirement: Route Line Colour Selection
The route editor SHALL apply selected line colours to new and existing route line annotations using the shared annotation colour palette.

#### Scenario: Create line with selected colour
- **WHEN** a route line tool is active and the user has selected a line colour
- **THEN** the next route line created in the current photo uses that colour

#### Scenario: Create line with default colour
- **WHEN** a route line tool is active and the user has not selected a line colour during the current photo editing session
- **THEN** the next route line created in the current photo uses the Yellow swatch

#### Scenario: Remember line colour during session
- **WHEN** the user selects a line colour for a photo during the editor session
- **THEN** subsequent route lines created on that photo during the same session reuse that colour

#### Scenario: Change selected line colour
- **WHEN** a route line is selected and the user selects a different line colour
- **THEN** the selected route line updates to the chosen colour while preserving its kind and point list

#### Scenario: Persist selected line colour immediately
- **WHEN** a route line is selected and the user selects a different colour swatch
- **THEN** the editor persists the route line colour change immediately

#### Scenario: Persist changed line colour
- **WHEN** a route line colour has been changed and the project is reopened
- **THEN** the route line is restored with the updated annotation colour

### Requirement: Route Line Colour Rendering and Export
The system SHALL render and export route line annotations using their persisted annotation colour.

#### Scenario: Render line colour in editor
- **WHEN** a route line annotation is displayed in the editor
- **THEN** the line is drawn using its annotation colour

#### Scenario: Export line colour
- **WHEN** a topo photo containing route line annotations is exported
- **THEN** each exported route line uses its persisted annotation colour

#### Scenario: No line backdrop effects
- **WHEN** a route line annotation is rendered or exported
- **THEN** the system does not add automatic backdrops, shadows, or contrast effects because of the line colour choice
