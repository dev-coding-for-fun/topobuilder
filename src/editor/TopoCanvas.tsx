import {
  Canvas,
  Circle,
  Group,
  Image as SkiaImage,
  Line,
  Path,
  Rect,
  Skia,
  Text as SkiaText,
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
import { isPathKind } from '@/domain/annotationFactory';
import {
  DEFAULT_SCREEN_LABEL_FONT_SIZE,
  containsPoint,
  displayFontSize,
  findNearestLabelHandle,
  labelFontSize,
  labelHandlePoints,
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

const MAX_ZOOM = 6;
const TAP_MAX_DELTA = 10;
const LINE_HIT_RADIUS = 28;
const HANDLE_HIT_RADIUS = 32;
const HANDLE_RADIUS = 9;
const STAMP_RED = '#C91F37';
const STAMP_WHITE = '#F8FAFC';
const LABEL_HANDLE_HIT_RADIUS = 34;
const LABEL_HANDLE_RADIUS = 8;

type GestureMode = 'draw' | 'editPath' | 'editLabel' | 'pan';
type LabelDragMode = 'move' | 'resize' | 'none';

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
  onPlaceAnnotation: (
    kind: MarkerAnnotationKind,
    point: NormalizedPoint,
    context: { labelFontSize?: number },
  ) => void;
  onResizeSelectedLabel: (fontSize: number) => void;
  onSelectLabel: (annotationId?: string) => void;
  onSelectPath: (annotationId?: string, points?: NormalizedPoint[]) => void;
  selectedLabelId?: string;
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
  onMoveSelectedLabel,
  onMoveSelectedPathPoint,
  onPlaceAnnotation,
  onResizeSelectedLabel,
  onSelectLabel,
  onSelectPath,
  selectedLabelId,
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
  const labelMoveOffsetRef = useRef({ x: 0, y: 0 });
  const labelResizeStartRef = useRef({ distance: 1, fontSize: 1 });
  const [viewport, setViewport] = useState({ scale: 1, tx: 0, ty: 0 });
  const activePathTool = activeTool !== 'select' && isPathKind(activeTool);
  const pathAnnotations = useMemo(
    () =>
      annotations.filter(
        (annotation): annotation is PathAnnotation => 'points' in annotation && annotation.id !== 'draft',
      ),
    [annotations],
  );
  const labelAnnotations = useMemo(
    () =>
      annotations.filter(
        (annotation): annotation is MarkerAnnotation =>
          'point' in annotation && annotation.kind === 'label' && annotation.id !== 'draft',
      ),
    [annotations],
  );
  const selectedPath = pathAnnotations.find((annotation) => annotation.id === selectedPathId);
  const selectedLabel = labelAnnotations.find((annotation) => annotation.id === selectedLabelId);
  const gestureMode: GestureMode = activePathTool
    ? 'draw'
    : activeTool === 'select' && selectedPath
      ? 'editPath'
      : activeTool === 'select' && selectedLabel
        ? 'editLabel'
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
      const labelHit = [...labelAnnotations]
        .reverse()
        .map((annotation) => {
          const bounds = measureLabelBounds({
            point: annotation.point,
            text: labelText(annotation),
            fontSize: labelFontSize(annotation) * imageFit.scale * viewScale,
            size: displaySize,
          });
          return { annotation, bounds };
        })
        .find((item) => {
          const paddedBounds = {
            x: item.bounds.x - LABEL_HANDLE_RADIUS,
            y: item.bounds.y - LABEL_HANDLE_RADIUS,
            width: item.bounds.width + LABEL_HANDLE_RADIUS * 2,
            height: item.bounds.height + LABEL_HANDLE_RADIUS * 2,
          };
          return (
            target.x >= paddedBounds.x &&
            target.x <= paddedBounds.x + paddedBounds.width &&
            target.y >= paddedBounds.y &&
            target.y <= paddedBounds.y + paddedBounds.height
          );
        });
      if (labelHit) {
        onSelectLabel(labelHit.annotation.id);
        onSelectPath(undefined);
        return;
      }

      const hit = pathAnnotations
        .map((annotation) => ({
          annotation,
          hit: findNearestPolylineSegment(annotation.points, point, displaySize, LINE_HIT_RADIUS),
        }))
        .filter((item): item is { annotation: PathAnnotation; hit: { index: number; distance: number } } =>
          Boolean(item.hit),
        )
        .sort((a, b) => a.hit.distance - b.hit.distance)[0];

      onSelectPath(hit?.annotation.id, hit?.annotation.points);
      onSelectLabel(undefined);
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
      labelDragModeRef.current = 'resize';
      const center = {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      };
      labelResizeStartRef.current = {
        distance: Math.max(1, pointDistance(target, center)),
        fontSize: labelFontSize(selectedLabel),
      };
      return;
    }

    if (!containsPoint(bounds, target)) {
      labelDragModeRef.current = 'none';
      return;
    }

    const anchor = denormalizePoint(selectedLabel.point, displaySize);
    labelDragModeRef.current = 'move';
    labelMoveOffsetRef.current = {
      x: target.x - anchor.x,
      y: target.y - anchor.y,
    };
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
    const center = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };
    const nextDistance = Math.max(1, pointDistance(target, center));
    const start = labelResizeStartRef.current;
    onResizeSelectedLabel(start.fontSize * (nextDistance / start.distance));
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

  function dispatchFinishControlPointDrag() {
    if (dragHandleIndexRef.current >= 0) {
      onCommitSelectedPathEdit();
    }
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
          runOnJS(dispatchBeginControlPointDrag)(event.x, event.y, tx.value, ty.value, scale.value);
        })
        .onChange((event) => {
          runOnJS(dispatchMoveControlPoint)(event.x, event.y, tx.value, ty.value, scale.value);
        })
        .onEnd(() => {
          runOnJS(dispatchFinishControlPointDrag)();
        }),
    // Dispatch functions are refreshed through render closures and only read JS state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scale, tx, ty],
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
      return Gesture.Race(tapGesture, Gesture.Simultaneous(panGesture, pinchGesture));
    },
    [controlPointGesture, drawGesture, gestureMode, labelGesture, panGesture, pinchGesture, tapGesture],
  );

  const groupTransform = useDerivedValue(
    () => [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
    [scale, tx, ty],
  );

  const renderableSize = {
    width: imageFit.width,
    height: imageFit.height,
  };
  const selectedLabelFrame = selectedLabel
    ? screenFrameForLabel({
        annotation: selectedLabel,
        imageFit,
        transform: viewport,
      })
    : undefined;

  return (
    <GestureDetector gesture={composedGesture} key={gestureMode}>
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
              {annotations.filter((annotation) => !('point' in annotation && annotation.kind === 'label')).map((annotation) => (
                <AnnotationShape
                  annotation={annotation}
                  key={annotation.id}
                  routeMarkerFont={routeMarkerFont}
                  imageScale={imageFit.scale}
                  size={renderableSize}
                />
              ))}
              {selectedPath ? <SelectedPathHandles points={selectedPath.points} size={renderableSize} /> : null}
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
        {labelAnnotations
          .filter((annotation) => annotation.id !== selectedLabel?.id)
          .map((annotation) => (
            <NativeLabel
              annotation={annotation}
              imageFit={imageFit}
              key={annotation.id}
              transform={viewport}
            />
          ))}
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
                left: selectedLabelFrame.x,
                lineHeight: selectedLabelFrame.lineHeight,
                minHeight: selectedLabelFrame.height,
                minWidth: selectedLabelFrame.width,
                top: selectedLabelFrame.y,
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

function SelectedPathHandles({
  points,
  size,
}: {
  points: NormalizedPoint[];
  size: { width: number; height: number };
}) {
  return (
    <Group>
      {points.map((point, index) => {
        const next = denormalizePoint(point, size);
        return (
          <Group key={`${point.x}-${point.y}-${index}`}>
            <Circle color="#0F172A" cx={next.x} cy={next.y} r={HANDLE_RADIUS + 3} />
            <Circle color="#F8FAFC" cx={next.x} cy={next.y} r={HANDLE_RADIUS} />
            <Circle color="#1D4ED8" cx={next.x} cy={next.y} r={HANDLE_RADIUS - 4} />
          </Group>
        );
      })}
    </Group>
  );
}

function SelectedLabelHandles({
  annotation,
  imageScale,
  size,
}: {
  annotation: MarkerAnnotation;
  imageScale: number;
  size: { width: number; height: number };
}) {
  const bounds = measureLabelBounds({
    point: annotation.point,
    text: labelText(annotation),
    fontSize: displayFontSize(labelFontSize(annotation), { scale: imageScale }),
    size,
  });
  const handles = labelHandlePoints(bounds);

  return (
    <Group>
      <Rect
        color="#1D4ED8"
        height={bounds.height}
        style="stroke"
        strokeWidth={2}
        width={bounds.width}
        x={bounds.x}
        y={bounds.y}
      />
      {(Object.keys(handles) as Array<keyof typeof handles>).map((handle) => (
        <Circle
          color="#1D4ED8"
          cx={handles[handle].x}
          cy={handles[handle].y}
          key={handle}
          r={LABEL_HANDLE_RADIUS}
        />
      ))}
    </Group>
  );
}

function AnnotationShape({
  annotation,
  imageScale,
  routeMarkerFont,
  size,
}: {
  annotation: Annotation;
  imageScale: number;
  routeMarkerFont: ReturnType<typeof useFont>;
  size: { width: number; height: number };
}) {
  if ('points' in annotation) {
    const path = makeSmoothedPath(annotation.points, size);

    return (
      <Path
        color={annotation.color}
        path={path}
        strokeCap="round"
        strokeJoin="round"
        strokeWidth={annotation.kind === 'climbLine' ? 5 : 4}
        style="stroke"
      />
    );
  }

  const point = denormalizePoint(annotation.point, size);

  if (annotation.kind === 'label') {
    return null;
  }

  if (annotation.kind === 'bolt') {
    return (
      <Group>
        <Line
          color={STAMP_WHITE}
          p1={{ x: point.x - 8, y: point.y - 8 }}
          p2={{ x: point.x + 8, y: point.y + 8 }}
          strokeCap="round"
          strokeWidth={5}
        />
        <Line
          color={STAMP_WHITE}
          p1={{ x: point.x + 8, y: point.y - 8 }}
          p2={{ x: point.x - 8, y: point.y + 8 }}
          strokeCap="round"
          strokeWidth={5}
        />
        <Line
          color={STAMP_RED}
          p1={{ x: point.x - 8, y: point.y - 8 }}
          p2={{ x: point.x + 8, y: point.y + 8 }}
          strokeCap="round"
          strokeWidth={3}
        />
        <Line
          color={STAMP_RED}
          p1={{ x: point.x + 8, y: point.y - 8 }}
          p2={{ x: point.x - 8, y: point.y + 8 }}
          strokeCap="round"
          strokeWidth={3}
        />
      </Group>
    );
  }

  if (annotation.kind === 'rappel' || annotation.kind === 'belay') {
    return (
      <Group>
        <Circle color={STAMP_RED} cx={point.x} cy={point.y} r={10} />
        <Circle
          color={STAMP_WHITE}
          cx={point.x}
          cy={point.y}
          r={10}
          strokeWidth={3}
          style="stroke"
        />
        {annotation.kind === 'rappel' ? (
          <Group>
            <Line
              color={STAMP_WHITE}
              p1={{ x: point.x, y: point.y + 10 }}
              p2={{ x: point.x, y: point.y + 24 }}
              strokeCap="round"
              strokeWidth={5}
            />
            <Line
              color={STAMP_WHITE}
              p1={{ x: point.x, y: point.y + 24 }}
              p2={{ x: point.x - 5, y: point.y + 18 }}
              strokeCap="round"
              strokeWidth={5}
            />
            <Line
              color={STAMP_WHITE}
              p1={{ x: point.x, y: point.y + 24 }}
              p2={{ x: point.x + 5, y: point.y + 18 }}
              strokeCap="round"
              strokeWidth={5}
            />
            <Line
              color={STAMP_RED}
              p1={{ x: point.x, y: point.y + 10 }}
              p2={{ x: point.x, y: point.y + 24 }}
              strokeCap="round"
              strokeWidth={3}
            />
            <Line
              color={STAMP_RED}
              p1={{ x: point.x, y: point.y + 24 }}
              p2={{ x: point.x - 5, y: point.y + 18 }}
              strokeCap="round"
              strokeWidth={3}
            />
            <Line
              color={STAMP_RED}
              p1={{ x: point.x, y: point.y + 24 }}
              p2={{ x: point.x + 5, y: point.y + 18 }}
              strokeCap="round"
              strokeWidth={3}
            />
          </Group>
        ) : null}
      </Group>
    );
  }

  if (annotation.kind === 'start') {
    const label = (annotation.label ?? '12').slice(0, 2);
    const textWidth = routeMarkerFont?.measureText(label).width ?? 0;

    return (
      <Group>
        <Circle color={STAMP_RED} cx={point.x} cy={point.y} r={15} />
        <Circle
          color={STAMP_WHITE}
          cx={point.x}
          cy={point.y}
          r={15}
          strokeWidth={3}
          style="stroke"
        />
        {routeMarkerFont ? (
          <SkiaText
            color={STAMP_WHITE}
            font={routeMarkerFont}
            text={label}
            x={point.x - textWidth / 2}
            y={point.y + 6}
          />
        ) : null}
      </Group>
    );
  }

  if (annotation.kind === 'arrow') {
    return (
      <Group>
        <Line
          color={annotation.color}
          p1={{ x: point.x - 18, y: point.y + 18 }}
          p2={{ x: point.x + 18, y: point.y - 18 }}
          strokeWidth={4}
        />
        <Line
          color={annotation.color}
          p1={{ x: point.x + 18, y: point.y - 18 }}
          p2={{ x: point.x + 4, y: point.y - 18 }}
          strokeWidth={4}
        />
      </Group>
    );
  }

  return (
    <Group>
      <Circle color="#FFFFFF" cx={point.x} cy={point.y} r={12} />
      <Circle color={annotation.color} cx={point.x} cy={point.y} r={8} />
    </Group>
  );
}

function screenFrameForLabel({
  annotation,
  imageFit,
  transform,
}: {
  annotation: MarkerAnnotation;
  imageFit: { offsetX: number; offsetY: number; scale: number; width: number; height: number };
  transform: { scale: number; tx: number; ty: number };
}) {
  const fontSize = labelFontSize(annotation) * imageFit.scale * transform.scale;
  const bounds = measureLabelBounds({
    point: annotation.point,
    text: labelText(annotation),
    fontSize,
    size: {
      width: imageFit.width * transform.scale,
      height: imageFit.height * transform.scale,
    },
  });
  const x = transform.scale * (imageFit.offsetX + annotation.point.x * imageFit.width) + transform.tx;
  const y = transform.scale * (imageFit.offsetY + annotation.point.y * imageFit.height) + transform.ty;

  return {
    fontSize,
    height: bounds.height,
    lineHeight: fontSize * 1.2,
    width: bounds.width,
    x,
    y,
  };
}

function NativeLabel({
  annotation,
  imageFit,
  transform,
}: {
  annotation: MarkerAnnotation;
  imageFit: { offsetX: number; offsetY: number; scale: number; width: number; height: number };
  transform: { scale: number; tx: number; ty: number };
}) {
  const frame = screenFrameForLabel({ annotation, imageFit, transform });

  return (
    <Text
      pointerEvents="none"
      style={[
        styles.nativeLabel,
        {
          color: annotation.color,
          fontSize: frame.fontSize,
          left: frame.x,
          lineHeight: frame.lineHeight,
          minWidth: frame.width,
          top: frame.y,
        },
      ]}
    >
      {labelText(annotation)}
    </Text>
  );
}

function makeSmoothedPath(points: NormalizedPoint[], size: { width: number; height: number }) {
  const path = Skia.Path.Make();
  const drawingPoints = points.map((point) => denormalizePoint(point, size));
  const first = drawingPoints[0];

  if (!first) {
    return path;
  }

  path.moveTo(first.x, first.y);

  if (drawingPoints.length === 2) {
    const last = drawingPoints[1];
    path.lineTo(last.x, last.y);
    return path;
  }

  for (let index = 1; index < drawingPoints.length - 1; index += 1) {
    const control = drawingPoints[index];
    const next = drawingPoints[index + 1];
    const midpoint = {
      x: (control.x + next.x) / 2,
      y: (control.y + next.y) / 2,
    };
    path.quadTo(control.x, control.y, midpoint.x, midpoint.y);
  }

  const last = drawingPoints.at(-1);
  if (last) {
    path.lineTo(last.x, last.y);
  }

  return path;
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
    fontWeight: '700',
  },
  labelInput: {
    backgroundColor: 'rgba(248, 250, 252, 0.18)',
    borderColor: '#1D4ED8',
    borderWidth: 1,
    fontWeight: '700',
    padding: 0,
    position: 'absolute',
  },
  nativeLabel: {
    fontWeight: '700',
    padding: 0,
    position: 'absolute',
  },
});
