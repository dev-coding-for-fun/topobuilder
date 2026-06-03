import { createId, nowIso } from '@/domain/ids';
import type { Crag, CragSummary, Sector } from '@/domain/types';

import type { TopoDatabase } from '../database';
import { markToposForCragDirty } from './toposRepo';

type CragRow = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type CragSummaryRow = CragRow & {
  sector_count: number;
  topo_count: number;
};

function mapCrag(row: CragRow): Crag {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCragSummaries(db: TopoDatabase): Promise<CragSummary[]> {
  const rows = await db.getAllAsync<CragSummaryRow>(`
    SELECT
      crags.*,
      COUNT(DISTINCT sectors.id) AS sector_count,
      COUNT(DISTINCT topos.id)   AS topo_count
    FROM crags
    LEFT JOIN sectors ON sectors.crag_id = crags.id
    LEFT JOIN topos   ON topos.sector_id = sectors.id
    GROUP BY crags.id
    ORDER BY crags.updated_at DESC
  `);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sectorCount: row.sector_count,
    topoCount: row.topo_count,
  }));
}

export async function getCrag(db: TopoDatabase, id: string): Promise<Crag | undefined> {
  const row = await db.getFirstAsync<CragRow>('SELECT * FROM crags WHERE id = ?', id);
  return row ? mapCrag(row) : undefined;
}

/**
 * Create a Crag. Per the spec, this also creates a default Sector inside the
 * crag with the same name and timestamps. Both rows are inserted in the same
 * call so callers never see a Crag without its default Sector.
 */
export async function createCrag(
  db: TopoDatabase,
  input: { name: string; description?: string },
): Promise<{ crag: Crag; defaultSector: Sector }> {
  const now = nowIso();
  const cragId = createId('crag');
  const sectorId = createId('sector');
  const sortOrder = await nextCragSortOrder(db);

  const crag: Crag = {
    id: cragId,
    name: input.name,
    description: input.description,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };

  const defaultSector: Sector = {
    id: sectorId,
    cragId,
    name: input.name,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO crags (id, name, description, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      crag.id,
      crag.name,
      crag.description ?? null,
      crag.sortOrder,
      crag.createdAt,
      crag.updatedAt,
    );
    await db.runAsync(
      'INSERT INTO sectors (id, crag_id, name, description, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      defaultSector.id,
      defaultSector.cragId,
      defaultSector.name,
      null,
      defaultSector.sortOrder,
      defaultSector.createdAt,
      defaultSector.updatedAt,
    );
  });

  return { crag, defaultSector };
}

export async function renameCrag(db: TopoDatabase, id: string, name: string): Promise<void> {
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE crags SET name = ?, updated_at = ? WHERE id = ?', name, now, id);
    await markToposForCragDirty(db, id);
  });
}

export async function updateCragDescription(
  db: TopoDatabase,
  id: string,
  description: string | undefined,
): Promise<void> {
  const now = nowIso();
  await db.runAsync(
    'UPDATE crags SET description = ?, updated_at = ? WHERE id = ?',
    description ?? null,
    now,
    id,
  );
}

/**
 * Delete a Crag. ON DELETE CASCADE on the FKs removes its Sectors, Topos,
 * Routes, and Annotations. Photo file removal lives at the store layer
 * because it needs the photo URIs we collect before deletion.
 */
export async function deleteCrag(db: TopoDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM crags WHERE id = ?', id);
}

export async function listPhotoUrisForCrag(db: TopoDatabase, id: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ photo_uri: string | null }>(
    `
    SELECT topos.photo_uri
    FROM topos
    INNER JOIN sectors ON sectors.id = topos.sector_id
    WHERE sectors.crag_id = ?
  `,
    id,
  );
  return rows.map((row) => row.photo_uri).filter((uri): uri is string => Boolean(uri));
}

async function touchCrag(db: TopoDatabase, id: string, when: string): Promise<void> {
  await db.runAsync('UPDATE crags SET updated_at = ? WHERE id = ?', when, id);
}

async function nextCragSortOrder(db: TopoDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ next_sort_order: number | null }>(
    'SELECT COALESCE(MAX(sort_order) + 1, 0) AS next_sort_order FROM crags',
  );
  return row?.next_sort_order ?? 0;
}

export const _cragsInternal = { touchCrag };
