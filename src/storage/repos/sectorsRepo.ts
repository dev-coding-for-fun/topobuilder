import { createId, nowIso } from '@/domain/ids';
import type { Sector } from '@/domain/types';

import type { TopoDatabase } from '../database';

type SectorRow = {
  id: string;
  crag_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

function mapSector(row: SectorRow): Sector {
  return {
    id: row.id,
    cragId: row.crag_id,
    name: row.name,
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listSectorsForCrag(db: TopoDatabase, cragId: string): Promise<Sector[]> {
  const rows = await db.getAllAsync<SectorRow>(
    'SELECT * FROM sectors WHERE crag_id = ? ORDER BY created_at ASC',
    cragId,
  );
  return rows.map(mapSector);
}

export async function getSector(db: TopoDatabase, id: string): Promise<Sector | undefined> {
  const row = await db.getFirstAsync<SectorRow>('SELECT * FROM sectors WHERE id = ?', id);
  return row ? mapSector(row) : undefined;
}

export async function createSector(
  db: TopoDatabase,
  input: { cragId: string; name: string; description?: string },
): Promise<Sector> {
  const now = nowIso();
  const sector: Sector = {
    id: createId('sector'),
    cragId: input.cragId,
    name: input.name,
    description: input.description,
    createdAt: now,
    updatedAt: now,
  };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO sectors (id, crag_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      sector.id,
      sector.cragId,
      sector.name,
      sector.description ?? null,
      sector.createdAt,
      sector.updatedAt,
    );
    await db.runAsync('UPDATE crags SET updated_at = ? WHERE id = ?', now, sector.cragId);
  });

  return sector;
}

export async function renameSector(db: TopoDatabase, id: string, name: string): Promise<void> {
  const now = nowIso();
  await db.runAsync('UPDATE sectors SET name = ?, updated_at = ? WHERE id = ?', name, now, id);
}

export async function updateSectorDescription(
  db: TopoDatabase,
  id: string,
  description: string | undefined,
): Promise<void> {
  const now = nowIso();
  await db.runAsync(
    'UPDATE sectors SET description = ?, updated_at = ? WHERE id = ?',
    description ?? null,
    now,
    id,
  );
}

/**
 * Delete a Sector. Refuses to delete the parent Crag's only remaining Sector;
 * callers should delete the Crag instead in that case.
 */
export async function deleteSector(db: TopoDatabase, id: string): Promise<void> {
  const sector = await getSector(db, id);
  if (!sector) {
    return;
  }

  const count = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sectors WHERE crag_id = ?',
    sector.cragId,
  );
  if ((count?.count ?? 0) <= 1) {
    throw new Error(
      'Cannot delete the only sector in a crag. Delete the crag itself if that is what you want.',
    );
  }

  await db.runAsync('DELETE FROM sectors WHERE id = ?', id);
}

export async function listPhotoUrisForSector(db: TopoDatabase, id: string): Promise<string[]> {
  const rows = await db.getAllAsync<{ photo_uri: string | null }>(
    'SELECT photo_uri FROM topos WHERE sector_id = ?',
    id,
  );
  return rows.map((row) => row.photo_uri).filter((uri): uri is string => Boolean(uri));
}
