import type { GuidebookExportBundle, GuidebookSector, GuidebookTopo, Route } from '@/domain/types';

import type {
  BuiltTabvarSubmission,
  TabvarSubmissionImage,
  TabvarSubmissionRoute,
  TabvarSubmissionTopo,
} from './types';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

export function buildTabvarSubmission(bundle: GuidebookExportBundle): BuiltTabvarSubmission {
  const images: TabvarSubmissionImage[] = [];
  const topoIds: string[] = [];

  function topoPayload(topo: GuidebookTopo): TabvarSubmissionTopo {
    const image = imageForTopo(topo);
    images.push(image);
    topoIds.push(topo.id);
    return {
      fileKey: image.fileKey,
      routeRefs: routeRefsForTopo(topo),
    };
  }

  if (bundle.scope === 'crag') {
    return {
      images,
      submission: {
        kind: 'crag',
        crag: { name: bundle.crag.name },
        sectors: bundle.crag.sectors.map((sector) => ({
          name: sector.name,
          routes: routesForSector(sector),
          topos: sector.topos.map(topoPayload),
        })),
      },
      topoIds,
    };
  }

  const sector = selectedSector(bundle);

  if (bundle.scope === 'sector') {
    return {
      images,
      submission: {
        kind: 'sector',
        sector: {
          cragName: bundle.crag.name,
          name: sector.name,
        },
        routes: routesForSector(sector),
        topos: sector.topos.map(topoPayload),
      },
      topoIds,
    };
  }

  const topo = selectedTopo(bundle, sector);
  const topoSubmission = topoPayload(topo);
  return {
    images,
    submission: {
      kind: 'topo',
      routes: routesForTopo(topo.routes),
      topo: {
        ...topoSubmission,
        cragName: bundle.crag.name,
        sectorName: sector.name,
      },
    },
    topoIds,
  };
}

function selectedSector(bundle: GuidebookExportBundle): GuidebookSector {
  const sector =
    bundle.crag.sectors.find((candidate) => candidate.id === bundle.selectedSectorId) ??
    bundle.crag.sectors[0];
  if (!sector) {
    throw new Error('Tabvar submission requires at least one sector.');
  }
  return sector;
}

function selectedTopo(bundle: GuidebookExportBundle, sector: GuidebookSector): GuidebookTopo {
  const topo =
    sector.topos.find((candidate) => candidate.id === bundle.selectedTopoId) ?? sector.topos[0];
  if (!topo) {
    throw new Error('Tabvar submission requires at least one topo.');
  }
  return topo;
}

function imageForTopo(topo: GuidebookTopo): TabvarSubmissionImage {
  if (!topo.photo?.uri) {
    throw new Error(`Topo "${topo.name}" needs a photo before it can be submitted to Tabvar.`);
  }
  const mimeType = imageMimeType(topo.photo.uri);
  return {
    fileKey: fileKeyForTopo(topo),
    filename: `${safeFilePart(topo.name || topo.id)}.${extensionForMimeType(mimeType)}`,
    mimeType,
    topoId: topo.id,
    uri: topo.photo.uri,
  };
}

function fileKeyForTopo(topo: GuidebookTopo): string {
  return `topo-${safeFilePart(topo.id)}`;
}

function imageMimeType(uri: string): TabvarSubmissionImage['mimeType'] {
  const dataUriMatch = /^data:([^;,]+)[;,]/i.exec(uri);
  const detected = dataUriMatch?.[1]?.toLowerCase() ?? mimeTypeFromExtension(uri);
  if (ALLOWED_IMAGE_TYPES.has(detected)) {
    return detected as TabvarSubmissionImage['mimeType'];
  }
  throw new Error(`Tabvar only accepts JPEG, PNG, GIF, or WebP topo images.`);
}

function mimeTypeFromExtension(uri: string): string {
  const cleanUri = uri.split('?')[0]?.split('#')[0] ?? uri;
  const extension = cleanUri.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return '';
  }
}

function extensionForMimeType(mimeType: TabvarSubmissionImage['mimeType']): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
  }
}

function routesForSector(sector: GuidebookSector): TabvarSubmissionRoute[] {
  return routesForTopo(sector.topos.flatMap((topo) => topo.routes));
}

function routesForTopo(routes: Route[]): TabvarSubmissionRoute[] {
  const seen = new Set<string>();
  return routes.reduce<TabvarSubmissionRoute[]>((out, route) => {
    const name = route.name.trim();
    if (!name || seen.has(name)) return out;
    seen.add(name);
    out.push({
      name,
      ...(route.grade ? { gradeYds: route.grade } : {}),
    });
    return out;
  }, []);
}

function routeRefsForTopo(topo: GuidebookTopo): string[] {
  return routesForTopo(topo.routes).map((route) => route.name);
}

function safeFilePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
