import type { NormalizedPoint } from './types';

export type Size = {
  width: number;
  height: number;
};

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function normalizePoint(
  point: { x: number; y: number },
  size: Size,
): NormalizedPoint {
  if (size.width <= 0 || size.height <= 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: clamp(point.x / size.width),
    y: clamp(point.y / size.height),
  };
}

export function denormalizePoint(point: NormalizedPoint, size: Size) {
  return {
    x: point.x * size.width,
    y: point.y * size.height,
  };
}

export function fitContain(source: Size, target: Size) {
  if (source.width <= 0 || source.height <= 0 || target.width <= 0 || target.height <= 0) {
    return { width: 0, height: 0, offsetX: 0, offsetY: 0, scale: 1 };
  }

  const scale = Math.min(target.width / source.width, target.height / source.height);
  const width = source.width * scale;
  const height = source.height * scale;

  return {
    width,
    height,
    offsetX: (target.width - width) / 2,
    offsetY: (target.height - height) / 2,
    scale,
  };
}

export function screenToImagePoint(
  point: { x: number; y: number },
  source: Size,
  target: Size,
) {
  const fit = fitContain(source, target);

  return {
    x: clamp((point.x - fit.offsetX) / fit.width) * source.width,
    y: clamp((point.y - fit.offsetY) / fit.height) * source.height,
  };
}
