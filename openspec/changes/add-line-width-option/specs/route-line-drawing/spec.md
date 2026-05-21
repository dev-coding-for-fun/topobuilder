## ADDED Requirements

### Requirement: Route Line Weight Selection
The route editor SHALL provide a contextual three-option control for choosing the weight of new and selected route line annotations.

#### Scenario: Show line weight control while creating a route line
- **WHEN** a route line tool is active
- **THEN** the editor shows a line weight control beside the annotation colour control

#### Scenario: Show line weight control for selected route line
- **WHEN** Select mode is active and a route line annotation is selected
- **THEN** the editor shows a line weight control beside the annotation colour control

#### Scenario: Hide line weight control outside route line context
- **WHEN** no route line tool is active and no route line annotation is selected
- **THEN** the editor does not show the line weight control

#### Scenario: Offer three line weight options
- **WHEN** the line weight control is shown
- **THEN** it offers Small, Medium, and Large options displayed as `S`, `M`, and `L`
- **AND** its visible label is `Weight`
- **AND** Medium matches the route line thickness used before this change

#### Scenario: Create line with selected weight
- **WHEN** a route line tool is active and the user has selected a line weight
- **THEN** the next route line created in the current photo uses that weight

#### Scenario: Create line with default weight
- **WHEN** a route line tool is active and the user has not selected a line weight during the current photo editing session
- **THEN** the next route line created in the current photo uses Medium weight

#### Scenario: Remember line weight during session
- **WHEN** the user selects a line weight for a photo during the editor session
- **THEN** subsequent route lines created on that photo during the same session reuse that weight

#### Scenario: Change selected line weight
- **WHEN** a route line is selected and the user selects a different line weight
- **THEN** the selected route line updates to the chosen weight while preserving its kind, colour, and point list

#### Scenario: Persist selected line weight immediately
- **WHEN** a route line is selected and the user selects a different line weight
- **THEN** the editor persists the route line weight change immediately

#### Scenario: Persist changed line weight
- **WHEN** a route line weight has been changed and the project is reopened
- **THEN** the route line is restored with the updated line weight

### Requirement: Route Line Weight Rendering and Export
The system SHALL render and export route line annotations using their persisted line weight.

#### Scenario: Render default line weight
- **WHEN** a route line annotation has no persisted line weight
- **THEN** the editor renders it using Medium line weight

#### Scenario: Render adjusted line weight in editor
- **WHEN** a route line annotation is displayed in the editor after its line weight has been adjusted
- **THEN** the route line is drawn using the adjusted line weight

#### Scenario: Export adjusted line weight
- **WHEN** a topo photo containing route line annotations is exported after line weights have been adjusted
- **THEN** each exported route line uses its persisted line weight
