# editor-text-annotations Specification

## Purpose
TBD - created by archiving change add-text-colour-controls. Update Purpose after archive.
## Requirements
### Requirement: Annotation Colour Palette
The system SHALL provide a curated annotation colour palette that can be reused across annotation types, with text annotations as the first supported target.

#### Scenario: Palette contains rock-photo contrast colours
- **WHEN** the annotation colour palette is shown
- **THEN** it includes ten predefined swatches chosen to contrast with common limestone, quartzite, and granite photo backgrounds

#### Scenario: Default text colour
- **WHEN** a text label is created without a previously selected text colour for the current editor session
- **THEN** the label uses the default text colour from the curated palette

#### Scenario: Target-specific defaults
- **WHEN** an annotation target requests its default colour
- **THEN** the system returns the default colour for that target from the shared annotation colour helper

### Requirement: Contextual Annotation Colour Control
The editor SHALL show a compact annotation colour control only when colour choice is available for the active tool or selected annotation.

#### Scenario: Text tool is active
- **WHEN** the Text tool is active
- **THEN** the editor shows a compact colour control above the existing tool palette

#### Scenario: Text label is selected
- **WHEN** Select mode is active and a text label is selected
- **THEN** the editor shows a compact colour control above the existing tool palette

#### Scenario: Colour editing is not available
- **WHEN** a non-text tool is active and no text label is selected
- **THEN** the editor hides the annotation colour control

#### Scenario: Expand colour control
- **WHEN** the user taps the compact colour control
- **THEN** the editor expands it to show the available annotation colour swatches

#### Scenario: Select a swatch
- **WHEN** the user selects an annotation colour swatch
- **THEN** the editor applies that colour immediately and collapses the swatch list

### Requirement: Text Colour Application
The editor SHALL apply selected text colours to new and existing text annotations.

#### Scenario: Create text with selected colour
- **WHEN** the Text tool is active and the user has selected a text colour
- **THEN** the next text label created in the current photo uses that colour

#### Scenario: Remember text colour during session
- **WHEN** the user selects a text colour for a photo during the editor session
- **THEN** subsequent text labels created on that photo during the same session reuse that colour

#### Scenario: Change selected text colour
- **WHEN** a text label is selected and the user selects a different text colour
- **THEN** the selected text label updates to the chosen colour while preserving its text content, anchor point, and font size

#### Scenario: Persist selected text colour immediately
- **WHEN** a text label is selected and the user selects a different text colour swatch
- **THEN** the editor persists the text label colour change immediately

#### Scenario: Persist changed text colour
- **WHEN** a text label colour has been changed and the edit is committed
- **THEN** the updated annotation colour is persisted and restored after reopening the project

### Requirement: Isolated Colour and Backdrop Policy
The system SHALL isolate annotation palette, target-specific defaults, colour contrast, and automatic text backdrop decisions in reusable helper code outside editor UI components.

#### Scenario: UI requests palette data
- **WHEN** the colour control renders swatches
- **THEN** it receives palette metadata from the annotation colour helper instead of hardcoding swatches in the component

#### Scenario: Renderer requests backdrop style
- **WHEN** the editor or export renderer needs to draw a text label backdrop
- **THEN** it receives backdrop colour and opacity from the shared backdrop policy helper

#### Scenario: Contrast helper is deterministic
- **WHEN** the backdrop policy receives the same text colour, local background summary, and policy options
- **THEN** it returns the same backdrop decision

### Requirement: Automatic Text Backdrop
The system SHALL render a semi-transparent backdrop behind text annotations when needed to preserve contrast.

#### Scenario: Text has sufficient contrast
- **WHEN** a text label already has sufficient contrast against the local photo background
- **THEN** the system renders the text without a backdrop

#### Scenario: Text has low contrast
- **WHEN** a text label has insufficient contrast against the local photo background
- **THEN** the system renders a padded semi-transparent rectangular backdrop behind the full label bounds

#### Scenario: Choose least visible passing backdrop
- **WHEN** multiple backdrop candidates satisfy the target contrast
- **THEN** the system chooses the candidate with the lowest opacity that satisfies the target contrast

#### Scenario: Choose backdrop colour
- **WHEN** both light and dark backdrop candidates are available
- **THEN** the system chooses the candidate that satisfies the target contrast to the text with the least opacity

#### Scenario: Fallback when background samples are unavailable
- **WHEN** local photo background samples are unavailable
- **THEN** the system uses a deterministic fallback backdrop decision based on the text colour

#### Scenario: Backdrop follows label layout
- **WHEN** a text label contains explicit newline characters or changes font size
- **THEN** the backdrop covers the measured multiline label bounds with padding

#### Scenario: Editing text content
- **WHEN** the native text input overlay is focused for a selected text label
- **THEN** the editor does not draw or update the automatic backdrop until the text edit is committed

### Requirement: Text Colour and Backdrop Export
The system SHALL export text annotation colour and automatic backdrops with substantively equivalent results to the editor view.

#### Scenario: Export text colour
- **WHEN** a topo photo containing text annotations is exported
- **THEN** each exported text annotation uses its persisted annotation colour

#### Scenario: Export automatic backdrop
- **WHEN** a text annotation uses an automatic backdrop in the editor
- **THEN** the exported PDF includes a substantively equivalent semi-transparent backdrop behind that text annotation

### Requirement: Text tool placement
The system SHALL allow users to create point-based text labels from the editor text tool with a single tap on the active photo.

#### Scenario: Create text label by tapping
- **WHEN** the text tool is active and the user taps the photo
- **THEN** the system creates a text annotation anchored at the tapped photo position in normalized image coordinates

### Requirement: Text content editing
The system SHALL allow users to enter and update multiline text content for a selected text annotation.

#### Scenario: Edit newly created text
- **WHEN** a text annotation is created
- **THEN** the system presents an editing control for entering its text content

#### Scenario: Update existing text
- **WHEN** the user selects an existing text annotation and chooses to edit its content
- **THEN** the system saves the updated text content to the annotation

### Requirement: Text selection and locating
The system SHALL allow users to locate and select existing text annotations from Select mode using the rendered label bounds derived from content and font size.

#### Scenario: Select text by tapping rendered label
- **WHEN** Select mode is active and the user taps inside a text annotation's rendered label bounds
- **THEN** the system selects that text annotation and displays its selection affordance

#### Scenario: Prefer nearest text when rendered labels overlap
- **WHEN** Select mode is active and multiple text annotations contain the tapped point within their rendered bounds
- **THEN** the system selects the topmost or nearest matching text annotation deterministically

### Requirement: Text movement and font-size resizing
The system SHALL allow users to move selected text annotations and resize their font size without changing the text content.

#### Scenario: Move selected text
- **WHEN** a text annotation is selected and the user drags inside its rendered bounds
- **THEN** the system updates the annotation anchor point while preserving its text content and font size

#### Scenario: Resize selected text font
- **WHEN** a text annotation is selected and the user drags a resize handle
- **THEN** the system updates one font size for the entire text annotation while preserving its anchor point and text content

### Requirement: Manual line breaks
The system SHALL render text annotations using explicit newline characters as the only line-breaking mechanism.

#### Scenario: Preserve user-entered newlines
- **WHEN** text content contains newline characters
- **THEN** the system renders each newline-delimited segment as a separate line

#### Scenario: Do not automatically wrap long text
- **WHEN** text content contains a long line without newline characters
- **THEN** the system renders the text as one line without inserting automatic wraps

### Requirement: Uniform label font size
The system SHALL render every line in a single text annotation using the same font size.

#### Scenario: Multiline label uses one size
- **WHEN** a text annotation contains multiple lines
- **THEN** the system renders all lines in that annotation with the annotation's current font size

### Requirement: Initial label font size
The system SHALL assign the first text label created on a photo during an editing session a font size approximating standard 12pt text in screen space at the current zoom level.

#### Scenario: First label created while zoomed in
- **WHEN** the user creates the first text label on a photo during the editing session while the photo is zoomed in
- **THEN** the system persists a smaller photo-relative font size than it would at the unzoomed view

#### Scenario: First label created while zoomed out
- **WHEN** the user creates the first text label on a photo during the editing session while the photo is zoomed out
- **THEN** the system persists a larger photo-relative font size than it would at the unzoomed view

### Requirement: Remembered session label font size
The system SHALL reuse the most recently used label font size for subsequent text labels created on the same photo during the same editing session.

#### Scenario: Create subsequent label after first label
- **WHEN** a text label has already been created on the current photo during the editing session
- **THEN** the next text label created on that photo uses the previous label's font size

#### Scenario: Create subsequent label after resizing
- **WHEN** the user resizes a text label and then creates another text label on the same photo during the editing session
- **THEN** the new text label uses the resized font size

### Requirement: Text persistence
The system SHALL persist text annotation content, anchor point, and font size so the annotation can be restored, edited, and exported after reopening the project.

#### Scenario: Reopen project with text annotation
- **WHEN** a project containing a text annotation is reopened
- **THEN** the system restores the annotation text content, normalized anchor point, and font size

### Requirement: Text export parity
The system SHALL export text annotations to PDF using the same content, anchor point, line breaks, and font size as the editor view.

#### Scenario: Export topo with text annotation
- **WHEN** the user exports a topo photo containing text annotations
- **THEN** the PDF includes the text annotations at their corresponding photo positions with matching multiline layout and font size

