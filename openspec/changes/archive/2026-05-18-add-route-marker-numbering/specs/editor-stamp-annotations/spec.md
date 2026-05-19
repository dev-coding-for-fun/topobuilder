## ADDED Requirements

### Requirement: Route Marker Number Control
The editor SHALL provide a compact route marker number control above the tool palette when the route marker number is editable.

#### Scenario: Show next number control for route marker tool
- **WHEN** the route marker stamp tool is active and no route marker is selected
- **THEN** the editor shows a compact number control for the next route marker number above the tool palette

#### Scenario: Show selected marker number control
- **WHEN** Select mode is active and a route marker stamp is selected
- **THEN** the editor shows a compact number control for the selected route marker above the tool palette

#### Scenario: Hide number control for other stamp tools
- **WHEN** a non-route-marker stamp tool is active and no route marker is selected
- **THEN** the editor does not show the route marker number control

#### Scenario: Hide number control for non-marker selection
- **WHEN** Select mode is active and the selected annotation is not a route marker stamp
- **THEN** the editor does not show the route marker number control

### Requirement: Route Marker Number Values
The editor SHALL support route marker number values of blank or `1` through `99`.

#### Scenario: Default next number on new image
- **WHEN** a photo has no route marker numbers and the user opens it for editing
- **THEN** the next route marker number defaults to `1`

#### Scenario: Decrement one to blank
- **WHEN** the route marker number control value is `1` and the user decrements it
- **THEN** the control value becomes blank

#### Scenario: Increment ninety-nine to blank
- **WHEN** the route marker number control value is `99` and the user increments it
- **THEN** the control value becomes blank

#### Scenario: Increment blank to one
- **WHEN** the route marker number control value is blank and the user increments it
- **THEN** the control value becomes `1`

#### Scenario: Decrement blank to ninety-nine
- **WHEN** the route marker number control value is blank and the user decrements it
- **THEN** the control value becomes `99`

#### Scenario: Type valid number
- **WHEN** the user taps the route marker number and enters a number from `1` through `99`
- **THEN** the editor applies that number to the active next number or selected route marker

#### Scenario: Clear typed number
- **WHEN** the user taps the route marker number and clears the input
- **THEN** the editor applies a blank number to the active next number or selected route marker

#### Scenario: Reject out-of-range typed number
- **WHEN** the user enters a typed value outside blank or `1` through `99`
- **THEN** the editor does not apply that out-of-range value to the route marker number

### Requirement: Route Marker Auto-Increment
The editor SHALL use in-memory session state to choose the next route marker number for new route markers.

#### Scenario: Place marker with next number
- **WHEN** the route marker tool is active and the user places a route marker while the next number is `4`
- **THEN** the editor creates the route marker with label `4`

#### Scenario: Advance to next unused number
- **WHEN** the user places a route marker with number `4` and number `5` is not used by any route marker on the current photo
- **THEN** the next route marker number becomes `5`

#### Scenario: Skip taken number
- **WHEN** the user places a route marker with number `6` and at least one route marker on the current photo already uses number `7`
- **THEN** the next route marker number becomes `8`

#### Scenario: Refill number after edit
- **WHEN** route markers `1`, `2`, and `7` exist on the current photo and the in-memory next number would otherwise continue from `3`
- **THEN** route marker auto-increment offers `3` as the next route marker number

#### Scenario: Blank markers are not taken
- **WHEN** a route marker on the current photo has a blank label
- **THEN** route marker auto-increment does not treat blank as a taken number

#### Scenario: Duplicate numbers are treated as taken
- **WHEN** one or more route markers on the current photo use number `7`
- **THEN** route marker auto-increment treats `7` as taken and does not choose it automatically

#### Scenario: All numbers taken
- **WHEN** every number from `1` through `99` is used by at least one route marker on the current photo
- **THEN** route marker auto-increment sets the next route marker number to blank

#### Scenario: Counter is not persisted
- **WHEN** the user closes and reopens the editor
- **THEN** the next route marker number is derived from existing route marker labels instead of restored from persisted counter state

### Requirement: Route Marker Direct Editing
The editor SHALL allow direct editing of a selected route marker number without enforcing uniqueness or changing the future next number.

#### Scenario: Increment selected marker
- **WHEN** a route marker with number `3` is selected and the user increments the number control
- **THEN** the selected route marker number becomes `4`

#### Scenario: Decrement selected marker
- **WHEN** a route marker with number `3` is selected and the user decrements the number control
- **THEN** the selected route marker number becomes `2`

#### Scenario: Blank selected marker
- **WHEN** a selected route marker number is changed to blank
- **THEN** the selected route marker is saved with a blank label

#### Scenario: Allow duplicate selected marker number
- **WHEN** a selected route marker is changed to a number already used by another route marker on the same photo
- **THEN** the editor saves the selected route marker with that duplicate number

#### Scenario: Editing selected marker does not move next number
- **WHEN** the user changes a selected route marker number
- **THEN** the in-memory next route marker number for future placements is not changed directly by that edit

### Requirement: Route Marker Blank Rendering
The system SHALL render and export blank route markers without number text.

#### Scenario: Render blank marker in editor
- **WHEN** a route marker stamp has a blank label
- **THEN** the editor renders the route marker circle without text inside it

#### Scenario: Export blank marker
- **WHEN** a topo photo containing a blank route marker is exported
- **THEN** the exported route marker is drawn without number text inside it

### Requirement: Compact Contextual Control Labels
The editor SHALL use compact visible labels for contextual colour and size controls above the tool palette.

#### Scenario: Show compact colour label
- **WHEN** the compact annotation colour control is shown
- **THEN** its visible label is `Colour`

#### Scenario: Show compact stamp size label
- **WHEN** the stamp size control is shown
- **THEN** its visible label is `Size`
