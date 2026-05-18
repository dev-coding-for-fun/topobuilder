## Why

The editor has a visible text tool entry, but text annotations do not yet have a complete creation and editing workflow. Users need to place point-based labels on a topo photo, revise them later, and adjust their size directly on the canvas.

## What Changes

- Add a text annotation creation workflow in the editor.
- Allow existing text annotations to be located, selected, moved, and edited.
- Create labels from a single tap and immediately allow text entry.
- Preserve manual line breaks without automatic text wrapping.
- Use label resize handles to adjust one font size for the entire label.
- Render text consistently in the canvas and PDF export.
- Persist enough text annotation data to restore content, position, and font size.

## Capabilities

### New Capabilities

- `editor-text-annotations`: Text annotation placement, editing, font-size adjustment, rendering, persistence, and export behavior in the topo editor.

### Modified Capabilities

None.

## Impact

- Affects editor tool selection and gesture handling in `ToolPalette` and `TopoCanvas`.
- Affects annotation domain types, factory defaults, persistence serialization, and update flows.
- Affects canvas rendering and hit testing for text annotations.
- Affects PDF export so generated topos match the in-editor label content, position, and size.
- May require a database migration if font-size metadata is not already persisted.
