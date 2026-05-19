## Why

Route marker stamps often need sequential numbers so climbers can identify routes on a topo quickly. Today the marker graphic can show a label, but the editor does not provide a fast way to create numbered markers, adjust the next number, or intentionally leave a marker blank.

## What Changes

- Add a compact route marker number control above the tool palette when the route marker tool is active or a route marker is selected.
- Place new route markers with the current in-memory next number and advance to the next unused number from 1-99.
- Allow users to increment, decrement, blank, or directly type route marker numbers without enforcing uniqueness.
- Render blank route markers without text while preserving the marker circle.
- Shorten visible contextual control labels from stamp-specific wording to compact `Colour` and `Size` labels.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `editor-stamp-annotations`: Add route marker numbering controls, sequencing rules, blank marker support, and compact stamp control labels.

## Impact

- Editor UI: contextual controls above the tool palette, including route marker number entry and compact colour/size labels.
- Editor state: in-memory next route marker number per photo/editor session; no persistence of the counter itself.
- Annotation persistence: route marker numbers continue to use the existing stamp label field.
- Rendering/export: route markers with blank labels render/export without number text.
