# topo-and-routes Specification

## Purpose
Define Topo and Route data, Crag detail presentation, lifecycle behavior, and inline route editing.
## Requirements
### Requirement: Topo Entity
The system SHALL model a leaf entity called a **Topo** that belongs to exactly one Sector and represents a single annotated image. A Topo has an `id`, a `sector_id`, a `name`, an optional `description`, optional photo fields (`photo_uri`, `photo_width`, `photo_height`), and `created_at` / `updated_at` timestamps. The previous standalone "photo" entity is replaced by the Topo entity.

#### Scenario: Every Topo belongs to a Sector
- **WHEN** a Topo exists
- **THEN** it has a non-null `sector_id` referencing an existing Sector

#### Scenario: A Topo may exist without a photo
- **WHEN** a Topo is created without a photo attached
- **THEN** its photo fields are null and the Topo is still valid

### Requirement: Route Entity Re-Parented To Topo
The system SHALL store Routes as children of a Topo (not a Crag). Each Route has an `id`, a `topo_id`, a `name`, a `color`, `created_at` / `updated_at` timestamps, and the following optional placeholder fields used by the inline route editor: `grade`, `route_type`, `bolt_count`, `length_m`, `fa`, `description`.

#### Scenario: Route belongs to a Topo
- **WHEN** a Route exists
- **THEN** its `topo_id` references an existing Topo

#### Scenario: Optional route fields are nullable
- **WHEN** a Route is created with only `name` and `color`
- **THEN** the placeholder fields (`grade`, `route_type`, `bolt_count`, `length_m`, `fa`, `description`) are null and the Route is valid

### Requirement: Topo Row In Crag Detail
The Crag detail screen SHALL render each Topo as a row inside its Sector. Each Topo row MUST contain a thumbnail-placeholder slot, the Topo's name, a brief summary line (e.g. route count or first route's grade if available), a share affordance, and an overflow menu.

#### Scenario: Topo row shows a thumbnail placeholder
- **WHEN** a Topo row is rendered
- **THEN** a thumbnail-placeholder tile (neutral fill with a placeholder icon) is shown in a fixed slot beside the Topo name

#### Scenario: Topo row affords share and menu
- **WHEN** a Topo row is rendered
- **THEN** the row exposes both a share affordance and an overflow affordance

#### Scenario: Tapping a Topo row opens the editor
- **WHEN** the user taps the body of a Topo row
- **THEN** the system navigates to that Topo's editor route at `/crags/[cragId]/topos/[topoId]/editor`

### Requirement: Topo Lifecycle Operations
The system SHALL allow the user to create, rename, and delete a Topo. Deleting a Topo SHALL cascade-delete its Routes and Annotations and SHALL remove its photo file from device storage.

#### Scenario: Adding a Topo to a specific Sector
- **WHEN** the user taps "Add topo" inside a Sector header on the Crag detail screen
- **THEN** the new Topo is created inside that Sector

#### Scenario: Adding a Topo via the screen-level action
- **WHEN** the user taps the screen-level "New topo" action and the Crag has more than one Sector
- **THEN** the system asks the user to choose the destination Sector before creating the Topo

#### Scenario: Renaming a Topo
- **WHEN** the user renames a Topo via its overflow menu or the Topo info sheet
- **THEN** the new name appears on the Topo row, the Crag detail counts, and the editor's title

#### Scenario: Deleting a Topo
- **WHEN** the user confirms deletion of a Topo
- **THEN** the Topo and all its Routes, Annotations, and photo file are removed

### Requirement: Topo Info Sheet
The system SHALL provide a Topo info sheet that displays editable fields for a Topo's name and description and an inline list of Routes. The sheet SHALL be reachable from the Topo row's overflow menu on the Crag detail screen. The editor screen SHALL NOT link into the Topo info sheet.

#### Scenario: Opening the Topo info sheet
- **WHEN** the user opens a Topo's overflow menu on the Crag detail screen and selects "Edit topo info"
- **THEN** the system opens the Topo info sheet for that Topo

#### Scenario: Topo info sheet edits Topo metadata
- **WHEN** the user changes the Topo's name or description in the info sheet
- **THEN** the change is persisted and reflected on the Crag detail screen on close

#### Scenario: Editor does not expose the Topo info sheet
- **WHEN** the user is inside the editor
- **THEN** the editor exposes no affordance that opens the Topo info sheet

### Requirement: Inline Route Editor
The Topo info sheet SHALL render the Topo's Routes in an inline editor (Pattern A) where each Route's fields (`name`, `grade`, `route_type`, `bolt_count`, `length_m`, `fa`, `description`) are editable in place, plus an action to add a new Route and an action to delete an existing Route.

#### Scenario: Inline edit of a route field
- **WHEN** the user changes the grade of a Route in the inline editor
- **THEN** the new grade is persisted and reflected without leaving the Topo info sheet

#### Scenario: Adding a Route
- **WHEN** the user taps "Add route" in the Topo info sheet
- **THEN** a new Route is created on the Topo and immediately rendered as an editable inline row

#### Scenario: Deleting a Route from inline editor
- **WHEN** the user removes a Route from the Topo info sheet
- **THEN** the Route and any Annotations referencing it are updated (Annotations have their `route_id` set to null, the Route is deleted)

### Requirement: Topo Sort Order
The system SHALL store a persistent sort order value for each Topo within its parent Sector and SHALL render Topo lists using that order with stable fallback ordering.

#### Scenario: New Topo receives parent-scoped sort order
- **WHEN** the user creates a Topo inside a Sector
- **THEN** the new Topo receives a sort order value suitable for placing it after existing Topos in that Sector

#### Scenario: Crag detail renders Topos by sort order
- **WHEN** the Crag detail screen renders multiple Topos inside a Sector
- **THEN** the Topos appear by persisted sort order within the Sector

#### Scenario: Sector and Crag exports use Topo sort order
- **WHEN** the user exports a Sector or Crag
- **THEN** each Sector's Topos are listed by persisted sort order

### Requirement: Route Sort Order
The system SHALL store a persistent sort order value for each Route within its parent Topo and SHALL render route lists using that order with stable fallback ordering.

#### Scenario: New Route receives parent-scoped sort order
- **WHEN** the user creates a Route inside a Topo
- **THEN** the new Route receives a sort order value suitable for placing it after existing Routes in that Topo

#### Scenario: Topo info renders Routes by sort order
- **WHEN** the Topo info sheet renders multiple Routes
- **THEN** the Routes appear by persisted sort order within the Topo

#### Scenario: Export route numbers follow Route sort order
- **WHEN** the user exports a Topo, Sector, or Crag
- **THEN** each Topo's exported route numbers follow persisted Route sort order

