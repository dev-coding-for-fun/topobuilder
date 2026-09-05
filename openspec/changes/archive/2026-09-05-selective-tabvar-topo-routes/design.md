## Context

See `proposal.md` for motivation.

Currently, `topobuilder.db` stores user-created routes in `routes (topo_id NOT NULL)` while TABVAR catalog records live separately in `tabvar_crags`, `tabvar_sectors`, and `tabvar_routes` (populated by the issue synchronization engine). In the UI, `app/crags/[cragId].tsx` treats Sectors purely as headers over Topo rows, hiding routes inside a secondary `TopoInfoSheet`.

## Goals / Non-Goals

**Goals:**
- Enable selective import of TABVAR crags and sectors into the user's Topo workspace.
- Establish the Sector as the parent container housing both Topos and Routes side-by-side.
- Physically separate local created routes (`routes`) and connected external routes (`tabvar_routes`) in both database and UI layers.
- Provide a dual-ID mechanism on `tabvar_routes`: source system numeric `id` and universal app string `app_id` (which topos and annotations reference).
- Build a topo-centric Crag detail UI with Topo Cards containing nested route lists, plus an unmapped routes drawer for the sector.
- Guarantee safe topo deletion: local routes delete with explicit confirmation warning; connected routes remain in the sector.

**Non-Goals:**
- Multi-provider route synchronization or cross-vendor identity reconciliation.
- Pushing route metadata edits back to TABVAR (connected routes are read-only).
- Automatic route-line geometry binding from TABVAR GPS coordinates.

## Decisions

### 1. Leverage Existing `tabvar_*` Tables with an Added Universal `app_id`
*Rationale*: Rather than inventing a generic `external_routes` table or duplicating rows from `tabvar_routes`, we leverage the existing tables already synced locally. We add `app_id TEXT UNIQUE` to `tabvar_routes` so the Topo workspace references the application's universal route identity rather than TABVAR's integer primary key.
*Alternative Considered*: Copying TABVAR routes into `routes` with a `source_type` column. Rejected to preserve strict physical separation between local scratch routes and external catalog items.

### 2. Association Table `topo_tabvar_routes`
*Rationale*: Connecting topos to TABVAR routes requires a many-to-many relationship (a topo can display multiple routes; a route can appear on multiple topos).
```sql
CREATE TABLE IF NOT EXISTS topo_tabvar_routes (
  topo_id        TEXT NOT NULL REFERENCES topos(id) ON DELETE CASCADE,
  route_app_id   TEXT NOT NULL REFERENCES tabvar_routes(app_id) ON DELETE CASCADE,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL,
  PRIMARY KEY (topo_id, route_app_id)
);
CREATE INDEX IF NOT EXISTS idx_topo_tabvar_routes_app_id ON topo_tabvar_routes(route_app_id);
```

### 3. Sector as Container and Dynamic Unmapped Route Querying
*Rationale*: Instead of maintaining a sync flag or secondary state table for "unmapped" routes, unmapped routes for a sector are derived dynamically in SQLite:
```sql
SELECT r.* FROM tabvar_routes r
WHERE r.sector_id = :tabvarSectorId
  AND r.app_id NOT IN (
    SELECT ttr.route_app_id 
    FROM topo_tabvar_routes ttr
    JOIN topos t ON t.id = ttr.topo_id
    WHERE t.sector_id = :localSectorId
  )
ORDER BY r.sort_order ASC, r.name ASC;
```
This is fully reactive and automatically returns routes to the unmapped drawer whenever a topo is deleted or a route is unlinked.

### 4. Topo Card Layout with Nested Route List
*Rationale*: Climbers think in terms of specific wall photos and the routes visible on them. Rendering Topos as full cards with an embedded route list provides immediate context.
- Topo Card Body: Photo preview banner, Topo name, menu/share, and ordered list of associated routes with `[TABVAR]` and `[Local]` badges.
- Bottom of Sector: Collapsible "Unmapped Routes (`count`)" drawer displaying TABVAR routes not yet present on any topo, with quick actions:
  - `+ Add Topo`: Prompts photo selection/camera and creates a new Topo with this route pre-linked.
  - `Link`: Dropdown/sheet to associate with an existing Topo in that sector.

### 5. Differentiated Deletion Semantics and Confirmation Dialog
*Rationale*: Local scratch routes created directly on a topo cannot survive without their parent topo, but connected TABVAR routes must remain in the sector.
- Query local routes on the target topo (`routes WHERE topo_id = ?`).
- If local routes > 0: Render warning dialog: *"This topo has X custom routes created on it that will be permanently deleted. (Y connected TABVAR routes will remain in this sector as unmapped routes)."*
- `DELETE FROM topos WHERE id = ?` cascades to delete local `routes` and association rows in `topo_tabvar_routes`, while leaving `tabvar_routes` untouched.

## Risks / Trade-offs

- **[Large route catalogs causing render lag in Sector view]** → The "Unmapped Routes" list is collapsed by default when there are many routes, with search/filter capabilities in the drawer.
- **[Existing database migration]** → Schema version bumps from 5 to 6. A migration backfills `app_id = 'tabvar_route_' || id` for any pre-existing rows in `tabvar_routes` to guarantee non-null unique keys.
- **[Annotations referencing routes]** → `annotations` table is updated to support both `route_id` (local routes) and `route_app_id` (connected TABVAR routes) so the canvas editor can highlight or bind either route type.
