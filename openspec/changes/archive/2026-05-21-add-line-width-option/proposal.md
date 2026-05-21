## Why

Route lines currently have a fixed visual thickness, which limits users who need thinner or bolder lines for readability on different topo images. Adding a small contextual weight control gives users the same kind of quick sizing affordance that stamps already have.

## What Changes

- Add a contextual line weight control beside the line colour picker when creating a route line or editing a selected route line.
- Offer three line weight options labeled `S`, `M`, and `L`, with a visible control label of `Weight`.
- Treat the current route line thickness as the `M` option.
- Apply the selected weight to newly created route lines and allow changing the weight of selected route lines.
- Render and export route lines using their persisted weight.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `route-line-drawing`: Route line annotations gain selectable Small, Medium, and Large line weights for creation, editing, rendering, persistence, and export.

## Impact

- Affects route line editor controls, route line annotation data, rendering, persistence, export, and tests.
- No new dependencies or external APIs are expected.
