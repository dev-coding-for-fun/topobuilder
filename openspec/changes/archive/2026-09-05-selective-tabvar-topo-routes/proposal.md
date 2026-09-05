## Why

TABVAR catalog data (crags, sectors, and routes) is already synchronized locally for route issues, but cannot be utilized in the Topo workspace. Topo creators and route developers currently have to re-enter route data by hand, while routes are strictly locked as children of topos—preventing routes from existing at a sector before a photo is taken, and preventing a single route from being associated with multiple topos (e.g. multi-pitch climbs or overview/detail topos). Users need a selective import mechanism to bring TABVAR routes into their topo workspace without dumping entire catalogs into their crag list.

## What Changes

- **Selective Workspace Ingestion**: Allow users to selectively adopt crags, sectors, and routes from the local TABVAR catalog into their Topo workspace with search and multi-select filtering.
- **Sector as Container for Topos & Routes**: Re-parent the hierarchy so the Sector is the primary physical container housing both Topos and Routes side-by-side.
- **Physical Separation of Local vs Connected Routes**:
  - Keep existing `tabvar_routes` as the source of truth for external catalog routes, augmented with a universal app-level identifier (`app_id`) alongside the TABVAR source ID (`id`).
  - Keep `routes` as the container for local, user-created routes owned by their parent topo.
  - Link topos to external TABVAR routes via an association table (`topo_tabvar_routes`) that references the app-level `app_id`.
- **Topo-Centric Crag Detail Interface**:
  - Redesign the Sector section in the Crag Detail screen to display vertically arranged Topo Cards, each rendering its photo banner and nested list of associated routes.
  - Add a collapsible "Unmapped Routes" drawer at the bottom of each Sector listing connected TABVAR routes that do not yet have a topo.
  - Add quick action affordances on unmapped routes to either create a new topo (`+ Add Topo`) or link to an existing topo in that sector (`[Link]`).
- **Differentiated Lifecycle & Deletion Protection**:
  - Deleting a Topo cascade-removes its link in `topo_tabvar_routes`, returning connected TABVAR routes to the sector's unmapped drawer without deleting the underlying catalog route.
  - Deleting a Topo deletes local user-created routes on that topo, guarded by an explicit confirmation warning alerting the user that custom routes will be removed.

## Capabilities

### New Capabilities
- `tabvar-route-import`: Searching, selecting, and importing TABVAR crags, sectors, and routes into the active Topo workspace, with unmapped route tracking and topo linking affordances.

### Modified Capabilities
- `topo-and-routes`: Restructuring the relationship between Sectors, Topos, and Routes so Sectors contain both Topos and Routes; supporting `topo_tabvar_routes` associations with the universal `app_id`; rendering Topo Cards with nested routes; and distinguishing deletion semantics between local created routes and connected routes.
- `sector-organization`: Establishing Sectors as the container for both topos and sector-level routes, tracking unmapped external routes and TABVAR sector associations (`tabvar_sector_id`).

## Impact

- **Database**:
  - Migration adding `tabvar_crag_id` to `crags`, `tabvar_sector_id` to `sectors`, `app_id` to `tabvar_routes`, and creating the `topo_tabvar_routes` association table.
  - Backfilling `app_id` for existing `tabvar_routes` rows.
- **Repositories & State**:
  - Updates to `toposRepo`, `routesRepo`, and `sectorsRepo` to query unified routes for topos (local + connected) and unmapped routes for sectors.
  - Store and hook updates in `TopoStore` for linking/unlinking TABVAR routes and importing catalog items.
- **UI Components & Screens**:
  - Redesigned Sector section in `app/crags/[cragId].tsx` with Topo Cards and unmapped drawer.
  - New Route Import/Search modal for TABVAR routes and crags.
  - Updated deletion confirmation dialog with route-type awareness.
  - Updated Topo Editor route selection to support both local and connected routes.
