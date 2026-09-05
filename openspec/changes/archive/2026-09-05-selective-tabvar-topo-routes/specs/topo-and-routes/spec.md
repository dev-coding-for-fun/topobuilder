## MODIFIED Requirements

### Requirement: Route Entity Re-Parented To Topo
The system SHALL support two distinct categories of routes: local user-created routes stored in `routes` (owned by a parent Topo), and external connected routes stored in `tabvar_routes` and associated with topos via `topo_tabvar_routes` referencing `app_id`. Local routes have an `id`, `topo_id`, `name`, `color`, and optional attributes (`grade`, `route_type`, `bolt_count`, `length_m`, `fa`, `description`). Connected routes are read-only catalog entities referenced by `app_id`.

#### Scenario: Route belongs to a Topo
- **WHEN** a local Route exists
- **THEN** its `topo_id` references an existing Topo

#### Scenario: Optional route fields are nullable
- **WHEN** a Route is created with only `name` and `color`
- **THEN** the placeholder fields (`grade`, `route_type`, `bolt_count`, `length_m`, `fa`, `description`) are null and the Route is valid

#### Scenario: External route associated with Topo
- **WHEN** a connected TABVAR route is linked to a Topo
- **THEN** an association record in `topo_tabvar_routes` binds the Topo's `id` to the route's `app_id`

### Requirement: Topo Row In Crag Detail
The Crag detail screen SHALL render each Topo as a vertically arranged Topo Card within its Sector. Each Topo Card MUST display a photo preview banner, the Topo name, share and menu affordances, and a nested list of associated routes (both local and connected), plus an action to link or add routes.

#### Scenario: Topo row shows a thumbnail placeholder
- **WHEN** a Topo Card is rendered without an attached photo
- **THEN** a photo placeholder banner is shown above the Topo metadata and route list

#### Scenario: Topo row affords share and menu
- **WHEN** a Topo Card is rendered
- **THEN** the card header exposes both a share affordance and an overflow menu affordance

#### Scenario: Tapping a Topo row opens the editor
- **WHEN** the user taps the photo banner of a Topo Card
- **THEN** the system navigates to that Topo's editor route at `/crags/[cragId]/topos/[topoId]/editor`

#### Scenario: Topo Card lists associated routes
- **WHEN** a Topo Card is rendered with associated local or connected routes
- **THEN** the card displays an ordered list showing route marker numbers, route names, grades, and source distinction badges

### Requirement: Topo Lifecycle Operations
The system SHALL allow the user to create, rename, and delete a Topo. Deleting a Topo SHALL cascade-delete its local user-created Routes and Annotations, remove its photo file from storage, and delete associations in `topo_tabvar_routes` while leaving the underlying connected `tabvar_routes` records intact in the sector.

#### Scenario: Adding a Topo to a specific Sector
- **WHEN** the user taps "Add topo" inside a Sector on the Crag detail screen
- **THEN** the new Topo is created inside that Sector

#### Scenario: Adding a Topo via the screen-level action
- **WHEN** the user taps the screen-level "New topo" action and the Crag has more than one Sector
- **THEN** the system asks the user to choose the destination Sector before creating the Topo

#### Scenario: Renaming a Topo
- **WHEN** the user renames a Topo via its overflow menu or the Topo info sheet
- **THEN** the new name appears on the Topo Card, the Crag detail counts, and the editor's title

#### Scenario: Deleting a Topo
- **WHEN** the user confirms deletion of a Topo
- **THEN** the Topo, its local Routes, Annotations, and photo file are removed, its external associations in `topo_tabvar_routes` are cleared, and any connected routes remain in the sector

#### Scenario: Deleting a Topo with local routes prompts warning
- **WHEN** the user initiates deletion of a Topo that has local user-created routes
- **THEN** the system displays a confirmation warning explicitly stating that local custom routes will be permanently deleted while connected routes remain in the sector

#### Scenario: Deleting a Topo preserves connected routes
- **WHEN** a Topo with associated TABVAR routes is deleted
- **THEN** the association rows in `topo_tabvar_routes` are deleted, but the `tabvar_routes` records remain intact and return to the sector's unmapped routes drawer

### Requirement: Topo Info Sheet
The system SHALL provide a Topo info sheet that displays editable fields for a Topo's name and description, actions to link unmapped connected routes from the sector, and an inline list of routes with distinct actions for local routes (edit in place / delete) versus connected routes (unlink).

#### Scenario: Opening the Topo info sheet
- **WHEN** the user opens a Topo's overflow menu on the Crag detail screen and selects "Edit topo info"
- **THEN** the system opens the Topo info sheet for that Topo

#### Scenario: Topo info sheet edits Topo metadata
- **WHEN** the user changes the Topo's name or description in the info sheet
- **THEN** the change is persisted and reflected on the Crag detail screen on close

#### Scenario: Editor does not expose the Topo info sheet
- **WHEN** the user is inside the editor
- **THEN** the editor exposes no affordance that opens the Topo info sheet

#### Scenario: Unlinking a connected route
- **WHEN** the user unlinks a connected route from the Topo info sheet
- **THEN** the association in `topo_tabvar_routes` is removed and the route returns to the sector's unmapped routes pool
