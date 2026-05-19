## Context

The editor already supports Select-mode hit testing for labels, stamps, and route lines in `TopoCanvas`, and `EditorScreen` already persists removals through `removeAnnotation`. Current deletion is limited to undoing the last annotation, so removing a specific older object requires workarounds.

Deletion should use the existing selection model: once a label, stamp, or route line is selected, the top editor controls can expose a delete action. The existing checkmark button currently calls the editor "save" action, but editor state is already persisted continuously, so this change should remove that checkmark/save affordance and use the same top-bar position for contextual deletion.

## Goals / Non-Goals

**Goals:**
- Remove the top-bar checkmark/save button from the editor.
- Show a delete button in the former checkmark slot when a supported annotation object is selected.
- Delete the currently selected annotation through the existing store path.
- Clear related selection/edit state after deletion.
- Keep behavior consistent for route lines, stamps, and text labels.

**Non-Goals:**
- Adding confirmation dialogs or undo history beyond the existing top-bar undo behavior.
- Deleting draft route lines through the selected-object delete button.
- Changing annotation storage schema or export behavior.
- Replacing the separate top-bar back navigation.
- Supporting deletion when no annotation object is selected.

## Decisions

1. Replace the checkmark/save button with contextual deletion.

   Rationale: the editor auto-saves, so a checkmark save action is misleading. Reusing that existing top-bar slot keeps the layout stable and makes deletion visible only when it applies, without adding another canvas gesture.

   Alternative considered: add delete as a third clustered button beside undo/redo while keeping the checkmark. That preserves the current save-looking affordance, but it adds clutter and leaves an action that does not match the editor's persistence model.

2. Derive delete availability from selection state in `EditorScreen`.

   Rationale: `EditorScreen` already tracks `selectedPathId`, `selectedLabelId`, and `selectedStampId`, plus edit snapshots for each type. A single computed selected annotation can drive both whether the former checkmark slot renders a delete button and which annotation is removed.

   Alternative considered: add deletion callbacks to `TopoCanvas`. With a top-bar button, the canvas does not need to know about deletion at all.

3. Delete through the existing `removeAnnotation` persistence path.

   Rationale: the store already provides `removeAnnotation`, and current undo behavior uses it for deletion. Reusing this path avoids storage changes and keeps refresh behavior consistent.

   Alternative considered: remove the annotation only from local editor state first. That risks diverging from persisted project data and duplicating refresh logic.

4. Clear matching selection and edit snapshots after deletion.

   Rationale: route lines, labels, and stamps each have separate selected/edit state. Deleting the selected object should remove any stale selected ID, draft edit points, label edit text, or stamp edit snapshot that refers to that object.

   Alternative considered: call the existing broad selection clear helper unconditionally. That is acceptable, but implementation should be careful not to save stale label/path edits over the annotation being deleted.

## Risks / Trade-offs

- Users may expect the checkmark to close the editor -> keep the existing Back control as the explicit exit path and rely on auto-save for state persistence.
- Delete visibility depends on selection state -> show the delete button only while a saved annotation is selected, and hide the former checkmark slot otherwise.
- Pending label edits may exist when deleting a label -> deletion should remove the selected target directly and clear selection state without saving an empty or stale edit snapshot over it.
- Selected path edits may be uncommitted -> deletion should remove the selected saved annotation and discard its edit snapshot rather than committing modified points.
