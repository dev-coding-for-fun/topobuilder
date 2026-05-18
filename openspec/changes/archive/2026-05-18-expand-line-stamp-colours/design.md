## Context

Text annotations already use a shared annotation colour palette, a compact colour control, target-specific defaults, and per-photo remembered text colours. All annotation records already include a persisted `color` field, and creation paths can accept an explicit colour. Route lines are path annotations (`climbLine`, `walkoff`, `scramble`), while stamp-style marker tools include `bolt`, `rappel`, `belay`, and `start`. The current colour helper's target type is text-only even though the palette was intentionally designed to be reused by other annotation types.

This change extends colour choice to lines and stamps without adding text backdrop behavior to either target. Lines use one remembered colour bucket across all line tools. Stamps use one remembered colour bucket per stamp kind so changing Bolt colour does not affect Start, Belay, Rappel, text, or line defaults.

## Goals / Non-Goals

**Goals:**

- Reuse the existing ten-swatch annotation palette and compact control for line and stamp colour selection.
- Default new lines to the last line colour used on the current photo during the editor session, or yellow if none exists.
- Default each stamp kind to its own last-used colour on the current photo during the editor session, or yellow if none exists for that stamp kind.
- Let users recolour selected saved line and stamp annotations while preserving geometry, text, and other annotation data.
- Keep remembered defaults independent between text, line, and each stamp kind.
- Keep editor canvas rendering and PDF export aligned with persisted line and stamp colours.

**Non-Goals:**

- Do not add a full colour picker or user-defined colours.
- Do not add automatic backdrops, shadows, contrast sampling, or other effects for lines or stamps.
- Do not change text label backdrop behavior or text's default colour.
- Do not change the persisted annotation schema beyond using the existing `color` field.
- Do not make one stamp kind's selected colour affect another stamp kind.

## Decisions

- Extend `AnnotationColourTarget` from text-only to semantic targets: `label`, `line`, and stamp targets keyed by stamp kind. Alternative considered: use raw annotation kinds everywhere. The semantic target keeps all path tools in one line bucket while still allowing per-stamp buckets.
- Add yellow as the default colour for line and stamp targets by reusing the existing palette's Yellow swatch (`#FACC15`). Alternative considered: preserve each tool's legacy hardcoded colour until the user picks a swatch. The requested behavior explicitly falls back to yellow for lines and stamps, so new creation defaults should use yellow when there is no remembered colour.
- Store remembered colours in editor session state scoped by photo, with separate fields for text, line, and a stamp-kind map. Alternative considered: persist editor defaults in project data. Session-scoped state matches the existing text colour and font-size pattern and avoids preference migration.
- Resolve the active colour target from the current editing context. Active line tools use the line target. Active stamp tools use that stamp kind's target. Select mode uses the selected annotation's target when the selected annotation is colour-editable.
- Selecting a swatch immediately updates the active default for its target. When an existing annotation is selected, the swatch also updates that annotation's persisted colour without changing its points, point, label text, or font size.
- Keep automatic backdrop helpers and rendering branches text-only. Lines and stamps consume only palette/default helpers and persisted colour values.
- Prefer shared rendering/export reads from `annotation.color`, with helper fallbacks only for missing colours. This keeps existing saved annotations stable and makes export parity a rendering concern rather than a separate defaulting system.

## Risks / Trade-offs

- Hidden coupling between selected annotation colour and next-created default could cause cross-target bleed -> Model active colour target explicitly and test text, line, and per-stamp independence.
- Existing hardcoded stamp and line default colours will change for new annotations with no remembered colour -> This is expected by the requested yellow fallback, while existing persisted annotations keep their stored colours.
- The palette control can become ambiguous when Select mode has overlapping annotation types -> Derive the target from the currently selected annotation, not from the last active tool.
- Export may still contain hardcoded fallback colours for some shapes -> Audit export code to ensure line and stamp rendering reads `annotation.color`.
- The term "stamps" can include non-label marker tools but not text -> Define stamp-colour support for marker annotation kinds except `label`; keep arrow handling aligned with the existing tool grouping during implementation.

## Migration Plan

No data migration is required. Existing annotations already persist colour values and should continue rendering with those values. New line and stamp annotations created after the change use the remembered target colour or yellow fallback. Rollback is limited to reverting editor defaulting/control behavior; persisted colours remain valid hex annotation colours.

## Open Questions

- Should the arrow marker be treated as a stamp colour target if the arrow tool remains exposed separately from the stamp tool group? The implementation should follow the actual tool palette grouping unless product direction says otherwise.
