import type {
  Crag,
  GuidebookCrag,
  GuidebookExportBundle,
  GuidebookExportRequest,
  GuidebookSector,
  GuidebookTopo,
  PhotoAsset,
  Sector,
  Topo,
} from '@/domain/types';

import type { TopoDatabase } from '../database';
import { listAnnotationsForTopo } from './annotationsRepo';
import { getCrag } from './cragsRepo';
import { getSector, listSectorsForCrag } from './sectorsRepo';
import { listRoutesForTopo } from './routesRepo';
import { getTopo, listToposForSector } from './toposRepo';

export async function loadGuidebookExportBundle(
  db: TopoDatabase,
  request: GuidebookExportRequest,
): Promise<GuidebookExportBundle | undefined> {
  if (request.kind === 'crag') {
    const crag = await getCrag(db, request.cragId);
    if (!crag) return undefined;
    return {
      crag: await loadGuidebookCrag(db, crag),
      scope: 'crag',
    };
  }

  if (request.kind === 'sector') {
    const sector = await getSector(db, request.sectorId);
    if (!sector) return undefined;
    const crag = await getCrag(db, sector.cragId);
    if (!crag) return undefined;
    return {
      crag: { ...crag, sectors: [await loadGuidebookSector(db, sector)] },
      scope: 'sector',
      selectedSectorId: sector.id,
    };
  }

  const topo = await getTopo(db, request.topoId);
  if (!topo) return undefined;
  const sector = await getSector(db, topo.sectorId);
  if (!sector) return undefined;
  const crag = await getCrag(db, sector.cragId);
  if (!crag) return undefined;
  return {
    crag: {
      ...crag,
      sectors: [
        {
          ...sector,
          topos: [await loadGuidebookTopo(db, topo)],
        },
      ],
    },
    scope: 'topo',
    selectedSectorId: sector.id,
    selectedTopoId: topo.id,
  };
}

async function loadGuidebookCrag(db: TopoDatabase, crag: Crag): Promise<GuidebookCrag> {
  const sectors = await listSectorsForCrag(db, crag.id);
  const guidebookSectors = await Promise.all(
    sectors.map((sector) => loadGuidebookSector(db, sector)),
  );
  return { ...crag, sectors: guidebookSectors };
}

async function loadGuidebookSector(db: TopoDatabase, sector: Sector): Promise<GuidebookSector> {
  const topos = await listToposForSector(db, sector.id);
  const guidebookTopos = await Promise.all(topos.map((topo) => loadGuidebookTopo(db, topo)));
  return { ...sector, topos: guidebookTopos };
}

async function loadGuidebookTopo(db: TopoDatabase, topo: Topo): Promise<GuidebookTopo> {
  const [routes, annotations] = await Promise.all([
    listRoutesForTopo(db, topo.id),
    listAnnotationsForTopo(db, topo.id),
  ]);
  return {
    ...topo,
    annotations,
    photo: photoAssetForTopo(topo),
    routes,
  };
}

function photoAssetForTopo(topo: Topo): PhotoAsset | undefined {
  if (!topo.photoUri || !topo.photoWidth || !topo.photoHeight) {
    return undefined;
  }
  return {
    id: topo.id,
    topoId: topo.id,
    uri: topo.photoUri,
    width: topo.photoWidth,
    height: topo.photoHeight,
    createdAt: topo.createdAt,
  };
}
