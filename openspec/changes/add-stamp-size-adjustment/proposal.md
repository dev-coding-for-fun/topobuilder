## Why

Stamp annotations currently have fixed sizing, so users cannot adjust their visual weight after placing markers on a topo image. A single contextual three-size control lets users make a mild size adjustment consistently without adding per-stamp complexity.

## What Changes

- Add a three-option stamp size adjustment available only while the stamp menu is open.
- Use the current stamp size as the middle option, with small and large options roughly 20% below and above the current size.
- Apply the chosen stamp size to all stamp annotations on the current image, not to route lines or text annotations.
- Resize stamps from their center points so existing marker positions remain visually anchored.
- Persist the updated size through the same annotation save path used for other stamp edits.
- Keep stamp size global per image rather than supporting mixed stamp sizes on the same image.

## Capabilities

### New Capabilities

### Modified Capabilities

- `editor-stamp-annotations`: Stamp annotations gain a contextual three-size adjustment that uniformly resizes all stamps on the current image from their centers.

## Impact

- Affects editor stamp-menu UI and contextual control visibility.
- Affects stamp annotation state updates, persistence, canvas rendering, and export rendering.
- Requires stamp resizing logic to leave line and text annotations untouched.
- No new runtime dependency is expected.
