import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardEvent, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ANNOTATION_COLOUR_PALETTE,
  type AnnotationColourTarget,
  type StampAnnotationKind,
  defaultAnnotationColourForTarget,
} from '@/domain/annotationColours';
import {
  annotationsForPhoto,
  isLabelAnnotation,
  isPathAnnotation,
  isPathKind,
  isStampAnnotation,
  isStampKind,
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
  const { height: windowHeight } = useWindowDimensions();
  const { loadProject, addAnnotation, addPathAnnotation, updateAnnotation, removeAnnotation } = useTopoStore();
  const [project, setProject] = useState<TopoProject>();
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [draftPoints, setDraftPoints] = useState<NormalizedPoint[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string>();
  const [editingPathPoints, setEditingPathPoints] = useState<NormalizedPoint[]>();
  const [selectedLabelId, setSelectedLabelId] = useState<string>();
  const [selectedStampId, setSelectedStampId] = useState<string>();
  const [editingLabel, setEditingLabel] = useState<MarkerAnnotation>();
  const [editingStamp, setEditingStamp] = useState<MarkerAnnotation & { kind: StampAnnotationKind }>();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [lastLabelColorByPhoto, setLastLabelColorByPhoto] = useState<Record<string, string>>({});
  const [lastLineColorByPhoto, setLastLineColorByPhoto] = useState<Record<string, string>>({});
  const [lastStampColorByPhoto, setLastStampColorByPhoto] = useState<Record<string, Partial<Record<StampAnnotationKind, string>>>>({});
  const draftPointsRef = useRef<NormalizedPoint[]>([]);
  const draftKindRef = useRef<PathAnnotationKind | undefined>(undefined);
  const selectedPathIdRef = useRef<string | undefined>(undefined);
  const editingPathPointsRef = useRef<NormalizedPoint[] | undefined>(undefined);
  const selectedLabelIdRef = useRef<string | undefined>(undefined);
  const selectedStampIdRef = useRef<string | undefined>(undefined);
  const editingLabelRef = useRef<MarkerAnnotation | undefined>(undefined);
  const editingStampRef = useRef<(MarkerAnnotation & { kind: StampAnnotationKind }) | undefined>(undefined);
  const lastLabelFontSizeByPhotoRef = useRef<Record<string, number>>({});
  const lastLabelColorByPhotoRef = useRef<Record<string, string>>({});
  const lastLineColorByPhotoRef = useRef<Record<string, string>>({});
  const lastStampColorByPhotoRef = useRef<Record<string, Partial<Record<StampAnnotationKind, string>>>>({});

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

  useEffect(() => {
    selectedStampIdRef.current = selectedStampId;
  }, [selectedStampId]);

  useEffect(() => {
    editingStampRef.current = editingStamp;
  }, [editingStamp]);

  useEffect(() => {
    function updateKeyboardHeight(event: KeyboardEvent) {
      const keyboardTop = event.endCoordinates.screenY;
      const heightFromScreenY = windowHeight > keyboardTop ? windowHeight - keyboardTop : 0;
      const nextHeight = heightFromScreenY > 0 ? heightFromScreenY : event.endCoordinates.height;
      setKeyboardHeight(Math.max(0, Math.min(nextHeight, windowHeight)));
    }

    const subscriptions = [
      Keyboard.addListener('keyboardDidShow', updateKeyboardHeight),
      Keyboard.addListener('keyboardDidChangeFrame', updateKeyboardHeight),
      Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0)),
    ];

    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [windowHeight]);

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
    const hasStampEdit = Boolean(selectedStampId && editingStamp);
    const hasPathDraft =
      Boolean(project && photo && draftPoints.length > 0) &&
      activeTool !== 'select' &&
      isPathKind(activeTool);

    if (!hasPathEdit && !hasLabelEdit && !hasStampEdit && !hasPathDraft) {
      return savedAnnotations;
    }

    const editedAnnotations =
      hasPathEdit || hasLabelEdit || hasStampEdit
        ? savedAnnotations.map((annotation) => {
            if (annotation.id === selectedPathId && editingPathPoints && isPathAnnotation(annotation)) {
              return { ...annotation, points: editingPathPoints };
            }
            if (annotation.id === selectedLabelId && editingLabel) {
              return editingLabel;
            }
            if (annotation.id === selectedStampId && editingStamp) {
              return editingStamp;
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
      color: currentLineColorForPhoto(photo.id),
      points: draftPoints,
      createdAt: now,
      updatedAt: now,
    };
    return [...editedAnnotations, draft];
  }, [
    activeTool,
    draftPoints,
    editingLabel,
    editingStamp,
    editingPathPoints,
    photo,
    project,
    route?.id,
    savedAnnotations,
    selectedLabelId,
    selectedPathId,
    selectedStampId,
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
    selectedStampIdRef.current = undefined;
    editingLabelRef.current = undefined;
    editingStampRef.current = undefined;
    setSelectedPathId(undefined);
    setEditingPathPoints(undefined);
    setSelectedLabelId(undefined);
    setSelectedStampId(undefined);
    setEditingLabel(undefined);
    setEditingStamp(undefined);
  }

  function selectPathSnapshot(annotationId?: string, points?: NormalizedPoint[]) {
    const nextPoints = points ? [...points] : undefined;
    selectedPathIdRef.current = annotationId;
    editingPathPointsRef.current = nextPoints;
    selectedLabelIdRef.current = undefined;
    selectedStampIdRef.current = undefined;
    editingLabelRef.current = undefined;
    editingStampRef.current = undefined;
    setSelectedPathId(annotationId);
    setEditingPathPoints(nextPoints);
    setSelectedLabelId(undefined);
    setSelectedStampId(undefined);
    setEditingLabel(undefined);
    setEditingStamp(undefined);
  }

  function selectLabelSnapshot(annotation?: MarkerAnnotation) {
    selectedPathIdRef.current = undefined;
    editingPathPointsRef.current = undefined;
    selectedLabelIdRef.current = annotation?.id;
    selectedStampIdRef.current = undefined;
    editingLabelRef.current = annotation;
    editingStampRef.current = undefined;
    setSelectedPathId(undefined);
    setEditingPathPoints(undefined);
    setSelectedLabelId(annotation?.id);
    setSelectedStampId(undefined);
    setEditingLabel(annotation);
    setEditingStamp(undefined);
  }

  function selectStampSnapshot(annotation?: MarkerAnnotation & { kind: StampAnnotationKind }) {
    selectedPathIdRef.current = undefined;
    editingPathPointsRef.current = undefined;
    selectedLabelIdRef.current = undefined;
    selectedStampIdRef.current = annotation?.id;
    editingLabelRef.current = undefined;
    editingStampRef.current = annotation;
    setSelectedPathId(undefined);
    setEditingPathPoints(undefined);
    setSelectedLabelId(undefined);
    setSelectedStampId(annotation?.id);
    setEditingLabel(undefined);
    setEditingStamp(annotation);
  }

  function currentLineColorForPhoto(photoId: string) {
    return lastLineColorByPhotoRef.current[photoId] ?? defaultAnnotationColourForTarget('line');
  }

  function currentStampColorForPhoto(photoId: string, kind: StampAnnotationKind) {
    return lastStampColorByPhotoRef.current[photoId]?.[kind] ?? defaultAnnotationColourForTarget(kind);
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
        : isStampKind(kind)
          ? currentStampColorForPhoto(photo.id, kind)
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
    } else if (isStampKind(kind)) {
      const placedStampColor = color ?? defaultAnnotationColourForTarget(kind);
      lastStampColorByPhotoRef.current[photo.id] = {
        ...lastStampColorByPhotoRef.current[photo.id],
        [kind]: placedStampColor,
      };
      setLastStampColorByPhoto((colors) => ({
        ...colors,
        [photo.id]: {
          ...colors[photo.id],
          [kind]: placedStampColor,
        },
      }));
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
      color: currentLineColorForPhoto(photo.id),
    });
    if (isPathAnnotation(annotation)) {
      lastLineColorByPhotoRef.current[photo.id] = annotation.color;
      setLastLineColorByPhoto((colors) => ({ ...colors, [photo.id]: annotation.color }));
    }
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

  function selectStamp(annotationId?: string) {
    const annotation = savedAnnotations.find(
      (item): item is MarkerAnnotation & { kind: StampAnnotationKind } =>
        item.id === annotationId && isStampAnnotation(item),
    );
    selectStampSnapshot(annotation);
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

  async function changeSelectedPathColor(color: string) {
    if (!photo) {
      return;
    }

    lastLineColorByPhotoRef.current[photo.id] = color;
    setLastLineColorByPhoto((colors) => ({ ...colors, [photo.id]: color }));
    const annotationId = selectedPathIdRef.current;
    const points = editingPathPointsRef.current;
    const annotation = savedAnnotations.find((item) => item.id === annotationId);
    if (!annotation || !isPathAnnotation(annotation)) {
      return;
    }

    const next = { ...annotation, points: points ?? annotation.points, color };
    const updated = await updateAnnotation(next);
    if (isPathAnnotation(updated)) {
      editingPathPointsRef.current = updated.points;
      setEditingPathPoints(updated.points);
    }
    await refresh();
  }

  async function changeSelectedStampColor(color: string) {
    if (!photo) {
      return;
    }

    const annotation = editingStampRef.current;
    const targetKind =
      annotation?.kind ?? (activeTool !== 'select' && isStampKind(activeTool) ? activeTool : undefined);
    if (!targetKind) {
      return;
    }

    lastStampColorByPhotoRef.current[photo.id] = {
      ...lastStampColorByPhotoRef.current[photo.id],
      [targetKind]: color,
    };
    setLastStampColorByPhoto((colors) => ({
      ...colors,
      [photo.id]: {
        ...colors[photo.id],
        [targetKind]: color,
      },
    }));

    if (!annotation) {
      return;
    }

    const next = { ...annotation, color };
    editingStampRef.current = next;
    setEditingStamp(next);
    const updated = await updateAnnotation(next);
    if (isStampAnnotation(updated)) {
      editingStampRef.current = updated;
      setEditingStamp(updated);
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

  const selectedPath = savedAnnotations.find((annotation) => annotation.id === selectedPathId);
  const activeColourTarget: AnnotationColourTarget | undefined = editingLabel
    ? 'label'
    : editingStamp
      ? editingStamp.kind
        : selectedPath && isPathAnnotation(selectedPath)
        ? 'line'
        : activeTool === 'label'
          ? 'label'
          : activeTool !== 'select' && isPathKind(activeTool)
            ? 'line'
            : activeTool !== 'select' && isStampKind(activeTool)
              ? activeTool
              : undefined;
  const currentAnnotationColor =
    activeColourTarget === 'label'
      ? (editingLabel?.color ?? lastLabelColorByPhoto[photo.id] ?? defaultAnnotationColourForTarget('label'))
      : activeColourTarget === 'line'
        ? (selectedPath && isPathAnnotation(selectedPath) ? selectedPath.color : lastLineColorByPhoto[photo.id] ?? defaultAnnotationColourForTarget('line'))
        : activeColourTarget
          ? (editingStamp?.color ?? lastStampColorByPhoto[photo.id]?.[activeColourTarget] ?? defaultAnnotationColourForTarget(activeColourTarget))
          : undefined;
  const canChooseAnnotationColor = Boolean(activeColourTarget && currentAnnotationColor);
  const isKeyboardEditingLabel = Boolean(selectedLabelId && keyboardHeight > 0);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />
      <View
        style={[styles.canvasRegion, isKeyboardEditingLabel ? { marginBottom: keyboardHeight } : null]}
        testID="editor-canvas-region"
      >
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
          onSelectStamp={selectStamp}
          photo={photo}
          selectedLabelId={selectedLabelId}
          selectedPathId={selectedPathId}
          selectedStampId={selectedStampId}
        />
      </View>
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
      <SafeAreaView
        edges={['bottom']}
        pointerEvents="box-none"
        style={[styles.bottomOverlay, isKeyboardEditingLabel ? styles.hiddenBottomOverlay : null]}
        testID="editor-bottom-overlay"
      >
        {canChooseAnnotationColor ? (
          <AnnotationColorControl
            currentColor={currentAnnotationColor ?? defaultAnnotationColourForTarget('label')}
            onSelectColor={(color) => {
              if (activeColourTarget === 'label') {
                void changeSelectedLabelColor(color);
              } else if (activeColourTarget === 'line') {
                void changeSelectedPathColor(color);
              } else if (activeColourTarget) {
                void changeSelectedStampColor(color);
              }
            }}
            swatches={ANNOTATION_COLOUR_PALETTE}
            targetLabel={
              activeColourTarget === 'label'
                ? 'Text colour'
                : activeColourTarget === 'line'
                  ? 'Line colour'
                  : 'Stamp colour'
            }
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
            stampColors={{
              belay: lastStampColorByPhoto[photo.id]?.belay ?? defaultAnnotationColourForTarget('belay'),
              bolt: lastStampColorByPhoto[photo.id]?.bolt ?? defaultAnnotationColourForTarget('bolt'),
              rappel: lastStampColorByPhoto[photo.id]?.rappel ?? defaultAnnotationColourForTarget('rappel'),
              start: lastStampColorByPhoto[photo.id]?.start ?? defaultAnnotationColourForTarget('start'),
            }}
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
  canvasRegion: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenBottomOverlay: {
    display: 'none',
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
