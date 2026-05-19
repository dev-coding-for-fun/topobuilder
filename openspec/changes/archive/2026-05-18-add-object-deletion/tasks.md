## 1. Selection-Derived Delete State

- [x] 1.1 Compute the currently selected saved annotation in `EditorScreen` from `selectedPathId`, `selectedLabelId`, and `selectedStampId`.
- [x] 1.2 Derive whether the top-bar delete button should be visible from that selected annotation.
- [x] 1.3 Ensure the delete button hides when selection is cleared or the selected annotation no longer exists in `savedAnnotations`.

## 2. Top-Bar Delete Control

- [x] 2.1 Remove the checkmark/save button props and rendering from `EditorTopBar`.
- [x] 2.2 Extend `EditorTopBar` to accept optional delete visibility and delete press props for the former checkmark slot.
- [x] 2.3 Render an accessible contextual delete button in the former checkmark slot when an annotation is selected.
- [x] 2.4 Wire `EditorScreen` to stop passing save props and instead pass delete visibility and handler state into `EditorTopBar`.

## 3. Editor Deletion Flow

- [x] 3.1 Add a selected-object delete handler in `EditorScreen` that removes the selected saved annotation through `removeAnnotation`.
- [x] 3.2 Clear matching selection/edit state after deletion and refresh the project.
- [x] 3.3 Ensure deleting one annotation preserves all non-targeted annotations and does not save stale label or path edit snapshots over the deleted object.

## 4. Verification

- [x] 4.1 Add `EditorTopBar` or `EditorScreen` tests for delete-button visibility when a label, stamp, or route line is selected.
- [x] 4.2 Add `EditorTopBar` or `EditorScreen` tests that the checkmark/save button is removed and the delete button is hidden when no annotation is selected.
- [x] 4.3 Add `EditorScreen` tests that pressing the delete button removes the selected label, stamp, or route line and clears the corresponding selection.
- [x] 4.4 Run the relevant test suite and lint checks for the edited files.
