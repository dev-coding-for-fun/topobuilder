## 1. Palette and Contrast Helpers

- [x] 1.1 Add a pure domain helper for shared annotation colour palette metadata and target-specific default colours.
- [x] 1.2 Add pure colour helpers for hex parsing, relative luminance, WCAG contrast ratio, and alpha blending.
- [x] 1.3 Add a pure backdrop policy helper that chooses backdrop colour and opacity from text colour plus optional local background samples.
- [x] 1.4 Add focused tests for palette values, contrast math, alpha blending, no-backdrop cases, low-contrast backdrop selection, and fallback behaviour.

## 2. Editor Colour State

- [x] 2.1 Track the most recently used text colour for the current photo during the editor session.
- [x] 2.2 Apply the remembered text colour when creating new label annotations.
- [x] 2.3 Add a selected-label colour update path that changes the annotation colour without changing text content, point, or font size.
- [x] 2.4 Persist selected-label colour changes immediately when a swatch is tapped.
- [x] 2.5 Keep colour changes compatible with existing selected-label commit/delete behaviour.

## 3. Annotation Colour Control UI

- [x] 3.1 Add a compact reusable annotation colour control above the existing tool palette.
- [x] 3.2 Show the control only when the active tool or selected annotation supports colour editing; for this change, support the Text tool and selected text labels.
- [x] 3.3 Render the collapsed state with a generic colour affordance and the current colour.
- [x] 3.4 Expand the control on tap to show the curated swatches.
- [x] 3.5 Apply swatch choices immediately and collapse the swatch row after selection.
- [x] 3.6 Add accessibility labels and selected-state affordances for the colour control and swatches.

## 4. Automatic Text Backdrops

- [x] 4.1 Render a padded semi-transparent rectangle behind text labels according to the backdrop policy helper.
- [x] 4.2 Keep backdrop rendering aligned with measured label bounds, explicit line breaks, and current font size.
- [x] 4.3 Avoid live photo pixel sampling in the editor render path because Skia readback causes selection flashes.
- [x] 4.4 Use the deterministic fallback backdrop policy when local samples are unavailable.
- [x] 4.5 Do not draw or update the automatic backdrop while the native text input overlay is focused; recompute after text commit.
- [x] 4.6 Ensure the native text input overlay remains legible while editing selected text.

## 5. Export Parity

- [x] 5.1 Render text colour in PDF export from the annotation colour.
- [x] 5.2 Render automatic text backdrops in PDF export using the shared backdrop policy.
- [x] 5.3 Verify editor and export use substantively equivalent label bounds, padding, colour, and opacity decisions.

## 6. Validation

- [x] 6.1 Add focused tests for text colour creation, selection, update, and remembered colour flows where the test stack supports it.
- [x] 6.2 Add rendering/export tests or focused helper tests for automatic backdrop decisions.
- [x] 6.3 Run project typecheck and focused tests.
- [x] 6.4 Validate the OpenSpec change.
