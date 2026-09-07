import { ImageFormat } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { GuidebookExportBundle, GuidebookTopo, PhotoAsset, Route, TopoProject } from '@/domain/types';
import { renderTopoRasterBase64 } from '@/rendering/artifact';

export type TopoImageExportOptions = {
  filename?: string;
  includeRoutes?: boolean;
  quality?: number;
  sectorName?: string;
  targetWidth?: number;
};

export type TopoExportFilenameInput = {
  topoName?: string;
  sectorName?: string;
  routes?: Route[];
};

export function resolveTopoExportBaseFilename(input: TopoExportFilenameInput): string {
  const topoName = input.topoName?.trim() || '';
  const routes = input.routes ?? [];
  const sectorName = input.sectorName?.trim();

  // "Topo N" for any N, or empty/no name
  const isDefaultOrEmpty = !topoName || /^Topo\s+\d+$/i.test(topoName);

  if (isDefaultOrEmpty) {
    if (routes.length === 1 && routes[0].name?.trim()) {
      return routes[0].name.trim();
    }
    const topoLabel = topoName || 'Topo 1';
    return sectorName ? `${sectorName} - ${topoLabel}` : topoLabel;
  }

  return topoName;
}

export function sanitizeImageFilename(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'topo';
}

export function unifiedRoutesForTopo(topo: GuidebookTopo): Route[] {
  const localRoutes = topo.routes ?? [];
  const tabvarRoutes = topo.tabvarRoutes ?? [];

  if (tabvarRoutes.length === 0) {
    return [...localRoutes].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  const convertedTabvarRoutes: Route[] = tabvarRoutes.map((tr, index) => ({
    id: tr.appId,
    topoId: topo.id,
    name: tr.name,
    grade: tr.gradeYds,
    boltCount: tr.boltCount,
    lengthM: tr.routeLength,
    color: '#111827',
    sortOrder: tr.sortOrder ?? 1000 + index,
    createdAt: topo.createdAt,
    updatedAt: topo.updatedAt,
  }));

  return [...localRoutes, ...convertedTabvarRoutes].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
}

export function projectForGuidebookTopo(topo: GuidebookTopo): TopoProject | undefined {
  if (!topo.photo) return undefined;
  return {
    id: topo.id,
    name: topo.name,
    description: topo.description,
    createdAt: topo.createdAt,
    updatedAt: topo.updatedAt,
    photos: [topo.photo],
    routes: unifiedRoutesForTopo(topo),
    annotations: topo.annotations,
  };
}

export function extractSingleTopoFromBundle(bundle: GuidebookExportBundle): GuidebookTopo {
  if (bundle.scope !== 'topo') {
    throw new Error('Image export is only available for single topo exports.');
  }
  const topo = bundle.crag.sectors[0]?.topos[0];
  if (!topo) {
    throw new Error('No topo found in export bundle.');
  }
  return topo;
}

export async function exportSingleTopoImage(
  bundle: GuidebookExportBundle,
  options?: TopoImageExportOptions,
): Promise<string> {
  const topo = extractSingleTopoFromBundle(bundle);
  if (!topo.photo) {
    throw new Error('Topo does not have an attached photo to export.');
  }
  const project = projectForGuidebookTopo(topo);
  if (!project) {
    throw new Error('Topo project could not be constructed for export.');
  }
  const sectorName = bundle.crag.sectors[0]?.name;
  return exportTopoImage(project, topo.photo, {
    ...options,
    sectorName: options?.sectorName ?? sectorName,
  });
}

export async function exportTopoImage(
  project: TopoProject,
  photo: PhotoAsset,
  options?: TopoImageExportOptions,
): Promise<string> {
  const raster = await renderTopoRasterBase64(project, photo, {
    format: ImageFormat.WEBP,
    includeRoutes: options?.includeRoutes,
    quality: options?.quality ?? 92,
    targetWidth: options?.targetWidth,
  });

  const resolvedName =
    options?.filename ??
    resolveTopoExportBaseFilename({
      routes: project.routes,
      sectorName: options?.sectorName,
      topoName: project.name,
    });

  const baseFilename = sanitizeImageFilename(resolvedName);
  const filename = `${baseFilename}.webp`;

  if (Platform.OS === 'web') {
    const dataUri = `data:${raster.mimeType};base64,${raster.base64}`;
    if (typeof document !== 'undefined') {
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    return dataUri;
  }

  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
  const fileUri = baseDir ? `${baseDir.replace(/\/$/, '')}/${filename}` : filename;

  await FileSystem.writeAsStringAsync(fileUri, raster.base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      dialogTitle: `Share ${project.name || 'Topo'}`,
      mimeType: raster.mimeType,
      UTI: 'org.webmproject.webp',
    });
  }

  return fileUri;
}
