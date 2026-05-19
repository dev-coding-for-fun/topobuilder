## Context

The editor already models route markers as `start` stamp annotations, and stamp annotations already support optional `label` data. The route marker renderer currently displays up to two label characters inside the marker, while other stamp controls such as colour and size are shown as compact contextual pills above the tool palette.

This change should make route marker numbering fast for the common sequential case while still allowing direct correction, duplicate numbers, and blank markers. The number counter is editor working state only; persisted annotation data remains the marker's own label.

## Goals / Non-Goals

**Goals:**
- Provide a compact route marker number control near the existing contextual controls.
- Default new image/editor sessions to route marker number `1`.
- Auto-increment new route markers to the next unused number from `1` through `99`.
- Allow blank route marker labels and duplicate manually edited numbers.
- Keep the route marker counter in memory only.
- Shorten visible contextual pill labels to `Colour` and `Size`.

**Non-Goals:**
- Persisting the next route marker number across editor sessions or app restarts.
- Enforcing route marker number uniqueness.
- Supporting route marker numbers outside `1` through `99`.
- Adding multi-select renumbering or batch renumbering.
- Changing the annotation storage schema.

## Decisions

1. Use the existing `label` field for route marker numbers.

   Rationale: route markers already render from the optional stamp label, and blank labels already fit the data model. This avoids a schema migration and keeps export/editor parity tied to existing annotation data.

   Alternative considered: add a dedicated route marker number field. That would make semantics explicit, but it introduces storage changes for a value already representable as a stamp label.

2. Keep the next number as in-memory editor state keyed to the current photo.

   Rationale: the next number is a placement convenience, not project data. Recomputing it from saved route markers when an editor session starts keeps behavior predictable without storing transient UI state.

   Alternative considered: persist the counter with the project or photo. That would preserve exact workflow position across app restarts, but it risks stale state when markers are edited or deleted and adds persistence complexity without clear user value.

3. Treat `1` through `99` and blank as the full allowed value set.

   Rationale: the marker visual is small and already suited to one or two characters. Blank is a valid marker state for cases where a route marker is useful without a number.

   Alternative considered: clamp at `1` and `99`. That prevents accidental blanking, but makes blank harder to reach and conflicts with the desired cyclic picker behavior.

4. Auto-increment by skipping currently taken route marker numbers.

   Rationale: the common workflow should produce clean sequential numbering even after users manually edit an existing marker. If marker `3` becomes `7`, the next placement should refill `3`, continue through `6`, and then skip the taken `7`.

   Alternative considered: simple `previous + 1` incrementing. That is easier to implement but leaves gaps after edits and can auto-place numbers already used by markers.

5. Separate selected marker edits from the future next number.

   Rationale: changing a selected marker should update that marker only. Users can still adjust the next placement number directly through the number pill when the route marker tool is active.

   Alternative considered: editing a selected marker could also move the next counter. That can be surprising because a correction to old content would affect future placements.

6. Put the number control with the existing bottom contextual controls.

   Rationale: colour and size controls already live above the tool palette, so the number pill should appear there as another route marker setting. The top bar remains reserved for navigation, undo/redo, and selected-object deletion.

   Alternative considered: put numbering in the stamp submenu or top bar. The submenu is cramped and the top bar has a different action model.

## Risks / Trade-offs

- Duplicate manual numbers may confuse users who expect uniqueness -> auto-placement avoids taken numbers, but direct edits remain flexible by design.
- Blank as a cyclic value could be reached accidentally -> the number pill should make blank visually obvious and allow one tap to increment back to `1`.
- Recomputed session state may not resume exactly after restart -> this is acceptable because the counter is intentionally transient, and default derivation from existing marker labels preserves useful behavior.
- Keyboard entry introduces validation edge cases -> restrict accepted values to blank or `1` through `99`, with plus/minus remaining the primary path.
