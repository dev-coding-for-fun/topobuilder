## Why

Users can create and select annotation objects, but they need a direct, discoverable way to remove the selected object. The editor already auto-saves state, so the top-bar checkmark does not represent a meaningful save action and can become a contextual delete control instead.

## What Changes

- Add object deletion from Select mode for supported editor annotations.
- Remove the top-bar checkmark/save button from the editor.
- Show a contextual delete button in that top-bar slot when an annotation object is selected.
- Delete the selected annotation when the user presses the top-bar delete button.
- Clear any selection state that refers to the deleted annotation.

## Capabilities

### New Capabilities
- `editor-object-deletion`: Defines top-bar selected-object deletion behavior for editor annotation objects.

### Modified Capabilities

## Impact

- Affects editor top-bar controls, removal of the checkmark/save action, and annotation selection/deletion state.
- Requires focused tests for delete-button visibility, selected-object deletion, and selection cleanup.
