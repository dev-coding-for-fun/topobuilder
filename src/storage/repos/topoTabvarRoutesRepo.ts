import { nowIso } from '@/domain/ids';
import type { TabvarRoute } from '@/domain/types';

import type { TopoDatabase } from '../database';

type TabvarRouteRow = {
  id: number;
  app_id: string;
  crag_id: number;
  sector_id: number;
  name: string;
  alt_names: string | null;
  grade_yds: string | null;
  status: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  sort_order: number | null;
  bolt_count: number | null;
  pitch_count: number | null;
  route_length: number | null;
  climb_style: string | null;
  year: number | null;
  route_built_date: string | null;
  first_ascent_by: string | null;
  first_ascent_date: string | null;
  crag_name: string | null;
  sector_name: string | null;
  created_at: string | null;
};

function mapTabvarRoute(row: TabvarRouteRow): TabvarRoute {
  return {
    id: row.id,
    appId: row.app_id,
    cragId: row.crag_id,
    sectorId: row.sector_id,
    name: row.name,
    altNames: row.alt_names ?? undefined,
    gradeYds: row.grade_yds ?? undefined,
    status: row.status ?? undefined,
    boltCount: row.bolt_count ?? undefined,
    pitchCount: row.pitch_count ?? undefined,
    routeLength: row.route_length ?? undefined,
    climbStyle: row.climb_style ?? undefined,
    cragName: row.crag_name ?? undefined,
    sectorName: row.sector_name ?? undefined,
    sortOrder: row.sort_order ?? undefined,
  };
}

async function markTopoDirty(db: TopoDatabase, topoId: string, when: string): Promise<void> {
  await db.runAsync(
    'UPDATE topos SET updated_at = ?, tabvar_dirty = 1 WHERE id = ?',
    when,
    topoId,
  );
}

async function nextSortOrder(db: TopoDatabase, topoId: string): Promise<number> {
  const row = await db.getFirstAsync<{ next_sort_order: number | null }>(
    `SELECT COALESCE(MAX(sort_order) + 1, 0) AS next_sort_order
     FROM (
       SELECT sort_order FROM routes WHERE topo_id = ?
       UNION ALL
       SELECT sort_order FROM topo_tabvar_routes WHERE topo_id = ?
     )`,
    topoId,
    topoId,
  );
  return row?.next_sort_order ?? 0;
}

export type TopoRouteIdentifier =
  | { kind: 'local'; id: string }
  | { kind: 'tabvar'; appId: string };

export async function reorderTopoRoutes(
  db: TopoDatabase,
  topoId: string,
  orderedRoutes: TopoRouteIdentifier[],
): Promise<void> {
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    for (let index = 0; index < orderedRoutes.length; index++) {
      const item = orderedRoutes[index];
      if (item.kind === 'local') {
        await db.runAsync(
          'UPDATE routes SET sort_order = ?, updated_at = ? WHERE id = ? AND topo_id = ?',
          index,
          now,
          item.id,
          topoId,
        );
      } else {
        await db.runAsync(
          'UPDATE topo_tabvar_routes SET sort_order = ? WHERE topo_id = ? AND route_app_id = ?',
          index,
          topoId,
          item.appId,
        );
      }
    }
    await markTopoDirty(db, topoId, now);
  });
}

export async function linkTabvarRouteToTopo(
  db: TopoDatabase,
  topoId: string,
  routeAppId: string,
  targetSortOrder?: number,
): Promise<void> {
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    let sortOrder: number;
    if (targetSortOrder !== undefined) {
      sortOrder = Math.max(0, targetSortOrder);
      await db.runAsync(
        'UPDATE routes SET sort_order = sort_order + 1 WHERE topo_id = ? AND sort_order >= ?',
        topoId,
        sortOrder,
      );
      await db.runAsync(
        'UPDATE topo_tabvar_routes SET sort_order = sort_order + 1 WHERE topo_id = ? AND sort_order >= ?',
        topoId,
        sortOrder,
      );
    } else {
      sortOrder = await nextSortOrder(db, topoId);
    }

    await db.runAsync(
      `INSERT INTO topo_tabvar_routes (topo_id, route_app_id, sort_order, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(topo_id, route_app_id) DO UPDATE SET sort_order = excluded.sort_order`,
      topoId,
      routeAppId,
      sortOrder,
      now,
    );
    await markTopoDirty(db, topoId, now);
  });
}

export async function unlinkTabvarRouteFromTopo(
  db: TopoDatabase,
  topoId: string,
  routeAppId: string,
): Promise<void> {
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'DELETE FROM topo_tabvar_routes WHERE topo_id = ? AND route_app_id = ?',
      topoId,
      routeAppId,
    );
    await markTopoDirty(db, topoId, now);
  });
}

export async function listTabvarRoutesForTopo(
  db: TopoDatabase,
  topoId: string,
): Promise<TabvarRoute[]> {
  const rows = await db.getAllAsync<TabvarRouteRow & { topo_sort_order: number | null }>(
    `SELECT routes.*, ttr.sort_order AS topo_sort_order
     FROM tabvar_routes routes
     JOIN topo_tabvar_routes ttr ON ttr.route_app_id = routes.app_id
     WHERE ttr.topo_id = ?
     ORDER BY ttr.sort_order ASC, routes.name ASC`,
    topoId,
  );
  return rows.map((row) => ({
    ...mapTabvarRoute(row),
    sortOrder: row.topo_sort_order ?? row.sort_order ?? undefined,
  }));
}

export async function countTabvarRoutesForTopo(
  db: TopoDatabase,
  topoId: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM topo_tabvar_routes WHERE topo_id = ?',
    topoId,
  );
  return row?.count ?? 0;
}

export async function listUnmappedTabvarRoutesForSector(
  db: TopoDatabase,
  sectorId: string,
): Promise<TabvarRoute[]> {
  const sector = await db.getFirstAsync<{ tabvar_sector_id: number | null }>(
    'SELECT tabvar_sector_id FROM sectors WHERE id = ?',
    sectorId,
  );
  if (!sector || !sector.tabvar_sector_id) {
    return [];
  }

  const rows = await db.getAllAsync<TabvarRouteRow>(
    `SELECT routes.*
     FROM tabvar_routes routes
     WHERE routes.sector_id = ?
       AND (routes.status IS NULL OR routes.status != 'Deleted')
       AND routes.app_id NOT IN (
         SELECT ttr.route_app_id
         FROM topo_tabvar_routes ttr
         JOIN topos t ON t.id = ttr.topo_id
         WHERE t.sector_id = ?
       )
     ORDER BY routes.sort_order ASC, routes.name ASC`,
    sector.tabvar_sector_id,
    sectorId,
  );

  return rows.map(mapTabvarRoute);
}

export async function countUnmappedTabvarRoutesForSector(
  db: TopoDatabase,
  sectorId: string,
): Promise<number> {
  const sector = await db.getFirstAsync<{ tabvar_sector_id: number | null }>(
    'SELECT tabvar_sector_id FROM sectors WHERE id = ?',
    sectorId,
  );
  if (!sector || !sector.tabvar_sector_id) {
    return 0;
  }

  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count
     FROM tabvar_routes routes
     WHERE routes.sector_id = ?
       AND (routes.status IS NULL OR routes.status != 'Deleted')
       AND routes.app_id NOT IN (
         SELECT ttr.route_app_id
         FROM topo_tabvar_routes ttr
         JOIN topos t ON t.id = ttr.topo_id
         WHERE t.sector_id = ?
       )`,
    sector.tabvar_sector_id,
    sectorId,
  );

  return row?.count ?? 0;
}
