## ADDED Requirements

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
