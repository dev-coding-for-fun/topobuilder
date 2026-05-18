## Context

The editor screen renders the photo canvas full-screen, with the top bar and tool controls absolutely positioned over it. Text annotation editing happens inside `TopoCanvas` through an absolutely positioned native `TextInput` that tracks the selected label frame.

Today the keyboard is allowed to overlay the editor. Because the text input can sit anywhere on the photo, opening the keyboard can obscure the selected label and a large part of the canvas, especially when labels are near the bottom of the viewport. The app is on Expo SDK 54 / React Native 0.81, so the implementation should use standard React Native keyboard and layout primitives already available in the project before introducing a new Expo SDK dependency.

## Goals / Non-Goals

**Goals:**

- Keep the focused text label and enough surrounding canvas visible while the keyboard is open, even if that label is near the bottom of the image.
- Keep the top editor controls reachable and prevent bottom controls from competing with the keyboard.
- Preserve existing canvas gestures, label positioning semantics, label persistence, and export output.
- Handle iOS and Android keyboard behavior with the same user-facing contract.

**Non-Goals:**

- Changing how text annotations are stored, measured, rendered in exports, or selected.
- Adding automatic text wrapping or changing multiline label semantics.
- Redesigning the editor tool palette beyond keyboard-time visibility or spacing.

## Decisions

1. Resize the editor canvas area at the screen boundary while the keyboard is open.

   The editor screen owns the absolute top and bottom overlays around `TopoCanvas`, so it is the right place to react to keyboard visibility. The implementation should track keyboard height/visibility and safe-area insets, then give `TopoCanvas` only the visible area above the keyboard while text editing is focused.

   This means `TopoCanvas` can keep using its existing layout measurement, photo fitting, pan bounds, label frame, and hit testing code. The canvas may visibly reflow when the keyboard appears, but the implementation remains aligned with the component's current geometry model.

   Alternative considered: keep the canvas full-height and add a bottom occlusion/padding model. That could preserve a more stable photo scale during keyboard entry, but it would require custom visible-rect logic inside `TopoCanvas` and increase the chance of future bugs in pan bounds, hit testing, and label positioning.

2. Avoid custom keyboard-time coordinate translation inside `TopoCanvas`.

   `TopoCanvas` should not need to know the keyboard height or maintain a separate keyboard-safe viewport. Resizing its parent allows existing `onLayout`-driven calculations to handle the smaller visible area consistently.

   Alternative considered: clamp or translate only the selected label `TextInput` while leaving the photo underneath in its original position. That could keep the typed text visible, but it risks separating the input overlay from the annotation's rendered position and creating more edge cases around selection handles and gestures.

3. Hide or move bottom controls while text entry is focused and the keyboard is open.

   The tool palette and colour control sit at the same edge as the keyboard. During text input, they should not occupy space over the label or keyboard. The active text edit should remain the primary interaction until blur/commit.

   Alternative considered: keep controls visible above the keyboard. That preserves tool access but still consumes scarce vertical space and can cover the editing target on small devices.

4. Prefer built-in React Native keyboard events and existing safe-area support.

   The project already uses `react-native-safe-area-context`; adding a keyboard-specific dependency should not be necessary for this targeted behavior. If built-in APIs prove insufficient during implementation, the dependency decision should be revisited explicitly or the approach abandoned.

## Risks / Trade-offs

- The photo may visibly resize or jump when the keyboard opens -> accept this as a simpler, lower-risk trade-off as long as text editing remains workable.
- Android keyboard resize behavior may vary by window mode -> validate on Android emulator/device and prefer explicit editor sizing from keyboard event dimensions over assuming the root view shrinks.
- Hiding bottom controls during keyboard entry reduces immediate tool switching -> committing/blurring the text edit remains the expected path before changing tools.
- Keyboard animation timing can briefly reflow the canvas and overlays -> update layout from keyboard show/change/hide events and keep transitions simple.
