## ADDED Requirements

### Requirement: Stamp Colour Selection
The editor SHALL apply selected stamp colours to new and existing stamp annotations using the shared annotation colour palette.

#### Scenario: Create stamp with selected colour
- **WHEN** a stamp tool is active and the user has selected a colour for that stamp kind
- **THEN** the next stamp of that kind created in the current photo uses that colour

#### Scenario: Create stamp with default colour
- **WHEN** a stamp tool is active and the user has not selected a colour for that stamp kind during the current photo editing session
- **THEN** the next stamp of that kind created in the current photo uses the Yellow swatch

#### Scenario: Remember stamp colour by kind
- **WHEN** the user selects a colour for a stamp kind during the editor session
- **THEN** subsequent stamps of that same kind created on the current photo during the same session reuse that colour

#### Scenario: Stamp kind defaults are independent
- **WHEN** the user selects a colour for one stamp kind
- **THEN** subsequent stamps of other stamp kinds keep their own remembered colour or Yellow fallback

#### Scenario: Change selected stamp colour
- **WHEN** a stamp annotation is selected and the user selects a different colour
- **THEN** the selected stamp updates to the chosen colour while preserving its kind, point, label content, and font size fields

#### Scenario: Persist selected stamp colour immediately
- **WHEN** a stamp annotation is selected and the user selects a different colour swatch
- **THEN** the editor persists the stamp colour change immediately

#### Scenario: Persist changed stamp colour
- **WHEN** a stamp colour has been changed and the project is reopened
- **THEN** the stamp is restored with the updated annotation colour

### Requirement: Stamp Colour Rendering and Export
The system SHALL render and export stamp annotations using their persisted annotation colour.

#### Scenario: Render stamp colour in editor
- **WHEN** a stamp annotation is displayed in the editor
- **THEN** the stamp is drawn using its annotation colour

#### Scenario: Export stamp colour
- **WHEN** a topo photo containing stamp annotations is exported
- **THEN** each exported stamp uses its persisted annotation colour

#### Scenario: No stamp backdrop effects
- **WHEN** a stamp annotation is rendered or exported
- **THEN** the system does not add automatic backdrops, shadows, or contrast effects because of the stamp colour choice
