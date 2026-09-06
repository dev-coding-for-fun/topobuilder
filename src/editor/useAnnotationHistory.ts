import { useCallback, useEffect, useRef, useState } from 'react';

import type { Annotation } from '@/domain/types';

export const MAX_ANNOTATION_HISTORY = 30;

export function cloneAnnotations(annotations: Annotation[]): Annotation[] {
  return annotations.map((annotation) => {
    if ('points' in annotation) {
      return { ...annotation, points: annotation.points.map((p) => ({ ...p })) };
    }
    return { ...annotation, point: { ...annotation.point } };
  });
}

export function useAnnotationHistory(topoId?: string, maxHistory = MAX_ANNOTATION_HISTORY) {
  const [past, setPast] = useState<Annotation[][]>([]);
  const [future, setFuture] = useState<Annotation[][]>([]);

  const pastRef = useRef<Annotation[][]>([]);
  const futureRef = useRef<Annotation[][]>([]);
  const previousTopoIdRef = useRef<string | undefined>(topoId);

  useEffect(() => {
    if (previousTopoIdRef.current !== topoId) {
      previousTopoIdRef.current = topoId;
      pastRef.current = [];
      futureRef.current = [];
      setPast([]);
      setFuture([]);
    }
  }, [topoId]);

  const recordSnapshot = useCallback(
    (current: Annotation[]) => {
      const nextPast = [...pastRef.current.slice(-maxHistory + 1), cloneAnnotations(current)];
      pastRef.current = nextPast;
      futureRef.current = [];
      setPast(nextPast);
      setFuture([]);
    },
    [maxHistory],
  );

  const undo = useCallback((current: Annotation[]): Annotation[] | undefined => {
    if (pastRef.current.length === 0) {
      return undefined;
    }
    const previous = pastRef.current[pastRef.current.length - 1];
    const nextPast = pastRef.current.slice(0, -1);
    const nextFuture = [cloneAnnotations(current), ...futureRef.current];

    pastRef.current = nextPast;
    futureRef.current = nextFuture;
    setPast(nextPast);
    setFuture(nextFuture);

    return cloneAnnotations(previous);
  }, []);

  const redo = useCallback((current: Annotation[]): Annotation[] | undefined => {
    if (futureRef.current.length === 0) {
      return undefined;
    }
    const next = futureRef.current[0];
    const nextFuture = futureRef.current.slice(1);
    const nextPast = [...pastRef.current, cloneAnnotations(current)];

    pastRef.current = nextPast;
    futureRef.current = nextFuture;
    setPast(nextPast);
    setFuture(nextFuture);

    return cloneAnnotations(next);
  }, []);

  const clear = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    setPast([]);
    setFuture([]);
  }, []);

  return {
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    historyDepth: past.length,
    futureDepth: future.length,
    recordSnapshot,
    undo,
    redo,
    clear,
  };
}
