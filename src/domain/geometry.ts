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

export type FitMode = 'contain' | 'cover';

export type Fit = {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  scale: number;
};

export type ViewTransform = {
  scale: number;
  tx: number;
  ty: number;
};

export type HitTestResult = {
  index: number;
  distance: number;
};

function emptyFit(): Fit {
  return { width: 0, height: 0, offsetX: 0, offsetY: 0, scale: 1 };
}

export function fitContain(source: Size, target: Size): Fit {
  if (source.width <= 0 || source.height <= 0 || target.width <= 0 || target.height <= 0) {
    return emptyFit();
  }

  const scale = Math.min(target.width / source.width, target.height / source.height);
  return makeFit(source, target, scale);
}

export function fitCover(source: Size, target: Size): Fit {
  if (source.width <= 0 || source.height <= 0 || target.width <= 0 || target.height <= 0) {
    return emptyFit();
  }

  const scale = Math.max(target.width / source.width, target.height / source.height);
  return makeFit(source, target, scale);
}

export function fitImage(source: Size, target: Size, mode: FitMode): Fit {
  return mode === 'cover' ? fitCover(source, target) : fitContain(source, target);
}

function makeFit(source: Size, target: Size, scale: number): Fit {
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
  mode: FitMode = 'contain',
) {
  const fit = fitImage(source, target, mode);
  if (fit.width <= 0 || fit.height <= 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: clamp((point.x - fit.offsetX) / fit.width) * source.width,
    y: clamp((point.y - fit.offsetY) / fit.height) * source.height,
  };
}

export function screenToNormalizedImagePoint(
  point: { x: number; y: number },
  base: Fit,
  transform: ViewTransform,
): NormalizedPoint {
  if (base.width <= 0 || base.height <= 0 || transform.scale <= 0) {
    return { x: 0, y: 0 };
  }

  const canvasX = (point.x - transform.tx) / transform.scale;
  const canvasY = (point.y - transform.ty) / transform.scale;
  return {
    x: clamp((canvasX - base.offsetX) / base.width),
    y: clamp((canvasY - base.offsetY) / base.height),
  };
}

export function normalizedToScreenPoint(
  point: NormalizedPoint,
  base: Fit,
  transform: ViewTransform,
) {
  return {
    x: transform.scale * (base.offsetX + point.x * base.width) + transform.tx,
    y: transform.scale * (base.offsetY + point.y * base.height) + transform.ty,
  };
}

export function pointDistance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalizedDistance(a: NormalizedPoint, b: NormalizedPoint, size: Size) {
  return pointDistance(denormalizePoint(a, size), denormalizePoint(b, size));
}

export function appendSampledPoint(
  points: NormalizedPoint[],
  next: NormalizedPoint,
  size: Size,
  minDistance: number,
) {
  const previous = points.at(-1);
  if (!previous || normalizedDistance(previous, next, size) >= minDistance) {
    return [...points, next];
  }
  return points;
}

export function finalizeSampledPoints(
  points: NormalizedPoint[],
  finalPoint: NormalizedPoint,
  size: Size,
  minDistance: number,
) {
  if (points.length === 0) {
    return [finalPoint];
  }

  if (points.length === 1) {
    return pointDistance(points[0], finalPoint) === 0 ? points : [points[0], finalPoint];
  }

  const next = points.slice(0, -1);
  while (
    next.length > 1 &&
    normalizedDistance(next[next.length - 1], finalPoint, size) < minDistance
  ) {
    next.pop();
  }
  return [...next, finalPoint];
}

export function canMoveControlPoint(
  points: NormalizedPoint[],
  index: number,
  next: NormalizedPoint,
  size: Size,
  minDistance: number,
) {
  const previous = points[index - 1];
  const following = points[index + 1];

  if (previous && normalizedDistance(previous, next, size) < minDistance) {
    return false;
  }
  if (following && normalizedDistance(next, following, size) < minDistance) {
    return false;
  }
  return true;
}

export function moveControlPoint(
  points: NormalizedPoint[],
  index: number,
  next: NormalizedPoint,
  size: Size,
  minDistance: number,
) {
  if (index < 0 || index >= points.length) {
    return points;
  }
  if (!canMoveControlPoint(points, index, next, size, minDistance)) {
    return points;
  }

  return points.map((point, pointIndex) => (pointIndex === index ? next : point));
}

export function findNearestPointIndex(
  points: NormalizedPoint[],
  target: NormalizedPoint,
  size: Size,
  tolerance: number,
): HitTestResult | undefined {
  let best: HitTestResult | undefined;

  points.forEach((point, index) => {
    const distance = normalizedDistance(point, target, size);
    if (distance <= tolerance && (!best || distance < best.distance)) {
      best = { index, distance };
    }
  });

  return best;
}

export function findNearestPolylineSegment(
  points: NormalizedPoint[],
  target: NormalizedPoint,
  size: Size,
  tolerance: number,
): HitTestResult | undefined {
  let best: HitTestResult | undefined;
  if (points.length < 2) {
    return undefined;
  }

  const targetPoint = denormalizePoint(target, size);
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = denormalizePoint(points[index], size);
    const end = denormalizePoint(points[index + 1], size);
    const distance = distanceToSegment(targetPoint, start, end);
    if (distance <= tolerance && (!best || distance < best.distance)) {
      best = { index, distance };
    }
  }

  return best;
}

function distanceToSegment(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return pointDistance(point, start);
  }

  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared);
  return pointDistance(point, { x: start.x + t * dx, y: start.y + t * dy });
}

/**
 * The user view transform is `screen = scale * canvas + translation`, applied on top of
 * a base "cover" placement of the photo inside the canvas. This helper clamps the
 * translation so that, per axis:
 *   - if the rendered image is larger than the canvas, image edges can't pull inside the
 *     canvas (no empty background is revealed),
 *   - if the rendered image is smaller than the canvas, the image is auto-centered on
 *     that axis (so zoomed-out states sit nicely letterboxed in the middle).
 */
export function clampPan(
  translation: { x: number; y: number },
  scale: number,
  base: Fit,
  canvas: Size,
) {
  'worklet';
  if (canvas.width <= 0 || canvas.height <= 0 || base.width <= 0 || base.height <= 0) {
    return translation;
  }

  const renderedLeft = scale * base.offsetX;
  const renderedRight = scale * (base.offsetX + base.width);
  const renderedTop = scale * base.offsetY;
  const renderedBottom = scale * (base.offsetY + base.height);
  const renderedWidth = renderedRight - renderedLeft;
  const renderedHeight = renderedBottom - renderedTop;

  let x: number;
  if (renderedWidth >= canvas.width) {
    const minTx = canvas.width - renderedRight;
    const maxTx = -renderedLeft;
    x = Math.min(Math.max(translation.x, minTx), maxTx);
  } else {
    x = (canvas.width - renderedWidth) / 2 - renderedLeft;
  }

  let y: number;
  if (renderedHeight >= canvas.height) {
    const minTy = canvas.height - renderedBottom;
    const maxTy = -renderedTop;
    y = Math.min(Math.max(translation.y, minTy), maxTy);
  } else {
    y = (canvas.height - renderedHeight) / 2 - renderedTop;
  }

  return { x, y };
}

/**
 * Returns the smallest user scale that keeps the entire photo just visible inside the
 * canvas (contain-fit) given that user scale = 1 corresponds to cover-fit. Always ≤ 1.
 */
export function minContainScale(source: Size, target: Size) {
  'worklet';
  if (source.width <= 0 || source.height <= 0 || target.width <= 0 || target.height <= 0) {
    return 1;
  }
  const containScale = Math.min(target.width / source.width, target.height / source.height);
  const coverScale = Math.max(target.width / source.width, target.height / source.height);
  return coverScale > 0 ? containScale / coverScale : 1;
}
