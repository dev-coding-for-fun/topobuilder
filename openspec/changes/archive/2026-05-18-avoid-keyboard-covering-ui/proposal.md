## Why

When the system keyboard opens while editing a text annotation, it can cover a large portion of the editor UI and hide the label being typed. This makes text entry unreliable on smaller screens and when labels are placed near the lower half of a topo photo.

## What Changes

- Keep the focused text annotation visible while the keyboard is open.
- Preserve access to the editor canvas and text input context instead of allowing the keyboard to obscure the active edit area.
- Adjust keyboard-time layout behavior for the editor screen without changing annotation storage, export behavior, or drawing gestures.

## Capabilities

### New Capabilities

### Modified Capabilities
- `editor-text-annotations`: Text annotation editing must remain visible and usable while the on-screen keyboard is open.

## Impact

- Affects the editor screen layout in `app/projects/[projectId]/editor.tsx`.
- Affects the text input overlay behavior in `src/editor/TopoCanvas.tsx`.
- May require React Native keyboard/safe-area handling, but no data model, persistence, or export changes are expected.
