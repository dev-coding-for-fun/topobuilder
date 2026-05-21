import type { Annotation } from './types';

export type LineWeight = 'small' | 'medium' | 'large';

export const DEFAULT_LINE_WEIGHT: LineWeight = 'medium';

export const LINE_WEIGHT_OPTIONS: LineWeight[] = ['small', 'medium', 'large'];

const LINE_WEIGHT_STROKE_WIDTH: Record<LineWeight, number> = {
  small: 3,
  medium: 5,
  large: 7,
};

const PDF_LINE_WEIGHT_STROKE_WIDTH: Record<LineWeight, number> = {
  small: 6,
  medium: 8,
  large: 10,
};

export function isLineWeight(value: unknown): value is LineWeight {
  return value === 'small' || value === 'medium' || value === 'large';
}

export function lineWeightForAnnotation(annotation: Pick<Annotation, 'lineWeight'>) {
  return annotation.lineWeight ?? DEFAULT_LINE_WEIGHT;
}

export function lineStrokeWidthForWeight(weight: LineWeight = DEFAULT_LINE_WEIGHT) {
  return LINE_WEIGHT_STROKE_WIDTH[weight];
}

export function pdfLineStrokeWidthForWeight(weight: LineWeight = DEFAULT_LINE_WEIGHT) {
  return PDF_LINE_WEIGHT_STROKE_WIDTH[weight];
}
