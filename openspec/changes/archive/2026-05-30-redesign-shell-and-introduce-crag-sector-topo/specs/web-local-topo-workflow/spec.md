## MODIFIED Requirements

### Requirement: Web App Startup
The system SHALL allow users to launch TopoBuilder as an Expo web app in a supported desktop browser.

#### Scenario: Open Crags list in browser
- **WHEN** a user opens the web app URL
- **THEN** the app displays the Crags list screen without a native runtime error

#### Scenario: Navigate web routes
- **WHEN** a user creates or opens a Crag in the web app
- **THEN** the app navigates using the same Crag and editor routes as the native app, namely `/crags/[cragId]` for the Crag detail and `/crags/[cragId]/topos/[topoId]/editor` for the editor

### Requirement: Browser Local Project Persistence
The web app SHALL persist Crags, Sectors, Topos, photo metadata, Routes, and Annotations locally in browser storage.

#### Scenario: Create local web Crag
- **WHEN** a browser user creates a Crag
- **THEN** the Crag appears on the Crags list along with its auto-created default Sector

#### Scenario: Restore Crag after reload
- **WHEN** a browser user reloads the page after creating a Crag
- **THEN** the Crag remains available on the Crags list with its Sectors and Topos intact

#### Scenario: Restore annotations after reload
- **WHEN** a browser user adds annotations to an imported Topo's photo and reloads the page
- **THEN** the Topo reopens with the saved annotations restored

### Requirement: Browser Photo Import
The web app SHALL allow users to import an existing image file from the browser into a Topo.

#### Scenario: Import photo from browser picker
- **WHEN** a browser user chooses to import a photo for a Topo and selects a supported image file
- **THEN** the app attaches the photo to that Topo

#### Scenario: Display imported photo after reload
- **WHEN** a browser user reloads the page after importing a photo into a Topo
- **THEN** the imported photo remains visible in the Topo and the editor

#### Scenario: Cancel browser photo import
- **WHEN** a browser user opens photo import and cancels the file picker
- **THEN** the app leaves the current Topo unchanged

### Requirement: Web Editor Annotation Workflow
The web app SHALL support the core annotation editor workflow for the photo attached to a Topo.

#### Scenario: Open Topo's photo in editor
- **WHEN** a browser user opens a Topo with an attached photo for editing
- **THEN** the editor displays the photo and existing annotations

#### Scenario: Add annotation on web
- **WHEN** a browser user places a supported annotation on the Topo's photo
- **THEN** the annotation is rendered in the editor and persisted to the local Topo

#### Scenario: Edit annotation on web
- **WHEN** a browser user selects and edits a supported existing annotation
- **THEN** the updated annotation is rendered in the editor and persisted to the local Topo

### Requirement: Web Native-Only Feature Boundaries
The web app SHALL avoid promising native-only camera, export, print, or share workflows in the web MVP. The share-placeholder sheet introduced by the redesign is allowed because it explicitly says "coming soon" and performs no real work.

#### Scenario: Camera remains mobile-only on web
- **WHEN** a browser user reaches the camera route or camera action
- **THEN** the app explains that camera capture is mobile-only and directs the user to photo import

#### Scenario: Real export is not offered on web MVP
- **WHEN** a browser user views a Crag, Sector, or Topo
- **THEN** the app does not offer a working web PDF export, print, or share action; only the placeholder share sheet introduced by the redesign is allowed

#### Scenario: Native export remains outside web scope
- **WHEN** the app is running on a native mobile platform
- **THEN** existing native export behavior is not changed by the web MVP requirements
