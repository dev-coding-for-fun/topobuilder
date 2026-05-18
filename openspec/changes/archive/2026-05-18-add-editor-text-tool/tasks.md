## 1. Data Model and Persistence

- [x] 1.1 Add font-size metadata for label annotations.
- [x] 1.2 Extend label annotation typing and factory defaults to support font size while preserving existing point-based labels.
- [x] 1.3 Add nullable annotation metadata persistence for label font size or equivalent structured data.
- [x] 1.4 Add migration coverage for the new persistence field if the database schema changes.
- [x] 1.5 Ensure annotation update flows save text content, point changes, and font-size changes.

## 2. Shared Text Measurement

- [x] 2.1 Create a pure helper that splits label text only on explicit newline characters.
- [x] 2.2 Add text measurement helpers for rendered label bounds based on content and font size.
- [x] 2.3 Add unit tests for newline preservation, long unwrapped lines, and multiline bounds.

## 3. Editor Creation and Editing

- [x] 3.1 Add text-tool tap handling to create a label anchored near the tapped point.
- [x] 3.2 Derive the first label's photo-relative font size from an approximately 12pt screen-space default at the current zoom.
- [x] 3.3 Track the most recently used label font size for the current photo during the editing session.
- [x] 3.4 Reuse the remembered session font size for subsequent labels on the same photo.
- [x] 3.5 Select newly created labels automatically.
- [x] 3.6 Add a native text input overlay for newly created and selected text annotations.
- [x] 3.7 Save edited text content on commit and handle empty text according to the chosen product behavior.

## 4. Selection, Movement, and Font Resizing

- [x] 4.1 Add Select mode hit testing for rendered label bounds.
- [x] 4.2 Render selected label bounds and corner resize handles.
- [x] 4.3 Implement dragging inside selected label bounds to move the anchor point.
- [x] 4.4 Implement corner-handle dragging to update one font size for the entire label.
- [x] 4.5 Update the remembered session font size after label resize.
- [x] 4.6 Enforce minimum and maximum label font sizes.
- [x] 4.7 Keep pan, zoom, path editing, and stamp placement gestures working with the text interactions.

## 5. Rendering and Export

- [x] 5.1 Render text annotations in the Skia canvas using explicit newlines and the annotation font size.
- [x] 5.2 Render labels without font-size metadata using the default label font size.
- [x] 5.3 Update PDF export to use the same text content, anchor point, line breaks, and font size as the editor.
- [x] 5.4 Verify exported text positions and font sizes scale correctly to photo dimensions.

## 6. Validation

- [x] 6.1 Add focused tests for text annotation persistence mapping.
- [x] 6.2 Add interaction coverage for create, select, move, resize, edit, initial font-size, and remembered font-size flows where the test stack supports it.
- [x] 6.3 Run the project lint/typecheck/test commands used by this repo.
- [x] 6.4 Validate the OpenSpec change status before implementation begins.
