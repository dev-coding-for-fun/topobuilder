import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
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
  DEFAULT_LINE_STYLE,
  defaultLineStyleForKind,
  type LineStyle,
  lineStyleForAnnotation,
} from '@/domain/lineStyles';
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
  Topo,
  TopoEditorBundle,
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
import { useAnnotationHistory } from '@/editor/useAnnotationHistory';
import { LineStyleControl } from '@/editor/LineStyleControl';
import { LineWeightControl } from '@/editor/LineWeightControl';
import { RouteMarkerNumberControl } from '@/editor/RouteMarkerNumberControl';
import { StampSizeControl } from '@/editor/StampSizeControl';
import { ToolPalette } from '@/editor/ToolPalette';
import { TopoCanvas } from '@/editor/TopoCanvas';
import { NavBackButton } from '@/navigation/NavBackButton';
import { useNavigateToParent } from '@/navigation/navigateToParent';
import { useTopoStore } from '@/state/TopoStore';
import { Button } from '@/ui/Button';
import { interStyle } from '@/ui/fonts';

const CONTROL_POINT_MIN_DISTANCE = 44;

type ContextControl = 'colour' | 'lineWeight' | 'lineStyle' | 'stampSize';

type LoadedTopo = {
  topo: Topo;
  bundle: TopoEditorBundle;
};

/**
 * Build a `photo` shape compatible with `TopoCanvas` from a Topo. A Topo is
 * the photo, so the photo identity equals the topo's id. The canvas only
 * needs `id`, `uri`, `width`, and `height`.
 */
function photoFromTopo(topo: Topo) {
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

export default function EditorScreen() {
  const { cragId, topoId } = useLocalSearchParams<{ cragId: string; topoId: string }>();
  const navigateToParent = useNavigateToParent();
  const { height: windowHeight } = useWindowDimensions();
  const {
    isReady,
    loadTopoEditor,
    addAnnotation,
    addPathAnnotation,
    updateAnnotation,
    removeAnnotation,
    replaceAnnotations,
    attachPhotoFromLibrary,
  } = useTopoStore();
  const history = useAnnotationHistory(topoId);
  const [loaded, setLoaded] = useState<LoadedTopo>();
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [draftPoints, setDraftPoints] = useState<NormalizedPoint[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string>();
  const [editingPathPoints, setEditingPathPoints] = useState<NormalizedPoint[]>();
  const [selectedLabelId, setSelectedLabelId] = useState<string>();
  const [selectedStampId, setSelectedStampId] = useState<string>();
  const [editingLabel, setEditingLabel] = useState<MarkerAnnotation>();
  const [editingStamp, setEditingStamp] = useState<MarkerAnnotation & { kind: StampAnnotationKind }>();
  const [isEditingRouteMarkerNumber, setIsEditingRouteMarkerNumber] = useState(false);
  const [isImportingPhoto, setIsImportingPhoto] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  // Per-topo in-memory caches. Keyed by topo id; in practice there's only ever
  // one entry while the editor is mounted, but keeping it keyed makes it easy
  // to extend later without restructuring.
  const [lastLabelColorByTopo, setLastLabelColorByTopo] = useState<Record<string, string>>({});
  const [lastLineColorByTopo, setLastLineColorByTopo] = useState<Record<string, string>>({});
  const [lastLineWeightByTopo, setLastLineWeightByTopo] = useState<Record<string, LineWeight>>({});
  const [lastLineStyleByTopo, setLastLineStyleByTopo] = useState<Record<string, LineStyle>>({});
  const [lastStampColorByTopo, setLastStampColorByTopo] = useState<Record<string, Partial<Record<StampAnnotationKind, string>>>>({});
  const [nextRouteMarkerNumberByTopo, setNextRouteMarkerNumberByTopo] = useState<Record<string, RouteMarkerNumber>>({});
  const [stampSizeByTopo, setStampSizeByTopo] = useState<Record<string, StampSize>>({});
  const [openContextControl, setOpenContextControl] = useState<ContextControl>();
  const draftPointsRef = useRef<NormalizedPoint[]>([]);
  const draftKindRef = useRef<PathAnnotationKind | undefined>(undefined);
  const selectedPathIdRef = useRef<string | undefined>(undefined);
  const editingPathPointsRef = useRef<NormalizedPoint[] | undefined>(undefined);
  const selectedLabelIdRef = useRef<string | undefined>(undefined);
  const selectedStampIdRef = useRef<string | undefined>(undefined);
  const editingLabelRef = useRef<MarkerAnnotation | undefined>(undefined);
  const editingStampRef = useRef<(MarkerAnnotation & { kind: StampAnnotationKind }) | undefined>(undefined);
  const lastLabelFontSizeByTopoRef = useRef<Record<string, number>>({});
  const lastLabelColorByTopoRef = useRef<Record<string, string>>({});
  const lastLineColorByTopoRef = useRef<Record<string, string>>({});
  const lastLineWeightByTopoRef = useRef<Record<string, LineWeight>>({});
  const lastLineStyleByTopoRef = useRef<Record<string, LineStyle>>({});
  const lastStampColorByTopoRef = useRef<Record<string, Partial<Record<StampAnnotationKind, string>>>>({});
  const nextRouteMarkerNumberByTopoRef = useRef<Record<string, RouteMarkerNumber>>({});
  const stampSizeByTopoRef = useRef<Record<string, StampSize>>({});

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
    nextRouteMarkerNumberByTopoRef.current = nextRouteMarkerNumberByTopo;
  }, [nextRouteMarkerNumberByTopo]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

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
    if (!topoId || !isReady) return;
    const bundle = await loadTopoEditor(topoId);
    if (bundle) {
      setLoaded({ topo: bundle.topo, bundle });
    } else {
      setLoaded(undefined);
    }
  }, [isReady, loadTopoEditor, topoId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const topo = loaded?.topo;
  const photo = topo ? photoFromTopo(topo) : undefined;
  const route = loaded?.bundle.routes[0];
  const savedAnnotations = useMemo(() => loaded?.bundle.annotations ?? [], [loaded]);
  useEffect(() => {
    if (!photo || nextRouteMarkerNumberByTopoRef.current[photo.id] !== undefined) {
      return;
    }
    const nextNumber = nextUnusedRouteMarkerNumber(savedAnnotations);
    nextRouteMarkerNumberByTopoRef.current = {
      ...nextRouteMarkerNumberByTopoRef.current,
      [photo.id]: nextNumber,
    };
    setNextRouteMarkerNumberByTopo((numbers) => ({ ...numbers, [photo.id]: nextNumber }));
  }, [photo, savedAnnotations]);

  useEffect(() => {
    if (!photo || stampSizeByTopoRef.current[photo.id] !== undefined) {
      return;
    }
    const stamps = savedAnnotations.filter(isStampAnnotation);
    const lastStamp = stamps.at(-1);
    const size = lastStamp ? stampSizeForAnnotation(lastStamp) : DEFAULT_STAMP_SIZE;
    stampSizeByTopoRef.current[photo.id] = size;
    setStampSizeByTopo((sizes) => ({ ...sizes, [photo.id]: size }));
  }, [photo, savedAnnotations]);

  const savedStampSize = useMemo(() => {
    const stamps = savedAnnotations.filter(isStampAnnotation);
    const lastStamp = stamps.at(-1);
    return lastStamp ? stampSizeForAnnotation(lastStamp) : DEFAULT_STAMP_SIZE;
  }, [savedAnnotations]);
  const currentStampSize = photo ? (stampSizeByTopo[photo.id] ?? savedStampSize) : DEFAULT_STAMP_SIZE;
  const annotations = useMemo(() => {
    const hasPathEdit = Boolean(selectedPathId && editingPathPoints);
    const hasLabelEdit = Boolean(selectedLabelId && editingLabel);
    const hasStampEdit = Boolean(selectedStampId && editingStamp);
    const hasPathDraft =
      Boolean(loaded && photo && draftPoints.length > 0) &&
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

    if (!loaded || !photo || !hasPathDraft || !isPathKind(activeTool)) {
      return editedAnnotations;
    }

    const now = new Date().toISOString();
    const draft: Annotation = {
      id: 'draft',
      topoId: loaded.topo.id,
      routeId: route?.id,
      kind: activeTool,
      color: currentLineColorForTopo(photo.id),
      lineWeight: currentLineWeightForTopo(photo.id),
      lineStyle: currentLineStyleForTopo(photo.id, isPathKind(activeTool) ? activeTool : undefined),
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
    loaded,
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

  function currentLineColorForTopo(id: string) {
    return lastLineColorByTopoRef.current[id] ?? defaultAnnotationColourForTarget('line');
  }

  function currentLineWeightForTopo(id: string) {
    return lastLineWeightByTopoRef.current[id] ?? DEFAULT_LINE_WEIGHT;
  }

  function currentLineStyleForTopo(id: string, kind?: PathAnnotationKind) {
    return lastLineStyleByTopoRef.current[id] ?? (kind ? defaultLineStyleForKind(kind) : DEFAULT_LINE_STYLE);
  }

  function currentStampColorForTopo(id: string, kind: StampAnnotationKind) {
    return lastStampColorByTopoRef.current[id]?.[kind] ?? defaultAnnotationColourForTarget(kind);
  }

  function currentStampSizeForTopo(id: string) {
    return stampSizeByTopoRef.current[id] ?? savedStampSize;
  }

  function currentRouteMarkerNumberForTopo(id: string) {
    return Object.prototype.hasOwnProperty.call(nextRouteMarkerNumberByTopoRef.current, id)
      ? nextRouteMarkerNumberByTopoRef.current[id]
      : nextUnusedRouteMarkerNumber(savedAnnotations);
  }

  function setNextRouteMarkerNumberForTopo(id: string, value: RouteMarkerNumber) {
    nextRouteMarkerNumberByTopoRef.current = {
      ...nextRouteMarkerNumberByTopoRef.current,
      [id]: value,
    };
    setNextRouteMarkerNumberByTopo((numbers) => ({ ...numbers, [id]: value }));
  }

  function advanceNextRouteMarkerNumber(
    id: string,
    placedNumber: RouteMarkerNumber,
    nextAnnotations: Annotation[],
  ) {
    const nextNumber =
      placedNumber === null || placedNumber >= 99
        ? null
        : nextUnusedRouteMarkerNumber(nextAnnotations, placedNumber + 1);
    setNextRouteMarkerNumberForTopo(id, nextNumber);
  }

  async function handlePlace(
    kind: MarkerAnnotationKind,
    point: NormalizedPoint,
    context: { labelFontSize?: number },
  ) {
    if (!loaded || !photo) return;
    clearSelectionState();

    const rememberedFontSize = lastLabelFontSizeByTopoRef.current[photo.id];
    const rememberedColor = lastLabelColorByTopoRef.current[photo.id];
    const labelFontSize =
      kind === 'label'
        ? clampLabelFontSize(rememberedFontSize ?? context.labelFontSize ?? DEFAULT_LABEL_FONT_SIZE)
        : undefined;
    const color =
      kind === 'label'
        ? (rememberedColor ?? defaultAnnotationColourForTarget('label'))
        : isStampKind(kind)
          ? currentStampColorForTopo(photo.id, kind)
        : undefined;
    const stampSize = isStampKind(kind) ? currentStampSizeForTopo(photo.id) : undefined;
    const routeMarkerNumber = kind === 'start' ? currentRouteMarkerNumberForTopo(photo.id) : undefined;

    history.recordSnapshot(savedAnnotations);
    const annotation = await addAnnotation({
      topoId: loaded.topo.id,
      routeId: route?.id,
      kind,
      point,
      color,
      label: kind === 'label' ? '' : kind === 'start' ? routeMarkerNumberLabel(routeMarkerNumber ?? null) : undefined,
      labelFontSize,
      stampSize,
    });
    if (isLabelAnnotation(annotation)) {
      lastLabelFontSizeByTopoRef.current[photo.id] =
        annotation.labelFontSize ?? labelFontSize ?? DEFAULT_LABEL_FONT_SIZE;
      lastLabelColorByTopoRef.current[photo.id] = annotation.color;
      setLastLabelColorByTopo((colors) => ({ ...colors, [photo.id]: annotation.color }));
      setActiveTool('select');
      selectLabelSnapshot(annotation);
    } else if (isStampKind(kind)) {
      const placedStampColor = color ?? defaultAnnotationColourForTarget(kind);
      lastStampColorByTopoRef.current[photo.id] = {
        ...lastStampColorByTopoRef.current[photo.id],
        [kind]: placedStampColor,
      };
      setLastStampColorByTopo((colors) => ({
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
    if (!isPathKind(kind)) return;
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

    if (!loaded || !photo || !kind || finalizedPoints.length < 2) return;

    history.recordSnapshot(savedAnnotations);
    const annotation = await addPathAnnotation({
      topoId: loaded.topo.id,
      routeId: route?.id,
      kind,
      points: finalizedPoints,
      color: currentLineColorForTopo(photo.id),
      lineWeight: currentLineWeightForTopo(photo.id),
      lineStyle: currentLineStyleForTopo(photo.id, kind),
    });
    if (isPathAnnotation(annotation)) {
      lastLineColorByTopoRef.current[photo.id] = annotation.color;
      lastLineWeightByTopoRef.current[photo.id] = lineWeightForAnnotation(annotation);
      lastLineStyleByTopoRef.current[photo.id] = lineStyleForAnnotation(annotation);
      setLastLineColorByTopo((colors) => ({ ...colors, [photo.id]: annotation.color }));
      setLastLineWeightByTopo((weights) => ({ ...weights, [photo.id]: lineWeightForAnnotation(annotation) }));
      setLastLineStyleByTopo((styles) => ({ ...styles, [photo.id]: lineStyleForAnnotation(annotation) }));
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
      if (!points) return points;
      const next = moveControlPoint(points, pointIndex, point, sampleSize, CONTROL_POINT_MIN_DISTANCE);
      editingPathPointsRef.current = next;
      return next;
    });
  }

  async function insertSelectedPathPoint(
    pointIndex: number,
    point: NormalizedPoint,
  ) {
    const annotationId = selectedPathIdRef.current;
    if (!annotationId) return;

    const annotation = savedAnnotations.find((item) => item.id === annotationId);
    if (!annotation || !isPathAnnotation(annotation)) return;

    const currentPoints = editingPathPointsRef.current ?? annotation.points;
    if (pointIndex <= 0 || pointIndex >= currentPoints.length) return;

    const nextPoints = [
      ...currentPoints.slice(0, pointIndex),
      point,
      ...currentPoints.slice(pointIndex),
    ];

    editingPathPointsRef.current = nextPoints;
    setEditingPathPoints(nextPoints);

    history.recordSnapshot(savedAnnotations);
    await updateAnnotation({ ...annotation, points: nextPoints });
    await refresh();
  }

  async function deleteSelectedPathPoint(pointIndex: number) {
    const annotationId = selectedPathIdRef.current;
    if (!annotationId) return;

    const annotation = savedAnnotations.find((item) => item.id === annotationId);
    if (!annotation || !isPathAnnotation(annotation)) return;

    const currentPoints = editingPathPointsRef.current ?? annotation.points;
    if (pointIndex < 0 || pointIndex >= currentPoints.length) return;

    if (currentPoints.length <= 2) {
      history.recordSnapshot(savedAnnotations);
      clearSelectionState();
      await removeAnnotation(annotation);
      await refresh();
      return;
    }

    const nextPoints = currentPoints.filter((_, idx) => idx !== pointIndex);
    editingPathPointsRef.current = nextPoints;
    setEditingPathPoints(nextPoints);

    history.recordSnapshot(savedAnnotations);
    await updateAnnotation({ ...annotation, points: nextPoints });
    await refresh();
  }

  function handleLongPressSelectedPathPoint(_pointIndex: number) {
    // Reserved for future control point long-press behavior.
  }

  function changeSelectedLabelText(label: string) {
    const annotation = editingLabelRef.current;
    if (!annotation) return;
    const next = { ...annotation, label };
    editingLabelRef.current = next;
    setEditingLabel(next);
  }

  function moveSelectedLabel(point: NormalizedPoint) {
    setEditingLabel((annotation) => {
      if (!annotation) return annotation;
      const next = { ...annotation, point };
      editingLabelRef.current = next;
      return next;
    });
  }

  function resizeSelectedLabel(fontSize: number) {
    setEditingLabel((annotation) => {
      if (!annotation || !photo) return annotation;
      const next = { ...annotation, labelFontSize: clampLabelFontSize(fontSize) };
      lastLabelFontSizeByTopoRef.current[photo.id] = next.labelFontSize;
      editingLabelRef.current = next;
      return next;
    });
  }

  function moveSelectedStamp(point: NormalizedPoint) {
    setEditingStamp((annotation) => {
      if (!annotation) return annotation;
      const next = { ...annotation, point };
      editingStampRef.current = next;
      return next;
    });
  }

  async function changeSelectedLabelColor(color: string) {
    if (!photo) return;

    lastLabelColorByTopoRef.current[photo.id] = color;
    setLastLabelColorByTopo((colors) => ({ ...colors, [photo.id]: color }));
    const annotation = editingLabelRef.current;
    if (!annotation) return;
    if (annotation.color === color) return;

    history.recordSnapshot(savedAnnotations);
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
    if (!photo) return;

    lastLineColorByTopoRef.current[photo.id] = color;
    setLastLineColorByTopo((colors) => ({ ...colors, [photo.id]: color }));
    const annotationId = selectedPathIdRef.current;
    const points = editingPathPointsRef.current;
    const annotation = savedAnnotations.find((item) => item.id === annotationId);
    if (!annotation || !isPathAnnotation(annotation)) return;
    if (annotation.color === color) return;

    history.recordSnapshot(savedAnnotations);
    const next = { ...annotation, points: points ?? annotation.points, color };
    const updated = await updateAnnotation(next);
    if (isPathAnnotation(updated)) {
      editingPathPointsRef.current = updated.points;
      setEditingPathPoints(updated.points);
    }
    await refresh();
  }

  async function changeSelectedPathWeight(lineWeight: LineWeight) {
    if (!photo) return;

    lastLineWeightByTopoRef.current[photo.id] = lineWeight;
    setLastLineWeightByTopo((weights) => ({ ...weights, [photo.id]: lineWeight }));
    const annotationId = selectedPathIdRef.current;
    const points = editingPathPointsRef.current;
    const annotation = savedAnnotations.find((item) => item.id === annotationId);
    if (!annotation || !isPathAnnotation(annotation)) return;
    if (annotation.lineWeight === lineWeight) return;

    history.recordSnapshot(savedAnnotations);
    const next = { ...annotation, points: points ?? annotation.points, lineWeight };
    const updated = await updateAnnotation(next);
    if (isPathAnnotation(updated)) {
      editingPathPointsRef.current = updated.points;
      setEditingPathPoints(updated.points);
    }
    await refresh();
  }

  async function changeSelectedPathStyle(lineStyle: LineStyle) {
    if (!photo) return;

    lastLineStyleByTopoRef.current[photo.id] = lineStyle;
    setLastLineStyleByTopo((styles) => ({ ...styles, [photo.id]: lineStyle }));
    const annotationId = selectedPathIdRef.current;
    const points = editingPathPointsRef.current;
    const annotation = savedAnnotations.find((item) => item.id === annotationId);
    if (!annotation || !isPathAnnotation(annotation)) return;
    if (annotation.lineStyle === lineStyle) return;

    history.recordSnapshot(savedAnnotations);
    const next = { ...annotation, points: points ?? annotation.points, lineStyle };
    const updated = await updateAnnotation(next);
    if (isPathAnnotation(updated)) {
      editingPathPointsRef.current = updated.points;
      setEditingPathPoints(updated.points);
    }
    await refresh();
  }

  async function changeSelectedStampColor(color: string) {
    if (!photo) return;

    const annotation = editingStampRef.current;
    const targetKind =
      annotation?.kind ?? (activeTool !== 'select' && isStampKind(activeTool) ? activeTool : undefined);
    if (!targetKind) return;

    lastStampColorByTopoRef.current[photo.id] = {
      ...lastStampColorByTopoRef.current[photo.id],
      [targetKind]: color,
    };
    setLastStampColorByTopo((colors) => ({
      ...colors,
      [photo.id]: { ...colors[photo.id], [targetKind]: color },
    }));

    if (!annotation) return;
    if (annotation.color === color) return;

    history.recordSnapshot(savedAnnotations);
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
    if (!photo) return;

    const annotation = editingStampRef.current;
    if (!annotation || annotation.kind !== 'start') {
      setNextRouteMarkerNumberForTopo(photo.id, value);
      return;
    }

    if (annotation.label === routeMarkerNumberLabel(value)) return;

    history.recordSnapshot(savedAnnotations);
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
      setNextRouteMarkerNumberForTopo(
        photo.id,
        nextUnusedRouteMarkerNumber(
          nextAnnotations,
          Math.min(previousNumber, currentRouteMarkerNumberForTopo(photo.id) ?? previousNumber),
        ),
      );
    }
    await refresh();
  }

  function changeRouteMarkerNumberByStep(direction: 'decrement' | 'increment') {
    if (!photo) return;

    const currentValue =
      editingStamp?.kind === 'start'
        ? (parseRouteMarkerNumber(editingStamp.label) ?? null)
        : currentRouteMarkerNumberForTopo(photo.id);
    const nextValue =
      direction === 'increment'
        ? incrementRouteMarkerNumber(currentValue)
        : decrementRouteMarkerNumber(currentValue);
    void changeRouteMarkerNumber(nextValue);
  }

  async function changeStampSize(size: StampSize) {
    if (!loaded || !photo) return;

    const stampAnnotations = savedAnnotations.filter(isStampAnnotation);
    if (stampAnnotations.length > 0 && stampAnnotations.every((annotation) => annotation.stampSize === size)) {
      return;
    }

    history.recordSnapshot(savedAnnotations);
    stampSizeByTopoRef.current[photo.id] = size;
    setStampSizeByTopo((sizes) => ({ ...sizes, [photo.id]: size }));

    const updatedStamps = stampAnnotations.map((annotation) => ({ ...annotation, stampSize: size }));
    const selectedUpdate = updatedStamps.find((annotation) => annotation.id === selectedStampIdRef.current);
    if (selectedUpdate) {
      editingStampRef.current = selectedUpdate;
      setEditingStamp(selectedUpdate);
    }

    setLoaded((current) =>
      current
        ? {
            ...current,
            bundle: {
              ...current.bundle,
              annotations: current.bundle.annotations.map((annotation) => {
                const updated = updatedStamps.find((stamp) => stamp.id === annotation.id);
                return updated ?? annotation;
              }),
            },
          }
        : current,
    );

    for (const annotation of updatedStamps) {
      await updateAnnotation(annotation);
    }
    await refresh();
  }

  async function commitEditingLabelSnapshot() {
    const annotation = editingLabelRef.current;
    if (!annotation) return;

    if ((annotation.label ?? '').trim().length === 0) {
      history.recordSnapshot(savedAnnotations);
      await removeAnnotation(annotation);
      selectedLabelIdRef.current = undefined;
      editingLabelRef.current = undefined;
      setSelectedLabelId(undefined);
      setEditingLabel(undefined);
      await refresh();
      return;
    }

    const original = savedAnnotations.find((item) => item.id === annotation.id);
    if (
      original &&
      'label' in original &&
      original.label === annotation.label &&
      'point' in original &&
      original.point.x === annotation.point.x &&
      original.point.y === annotation.point.y &&
      original.labelFontSize === annotation.labelFontSize
    ) {
      return;
    }

    history.recordSnapshot(savedAnnotations);
    await updateAnnotation(annotation);
    await refresh();
  }

  async function commitSelectedPathEdit() {
    const annotationId = selectedPathIdRef.current;
    const points = editingPathPointsRef.current;
    const annotation = savedAnnotations.find((item) => item.id === annotationId);
    if (!annotation || !points || !isPathAnnotation(annotation)) return;
    if (JSON.stringify(annotation.points) === JSON.stringify(points)) return;

    history.recordSnapshot(savedAnnotations);
    await updateAnnotation({ ...annotation, points });
    await refresh();
  }

  async function commitSelectedLabelEdit() {
    await commitEditingLabelSnapshot();
  }

  async function commitSelectedStampEdit() {
    const annotation = editingStampRef.current;
    if (!annotation) return;
    const original = savedAnnotations.find((item) => item.id === annotation.id);
    if (
      original &&
      'point' in original &&
      original.point.x === annotation.point.x &&
      original.point.y === annotation.point.y
    ) {
      return;
    }

    history.recordSnapshot(savedAnnotations);
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
    if (!selectedAnnotation) return;

    history.recordSnapshot(savedAnnotations);
    clearSelectionState();
    await removeAnnotation(selectedAnnotation);
    await refresh();
  }

  async function handleUndo() {
    if (draftPoints.length > 0) {
      clearDraftState();
      return;
    }
    const previous = history.undo(savedAnnotations);
    if (!previous || !photo) return;
    clearSelectionState();
    clearDraftState();
    const previousStamps = previous.filter(isStampAnnotation);
    const lastPreviousStamp = previousStamps.at(-1);
    if (lastPreviousStamp) {
      const size = stampSizeForAnnotation(lastPreviousStamp);
      stampSizeByTopoRef.current[photo.id] = size;
      setStampSizeByTopo((sizes) => ({ ...sizes, [photo.id]: size }));
    }
    await replaceAnnotations(photo.id, previous);
    await refresh();
  }

  async function handleRedo() {
    const next = history.redo(savedAnnotations);
    if (!next || !photo) return;
    clearSelectionState();
    clearDraftState();
    const nextStamps = next.filter(isStampAnnotation);
    const lastNextStamp = nextStamps.at(-1);
    if (lastNextStamp) {
      const size = stampSizeForAnnotation(lastNextStamp);
      stampSizeByTopoRef.current[photo.id] = size;
      setStampSizeByTopo((sizes) => ({ ...sizes, [photo.id]: size }));
    }
    await replaceAnnotations(photo.id, next);
    await refresh();
  }

  async function handleImportPhoto() {
    if (!topoId || isImportingPhoto) return;

    setIsImportingPhoto(true);
    try {
      const didAttach = await attachPhotoFromLibrary(topoId);
      if (didAttach) {
        await refresh();
      }
    } finally {
      setIsImportingPhoto(false);
    }
  }

  function handleOpenCamera() {
    if (!cragId || !topoId) return;
    router.push(`/crags/${cragId}/topos/${topoId}/camera`);
  }

  if (!loaded) {
    return (
      <View style={[styles.root, styles.center]} testID="editor:loading">
        <Stack.Screen options={{ headerShown: false }} />
        <EditorBackOverlay onBack={navigateToParent} />
        <Text style={styles.loadingText}>Loading editor…</Text>
      </View>
    );
  }

  if (!photo) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: '#0F172A' }]} testID="editor:no-photo">
        <Stack.Screen options={{ headerShown: false }} />
        <EditorBackOverlay onBack={navigateToParent} />
        <Text style={styles.loadingText}>This topo has no photo yet.</Text>
        <Text style={styles.noPhotoCopy}>
          {Platform.OS === 'web'
            ? 'Import a photo to start drawing.'
            : 'Open the camera or import a photo to start drawing.'}
        </Text>
        <View style={styles.noPhotoActions}>
          {Platform.OS !== 'web' ? (
            <Button label="Open camera" onPress={handleOpenCamera} testID="editor:no-photo:camera" />
          ) : null}
          <Button
            disabled={isImportingPhoto}
            label={isImportingPhoto ? 'Importing…' : 'Import photo'}
            onPress={() => {
              void handleImportPhoto();
            }}
            testID="editor:no-photo:import"
            variant="secondary"
          />
        </View>
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
      ? (editingLabel?.color ?? lastLabelColorByTopo[photo.id] ?? defaultAnnotationColourForTarget('label'))
      : activeColourTarget === 'line'
        ? (selectedPath && isPathAnnotation(selectedPath) ? selectedPath.color : lastLineColorByTopo[photo.id] ?? defaultAnnotationColourForTarget('line'))
        : activeColourTarget
          ? (editingStamp?.color ?? lastStampColorByTopo[photo.id]?.[activeColourTarget] ?? defaultAnnotationColourForTarget(activeColourTarget))
          : undefined;
  const canChooseAnnotationColor = Boolean(activeColourTarget && currentAnnotationColor);
  const canChooseLineWeight =
    (selectedPath && isPathAnnotation(selectedPath)) ||
    (activeTool !== 'select' && isPathKind(activeTool));
  const currentLineWeight =
    selectedPath && isPathAnnotation(selectedPath)
      ? lineWeightForAnnotation(selectedPath)
      : lastLineWeightByTopo[photo.id] ?? DEFAULT_LINE_WEIGHT;
  const canChooseLineStyle = canChooseLineWeight;
  const currentLineStyle =
    selectedPath && isPathAnnotation(selectedPath)
      ? lineStyleForAnnotation(selectedPath)
      : lastLineStyleByTopo[photo.id] ??
        (activeTool !== 'select' && isPathKind(activeTool)
          ? defaultLineStyleForKind(activeTool)
          : DEFAULT_LINE_STYLE);
  const canChooseStampSize = activeTool !== 'select' && isStampKind(activeTool);
  const routeMarkerNumberControlValue =
    editingStamp?.kind === 'start'
      ? (parseRouteMarkerNumber(editingStamp.label) ?? null)
      : activeTool === 'start'
        ? currentRouteMarkerNumberForTopo(photo.id)
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
        testID="editor-canvas-region"
      >
        <TopoCanvas
          activeTool={activeTool}
          annotations={annotations}
          onBeginPathDraft={beginPathDraft}
          onChangeSelectedLabelText={changeSelectedLabelText}
          onCommitSelectedLabelEdit={commitSelectedLabelEdit}
          onCommitSelectedPathEdit={commitSelectedPathEdit}
          onCommitSelectedStampEdit={commitSelectedStampEdit}
          onDeleteSelectedPathPoint={deleteSelectedPathPoint}
          onExtendPathDraft={extendPathDraft}
          onFinishPathDraft={finishPathDraft}
          onInsertSelectedPathPoint={insertSelectedPathPoint}
          onLongPressSelectedPathPoint={handleLongPressSelectedPathPoint}
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
          canRedo={history.canRedo}
          canUndo={history.canUndo || draftPoints.length > 0}
          canDelete={Boolean(selectedAnnotation)}
          onBack={navigateToParent}
          onDelete={() => {
            void deleteSelectedAnnotation();
          }}
          onRedo={() => {
            void handleRedo();
          }}
          onUndo={() => {
            void handleUndo();
          }}
        />
      </SafeAreaView>
      <SafeAreaView
        edges={['bottom']}
        pointerEvents="box-none"
        style={[
          styles.bottomOverlay,
          bottomOverlayKeyboardOffset > 0 ? { bottom: bottomOverlayKeyboardOffset } : null,
        ]}
        testID="editor-bottom-overlay"
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
          {canChooseLineStyle ? (
            <LineStyleControl
              currentStyle={currentLineStyle}
              expanded={openContextControl === 'lineStyle'}
              onExpandedChange={(expanded) => setOpenContextControl(expanded ? 'lineStyle' : undefined)}
              onSelectStyle={(style) => {
                void changeSelectedPathStyle(style);
              }}
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
            routeMarkerLabel={routeMarkerNumberLabel(currentRouteMarkerNumberForTopo(photo.id))}
            selectedTool={activeTool}
            stampColors={{
              belay: lastStampColorByTopo[photo.id]?.belay ?? defaultAnnotationColourForTarget('belay'),
              bolt: lastStampColorByTopo[photo.id]?.bolt ?? defaultAnnotationColourForTarget('bolt'),
              rappel: lastStampColorByTopo[photo.id]?.rappel ?? defaultAnnotationColourForTarget('rappel'),
              start: lastStampColorByTopo[photo.id]?.start ?? defaultAnnotationColourForTarget('start'),
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

function EditorBackOverlay({ onBack }: { onBack: () => void }) {
  return (
    <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.topOverlay}>
      <NavBackButton onPress={onBack} style={styles.editorBackButton} tone="onDark" />
    </SafeAreaView>
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
  editorBackButton: {
    marginHorizontal: 16,
    marginVertical: 10,
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
  noPhotoActions: {
    gap: 12,
    marginTop: 24,
    maxWidth: 320,
    width: '100%',
  },
  noPhotoCopy: {
    color: '#CBD5E1',
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
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
