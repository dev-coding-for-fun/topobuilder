import type { Annotation } from './types';

export type StampSize = 'small' | 'medium' | 'large';

export const DEFAULT_STAMP_SIZE: StampSize = 'medium';

export const STAMP_SIZE_OPTIONS: StampSize[] = ['small', 'medium', 'large'];

const STAMP_SIZE_SCALE: Record<StampSize, number> = {
  small: 0.8,
  medium: 1,
  large: 1.2,
};

export function isStampSize(value: unknown): value is StampSize {
  return value === 'small' || value === 'medium' || value === 'large';
}

export function stampScaleForSize(size: StampSize = DEFAULT_STAMP_SIZE) {
  return STAMP_SIZE_SCALE[size];
}

export function stampSizeForAnnotation(annotation: Pick<Annotation, 'stampSize'>) {
  return annotation.stampSize ?? DEFAULT_STAMP_SIZE;
}
