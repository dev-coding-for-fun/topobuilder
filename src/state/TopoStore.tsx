import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { createAnnotation } from '@/domain/annotationFactory';
import { createId, nowIso } from '@/domain/ids';
import type { LineWeight } from '@/domain/lineWeights';
import type { StampSize } from '@/domain/stampSizes';
import type { Annotation, AnnotationKind, NormalizedPoint, PhotoAsset, TopoProject, TopoSummary } from '@/domain/types';
import { pickPhotoFromLibrary } from '@/camera/photoCapture';
import { copyPhotoIntoLibrary } from '@/storage/assetStorage';
import { getDatabase, migrateDatabase, type TopoDatabase } from '@/storage/database';
import {
  deleteAnnotation,
  getTopoProject,
  insertPhotoAsset,
  insertTopoProject,
  listTopoSummaries,
  upsertAnnotation,
} from '@/storage/repositories';

type TopoStoreValue = {
  isReady: boolean;
  storageError?: string;
  summaries: TopoSummary[];
  refresh: () => Promise<void>;
  createProject: (name: string) => Promise<TopoProject>;
  loadProject: (id: string) => Promise<TopoProject | undefined>;
  addPhotoFromLibrary: (topoId: string) => Promise<PhotoAsset | undefined>;
  addPhotoFromUri: (input: {
    topoId: string;
    uri: string;
    width: number;
    height: number;
  }) => Promise<PhotoAsset>;
  addAnnotation: (input: {
    topoId: string;
    photoId: string;
    routeId?: string;
    kind: AnnotationKind;
    point: NormalizedPoint;
    color?: string;
    label?: string;
    labelFontSize?: number;
    lineWeight?: LineWeight;
    stampSize?: StampSize;
  }) => Promise<Annotation>;
  addPathAnnotation: (input: {
    topoId: string;
    photoId: string;
    routeId?: string;
    kind: Extract<AnnotationKind, 'climbLine' | 'walkoff' | 'scramble'>;
    points: NormalizedPoint[];
    color?: string;
    lineWeight?: LineWeight;
  }) => Promise<Annotation>;
  updateAnnotation: (annotation: Annotation) => Promise<Annotation>;
  removeAnnotation: (annotation: Annotation) => Promise<void>;
};

const TopoStoreContext = createContext<TopoStoreValue | undefined>(undefined);

export function TopoStoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<TopoDatabase>();
  const [storageError, setStorageError] = useState<string>();
  const [summaries, setSummaries] = useState<TopoSummary[]>([]);

  const refresh = useCallback(async () => {
    if (!db) {
      return;
    }
    setSummaries(await listTopoSummaries(db));
  }, [db]);

  useEffect(() => {
    let mounted = true;

    async function prepare() {
      try {
        const nextDb = await getDatabase();
        await migrateDatabase(nextDb);
        if (mounted) {
          setDb(nextDb);
          setStorageError(undefined);
          setSummaries(await listTopoSummaries(nextDb));
        }
      } catch (error) {
        if (mounted) {
          setStorageError(error instanceof Error ? error.message : 'Local storage could not be initialized.');
        }
      }
    }

    prepare();

    return () => {
      mounted = false;
    };
  }, []);

  const createProject = useCallback(
    async (name: string) => {
      if (!db) {
        throw new Error('Database is not ready');
      }

      const now = nowIso();
      const topoId = createId('topo');
      const routeId = createId('route');
      const project: TopoProject = {
        id: topoId,
        name,
        createdAt: now,
        updatedAt: now,
        photos: [],
        routes: [
          {
            id: routeId,
            topoId,
            name: 'Route 1',
            color: '#EB5757',
            createdAt: now,
            updatedAt: now,
          },
        ],
        annotations: [],
      };

      await insertTopoProject(db, project);
      await refresh();
      return project;
    },
    [db, refresh],
  );

  const loadProject = useCallback(
    async (id: string) => {
      if (!db) {
        return undefined;
      }
      return getTopoProject(db, id);
    },
    [db],
  );

  const addPhotoFromLibrary = useCallback(
    async (topoId: string) => {
      if (!db) {
        throw new Error('Database is not ready');
      }

      const picked = await pickPhotoFromLibrary();
      if (!picked) {
        return undefined;
      }

      try {
        const now = nowIso();
        const uri = await copyPhotoIntoLibrary(picked.uri, topoId);
        const photo: PhotoAsset = {
          id: createId('photo'),
          topoId,
          uri,
          width: picked.width,
          height: picked.height,
          createdAt: now,
        };
        await insertPhotoAsset(db, photo);
        await refresh();
        setStorageError(undefined);
        return photo;
      } catch (error) {
        setStorageError(error instanceof Error ? error.message : 'Imported photo could not be saved.');
        throw error;
      }
    },
    [db, refresh],
  );

  const addPhotoFromUri = useCallback(
    async (input: { topoId: string; uri: string; width: number; height: number }) => {
      if (!db) {
        throw new Error('Database is not ready');
      }

      try {
        const now = nowIso();
        const uri = await copyPhotoIntoLibrary(input.uri, input.topoId);
        const photo: PhotoAsset = {
          id: createId('photo'),
          topoId: input.topoId,
          uri,
          width: input.width,
          height: input.height,
          createdAt: now,
        };
        await insertPhotoAsset(db, photo);
        await refresh();
        setStorageError(undefined);
        return photo;
      } catch (error) {
        setStorageError(error instanceof Error ? error.message : 'Captured photo could not be saved.');
        throw error;
      }
    },
    [db, refresh],
  );

  const addAnnotation = useCallback(
    async (input: {
      topoId: string;
      photoId: string;
      routeId?: string;
      kind: AnnotationKind;
      point: NormalizedPoint;
      color?: string;
      label?: string;
      labelFontSize?: number;
      lineWeight?: LineWeight;
      stampSize?: StampSize;
    }) => {
      if (!db) {
        throw new Error('Database is not ready');
      }

      const now = nowIso();
      const annotation = createAnnotation({
        id: createId('annotation'),
        now,
        ...input,
      });
      await upsertAnnotation(db, annotation);
      await refresh();
      return annotation;
    },
    [db, refresh],
  );

  const addPathAnnotation = useCallback(
    async (input: {
      topoId: string;
      photoId: string;
      routeId?: string;
      kind: Extract<AnnotationKind, 'climbLine' | 'walkoff' | 'scramble'>;
      points: NormalizedPoint[];
      color?: string;
      lineWeight?: LineWeight;
    }) => {
      if (!db) {
        throw new Error('Database is not ready');
      }

      const now = nowIso();
      const annotation = createAnnotation({
        id: createId('annotation'),
        topoId: input.topoId,
        photoId: input.photoId,
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

      await upsertAnnotation(db, annotation);
      await refresh();
      return annotation;
    },
    [db, refresh],
  );

  const removeAnnotation = useCallback(
    async (annotation: Annotation) => {
      if (!db) {
        throw new Error('Database is not ready');
      }

      await deleteAnnotation(db, annotation.id, annotation.topoId, nowIso());
      await refresh();
    },
    [db, refresh],
  );

  const updateAnnotation = useCallback(
    async (annotation: Annotation) => {
      if (!db) {
        throw new Error('Database is not ready');
      }

      const updated = {
        ...annotation,
        updatedAt: nowIso(),
      };
      await upsertAnnotation(db, updated);
      await refresh();
      return updated;
    },
    [db, refresh],
  );

  const value = useMemo<TopoStoreValue>(
    () => ({
      isReady: Boolean(db),
      storageError,
      summaries,
      refresh,
      createProject,
      loadProject,
      addPhotoFromLibrary,
      addPhotoFromUri,
      addAnnotation,
      addPathAnnotation,
      updateAnnotation,
      removeAnnotation,
    }),
    [addAnnotation, addPathAnnotation, addPhotoFromLibrary, addPhotoFromUri, createProject, db, loadProject, refresh, removeAnnotation, storageError, summaries, updateAnnotation],
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
