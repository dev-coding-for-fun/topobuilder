import { ImageFormat } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { GuidebookExportBundle, GuidebookTopo, PhotoAsset, TopoProject } from '@/domain/types';
import { renderTopoRasterBase64 } from '@/rendering/artifact';

export type TopoImageExportOptions = {
  quality?: number;
  targetWidth?: number;
};

export function sanitizeImageFilename(name: string): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'topo';
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
    routes: topo.routes,
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
  return exportTopoImage(project, topo.photo, options);
}

export async function exportTopoImage(
  project: TopoProject,
  photo: PhotoAsset,
  options?: TopoImageExportOptions,
): Promise<string> {
  const raster = await renderTopoRasterBase64(project, photo, {
    format: ImageFormat.WEBP,
    quality: options?.quality ?? 92,
    targetWidth: options?.targetWidth,
  });

  const baseFilename = sanitizeImageFilename(project.name || 'topo');
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
