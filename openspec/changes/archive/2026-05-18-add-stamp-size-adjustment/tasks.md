## 1. Stamp Size Model

- [x] 1.1 Identify the current default stamp dimensions used by editor rendering and export.
- [x] 1.2 Add a current-image stamp size enum with `small`, `medium`, and `large` values.
- [x] 1.3 Use the existing stamp dimensions for `medium`, with `small` around 0.8x and `large` around 1.2x.
- [x] 1.4 Ensure stamp size updates are scoped to stamp annotations and do not alter line or text annotation size data.
- [x] 1.5 Persist the current-image stamp size through the existing annotation/photo save path.

## 2. Editor UI

- [x] 2.1 Add a compact three-position pop-open stamp size pill beside the colour pill while the stamp menu is open.
- [x] 2.2 Keep the stamp size control hidden whenever the stamp menu is closed.
- [x] 2.3 Label the control so it is clear that it resizes all stamps on the current image.
- [x] 2.4 Ensure the control only selects Small, Medium, or Large.

## 3. Stamp Updates and Creation

- [x] 3.1 Apply slider changes to every existing stamp annotation on the current image.
- [x] 3.2 Keep each stamp centered on its persisted point while the rendered dimensions change.
- [x] 3.3 Ensure newly created stamps use the current image's chosen stamp size.
- [x] 3.4 Verify stamp size changes preserve stamp kind, point, label content, font size fields, and colour.

## 4. Rendering and Export

- [x] 4.1 Render editor stamps using the current image's stamp size.
- [x] 4.2 Export stamps using the same adjusted stamp size as the editor.
- [x] 4.3 Confirm route line rendering/export and text rendering/export do not consume the stamp size value.

## 5. Validation

- [x] 5.1 Add focused tests or coverage for stamp menu control visibility.
- [x] 5.2 Add focused tests or coverage for resizing all stamps while preserving center points.
- [x] 5.3 Add focused tests or coverage that lines and text are unaffected by stamp size changes.
- [x] 5.4 Run project typecheck and focused tests.
- [x] 5.5 Validate the OpenSpec change.
