## ADDED Requirements

### Requirement: Shared Skia Render Scene
The system SHALL derive topo annotation drawing from a shared render scene that is independent of editor viewport state and usable by current editor and export rendering paths.

#### Scenario: Build scene from saved annotations
- **WHEN** the system prepares to render a topo photo with saved annotations
- **THEN** it produces image-coordinate render items for the photo's paths, stamps, labels, route markers, colors, sizes, and draw order

#### Scenario: Exclude editor-only affordances
- **WHEN** the system builds the shared render scene
- **THEN** it excludes selected-object handles, selected outlines, draft-only annotations, pan state, zoom state, and native text input overlays

### Requirement: Skia Editor Rendering Uses Shared Scene
The editor SHALL render persisted topo annotations through the shared Skia rendering pipeline while preserving existing interaction behavior.

#### Scenario: Render annotations in the editor
- **WHEN** a user opens a photo in the editor
- **THEN** the editor displays the saved annotations using the shared render scene through Skia

#### Scenario: Preserve editor interactions
- **WHEN** a user draws, selects, moves, resizes, edits, or deletes annotations
- **THEN** the editor preserves the existing behavior for interaction overlays and annotation persistence

### Requirement: Raster-Backed PDF Export
The system SHALL produce existing PDF exports from a Skia-rasterized topo image instead of independently generated SVG annotation markup.

#### Scenario: Export PDF from annotated photo
- **WHEN** a native user exports a topo PDF for a photo with annotations
- **THEN** the PDF contains a rasterized image rendered from the same shared Skia scene used by the editor

#### Scenario: Preserve PDF workflow
- **WHEN** a native user completes PDF export
- **THEN** the existing export and share workflow remains available without requiring changes to project or annotation data

### Requirement: Future Artifact Extension Points
The rendering refactor SHALL provide an architecture that can support future generated artifacts without implementing new artifact features in this change.

#### Scenario: Defer thumbnail generation
- **WHEN** this refactor is complete
- **THEN** the system does not generate, persist, or display new annotated thumbnails

#### Scenario: Defer static image and HTML exports
- **WHEN** this refactor is complete
- **THEN** the system does not add PNG export, JPEG export, or static HTML export behavior
