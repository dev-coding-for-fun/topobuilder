## ADDED Requirements

### Requirement: Selected Object Delete Control
The editor SHALL remove the top-bar checkmark/save button and show a delete button in that top-bar position when an annotation object is selected.

#### Scenario: Text label is selected
- **WHEN** Select mode is active and a text label is selected
- **THEN** the editor shows a delete button in the top-bar slot formerly used by the checkmark

#### Scenario: Stamp is selected
- **WHEN** Select mode is active and a stamp is selected
- **THEN** the editor shows a delete button in the top-bar slot formerly used by the checkmark

#### Scenario: Route line is selected
- **WHEN** Select mode is active and a route line is selected
- **THEN** the editor shows a delete button in the top-bar slot formerly used by the checkmark

#### Scenario: No object is selected
- **WHEN** no annotation object is selected
- **THEN** the editor does not show a checkmark/save button or delete button in that contextual top-bar slot

#### Scenario: Editor state is auto-saved
- **WHEN** the editor top bar is shown
- **THEN** the editor does not show a checkmark/save button

### Requirement: Selected Object Deletion
The editor SHALL delete only the selected annotation object after the user activates the delete button.

#### Scenario: Delete selected text label
- **WHEN** a text label is selected and the user presses the delete button
- **THEN** the editor removes that text label from the current photo and clears label selection state

#### Scenario: Delete selected stamp
- **WHEN** a stamp is selected and the user presses the delete button
- **THEN** the editor removes that stamp from the current photo and clears stamp selection state

#### Scenario: Delete selected route line
- **WHEN** a route line is selected and the user presses the delete button
- **THEN** the editor removes that route line from the current photo and clears route-line selection state

#### Scenario: Preserve other annotations
- **WHEN** the user deletes a selected annotation object from a photo that contains multiple annotations
- **THEN** every non-targeted annotation remains on the photo unchanged

### Requirement: Delete Control Lifecycle
The editor SHALL hide the delete button when it is no longer valid for the current selection state.

#### Scenario: Hide after deletion
- **WHEN** the user deletes the selected annotation object
- **THEN** the editor hides the delete button

#### Scenario: Hide after deselection
- **WHEN** the delete button is visible and the user deselects the annotation object
- **THEN** the editor hides the delete button

#### Scenario: Hide after target disappears
- **WHEN** the delete button is visible and the selected annotation is no longer present in the current photo annotations
- **THEN** the editor hides the delete button
