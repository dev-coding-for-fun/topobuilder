## Context

Stamp annotations are rendered as marker-style shapes with a persisted point and display attributes such as colour. Existing colour work treats stamps as their own annotation target, while route lines and text labels have separate controls and rendering paths. This change adds a three-option size adjustment only for stamps, and only in the stamp menu context, without creating mixed stamp sizes on a single image.

## Goals / Non-Goals

**Goals:**

- Provide a compact three-option stamp size control while the stamp menu is open.
- Use the current stamp rendering size as the middle option, with small and large options approximately 20% smaller and larger.
- Apply one shared stamp size to every stamp annotation on the current image.
- Preserve each stamp's center point when the size changes.
- Keep route lines and text annotations unaffected by stamp size changes.
- Keep rendered editor output and exported output aligned.

**Non-Goals:**

- Do not support selecting or persisting different sizes for individual stamps on the same image.
- Do not show the stamp size control outside the stamp menu.
- Do not change line width, text font size, text label behavior, or stamp colour behavior.
- Do not introduce a new dependency or a new annotation type.

## Decisions

- Model stamp size as an image-level enum applied to all stamp annotations, with `small`, `medium`, and `large` values. Alternative considered: store a freeform numeric scale. Three discrete values keep the control small and match the requested mild adjustment range.
- Use the existing stamp dimensions as `medium`, and derive `small` and `large` at roughly 0.8x and 1.2x. Alternative considered: a wider scale range. A mild range reduces layout surprises and keeps stamps legible.
- Surface the control from the stamp menu rather than the generic annotation toolbar. Alternative considered: show the size control whenever a stamp is selected. Keeping visibility tied to the stamp menu keeps the UI contextual and avoids implying per-stamp sizing.
- Resize stamps around their persisted point. Alternative considered: treat the point as a top-left origin during scale changes. The persisted point already represents marker placement, so center anchoring preserves the user's intended location.
- Persist the size through existing photo annotation update flow. Alternative considered: keep the value session-only. Persistence is needed so reopening or exporting the image keeps the adjusted stamp scale.
- Keep line and text rendering paths independent from stamp size. Alternative considered: use a shared annotation size control. The requested scope is stamps only, and text already has separate font-size semantics.

## Risks / Trade-offs

- Existing stamps may not currently carry enough explicit size data -> Add or reuse a single current-image stamp-size field/update path and make rendering fall back to the current default for older data.
- Treating the control like a continuous slider could create noisy writes or overly precise states -> Implement it as three discrete positions and persist only the selected size value.
- Export can diverge from editor rendering if it keeps fixed stamp dimensions -> Update shared stamp drawing helpers or both render paths so editor and export use the same size source.
- Users may expect selected-stamp resizing when a stamp is selected -> Keep labels/accessibility text clear that the slider resizes all stamps on the image.

## Migration Plan

No migration is expected. Existing images without an explicit stamp size should render with the current default size, equivalent to `medium`, until the user chooses `small` or `large`. Rolling back the change leaves existing stamp annotations valid; any persisted image-level stamp size can be ignored by older rendering code.

## Open Questions

- None.
