## 1. Feasibility Spike

- [x] 1.1 Verify Skia can render a full-photo scene and encode an image on native using the current app dependencies.
- [x] 1.2 Verify Skia can render and encode the same kind of scene on web after CanvasKit loads through `index.web.tsx`.
- [x] 1.3 Document any platform-specific constraints discovered during Skia snapshot and image encoding verification.

## 2. Shared Render Scene

- [x] 2.1 Add shared render-scene types for image-coordinate paths, circles, lines, text, rounded rectangles, colors, stroke widths, dash patterns, and draw order.
- [x] 2.2 Move annotation-to-render-scene conversion into a shared module that accepts photo dimensions and saved annotations.
- [x] 2.3 Add unit tests for render-scene output across paths, labels, route markers, stamp sizes, line weights, and draw ordering.

## 3. Editor Rendering Refactor

- [x] 3.1 Refactor `AnnotationShapes` or its replacement to render shared scene items with Skia components.
- [x] 3.2 Keep editor-only overlays for selected paths, selected labels, selected stamps, drafts, and text editing outside the export scene.
- [x] 3.3 Update editor tests to verify existing annotation rendering and interaction wiring still works.

## 4. Skia Artifact Rendering

- [x] 4.1 Add a Skia artifact renderer that renders a photo plus shared scene into a deterministic full-photo raster at a requested target size.
- [x] 4.2 Add image encoding helpers that return bytes, base64, or a temporary URI as needed by export code.
- [x] 4.3 Keep artifact rendering out of live editor feedback paths to avoid selection or image-readback flashing.

## 5. PDF Export Refactor

- [x] 5.1 Replace the duplicated SVG annotation generation in `src/export/pdf.ts` with a Skia-rasterized topo image.
- [x] 5.2 Embed the generated raster image into the existing PDF HTML/print workflow at an appropriate export resolution.
- [x] 5.3 Preserve native export/share behavior and keep web export hidden or unsupported as it is today.

## 6. Verification

- [x] 6.1 Run typecheck and relevant Jest suites.
- [x] 6.2 Manually smoke-test editor rendering and annotation editing on native.
- [x] 6.3 Manually smoke-test editor rendering on web.
- [x] 6.4 Manually smoke-test native PDF export from an annotated photo.
- [x] 6.5 Confirm no thumbnail, PNG, JPEG, or static HTML export behavior was added by this refactor.
