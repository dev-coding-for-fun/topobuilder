import {
  Circle,
  Group,
  Line,
  Rect,
} from '@shopify/react-native-skia';
import { memo } from 'react';

import { denormalizePoint, normalizedToScreenPoint } from '@/domain/geometry';
import {
  displayFontSize,
  labelFontSize,
  labelBoundsLeadingInset,
  labelHandlePoints,
  labelText,
  measureLabelBounds,
} from '@/domain/textLabels';
import type { Annotation, MarkerAnnotation, NormalizedPoint } from '@/domain/types';
import { buildTopoRenderScene } from '@/rendering/scene';
import { SkiaTopoScene } from '@/rendering/SkiaTopoRenderer';

const HANDLE_RADIUS = 9;
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
        <Group key={handle}>
          <Circle
            color="#1D4ED8"
            cx={handles[handle].x}
            cy={handles[handle].y}
            r={LABEL_HANDLE_RADIUS}
          />
          {handle === 'move' ? (
            <Group>
              <Line
                color="#F8FAFC"
                p1={{ x: handles[handle].x - 4, y: handles[handle].y }}
                p2={{ x: handles[handle].x + 4, y: handles[handle].y }}
                strokeCap="round"
                strokeWidth={2}
              />
              <Line
                color="#F8FAFC"
                p1={{ x: handles[handle].x, y: handles[handle].y - 4 }}
                p2={{ x: handles[handle].x, y: handles[handle].y + 4 }}
                strokeCap="round"
                strokeWidth={2}
              />
            </Group>
          ) : (
            <Group>
              <Line
                color="#F8FAFC"
                p1={{ x: handles[handle].x - 4, y: handles[handle].y + 1 }}
                p2={{ x: handles[handle].x + 1, y: handles[handle].y + 1 }}
                strokeCap="round"
                strokeWidth={2}
              />
              <Line
                color="#F8FAFC"
                p1={{ x: handles[handle].x + 1, y: handles[handle].y - 4 }}
                p2={{ x: handles[handle].x + 1, y: handles[handle].y + 1 }}
                strokeCap="round"
                strokeWidth={2}
              />
              <Line
                color="#F8FAFC"
                p1={{ x: handles[handle].x - 4, y: handles[handle].y - 4 }}
                p2={{ x: handles[handle].x + 3, y: handles[handle].y + 3 }}
                strokeCap="round"
                strokeWidth={2}
              />
            </Group>
          )}
        </Group>
      ))}
    </Group>
  );
}

export const AnnotationShape = memo(function AnnotationShape({
  annotation,
  imageScale,
  size,
}: {
  annotation: Annotation;
  imageScale: number;
  size: { width: number; height: number };
}) {
  const scene = buildTopoRenderScene({ annotations: [annotation], labelScale: imageScale, size });
  return <SkiaTopoScene items={scene} />;
});

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
  const leadingInset = labelBoundsLeadingInset(fontSize);

  return {
    fontSize,
    height: bounds.height,
    leadingInset,
    lineHeight: fontSize * 1.2,
    width: bounds.width,
    x: point.x - leadingInset,
    y: point.y,
  };
}
