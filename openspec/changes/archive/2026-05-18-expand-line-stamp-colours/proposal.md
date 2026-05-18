## Why

The editor already has a compact colour system for text annotations, but line and stamp annotations still behave as fixed-colour tools. Extending the same curated swatches to lines and stamps lets users style route markup consistently while keeping each annotation type's default colour independent.

## What Changes

- Reuse the existing annotation colour control and ten-swatch curated palette for route lines and stamps.
- Show colour choice when a line tool or stamp tool is active, or when a supported line or stamp annotation is selected.
- Apply selected colours to newly created lines and stamps and to selected existing lines and stamps.
- Remember the most recently used line colour for the current photo during the editor session, falling back to yellow when no line colour has been chosen.
- Remember the most recently used colour separately for each stamp type for the current photo during the editor session, falling back to yellow when no colour has been chosen for that stamp.
- Keep text, line, and per-stamp colour defaults isolated so choosing a colour for one object type never changes the default or existing colours for another type.
- Do not add backdrop effects, contrast helpers, or other automatic visual effects for lines or stamps.

## Capabilities

### New Capabilities

- `editor-stamp-annotations`: Stamp annotations support creation, selection, colour selection, independent per-stamp remembered colours, persistence, rendering, and export using the shared annotation palette.

### Modified Capabilities

- `editor-text-annotations`: The shared contextual annotation colour control and palette contract expands beyond text while preserving text-specific remembered colour behavior.
- `route-line-drawing`: Route line annotations gain colour selection, remembered line colour defaults, selected-line colour editing, persistence, rendering, and export.

## Impact

- Affects editor state orchestration for active colour targets, selected annotations, and per-photo remembered defaults.
- Affects reusable annotation colour control visibility, labels, selected states, and apply callbacks.
- Affects line and stamp annotation creation/update paths, canvas rendering, and PDF export.
- Affects pure colour helper defaults so text, line, and stamp targets can share swatches while keeping independent fallback colours.
- No new runtime dependency or database migration is expected because annotations already carry colour values.
