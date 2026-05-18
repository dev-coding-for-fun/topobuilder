import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ANNOTATION_COLOUR_PALETTE,
  defaultAnnotationColourForTarget,
} from '@/domain/annotationColours';
import {
  annotationsForPhoto,
  defaultColorForKind,
  isLabelAnnotation,
  isPathAnnotation,
  isPathKind,
} from '@/domain/annotationFactory';
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
import { AnnotationColorControl } from '@/editor/AnnotationColorControl';
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
  const [lastLabelColorByPhoto, setLastLabelColorByPhoto] = useState<Record<string, string>>({});
  const draftPointsRef = useRef<NormalizedPoint[]>([]);
  const draftKindRef = useRef<PathAnnotationKind | undefined>(undefined);
  const selectedPathIdRef = useRef<string | undefined>(undefined);
  const editingPathPointsRef = useRef<NormalizedPoint[] | undefined>(undefined);
  const selectedLabelIdRef = useRef<string | undefined>(undefined);
  const editingLabelRef = useRef<MarkerAnnotation | undefined>(undefined);
  const lastLabelFontSizeByPhotoRef = useRef<Record<string, number>>({});
  const lastLabelColorByPhotoRef = useRef<Record<string, string>>({});

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
    () => annotationsForPhoto(project?.annotations ?? [], photoId),
    [photoId, project?.annotations],
  );
  const annotations = useMemo(() => {
    const hasPathEdit = Boolean(selectedPathId && editingPathPoints);
    const hasLabelEdit = Boolean(selectedLabelId && editingLabel);
    const hasPathDraft =
      Boolean(project && photo && draftPoints.length > 0) &&
      activeTool !== 'select' &&
      isPathKind(activeTool);

    if (!hasPathEdit && !hasLabelEdit && !hasPathDraft) {
      return savedAnnotations;
    }

    const editedAnnotations =
      hasPathEdit || hasLabelEdit
        ? savedAnnotations.map((annotation) => {
            if (annotation.id === selectedPathId && editingPathPoints && isPathAnnotation(annotation)) {
              return { ...annotation, points: editingPathPoints };
            }
            if (annotation.id === selectedLabelId && editingLabel) {
              return editingLabel;
            }
            return annotation;
          })
        : savedAnnotations;

    if (!project || !photo || !hasPathDraft || !isPathKind(activeTool)) {
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

  function clearDraftState() {
    draftKindRef.current = undefined;
    draftPointsRef.current = [];
    setDraftPoints([]);
  }

  function clearSelectionState() {
    selectedPathIdRef.current = undefined;
    editingPathPointsRef.current = undefined;
    selectedLabelIdRef.current = undefined;
    editingLabelRef.current = undefined;
    setSelectedPathId(undefined);
    setEditingPathPoints(undefined);
    setSelectedLabelId(undefined);
    setEditingLabel(undefined);
  }

  function selectPathSnapshot(annotationId?: string, points?: NormalizedPoint[]) {
    const nextPoints = points ? [...points] : undefined;
    selectedPathIdRef.current = annotationId;
    editingPathPointsRef.current = nextPoints;
    selectedLabelIdRef.current = undefined;
    editingLabelRef.current = undefined;
    setSelectedPathId(annotationId);
    setEditingPathPoints(nextPoints);
    setSelectedLabelId(undefined);
    setEditingLabel(undefined);
  }

  function selectLabelSnapshot(annotation?: MarkerAnnotation) {
    selectedPathIdRef.current = undefined;
    editingPathPointsRef.current = undefined;
    selectedLabelIdRef.current = annotation?.id;
    editingLabelRef.current = annotation;
    setSelectedPathId(undefined);
    setEditingPathPoints(undefined);
    setSelectedLabelId(annotation?.id);
    setEditingLabel(annotation);
  }

  async function handlePlace(
    kind: MarkerAnnotationKind,
    point: NormalizedPoint,
    context: { labelFontSize?: number },
  ) {
    if (!project || !photo) {
      return;
    }
    clearSelectionState();

    const rememberedFontSize = lastLabelFontSizeByPhotoRef.current[photo.id];
    const rememberedColor = lastLabelColorByPhotoRef.current[photo.id];
    const labelFontSize =
      kind === 'label'
        ? clampLabelFontSize(rememberedFontSize ?? context.labelFontSize ?? DEFAULT_LABEL_FONT_SIZE)
        : undefined;
    const color =
      kind === 'label'
        ? (rememberedColor ?? defaultAnnotationColourForTarget('label'))
        : undefined;

    const annotation = await addAnnotation({
      topoId: project.id,
      photoId: photo.id,
      routeId: route?.id,
      kind,
      point,
      color,
      label: kind === 'label' ? '' : undefined,
      labelFontSize,
    });
    if (isLabelAnnotation(annotation)) {
      lastLabelFontSizeByPhotoRef.current[photo.id] =
        annotation.labelFontSize ?? labelFontSize ?? DEFAULT_LABEL_FONT_SIZE;
      lastLabelColorByPhotoRef.current[photo.id] = annotation.color;
      setLastLabelColorByPhoto((colors) => ({ ...colors, [photo.id]: annotation.color }));
      setActiveTool('select');
      selectLabelSnapshot(annotation);
    }
    await refresh();
  }

  function beginPathDraft(kind: PathAnnotationKind, point: NormalizedPoint) {
    if (!isPathKind(kind)) {
      return;
    }
    clearSelectionState();
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
    setActiveTool('select');
    selectPathSnapshot(annotation.id, selectedPoints);
    await refresh();
  }

  function selectPath(annotationId?: string, points?: NormalizedPoint[]) {
    void commitEditingLabelSnapshot();
    selectPathSnapshot(annotationId, points);
    clearDraftState();
  }

  function selectLabel(annotationId?: string) {
    const annotation = savedAnnotations.find(
      (item): item is MarkerAnnotation => item.id === annotationId && isLabelAnnotation(item),
    );
    selectLabelSnapshot(annotation);
    clearDraftState();
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

  async function changeSelectedLabelColor(color: string) {
    if (!photo) {
      return;
    }

    lastLabelColorByPhotoRef.current[photo.id] = color;
    setLastLabelColorByPhoto((colors) => ({ ...colors, [photo.id]: color }));
    const annotation = editingLabelRef.current;
    if (!annotation) {
      return;
    }

    const next = { ...annotation, color };
    editingLabelRef.current = next;
    setEditingLabel(next);
    const updated = await updateAnnotation(next);
    if (isLabelAnnotation(updated)) {
      editingLabelRef.current = updated;
      setEditingLabel(updated);
    }
    await refresh();
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
    if (!annotation || !points || !isPathAnnotation(annotation)) {
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

  const currentLabelColor =
    editingLabel?.color ??
    lastLabelColorByPhoto[photo.id] ??
    defaultAnnotationColourForTarget('label');
  const canChooseAnnotationColor = activeTool === 'label' || Boolean(selectedLabelId);

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
        {canChooseAnnotationColor ? (
          <AnnotationColorControl
            currentColor={currentLabelColor}
            onSelectColor={(color) => {
              void changeSelectedLabelColor(color);
            }}
            swatches={ANNOTATION_COLOUR_PALETTE}
          />
        ) : null}
        <ToolPalette
          onSelectTool={(tool) => {
            void commitEditingLabelSnapshot();
            setActiveTool(tool);
            clearDraftState();
            clearSelectionState();
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
