# editor-stamp-annotations Specification

## Purpose
Define editor behaviour for stamp annotations, including colour selection, rendering, persistence, and export parity.

## Requirements
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

### Requirement: Stamp Size Adjustment
The editor SHALL provide a contextual three-option control for adjusting the size of all stamp annotations on the current image.

#### Scenario: Show stamp size control while stamp menu is open
- **WHEN** the stamp menu is open
- **THEN** the editor shows a stamp size adjustment control

#### Scenario: Offer three mild size options
- **WHEN** the stamp size adjustment control is shown
- **THEN** it offers Small, Medium, and Large options
- **AND** Medium matches the current stamp size
- **AND** Small is approximately 20% smaller than Medium
- **AND** Large is approximately 20% larger than Medium

#### Scenario: Hide stamp size control outside stamp menu
- **WHEN** the stamp menu is closed
- **THEN** the editor does not show the stamp size adjustment control

#### Scenario: Resize all stamps on current image
- **WHEN** the user changes the stamp size adjustment
- **THEN** every stamp annotation on the current image updates to the chosen size
- **AND** route line annotations and text annotations keep their existing sizes

#### Scenario: Resize stamps from center points
- **WHEN** the user changes the stamp size adjustment
- **THEN** each stamp annotation remains centered on its persisted point while its rendered dimensions change

#### Scenario: Apply chosen size to subsequently created stamps
- **WHEN** the user changes the stamp size adjustment and then creates another stamp on the current image
- **THEN** the new stamp uses the same chosen size as the other stamps on the current image

#### Scenario: Use medium size by default
- **WHEN** no stamp size has been selected for the current image
- **THEN** stamps use the Medium size

#### Scenario: Persist adjusted stamp size
- **WHEN** the stamp size has been changed and the project is reopened
- **THEN** stamps on that image are restored using the adjusted size

### Requirement: Stamp Size Rendering and Export
The system SHALL render and export stamp annotations using the current image's stamp size.

#### Scenario: Render adjusted stamp size in editor
- **WHEN** a stamp annotation is displayed in the editor after the stamp size has been adjusted
- **THEN** the stamp is drawn using the adjusted size

#### Scenario: Export adjusted stamp size
- **WHEN** a topo photo containing stamp annotations is exported after stamp size has been adjusted
- **THEN** each exported stamp uses the adjusted size
