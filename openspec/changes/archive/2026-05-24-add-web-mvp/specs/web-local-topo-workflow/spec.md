## ADDED Requirements

### Requirement: Web App Startup
The system SHALL allow users to launch TopoBuilder as an Expo web app in a supported desktop browser.

#### Scenario: Open project list in browser
- **WHEN** a user opens the web app URL
- **THEN** the app displays the project list screen without a native runtime error

#### Scenario: Navigate web routes
- **WHEN** a user creates or opens a topo project in the web app
- **THEN** the app navigates using the same project and editor routes as the native app

### Requirement: Browser Local Project Persistence
The web app SHALL persist topo projects, photo metadata, routes, and annotations locally in browser storage.

#### Scenario: Create local web project
- **WHEN** a browser user creates a topo project
- **THEN** the project appears in the project list

#### Scenario: Restore project after reload
- **WHEN** a browser user reloads the page after creating a topo project
- **THEN** the project remains available in the project list

#### Scenario: Restore annotations after reload
- **WHEN** a browser user adds annotations to an imported topo photo and reloads the page
- **THEN** the project reopens with the saved annotations restored

### Requirement: Browser Photo Import
The web app SHALL allow users to import an existing image file from the browser.

#### Scenario: Import photo from browser picker
- **WHEN** a browser user chooses to import a photo and selects a supported image file
- **THEN** the app adds the photo to the current topo project

#### Scenario: Display imported photo after reload
- **WHEN** a browser user reloads the page after importing a photo
- **THEN** the imported photo remains visible in the project and editor

#### Scenario: Cancel browser photo import
- **WHEN** a browser user opens photo import and cancels the file picker
- **THEN** the app leaves the current topo project unchanged

### Requirement: Web Editor Annotation Workflow
The web app SHALL support the core annotation editor workflow for imported photos.

#### Scenario: Open imported photo in editor
- **WHEN** a browser user opens an imported topo photo for editing
- **THEN** the editor displays the photo and existing annotations

#### Scenario: Add annotation on web
- **WHEN** a browser user places a supported annotation on the imported photo
- **THEN** the annotation is rendered in the editor and persisted to the local project

#### Scenario: Edit annotation on web
- **WHEN** a browser user selects and edits a supported existing annotation
- **THEN** the updated annotation is rendered in the editor and persisted to the local project

### Requirement: Web Native-Only Feature Boundaries
The web app SHALL avoid promising native-only camera, export, print, or share workflows in the web MVP.

#### Scenario: Camera remains mobile-only on web
- **WHEN** a browser user reaches the camera route or camera action
- **THEN** the app explains that camera capture is mobile-only and directs the user to photo import

#### Scenario: Export is not offered on web MVP
- **WHEN** a browser user views a topo project
- **THEN** the app does not offer a web PDF export, print, or share action

#### Scenario: Native export remains outside web scope
- **WHEN** the app is running on a native mobile platform
- **THEN** existing native export behavior is not changed by the web MVP requirements
