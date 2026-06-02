import { createId, nowIso } from '@/domain/ids';
import type { Topo, TopoEditorBundle } from '@/domain/types';

import type { TopoDatabase } from '../database';
import { listAnnotationsForTopo } from './annotationsRepo';
import { listRoutesForTopo } from './routesRepo';

type TopoRow = {
  id: string;
  sector_id: string;
  name: string;
  description: string | null;
  photo_uri: string | null;
  photo_width: number | null;
  photo_height: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

function mapTopo(row: TopoRow): Topo {
  return {
    id: row.id,
    sectorId: row.sector_id,
    name: row.name,
    description: row.description ?? undefined,
    photoUri: row.photo_uri ?? undefined,
    photoWidth: row.photo_width ?? undefined,
    photoHeight: row.photo_height ?? undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getTopo(db: TopoDatabase, id: string): Promise<Topo | undefined> {
  const row = await db.getFirstAsync<TopoRow>('SELECT * FROM topos WHERE id = ?', id);
  return row ? mapTopo(row) : undefined;
}

export async function listToposForSector(db: TopoDatabase, sectorId: string): Promise<Topo[]> {
  const rows = await db.getAllAsync<TopoRow>(
    'SELECT * FROM topos WHERE sector_id = ? ORDER BY sort_order ASC, created_at ASC, id ASC',
    sectorId,
  );
  return rows.map(mapTopo);
}

export async function listToposForCrag(db: TopoDatabase, cragId: string): Promise<Topo[]> {
  const rows = await db.getAllAsync<TopoRow>(
    `SELECT topos.* FROM topos
     INNER JOIN sectors ON sectors.id = topos.sector_id
     WHERE sectors.crag_id = ?
     ORDER BY sectors.sort_order ASC, sectors.created_at ASC, sectors.id ASC,
              topos.sort_order ASC, topos.created_at ASC, topos.id ASC`,
    cragId,
  );
  return rows.map(mapTopo);
}

async function nextDefaultTopoNameForSector(
  db: TopoDatabase,
  sectorId: string,
): Promise<string> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM topos WHERE sector_id = ?',
    sectorId,
  );
  return `Topo ${(row?.count ?? 0) + 1}`;
}

export async function createTopo(
  db: TopoDatabase,
  input: { sectorId: string; name?: string; description?: string },
): Promise<Topo> {
  const now = nowIso();
  const name = input.name ?? (await nextDefaultTopoNameForSector(db, input.sectorId));
  const sortOrder = await nextTopoSortOrder(db, input.sectorId);
  const topo: Topo = {
    id: createId('topo'),
    sectorId: input.sectorId,
    name,
    description: input.description,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO topos
        (id, sector_id, name, description, photo_uri, photo_width, photo_height, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?)`,
      topo.id,
      topo.sectorId,
      topo.name,
      topo.description ?? null,
      topo.sortOrder,
      topo.createdAt,
      topo.updatedAt,
    );
    await touchAncestors(db, topo.sectorId, now);
  });

  return topo;
}

export async function renameTopo(db: TopoDatabase, id: string, name: string): Promise<void> {
  const now = nowIso();
  await db.runAsync('UPDATE topos SET name = ?, updated_at = ? WHERE id = ?', name, now, id);
}

export async function updateTopoDescription(
  db: TopoDatabase,
  id: string,
  description: string | undefined,
): Promise<void> {
  const now = nowIso();
  await db.runAsync(
    'UPDATE topos SET description = ?, updated_at = ? WHERE id = ?',
    description ?? null,
    now,
    id,
  );
}

export async function attachPhotoToTopo(
  db: TopoDatabase,
  id: string,
  photo: { uri: string; width: number; height: number },
): Promise<void> {
  const now = nowIso();
  await db.runAsync(
    `UPDATE topos
       SET photo_uri = ?, photo_width = ?, photo_height = ?, updated_at = ?
     WHERE id = ?`,
    photo.uri,
    photo.width,
    photo.height,
    now,
    id,
  );

  const topo = await getTopo(db, id);
  if (topo) {
    await touchAncestors(db, topo.sectorId, now);
  }
}

export async function deleteTopo(db: TopoDatabase, id: string): Promise<string | undefined> {
  const topo = await getTopo(db, id);
  if (!topo) {
    return undefined;
  }
  await db.runAsync('DELETE FROM topos WHERE id = ?', id);
  return topo.photoUri;
}

export async function loadTopoEditorBundle(
  db: TopoDatabase,
  id: string,
): Promise<TopoEditorBundle | undefined> {
  const topo = await getTopo(db, id);
  if (!topo) {
    return undefined;
  }
  const [routes, annotations] = await Promise.all([
    listRoutesForTopo(db, id),
    listAnnotationsForTopo(db, id),
  ]);
  return { topo, routes, annotations };
}

async function touchAncestors(
  db: TopoDatabase,
  sectorId: string,
  when: string,
): Promise<void> {
  await db.runAsync('UPDATE sectors SET updated_at = ? WHERE id = ?', when, sectorId);
  await db.runAsync(
    `UPDATE crags SET updated_at = ?
       WHERE id = (SELECT crag_id FROM sectors WHERE id = ?)`,
    when,
    sectorId,
  );
}

async function nextTopoSortOrder(db: TopoDatabase, sectorId: string): Promise<number> {
  const row = await db.getFirstAsync<{ next_sort_order: number | null }>(
    'SELECT COALESCE(MAX(sort_order) + 1, 0) AS next_sort_order FROM topos WHERE sector_id = ?',
    sectorId,
  );
  return row?.next_sort_order ?? 0;
}

export const _toposInternal = { touchAncestors };
