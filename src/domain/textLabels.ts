import type { Fit, Size } from './geometry';
import { clamp, denormalizePoint, normalizePoint, pointDistance } from './geometry';
import type { MarkerAnnotation, NormalizedPoint } from './types';

export const DEFAULT_LABEL_FONT_SIZE = 42;
export const DEFAULT_SCREEN_LABEL_FONT_SIZE = 16;
export const MIN_LABEL_FONT_SIZE = 8;
export const MAX_LABEL_FONT_SIZE = 220;
export const LABEL_LINE_HEIGHT = 1.2;
export const LABEL_AVERAGE_CHAR_WIDTH = 0.58;

export type LabelBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LabelResizeHandle = 'topRight';

export function clampLabelFontSize(fontSize: number) {
  return clamp(fontSize, MIN_LABEL_FONT_SIZE, MAX_LABEL_FONT_SIZE);
}

export function labelFontSize(annotation: Pick<MarkerAnnotation, 'kind' | 'labelFontSize'>) {
  return annotation.kind === 'label'
    ? clampLabelFontSize(annotation.labelFontSize ?? DEFAULT_LABEL_FONT_SIZE)
    : DEFAULT_LABEL_FONT_SIZE;
}

export function splitLabelLines(text: string) {
  return text.split(/\r\n|\r|\n/);
}

export function labelText(annotation: Pick<MarkerAnnotation, 'label'>) {
  return annotation.label ?? '';
}

export function measureLabelText(text: string, fontSize: number) {
  const lines = splitLabelLines(text);
  const longestLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const lineHeight = fontSize * LABEL_LINE_HEIGHT;

  return {
    height: Math.max(1, lines.length) * lineHeight,
    lineHeight,
    lines,
    width: Math.max(fontSize, longestLineLength * fontSize * LABEL_AVERAGE_CHAR_WIDTH),
  };
}

export function measureLabelBounds(input: {
  point: NormalizedPoint;
  text: string;
  fontSize: number;
  size: Size;
}) {
  const anchor = denormalizePoint(input.point, input.size);
  const measured = measureLabelText(input.text || ' ', input.fontSize);
  return {
    x: anchor.x,
    y: anchor.y,
    width: measured.width,
    height: measured.height,
  };
}

export function containsPoint(bounds: LabelBounds, point: { x: number; y: number }) {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

export function labelBoundsCenter(bounds: LabelBounds) {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

export function labelHandlePoints(bounds: LabelBounds): Record<LabelResizeHandle, { x: number; y: number }> {
  return {
    topRight: { x: bounds.x + bounds.width, y: bounds.y },
  };
}

export function findNearestLabelHandle(
  bounds: LabelBounds,
  point: { x: number; y: number },
  tolerance: number,
) {
  let best: { handle: LabelResizeHandle; distance: number } | undefined;
  const handles = labelHandlePoints(bounds);

  (Object.keys(handles) as LabelResizeHandle[]).forEach((handle) => {
    const distance = pointDistance(point, handles[handle]);
    if (distance <= tolerance && (!best || distance < best.distance)) {
      best = { handle, distance };
    }
  });

  return best;
}

export function photoFontSizeFromScreen(input: {
  imageFit: Pick<Fit, 'scale'>;
  screenFontSize?: number;
  viewScale: number;
}) {
  const screenFontSize = input.screenFontSize ?? DEFAULT_SCREEN_LABEL_FONT_SIZE;
  const photoScale = input.imageFit.scale * input.viewScale;
  return clampLabelFontSize(photoScale > 0 ? screenFontSize / photoScale : DEFAULT_LABEL_FONT_SIZE);
}

export function displayFontSize(photoFontSize: number, imageFit: Pick<Fit, 'scale'>) {
  return clampLabelFontSize(photoFontSize) * imageFit.scale;
}

export function moveLabelPoint(input: {
  currentPointer: NormalizedPoint;
  pointerOffset: { x: number; y: number };
  size: Size;
}) {
  const pointer = denormalizePoint(input.currentPointer, input.size);
  return normalizePoint(
    {
      x: pointer.x - input.pointerOffset.x,
      y: pointer.y - input.pointerOffset.y,
    },
    input.size,
  );
}
