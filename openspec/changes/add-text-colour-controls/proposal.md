## Why

Annotations need quick colour changes that remain readable on common climbing-wall photos. Text labels are the first target because they are especially sensitive to contrast, but the colour system should be reusable for route lines, arrows, stamps, and other annotation styling later. Users primarily annotate limestone, quartzite, and granite, where background tones are often gray, tan, white, or shadowed. A fixed text colour is not enough, but a full colour picker would add complexity before the basic workflow is proven.

## What Changes

- Add a compact annotation colour control above the existing tool palette when colour choice is available.
- Provide a curated set of ten high-contrast swatches for common rock-photo backgrounds.
- Apply the selected colour to newly created text labels and to selected existing text labels.
- Render text labels with an automatic semi-transparent backdrop when local contrast is low.
- Keep colour palette definitions, target-specific defaults, and backdrop contrast logic isolated in domain helpers so editor UI and canvas rendering stay simple.

## Capabilities

### New Capabilities

### Modified Capabilities

- `editor-text-annotations`: Text annotations gain colour selection and automatic contrast backdrops.

## Impact

- Affects editor state orchestration for the active/selected annotation colour.
- Affects text annotation rendering in the Skia canvas and selected text input overlay.
- Affects PDF export so text colour and automatic backdrop output match editor rendering.
- Adds pure colour/contrast helper coverage for palette, WCAG contrast, alpha blending, and backdrop selection.
- No new runtime dependency or database migration is expected because annotation colour already exists.
