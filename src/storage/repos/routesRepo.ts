import { createId, nowIso } from '@/domain/ids';
import type { Route, RouteType } from '@/domain/types';

import type { TopoDatabase } from '../database';

type RouteRow = {
  id: string;
  topo_id: string;
  name: string;
  grade: string | null;
  route_type: string | null;
  bolt_count: number | null;
  length_m: number | null;
  fa: string | null;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
};

function mapRoute(row: RouteRow): Route {
  return {
    id: row.id,
    topoId: row.topo_id,
    name: row.name,
    grade: row.grade ?? undefined,
    routeType: (row.route_type as RouteType | null) ?? undefined,
    boltCount: row.bolt_count ?? undefined,
    lengthM: row.length_m ?? undefined,
    fa: row.fa ?? undefined,
    description: row.description ?? undefined,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listRoutesForTopo(db: TopoDatabase, topoId: string): Promise<Route[]> {
  const rows = await db.getAllAsync<RouteRow>(
    'SELECT * FROM routes WHERE topo_id = ? ORDER BY created_at ASC',
    topoId,
  );
  return rows.map(mapRoute);
}

export async function countRoutesForTopo(db: TopoDatabase, topoId: string): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM routes WHERE topo_id = ?',
    topoId,
  );
  return row?.count ?? 0;
}

export async function createRoute(
  db: TopoDatabase,
  input: { topoId: string; name?: string; color?: string } & Partial<
    Pick<Route, 'grade' | 'routeType' | 'boltCount' | 'lengthM' | 'fa' | 'description'>
  >,
): Promise<Route> {
  const now = nowIso();
  const route: Route = {
    id: createId('route'),
    topoId: input.topoId,
    name: input.name ?? '',
    color: input.color ?? '#EB5757',
    grade: input.grade,
    routeType: input.routeType,
    boltCount: input.boltCount,
    lengthM: input.lengthM,
    fa: input.fa,
    description: input.description,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO routes
        (id, topo_id, name, grade, route_type, bolt_count, length_m, fa, description, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    route.id,
    route.topoId,
    route.name,
    route.grade ?? null,
    route.routeType ?? null,
    route.boltCount ?? null,
    route.lengthM ?? null,
    route.fa ?? null,
    route.description ?? null,
    route.color,
    route.createdAt,
    route.updatedAt,
  );

  return route;
}

export async function updateRoute(db: TopoDatabase, route: Route): Promise<void> {
  const now = nowIso();
  await db.runAsync(
    `UPDATE routes
        SET name = ?, grade = ?, route_type = ?, bolt_count = ?, length_m = ?,
            fa = ?, description = ?, color = ?, updated_at = ?
      WHERE id = ?`,
    route.name,
    route.grade ?? null,
    route.routeType ?? null,
    route.boltCount ?? null,
    route.lengthM ?? null,
    route.fa ?? null,
    route.description ?? null,
    route.color,
    now,
    route.id,
  );
}

/**
 * Delete a Route. Annotations referencing the deleted route have their
 * `route_id` set to NULL by the FK ON DELETE SET NULL clause; this helper
 * relies on that and does not need to clear them manually.
 */
export async function deleteRoute(db: TopoDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM routes WHERE id = ?', id);
}
