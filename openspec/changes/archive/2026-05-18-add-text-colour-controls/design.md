## Context

Annotations already persist a single `color` value. Text labels render that colour in both the Skia annotation shape and the native text input overlay, making text the first useful target for colour controls. The control and helper design should not assume colour belongs only to text, because route lines, arrows, stamps, and other annotation styling are expected to use the same colour system later. The current editor also remembers label font size per photo during an editing session, which is the closest existing pattern for remembering annotation styling choices without adding persistent editor preferences.

The target users will mostly annotate photos of limestone, quartzite, and granite. Those backgrounds are relatively constrained but still vary across sun, shade, chalk, lichen, wet rock, and camera exposure. The UI should make colour changes fast while helping text remain legible without forcing users to manually tune a backdrop.

## Goals / Non-Goals

**Goals:**

- Provide a small, cross-platform annotation colour control, with text labels as the first supported target.
- Use a curated palette of ten colours chosen for annotation contrast on common rock-photo backgrounds.
- Show the colour control only when colour choice is relevant for the active tool or selected annotation.
- Let users change the colour for the next text label and for a selected text label.
- Automatically render a semi-transparent backdrop behind text when contrast is low.
- Choose backdrop colour and opacity with a deterministic helper based on text colour and local background contrast when background samples are available.
- Keep palette definitions, contrast math, sampling summaries, and backdrop selection isolated from UI components.
- Keep editor and export rendering consistent.

**Non-Goals:**

- Do not add a full custom colour picker.
- Do not use an iOS-only native colour picker.
- Do not add per-character, per-line, or rich-text colour styling.
- Do not add manual backdrop controls in the first version.
- Do not persist derived backdrop opacity or backdrop colour unless a later export-parity issue requires it.
- Do not implement colour editing for route lines, arrows, stamps, or other non-text annotations in this change.
- Do not introduce image-processing dependencies unless the platform APIs cannot provide the needed data cheaply.

## Decisions

- Use a collapsible annotation colour tool above the existing tool palette. The collapsed control shows a generic colour affordance and the current colour. Tapping expands to the swatch row.
- Model the control as target-aware: it receives the current colour, supported swatches, and an apply callback from the editor. In this change, the only supported target is text labels.
- Show the colour control when the Text tool is active or when Select mode has a text label selected. Hide it for other tools and for Select mode with no selected text label until those tools gain colour editing.
- Start with this shared annotation palette:
  - Ink `#111827`
  - White `#F8FAFC`
  - Red `#DC2626`
  - Yellow `#FACC15`
  - Orange `#F97316`
  - Cyan `#06B6D4`
  - Blue `#2563EB`
  - Magenta `#EC4899`
  - Lime `#84CC16`
  - Deep Navy `#1E3A8A`
- Use Ink as the default text label colour because many limestone, quartzite, and granite photos are light gray or tan in daylight. Future annotation targets may define different defaults while reusing the same palette.
- Remember the most recently used text colour for the current photo during the editor session. New labels use that remembered colour, falling back to the default label colour.
- Apply swatch changes immediately. If a label is selected, update its annotation colour and persist the colour change when the swatch is tapped. If no label is selected but the Text tool is active, update the next-label colour.
- Collapse the swatch row after selecting a colour to keep the canvas clear on mobile.
- Define a dedicated colour/backdrop helper module with pure functions for:
  - palette metadata and lookup,
  - target-specific default colour lookup,
  - hex colour parsing and serialization,
  - relative luminance,
  - WCAG contrast ratio,
  - alpha blending,
  - background sample summarization,
  - choosing the least visible backdrop that reaches the target contrast.
- Do not perform live photo pixel sampling in the editor render path. Skia image readback can cause visible black flashes during selection changes, so this version uses the deterministic fallback policy in the live editor.
- Use a deterministic fallback: assume a typical pale rock background, allow no backdrop for dark colours that already contrast well, and otherwise choose the black or white backdrop that contrasts better with the text colour at a modest default opacity.
- Allow no backdrop when text already reaches the target contrast against the sampled background.
- Render the backdrop as a padded rounded rectangle behind the full text label bounds. The backdrop should be semi-transparent, not a shadow.
- Do not draw the automatic backdrop while the native text input overlay is focused. During typing the final text bounds are still changing, so local background sampling can be inaccurate. Recompute and draw the backdrop after the text edit is committed.

## Backdrop Policy

The helper should select from a constrained set of candidates rather than continuously tuning opacity. This keeps results stable and easy to test.

Suggested starting inputs:

- Target contrast: `4.5:1` for normal labels.
- Maximum tolerated backdrop opacity: about `0.56`.
- Candidate alphas: `0`, `0.12`, `0.18`, `0.26`, `0.34`, `0.44`, `0.56`.
- Candidate colours: black and white.

The helper should blend each candidate backdrop over the sampled background, compute contrast between the text colour and blended result, and return the lowest-alpha candidate that reaches the target. If neither black nor white reaches the target at the maximum opacity, choose the candidate with the highest contrast at maximum opacity.

## Risks / Trade-offs

- Reading photo pixels directly from the current rendering path can cause visible flashing -> Do not sample pixels during live editor rendering; use the deterministic fallback policy.
- Backdrops may make annotations look visually heavy -> Include alpha `0`, choose the minimum passing opacity, and cap the maximum opacity.
- Local background under a label may be highly varied -> Use bounded grid sampling and median/robust summaries rather than a raw average.
- Editor and PDF export may diverge if they cannot use identical photo samples -> Exact pixel parity is not required. Share the same helper policy and equivalent sampling inputs so the results are substantively the same.
- Automatic backdrops can surprise users if they change while moving or resizing text -> Recompute from current label bounds, but keep the candidate set coarse so changes are predictable.

## Migration Plan

No database migration is expected. Existing text labels already have a persisted `color`; labels without an explicit colour continue to use the existing default. Automatic backdrop values are derived at render/export time.

## Open Questions

- None.
