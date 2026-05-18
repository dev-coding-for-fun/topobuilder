import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { defaultColorForKind, isPathKind } from '@/domain/annotationFactory';
import {
  appendSampledPoint,
  finalizeSampledPoints,
  moveControlPoint,
} from '@/domain/geometry';
import type {
  Annotation,
  EditorTool,
  MarkerAnnotation,
  MarkerAnnotationKind,
  NormalizedPoint,
  PathAnnotationKind,
  TopoProject,
} from '@/domain/types';
import { DEFAULT_LABEL_FONT_SIZE, clampLabelFontSize } from '@/domain/textLabels';
import { EditorTopBar } from '@/editor/EditorTopBar';
import { ToolPalette } from '@/editor/ToolPalette';
import { TopoCanvas } from '@/editor/TopoCanvas';
import { useTopoStore } from '@/state/TopoStore';

const CONTROL_POINT_MIN_DISTANCE = 44;

export default function EditorScreen() {
  const { projectId, photoId } = useLocalSearchParams<{ projectId: string; photoId: string }>();
  const { loadProject, addAnnotation, addPathAnnotation, updateAnnotation, removeAnnotation } = useTopoStore();
  const [project, setProject] = useState<TopoProject>();
  const [activeTool, setActiveTool] = useState<EditorTool>('climbLine');
  const [draftPoints, setDraftPoints] = useState<NormalizedPoint[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string>();
  const [editingPathPoints, setEditingPathPoints] = useState<NormalizedPoint[]>();
  const [selectedLabelId, setSelectedLabelId] = useState<string>();
  const [editingLabel, setEditingLabel] = useState<MarkerAnnotation>();
  const draftPointsRef = useRef<NormalizedPoint[]>([]);
  const draftKindRef = useRef<PathAnnotationKind | undefined>(undefined);
  const selectedPathIdRef = useRef<string | undefined>(undefined);
  const editingPathPointsRef = useRef<NormalizedPoint[] | undefined>(undefined);
  const selectedLabelIdRef = useRef<string | undefined>(undefined);
  const editingLabelRef = useRef<MarkerAnnotation | undefined>(undefined);
  const lastLabelFontSizeByPhotoRef = useRef<Record<string, number>>({});

  useEffect(() => {
    selectedPathIdRef.current = selectedPathId;
  }, [selectedPathId]);

  useEffect(() => {
    editingPathPointsRef.current = editingPathPoints;
  }, [editingPathPoints]);

  useEffect(() => {
    selectedLabelIdRef.current = selectedLabelId;
  }, [selectedLabelId]);

  useEffect(() => {
    editingLabelRef.current = editingLabel;
  }, [editingLabel]);

  const refresh = useCallback(async () => {
    if (projectId) {
      setProject(await loadProject(projectId));
    }
  }, [loadProject, projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const photo = project?.photos.find((item) => item.id === photoId);
  const route = project?.routes[0];
  const savedAnnotations = useMemo(
    () => project?.annotations.filter((annotation) => annotation.photoId === photoId) ?? [],
    [photoId, project?.annotations],
  );
  const annotations = useMemo(() => {
    const editedAnnotations = savedAnnotations.map((annotation) => {
      if (annotation.id === selectedPathId && editingPathPoints && 'points' in annotation) {
        return { ...annotation, points: editingPathPoints };
      }
      if (annotation.id === selectedLabelId && editingLabel) {
        return editingLabel;
      }
      return annotation;
    });

    if (
      !project ||
      !photo ||
      draftPoints.length === 0 ||
      activeTool === 'select' ||
      !isPathKind(activeTool)
    ) {
      return editedAnnotations;
    }

    const now = new Date().toISOString();
    const draft: Annotation = {
      id: 'draft',
      topoId: project.id,
      photoId: photo.id,
      routeId: route?.id,
      kind: activeTool,
      color: defaultColorForKind(activeTool),
      points: draftPoints,
      createdAt: now,
      updatedAt: now,
    };
    return [...editedAnnotations, draft];
  }, [
    activeTool,
    draftPoints,
    editingLabel,
    editingPathPoints,
    photo,
    project,
    route?.id,
    savedAnnotations,
    selectedLabelId,
    selectedPathId,
  ]);

  async function handlePlace(
    kind: MarkerAnnotationKind,
    point: NormalizedPoint,
    context: { labelFontSize?: number },
  ) {
    if (!project || !photo) {
      return;
    }
    selectedPathIdRef.current = undefined;
    editingPathPointsRef.current = undefined;
    selectedLabelIdRef.current = undefined;
    editingLabelRef.current = undefined;
    setSelectedPathId(undefined);
    setEditingPathPoints(undefined);
    setSelectedLabelId(undefined);
    setEditingLabel(undefined);

    const rememberedFontSize = lastLabelFontSizeByPhotoRef.current[photo.id];
    const labelFontSize =
      kind === 'label'
        ? clampLabelFontSize(rememberedFontSize ?? context.labelFontSize ?? DEFAULT_LABEL_FONT_SIZE)
        : undefined;

    const annotation = await addAnnotation({
      topoId: project.id,
      photoId: photo.id,
      routeId: route?.id,
      kind,
      point,
      label: kind === 'label' ? '' : undefined,
      labelFontSize,
    });
    if (kind === 'label' && 'point' in annotation) {
      lastLabelFontSizeByPhotoRef.current[photo.id] =
        annotation.labelFontSize ?? labelFontSize ?? DEFAULT_LABEL_FONT_SIZE;
      selectedLabelIdRef.current = annotation.id;
      editingLabelRef.current = annotation;
      setActiveTool('select');
      setSelectedLabelId(annotation.id);
      setEditingLabel(annotation);
    }
    await refresh();
  }

  function beginPathDraft(kind: PathAnnotationKind, point: NormalizedPoint) {
    if (!isPathKind(kind)) {
      return;
    }
    selectedPathIdRef.current = undefined;
    editingPathPointsRef.current = undefined;
    selectedLabelIdRef.current = undefined;
    editingLabelRef.current = undefined;
    setSelectedPathId(undefined);
    setEditingPathPoints(undefined);
    setSelectedLabelId(undefined);
    setEditingLabel(undefined);
    draftKindRef.current = kind;
    draftPointsRef.current = [point];
    setDraftPoints([point]);
  }

  function extendPathDraft(point: NormalizedPoint, sampleSize: { width: number; height: number }) {
    const next = appendSampledPoint(
      draftPointsRef.current,
      point,
      sampleSize,
      CONTROL_POINT_MIN_DISTANCE,
    );
    draftPointsRef.current = next;
    setDraftPoints(next);
  }

  async function finishPathDraft(point: NormalizedPoint, sampleSize: { width: number; height: number }) {
    const kind = draftKindRef.current;
    const finalizedPoints = finalizeSampledPoints(
      draftPointsRef.current,
      point,
      sampleSize,
      CONTROL_POINT_MIN_DISTANCE,
    );
    draftPointsRef.current = finalizedPoints;
    setDraftPoints(finalizedPoints);

    if (!project || !photo || !kind || finalizedPoints.length < 2) {
      return;
    }

    const annotation = await addPathAnnotation({
      topoId: project.id,
      photoId: photo.id,
      routeId: route?.id,
      kind,
      points: finalizedPoints,
    });
    const selectedPoints = 'points' in annotation ? annotation.points : finalizedPoints;
    draftKindRef.current = undefined;
    draftPointsRef.current = [];
    setDraftPoints([]);
    selectedPathIdRef.current = annotation.id;
    editingPathPointsRef.current = selectedPoints;
    selectedLabelIdRef.current = undefined;
    editingLabelRef.current = undefined;
    setActiveTool('select');
    setSelectedPathId(annotation.id);
    setEditingPathPoints(selectedPoints);
    setSelectedLabelId(undefined);
    setEditingLabel(undefined);
    await refresh();
  }

  function selectPath(annotationId?: string, points?: NormalizedPoint[]) {
    void commitEditingLabelSnapshot();
    selectedPathIdRef.current = annotationId;
    editingPathPointsRef.current = points ? [...points] : undefined;
    selectedLabelIdRef.current = undefined;
    editingLabelRef.current = undefined;
    setSelectedPathId(annotationId);
    setEditingPathPoints(points ? [...points] : undefined);
    setSelectedLabelId(undefined);
    setEditingLabel(undefined);
    draftKindRef.current = undefined;
    draftPointsRef.current = [];
    setDraftPoints([]);
  }

  function selectLabel(annotationId?: string) {
    const annotation = savedAnnotations.find(
      (item): item is MarkerAnnotation => item.id === annotationId && 'point' in item && item.kind === 'label',
    );
    selectedPathIdRef.current = undefined;
    editingPathPointsRef.current = undefined;
    selectedLabelIdRef.current = annotation?.id;
    editingLabelRef.current = annotation;
    setSelectedPathId(undefined);
    setEditingPathPoints(undefined);
    setSelectedLabelId(annotation?.id);
    setEditingLabel(annotation);
    draftKindRef.current = undefined;
    draftPointsRef.current = [];
    setDraftPoints([]);
  }

  function moveSelectedPathPoint(
    pointIndex: number,
    point: NormalizedPoint,
    sampleSize: { width: number; height: number },
  ) {
    setEditingPathPoints((points) => {
      if (!points) {
        return points;
      }
      const next = moveControlPoint(points, pointIndex, point, sampleSize, CONTROL_POINT_MIN_DISTANCE);
      editingPathPointsRef.current = next;
      return next;
    });
  }

  function changeSelectedLabelText(label: string) {
    const annotation = editingLabelRef.current;
    if (!annotation) {
      return;
    }
    const next = { ...annotation, label };
    editingLabelRef.current = next;
    setEditingLabel(next);
  }

  function moveSelectedLabel(point: NormalizedPoint) {
    setEditingLabel((annotation) => {
      if (!annotation) {
        return annotation;
      }
      const next = { ...annotation, point };
      editingLabelRef.current = next;
      return next;
    });
  }

  function resizeSelectedLabel(fontSize: number) {
    setEditingLabel((annotation) => {
      if (!annotation || !photo) {
        return annotation;
      }
      const next = { ...annotation, labelFontSize: clampLabelFontSize(fontSize) };
      lastLabelFontSizeByPhotoRef.current[photo.id] = next.labelFontSize;
      editingLabelRef.current = next;
      return next;
    });
  }

  async function commitEditingLabelSnapshot() {
    const annotation = editingLabelRef.current;
    if (!annotation) {
      return;
    }

    if ((annotation.label ?? '').trim().length === 0) {
      await removeAnnotation(annotation);
      selectedLabelIdRef.current = undefined;
      editingLabelRef.current = undefined;
      setSelectedLabelId(undefined);
      setEditingLabel(undefined);
      await refresh();
      return;
    }

    await updateAnnotation(annotation);
    await refresh();
  }

  async function commitSelectedPathEdit() {
    const annotationId = selectedPathIdRef.current;
    const points = editingPathPointsRef.current;
    const annotation = savedAnnotations.find((item) => item.id === annotationId);
    if (!annotation || !points || !('points' in annotation)) {
      return;
    }

    await updateAnnotation({ ...annotation, points });
    await refresh();
  }

  async function commitSelectedLabelEdit() {
    await commitEditingLabelSnapshot();
  }

  async function deleteLastAnnotation() {
    const last = savedAnnotations.at(-1);
    if (!last) {
      return;
    }

    await removeAnnotation(last);
    await refresh();
  }

  function handleUndo() {
    if (draftPoints.length > 0) {
      setDraftPoints((points) => points.slice(0, -1));
      draftPointsRef.current = draftPointsRef.current.slice(0, -1);
      return;
    }
    if (savedAnnotations.length === 0) {
      return;
    }
    void deleteLastAnnotation();
  }

  if (!project || !photo) {
    return (
      <View style={[styles.root, styles.center]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.loadingText}>Loading editor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />
      <TopoCanvas
        activeTool={activeTool}
        annotations={annotations}
        onBeginPathDraft={beginPathDraft}
        onChangeSelectedLabelText={changeSelectedLabelText}
        onCommitSelectedLabelEdit={commitSelectedLabelEdit}
        onCommitSelectedPathEdit={commitSelectedPathEdit}
        onExtendPathDraft={extendPathDraft}
        onFinishPathDraft={finishPathDraft}
        onMoveSelectedLabel={moveSelectedLabel}
        onMoveSelectedPathPoint={moveSelectedPathPoint}
        onPlaceAnnotation={handlePlace}
        onResizeSelectedLabel={resizeSelectedLabel}
        onSelectLabel={selectLabel}
        onSelectPath={selectPath}
        photo={photo}
        selectedLabelId={selectedLabelId}
        selectedPathId={selectedPathId}
      />
      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.topOverlay}>
        <EditorTopBar
          canRedo={false}
          canSave
          canUndo={draftPoints.length > 0 || savedAnnotations.length > 0}
          onBack={() => router.back()}
          onRedo={() => undefined}
          onSave={() => router.back()}
          onUndo={handleUndo}
        />
      </SafeAreaView>
      <SafeAreaView edges={['bottom']} pointerEvents="box-none" style={styles.bottomOverlay}>
        <ToolPalette
          onSelectTool={(tool) => {
            void commitEditingLabelSnapshot();
            setActiveTool(tool);
            setDraftPoints([]);
            draftKindRef.current = undefined;
            draftPointsRef.current = [];
            selectedPathIdRef.current = undefined;
            editingPathPointsRef.current = undefined;
            selectedLabelIdRef.current = undefined;
            editingLabelRef.current = undefined;
            setSelectedPathId(undefined);
            setEditingPathPoints(undefined);
            setSelectedLabelId(undefined);
            setEditingLabel(undefined);
          }}
          selectedTool={activeTool}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  root: {
    backgroundColor: '#000000',
    flex: 1,
  },
  topOverlay: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
