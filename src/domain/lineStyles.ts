import type { Annotation, PathAnnotationKind } from './types';

export type LineStyle = 'solid' | 'dashed' | 'dotted';

export const DEFAULT_LINE_STYLE: LineStyle = 'solid';

export const LINE_STYLE_OPTIONS: LineStyle[] = ['solid', 'dashed', 'dotted'];

export function isLineStyle(value: unknown): value is LineStyle {
  return value === 'solid' || value === 'dashed' || value === 'dotted';
}

export function defaultLineStyleForKind(kind: PathAnnotationKind): LineStyle {
  switch (kind) {
    case 'walkoff':
      return 'dotted';
    case 'scramble':
      return 'dashed';
    case 'climbLine':
    default:
      return 'solid';
  }
}

export function lineStyleForAnnotation(
  annotation: Pick<Annotation, 'lineStyle' | 'kind'>,
): LineStyle {
  if (annotation.lineStyle && isLineStyle(annotation.lineStyle)) {
    return annotation.lineStyle;
  }
  if (annotation.kind === 'walkoff') return 'dotted';
  if (annotation.kind === 'scramble') return 'dashed';
  return DEFAULT_LINE_STYLE;
}

export function lineDashForStyle(style: LineStyle, strokeWidth = 5): number[] | undefined {
  switch (style) {
    case 'solid':
      return undefined;
    case 'dashed':
      return [Math.round(strokeWidth * 3), Math.round(strokeWidth * 1.6)];
    case 'dotted':
      return [0.1, Math.round(strokeWidth * 2.2)];
  }
}

export function lineStyleLabel(style: LineStyle): string {
  switch (style) {
    case 'solid':
      return 'Solid';
    case 'dashed':
      return 'Dashed';
    case 'dotted':
      return 'Dots';
  }
}
