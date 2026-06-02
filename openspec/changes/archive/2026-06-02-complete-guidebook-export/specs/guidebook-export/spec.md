## ADDED Requirements

### Requirement: Scoped Guidebook Export
The system SHALL allow the user to export a guidebook-style PDF for a Topo, Sector, or Crag scope from the existing share affordances.

#### Scenario: Topo export is available from a Topo share affordance
- **WHEN** the user opens the share sheet for a Topo
- **THEN** the system offers a PDF export for that Topo scope

#### Scenario: Sector export is available from a Sector share affordance
- **WHEN** the user opens the share sheet for a Sector
- **THEN** the system offers a PDF export for that Sector scope

#### Scenario: Crag export is available from a Crag share affordance
- **WHEN** the user opens the share sheet for a Crag
- **THEN** the system offers a PDF export for that Crag scope

#### Scenario: Export failure is surfaced
- **WHEN** PDF generation or sharing fails
- **THEN** the share sheet displays an export error and leaves app data unchanged

### Requirement: Topo Guidebook Content
A Topo export SHALL include the Topo name, optional Topo description, parent Crag and Sector context, the annotated topo image when a photo exists, and the Topo's Routes with all populated route fields.

#### Scenario: Topo with routes exports complete route metadata
- **WHEN** the user exports a Topo that has Routes with grade, route type, bolt count, length, first ascent, and description values
- **THEN** the exported PDF includes those populated route fields in the Topo's route list

#### Scenario: Topo without a photo still exports
- **WHEN** the user exports a Topo that has no attached photo
- **THEN** the exported PDF includes the Topo metadata and route list with clear copy indicating that no topo image is attached

#### Scenario: Topo without routes still exports
- **WHEN** the user exports a Topo that has no Routes
- **THEN** the exported PDF includes the Topo metadata, if any is available, but is otherwise just the topo image

### Requirement: Sector Guidebook Content
A Sector export SHALL include the parent Crag context, the Sector name, optional Sector description, and every Topo in the Sector with each Topo's annotated image and Routes.

#### Scenario: Sector export includes every Topo
- **WHEN** the user exports a Sector containing multiple Topos
- **THEN** the exported PDF lists every Topo in that Sector in Sector display order

#### Scenario: Sector export includes nested routes
- **WHEN** the user exports a Sector containing Topos with Routes
- **THEN** each Topo section includes that Topo's Routes and populated route metadata

#### Scenario: Empty Sector still exports
- **WHEN** the user exports a Sector that contains no Topos
- **THEN** the exported PDF includes the Sector metadata and clear copy indicating that no topos are listed

### Requirement: Crag Guidebook Content
A Crag export SHALL include the Crag name, optional Crag description, every Sector in the Crag, every Topo in each Sector, and every Route in each Topo.

#### Scenario: Crag export includes all Sectors
- **WHEN** the user exports a Crag containing multiple Sectors
- **THEN** the exported PDF lists every Sector in Crag display order

#### Scenario: Crag export includes all nested Topos and Routes
- **WHEN** the user exports a Crag with Sectors, Topos, and Routes
- **THEN** the exported PDF includes each Sector, each Topo within its Sector, and each Route within its Topo

#### Scenario: Crag export preserves empty containers
- **WHEN** the user exports a Crag that contains an empty Sector or a Topo with no Routes
- **THEN** the exported PDF includes the empty Sector or Topo rather than omitting it

### Requirement: One Column Guidebook Layout
The exported PDF SHALL use a simple one-column guidebook layout that lists content from top to bottom in application display order.

#### Scenario: Nested content is ordered predictably
- **WHEN** the user exports any guidebook scope
- **THEN** Sectors, Topos, and Routes appear in their persisted sort order with stable fallback ordering

#### Scenario: Route list is numbered by route order
- **WHEN** the exported PDF renders a Topo's route list
- **THEN** route numbers are assigned from the ordered Route list and do not depend on start-marker annotation labels

#### Scenario: Annotated image appears before route list
- **WHEN** the exported PDF renders a Topo that has an attached photo
- **THEN** the annotated topo image appears before that Topo's route list

### Requirement: Export Uses Saved Annotations
The exported annotated topo image SHALL render saved annotations for the Topo using the existing artifact rendering path and SHALL NOT include transient editor UI such as selections, handles, drafts, or text-input overlays.

#### Scenario: Saved annotations render in PDF
- **WHEN** the user exports a Topo with saved route lines, stamps, or labels
- **THEN** the generated PDF image includes those saved annotations

#### Scenario: Editor-only state is not exported
- **WHEN** the user exports after selecting an annotation in the editor
- **THEN** the generated PDF does not include selection outlines, handles, or other editor-only controls
