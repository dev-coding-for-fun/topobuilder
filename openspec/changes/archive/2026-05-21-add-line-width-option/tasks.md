## 1. Line Weight Domain Model

- [x] 1.1 Add a line weight enum/helper module with `small`, `medium`, and `large` options, `medium` as the default, validation, and stroke-width mapping.
- [x] 1.2 Extend annotation types and annotation factory inputs so path annotations can carry optional line weight metadata.
- [x] 1.3 Update storage metadata serialization and parsing to persist valid line weight values while defaulting missing or invalid values to `medium` at use sites.

## 2. Editor Controls and State

- [x] 2.1 Add a `LineWeightControl` component modeled after the stamp size picker, labeled `Weight` and offering `S`, `M`, and `L`.
- [x] 2.2 Add editor session state for last selected line weight per photo and include the selected weight when saving new route line annotations.
- [x] 2.3 Show the line weight control beside the colour picker for active route line tools and selected route lines, and hide it for non-line contexts.
- [x] 2.4 Update selected route line weight changes immediately while preserving the annotation kind, colour, and points.

## 3. Rendering and Export

- [x] 3.1 Render route lines in the editor using persisted line weight, with missing values rendered as `medium`.
- [x] 3.2 Export route lines using the same line weight mapping as editor rendering.

## 4. Verification

- [x] 4.1 Add or update unit tests for line weight helpers, storage metadata parsing, and annotation factory defaults.
- [x] 4.2 Add editor tests for control visibility, creating lines with selected/default weight, remembering weight per photo, and editing selected line weight.
- [x] 4.3 Add rendering/export tests that verify adjusted line weights are applied and older annotations without weight keep the current medium thickness.
- [x] 4.4 Run the relevant test suite and lint/type checks for touched files.
