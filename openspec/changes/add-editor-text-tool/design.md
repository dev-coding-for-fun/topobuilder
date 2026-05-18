## Context

The editor already has a `label` tool in the palette and stores label text on marker annotations, but labels do not yet expose a full create/edit/resize workflow. The desired interaction is intentionally simple: labels remain point-based, the user controls line breaks with newline characters, and resize handles adjust the label's font size rather than a wrapping box.

## Goals / Non-Goals

**Goals:**

- Let users create a text annotation from the text tool with a single tap on the photo.
- Let users select existing text in Select mode, move it, edit its content, and resize it.
- Store the label anchor point in normalized image coordinates and store one font size for the full label.
- Give the first label on a photo a screen-relative size approximating standard 12pt text at the current zoom.
- Reuse the previous label font size for later labels placed during the same editing session.
- Preserve user-entered newline characters and avoid automatic wrapping.
- Keep the workflow simple by making resize handles the only font-size control.

**Non-Goals:**

- Do not add rich text, font family selection, rotation, alignment controls, or per-word styling.
- Do not add automatic wrapping, fitted text boxes, or per-line font sizing.
- Do not introduce multi-select or layer ordering changes.
- Do not change route line or stamp annotation behavior.

## Decisions

- Keep `kind: 'label'` as the text annotation type. Existing code and exports already recognize labels, and point-based label storage matches the requested interaction.
- Persist one normalized anchor point plus a label font size. The anchor point keeps placement independent of viewport transforms, while the font size gives resize handles a durable value to update.
- Create text with a tap-to-place gesture. After placement, focus a native text input overlay so the user can start typing immediately.
- Derive the first label's persisted font size from a screen-space default of approximately 12pt at the current viewport scale. This means labels created while zoomed in occupy less photo-relative space, while labels created while zoomed out occupy more photo-relative space.
- Track the most recently used label font size in editor session state. New labels on the same photo during that session should reuse that value, including changes made through resize handles.
- Preserve newlines exactly as entered and do not auto-wrap long lines. If users want multiple lines, they add newline characters themselves.
- Use resize handles as a direct manipulation font-size control. Dragging a corner handle changes the single font size for the entire label; it does not change a text box width or wrap behavior.
- Render selection affordances from measured label text bounds. The bounds are derived from label content and font size for hit testing and handle placement, not persisted as layout state.
- Share lightweight text measurement and line-splitting helpers between canvas interaction and PDF export. The helpers should split on newlines and scale font metrics consistently, without performing word wrapping.

## Risks / Trade-offs

- Skia and SVG/browser text measurement can differ -> Use shared line-height and approximate text width helpers for selection and export parity.
- Native text input overlay can drift during zoom/pan changes -> Commit or reposition the overlay whenever viewport transforms or selection state change.
- Resize handles could make labels unreadably small or excessively large -> Enforce minimum and maximum font sizes.
- Session remembered size can surprise users after zooming -> Only the first label derives from zoom; subsequent labels intentionally reuse the last edited/created size for consistency.
- Database schema churn may be needed for font size -> Prefer adding a nullable metadata JSON column for annotation-specific fields so future annotation types can add data without repeated table changes.

## Migration Plan

Add any new annotation metadata storage as nullable data. Existing labels remain valid with their current `point` and `label`; when rendered or edited, labels without font-size metadata use the default label font size. No destructive migration is required.

## Open Questions

- Should empty text annotations be discarded when editing ends, or kept as selectable placeholders?
- Should resize-handle drag distance map linearly to font size, or scale proportionally from the label anchor?
