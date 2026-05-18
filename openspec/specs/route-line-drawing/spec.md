# route-line-drawing Specification

## Purpose
TBD - created by archiving change improve-route-line-drawing. Update Purpose after archive.
## Requirements
### Requirement: Freehand Route Line Drawing
The route editor SHALL allow users to create a route line by dragging one finger while the curved line tool is active.

#### Scenario: Drawing a route line
- **WHEN** the curved line tool is active and the user drags one finger across the topo image
- **THEN** the editor records a draft route line that follows the drag as a sampled polyline

#### Scenario: Saving a drawn route line
- **WHEN** a draft route line contains at least two sampled points and the user saves it
- **THEN** the editor persists it as a path annotation with normalized points

### Requirement: Touch-Spaced Control Points
The route editor SHALL reject redundant polyline points that are too close together for touch editing while preserving the start and end of a drawn stroke.

#### Scenario: Sampling dense touch input
- **WHEN** drag input produces multiple points closer than the minimum touch spacing
- **THEN** the editor keeps only points needed to maintain touch-spaced control handles

#### Scenario: Preserving stroke endpoints
- **WHEN** a user finishes drawing a route line
- **THEN** the first and final stroke positions remain represented in the draft polyline

### Requirement: Select-Mode Route Line Editing
The route editor SHALL allow users to edit saved route line control points from Select mode.

#### Scenario: Selecting a saved route line
- **WHEN** Select mode is active and the user taps near a saved route line
- **THEN** the editor selects the nearest route line and displays its control points

#### Scenario: Dragging a control point
- **WHEN** a saved route line is selected and the user drags one of its control points
- **THEN** the editor updates that point while keeping it separated from neighboring control points

#### Scenario: Persisting control point edits
- **WHEN** the user finishes dragging a selected route line control point
- **THEN** the editor persists the updated point list to the existing annotation

### Requirement: Point-Based Route Lines
The route editor SHALL model route lines as sampled control points and MAY render those points with light visual smoothing.

#### Scenario: Rendering a route line
- **WHEN** a route line is displayed in the editor or exported
- **THEN** it is rendered from its stored points without changing the persisted control point model

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

