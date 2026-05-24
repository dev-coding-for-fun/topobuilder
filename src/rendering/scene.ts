import { isLabelAnnotation, isMarkerAnnotation, isPathAnnotation, isStampAnnotation } from '@/domain/annotationFactory';
import { chooseContrastingTextColour, chooseTextBackdrop, rgbaString } from '@/domain/annotationColours';
import { denormalizePoint, type Size } from '@/domain/geometry';
import { lineStrokeWidthForWeight, lineWeightForAnnotation, pdfLineStrokeWidthForWeight } from '@/domain/lineWeights';
import { stampScaleForSize, stampSizeForAnnotation } from '@/domain/stampSizes';
import type { Annotation, MarkerAnnotation, NormalizedPoint, PhotoAsset } from '@/domain/types';
import { labelFontSize, labelText, measureLabelText, splitLabelLines } from '@/domain/textLabels';

const STAMP_WHITE = '#F8FAFC';
const LABEL_BACKDROP_RADIUS = 6;

export type RenderPoint = {
  x: number;
  y: number;
};

export type RenderPathItem = {
  id: string;
  kind: 'path';
  color: string;
  dash?: number[];
  points: RenderPoint[];
  strokeWidth: number;
};

export type RenderLineItem = {
  id: string;
  kind: 'line';
  color: string;
  p1: RenderPoint;
  p2: RenderPoint;
  strokeWidth: number;
};

export type RenderCircleItem = {
  id: string;
  kind: 'circle';
  color: string;
  cx: number;
  cy: number;
  r: number;
  strokeWidth?: number;
  style?: 'fill' | 'stroke';
};

export type RenderRoundedRectItem = {
  id: string;
  kind: 'roundedRect';
  color: string;
  height: number;
  r: number;
  width: number;
  x: number;
  y: number;
};

/**
 * Weights that the Skia text renderer is set up to handle. Keep this in sync
 * with the font map in `SkiaTopoRenderer.tsx`; adding a new weight here will
 * force the renderer's exhaustive switch to be updated.
 */
export type RenderTextFontWeight = '400' | '700';

export type RenderTextItem = {
  id: string;
  kind: 'text';
  color: string;
  fontSize: number;
  fontWeight: RenderTextFontWeight;
  text: string;
  textAnchor?: 'middle';
  x: number;
  y: number;
};

export type TopoRenderItem =
  | RenderPathItem
  | RenderLineItem
  | RenderCircleItem
  | RenderRoundedRectItem
  | RenderTextItem;

export type BuildTopoRenderSceneInput = {
  annotations: Annotation[];
  labelScale?: number;
  size: Size;
  sourcePhoto?: Pick<PhotoAsset, 'width' | 'height'>;
  target?: 'editor' | 'artifact';
};

export function buildTopoRenderScene({
  annotations,
  labelScale,
  size,
  sourcePhoto,
  target = 'editor',
}: BuildTopoRenderSceneInput): TopoRenderItem[] {
  const artifactMarkerScale =
    target === 'artifact' && sourcePhoto ? Math.max(1, sourcePhoto.width / 900) * (size.width / sourcePhoto.width) : 1;
  const artifactLabelScale = target === 'artifact' && sourcePhoto ? size.width / sourcePhoto.width : 1;
  const labelStyleScale = labelScale ?? artifactLabelScale;
  const drawableAnnotations = annotationsInRenderOrder(annotations);

  return drawableAnnotations.flatMap((annotation) => {
    if (isPathAnnotation(annotation)) {
      return pathItem(annotation, size, target);
    }
    if (isLabelAnnotation(annotation)) {
      return labelItems(annotation, size, labelStyleScale);
    }
    return markerItems(annotation, size, artifactMarkerScale);
  });
}

export function annotationsInRenderOrder(annotations: Annotation[]) {
  const persisted = annotations.filter((annotation) => annotation.id !== 'draft');
  return [
    ...persisted.filter(isPathAnnotation),
    ...persisted.filter((annotation): annotation is MarkerAnnotation => isMarkerAnnotation(annotation) && !isLabelAnnotation(annotation)),
    ...persisted.filter(isLabelAnnotation),
  ];
}

export function smoothedRenderPath(points: RenderPoint[]) {
  const first = points[0];
  if (!first) {
    return '';
  }

  const commands = [`M ${first.x} ${first.y}`];
  if (points.length === 2) {
    const last = points[1];
    commands.push(`L ${last.x} ${last.y}`);
    return commands.join(' ');
  }

  for (let index = 1; index < points.length - 1; index += 1) {
    const control = points[index];
    const next = points[index + 1];
    commands.push(`Q ${control.x} ${control.y} ${(control.x + next.x) / 2} ${(control.y + next.y) / 2}`);
  }

  const last = points.at(-1);
  if (last) {
    commands.push(`L ${last.x} ${last.y}`);
  }
  return commands.join(' ');
}

function pathItem(annotation: Annotation & { points: NormalizedPoint[] }, size: Size, target: 'editor' | 'artifact'): TopoRenderItem[] {
  const dash =
    annotation.kind === 'walkoff'
      ? [8, 10]
      : annotation.kind === 'scramble'
        ? [16, 8]
        : undefined;

  return [
    {
      id: annotation.id,
      kind: 'path',
      color: annotation.color,
      dash,
      points: annotation.points.map((point) => denormalizePoint(point, size)),
      strokeWidth:
        target === 'artifact'
          ? pdfLineStrokeWidthForWeight(lineWeightForAnnotation(annotation))
          : lineStrokeWidthForWeight(lineWeightForAnnotation(annotation)),
    },
  ];
}

function labelItems(annotation: MarkerAnnotation, size: Size, styleScale: number): TopoRenderItem[] {
  const point = denormalizePoint(annotation.point, size);
  const fontSize = labelFontSize(annotation) * styleScale;
  const measured = measureLabelText(labelText(annotation) || ' ', fontSize);
  const backdrop = chooseTextBackdrop({ textColour: annotation.color });
  const backdropPadding = Math.max(4, fontSize * 0.18);
  const backdropTrailingPadding = backdropPadding + Math.max(2, fontSize * 0.06);
  const items: TopoRenderItem[] = [];

  if (backdrop.opacity > 0) {
    items.push({
      id: `${annotation.id}:backdrop`,
      kind: 'roundedRect',
      color: rgbaString(backdrop.color, backdrop.opacity),
      height: measured.height + backdropPadding * 2,
      r: LABEL_BACKDROP_RADIUS,
      width: measured.width + backdropPadding + backdropTrailingPadding,
      x: point.x - backdropPadding,
      y: point.y - backdropPadding,
    });
  }

  splitLabelLines(labelText(annotation)).forEach((line, index) => {
    items.push({
      id: `${annotation.id}:text:${index}`,
      kind: 'text',
      color: annotation.color,
      fontSize,
      fontWeight: '700',
      text: line,
      x: point.x,
      y: point.y + fontSize + measured.lineHeight * index,
    });
  });

  return items;
}

function markerItems(annotation: MarkerAnnotation, size: Size, styleScale: number): TopoRenderItem[] {
  const point = denormalizePoint(annotation.point, size);
  const stampScale = (isStampAnnotation(annotation) ? stampScaleForSize(stampSizeForAnnotation(annotation)) : 1) * styleScale;
  const stamp = (value: number) => value * stampScale;
  const itemId = (suffix: string) => `${annotation.id}:${suffix}`;

  if (annotation.kind === 'bolt') {
    return [
      line(itemId('white-1'), STAMP_WHITE, point.x - stamp(8), point.y - stamp(8), point.x + stamp(8), point.y + stamp(8), stamp(5)),
      line(itemId('white-2'), STAMP_WHITE, point.x + stamp(8), point.y - stamp(8), point.x - stamp(8), point.y + stamp(8), stamp(5)),
      line(itemId('mark-1'), annotation.color, point.x - stamp(8), point.y - stamp(8), point.x + stamp(8), point.y + stamp(8), stamp(3)),
      line(itemId('mark-2'), annotation.color, point.x + stamp(8), point.y - stamp(8), point.x - stamp(8), point.y + stamp(8), stamp(3)),
    ];
  }

  if (annotation.kind === 'rappel' || annotation.kind === 'belay') {
    const items: TopoRenderItem[] = [
      circle(itemId('fill'), annotation.color, point.x, point.y, stamp(10)),
      circle(itemId('outline'), STAMP_WHITE, point.x, point.y, stamp(10), stamp(3), 'stroke'),
    ];
    if (annotation.kind === 'rappel') {
      items.push(
        line(itemId('arrow-white-1'), STAMP_WHITE, point.x, point.y + stamp(10), point.x, point.y + stamp(24), stamp(5)),
        line(itemId('arrow-white-2'), STAMP_WHITE, point.x, point.y + stamp(24), point.x - stamp(5), point.y + stamp(18), stamp(5)),
        line(itemId('arrow-white-3'), STAMP_WHITE, point.x, point.y + stamp(24), point.x + stamp(5), point.y + stamp(18), stamp(5)),
        line(itemId('arrow-mark-1'), annotation.color, point.x, point.y + stamp(10), point.x, point.y + stamp(24), stamp(3)),
        line(itemId('arrow-mark-2'), annotation.color, point.x, point.y + stamp(24), point.x - stamp(5), point.y + stamp(18), stamp(3)),
        line(itemId('arrow-mark-3'), annotation.color, point.x, point.y + stamp(24), point.x + stamp(5), point.y + stamp(18), stamp(3)),
      );
    }
    return items;
  }

  if (annotation.kind === 'start') {
    const label = annotation.label?.slice(0, 2) ?? '';
    const items: TopoRenderItem[] = [
      circle(itemId('fill'), annotation.color, point.x, point.y, stamp(15)),
      circle(itemId('outline'), STAMP_WHITE, point.x, point.y, stamp(15), stamp(3), 'stroke'),
    ];
    if (label.length > 0) {
      items.push({
        id: itemId('text'),
        kind: 'text',
        color: chooseContrastingTextColour(annotation.color),
        fontSize: stamp(16),
        fontWeight: '700',
        text: label,
        textAnchor: 'middle',
        x: point.x,
        y: point.y + stamp(6),
      });
    }
    return items;
  }

  if (annotation.kind === 'arrow') {
    return [
      line(itemId('shaft'), annotation.color, point.x - stamp(18), point.y + stamp(18), point.x + stamp(18), point.y - stamp(18), stamp(4)),
      line(itemId('head-1'), annotation.color, point.x + stamp(18), point.y - stamp(18), point.x + stamp(4), point.y - stamp(18), stamp(4)),
      line(itemId('head-2'), annotation.color, point.x + stamp(18), point.y - stamp(18), point.x + stamp(18), point.y - stamp(4), stamp(4)),
    ];
  }

  return [
    circle(itemId('white'), '#FFFFFF', point.x, point.y, stamp(12)),
    circle(itemId('fill'), annotation.color, point.x, point.y, stamp(8)),
  ];
}

function line(id: string, color: string, x1: number, y1: number, x2: number, y2: number, strokeWidth: number): RenderLineItem {
  return { id, kind: 'line', color, p1: { x: x1, y: y1 }, p2: { x: x2, y: y2 }, strokeWidth };
}

function circle(
  id: string,
  color: string,
  cx: number,
  cy: number,
  r: number,
  strokeWidth?: number,
  style?: 'fill' | 'stroke',
): RenderCircleItem {
  return { id, kind: 'circle', color, cx, cy, r, strokeWidth, style };
}
