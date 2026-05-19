import {
  Circle,
  Group,
  Line,
  matchFont,
  Path,
  Rect,
  RoundedRect,
  Skia,
  Text as SkiaText,
} from '@shopify/react-native-skia';
import type { useFont } from '@shopify/react-native-skia';
import { memo } from 'react';

import { isPathAnnotation } from '@/domain/annotationFactory';
import { chooseContrastingTextColour, chooseTextBackdrop, rgbaString } from '@/domain/annotationColours';
import { denormalizePoint, normalizedToScreenPoint } from '@/domain/geometry';
import { stampScaleForSize, stampSizeForAnnotation } from '@/domain/stampSizes';
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
const STAMP_WHITE = '#F8FAFC';
const LABEL_HANDLE_RADIUS = 8;
const LABEL_BACKDROP_RADIUS = 6;

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
  const stampScale = stampScaleForSize(stampSizeForAnnotation(annotation));
  const stamp = (value: number) => value * stampScale;

  if (annotation.kind === 'bolt') {
    return (
      <Group>
        <Line
          color={STAMP_WHITE}
          p1={{ x: point.x - stamp(8), y: point.y - stamp(8) }}
          p2={{ x: point.x + stamp(8), y: point.y + stamp(8) }}
          strokeCap="round"
          strokeWidth={stamp(5)}
        />
        <Line
          color={STAMP_WHITE}
          p1={{ x: point.x + stamp(8), y: point.y - stamp(8) }}
          p2={{ x: point.x - stamp(8), y: point.y + stamp(8) }}
          strokeCap="round"
          strokeWidth={stamp(5)}
        />
        <Line
          color={annotation.color}
          p1={{ x: point.x - stamp(8), y: point.y - stamp(8) }}
          p2={{ x: point.x + stamp(8), y: point.y + stamp(8) }}
          strokeCap="round"
          strokeWidth={stamp(3)}
        />
        <Line
          color={annotation.color}
          p1={{ x: point.x + stamp(8), y: point.y - stamp(8) }}
          p2={{ x: point.x - stamp(8), y: point.y + stamp(8) }}
          strokeCap="round"
          strokeWidth={stamp(3)}
        />
      </Group>
    );
  }

  if (annotation.kind === 'rappel' || annotation.kind === 'belay') {
    return (
      <Group>
        <Circle color={annotation.color} cx={point.x} cy={point.y} r={stamp(10)} />
        <Circle
          color={STAMP_WHITE}
          cx={point.x}
          cy={point.y}
          r={stamp(10)}
          strokeWidth={stamp(3)}
          style="stroke"
        />
        {annotation.kind === 'rappel' ? (
          <Group>
            <Line
              color={STAMP_WHITE}
              p1={{ x: point.x, y: point.y + stamp(10) }}
              p2={{ x: point.x, y: point.y + stamp(24) }}
              strokeCap="round"
              strokeWidth={stamp(5)}
            />
            <Line
              color={STAMP_WHITE}
              p1={{ x: point.x, y: point.y + stamp(24) }}
              p2={{ x: point.x - stamp(5), y: point.y + stamp(18) }}
              strokeCap="round"
              strokeWidth={stamp(5)}
            />
            <Line
              color={STAMP_WHITE}
              p1={{ x: point.x, y: point.y + stamp(24) }}
              p2={{ x: point.x + stamp(5), y: point.y + stamp(18) }}
              strokeCap="round"
              strokeWidth={stamp(5)}
            />
            <Line
              color={annotation.color}
              p1={{ x: point.x, y: point.y + stamp(10) }}
              p2={{ x: point.x, y: point.y + stamp(24) }}
              strokeCap="round"
              strokeWidth={stamp(3)}
            />
            <Line
              color={annotation.color}
              p1={{ x: point.x, y: point.y + stamp(24) }}
              p2={{ x: point.x - stamp(5), y: point.y + stamp(18) }}
              strokeCap="round"
              strokeWidth={stamp(3)}
            />
            <Line
              color={annotation.color}
              p1={{ x: point.x, y: point.y + stamp(24) }}
              p2={{ x: point.x + stamp(5), y: point.y + stamp(18) }}
              strokeCap="round"
              strokeWidth={stamp(3)}
            />
          </Group>
        ) : null}
      </Group>
    );
  }

  if (annotation.kind === 'start') {
    const label = annotation.label?.slice(0, 2) ?? '';
    const font = routeMarkerFont ?? matchFont({
      fontFamily: 'sans-serif',
      fontSize: 16,
      fontWeight: '700',
    });
    const textWidth = font.measureText(label).width;

    return (
      <Group>
        <Circle color={annotation.color} cx={point.x} cy={point.y} r={stamp(15)} />
        <Circle
          color={STAMP_WHITE}
          cx={point.x}
          cy={point.y}
          r={stamp(15)}
          strokeWidth={stamp(3)}
          style="stroke"
        />
        {label.length > 0 ? (
          <Group
            transform={[
              { translateX: point.x },
              { translateY: point.y },
              { scale: stampScale },
              { translateX: -point.x },
              { translateY: -point.y },
            ]}
          >
            <SkiaText
              color={chooseContrastingTextColour(annotation.color)}
              font={font}
              text={label}
              x={point.x - textWidth / 2}
              y={point.y + 6}
            />
          </Group>
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
  const bounds = measureLabelBoundsWithFont({
    annotation,
    font,
    fontSize,
    size,
  });
  const backdropPadding = Math.max(4, fontSize * 0.18);
  const backdropTrailingPadding = backdropPadding + Math.max(2, fontSize * 0.06);
  const backdrop = chooseTextBackdrop({
    textColour: annotation.color,
  });

  return (
    <Group>
      {backdrop.opacity > 0 ? (
        <RoundedRect
          color={rgbaString(backdrop.color, backdrop.opacity)}
          height={bounds.height + backdropPadding * 2}
          r={LABEL_BACKDROP_RADIUS}
          width={bounds.width + backdropPadding + backdropTrailingPadding}
          x={bounds.x - backdropPadding}
          y={bounds.y - backdropPadding}
        />
      ) : null}
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

function measureLabelBoundsWithFont({
  annotation,
  font,
  fontSize,
  size,
}: {
  annotation: MarkerAnnotation;
  font: ReturnType<typeof matchFont>;
  fontSize: number;
  size: { width: number; height: number };
}) {
  const anchor = denormalizePoint(annotation.point, size);
  const measured = measureLabelText(labelText(annotation) || ' ', fontSize);
  const width = Math.max(
    fontSize,
    ...splitLabelLines(labelText(annotation) || ' ').map((line) => font.measureText(line || ' ').width),
  );

  return {
    height: measured.height,
    width,
    x: anchor.x,
    y: anchor.y,
  };
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

