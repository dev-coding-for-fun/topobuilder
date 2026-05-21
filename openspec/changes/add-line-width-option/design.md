## Context

Route lines are currently stored as path annotations with points and colour, then rendered with a fixed stroke width in `AnnotationShapes`. The editor already has contextual controls above the tool palette for annotation colour and stamp size, and stamp size uses a three-option control backed by optional annotation metadata.

## Goals / Non-Goals

**Goals:**

- Add a contextual `Weight` control for route line creation and selected route line editing.
- Model line weight as a small persisted enum with `medium` preserving the current route line thickness.
- Reuse the existing contextual control interaction pattern so colour and weight behave consistently.
- Ensure editor rendering and export use the same persisted line weight.

**Non-Goals:**

- Changing route line geometry, smoothing, colour behaviour, or hit-testing semantics beyond any minimum needed to keep editing usable.
- Adding more than three weight choices.
- Applying a single global weight to all lines on a photo; weight is per route line annotation.

## Decisions

- Store route line weight on path annotations as metadata, using values `small`, `medium`, and `large`. This matches the existing stamp size enum style, keeps older annotations valid by treating missing weight as `medium`, and avoids changing the main annotations table shape.
- Add a line-weight helper module, parallel to `stampSizes`, that defines options, the default, validation, and conversion to stroke width. This keeps rendering, persistence parsing, and tests from duplicating literals.
- Build a `LineWeightControl` from the stamp size control pattern, with visible label `Weight` and expanded choices `S`, `M`, and `L`. A separate component avoids overloading stamp terminology while preserving the same interaction model.
- Track the last selected line weight per photo for newly created lines, while selected-line edits update only the selected annotation immediately. This mirrors current line colour behaviour and keeps creation state independent from existing annotations.
- Use the current hard-coded route line stroke widths as `medium`; `small` and `large` should be mild visual adjustments around that baseline so existing projects keep their current appearance unless changed.

## Risks / Trade-offs

- Older annotations will not have line weight metadata -> Treat missing or invalid metadata as `medium`.
- Wider lines may make control points or nearby line selection feel crowded -> Keep hit-testing based on existing touch tolerances unless tests show a regression.
- Export and editor rendering could drift if each maps weights separately -> Centralize weight-to-stroke-width helpers and use them from both paths.
