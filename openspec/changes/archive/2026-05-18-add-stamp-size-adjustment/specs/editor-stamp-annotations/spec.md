## ADDED Requirements

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
