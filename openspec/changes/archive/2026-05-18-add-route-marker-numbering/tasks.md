## 1. Numbering Domain Logic

- [x] 1.1 Add route marker number helper functions for parsing blank/`1`-`99` labels, cycling increment/decrement values, and finding the next unused number.
- [x] 1.2 Add focused unit tests for blank handling, `1`/`99` wrap behavior, duplicate taken-number detection, and all-numbers-taken behavior.

## 2. Route Marker Control UI

- [x] 2.1 Add a compact route marker number control with decrement, tappable value, increment, and optional numeric keyboard entry.
- [x] 2.2 Ensure the number control supports blank display and validates typed input to blank or `1` through `99`.
- [x] 2.3 Shorten visible contextual colour and stamp size control labels to `Colour` and `Size` while keeping descriptive accessibility labels.

## 3. Editor Integration

- [x] 3.1 Track the next route marker number in `EditorScreen` in memory per current photo/editor session.
- [x] 3.2 Initialize the next route marker number to `1` on brand new images and derive the first available number from existing route marker labels on images with markers.
- [x] 3.3 Apply the next route marker number when placing new route markers, then advance to the next unused number while skipping taken numbers.
- [x] 3.4 Show the number control for the active route marker tool and wire it to future placements.
- [x] 3.5 Show the number control for selected route markers and wire it to immediate selected-marker label updates without directly moving the future next number.

## 4. Rendering and Export

- [x] 4.1 Render blank route marker labels as marker circles without text in the editor.
- [x] 4.2 Update export rendering so blank route markers export without number text.

## 5. Verification

- [x] 5.1 Add or update editor tests covering route marker placement auto-increment, gap refilling after edit, skip-taken behavior, duplicate direct edits, and blank labels.
- [x] 5.2 Add or update UI tests for number control visibility across route marker tool, selected route marker, other stamp tools, and non-marker selections.
- [x] 5.3 Run the relevant test suite and lints for changed files.
