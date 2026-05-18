## MODIFIED Requirements

### Requirement: Annotation Colour Palette
The system SHALL provide a curated annotation colour palette that can be reused across supported annotation colour targets, including text annotations, route lines, and stamps.

#### Scenario: Palette contains rock-photo contrast colours
- **WHEN** the annotation colour palette is shown
- **THEN** it includes ten predefined swatches chosen to contrast with common limestone, quartzite, and granite photo backgrounds

#### Scenario: Default text colour
- **WHEN** a text label is created without a previously selected text colour for the current editor session
- **THEN** the label uses the default text colour from the curated palette

#### Scenario: Target-specific defaults
- **WHEN** an annotation target requests its default colour
- **THEN** the system returns the default colour for that target from the shared annotation colour helper

#### Scenario: Default line colour
- **WHEN** a route line is created without a previously selected line colour for the current editor session
- **THEN** the line uses the Yellow swatch from the curated palette

#### Scenario: Default stamp colour
- **WHEN** a stamp is created without a previously selected colour for that stamp kind in the current editor session
- **THEN** the stamp uses the Yellow swatch from the curated palette

### Requirement: Contextual Annotation Colour Control
The editor SHALL show a compact annotation colour control only when colour choice is available for the active tool or selected annotation.

#### Scenario: Text tool is active
- **WHEN** the Text tool is active
- **THEN** the editor shows a compact colour control above the existing tool palette

#### Scenario: Text label is selected
- **WHEN** Select mode is active and a text label is selected
- **THEN** the editor shows a compact colour control above the existing tool palette

#### Scenario: Line tool is active
- **WHEN** a route line tool is active
- **THEN** the editor shows a compact colour control above the existing tool palette

#### Scenario: Route line is selected
- **WHEN** Select mode is active and a route line annotation is selected
- **THEN** the editor shows a compact colour control above the existing tool palette

#### Scenario: Stamp tool is active
- **WHEN** a stamp tool is active
- **THEN** the editor shows a compact colour control above the existing tool palette

#### Scenario: Stamp is selected
- **WHEN** Select mode is active and a stamp annotation is selected
- **THEN** the editor shows a compact colour control above the existing tool palette

#### Scenario: Colour editing is not available
- **WHEN** Select mode is active and no colour-editable annotation is selected
- **THEN** the editor hides the annotation colour control

#### Scenario: Expand colour control
- **WHEN** the user taps the compact colour control
- **THEN** the editor expands it to show the available annotation colour swatches

#### Scenario: Select a swatch
- **WHEN** the user selects an annotation colour swatch
- **THEN** the editor applies that colour immediately to the active colour target and collapses the swatch list

## ADDED Requirements

### Requirement: Independent Annotation Colour Targets
The editor SHALL keep remembered colour defaults isolated by annotation colour target.

#### Scenario: Text colour does not affect line default
- **WHEN** the user changes the current text colour
- **THEN** the current line colour default remains unchanged

#### Scenario: Line colour does not affect text default
- **WHEN** the user changes the current line colour
- **THEN** the current text colour default remains unchanged

#### Scenario: Stamp colour does not affect other targets
- **WHEN** the user changes the current colour for one stamp kind
- **THEN** the current colour defaults for text, lines, and every other stamp kind remain unchanged

#### Scenario: Recolouring existing annotation preserves other defaults
- **WHEN** the user changes the colour of a selected annotation
- **THEN** only that annotation's colour target default is updated and other colour target defaults remain unchanged
