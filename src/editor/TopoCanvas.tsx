import {
  Canvas,
  Circle,
  Group,
  Image as SkiaImage,
  Rect,
  useFont,
  useImage,
} from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useDerivedValue, useSharedValue } from 'react-native-reanimated';

import {
  clampPan,
  denormalizePoint,
  fitCover,
  findNearestPointIndex,
  findNearestPolylineSegment,
  minContainScale,
  pointDistance,
  screenToNormalizedImagePoint,
} from '@/domain/geometry';
import {
  isLabelAnnotation,
  isMarkerAnnotation,
  isPathAnnotation,
  isPathKind,
  isStampAnnotation,
} from '@/domain/annotationFactory';
import { chooseTextBackdrop, rgbaString } from '@/domain/annotationColours';
import {
  DEFAULT_SCREEN_LABEL_FONT_SIZE,
  containsPoint,
  findNearestLabelHandle,
  labelBoundsCenter,
  labelFontSize,
  labelText,
  measureLabelBounds,
  moveLabelPoint,
  photoFontSizeFromScreen,
} from '@/domain/textLabels';
import type {
  Annotation,
  MarkerAnnotationKind,
  MarkerAnnotation,
  PathAnnotation,
  PathAnnotationKind,
  EditorTool,
  NormalizedPoint,
  PhotoAsset,
} from '@/domain/types';
import {
  AnnotationShape,
  screenFrameForLabel,
  SelectedLabelHandles,
  SelectedPathHandles,
} from '@/editor/AnnotationShapes';
import { interStyle } from '@/ui/fonts';

const MAX_ZOOM = 6;
const TAP_MAX_DELTA = 10;
const LINE_HIT_RADIUS = 28;
const STAMP_HIT_RADIUS = 32;
const HANDLE_HIT_RADIUS = 32;
const LABEL_HANDLE_HIT_RADIUS = 34;
const LABEL_BOUNDS_HIT_PADDING = 8;
const LABEL_BACKDROP_RADIUS = 6;

type GestureMode = 'draw' | 'editPath' | 'editLabel' | 'editStamp' | 'pan';
type LabelDragMode = 'move' | 'resize' | 'none';
type StampDragMode = 'move' | 'none';

type TopoCanvasProps = {
  photo: PhotoAsset;
  annotations: Annotation[];
  activeTool: EditorTool;
  selectedPathId?: string;
  onBeginPathDraft: (kind: PathAnnotationKind, point: NormalizedPoint) => void;
  onCommitSelectedPathEdit: () => void;
  onExtendPathDraft: (point: NormalizedPoint, sampleSize: { width: number; height: number }) => void;
  onFinishPathDraft: (point: NormalizedPoint, sampleSize: { width: number; height: number }) => void;
  onMoveSelectedPathPoint: (
    pointIndex: number,
    point: NormalizedPoint,
    sampleSize: { width: number; height: number },
  ) => void;
  onChangeSelectedLabelText: (text: string) => void;
  onCommitSelectedLabelEdit: () => void;
  onMoveSelectedLabel: (point: NormalizedPoint) => void;
  onCommitSelectedStampEdit: () => void;
  onMoveSelectedStamp: (point: NormalizedPoint) => void;
  onPlaceAnnotation: (
    kind: MarkerAnnotationKind,
    point: NormalizedPoint,
    context: { labelFontSize?: number },
  ) => void;
  onResizeSelectedLabel: (fontSize: number) => void;
  onSelectLabel: (annotationId?: string) => void;
  onSelectPath: (annotationId?: string, points?: NormalizedPoint[]) => void;
  onSelectStamp: (annotationId?: string) => void;
  selectedLabelId?: string;
  selectedStampId?: string;
};

export function TopoCanvas({
  photo,
  annotations,
  activeTool,
  selectedPathId,
  onBeginPathDraft,
  onCommitSelectedPathEdit,
  onExtendPathDraft,
  onFinishPathDraft,
  onChangeSelectedLabelText,
  onCommitSelectedLabelEdit,
  onCommitSelectedStampEdit,
  onMoveSelectedLabel,
  onMoveSelectedPathPoint,
  onMoveSelectedStamp,
  onPlaceAnnotation,
  onResizeSelectedLabel,
  onSelectLabel,
  onSelectPath,
  onSelectStamp,
  selectedLabelId,
  selectedStampId,
}: TopoCanvasProps) {
  const image = useImage(photo.uri);
  const routeMarkerFont = useFont(null, 16);
  const [canvasSize, setCanvasSize] = useState({ width: 1, height: 1 });

  const imageFit = useMemo(
    () => fitCover({ width: photo.width, height: photo.height }, canvasSize),
    [canvasSize, photo.height, photo.width],
  );

  // Minimum user scale = the scale at which the entire photo just fits inside the canvas
  // (contain-fit). User scale = 1 = cover-fit. So this value is always ≤ 1 and is < 1
  // whenever the photo's aspect ratio doesn't match the canvas.
  const minScale = useMemo(
    () => minContainScale({ width: photo.width, height: photo.height }, canvasSize),
    [canvasSize, photo.height, photo.width],
  );
  // Mirror minScale into a shared value so the gesture worklets can read it on the UI thread.
  const minScaleSv = useSharedValue(1);
  useEffect(() => {
    minScaleSv.value = minScale;
  }, [minScale, minScaleSv]);

  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);
  // Focal point captured at pinch start. We scale around this fixed anchor and then
  // translate by how far the live midpoint has drifted from it, so the photo follows
  // the two-finger midpoint (Apple Photos / Maps style) while the zoom stays anchored.
  const startFocalX = useSharedValue(0);
  const startFocalY = useSharedValue(0);
  // Manually-tracked active touch count. PinchGesture's own `numberOfPointers` field is
  // unreliable on both iOS (sticks at 2 after a lift) and Android (gesture-handler bug
  // since 2.16+), so we count touches via the raw onTouchesDown/onTouchesUp callbacks.
  const activePointers = useSharedValue(0);
  const dragHandleIndexRef = useRef(-1);
  const labelDragModeRef = useRef<LabelDragMode>('none');
  const stampDragModeRef = useRef<StampDragMode>('none');
  const labelMoveOffsetRef = useRef({ x: 0, y: 0 });
  const stampMoveOffsetRef = useRef({ x: 0, y: 0 });
  const labelResizeStartRef = useRef({ distance: 1, fontSize: 1 });
  const [viewport, setViewport] = useState({ scale: 1, tx: 0, ty: 0 });
  const activePathTool = activeTool !== 'select' && isPathKind(activeTool);
  const pathAnnotations = useMemo(
    () =>
      annotations.filter(
        (annotation): annotation is PathAnnotation =>
          isPathAnnotation(annotation) && annotation.id !== 'draft',
      ),
    [annotations],
  );
  const labelAnnotations = useMemo(
    () =>
      annotations.filter(
        (annotation): annotation is MarkerAnnotation =>
          isLabelAnnotation(annotation) && annotation.id !== 'draft',
      ),
    [annotations],
  );
  const stampAnnotations = useMemo(
    () =>
      annotations.filter(
        (annotation): annotation is MarkerAnnotation =>
          isStampAnnotation(annotation) && annotation.id !== 'draft',
      ),
    [annotations],
  );
  const selectedPath = pathAnnotations.find((annotation) => annotation.id === selectedPathId);
  const selectedLabel = labelAnnotations.find((annotation) => annotation.id === selectedLabelId);
  const selectedStamp = stampAnnotations.find((annotation) => annotation.id === selectedStampId);
  const gestureMode: GestureMode = activePathTool
    ? 'draw'
    : activeTool === 'select' && selectedPath
      ? 'editPath'
      : activeTool === 'select' && selectedLabel
        ? 'editLabel'
      : activeTool === 'select' && selectedStamp
        ? 'editStamp'
        : 'pan';

  // Reset zoom/pan whenever the photo changes so each topo opens at the cover view.
  useEffect(() => {
    scale.value = 1;
    tx.value = 0;
    ty.value = 0;
    setViewport({ scale: 1, tx: 0, ty: 0 });
  }, [photo.id, scale, tx, ty]);

  function handleLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize({ width, height });
  }

  function sampleSizeFor(viewScale: number) {
    return {
      width: imageFit.width * viewScale,
      height: imageFit.height * viewScale,
    };
  }

  function normalizedPointAt(
    screenX: number,
    screenY: number,
    viewTx: number,
    viewTy: number,
    viewScale: number,
  ) {
    return screenToNormalizedImagePoint(
      { x: screenX, y: screenY },
      imageFit,
      { tx: viewTx, ty: viewTy, scale: viewScale },
    );
  }

  // Latest closure for tap-to-place/select, refreshed every render so gesture worklets always
  // see the current active tool, fit, and callback without rebuilding the gesture.
  const placeRef = useRef<
    (screenX: number, screenY: number, viewTx: number, viewTy: number, viewScale: number) => void
  >(() => undefined);
  placeRef.current = (screenX, screenY, viewTx, viewTy, viewScale) => {
    if (imageFit.width <= 0 || imageFit.height <= 0) {
      return;
    }

    setViewport({ scale: viewScale, tx: viewTx, ty: viewTy });
    const point = normalizedPointAt(screenX, screenY, viewTx, viewTy, viewScale);
    const displaySize = sampleSizeFor(viewScale);

    if (activeTool === 'select') {
      const target = denormalizePoint(point, displaySize);
      let labelHit: MarkerAnnotation | undefined;
      for (let index = labelAnnotations.length - 1; index >= 0; index -= 1) {
        const annotation = labelAnnotations[index];
        const bounds = measureLabelBounds({
          point: annotation.point,
          text: labelText(annotation),
          fontSize: labelFontSize(annotation) * imageFit.scale * viewScale,
          size: displaySize,
        });
        const paddedBounds = {
          x: bounds.x - LABEL_BOUNDS_HIT_PADDING,
          y: bounds.y - LABEL_BOUNDS_HIT_PADDING,
          width: bounds.width + LABEL_BOUNDS_HIT_PADDING * 2,
          height: bounds.height + LABEL_BOUNDS_HIT_PADDING * 2,
        };
        if (containsPoint(paddedBounds, target)) {
          labelHit = annotation;
          break;
        }
      }

      if (labelHit) {
        onSelectLabel(labelHit.id);
        return;
      }

      let stampHit: MarkerAnnotation | undefined;
      for (let index = stampAnnotations.length - 1; index >= 0; index -= 1) {
        const annotation = stampAnnotations[index];
        const stampPoint = denormalizePoint(annotation.point, displaySize);
        if (pointDistance(target, stampPoint) <= STAMP_HIT_RADIUS) {
          stampHit = annotation;
          break;
        }
      }

      if (stampHit) {
        onSelectStamp(stampHit.id);
        return;
      }

      let bestPathHit: { annotation: PathAnnotation; distance: number } | undefined;
      for (const annotation of pathAnnotations) {
        const hit = findNearestPolylineSegment(annotation.points, point, displaySize, LINE_HIT_RADIUS);
        if (hit && (!bestPathHit || hit.distance < bestPathHit.distance)) {
          bestPathHit = { annotation, distance: hit.distance };
        }
      }

      if (bestPathHit) {
        onSelectPath(bestPathHit.annotation.id, bestPathHit.annotation.points);
        return;
      }

      onSelectPath(undefined);
      onSelectLabel(undefined);
      onSelectStamp(undefined);
      return;
    }

    if (!isPathKind(activeTool)) {
      onPlaceAnnotation(activeTool, point, {
        labelFontSize:
          activeTool === 'label'
            ? photoFontSizeFromScreen({
                imageFit,
                screenFontSize: DEFAULT_SCREEN_LABEL_FONT_SIZE,
                viewScale,
              })
            : undefined,
      });
    }
  };

  const beginPathRef = useRef<
    (screenX: number, screenY: number, viewTx: number, viewTy: number, viewScale: number) => void
  >(() => undefined);
  beginPathRef.current = (screenX, screenY, viewTx, viewTy, viewScale) => {
    if (activeTool === 'select' || !isPathKind(activeTool) || imageFit.width <= 0 || imageFit.height <= 0) {
      return;
    }
    onBeginPathDraft(activeTool, normalizedPointAt(screenX, screenY, viewTx, viewTy, viewScale));
  };

  const extendPathRef = useRef<
    (screenX: number, screenY: number, viewTx: number, viewTy: number, viewScale: number) => void
  >(() => undefined);
  extendPathRef.current = (screenX, screenY, viewTx, viewTy, viewScale) => {
    if (imageFit.width <= 0 || imageFit.height <= 0) {
      return;
    }
    onExtendPathDraft(
      normalizedPointAt(screenX, screenY, viewTx, viewTy, viewScale),
      sampleSizeFor(viewScale),
    );
  };

  const finishPathRef = useRef<
    (screenX: number, screenY: number, viewTx: number, viewTy: number, viewScale: number) => void
  >(() => undefined);
  finishPathRef.current = (screenX, screenY, viewTx, viewTy, viewScale) => {
    if (imageFit.width <= 0 || imageFit.height <= 0) {
      return;
    }
    onFinishPathDraft(
      normalizedPointAt(screenX, screenY, viewTx, viewTy, viewScale),
      sampleSizeFor(viewScale),
    );
  };

  const beginControlPointDragRef = useRef<
    (screenX: number, screenY: number, viewTx: number, viewTy: number, viewScale: number) => void
  >(() => undefined);
  beginControlPointDragRef.current = (screenX, screenY, viewTx, viewTy, viewScale) => {
    if (!selectedPath || imageFit.width <= 0 || imageFit.height <= 0) {
      dragHandleIndexRef.current = -1;
      return;
    }

    const hit = findNearestPointIndex(
      selectedPath.points,
      normalizedPointAt(screenX, screenY, viewTx, viewTy, viewScale),
      sampleSizeFor(viewScale),
      HANDLE_HIT_RADIUS,
    );
    dragHandleIndexRef.current = hit?.index ?? -1;
  };

  const moveControlPointRef = useRef<
    (screenX: number, screenY: number, viewTx: number, viewTy: number, viewScale: number) => void
  >(() => undefined);
  moveControlPointRef.current = (screenX, screenY, viewTx, viewTy, viewScale) => {
    if (dragHandleIndexRef.current < 0 || imageFit.width <= 0 || imageFit.height <= 0) {
      return;
    }
    onMoveSelectedPathPoint(
      dragHandleIndexRef.current,
      normalizedPointAt(screenX, screenY, viewTx, viewTy, viewScale),
      sampleSizeFor(viewScale),
    );
  };

  const beginLabelDragRef = useRef<
    (screenX: number, screenY: number, viewTx: number, viewTy: number, viewScale: number) => void
  >(() => undefined);
  beginLabelDragRef.current = (screenX, screenY, viewTx, viewTy, viewScale) => {
    if (!selectedLabel || imageFit.width <= 0 || imageFit.height <= 0) {
      labelDragModeRef.current = 'none';
      return;
    }

    setViewport({ scale: viewScale, tx: viewTx, ty: viewTy });
    const displaySize = sampleSizeFor(viewScale);
    const point = normalizedPointAt(screenX, screenY, viewTx, viewTy, viewScale);
    const target = denormalizePoint(point, displaySize);
    const fontSize = labelFontSize(selectedLabel) * imageFit.scale * viewScale;
    const bounds = measureLabelBounds({
      point: selectedLabel.point,
      text: labelText(selectedLabel),
      fontSize,
      size: displaySize,
    });
    const handle = findNearestLabelHandle(bounds, target, LABEL_HANDLE_HIT_RADIUS);

    if (handle) {
      if (handle.handle === 'move') {
        const anchor = denormalizePoint(selectedLabel.point, displaySize);
        labelDragModeRef.current = 'move';
        labelMoveOffsetRef.current = {
          x: target.x - anchor.x,
          y: target.y - anchor.y,
        };
        return;
      }

      labelDragModeRef.current = 'resize';
      const center = labelBoundsCenter(bounds);
      labelResizeStartRef.current = {
        distance: Math.max(1, pointDistance(target, center)),
        fontSize: labelFontSize(selectedLabel),
      };
      return;
    }

    labelDragModeRef.current = 'none';
  };

  const moveLabelRef = useRef<
    (screenX: number, screenY: number, viewTx: number, viewTy: number, viewScale: number) => void
  >(() => undefined);
  moveLabelRef.current = (screenX, screenY, viewTx, viewTy, viewScale) => {
    if (!selectedLabel || labelDragModeRef.current === 'none' || imageFit.width <= 0 || imageFit.height <= 0) {
      return;
    }

    const displaySize = sampleSizeFor(viewScale);
    const point = normalizedPointAt(screenX, screenY, viewTx, viewTy, viewScale);
    if (labelDragModeRef.current === 'move') {
      onMoveSelectedLabel(moveLabelPoint({ currentPointer: point, pointerOffset: labelMoveOffsetRef.current, size: displaySize }));
      return;
    }

    const target = denormalizePoint(point, displaySize);
    const fontSize = labelFontSize(selectedLabel) * imageFit.scale * viewScale;
    const bounds = measureLabelBounds({
      point: selectedLabel.point,
      text: labelText(selectedLabel),
      fontSize,
      size: displaySize,
    });
    const center = labelBoundsCenter(bounds);
    const nextDistance = Math.max(1, pointDistance(target, center));
    const start = labelResizeStartRef.current;
    onResizeSelectedLabel(start.fontSize * (nextDistance / start.distance));
  };

  const beginStampDragRef = useRef<
    (screenX: number, screenY: number, viewTx: number, viewTy: number, viewScale: number) => void
  >(() => undefined);
  beginStampDragRef.current = (screenX, screenY, viewTx, viewTy, viewScale) => {
    if (!selectedStamp || imageFit.width <= 0 || imageFit.height <= 0) {
      stampDragModeRef.current = 'none';
      return;
    }

    setViewport({ scale: viewScale, tx: viewTx, ty: viewTy });
    const displaySize = sampleSizeFor(viewScale);
    const point = normalizedPointAt(screenX, screenY, viewTx, viewTy, viewScale);
    const target = denormalizePoint(point, displaySize);
    const stampPoint = denormalizePoint(selectedStamp.point, displaySize);
    if (pointDistance(target, stampPoint) > STAMP_HIT_RADIUS) {
      stampDragModeRef.current = 'none';
      return;
    }

    stampDragModeRef.current = 'move';
    stampMoveOffsetRef.current = {
      x: target.x - stampPoint.x,
      y: target.y - stampPoint.y,
    };
  };

  const moveStampRef = useRef<
    (screenX: number, screenY: number, viewTx: number, viewTy: number, viewScale: number) => void
  >(() => undefined);
  moveStampRef.current = (screenX, screenY, viewTx, viewTy, viewScale) => {
    if (!selectedStamp || stampDragModeRef.current === 'none' || imageFit.width <= 0 || imageFit.height <= 0) {
      return;
    }

    const displaySize = sampleSizeFor(viewScale);
    const point = normalizedPointAt(screenX, screenY, viewTx, viewTy, viewScale);
    onMoveSelectedStamp(moveLabelPoint({ currentPointer: point, pointerOffset: stampMoveOffsetRef.current, size: displaySize }));
  };

  function dispatchTap(screenX: number, screenY: number, viewTx: number, viewTy: number, viewScale: number) {
    placeRef.current(screenX, screenY, viewTx, viewTy, viewScale);
  }

  function dispatchBeginPath(screenX: number, screenY: number, viewTx: number, viewTy: number, viewScale: number) {
    beginPathRef.current(screenX, screenY, viewTx, viewTy, viewScale);
  }

  function dispatchExtendPath(screenX: number, screenY: number, viewTx: number, viewTy: number, viewScale: number) {
    extendPathRef.current(screenX, screenY, viewTx, viewTy, viewScale);
  }

  function dispatchFinishPath(screenX: number, screenY: number, viewTx: number, viewTy: number, viewScale: number) {
    finishPathRef.current(screenX, screenY, viewTx, viewTy, viewScale);
  }

  function dispatchBeginControlPointDrag(
    screenX: number,
    screenY: number,
    viewTx: number,
    viewTy: number,
    viewScale: number,
  ) {
    beginControlPointDragRef.current(screenX, screenY, viewTx, viewTy, viewScale);
  }

  function dispatchMoveControlPoint(
    screenX: number,
    screenY: number,
    viewTx: number,
    viewTy: number,
    viewScale: number,
  ) {
    moveControlPointRef.current(screenX, screenY, viewTx, viewTy, viewScale);
  }

  function dispatchMoveControlPointOrPan(
    screenX: number,
    screenY: number,
    translationX: number,
    translationY: number,
    viewTx: number,
    viewTy: number,
    viewScale: number,
  ) {
    if (dragHandleIndexRef.current < 0) {
      const next = clampPan(
        { x: startTx.value + translationX, y: startTy.value + translationY },
        viewScale,
        imageFit,
        canvasSize,
      );
      tx.value = next.x;
      ty.value = next.y;
      return;
    }

    moveControlPointRef.current(screenX, screenY, viewTx, viewTy, viewScale);
  }

  function dispatchFinishControlPointDrag() {
    if (dragHandleIndexRef.current >= 0) {
      onCommitSelectedPathEdit();
    }
    setViewport({ scale: scale.value, tx: tx.value, ty: ty.value });
    dragHandleIndexRef.current = -1;
  }

  function dispatchBeginLabelDrag(
    screenX: number,
    screenY: number,
    viewTx: number,
    viewTy: number,
    viewScale: number,
  ) {
    beginLabelDragRef.current(screenX, screenY, viewTx, viewTy, viewScale);
  }

  function dispatchMoveLabel(
    screenX: number,
    screenY: number,
    viewTx: number,
    viewTy: number,
    viewScale: number,
  ) {
    moveLabelRef.current(screenX, screenY, viewTx, viewTy, viewScale);
  }

  function dispatchMoveLabelOrPan(
    screenX: number,
    screenY: number,
    translationX: number,
    translationY: number,
    viewTx: number,
    viewTy: number,
    viewScale: number,
  ) {
    if (labelDragModeRef.current === 'none') {
      const next = clampPan(
        { x: startTx.value + translationX, y: startTy.value + translationY },
        viewScale,
        imageFit,
        canvasSize,
      );
      tx.value = next.x;
      ty.value = next.y;
      return;
    }

    moveLabelRef.current(screenX, screenY, viewTx, viewTy, viewScale);
  }

  function dispatchFinishLabelDrag() {
    if (labelDragModeRef.current !== 'none') {
      onCommitSelectedLabelEdit();
    }
    setViewport({ scale: scale.value, tx: tx.value, ty: ty.value });
    labelDragModeRef.current = 'none';
  }

  function dispatchBeginStampDrag(
    screenX: number,
    screenY: number,
    viewTx: number,
    viewTy: number,
    viewScale: number,
  ) {
    beginStampDragRef.current(screenX, screenY, viewTx, viewTy, viewScale);
  }

  function dispatchMoveStamp(
    screenX: number,
    screenY: number,
    viewTx: number,
    viewTy: number,
    viewScale: number,
  ) {
    moveStampRef.current(screenX, screenY, viewTx, viewTy, viewScale);
  }

  function dispatchMoveStampOrPan(
    screenX: number,
    screenY: number,
    translationX: number,
    translationY: number,
    viewTx: number,
    viewTy: number,
    viewScale: number,
  ) {
    if (stampDragModeRef.current === 'none') {
      const next = clampPan(
        { x: startTx.value + translationX, y: startTy.value + translationY },
        viewScale,
        imageFit,
        canvasSize,
      );
      tx.value = next.x;
      ty.value = next.y;
      return;
    }

    moveStampRef.current(screenX, screenY, viewTx, viewTy, viewScale);
  }

  function dispatchFinishStampDrag() {
    if (stampDragModeRef.current !== 'none') {
      onCommitSelectedStampEdit();
    }
    setViewport({ scale: scale.value, tx: tx.value, ty: ty.value });
    stampDragModeRef.current = 'none';
  }

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(1)
        .maxPointers(1)
        .onStart(() => {
          startTx.value = tx.value;
          startTy.value = ty.value;
        })
        .onChange((event) => {
          const next = clampPan(
            { x: startTx.value + event.translationX, y: startTy.value + event.translationY },
            scale.value,
            imageFit,
            canvasSize,
          );
          tx.value = next.x;
          ty.value = next.y;
        })
        .onEnd(() => {
          runOnJS(setViewport)({ scale: scale.value, tx: tx.value, ty: ty.value });
        }),
    [canvasSize, imageFit, scale, startTx, startTy, tx, ty],
  );

  const drawGesture = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(1)
        .maxPointers(1)
        .minDistance(3)
        .onStart((event) => {
          runOnJS(dispatchBeginPath)(event.x, event.y, tx.value, ty.value, scale.value);
        })
        .onChange((event) => {
          runOnJS(dispatchExtendPath)(event.x, event.y, tx.value, ty.value, scale.value);
        })
        .onEnd((event) => {
          runOnJS(dispatchFinishPath)(event.x, event.y, tx.value, ty.value, scale.value);
        }),
    // Dispatch functions are refreshed through render closures and only read JS state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scale, tx, ty],
  );

  const controlPointGesture = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(1)
        .maxPointers(1)
        .minDistance(3)
        .onStart((event) => {
          startTx.value = tx.value;
          startTy.value = ty.value;
          runOnJS(dispatchBeginControlPointDrag)(event.x, event.y, tx.value, ty.value, scale.value);
        })
        .onChange((event) => {
          runOnJS(dispatchMoveControlPointOrPan)(
            event.x,
            event.y,
            event.translationX,
            event.translationY,
            tx.value,
            ty.value,
            scale.value,
          );
        })
        .onEnd(() => {
          runOnJS(dispatchFinishControlPointDrag)();
        }),
    // Dispatch functions are refreshed through render closures and only read JS state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canvasSize, imageFit, scale, startTx, startTy, tx, ty],
  );

  const labelGesture = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(1)
        .maxPointers(1)
        .minDistance(3)
        .onStart((event) => {
          startTx.value = tx.value;
          startTy.value = ty.value;
          runOnJS(dispatchBeginLabelDrag)(event.x, event.y, tx.value, ty.value, scale.value);
        })
        .onChange((event) => {
          runOnJS(dispatchMoveLabelOrPan)(
            event.x,
            event.y,
            event.translationX,
            event.translationY,
            tx.value,
            ty.value,
            scale.value,
          );
        })
        .onEnd(() => {
          runOnJS(dispatchFinishLabelDrag)();
        }),
    // Dispatch functions are refreshed through render closures and only read JS state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canvasSize, imageFit, scale, startTx, startTy, tx, ty],
  );

  const stampGesture = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(1)
        .maxPointers(1)
        .minDistance(3)
        .onStart((event) => {
          startTx.value = tx.value;
          startTy.value = ty.value;
          runOnJS(dispatchBeginStampDrag)(event.x, event.y, tx.value, ty.value, scale.value);
        })
        .onChange((event) => {
          runOnJS(dispatchMoveStampOrPan)(
            event.x,
            event.y,
            event.translationX,
            event.translationY,
            tx.value,
            ty.value,
            scale.value,
          );
        })
        .onEnd(() => {
          runOnJS(dispatchFinishStampDrag)();
        }),
    // Dispatch functions are refreshed through render closures and only read JS state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canvasSize, imageFit, scale, startTx, startTy, tx, ty],
  );

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onTouchesDown((event) => {
          activePointers.value = event.numberOfTouches;
        })
        .onTouchesUp((event) => {
          activePointers.value = event.numberOfTouches;
        })
        .onTouchesCancelled((event) => {
          activePointers.value = event.numberOfTouches;
        })
        .onStart((event) => {
          startScale.value = scale.value;
          startTx.value = tx.value;
          startTy.value = ty.value;
          startFocalX.value = event.focalX;
          startFocalY.value = event.focalY;
        })
        .onChange((event) => {
          // Right before pinch.onEnd, when a finger lifts, gesture-handler can fire one
          // more onChange where the focal has shifted toward the remaining finger. Skip
          // it — applying it would translate the image by half the inter-finger span.
          if (activePointers.value < 2) {
            return;
          }
          const target = startScale.value * event.scale;
          const next = Math.min(Math.max(target, minScaleSv.value), MAX_ZOOM);
          const k = next / startScale.value;
          // Scale around the start focal, then translate by how far the live midpoint
          // has drifted from it. Pinch + drag in a single gesture.
          const focalDeltaX = event.focalX - startFocalX.value;
          const focalDeltaY = event.focalY - startFocalY.value;
          const candidateTx = startFocalX.value * (1 - k) + k * startTx.value + focalDeltaX;
          const candidateTy = startFocalY.value * (1 - k) + k * startTy.value + focalDeltaY;
          const clamped = clampPan(
            { x: candidateTx, y: candidateTy },
            next,
            imageFit,
            canvasSize,
          );
          scale.value = next;
          tx.value = clamped.x;
          ty.value = clamped.y;
        })
        .onEnd(() => {
          runOnJS(setViewport)({ scale: scale.value, tx: tx.value, ty: ty.value });
        }),
    [
      activePointers,
      canvasSize,
      imageFit,
      minScaleSv,
      scale,
      startFocalX,
      startFocalY,
      startScale,
      startTx,
      startTy,
      tx,
      ty,
    ],
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDeltaX(TAP_MAX_DELTA)
        .maxDeltaY(TAP_MAX_DELTA)
        .onEnd((event) => {
          runOnJS(dispatchTap)(event.x, event.y, tx.value, ty.value, scale.value);
        }),
    // dispatchTap is stable across renders; it dereferences placeRef internally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const composedGesture = useMemo(
    () => {
      if (gestureMode === 'draw') {
        return Gesture.Simultaneous(drawGesture, pinchGesture);
      }
      if (gestureMode === 'editPath') {
        return Gesture.Race(tapGesture, Gesture.Simultaneous(controlPointGesture, pinchGesture));
      }
      if (gestureMode === 'editLabel') {
        return Gesture.Race(tapGesture, Gesture.Simultaneous(labelGesture, pinchGesture));
      }
      if (gestureMode === 'editStamp') {
        return Gesture.Race(tapGesture, Gesture.Simultaneous(stampGesture, pinchGesture));
      }
      return Gesture.Race(tapGesture, Gesture.Simultaneous(panGesture, pinchGesture));
    },
    [controlPointGesture, drawGesture, gestureMode, labelGesture, panGesture, pinchGesture, stampGesture, tapGesture],
  );

  const groupTransform = useDerivedValue(
    () => [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
    [scale, tx, ty],
  );

  const renderableSize = useMemo(
    () => ({
      width: imageFit.width,
      height: imageFit.height,
    }),
    [imageFit.height, imageFit.width],
  );
  const selectedLabelFrame = selectedLabel
    ? screenFrameForLabel({
        annotation: selectedLabel,
        imageFit,
        transform: viewport,
      })
    : undefined;
  const selectedLabelBackdrop =
    selectedLabel && selectedLabelFrame
      ? editBackdropFrame({
          frame: selectedLabelFrame,
          textColour: selectedLabel.color,
        })
      : undefined;
  const drawableAnnotations = useMemo(
    () => annotationsInCanvasStackOrder(annotations, selectedLabel?.id),
    [annotations, selectedLabel?.id],
  );

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View onLayout={handleLayout} style={styles.container}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Group transform={groupTransform}>
            <Group transform={[{ translateX: imageFit.offsetX }, { translateY: imageFit.offsetY }]}>
              {image ? (
                <SkiaImage
                  image={image}
                  x={0}
                  y={0}
                  width={imageFit.width}
                  height={imageFit.height}
                  fit="contain"
                />
              ) : (
                <Rect x={0} y={0} width={imageFit.width} height={imageFit.height} color="#CBD5E1" />
              )}
              {drawableAnnotations.map((annotation) => (
                <AnnotationShape
                  annotation={annotation}
                  key={annotation.id}
                  routeMarkerFont={routeMarkerFont}
                  imageScale={imageFit.scale}
                  size={renderableSize}
                />
              ))}
              {selectedPath ? <SelectedPathHandles points={selectedPath.points} size={renderableSize} /> : null}
              {selectedStamp ? (
                <Circle
                  color="#1D4ED8"
                  cx={denormalizePoint(selectedStamp.point, renderableSize).x}
                  cy={denormalizePoint(selectedStamp.point, renderableSize).y}
                  r={18}
                  strokeWidth={2}
                  style="stroke"
                />
              ) : null}
              {selectedLabel ? (
                <SelectedLabelHandles
                  annotation={selectedLabel}
                  imageScale={imageFit.scale}
                  size={renderableSize}
                />
              ) : null}
            </Group>
          </Group>
        </Canvas>
        {selectedLabelBackdrop ? (
          <View
            pointerEvents="none"
            style={[
              styles.labelBackdrop,
              {
                backgroundColor: selectedLabelBackdrop.backgroundColor,
                borderRadius: LABEL_BACKDROP_RADIUS,
                height: selectedLabelBackdrop.height,
                left: selectedLabelBackdrop.x,
                top: selectedLabelBackdrop.y,
                width: selectedLabelBackdrop.width,
              },
            ]}
          />
        ) : null}
        {selectedLabel && selectedLabelFrame ? (
          <TextInput
            autoFocus
            multiline
            onBlur={onCommitSelectedLabelEdit}
            onChangeText={onChangeSelectedLabelText}
            pointerEvents="none"
            style={[
              styles.labelInput,
              {
                color: selectedLabel.color,
                fontSize: selectedLabelFrame.fontSize,
                height: selectedLabelFrame.height,
                left: selectedLabelFrame.x,
                lineHeight: selectedLabelFrame.lineHeight,
                top: selectedLabelFrame.y,
                width: selectedLabelFrame.width,
              },
            ]}
            value={labelText(selectedLabel)}
          />
        ) : null}
        {!image && (
          <View pointerEvents="none" style={styles.loading}>
            <Text style={styles.loadingText}>Loading topo photo...</Text>
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

export function annotationsInCanvasStackOrder(annotations: Annotation[], selectedLabelId?: string) {
  const drawableAnnotations = annotations.filter((annotation) => annotation.id !== selectedLabelId);

  return [
    ...drawableAnnotations.filter(isPathAnnotation),
    ...drawableAnnotations.filter(
      (annotation): annotation is MarkerAnnotation => isMarkerAnnotation(annotation) && !isLabelAnnotation(annotation),
    ),
    ...drawableAnnotations.filter(isLabelAnnotation),
  ];
}

function editBackdropFrame({
  frame,
  textColour,
}: {
  frame: ReturnType<typeof screenFrameForLabel>;
  textColour: string;
}) {
  const backdrop = chooseTextBackdrop({ textColour });
  if (backdrop.opacity <= 0) {
    return undefined;
  }

  const padding = Math.max(4, frame.fontSize * 0.18);
  const trailingPadding = padding + Math.max(2, frame.fontSize * 0.06);

  return {
    backgroundColor: rgbaString(backdrop.color, backdrop.opacity),
    height: frame.height + padding * 2,
    width: frame.width + padding + trailingPadding,
    x: frame.x - padding,
    y: frame.y - padding,
  };
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    flex: 1,
    overflow: 'hidden',
  },
  loading: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  loadingText: {
    color: '#F8FAFC',
    ...interStyle('700'),
  },
  labelBackdrop: {
    position: 'absolute',
  },
  labelInput: {
    backgroundColor: 'transparent',
    ...interStyle('700'),
    padding: 0,
    position: 'absolute',
  },
});
