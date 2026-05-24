## Why

Topo rendering currently has two drawing implementations: the interactive editor renders annotations with React Native Skia, while PDF export independently rebuilds similar shapes as HTML/SVG. This creates ongoing drift risk as labels, route markers, line styles, stamp sizing, and future generated outputs evolve.

Skia is already the editor renderer and the web app already loads CanvasKit, so the most consistent cross-platform path is to make Skia the canonical rendering engine and refactor current behavior around shared render primitives before adding thumbnails, PNG export, static HTML export, or new PDF behavior.

## What Changes

- Introduce a shared topo render scene that converts persisted photo annotations into renderer-neutral, image-coordinate primitives.
- Refactor the existing Skia editor rendering to consume the shared scene while preserving current editor behavior.
- Refactor existing PDF export to use a Skia-rasterized topo image rather than a separate HTML/SVG annotation implementation.
- Preserve the current user-facing editor and export workflows; this change is a refactor, not a new feature launch.
- Document future artifact consumers, including annotated thumbnails, PNG export, static HTML export, and higher-quality raster-backed PDFs, without implementing them in this change.
- Remove or retire duplicated annotation-to-SVG shape construction only after the Skia-backed PDF path is verified.

## Capabilities

### New Capabilities

- `skia-topo-rendering`: Defines the shared, Skia-first rendering pipeline for topo photos and annotations across current editor and export surfaces.

### Modified Capabilities

None.

## Impact

- Affects editor rendering in `src/editor/TopoCanvas.tsx` and `src/editor/AnnotationShapes.tsx`.
- Affects export rendering in `src/export/pdf.ts`.
- Adds shared render-scene modules under `src/rendering/` or a similar domain-neutral location.
- May add focused tests for render-scene construction, draw ordering, and PDF/export integration.
- Does not change annotation persistence, photo persistence, project storage, editor tools, or user-facing thumbnail behavior in this proposal.
