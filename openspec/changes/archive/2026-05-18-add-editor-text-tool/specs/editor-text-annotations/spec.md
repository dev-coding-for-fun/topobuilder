## ADDED Requirements

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
