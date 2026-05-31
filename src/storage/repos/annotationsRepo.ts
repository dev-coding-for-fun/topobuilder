import type { Annotation, PathAnnotationKind } from '@/domain/types';
import { isLineWeight } from '@/domain/lineWeights';
import { isStampSize } from '@/domain/stampSizes';

import type { TopoDatabase } from '../database';

type AnnotationRow = {
  id: string;
  topo_id: string;
  route_id: string | null;
  kind: Annotation['kind'];
  color: string;
  label: string | null;
  metadata_json: string | null;
  point_json: string | null;
  points_json: string | null;
  created_at: string;
  updated_at: string;
};

function parseAnnotationMetadata(value: string | null): {
  labelFontSize?: number;
  lineWeight?: Annotation['lineWeight'];
  stampSize?: Annotation['stampSize'];
} {
  if (!value) {
    return {};
  }
  try {
    const metadata = JSON.parse(value) as {
      labelFontSize?: unknown;
      lineWeight?: unknown;
      stampSize?: unknown;
    };
    return {
      labelFontSize:
        typeof metadata.labelFontSize === 'number' && Number.isFinite(metadata.labelFontSize)
          ? metadata.labelFontSize
          : undefined,
      lineWeight: isLineWeight(metadata.lineWeight) ? metadata.lineWeight : undefined,
      stampSize: isStampSize(metadata.stampSize) ? metadata.stampSize : undefined,
    };
  } catch {
    return {};
  }
}

function mapAnnotation(row: AnnotationRow): Annotation {
  const metadata = parseAnnotationMetadata(row.metadata_json);
  const base = {
    id: row.id,
    topoId: row.topo_id,
    routeId: row.route_id ?? undefined,
    kind: row.kind,
    color: row.color,
    label: row.label ?? undefined,
    labelFontSize: metadata.labelFontSize,
    lineWeight: metadata.lineWeight,
    stampSize: metadata.stampSize,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (row.points_json) {
    return {
      ...base,
      kind: row.kind as PathAnnotationKind,
      points: JSON.parse(row.points_json),
    };
  }

  return {
    ...base,
    kind: row.kind as Annotation['kind'] & 'bolt',
    point: row.point_json ? JSON.parse(row.point_json) : { x: 0, y: 0 },
  };
}

export async function listAnnotationsForTopo(
  db: TopoDatabase,
  topoId: string,
): Promise<Annotation[]> {
  const rows = await db.getAllAsync<AnnotationRow>(
    'SELECT * FROM annotations WHERE topo_id = ? ORDER BY created_at ASC',
    topoId,
  );
  return rows.map(mapAnnotation);
}

export async function upsertAnnotation(
  db: TopoDatabase,
  annotation: Annotation,
): Promise<void> {
  const metadata =
    annotation.labelFontSize || annotation.lineWeight || annotation.stampSize
      ? {
          labelFontSize: annotation.labelFontSize,
          lineWeight: annotation.lineWeight,
          stampSize: annotation.stampSize,
        }
      : undefined;

  await db.runAsync(
    `INSERT OR REPLACE INTO annotations (
        id, topo_id, route_id, kind, color, label, metadata_json,
        point_json, points_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    annotation.id,
    annotation.topoId,
    annotation.routeId ?? null,
    annotation.kind,
    annotation.color,
    annotation.label ?? null,
    metadata ? JSON.stringify(metadata) : null,
    'point' in annotation ? JSON.stringify(annotation.point) : null,
    'points' in annotation ? JSON.stringify(annotation.points) : null,
    annotation.createdAt,
    annotation.updatedAt,
  );

  await db.runAsync(
    'UPDATE topos SET updated_at = ? WHERE id = ?',
    annotation.updatedAt,
    annotation.topoId,
  );
}

export async function deleteAnnotation(
  db: TopoDatabase,
  annotationId: string,
  topoId: string,
  now: string,
): Promise<void> {
  await db.runAsync('DELETE FROM annotations WHERE id = ?', annotationId);
  await db.runAsync('UPDATE topos SET updated_at = ? WHERE id = ?', now, topoId);
}
