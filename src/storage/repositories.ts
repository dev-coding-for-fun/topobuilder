import type { Annotation, PathAnnotationKind, PhotoAsset, Route, TopoProject, TopoSummary } from '@/domain/types';
import { isStampSize } from '@/domain/stampSizes';

import type { TopoDatabase } from './database';

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

type PhotoRow = {
  id: string;
  topo_id: string;
  uri: string;
  width: number;
  height: number;
  created_at: string;
};

type RouteRow = {
  id: string;
  topo_id: string;
  name: string;
  grade: string | null;
  color: string;
  created_at: string;
  updated_at: string;
};

type AnnotationRow = {
  id: string;
  topo_id: string;
  photo_id: string;
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

export async function listTopoSummaries(db: TopoDatabase): Promise<TopoSummary[]> {
  const rows = await db.getAllAsync<ProjectRow & { photo_count: number; route_count: number }>(
    `
    SELECT
      topo_projects.*,
      COUNT(DISTINCT photo_assets.id) AS photo_count,
      COUNT(DISTINCT routes.id) AS route_count
    FROM topo_projects
    LEFT JOIN photo_assets ON photo_assets.topo_id = topo_projects.id
    LEFT JOIN routes ON routes.topo_id = topo_projects.id
    GROUP BY topo_projects.id
    ORDER BY topo_projects.updated_at DESC
  `,
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photoCount: row.photo_count,
    routeCount: row.route_count,
  }));
}

export async function getTopoProject(db: TopoDatabase, id: string): Promise<TopoProject | undefined> {
  const project = await db.getFirstAsync<ProjectRow>(
    'SELECT * FROM topo_projects WHERE id = ?',
    id,
  );

  if (!project) {
    return undefined;
  }

  const [photos, routes, annotations] = await Promise.all([
    db.getAllAsync<PhotoRow>('SELECT * FROM photo_assets WHERE topo_id = ? ORDER BY created_at ASC', id),
    db.getAllAsync<RouteRow>('SELECT * FROM routes WHERE topo_id = ? ORDER BY created_at ASC', id),
    db.getAllAsync<AnnotationRow>('SELECT * FROM annotations WHERE topo_id = ? ORDER BY created_at ASC', id),
  ]);

  return {
    id: project.id,
    name: project.name,
    description: project.description ?? undefined,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    photos: photos.map(mapPhoto),
    routes: routes.map(mapRoute),
    annotations: annotations.map(mapAnnotation),
  };
}

export async function insertTopoProject(db: TopoDatabase, project: TopoProject) {
  await db.runAsync(
    'INSERT INTO topo_projects (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    project.id,
    project.name,
    project.description ?? null,
    project.createdAt,
    project.updatedAt,
  );

  await Promise.all(project.routes.map((route) => insertRoute(db, route)));
}

export async function insertPhotoAsset(db: TopoDatabase, photo: PhotoAsset) {
  await db.runAsync(
    'INSERT INTO photo_assets (id, topo_id, uri, width, height, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    photo.id,
    photo.topoId,
    photo.uri,
    photo.width,
    photo.height,
    photo.createdAt,
  );
  await touchProject(db, photo.topoId, photo.createdAt);
}

export async function insertRoute(db: TopoDatabase, route: Route) {
  await db.runAsync(
    'INSERT INTO routes (id, topo_id, name, grade, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    route.id,
    route.topoId,
    route.name,
    route.grade ?? null,
    route.color,
    route.createdAt,
    route.updatedAt,
  );
}

export async function upsertAnnotation(db: TopoDatabase, annotation: Annotation) {
  const metadata =
    annotation.labelFontSize || annotation.stampSize
      ? { labelFontSize: annotation.labelFontSize, stampSize: annotation.stampSize }
      : undefined;
  await db.runAsync(
    `
    INSERT OR REPLACE INTO annotations (
      id, topo_id, photo_id, route_id, kind, color, label, metadata_json, point_json, points_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    annotation.id,
    annotation.topoId,
    annotation.photoId,
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
  await touchProject(db, annotation.topoId, annotation.updatedAt);
}

export async function deleteAnnotation(db: TopoDatabase, annotationId: string, topoId: string, now: string) {
  await db.runAsync('DELETE FROM annotations WHERE id = ?', annotationId);
  await touchProject(db, topoId, now);
}

async function touchProject(db: TopoDatabase, topoId: string, updatedAt: string) {
  await db.runAsync('UPDATE topo_projects SET updated_at = ? WHERE id = ?', updatedAt, topoId);
}

function mapPhoto(row: PhotoRow): PhotoAsset {
  return {
    id: row.id,
    topoId: row.topo_id,
    uri: row.uri,
    width: row.width,
    height: row.height,
    createdAt: row.created_at,
  };
}

function mapRoute(row: RouteRow): Route {
  return {
    id: row.id,
    topoId: row.topo_id,
    name: row.name,
    grade: row.grade ?? undefined,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAnnotation(row: AnnotationRow): Annotation {
  const metadata = parseAnnotationMetadata(row.metadata_json);
  const base = {
    id: row.id,
    topoId: row.topo_id,
    photoId: row.photo_id,
    routeId: row.route_id ?? undefined,
    kind: row.kind,
    color: row.color,
    label: row.label ?? undefined,
    labelFontSize: metadata.labelFontSize,
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

function parseAnnotationMetadata(value: string | null): { labelFontSize?: number; stampSize?: Annotation['stampSize'] } {
  if (!value) {
    return {};
  }

  try {
    const metadata = JSON.parse(value) as { labelFontSize?: unknown; stampSize?: unknown };
    return {
      labelFontSize:
        typeof metadata.labelFontSize === 'number' && Number.isFinite(metadata.labelFontSize)
          ? metadata.labelFontSize
          : undefined,
      stampSize: isStampSize(metadata.stampSize) ? metadata.stampSize : undefined,
    };
  } catch {
    return {};
  }
}
