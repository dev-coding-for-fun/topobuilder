## Context

Route lines are already modeled as `PathAnnotation.points` and rendered as Skia polylines. The current interaction appends points by tap, which is precise but slow and does not support editing a saved path. The route editor also uses one-finger drag for panning, so the line tool needs explicit gesture branching.

## Goals / Non-Goals

**Goals:**
- Make `climbLine` drawing a one-finger freehand gesture.
- Store the result as sampled normalized polyline points.
- Render route lines with light visual smoothing based on those points.
- Keep points far enough apart to be practical touch control handles.
- Allow saved path control points to be edited from Select mode.
- Preserve two-finger pan/zoom while drawing.

**Non-Goals:**
- Do not introduce persisted Bezier curves, spline control objects, or new path storage.
- Do not add full multi-select, point insertion/deletion, or route styling changes.
- Do not migrate existing annotations.

## Decisions

- Use sampled points as the only route line data model. This keeps editing, PDF export, and persistence compatible with existing `points_json`.
- Render a lightly smoothed path from sampled points. The smoothing is presentation-only; control handles and storage remain the sampled point list.
- Sample freehand input with a minimum screen-space spacing. This lets close-up zoom capture more detail while preventing overlapping handles at normal touch sizes.
- Use Select mode for editing saved lines. This keeps drawing and editing gestures separate: one-finger drag draws only in the line tool, while Select owns hit testing and handle dragging.
- Add an annotation update path in the store/repository layer. Updating the existing row preserves annotation identity and avoids delete/reinsert side effects.
- Share coordinate conversion helpers for screen-to-normalized image points. Drawing, tapping, hit testing, and dragging need the same cover-fit and pan/zoom transform math.

## Risks / Trade-offs

- Gesture conflicts between drawing and viewport movement -> Tool-specific gesture composition keeps one-finger pan in Select and one-finger draw in the line tool, while pinch remains available.
- Raw freehand traces can grow large -> Sampling rejects points that are too close in screen space and preserves only useful control points.
- Touch handles may still feel dense on tight curves -> Neighbor spacing is enforced while dragging control points.
- Hit testing can select the wrong nearby line -> Use a constrained tolerance and prefer the closest path segment under the touch.

## Migration Plan

No database migration is required. Existing path annotations remain valid polylines and can be edited once selected.

## Open Questions

- Point insertion and deletion are deferred until the basic edit loop feels good on-device.
