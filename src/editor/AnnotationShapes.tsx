import {
  Circle,
  Group,
  Line,
  matchFont,
  Path,
  Rect,
  Skia,
  Text as SkiaText,
} from '@shopify/react-native-skia';
import type { useFont } from '@shopify/react-native-skia';
import { memo } from 'react';

import { isPathAnnotation } from '@/domain/annotationFactory';
import { denormalizePoint, normalizedToScreenPoint } from '@/domain/geometry';
import {
  displayFontSize,
  labelFontSize,
  labelHandlePoints,
  labelText,
  measureLabelBounds,
  measureLabelText,
  splitLabelLines,
} from '@/domain/textLabels';
import type { Annotation, MarkerAnnotation, NormalizedPoint } from '@/domain/types';

const HANDLE_RADIUS = 9;
const STAMP_RED = '#C91F37';
const STAMP_WHITE = '#F8FAFC';
const LABEL_HANDLE_RADIUS = 8;

type ImageFit = {
  offsetX: number;
  offsetY: number;
  scale: number;
  width: number;
  height: number;
};

type Viewport = {
  scale: number;
  tx: number;
  ty: number;
};

export function SelectedPathHandles({
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

export function SelectedLabelHandles({
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

export const AnnotationShape = memo(function AnnotationShape({
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
  if (isPathAnnotation(annotation)) {
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

  if (annotation.kind === 'label') {
    return <LabelAnnotationShape annotation={annotation} imageScale={imageScale} size={size} />;
  }

  const point = denormalizePoint(annotation.point, size);

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
});

function LabelAnnotationShape({
  annotation,
  imageScale,
  size,
}: {
  annotation: MarkerAnnotation;
  imageScale: number;
  size: { width: number; height: number };
}) {
  const fontSize = Math.max(1, Math.round(displayFontSize(labelFontSize(annotation), { scale: imageScale })));
  const font = matchFont({
    fontFamily: 'sans-serif',
    fontSize,
    fontWeight: '700',
  });
  const point = denormalizePoint(annotation.point, size);
  const measured = measureLabelText(labelText(annotation) || ' ', fontSize);

  return (
    <Group>
      {splitLabelLines(labelText(annotation)).map((line, index) => (
        <SkiaText
          color={annotation.color}
          font={font}
          key={`${annotation.id}-${index}`}
          text={line}
          x={point.x}
          y={point.y + fontSize + measured.lineHeight * index}
        />
      ))}
    </Group>
  );
}

export function screenFrameForLabel({
  annotation,
  imageFit,
  transform,
}: {
  annotation: MarkerAnnotation;
  imageFit: ImageFit;
  transform: Viewport;
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
  const point = normalizedToScreenPoint(annotation.point, imageFit, transform);

  return {
    fontSize,
    height: bounds.height,
    lineHeight: fontSize * 1.2,
    width: bounds.width,
    x: point.x,
    y: point.y,
  };
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

