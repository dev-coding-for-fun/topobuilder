import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
import {
  DEFAULT_LINE_WEIGHT,
  type LineWeight,
  lineWeightForAnnotation,
} from '@/domain/lineWeights';
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
import { DEFAULT_STAMP_SIZE, type StampSize, stampSizeForAnnotation } from '@/domain/stampSizes';
import {
  decrementRouteMarkerNumber,
  incrementRouteMarkerNumber,
  nextUnusedRouteMarkerNumber,
  parseRouteMarkerNumber,
  routeMarkerNumberLabel,
  type RouteMarkerNumber,
} from '@/domain/routeMarkerNumbers';
import { DEFAULT_LABEL_FONT_SIZE, clampLabelFontSize } from '@/domain/textLabels';
import { EditorTopBar } from '@/editor/EditorTopBar';
import { LineWeightControl } from '@/editor/LineWeightControl';
import { RouteMarkerNumberControl } from '@/editor/RouteMarkerNumberControl';
import { StampSizeControl } from '@/editor/StampSizeControl';
import { ToolPalette } from '@/editor/ToolPalette';
import { TopoCanvas } from '@/editor/TopoCanvas';
import { useTopoStore } from '@/state/TopoStore';
import { interStyle } from '@/ui/fonts';

const CONTROL_POINT_MIN_DISTANCE = 44;

type ContextControl = 'colour' | 'lineWeight' | 'stampSize';

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
  const [isEditingRouteMarkerNumber, setIsEditingRouteMarkerNumber] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [lastLabelColorByPhoto, setLastLabelColorByPhoto] = useState<Record<string, string>>({});
  const [lastLineColorByPhoto, setLastLineColorByPhoto] = useState<Record<string, string>>({});
  const [lastLineWeightByPhoto, setLastLineWeightByPhoto] = useState<Record<string, LineWeight>>({});
  const [lastStampColorByPhoto, setLastStampColorByPhoto] = useState<Record<string, Partial<Record<StampAnnotationKind, string>>>>({});
  const [nextRouteMarkerNumberByPhoto, setNextRouteMarkerNumberByPhoto] = useState<Record<string, RouteMarkerNumber>>({});
  const [stampSizeByPhoto, setStampSizeByPhoto] = useState<Record<string, StampSize>>({});
  const [openContextControl, setOpenContextControl] = useState<ContextControl>();
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
  const lastLineWeightByPhotoRef = useRef<Record<string, LineWeight>>({});
  const lastStampColorByPhotoRef = useRef<Record<string, Partial<Record<StampAnnotationKind, string>>>>({});
  const nextRouteMarkerNumberByPhotoRef = useRef<Record<string, RouteMarkerNumber>>({});
  const stampSizeByPhotoRef = useRef<Record<string, StampSize>>({});

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
    nextRouteMarkerNumberByPhotoRef.current = nextRouteMarkerNumberByPhoto;
  }, [nextRouteMarkerNumberByPhoto]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    function updateKeyboardHeight(event: KeyboardEvent) {
      const keyboardTop = event.endCoordinates.screenY;
      const heightFromScreenY = windowHeight > keyboardTop ? windowHeight - keyboardTop : 0;
      const nextHeight = heightFromScreenY > 0 ? heightFromScreenY : event.endCoordinates.height;
      setKeyboardHeight(Math.max(0, Math.min(nextHeight, windowHeight)));
    }

    const subscriptions = [
      Keyboard.addListener('keyboardDidShow', updateKeyboardHeight),
      Keyboard.addListener('keyboardDidChangeFrame', updateKeyboardHeight),
      Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardHeight(0);
        setIsEditingRouteMarkerNumber(false);
      }),
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
  useEffect(() => {
    if (!photo || nextRouteMarkerNumberByPhotoRef.current[photo.id] !== undefined) {
      return;
    }

    const nextNumber = nextUnusedRouteMarkerNumber(savedAnnotations);
    nextRouteMarkerNumberByPhotoRef.current = {
      ...nextRouteMarkerNumberByPhotoRef.current,
      [photo.id]: nextNumber,
    };
    setNextRouteMarkerNumberByPhoto((numbers) => ({ ...numbers, [photo.id]: nextNumber }));
  }, [photo, savedAnnotations]);

  const savedStampSize = useMemo(() => {
    const stamp = savedAnnotations.find(isStampAnnotation);
    return stamp ? stampSizeForAnnotation(stamp) : DEFAULT_STAMP_SIZE;
  }, [savedAnnotations]);
  const currentStampSize = photo ? (stampSizeByPhoto[photo.id] ?? savedStampSize) : DEFAULT_STAMP_SIZE;
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
      lineWeight: currentLineWeightForPhoto(photo.id),
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

  function currentLineWeightForPhoto(photoId: string) {
    return lastLineWeightByPhotoRef.current[photoId] ?? DEFAULT_LINE_WEIGHT;
  }

  function currentStampColorForPhoto(photoId: string, kind: StampAnnotationKind) {
    return lastStampColorByPhotoRef.current[photoId]?.[kind] ?? defaultAnnotationColourForTarget(kind);
  }

  function currentStampSizeForPhoto(photoId: string) {
    return stampSizeByPhotoRef.current[photoId] ?? savedStampSize;
  }

  function currentRouteMarkerNumberForPhoto(photoId: string) {
    return Object.prototype.hasOwnProperty.call(nextRouteMarkerNumberByPhotoRef.current, photoId)
      ? nextRouteMarkerNumberByPhotoRef.current[photoId]
      : nextUnusedRouteMarkerNumber(savedAnnotations);
  }

  function setNextRouteMarkerNumberForPhoto(photoId: string, value: RouteMarkerNumber) {
    nextRouteMarkerNumberByPhotoRef.current = {
      ...nextRouteMarkerNumberByPhotoRef.current,
      [photoId]: value,
    };
    setNextRouteMarkerNumberByPhoto((numbers) => ({ ...numbers, [photoId]: value }));
  }

  function advanceNextRouteMarkerNumber(
    photoId: string,
    placedNumber: RouteMarkerNumber,
    nextAnnotations: Annotation[],
  ) {
    const nextNumber =
      placedNumber === null || placedNumber >= 99
        ? null
        : nextUnusedRouteMarkerNumber(nextAnnotations, placedNumber + 1);
    setNextRouteMarkerNumberForPhoto(photoId, nextNumber);
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
    const stampSize = isStampKind(kind) ? currentStampSizeForPhoto(photo.id) : undefined;
    const routeMarkerNumber = kind === 'start' ? currentRouteMarkerNumberForPhoto(photo.id) : undefined;

    const annotation = await addAnnotation({
      topoId: project.id,
      photoId: photo.id,
      routeId: route?.id,
      kind,
      point,
      color,
      label: kind === 'label' ? '' : kind === 'start' ? routeMarkerNumberLabel(routeMarkerNumber ?? null) : undefined,
      labelFontSize,
      stampSize,
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
      if (kind === 'start') {
        advanceNextRouteMarkerNumber(photo.id, routeMarkerNumber ?? null, [
          ...savedAnnotations.filter((item) => item.id !== annotation.id),
          annotation,
        ]);
      }
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
      lineWeight: currentLineWeightForPhoto(photo.id),
    });
    if (isPathAnnotation(annotation)) {
      lastLineColorByPhotoRef.current[photo.id] = annotation.color;
      lastLineWeightByPhotoRef.current[photo.id] = lineWeightForAnnotation(annotation);
      setLastLineColorByPhoto((colors) => ({ ...colors, [photo.id]: annotation.color }));
      setLastLineWeightByPhoto((weights) => ({ ...weights, [photo.id]: lineWeightForAnnotation(annotation) }));
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

  function moveSelectedStamp(point: NormalizedPoint) {
    setEditingStamp((annotation) => {
      if (!annotation) {
        return annotation;
      }
      const next = { ...annotation, point };
      editingStampRef.current = next;
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

  async function changeSelectedPathWeight(lineWeight: LineWeight) {
    if (!photo) {
      return;
    }

    lastLineWeightByPhotoRef.current[photo.id] = lineWeight;
    setLastLineWeightByPhoto((weights) => ({ ...weights, [photo.id]: lineWeight }));
    const annotationId = selectedPathIdRef.current;
    const points = editingPathPointsRef.current;
    const annotation = savedAnnotations.find((item) => item.id === annotationId);
    if (!annotation || !isPathAnnotation(annotation)) {
      return;
    }

    const next = { ...annotation, points: points ?? annotation.points, lineWeight };
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

  async function changeRouteMarkerNumber(value: RouteMarkerNumber) {
    if (!photo) {
      return;
    }

    const annotation = editingStampRef.current;
    if (!annotation || annotation.kind !== 'start') {
      setNextRouteMarkerNumberForPhoto(photo.id, value);
      return;
    }

    const previousNumber = parseRouteMarkerNumber(annotation.label);
    const next = { ...annotation, label: routeMarkerNumberLabel(value) };
    editingStampRef.current = next;
    setEditingStamp(next);
    const updated = await updateAnnotation(next);
    if (isStampAnnotation(updated)) {
      editingStampRef.current = updated;
      setEditingStamp(updated);
    }

    if (typeof previousNumber === 'number') {
      const nextAnnotations = savedAnnotations.map((item) => (item.id === next.id ? next : item));
      setNextRouteMarkerNumberForPhoto(
        photo.id,
        nextUnusedRouteMarkerNumber(nextAnnotations, Math.min(previousNumber, currentRouteMarkerNumberForPhoto(photo.id) ?? previousNumber)),
      );
    }
    await refresh();
  }

  function changeRouteMarkerNumberByStep(direction: 'decrement' | 'increment') {
    if (!photo) {
      return;
    }

    const currentValue =
      editingStamp?.kind === 'start'
        ? (parseRouteMarkerNumber(editingStamp.label) ?? null)
        : currentRouteMarkerNumberForPhoto(photo.id);
    const nextValue =
      direction === 'increment'
        ? incrementRouteMarkerNumber(currentValue)
        : decrementRouteMarkerNumber(currentValue);
    void changeRouteMarkerNumber(nextValue);
  }

  async function changeStampSize(size: StampSize) {
    if (!project || !photo) {
      return;
    }

    stampSizeByPhotoRef.current[photo.id] = size;
    setStampSizeByPhoto((sizes) => ({ ...sizes, [photo.id]: size }));

    const stampAnnotations = savedAnnotations.filter(isStampAnnotation);
    const updatedStamps = stampAnnotations.map((annotation) => ({ ...annotation, stampSize: size }));
    const selectedUpdate = updatedStamps.find((annotation) => annotation.id === selectedStampIdRef.current);
    if (selectedUpdate) {
      editingStampRef.current = selectedUpdate;
      setEditingStamp(selectedUpdate);
    }

    setProject((current) =>
      current && current.id === project.id
        ? {
            ...current,
            annotations: current.annotations.map((annotation) => {
              const updated = updatedStamps.find((stamp) => stamp.id === annotation.id);
              return updated ?? annotation;
            }),
          }
        : current,
    );

    await Promise.all(updatedStamps.map((annotation) => updateAnnotation(annotation)));
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

  async function commitSelectedStampEdit() {
    const annotation = editingStampRef.current;
    if (!annotation) {
      return;
    }

    await updateAnnotation(annotation);
    await refresh();
  }

  async function deleteSelectedAnnotation() {
    const selectedAnnotation = savedAnnotations.find(
      (annotation) =>
        annotation.id === selectedLabelIdRef.current ||
        annotation.id === selectedStampIdRef.current ||
        annotation.id === selectedPathIdRef.current,
    );
    if (!selectedAnnotation) {
      return;
    }

    clearSelectionState();
    await removeAnnotation(selectedAnnotation);
    await refresh();
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
      <View style={[styles.root, styles.center]} testID="editor:loading">
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.loadingText}>Loading editor...</Text>
      </View>
    );
  }

  const selectedPath = savedAnnotations.find((annotation) => annotation.id === selectedPathId);
  const selectedAnnotation = savedAnnotations.find(
    (annotation) =>
      annotation.id === selectedLabelId ||
      annotation.id === selectedStampId ||
      annotation.id === selectedPathId,
  );
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
  const canChooseLineWeight =
    (selectedPath && isPathAnnotation(selectedPath)) ||
    (activeTool !== 'select' && isPathKind(activeTool));
  const currentLineWeight =
    selectedPath && isPathAnnotation(selectedPath)
      ? lineWeightForAnnotation(selectedPath)
      : lastLineWeightByPhoto[photo.id] ?? DEFAULT_LINE_WEIGHT;
  const canChooseStampSize = activeTool !== 'select' && isStampKind(activeTool);
  const routeMarkerNumberControlValue =
    editingStamp?.kind === 'start'
      ? (parseRouteMarkerNumber(editingStamp.label) ?? null)
      : activeTool === 'start'
        ? currentRouteMarkerNumberForPhoto(photo.id)
        : undefined;
  const supportsKeyboardAvoidance = Platform.OS !== 'web';
  const isKeyboardEditingLabel = supportsKeyboardAvoidance && Boolean(selectedLabelId && keyboardHeight > 0);
  const isKeyboardEditingRouteMarkerNumber = supportsKeyboardAvoidance && isEditingRouteMarkerNumber && keyboardHeight > 0;
  const bottomOverlayKeyboardOffset = isKeyboardEditingLabel || isKeyboardEditingRouteMarkerNumber ? keyboardHeight : 0;

  return (
    <View style={styles.root} testID="editor:screen">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />
      <View
        style={[styles.canvasRegion, isKeyboardEditingLabel ? { marginBottom: keyboardHeight } : null]}
        testID="editor:canvas-region"
      >
        <TopoCanvas
          activeTool={activeTool}
          annotations={annotations}
          onBeginPathDraft={beginPathDraft}
          onChangeSelectedLabelText={changeSelectedLabelText}
          onCommitSelectedLabelEdit={commitSelectedLabelEdit}
          onCommitSelectedPathEdit={commitSelectedPathEdit}
          onCommitSelectedStampEdit={commitSelectedStampEdit}
          onExtendPathDraft={extendPathDraft}
          onFinishPathDraft={finishPathDraft}
          onMoveSelectedLabel={moveSelectedLabel}
          onMoveSelectedPathPoint={moveSelectedPathPoint}
          onMoveSelectedStamp={moveSelectedStamp}
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
          canUndo={draftPoints.length > 0 || savedAnnotations.length > 0}
          canDelete={Boolean(selectedAnnotation)}
          onBack={() => router.back()}
          onDelete={() => {
            void deleteSelectedAnnotation();
          }}
          onRedo={() => undefined}
          onUndo={handleUndo}
        />
      </SafeAreaView>
      <SafeAreaView
        edges={['bottom']}
        pointerEvents="box-none"
        style={[
          styles.bottomOverlay,
          bottomOverlayKeyboardOffset > 0 ? { bottom: bottomOverlayKeyboardOffset } : null,
        ]}
        testID="editor:bottom-overlay"
      >
        <View style={styles.contextControls}>
          {routeMarkerNumberControlValue !== undefined ? (
            <RouteMarkerNumberControl
              accessibilityLabel={editingStamp?.kind === 'start' ? 'Route marker number' : 'Next route marker number'}
              onChangeValue={(value) => {
                void changeRouteMarkerNumber(value);
              }}
              onDecrement={() => changeRouteMarkerNumberByStep('decrement')}
              onEditingChange={setIsEditingRouteMarkerNumber}
              onIncrement={() => changeRouteMarkerNumberByStep('increment')}
              value={routeMarkerNumberControlValue}
            />
          ) : null}
          {canChooseAnnotationColor ? (
            <AnnotationColorControl
              currentColor={currentAnnotationColor ?? defaultAnnotationColourForTarget('label')}
              expanded={openContextControl === 'colour'}
              onExpandedChange={(expanded) => setOpenContextControl(expanded ? 'colour' : undefined)}
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
              visibleLabel="Colour"
            />
          ) : null}
          {canChooseLineWeight ? (
            <LineWeightControl
              currentWeight={currentLineWeight}
              expanded={openContextControl === 'lineWeight'}
              onExpandedChange={(expanded) => setOpenContextControl(expanded ? 'lineWeight' : undefined)}
              onSelectWeight={(weight) => {
                void changeSelectedPathWeight(weight);
              }}
              visibleLabel="Weight"
            />
          ) : null}
          {canChooseStampSize ? (
            <StampSizeControl
              currentSize={currentStampSize}
              expanded={openContextControl === 'stampSize'}
              onExpandedChange={(expanded) => setOpenContextControl(expanded ? 'stampSize' : undefined)}
              onSelectSize={(size) => {
                void changeStampSize(size);
              }}
              visibleLabel="Size"
            />
          ) : null}
        </View>
        {isKeyboardEditingLabel || isKeyboardEditingRouteMarkerNumber ? null : (
          <ToolPalette
            onSelectTool={(tool) => {
              void commitEditingLabelSnapshot();
              setOpenContextControl(undefined);
              setIsEditingRouteMarkerNumber(false);
              setActiveTool(tool);
              clearDraftState();
              clearSelectionState();
            }}
            routeMarkerLabel={routeMarkerNumberLabel(currentRouteMarkerNumberForPhoto(photo.id))}
            selectedTool={activeTool}
            stampColors={{
              belay: lastStampColorByPhoto[photo.id]?.belay ?? defaultAnnotationColourForTarget('belay'),
              bolt: lastStampColorByPhoto[photo.id]?.bolt ?? defaultAnnotationColourForTarget('bolt'),
              rappel: lastStampColorByPhoto[photo.id]?.rappel ?? defaultAnnotationColourForTarget('rappel'),
              start: lastStampColorByPhoto[photo.id]?.start ?? defaultAnnotationColourForTarget('start'),
            }}
          />
        )}
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
  contextControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  loadingText: {
    color: '#F8FAFC',
    ...interStyle('700'),
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
