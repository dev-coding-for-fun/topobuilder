## 1. Colour Helper Model

- [x] 1.1 Extend annotation colour target types to include `label`, `line`, and stamp-kind targets.
- [x] 1.2 Add Yellow palette fallback defaults for line and stamp targets while preserving the existing text default.
- [x] 1.3 Add helper coverage for target default lookup and target independence.

## 2. Editor Colour State

- [x] 2.1 Track the most recently used line colour for the current photo during the editor session.
- [x] 2.2 Track the most recently used stamp colour per stamp kind for the current photo during the editor session.
- [x] 2.3 Resolve the active colour target from active line tools, active stamp tools, selected route lines, selected stamps, and existing text contexts.
- [x] 2.4 Ensure changing one target's colour does not mutate text, line, or other stamp-kind defaults.

## 3. Creation and Selection Updates

- [x] 3.1 Apply the remembered line colour or Yellow fallback when beginning new route line annotations.
- [x] 3.2 Apply each stamp kind's remembered colour or Yellow fallback when placing new stamp annotations.
- [x] 3.3 Add selected-route-line colour update support that preserves kind and point list.
- [x] 3.4 Add selected-stamp colour update support that preserves kind, point, label content, and font size fields.
- [x] 3.5 Persist selected line and stamp colour changes immediately when a swatch is tapped.

## 4. Colour Control UI

- [x] 4.1 Show the existing compact colour control for active line tools and selected route lines.
- [x] 4.2 Show the existing compact colour control for active stamp tools and selected stamp annotations.
- [x] 4.3 Keep colour control hidden when Select mode has no colour-editable annotation selected.
- [x] 4.4 Update control accessibility labels and selected-state text so the current target is clear for text, lines, and stamps.

## 5. Rendering and Export

- [x] 5.1 Render editor route lines from their annotation colour, including selected and draft states where applicable.
- [x] 5.2 Render editor stamps from their annotation colour.
- [x] 5.3 Export route lines using their persisted annotation colour.
- [x] 5.4 Export stamps using their persisted annotation colour.
- [x] 5.5 Verify line and stamp rendering does not invoke text backdrop or contrast-effect logic.

## 6. Validation

- [x] 6.1 Add focused tests for line colour creation, selection update, persistence path, and remembered default behavior.
- [x] 6.2 Add focused tests for per-stamp-kind colour creation, selection update, persistence path, and independent remembered defaults.
- [x] 6.3 Add or update colour control tests for visibility and target-specific swatch behavior.
- [x] 6.4 Run project typecheck and focused tests.
- [x] 6.5 Validate the OpenSpec change.
