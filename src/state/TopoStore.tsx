import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { createAnnotation } from '@/domain/annotationFactory';
import { createId, nowIso } from '@/domain/ids';
import type { LineWeight } from '@/domain/lineWeights';
import type { StampSize } from '@/domain/stampSizes';
import type {
  Annotation,
  AnnotationKind,
  ConnectedCragSummary,
  Crag,
  CragDetail,
  CragSummary,
  GuidebookExportBundle,
  GuidebookExportRequest,
  NormalizedPoint,
  Route,
  RouteType,
  Sector,
  SectorWithTopos,
  TabvarRoute,
  Topo,
  TopoEditorBundle,
  TopoWithRoutes,
} from '@/domain/types';
import { pickPhotoFromLibrary } from '@/camera/photoCapture';
import { copyPhotoIntoLibrary } from '@/storage/assetStorage';
import { submitTabvarGuidebook } from '@/integrations/tabvar/client';
import { loadTabvarSession } from '@/integrations/tabvar/sessionStore';
import type { TabvarSubmissionResponse } from '@/integrations/tabvar/types';
import { getDatabase, runMigrations, type TopoDatabase } from '@/storage/database';
import {
  adoptTabvarCrag as adoptTabvarCragRepo,
  createCrag as createCragRepo,
  deleteCrag as deleteCragRepo,
  getCrag,
  listConnectedCrags,
  listCragSummaries,
  listPhotoUrisForCrag,
  renameCrag as renameCragRepo,
} from '@/storage/repos/cragsRepo';
import {
  createSector as createSectorRepo,
  deleteSector as deleteSectorRepo,
  listPhotoUrisForSector,
  listSectorsForCrag,
  renameSector as renameSectorRepo,
} from '@/storage/repos/sectorsRepo';
import {
  attachPhotoToTopo,
  createTopo as createTopoRepo,
  deleteTopo as deleteTopoRepo,
  loadTopoEditorBundle,
  listToposForSector,
  markToposClean,
  renameTopo as renameTopoRepo,
  updateTopoDescription as updateTopoDescriptionRepo,
} from '@/storage/repos/toposRepo';
import {
  countRoutesForTopo,
  createRoute as createRouteRepo,
  deleteRoute as deleteRouteRepo,
  listRoutesForTopo,
  updateRoute as updateRouteRepo,
} from '@/storage/repos/routesRepo';
import {
  countTabvarRoutesForTopo as countTabvarRoutesForTopoRepo,
  countUnmappedTabvarRoutesForSector as countUnmappedTabvarRoutesForSectorRepo,
  linkTabvarRouteToTopo,
  listTabvarRoutesForTopo,
  listUnmappedTabvarRoutesForSector,
  reorderTopoRoutes as reorderTopoRoutesRepo,
  type TopoRouteIdentifier,
  unlinkTabvarRouteFromTopo,
} from '@/storage/repos/topoTabvarRoutesRepo';
import {
  deleteAnnotation as deleteAnnotationRepo,
  replaceAnnotationsForTopo,
  upsertAnnotation,
} from '@/storage/repos/annotationsRepo';
import { loadGuidebookExportBundle } from '@/storage/repos/guidebookExportRepo';

type CreateAnnotationInput = {
  topoId: string;
  routeId?: string;
  kind: AnnotationKind;
  point: NormalizedPoint;
  color?: string;
  label?: string;
  labelFontSize?: number;
  lineWeight?: LineWeight;
  stampSize?: StampSize;
};

type CreatePathAnnotationInput = {
  topoId: string;
  routeId?: string;
  kind: Extract<AnnotationKind, 'climbLine' | 'walkoff' | 'scramble'>;
  points: NormalizedPoint[];
  color?: string;
  lineWeight?: LineWeight;
};

type RouteFieldUpdate = Partial<
  Pick<Route, 'name' | 'grade' | 'routeType' | 'boltCount' | 'lengthM' | 'fa' | 'description' | 'color'>
>;

type TopoStoreValue = {
  isReady: boolean;
  storageError?: string;
  cragSummaries: CragSummary[];
  connectedCrags: ConnectedCragSummary[];
  refresh: () => Promise<void>;

  // Crags
  createCrag: (name: string, description?: string, tabvarCragId?: number) => Promise<{ crag: Crag; defaultSector: Sector }>;
  adoptTabvarCrag: (tabvarCragId: number) => Promise<Crag>;
  renameCrag: (id: string, name: string) => Promise<void>;
  deleteCrag: (id: string) => Promise<void>;
  loadCragDetail: (cragId: string) => Promise<CragDetail | undefined>;
  loadGuidebookExport: (request: GuidebookExportRequest) => Promise<GuidebookExportBundle | undefined>;

  // Sectors
  createSector: (cragId: string, name: string, description?: string, tabvarSectorId?: number) => Promise<Sector>;
  renameSector: (id: string, name: string) => Promise<void>;
  deleteSector: (id: string) => Promise<void>;

  // Topos
  createTopo: (sectorId: string, name?: string) => Promise<Topo>;
  renameTopo: (id: string, name: string) => Promise<void>;
  updateTopoDescription: (id: string, description: string | undefined) => Promise<void>;
  deleteTopo: (id: string) => Promise<void>;
  loadTopoInfo: (id: string) => Promise<{ topo: Topo; routes: Route[] } | undefined>;
  loadTopoEditor: (id: string) => Promise<TopoEditorBundle | undefined>;
  attachPhotoFromLibrary: (topoId: string) => Promise<boolean>;
  attachPhotoFromUri: (input: { topoId: string; uri: string; width: number; height: number }) => Promise<void>;
  submitToTabvar: (request: GuidebookExportRequest) => Promise<TabvarSubmissionResponse>;

  // Routes
  createRoute: (topoId: string, defaults?: RouteFieldUpdate) => Promise<Route>;
  updateRouteField: (route: Route, fields: RouteFieldUpdate) => Promise<Route>;
  deleteRoute: (id: string) => Promise<void>;
  countLocalRoutesForTopo: (topoId: string) => Promise<number>;

  // Connected Routes (TABVAR) & Reordering
  linkTabvarRoute: (topoId: string, routeAppId: string, targetSortOrder?: number) => Promise<void>;
  unlinkTabvarRoute: (topoId: string, routeAppId: string) => Promise<void>;
  reorderTopoRoutes: (topoId: string, orderedRoutes: TopoRouteIdentifier[]) => Promise<void>;
  loadTabvarRoutesForTopo: (topoId: string) => Promise<TabvarRoute[]>;
  loadUnmappedTabvarRoutes: (sectorId: string) => Promise<TabvarRoute[]>;
  countTabvarRoutesForTopo: (topoId: string) => Promise<number>;
  countUnmappedTabvarRoutes: (sectorId: string) => Promise<number>;

  // Annotations (editor)
  addAnnotation: (input: CreateAnnotationInput) => Promise<Annotation>;
  addPathAnnotation: (input: CreatePathAnnotationInput) => Promise<Annotation>;
  updateAnnotation: (annotation: Annotation) => Promise<Annotation>;
  removeAnnotation: (annotation: Annotation) => Promise<void>;
  replaceAnnotations: (topoId: string, annotations: Annotation[]) => Promise<void>;
};

const TopoStoreContext = createContext<TopoStoreValue | undefined>(undefined);

export function TopoStoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<TopoDatabase>();
  const [storageError, setStorageError] = useState<string>();
  const [cragSummaries, setCragSummaries] = useState<CragSummary[]>([]);
  const [connectedCrags, setConnectedCrags] = useState<ConnectedCragSummary[]>([]);

  const refresh = useCallback(async () => {
    if (!db) return;
    const [crags, connected] = await Promise.all([
      listCragSummaries(db),
      listConnectedCrags(db),
    ]);
    setCragSummaries(crags);
    setConnectedCrags(connected);
  }, [db]);

  useEffect(() => {
    let mounted = true;

    async function prepare() {
      try {
        const nextDb = await getDatabase();
        await runMigrations(nextDb);
        if (mounted) {
          setDb(nextDb);
          setStorageError(undefined);
          const [crags, connected] = await Promise.all([
            listCragSummaries(nextDb),
            listConnectedCrags(nextDb),
          ]);
          setCragSummaries(crags);
          setConnectedCrags(connected);
        }
      } catch (error) {
        if (mounted) {
          setStorageError(
            error instanceof Error ? error.message : 'Local storage could not be initialized.',
          );
        }
      }
    }

    prepare();
    return () => {
      mounted = false;
    };
  }, []);

  function requireDb(): TopoDatabase {
    if (!db) throw new Error('Database is not ready');
    return db;
  }

  // ── Crags ───────────────────────────────────────────────────────────────

  const createCrag = useCallback(
    async (name: string, description?: string, tabvarCragId?: number) => {
      const out = await createCragRepo(requireDb(), { name, description, tabvarCragId });
      await refresh();
      return out;
    },
    [db, refresh],
  );

  const adoptTabvarCrag = useCallback(
    async (tabvarCragId: number) => {
      const crag = await adoptTabvarCragRepo(requireDb(), tabvarCragId);
      await refresh();
      return crag;
    },
    [db, refresh],
  );

  const renameCrag = useCallback(
    async (id: string, name: string) => {
      await renameCragRepo(requireDb(), id, name);
      await refresh();
    },
    [db, refresh],
  );

  const deleteCrag = useCallback(
    async (id: string) => {
      const dbRef = requireDb();
      // Cascade is handled by FKs; nothing else to do for now.
      await deleteCragRepo(dbRef, id);
      await refresh();
    },
    [db, refresh],
  );

  const loadCragDetail = useCallback(
    async (cragId: string): Promise<CragDetail | undefined> => {
      const dbRef = requireDb();
      const crag = await getCrag(dbRef, cragId);
      if (!crag) return undefined;
      const sectors = await listSectorsForCrag(dbRef, cragId);
      const sectorsWithTopos: SectorWithTopos[] = await Promise.all(
        sectors.map(async (sector) => {
          const topos = await listToposForSector(dbRef, sector.id);
          const [toposWithRoutes, unmappedRoutes] = await Promise.all([
            Promise.all(
              topos.map(async (topo) => ({
                ...topo,
                routes: await listRoutesForTopo(dbRef, topo.id),
                tabvarRoutes: await listTabvarRoutesForTopo(dbRef, topo.id),
              })),
            ),
            listUnmappedTabvarRoutesForSector(dbRef, sector.id),
          ]);
          return { ...sector, topos: toposWithRoutes, unmappedRoutes };
        }),
      );
      return { crag, sectors: sectorsWithTopos };
    },
    [db],
  );

  const loadGuidebookExport = useCallback(
    async (request: GuidebookExportRequest): Promise<GuidebookExportBundle | undefined> => {
      return loadGuidebookExportBundle(requireDb(), request);
    },
    [db],
  );

  // ── Sectors ─────────────────────────────────────────────────────────────

  const createSector = useCallback(
    async (cragId: string, name: string, description?: string, tabvarSectorId?: number) => {
      const sector = await createSectorRepo(requireDb(), { cragId, name, description, tabvarSectorId });
      await refresh();
      return sector;
    },
    [db, refresh],
  );

  const renameSector = useCallback(
    async (id: string, name: string) => {
      await renameSectorRepo(requireDb(), id, name);
      await refresh();
    },
    [db, refresh],
  );

  const deleteSector = useCallback(
    async (id: string) => {
      const dbRef = requireDb();
      // Photo cleanup is best-effort; we ignore failures and continue with the row delete.
      try {
        const uris = await listPhotoUrisForSector(dbRef, id);
        await tryRemovePhotoFiles(uris);
      } catch (error) {
        console.warn('[store] sector photo cleanup failed', error);
      }
      await deleteSectorRepo(dbRef, id);
      await refresh();
    },
    [db, refresh],
  );

  // ── Topos ───────────────────────────────────────────────────────────────

  const createTopo = useCallback(
    async (sectorId: string, name?: string) => {
      const topo = await createTopoRepo(requireDb(), { sectorId, name });
      await refresh();
      return topo;
    },
    [db, refresh],
  );

  const renameTopo = useCallback(
    async (id: string, name: string) => {
      await renameTopoRepo(requireDb(), id, name);
      await refresh();
    },
    [db, refresh],
  );

  const updateTopoDescription = useCallback(
    async (id: string, description: string | undefined) => {
      await updateTopoDescriptionRepo(requireDb(), id, description);
      await refresh();
    },
    [db, refresh],
  );

  const deleteTopo = useCallback(
    async (id: string) => {
      const photoUri = await deleteTopoRepo(requireDb(), id);
      if (photoUri) {
        await tryRemovePhotoFiles([photoUri]);
      }
      await refresh();
    },
    [db, refresh],
  );

  const loadTopoInfo = useCallback(
    async (id: string) => {
      const dbRef = requireDb();
      const bundle = await loadTopoEditorBundle(dbRef, id);
      if (!bundle) return undefined;
      return { topo: bundle.topo, routes: bundle.routes };
    },
    [db],
  );

  const loadTopoEditor = useCallback(
    async (id: string) => {
      return loadTopoEditorBundle(requireDb(), id);
    },
    [db],
  );

  const attachPhotoFromLibrary = useCallback(
    async (topoId: string) => {
      const dbRef = requireDb();
      const picked = await pickPhotoFromLibrary();
      if (!picked) return false;
      try {
        const uri = await copyPhotoIntoLibrary(picked.uri, topoId);
        await attachPhotoToTopo(dbRef, topoId, {
          uri,
          width: picked.width,
          height: picked.height,
        });
        await refresh();
        setStorageError(undefined);
        return true;
      } catch (error) {
        setStorageError(
          error instanceof Error ? error.message : 'Imported photo could not be saved.',
        );
        throw error;
      }
    },
    [db, refresh],
  );

  const attachPhotoFromUri = useCallback(
    async (input: { topoId: string; uri: string; width: number; height: number }) => {
      const dbRef = requireDb();
      try {
        const uri = await copyPhotoIntoLibrary(input.uri, input.topoId);
        await attachPhotoToTopo(dbRef, input.topoId, {
          uri,
          width: input.width,
          height: input.height,
        });
        await refresh();
        setStorageError(undefined);
      } catch (error) {
        setStorageError(
          error instanceof Error ? error.message : 'Captured photo could not be saved.',
        );
        throw error;
      }
    },
    [db, refresh],
  );

  const submitToTabvar = useCallback(
    async (request: GuidebookExportRequest) => {
      const dbRef = requireDb();
      const session = await loadTabvarSession();
      if (!session) {
        throw new Error('Connect Tabvar before submitting topos.');
      }
      const bundle = await loadGuidebookExportBundle(dbRef, request);
      if (!bundle) {
        throw new Error('Could not load topo data for Tabvar submission.');
      }
      const { response, submittedTopoIds } = await submitTabvarGuidebook(bundle, session.accessToken);
      await markToposClean(dbRef, submittedTopoIds, response.id);
      await refresh();
      return response;
    },
    [db, refresh],
  );

  // ── Routes ──────────────────────────────────────────────────────────────

  const createRoute = useCallback(
    async (topoId: string, defaults?: RouteFieldUpdate) => {
      return createRouteRepo(requireDb(), { topoId, ...defaults });
    },
    [db],
  );

  const updateRouteField = useCallback(
    async (route: Route, fields: RouteFieldUpdate) => {
      const next: Route = {
        ...route,
        ...fields,
        name: fields.name ?? route.name ?? '',
        updatedAt: nowIso(),
      };
      await updateRouteRepo(requireDb(), next);
      return next;
    },
    [db],
  );

  const deleteRoute = useCallback(
    async (id: string) => {
      await deleteRouteRepo(requireDb(), id);
    },
    [db],
  );

  const countLocalRoutesForTopo = useCallback(
    async (topoId: string) => {
      return countRoutesForTopo(requireDb(), topoId);
    },
    [db],
  );

  // ── Connected Routes (TABVAR) & Reordering ────────────────────────────

  const linkTabvarRoute = useCallback(
    async (topoId: string, routeAppId: string, targetSortOrder?: number) => {
      await linkTabvarRouteToTopo(requireDb(), topoId, routeAppId, targetSortOrder);
      await refresh();
    },
    [db, refresh],
  );

  const unlinkTabvarRoute = useCallback(
    async (topoId: string, routeAppId: string) => {
      await unlinkTabvarRouteFromTopo(requireDb(), topoId, routeAppId);
      await refresh();
    },
    [db, refresh],
  );

  const reorderTopoRoutes = useCallback(
    async (topoId: string, orderedRoutes: TopoRouteIdentifier[]) => {
      await reorderTopoRoutesRepo(requireDb(), topoId, orderedRoutes);
      await refresh();
    },
    [db, refresh],
  );

  const loadTabvarRoutesForTopo = useCallback(
    async (topoId: string) => {
      return listTabvarRoutesForTopo(requireDb(), topoId);
    },
    [db],
  );

  const loadUnmappedTabvarRoutes = useCallback(
    async (sectorId: string) => {
      return listUnmappedTabvarRoutesForSector(requireDb(), sectorId);
    },
    [db],
  );

  const countTabvarRoutesForTopo = useCallback(
    async (topoId: string) => {
      return countTabvarRoutesForTopoRepo(requireDb(), topoId);
    },
    [db],
  );

  const countUnmappedTabvarRoutes = useCallback(
    async (sectorId: string) => {
      return countUnmappedTabvarRoutesForSectorRepo(requireDb(), sectorId);
    },
    [db],
  );

  // ── Annotations (editor) ────────────────────────────────────────────────

  const addAnnotation = useCallback(
    async (input: CreateAnnotationInput) => {
      const now = nowIso();
      const annotation = createAnnotation({
        id: createId('annotation'),
        now,
        ...input,
      });
      await upsertAnnotation(requireDb(), annotation);
      return annotation;
    },
    [db],
  );

  const addPathAnnotation = useCallback(
    async (input: CreatePathAnnotationInput) => {
      const now = nowIso();
      const annotation = createAnnotation({
        id: createId('annotation'),
        topoId: input.topoId,
        routeId: input.routeId,
        kind: input.kind,
        point: input.points[0] ?? { x: 0, y: 0 },
        color: input.color,
        lineWeight: input.lineWeight,
        now,
      });
      if ('points' in annotation) {
        annotation.points = input.points;
      }
      await upsertAnnotation(requireDb(), annotation);
      return annotation;
    },
    [db],
  );

  const updateAnnotation = useCallback(
    async (annotation: Annotation) => {
      const updated: Annotation = { ...annotation, updatedAt: nowIso() };
      await upsertAnnotation(requireDb(), updated);
      return updated;
    },
    [db],
  );

  const removeAnnotation = useCallback(
    async (annotation: Annotation) => {
      await deleteAnnotationRepo(requireDb(), annotation.id, annotation.topoId, nowIso());
    },
    [db],
  );

  const replaceAnnotations = useCallback(
    async (topoId: string, annotations: Annotation[]) => {
      await replaceAnnotationsForTopo(requireDb(), topoId, annotations, nowIso());
    },
    [db],
  );

  const value = useMemo<TopoStoreValue>(
    () => ({
      isReady: Boolean(db),
      storageError,
      cragSummaries,
      connectedCrags,
      refresh,
      createCrag,
      adoptTabvarCrag,
      renameCrag,
      deleteCrag,
      loadCragDetail,
      loadGuidebookExport,
      createSector,
      renameSector,
      deleteSector,
      createTopo,
      renameTopo,
      updateTopoDescription,
      deleteTopo,
      loadTopoInfo,
      loadTopoEditor,
      attachPhotoFromLibrary,
      attachPhotoFromUri,
      submitToTabvar,
      createRoute,
      updateRouteField,
      deleteRoute,
      countLocalRoutesForTopo,
      linkTabvarRoute,
      unlinkTabvarRoute,
      reorderTopoRoutes,
      loadTabvarRoutesForTopo,
      loadUnmappedTabvarRoutes,
      countTabvarRoutesForTopo,
      countUnmappedTabvarRoutes,
      addAnnotation,
      addPathAnnotation,
      updateAnnotation,
      removeAnnotation,
      replaceAnnotations,
    }),
    [
      addAnnotation,
      addPathAnnotation,
      adoptTabvarCrag,
      attachPhotoFromLibrary,
      attachPhotoFromUri,
      connectedCrags,
      countLocalRoutesForTopo,
      countTabvarRoutesForTopo,
      countUnmappedTabvarRoutes,
      cragSummaries,
      createCrag,
      createRoute,
      createSector,
      createTopo,
      db,
      deleteCrag,
      deleteRoute,
      deleteSector,
      deleteTopo,
      linkTabvarRoute,
      loadCragDetail,
      loadGuidebookExport,
      loadTabvarRoutesForTopo,
      loadTopoEditor,
      loadTopoInfo,
      loadUnmappedTabvarRoutes,
      refresh,
      removeAnnotation,
      renameCrag,
      renameSector,
      renameTopo,
      reorderTopoRoutes,
      replaceAnnotations,
      storageError,
      submitToTabvar,
      unlinkTabvarRoute,
      updateAnnotation,
      updateRouteField,
      updateTopoDescription,
    ],
  );

  return <TopoStoreContext.Provider value={value}>{children}</TopoStoreContext.Provider>;
}

export function useTopoStore() {
  const value = useContext(TopoStoreContext);
  if (!value) {
    throw new Error('useTopoStore must be used within TopoStoreProvider');
  }
  return value;
}

async function tryRemovePhotoFiles(uris: string[]): Promise<void> {
  // Inline-deferred import so we don't pull native modules into the web bundle path
  // at module load time. Best-effort cleanup; errors logged but not rethrown.
  if (uris.length === 0) return;
  try {
    // We rely on the platform-specific file system module being available; on web,
    // photo URIs are inline data URLs and there is nothing to remove.
    const FS = await import('expo-file-system/legacy');
    await Promise.all(
      uris.map(async (uri) => {
        if (!uri || uri.startsWith('data:')) return;
        try {
          await FS.deleteAsync(uri, { idempotent: true });
        } catch (error) {
          console.warn('[store] failed to remove photo file', uri, error);
        }
      }),
    );
  } catch (error) {
    // expo-file-system not available on this platform (e.g. plain web); ignore.
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[store] photo file cleanup skipped (no FS available)');
    }
  }
}

export { type TopoRouteIdentifier } from '@/storage/repos/topoTabvarRoutesRepo';
