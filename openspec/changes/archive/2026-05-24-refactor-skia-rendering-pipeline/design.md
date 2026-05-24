## Context

TopoBuilder currently renders annotations in two places with different systems. The editor uses React Native Skia components in `src/editor/TopoCanvas.tsx` and `src/editor/AnnotationShapes.tsx`. PDF export uses `src/export/pdf.ts` to build HTML with an image and separately generated SVG annotation strings.

This split has already required repeated effort to keep editor and PDF behavior aligned. It will become more expensive if the app later adds annotated thumbnails, PNG export, static HTML export, or richer PDF output.

React Native Skia is feasible as the shared rendering foundation for this app:

- The app already depends on `@shopify/react-native-skia`.
- The editor already renders the canonical interactive view with Skia.
- Web support is already configured through `index.web.tsx`, where `LoadSkiaWeb` loads version-matched CanvasKit before Expo Router renders the app.
- React Native Skia documents `Canvas` snapshot support through `makeImageSnapshotAsync` / `makeImageSnapshot`, producing `SkImage` values that can be encoded with `encodeToBytes` or `encodeToBase64`.
- Skia image loading and encoding APIs are available from the same package used on native and web.

The refactor should therefore make Skia the canonical renderer and treat PDF as one consumer of a rasterized Skia output. Future static HTML can wrap the same generated raster image rather than introducing another visual renderer.

## Goals / Non-Goals

**Goals:**

- Make Skia the canonical topo rendering engine across native and web.
- Extract shared render-scene construction so editor rendering and artifact rendering interpret annotations the same way.
- Preserve current editor behavior, including pan/zoom, drawing, selection, label editing, route markers, stamp sizes, line weights, and draw ordering.
- Preserve current PDF export as a user-facing workflow while changing its implementation to embed a Skia-rasterized topo image.
- Keep platform-specific rasterization and file-writing details behind small adapters.
- Document future outputs that can reuse the renderer without building them in this change.

**Non-Goals:**

- Do not add thumbnail generation.
- Do not add PNG export.
- Do not add static HTML export.
- Do not add new annotation types or styling controls.
- Do not change annotation, photo, project, or route persistence schemas.
- Do not require vector annotation output in PDFs.
- Do not attempt pixel-perfect parity with the retired SVG PDF renderer; preserve intended visual behavior and existing layout semantics.

## Decisions

### Decision: Use Skia as the canonical rendering engine

The shared renderer should produce Skia output for both the live editor and generated artifacts. This minimizes drift because native and web use the same drawing library, and it avoids maintaining a separate browser canvas or HTML/SVG rendering stack.

Alternative considered: keep HTML/SVG as the canonical export renderer and rasterize it for thumbnails/PNGs. This would keep PDF close to the current implementation, but it would still leave mobile and web rasterization paths split and require the editor's Skia implementation to stay aligned with an independent SVG implementation.

### Decision: Introduce a shared render scene before artifact generation

Create a shared layer that converts `PhotoAsset` plus `Annotation[]` into image-coordinate primitives or semantic render items. The scene should include paths, lines, circles, rounded rectangles, text, colors, stroke widths, dash patterns, and draw ordering. It should not include editor-only selection handles or text input overlays.

Alternative considered: directly reuse `AnnotationShape` components in hidden/offscreen canvases. This would be faster initially, but it keeps shape decisions embedded in React components and makes generated artifact code depend on interactive editor concerns.

### Decision: Keep editor overlays separate from export rendering

Selection handles, selected-stamp outlines, selected-path control points, and the native `TextInput` label editor are editor interaction affordances. They should remain separate from the shared export scene so generated artifacts always represent saved topo annotations, not transient editing UI.

Alternative considered: snapshot the visible editor canvas when exporting. That would leak pan/zoom and selection state into generated artifacts and would make thumbnails/PDFs dependent on screen size.

### Decision: Render artifacts in full-photo coordinate space

Generated outputs should render the whole photo in deterministic image coordinates at a target output size. The scene builder should scale normalized annotation coordinates to the render target rather than depending on the editor viewport transform.

Alternative considered: render from the editor's current `imageFit` and viewport transform. This would be simpler to connect to existing editor code but would make outputs vary based on device dimensions and user pan/zoom state.

### Decision: Convert PDF export to raster-backed output

PDF export should render the topo to a sufficiently high-resolution image through Skia, then embed that image into a simple PDF document. This gives the PDF the same visual output as future PNG/static HTML artifacts and removes the duplicated SVG annotation renderer.

Alternative considered: keep vector annotations in PDF by generating SVG from the shared scene. This preserves vector scalability, but it keeps a second rendering backend. Since the base topo photo is raster, a high-resolution raster-backed PDF is acceptable and better aligned with the consistency goal.

### Decision: Keep future outputs documented but out of scope

The refactor should leave clear extension points for thumbnails, PNG export, static HTML export, and richer PDF sizing, but it should not build those features. The implementation should first prove that current editor and PDF functionality still work with the shared Skia renderer.

Alternative considered: add thumbnails during the refactor. This would validate one future consumer, but it expands scope and makes regressions harder to attribute.

## Risks / Trade-offs

- Offscreen Skia rendering may have platform-specific constraints -> Start with a small spike/prototype that renders a known photo and annotations to encoded bytes on native and web before replacing PDF export.
- WebGL context limits on web can affect many static canvases -> Use short-lived artifact rendering surfaces and avoid rendering thumbnails as many live Skia canvases in this change.
- Font metrics may differ across native and web even within Skia -> Use shared font choices and tolerate minor platform text metric differences, while keeping route marker and label intent consistent.
- Existing PDF output will lose vector annotation scalability -> Render at a high enough target resolution for print/share quality and document that generated PDF visual consistency is more important than vector annotation preservation.
- Skia image readback has previously caused live editor flashing when used in the render path -> Keep raster snapshots out of live selection/render feedback paths; use them only for explicit artifact generation.
- Tests may not fully validate pixel output in Jest -> Cover scene construction, draw ordering, and adapter integration with unit tests, then rely on targeted manual smoke tests for native/web raster output.

## Migration Plan

1. Add the shared render-scene module and tests without changing existing editor or PDF output.
2. Adapt the Skia editor annotation renderer to consume the shared scene while preserving editor-only overlays.
3. Add a Skia artifact renderer that can render the full photo plus scene to an encoded image at a target size.
4. Replace PDF annotation SVG generation with a raster-backed Skia output embedded in the PDF.
5. Remove duplicated SVG annotation shape helpers after PDF export is verified.
6. Run typecheck, focused Jest tests, and manual editor/PDF smoke tests on native and web where supported.

Rollback is straightforward because this change does not migrate persisted data. If artifact rendering proves unreliable, keep the shared scene and editor refactor while temporarily retaining the existing SVG PDF path.

## Future Intentions

The shared Skia renderer is intended to support later changes:

- Annotated thumbnails generated from the saved topo image.
- PNG or JPEG export.
- Static HTML export that wraps a generated raster image and metadata.
- PDF quality controls based on target paper size or resolution.

These are intentionally not part of this refactor.
