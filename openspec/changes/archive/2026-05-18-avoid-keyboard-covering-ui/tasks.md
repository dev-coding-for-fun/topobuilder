## 1. Keyboard State and Editor Layout

- [x] 1.1 Add editor-level keyboard visibility and height tracking using React Native keyboard events.
- [x] 1.2 Resize the editor canvas region to the visible area above the keyboard while text editing is focused.
- [x] 1.3 Suppress or reposition bottom editor controls while the keyboard is open for text annotation editing.

## 2. Canvas Text Input Visibility

- [x] 2.1 Keep `TopoCanvas` driven by its existing `onLayout` measurement after the parent editor region resizes.
- [x] 2.2 Verify the selected label `TextInput` remains aligned with the annotation in the resized canvas area without mutating annotation coordinates.
- [x] 2.3 Restore the full-height editor canvas region when the keyboard closes or text editing commits.

## 3. Verification

- [x] 3.1 Add or update editor/canvas tests covering keyboard-open text editing visibility and transient positioning.
- [x] 3.2 Manually verify lower-screen text annotation editing on iOS and Android with the keyboard open.
- [x] 3.3 Run `npm test -- --runInBand` and `npm run typecheck`.
