## Why

The route editor currently builds curved route lines by tapping individual vertices, which is slow for tracing real climbing lines and produces awkward touch targets for later edits. This change makes route drawing feel natural on a phone while keeping the persisted shape as a simple polyline.

## What Changes

- Add one-finger freehand drawing for the curved line tool, sampled into touch-spaced polyline control points.
- Keep pan and zoom available through two-finger gestures while the line tool is active; regular one-finger panning remains available in Select mode.
- Add Select-mode editing for saved route lines by tapping a line, showing control points, and dragging those points with minimum spacing from neighbors.
- Preserve the existing path annotation storage and export model: no Bezier, spline, or schema migration.

## Capabilities

### New Capabilities
- `route-line-drawing`: Touch-first creation and control-point editing for route line annotations.

### Modified Capabilities

## Impact

- Affects route editor gesture handling and rendering in `TopoCanvas`.
- Affects editor draft/save orchestration and annotation update persistence.
- Adds domain geometry helpers and tests for polyline sampling, hit testing, and touch spacing.
- No new runtime dependencies or database migration are expected.
